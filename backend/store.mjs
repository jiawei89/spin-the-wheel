// Cloud storage and the AI entry-ideas feature: Plus-only routes with the
// pricing contract's per-kind limits (monetization/1.2). Wheel sync is a
// storage allowance (20 stored wheels per account), participant results are
// metered per month (100), and AI entry ideas run on the owner's key and are
// metered per month (50). The free tier never reaches these routes:
// plusAccount answers plan_required with the upgrade link, and nothing is
// metered on the free tier — its work runs on the visitor's device.
import { json, hex, accountGate, currentAccount } from "./util.mjs";
import { paidTier } from "./pay.mjs";

const WHEEL_CAP = 20; // stored wheels per Plus account (storage, not metered)
const COLLECT_CAP = 100; // participant results per month
const AI_CAP = 50; // AI entry-idea generations per month (the metered bucket)

function monthStart() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function resetsAt() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

async function countSince(env, accountId, table, since) {
  const { results } = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM ${table} WHERE account_id = ? AND created_at >= ?`
  )
    .bind(accountId, since)
    .all();
  return results && results[0] ? results[0].n : 0;
}

// Sign-in first, then a paid tier: free visitors keep everything on the
// device, so a signed-out visitor goes to sign-in and a signed-in free
// visitor gets the upgrade prompt with the pricing link.
async function plusAccount(env, request, url) {
  const account = await currentAccount(env, request);
  if (!account) return { gate: accountGate(request, url) };
  const tier = await paidTier(env, account);
  if (!tier) {
    return {
      gate: json(
        {
          error: "plan_required",
          message: "Cloud sync, collections and AI entry ideas come with Plus.",
          upgrade_url: "/pricing/",
        },
        403
      ),
    };
  }
  return { account, tier };
}

async function listWheels(env, request, url) {
  const account = await currentAccount(env, request);
  if (!account) return accountGate(request, url);
  const { results } = await env.DB.prepare(
    "SELECT id, title, data, updated_at FROM wheels WHERE account_id = ? ORDER BY updated_at DESC LIMIT 200"
  )
    .bind(account.id)
    .all();
  const stored = results ? results.length : 0;
  return json({ wheels: results || [], used: stored, cap: WHEEL_CAP });
}

async function saveWheel(env, request, url) {
  const ent = await plusAccount(env, request, url);
  if (ent.gate) return ent.gate;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const title = typeof body.title === "string" ? body.title.slice(0, 120) : "";
  const data = body.data;
  if (data === undefined || data === null) return json({ error: "data_required" }, 400);
  const stored = await countSince(env, ent.account.id, "wheels", "1970-01-01T00:00:00.000Z");
  const updating = typeof body.id === "string" && body.id.startsWith("whl_");
  if (!updating && stored >= WHEEL_CAP) {
    return json(
      {
        error: "limit_reached",
        message: "Your plan stores up to 20 wheels in the cloud. Delete one to sync another.",
        cap: WHEEL_CAP,
        used: stored,
      },
      403
    );
  }
  const now = new Date().toISOString();
  const id = updating ? body.id : `whl_${hex(16)}`;
  await env.DB.prepare(
    `INSERT INTO wheels (id, account_id, title, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, data = excluded.data, updated_at = excluded.updated_at
     WHERE account_id = excluded.account_id`
  )
    .bind(id, ent.account.id, title, JSON.stringify(data), now, now)
    .run();
  return json({ ok: true, id, used: stored, cap: WHEEL_CAP });
}

async function deleteWheel(env, request, url, wheelId) {
  const account = await currentAccount(env, request);
  if (!account) return accountGate(request, url);
  await env.DB.prepare("DELETE FROM wheels WHERE id = ? AND account_id = ?").bind(wheelId, account.id).run();
  return json({ ok: true });
}

async function listCollect(env, request, url) {
  const account = await currentAccount(env, request);
  if (!account) return accountGate(request, url);
  const { results } = await env.DB.prepare(
    "SELECT id, kind, data, created_at FROM collect WHERE account_id = ? ORDER BY created_at DESC LIMIT 200"
  )
    .bind(account.id)
    .all();
  const used = await countSince(env, account.id, "collect", monthStart());
  return json({ results: results || [], used, cap: COLLECT_CAP });
}

async function addCollect(env, request, url) {
  const ent = await plusAccount(env, request, url);
  if (ent.gate) return ent.gate;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const used = await countSince(env, ent.account.id, "collect", monthStart());
  if (used >= COLLECT_CAP) {
    return json(
      {
        error: "limit_reached",
        message: `You have collected 100 participant results this month — the count resets ${resetsAt()}.`,
        cap: COLLECT_CAP,
        used,
        resets_at: resetsAt(),
      },
      403
    );
  }
  const id = `col_${hex(16)}`;
  await env.DB.prepare("INSERT INTO collect (id, account_id, kind, data, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, ent.account.id, typeof body.kind === "string" ? body.kind : "result", JSON.stringify(body.data ?? body), new Date().toISOString())
    .run();
  return json({ ok: true, id, used: used + 1, cap: COLLECT_CAP, resets_at: resetsAt() });
}

async function aiIdeas(env, request, url) {
  const ent = await plusAccount(env, request, url);
  if (ent.gate) return ent.gate;
  if (!env.LLM_API_KEY) {
    return json(
      { error: "api_key_missing", message: "The owner has not connected an AI key yet, so entry ideas are unavailable." },
      503
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const topic = typeof body.topic === "string" ? body.topic.slice(0, 200) : "";
  const used = await countSince(env, ent.account.id, "generations", monthStart());
  if (used >= AI_CAP) {
    return json(
      {
        error: "limit_reached",
        message: `You have used your 50 entry-idea generations for this month. They reset ${resetsAt()}.`,
        cap: AI_CAP,
        used,
        resets_at: resetsAt(),
      },
      403
    );
  }
  // Gemini on the owner's key — the plan's chosen provider. LLM_BASE_URL and
  // LLM_MODEL point it at a compatible endpoint if the owner swaps keys.
  const base = env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
  const model = env.LLM_MODEL || "gemini-2.0-flash";
  const res = await fetch(`${base}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": env.LLM_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                "You suggest entries for a random-picker wheel. Answer with a JSON array of 8 short strings, no numbering, no commentary." +
                (topic ? `\n\nWheel topic: ${topic}` : "\n\nSuggest 8 fun wheel entries."),
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.8 },
    }),
  });
  const data = await res.json().catch(() => null);
  const content =
    data && data.candidates && data.candidates[0] && data.candidates[0].content
      ? (data.candidates[0].content.parts || []).map((p) => p.text || "").join("")
      : "";
  if (!res.ok || !content) return json({ error: "ai_failed" }, 502);
  let ideas = [];
  try {
    const parsed = JSON.parse(content);
    ideas = Array.isArray(parsed) ? parsed.map(String).slice(0, 8) : [];
  } catch {
    ideas = content.split("\n").map((s) => s.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 8);
  }
  // A failed generation is not charged to the allowance: the row lands only
  // after the ideas came back.
  await env.DB.prepare("INSERT INTO generations (id, account_id, kind, created_at) VALUES (?, ?, ?, ?)")
    .bind(`gen_${hex(16)}`, ent.account.id, "ai", new Date().toISOString())
    .run();
  return json({ ok: true, ideas, used: used + 1, cap: AI_CAP, resets_at: resetsAt() });
}

export async function handleStore(request, env, url, path) {
  if (!env.DB) return json({ error: "storage_unavailable" }, 503);
  if (path === "/api/wheels" && request.method === "GET") return listWheels(env, request, url);
  if (path === "/api/wheels" && request.method === "POST") return saveWheel(env, request, url);
  if (path.startsWith("/api/wheels/") && request.method === "DELETE") {
    return deleteWheel(env, request, url, decodeURIComponent(path.slice("/api/wheels/".length)));
  }
  if (path === "/api/collect" && request.method === "GET") return listCollect(env, request, url);
  if (path === "/api/collect" && request.method === "POST") return addCollect(env, request, url);
  if (path === "/api/ai/ideas" && request.method === "POST") return aiIdeas(env, request, url);
  return json({ error: "not_found" }, 404);
}
