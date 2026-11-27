import { json, hex, accountGate, currentAccount } from "./util.mjs";

// Selling on the owner's Creem account (the payment platform this plan chose).
// The pricing contract sells exactly: Free $0; Plus $5/month, first month
// $2.99 for new customers until INTRO_ENDS_AT; Plus $48/year billed yearly.
const TIERS = {
  plus: { billing: "month", productVar: "PLUS_MONTHLY_PRODUCT_ID", introVar: "PLUS_MONTHLY_INTRO_PRODUCT_ID" },
  "plus-annual": { billing: "year", productVar: "PLUS_ANNUAL_PRODUCT_ID" },
};

// Owner decision (2026-11-27): the site is free — no paid plans are offered,
// so checkout and the billing portal refuse instead of selling. The pay

const FREE_LIMITS = { cloudGenerations: { perMonth: 0 } };
const PLUS_LIMITS = { cloudGenerations: { perMonth: 50 } };

export function tierLimits(tier) {
  return tier && tier.startsWith("plus") ? PLUS_LIMITS : FREE_LIMITS;
}

// The caller's paid tier: their latest order still inside its paid period.
// A canceled plan runs to the end of the period the buyer paid for.
export async function paidTier(env, account) {
  if (!account || !env.DB) return null;
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    `SELECT tier FROM orders
     WHERE account_id = ? AND status IN ('active', 'canceled')
       AND (current_period_end IS NULL OR current_period_end > ?)
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(account.id, now)
    .all();
  return results && results[0] ? results[0].tier : null;
}

export async function generationsUsed(env, account) {
  if (!env.DB || !account) return 0;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { results } = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM generations WHERE account_id = ? AND created_at >= ?"
  )
    .bind(account.id, monthStart.toISOString())
    .all();
  return results && results[0] ? results[0].n : 0;
}

export async function recordGeneration(env, accountId, kind) {
  if (!env.DB || !accountId) return;
  await env.DB.prepare("INSERT INTO generations (id, account_id, kind, created_at) VALUES (?, ?, ?, ?)")
    .bind(`gen_${hex(16)}`, accountId, kind, new Date().toISOString())
    .run();
}

async function creem(env, path, options = {}) {
  const base = env.PAYMENT_API_BASE || "https://test-api.creem.io/v1";
  const res = await fetch(base + path, {
    method: options.method || "GET",
    headers: {
      "x-api-key": env.PAYMENT_API_KEY || "",
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

function eventTypeName(event) {
  return event.eventType || event.event || event.type || "";
}

function eventObject(event) {
  return event.object || (event.data && event.data.object) || event.data || {};
}

// Grants a completed checkout: finds the pending order by checkout id, fills
// the provider ids and the period end, and keeps the customer on the account.
async function applyCheckout(env, checkout) {
  if (!env.DB || !checkout) return false;
  const meta = checkout.metadata || {};
  const accountId = meta.account_id;
  const checkoutId = checkout.id;
  if (!accountId || !checkoutId) return false;
  const { results } = await env.DB.prepare(
    "SELECT id, status FROM orders WHERE provider_checkout_id = ? ORDER BY created_at DESC LIMIT 1"
  )
    .bind(checkoutId)
    .all();
  const order = results && results[0];
  if (!order) return false;
  if (checkout.status && checkout.status !== "completed") return false;
  const sub = checkout.subscription || null;
  const customer = checkout.customer || {};
  await env.DB.prepare(
    `UPDATE orders SET status = 'active',
       provider_order_id = ?, provider_subscription_id = ?, provider_customer_id = ?,
       current_period_end = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(
      (checkout.order && checkout.order.id) || null,
      (sub && sub.id) || null,
      customer.id || null,
      (sub && sub.current_period_end_date) || null,
      new Date().toISOString(),
      order.id
    )
    .run();
  if (customer.id) {
    await env.DB.prepare("UPDATE accounts SET creem_customer_id = ? WHERE id = ? AND (creem_customer_id IS NULL OR creem_customer_id = '')")
      .bind(customer.id, accountId)
      .run();
  }
  return true;
}

