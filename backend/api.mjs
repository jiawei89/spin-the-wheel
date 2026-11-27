import { json, ensureSchema } from "./util.mjs";
import { handleContact } from "./contact.mjs";
import { handleEvents } from "./events.mjs";
import { handleAuth } from "./auth.mjs";
import { handleStore } from "./store.mjs";
import { handlePay } from "./pay.mjs";

// The site's own /api routes. worker.mjs dispatches here before the asset
// layer, so /api paths are never treated as pages and never redirected.
export async function handleApi(request, env) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  try {
    await ensureSchema(env.DB);
    if (path === "/api/_site/contact") return await handleContact(request, env, url);
    if (path === "/api/_site/events") return await handleEvents(request, env, url);
    if (path.startsWith("/api/auth/")) return await handleAuth(request, env, url, path);
    if (path.startsWith("/api/wheels") || path.startsWith("/api/collect") || path.startsWith("/api/ai/"))
      return await handleStore(request, env, url, path);
    if (path.startsWith("/api/pay/")) return await handlePay(request, env, url, path);
    return json({ error: "not_found" }, 404);
  } catch (err) {
    return json({ error: "internal_error", message: String((err && err.message) || err) }, 500);
  }
}
