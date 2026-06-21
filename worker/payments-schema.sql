-- Multi-rail payments — purchase ledger (Phase 1 core spine).
-- Lives in the existing D1 'aplusz-fares' (binding env.FARES_DB). New table, no collision with fares.
CREATE TABLE IF NOT EXISTS purchases (
  id           TEXT PRIMARY KEY,                 -- idempotency key / provider ref (paypal order id, bank ref, tx hash)
  rail         TEXT NOT NULL,                    -- paypal | bank | crypto
  tier         TEXT NOT NULL,                    -- pro | proplus
  days         INTEGER NOT NULL,                 -- prepaid duration in days
  email        TEXT,                             -- buyer email (magic-link delivery)
  amount_cents INTEGER NOT NULL,                 -- price in cents (server-authoritative)
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | expired | cancelled
  provider_ref TEXT,                             -- secondary provider reference, if any
  token        TEXT,                             -- granted signed tier-token (filled on claim)
  created_at   INTEGER NOT NULL,                 -- unix seconds
  paid_at      INTEGER                           -- unix seconds, set atomically on exactly-once claim
);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_email  ON purchases(email);
CREATE INDEX IF NOT EXISTS idx_purchases_ref    ON purchases(provider_ref);
