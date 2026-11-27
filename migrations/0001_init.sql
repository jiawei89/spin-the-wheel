-- Spin the Wheel — the site's own data. Applied with
-- `npx wrangler d1 migrations apply DB --env preview --remote`
-- and again with --env production. Never edited by hand on the database.

-- The contact form's messages (owner-accounts contract; the owner's Studio
-- inbox reads production's table).
CREATE TABLE IF NOT EXISTS shipsite_contact_messages (
  id TEXT PRIMARY KEY,
  path TEXT,
  payload TEXT,
  created_at TEXT NOT NULL
);

-- Analytics events reported by the site's own pages.
CREATE TABLE IF NOT EXISTS shipsite_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT,
  props TEXT,
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_occurred ON shipsite_events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_name ON shipsite_events (name, occurred_at);

-- Per-visitor rate-limit windows (contact, events).
CREATE TABLE IF NOT EXISTS shipsite_rate (
  key TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL
);

-- Accounts, sessions and the OAuth state exchange (Google sign-in; the owner's
-- client is not saved yet, so these sit ready for it).
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  google_sub TEXT UNIQUE,
  creem_customer_id TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  return_to TEXT,
  created_at TEXT NOT NULL
);

-- Purchases: one row per checkout, updated by the provider's webhook.
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  tier TEXT,
  billing TEXT,
  status TEXT,
  provider TEXT DEFAULT 'creem',
  provider_checkout_id TEXT,
  provider_order_id TEXT,
  provider_subscription_id TEXT,
  provider_customer_id TEXT,
  current_period_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_checkout ON orders (provider_checkout_id);
CREATE INDEX IF NOT EXISTS idx_orders_account ON orders (account_id);
CREATE INDEX IF NOT EXISTS idx_orders_subscription ON orders (provider_subscription_id);

-- Webhook events already applied (idempotency).
CREATE TABLE IF NOT EXISTS processed_events (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- Cloud saves: wheels synced, collected results, AI entry ideas. Each Plus
-- feature the pricing contract sells ("50 cloud generations of participant
-- results and AI entry ideas" per month) writes one generations row.
CREATE TABLE IF NOT EXISTS wheels (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  title TEXT,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wheels_account ON wheels (account_id);

CREATE TABLE IF NOT EXISTS collect (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT,
  data TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_collect_account ON collect (account_id);

CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_generations_account ON generations (account_id, created_at);