// Subscription lifecycle: paid periods extend, cancellations let the plan run
// to the end of the period the buyer paid for.
async function applySubscription(env, sub) {
  if (!env.DB || !sub || !sub.id) return false;
  const status = String(sub.status || "").toLowerCase();
  const newStatus = status === "canceled" || status === "expired" ? "canceled" : "active";
  await env.DB.prepare(
    "UPDATE orders SET status = ?, current_period_end = COALESCE(?, current_period_end), updated_at = ? WHERE provider_subscription_id = ?"
  )
    .bind(newStatus, sub.current_period_end_date || null, new Date().toISOString(), sub.id)
    .run();
  return true;
}

async function applyRefund(env, obj) {
  if (!env.DB || !obj) return false;
  const orderId = (obj.order && obj.order.id) || obj.order_id || obj.id;
  if (!orderId) return false;
  await env.DB.prepare("UPDATE orders SET status = 'refunded', updated_at = ? WHERE provider_order_id = ?")
    .bind(new Date().toISOString(), orderId)
    .run();
  return true;
}

async function handlePlan(request, env, url) {
  const sessionId = url.searchParams.get("session_id");
  if (sessionId && env.DB) {
    const { results } = await env.DB.prepare(
      "SELECT tier, status FROM orders WHERE provider_checkout_id = ? ORDER BY created_at DESC LIMIT 1"
    )
      .bind(sessionId)
      .all();
    const order = results && results[0];
    const status = order ? order.status : "pending";
    return json({
      status,
      plan: status === "active" || status === "canceled" ? order.tier : null,
      paid: status === "active",
    });
  }
  const account = await currentAccount(env, request);
  const tier = await paidTier(env, account);
  const used = account ? await generationsUsed(env, account) : 0;
  const introEnds = env.INTRO_ENDS_AT || null;
  return json({
    paid: Boolean(tier),
    plan: tier || null,
    limits: tierLimits(tier),
    used: { cloudGenerations: used },
    plans: {
      free: { limits: FREE_LIMITS },
      plus: { limits: PLUS_LIMITS },
      "plus-annual": { limits: PLUS_LIMITS },
    },
    offers: [
      {
        plan: "plus",
        ends_at: introEnds,
        active: Boolean(introEnds && Date.now() < Date.parse(introEnds)),
      },
    ],
  });
}

async function handleCheckout(request, env, url) {
  const plan = url.searchParams.get("plan") || "plus";
  const spec = TIERS[plan];
  if (!spec) return json({ error: "unknown_plan", message: "That plan does not exist." }, 404);
  const account = await currentAccount(env, request);
  if (!account) return accountGate(request, url);
  if (!env.PAYMENT_API_KEY) return json({ error: "payments_not_configured" }, 503);
  if (!env.DB) return json({ error: "storage_unavailable" }, 503);

  // The first month at the intro price is for first-time customers only:
  // the checkout picks the intro product when the account never paid and the
  // offer has not ended (the end also lives on the product at the provider).
  const { results } = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM orders WHERE account_id = ? AND status IN ('active', 'canceled', 'refunded')"
  )
    .bind(account.id)
    .all();
  const everPaid = results && results[0] && results[0].n > 0;
  const introEnds = env.INTRO_ENDS_AT ? Date.parse(env.INTRO_ENDS_AT) : 0;
  let productId = env[spec.productVar];
  if (plan === "plus" && !everPaid && introEnds && Date.now() < introEnds && env[spec.introVar]) {
    productId = env[spec.introVar];
  }
  if (!productId) return json({ error: "product_not_configured" }, 503);

  const origin = env.NEXT_PUBLIC_SITE_URL || url.origin;
  const created = await creem(env, "/checkouts", {
    method: "POST",
    body: {
      product_id: productId,
      request_id: `${account.id}_${Date.now()}`,
      success_url: `${origin}/api/pay/return`,
      metadata: { account_id: account.id, tier: plan, billing: spec.billing },
      customer: { email: account.email },
    },
  });
  const checkout = created.data;
  if (!created.ok || !checkout || !checkout.checkout_url) {
    return json({ error: "checkout_failed", detail: checkout || null }, 502);
  }
  await env.DB.prepare(
    "INSERT INTO orders (id, account_id, tier, billing, status, provider, provider_checkout_id, created_at) VALUES (?, ?, ?, ?, 'pending', 'creem', ?, ?)"
  )
    .bind(`ord_${hex(16)}`, account.id, plan, spec.billing, checkout.id, new Date().toISOString())
    .run();
  if (request.method === "GET") {
    return new Response(null, {
      status: 302,
      headers: { Location: checkout.checkout_url, "Cache-Control": "no-store" },
    });
  }
  return json({ url: checkout.checkout_url, id: checkout.id });
}

