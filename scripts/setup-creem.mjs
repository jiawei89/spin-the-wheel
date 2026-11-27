// Sets up the site's products and webhook on the owner's Creem account
// (the payment platform this plan chose). Run once per environment:
//   test:   CREEM_API_BASE=https://test-api.creem.io/v1 CREEM_API_KEY=$SHIPSITE_SECRET_PAYMENT_TEST_API_KEY WEBHOOK_URL=<preview>/api/pay/webhook
//   live:   CREEM_API_BASE=https://api.creem.io/v1     CREEM_API_KEY=$SHIPSITE_SECRET_PAYMENT_API_KEY     WEBHOOK_URL=<production>/api/pay/webhook
// Idempotent: products are created-or-updated by external_id, and an existing
// webhook at the same URL is reused. The webhook signing secret is written to
// .cache/creem-webhook-secret.txt (never printed, never committed).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const key = process.env.CREEM_API_KEY;
const base = process.env.CREEM_API_BASE || "https://test-api.creem.io/v1";
const projectId = process.env.SHIPSITE_PROJECT_ID || "";
const mode = base.includes("test-api") ? "test" : "live";
if (!key) {
  console.error("SETUP_CREEM missing CREEM_API_KEY");
  process.exit(1);
}

async function api(path, options = {}) {
  const res = await fetch(base + path, {
    method: options.method || "GET",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    console.error(`SETUP_CREEM ${options.method || "GET"} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  }
  return { ok: res.ok, status: res.status, data };
}

const baseProduct = {
  name: "Spin the Wheel Plus",
  description:
    "Plus for Spin the Wheel: 50 cloud generations of participant results and AI entry ideas every month, cloud sync of your wheels. The wheel itself stays free.",
  price: 500,
  currency: "USD",
  billing_type: "recurring",
  billing_period: "every-month",
  tax_category: "saas",
};

const products = [
  {
    ...baseProduct,
    external_id: "stw-plus-monthly",
    metadata: { shipsite_project_id: projectId, shipsite_tier_id: "plus", shipsite_billing: "month" },
  },
  {
    ...baseProduct,
    external_id: "stw-plus-monthly-intro",
    name: "Spin the Wheel Plus (first month $2.99)",
    description:
      "Plus for Spin the Wheel: first month $2.99 for new customers, then $5/month. Cancel anytime. The wheel itself stays free.",
    trial_period_days: 30,
    trial_price: 299,
    metadata: {
      shipsite_project_id: projectId,
      shipsite_tier_id: "plus",
      shipsite_billing: "month",
      shipsite_intro: "1",
    },
  },
  {
    ...baseProduct,
    external_id: "stw-plus-annual",
    name: "Spin the Wheel Plus (yearly)",
    description:
      "Plus for Spin the Wheel billed yearly: $48/year (the monthly plan's $12 equivalent, save 20%). The wheel itself stays free.",
    billing_period: "every-year",
    price: 4800,
    metadata: { shipsite_project_id: projectId, shipsite_tier_id: "plus", shipsite_billing: "year" },
  },
];

const ids = {};
for (const product of products) {
  const created = await api("/products", { method: "POST", body: product });
  if (created.ok && created.data && created.data.id) {
    ids[product.external_id] = created.data.id;
    console.log(`product ${product.external_id} -> ${created.data.id}`);
  } else {
    console.error(`product ${product.external_id} FAILED`);
  }
}

// Webhook: reuse an endpoint already at this URL, else create one.
let webhookUrl = process.env.WEBHOOK_URL || "";
if (!webhookUrl) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const subRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const subJson = await subRes.json().catch(() => null);
  const subdomain = subJson && subJson.result && subJson.result.subdomain;
  const workerName = mode === "test"
    ? process.env.PREVIEW_WORKER_NAME
    : process.env.PRODUCTION_WORKER_NAME;
  if (!subdomain || !workerName) {
    console.error("SETUP_CREEM cannot build a webhook URL (set WEBHOOK_URL)");
    process.exit(1);
  }
  webhookUrl = `https://${workerName}.${subdomain}.workers.dev/api/pay/webhook`;
}

const events = [
  "checkout.completed",
  "subscription.active",
  "subscription.paid",
  "subscription.canceled",
  "subscription.expired",
  "refund.created",
];

let secret = null;
const listed = await api("/webhooks");
const existing = (listed.ok && Array.isArray(listed.data)) ? listed.data : (listed.data && Array.isArray(listed.data.items) ? listed.data.items : []);
const mine = existing.find((w) => w && (w.url === webhookUrl));
if (mine && mine.id) {
  console.log(`webhook reused ${mine.id} at ${webhookUrl}`);
  const got = await api(`/webhooks/${mine.id}/secret`);
  if (got.ok && got.data && got.data.secret) secret = got.data.secret;
} else {
  const created = await api("/webhooks", { method: "POST", body: { url: webhookUrl, name: `spin-the-wheel-${mode}`, events } });
  if (created.ok && created.data && created.data.id) {
    console.log(`webhook created ${created.data.id} at ${webhookUrl}`);
    if (created.data.secret) secret = created.data.secret;
  } else {
    console.error("webhook FAILED");
  }
}

if (secret) {
  mkdirSync(".cache", { recursive: true });
  writeFileSync(`.cache/creem-webhook-secret-${mode}.txt`, secret);
  console.log(`webhook secret written to .cache/creem-webhook-secret-${mode}.txt`);
}

console.log(
  "SETUP " +
    JSON.stringify({
      env: mode,
      ids,
      webhook: webhookUrl,
      secretSaved: Boolean(secret),
    })
);
