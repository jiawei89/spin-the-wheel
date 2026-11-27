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
