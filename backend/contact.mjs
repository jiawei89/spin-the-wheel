import { json, hex, visitorKey, rateLimit } from "./util.mjs";

// POST /api/_site/contact — the contact form's own route. Rate-limited per
// visitor, kept in D1 (shipsite_contact_messages) for the owner's inbox.
export async function handleContact(request, env, url) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json", message: "The message was not valid JSON." }, 400);
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!message) return json({ error: "message_required", message: "Write a message first." }, 400);
  if (message.length > 20000) return json({ error: "message_too_long" }, 400);
  if (!env.DB) return json({ error: "storage_unavailable" }, 503);

  const limited = await rateLimit(env.DB, `contact:${visitorKey(request)}`, 5, 10 * 60 * 1000);
  if (!limited) {
    return json(
      { error: "rate_limited", message: "Too many messages right now. Try again in ten minutes." },
      429
    );
  }

  const id = `msg_${hex(16)}`;
  const payload = { ...body, email, message };
  await env.DB.prepare(
    "INSERT INTO shipsite_contact_messages (id, path, payload, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(id, typeof body.path === "string" ? body.path : url.pathname, JSON.stringify(payload), new Date().toISOString())
    .run();
  return json({ ok: true, id });
}
