// ===== Multi-rail payments — core spine (Phase 1) =============================
// Paste this block into apluszworker/index.js, ABOVE the fetch handler (so it
// shares scope with hmac() / b64url() / b64urlStr() / env.SIGNING_SECRET).
// Credential-free: needs only SIGNING_SECRET (set) + D1 binding env.FARES_DB (live).
// All four rails (PayPal, Wero, SEPA, crypto) funnel through grantTier().

const TIERS     = { pro: 499, proplus: 999 };  // price in cents (server-authoritative source of truth)
const DURATIONS = [1, 3, 6, 12];               // prepaid months offered to the buyer

// --- Mint adapter -----------------------------------------------------------
// Signs a {e,t,x} tier-token for ANY tier + ANY expiry. Inlines the exact same
// payload + hmac + b64url pattern your makeToken/makeGiftToken already emit, so
// /validate and billing.js accept these byte-for-byte. (Neither existing signer
// can do tier+expiry both: makeToken fixes expiry, makeGiftToken fixes tier.)
async function mintTierToken(env, email, tier, expiryUnix) {
  const payload = { e: email || '', t: tier, x: expiryUnix };
  const body = b64urlStr(JSON.stringify(payload));
  const sig  = b64url(await hmac(env.SIGNING_SECRET, body));
  return body + '.' + sig;
}

// --- grantTier: the shared mint every rail calls ----------------------------
// Mints a prepaid time-block token: `tier` valid for `days` from now.
async function grantTier(env, { email, tier, days }) {
  if (!TIERS[tier])           throw new Error('bad tier: ' + tier);
  if (!Number.isFinite(days)) throw new Error('bad days: ' + days);
  const expiry = Math.floor(Date.now() / 1000) + days * 86400;
  const token  = await mintTierToken(env, email, tier, expiry);
  return { token, expiry, tier, email: email || '' };
}

// --- createPurchase: park a pending row (idempotent) ------------------------
// Re-inserting the same id is a silent no-op (ON CONFLICT DO NOTHING).
async function createPurchase(env, { id, rail, tier, days, email, amountCents, providerRef }) {
  await env.FARES_DB.prepare(
    `INSERT INTO purchases (id, rail, tier, days, email, amount_cents, status, provider_ref, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
     ON CONFLICT(id) DO NOTHING`
  ).bind(id, rail, tier, days, email || null, amountCents, providerRef || null,
         Math.floor(Date.now() / 1000)).run();
  return { id, status: 'pending' };
}

// --- claimAndGrant: atomic exactly-once claim, then grant -------------------
// Flips pending->paid for THIS id only. Under concurrent calls for the same id,
// exactly one wins (changes===1); the rest no-op. Prevents double-grant.
async function claimAndGrant(env, { id }) {
  const now = Math.floor(Date.now() / 1000);
  const upd = await env.FARES_DB.prepare(
    `UPDATE purchases SET status='paid', paid_at=? WHERE id=? AND status='pending'`
  ).bind(now, id).run();

  if (!upd.meta || upd.meta.changes !== 1) {
    return { granted: false, alreadyClaimed: true };   // lost the race, or unknown/paid id
  }
  const row = await env.FARES_DB.prepare(
    `SELECT email, tier, days FROM purchases WHERE id=?`
  ).bind(id).first();

  const g = await grantTier(env, { email: row.email, tier: row.tier, days: row.days });
  await env.FARES_DB.prepare(`UPDATE purchases SET token=? WHERE id=?`)
    .bind(g.token, id).run();

  return { granted: true, token: g.token, email: g.email, tier: g.tier, expiry: g.expiry };
}
// ===== end core spine =======================================================
