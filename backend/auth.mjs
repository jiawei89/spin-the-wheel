import {
  json,
  hex,
  sessionCookie,
  clearedSessionCookie,
  currentAccount,
  createSession,
} from "./util.mjs";

// Google sign-in runs the OAuth code flow with the owner's own client. No
// client is saved for this site yet, so every route answers plainly and the
// visitor sees that sign-in is not set up; a later secret turns it on.
export function googleConfigured(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function startResponse(url, env, state, returnTo) {
  const redirect = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  redirect.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  redirect.searchParams.set("redirect_uri", `${url.origin}/api/auth/google/callback`);
  redirect.searchParams.set("response_type", "code");
  redirect.searchParams.set("scope", "openid email profile");
  redirect.searchParams.set("state", `${state}:${encodeURIComponent(returnTo)}`);
  redirect.searchParams.set("prompt", "select_account");
  return new Response(null, { status: 302, headers: { Location: redirect.toString(), "Cache-Control": "no-store" } });
}

async function handleStart(request, env, url) {
  const returnTo = url.searchParams.get("return") || "/";
  if (!googleConfigured(env)) {
    return json({
      error: "google_auth_not_configured",
      message: "Sign in with Google is not set up for this site yet.",
    });
  }
  const safeReturn = returnTo.startsWith("/") ? returnTo : "/";
  const state = hex(16);
  await env.DB.prepare("INSERT INTO oauth_states (state, return_to, created_at) VALUES (?, ?, ?)")
    .bind(state, safeReturn, new Date().toISOString())
    .run();
  return startResponse(url, env, state, safeReturn);
}

async function handleCallback(request, env, url) {
  if (!googleConfigured(env)) {
    return json({
      error: "google_auth_not_configured",
      message: "Sign in with Google is not set up for this site yet.",
    });
  }
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state") || "";
  const [state, encodedReturn] = stateRaw.split(":");
  const returnTo = encodedReturn ? decodeURIComponent(encodedReturn) : "/";
  if (!code || !state) return json({ error: "invalid_callback" }, 400);

  const { results } = await env.DB.prepare("SELECT return_to FROM oauth_states WHERE state = ?").bind(state).all();
  const row = results && results[0];
  if (!row) return json({ error: "invalid_state" }, 400);
  await env.DB.prepare("DELETE FROM oauth_states WHERE state = ?").bind(state).run();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  const token = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !token || !token.access_token) return json({ error: "token_exchange_failed" }, 502);

  // Validate the id_token with Google's tokeninfo on the plan's chosen host:
  // the token came straight from the token exchange over TLS, and tokeninfo
  // checks its signature and audience without a second provider host.
  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token.id_token || "")}`
  );
  const info = await infoRes.json().catch(() => null);
  if (!infoRes.ok || !info || !info.sub || info.aud !== env.GOOGLE_CLIENT_ID) {
    return json({ error: "userinfo_failed" }, 502);
  }

  const email = typeof info.email === "string" ? info.email : null;
  const name = typeof info.name === "string" ? info.name : null;
  const existing = await env.DB.prepare("SELECT id FROM accounts WHERE google_sub = ?").bind(info.sub).all();
  let accountId = existing.results && existing.results[0] && existing.results[0].id;
  if (!accountId) {
    accountId = `acct_${hex(16)}`;
    await env.DB.prepare("INSERT INTO accounts (id, email, name, google_sub, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(accountId, email, name, info.sub, new Date().toISOString())
      .run();
  }
  const sid = await createSession(env, accountId);
  const target = new URL(row.return_to || "/", url.origin);
  return new Response(null, {
    status: 302,
    headers: { Location: target.toString(), "Set-Cookie": sessionCookie(sid), "Cache-Control": "no-store" },
  });
}

export async function handleAuth(request, env, url, path) {
  if (!env.DB) return json({ error: "storage_unavailable" }, 503);
  if (path === "/api/auth/google/start" && request.method === "GET") return handleStart(request, env, url);
  if (path === "/api/auth/google/callback" && request.method === "GET") return handleCallback(request, env, url);
  if (path === "/api/auth/me" && request.method === "GET") {
    const account = await currentAccount(env, request);
    return json({
      account: account ? { id: account.id, email: account.email, name: account.name } : null,
    });
  }
  if (path === "/api/auth/logout" && request.method === "POST") {
    const sid = (request.headers.get("cookie") || "").match(/stw_session=([^;]+)/);
    if (sid && env.DB) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sid[1]).run();
    return json({ ok: true }, 200, { "Set-Cookie": clearedSessionCookie() });
  }
  return json({ error: "not_found" }, 404);
}