async function handleReturn(request, env, url) {
  // Creem sends the buyer back with ?checkout_id=...; the webhook is the
  // source of truth, but the return route settles a granted checkout it can
  // already see so the buyer's page says "Plus" right away.
  const checkoutId = url.searchParams.get("checkout_id") || url.searchParams.get("checkout");
  const target = new URL("/pricing/", env.NEXT_PUBLIC_SITE_URL || url.origin);
  if (checkoutId) {
    target.searchParams.set("checkout", checkoutId);
    if (env.DB) {
      const { results } = await env.DB.prepare(
        "SELECT status FROM orders WHERE provider_checkout_id = ? LIMIT 1"
      )
        .bind(checkoutId)
        .all();
      const order = results && results[0];
      if (order && order.status === "pending") {
        const got = await creem(env, `/checkouts/${encodeURIComponent(checkoutId)}`);
        if (got.ok && got.data) await applyCheckout(env, got.data);
      }
    }
  }
  return new Response(null, { status: 302, headers: { Location: target.toString(), "Cache-Control": "no-store" } });
}

async function handlePortal(request, env, url) {
  const account = await currentAccount(env, request);
  if (!account) return accountGate(request, url);
  if (!account.creem_customer_id) {
    if (url && request.method === "GET" && (request.headers.get("sec-fetch-mode") === "navigate")) {
      return new Response(null, {
        status: 302,
        headers: { Location: new URL("/pricing/", url.origin).toString(), "Cache-Control": "no-store" },
      });
    }
    return json({ error: "no_purchase", message: "No purchase on this account yet." }, 404);
  }
  if (!env.PAYMENT_API_KEY) return json({ error: "payments_not_configured" }, 503);
  const created = await creem(env, "/customers/billing", {
    method: "POST",
    body: { customer_id: account.creem_customer_id },
  });
  const link = created.data && created.data.customer_portal_link;
  if (created.ok && link) {
    return new Response(null, { status: 302, headers: { Location: link, "Cache-Control": "no-store" } });
  }
  return json({ error: "portal_failed", detail: created.data || null }, 502);
}

async function handleWebhook(request, env) {
  const secret = env.PAYMENT_WEBHOOK_SECRET;
  const raw = await request.text();
  const signature = request.headers.get("creem-signature") || "";
  if (!secret) return json({ error: "webhook_not_configured" }, 503);
  // Creem signs webhooks with hex HMAC-SHA256 over the raw body.
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (signature !== expected) return json({ error: "invalid_signature" }, 401);

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (env.DB) {
    const eventId = event.id || `evt_${hex(16)}`;
    const { results } = await env.DB.prepare("SELECT id FROM processed_events WHERE id = ?").bind(eventId).all();
    if (results && results[0]) return json({ ok: true, duplicate: true });
    await env.DB.prepare("INSERT INTO processed_events (id, applied_at) VALUES (?, ?)")
      .bind(eventId, new Date().toISOString())
      .run();
  }

  const type = eventTypeName(event);
  const obj = eventObject(event);
  try {
    if (type === "checkout.completed") await applyCheckout(env, obj);
    else if (type.startsWith("subscription")) await applySubscription(env, obj);
    else if (type === "refund.created") await applyRefund(env, obj);
  } catch (err) {
    return json({ ok: false, error: "apply_failed", message: String(err && err.message) }, 500);
  }
  return json({ ok: true });
}

export async function handlePay(request, env, url, path) {
  if (path === "/api/pay/plan" && request.method === "GET") return handlePlan(request, env, url);
  if (path === "/api/pay/checkout" && (request.method === "GET" || request.method === "POST"))
    return handleCheckout(request, env, url);
  if (path === "/api/pay/portal" && request.method === "GET") return handlePortal(request, env, url);
  if (path === "/api/pay/return" && request.method === "GET") return handleReturn(request, env, url);
  if (path === "/api/pay/webhook" && request.method === "POST") return handleWebhook(request, env);
  return json({ error: "not_found" }, 404);
}
