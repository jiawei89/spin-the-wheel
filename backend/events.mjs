import { json, hex, visitorKey, rateLimit } from "./util.mjs";

const NAME_RE = /^[a-z][a-z0-9_]{1,39}$/;

function validEvent(e) {
  return e && typeof e.name === "string" && NAME_RE.test(e.name);
}

// POST /api/_site/events — the site's own analytics route. Accepts one event
// or an {events: [...]} batch; each row is "evt_" + 16 lowercase hex chars.
export async function handleEvents(request, env, url) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!env.DB) return json({ error: "storage_unavailable" }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const events = Array.isArray(body.events) ? body.events : [body];
  const good = events.filter(validEvent).slice(0, 20);
  if (good.length === 0) return json({ error: "invalid_event", message: "No valid event in the batch." }, 400);

  const limited = await rateLimit(env.DB, `events:${visitorKey(request)}`, 120, 5 * 60 * 1000);
  if (!limited) return json({ error: "rate_limited" }, 429);

  const now = new Date().toISOString();
  const ids = [];
  for (const e of good) {
    const id = `evt_${hex(16)}`;
    ids.push(id);
    await env.DB.prepare(
      "INSERT INTO shipsite_events (id, name, path, props, occurred_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(
        id,
        e.name,
        typeof e.path === "string" ? e.path : url.pathname,
        e.props === undefined ? null : JSON.stringify(e.props),
        typeof e.occurredAt === "string" ? e.occurredAt : now
      )
      .run();
  }
  return json({ ok: true, ids });
}
