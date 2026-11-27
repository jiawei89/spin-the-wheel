// Shared helpers for the site's /api routes.

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export function hex(len = 16) {
  const bytes = new Uint8Array(len / 2);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Reads the visitor the way the QA contract says: on a preview the
// x-shipsite-qa-visit header names the visit; otherwise the connecting address.
// The key never leaves the Worker.
export function visitorKey(request) {
  const visit = request.headers.get("x-shipsite-qa-visit");
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  return visit ? `visit:${visit}` : `ip:${ip}`;
}

// One rule for every route that needs an account: a browser navigation is sent
// to sign in with the return address; a script gets 401 JSON.
export function wantsHtml(request) {
  const mode = request.headers.get("sec-fetch-mode");
  if (mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

export function accountGate(request, url) {
  if (wantsHtml(request)) {
    const start = new URL("/api/auth/google/start", url.origin);
    start.searchParams.set("return", url.pathname + url.search);
    return new Response(null, {
      status: 302,
      headers: { Location: start.toString(), "Cache-Control": "no-store" },
    });
  }
  return json(
    {
      error: "auth_not_configured",
      message: "Sign in is not set up for this site yet, so cloud saves are unavailable. The wheel itself works offline without an account.",
    },
    401
  );
}

// The site's schema, ensured at runtime: the migration files under
// migrations/ are the record, but a D1 database the Worker meets that has
// never seen them (a fresh local dev database, a new environment) would
// otherwise answer every route with SQLITE_ERROR. Idempotent; runs once
// per isolate, before the first request touches the database.
const SCHEMA_DDL = [
  `CREATE TABLE IF NOT EXISTS shipsite_contact_messages (
  id TEXT PRIMARY KEY, path TEXT, payload TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS shipsite_events (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT, props TEXT, occurred_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_events_occurred ON shipsite_events (occurred_at)`,
  `CREATE INDEX IF NOT EXISTS idx_events_name ON shipsite_events (name, occurred_at)`,
  `CREATE TABLE IF NOT EXISTS shipsite_rate (
  key TEXT PRIMARY KEY, window_start TEXT NOT NULL, count INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, google_sub TEXT UNIQUE,
  creem_customer_id TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY, return_to TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, account_id TEXT, tier TEXT, billing TEXT, status TEXT,
  provider TEXT DEFAULT 'creem', provider_checkout_id TEXT, provider_order_id TEXT,
  provider_subscription_id TEXT, provider_customer_id TEXT, current_period_end TEXT,
  created_at TEXT NOT NULL, updated_at TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_checkout ON orders (provider_checkout_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_account ON orders (account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_subscription ON orders (provider_subscription_id)`,
  `CREATE TABLE IF NOT EXISTS processed_events (
  id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS wheels (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL, title TEXT, data TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_wheels_account ON wheels (account_id)`,
  `CREATE TABLE IF NOT EXISTS collect (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL, kind TEXT, data TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_collect_account ON collect (account_id)`,
  `CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL, kind TEXT, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_generations_account ON generations (account_id, created_at)`,
];

let schemaReady = false;
export async function ensureSchema(db) {
  if (!db || schemaReady) return;
  await db.batch(SCHEMA_DDL.map((sql) => db.prepare(sql)));
  schemaReady = true;
}

// Per-visitor rate limiting, kept in D1 so every isolate agrees.
export async function rateLimit(db, key, limit, windowMs) {
  if (!db) return true;
  const now = Date.now();
  const { results } = await db
    .prepare("SELECT window_start, count FROM shipsite_rate WHERE key = ?")
    .bind(key)
    .all();
  const row = results && results[0];
  if (!row || now - Date.parse(row.window_start) > windowMs) {
    await db
      .prepare(
        `INSERT INTO shipsite_rate (key, window_start, count) VALUES (?, ?, 1)
         ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1`
      )
      .bind(key, new Date(now).toISOString())
      .run();
    return true;
  }
  if (row.count >= limit) return false;
  await db.prepare("UPDATE shipsite_rate SET count = count + 1 WHERE key = ?").bind(key).run();
  return true;
}

const SESSION_COOKIE = "stw_session";
const SESSION_DAYS = 30;

export function sessionCookie(id) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function currentAccount(env, request) {
  if (!env.DB) return null;
  const sid = readCookie(request, SESSION_COOKIE);
  if (!sid) return null;
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.email, a.name, a.creem_customer_id
     FROM sessions s JOIN accounts a ON a.id = s.account_id
     WHERE s.id = ? AND s.expires_at > ?`
  )
    .bind(sid, new Date().toISOString())
    .all();
  return results && results[0] ? results[0] : null;
}

export async function createSession(env, accountId) {
  const id = `sess_${hex(16)}`;
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await env.DB.prepare("INSERT INTO sessions (id, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, accountId, now.toISOString(), expires.toISOString())
    .run();
  return id;
}
