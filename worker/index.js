/* ============================================================
   APlusZ — Auth & Billing Worker (Step 18)
   Deploy: Cloudflare Workers → https://api.aplusz.app
   Save:   D:\Destop\AplusZ\worker\index.js

   Responsibilities:
     1. Email-first checkout (binds payment to a verified email)
     2. Un-foolable tier unlock via HMAC-signed token (no honor-flag)
     3. Magic-link retrieval of paid access on any device (Resend)
     4. Live entitlement from Stripe ("true to usage")
     5. Auto-pause at €62,000 Stripe revenue / year  + manual pause
        → when paused, everyone is free until 1 January (auto-reset)

   Secrets live ONLY in Cloudflare (wrangler secret / dashboard),
   never in this file or the repo. KV namespace binding: AZKV
   ============================================================ */

import { fareRoutes } from "./fare-intelligence/routes.js";

const CAP_CENTS = 6200000;          // €62,000
const TOKEN_TTL = 30 * 86400;       // 30 days (seconds)
const MAGIC_TTL = 30 * 60;          // magic link valid 30 min

/* ---------- small helpers ---------- */
const enc = new TextEncoder();
const json = (o, status = 200, origin = '*') =>
  new Response(JSON.stringify(o), {
    status,
    headers: { 'content-type': 'application/json', ...cors(origin) }
  });
const cors = (origin) => ({
  'access-control-allow-origin': origin,
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type'
});
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlStr = (s) => b64url(enc.encode(s));
const fromB64url = (s) =>
  atob(s.replace(/-/g, '+').replace(/_/g, '/'));

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', key, enc.encode(msg));
}
function timingSafe(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const normEmail = (e) => ('' + (e || '')).trim().toLowerCase();
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const year = () => new Date().getUTCFullYear();

/* ---------- signed access token: payload.sig ---------- */
async function makeToken(env, email, tier) {
  const payload = { e: email, t: tier, x: Math.floor(Date.now() / 1000) + TOKEN_TTL };
  const body = b64urlStr(JSON.stringify(payload));
  const sig = b64url(await hmac(env.SIGNING_SECRET, body));
  return body + '.' + sig;
}
async function readToken(env, token) {
  if (!token || token.indexOf('.') === -1) return null;
  const [body, sig] = token.split('.');
  const expect = b64url(await hmac(env.SIGNING_SECRET, body));
  if (!timingSafe(sig, expect)) return null;
  let p;
  try { p = JSON.parse(fromB64url(body)); } catch { return null; }
  if (!p.x || p.x < Math.floor(Date.now() / 1000)) return null;
  return p; // { e, t, x }
}


/* ---------- GIFT comp-access: signed token + KV single-use/single-device ----------
   A gift = a normal proplus access token with a custom expiry, gated by:
     KV  gift:<code> -> { used, deviceId, exp, days }
   No secret on the public site; generation is ADMIN_PASS-gated. */
async function makeGiftToken(env, exp) {
  // mirrors makeToken shape {e,t,x} so /validate + billing.js treat it identically
  const payload = { e: 'gift', t: 'proplus', x: exp, g: 1 };
  const body = b64urlStr(JSON.stringify(payload));
  const sig = b64url(await hmac(env.SIGNING_SECRET, body));
  return body + '.' + sig;
}
function randCode() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    ([1e7]+-1e3+-4e3).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
function randDevice() {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(a).map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ---------- admin session cookie validation ---------- */
async function validAdminCookie(env, req) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)az_admin=([^;]+)/);
  if (!m) return false;
  const tok = m[1];
  if (tok.indexOf('.') === -1) return false;
  const [body, sig] = tok.split('.');
  const expect = b64url(await hmac(env.SIGNING_SECRET, 'admin.' + body));
  if (!timingSafe(sig, expect)) return false;
  let p; try { p = JSON.parse(fromB64url(body)); } catch { return false; }
  if (!p.x || p.x < Math.floor(Date.now() / 1000)) return false;
  return true;
}

/* ---------- Stripe REST (no SDK; fetch + form encoding) ---------- */
async function stripe(env, path, method = 'GET', form = null) {
  const opt = {
    method,
    headers: {
      authorization: 'Bearer ' + env.STRIPE_SECRET,
      'content-type': 'application/x-www-form-urlencoded'
    }
  };
  if (form) opt.body = new URLSearchParams(form).toString();
  const r = await fetch('https://api.stripe.com/v1/' + path, opt);
  return r.json();
}

/* highest active paid tier for an email, live from Stripe */
async function tierForEmail(env, email) {
  if (email === normEmail(env.OWNER_EMAIL)) return 'proplus'; // owner: lifetime, uncounted
  const cust = await stripe(env, 'customers?email=' + encodeURIComponent(email) + '&limit=10');
  if (!cust.data || !cust.data.length) return 'free';
  let best = 'free';
  for (const c of cust.data) {
    const subs = await stripe(env, 'subscriptions?customer=' + c.id + '&status=active&limit=10');
    for (const s of (subs.data || [])) {
      const t = s.items?.data?.[0]?.price?.metadata?.tier
        || s.metadata?.tier || '';
      if (t === 'proplus') best = 'proplus';
      else if (t === 'pro' && best !== 'proplus') best = 'pro';
    }
  }
  return best;
}

/* ---------- MailerSend email (RESEND_KEY holds the mlsn. token) ---------- */
async function sendMail(env, to, subject, html) {
  return fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + env.RESEND_KEY,
      'content-type': 'application/json',
      'x-requested-with': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      from: { email: 'automail@aplusz.app', name: 'AplusZ' },
      to: [{ email: to }],
      subject,
      html
    })
  });
}
async function emailMagicLink(env, email, tier) {
  const payload = { e: email, t: tier, x: Math.floor(Date.now() / 1000) + MAGIC_TTL };
  const body = b64urlStr(JSON.stringify(payload));
  const sig = b64url(await hmac(env.SIGNING_SECRET, 'magic.' + body));
  const link = env.APP_URL + '/?magic=' + body + '.' + sig;
  const html =
    '<div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto">' +
    '<h2 style="color:#0f172a">Your A+Z.app access</h2>' +
    '<p>Tap below to unlock your <b>' + (tier === 'proplus' ? 'Pro+' : 'Pro') + '</b> plan on this device.</p>' +
    '<p><a href="' + link + '" style="display:inline-block;background:#2563eb;color:#fff;' +
    'padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Unlock my plan</a></p>' +
    '<p style="color:#64748b;font-size:13px">This link works once and expires in 30 minutes. ' +
    'Keep this email — it is the only way to restore your paid plan on a new device.</p></div>';
  return sendMail(env, email, 'Your A+Z.app access link', html);
}

/* ---------- cap state ---------- */
async function capOn(env) {
  if ((await env.AZKV.get('pause:manual')) === '1') return true;
  const cents = parseInt((await env.AZKV.get('rev:' + year())) || '0', 10);
  return cents >= CAP_CENTS;
}
async function addRevenue(env, cents) {
  const key = 'rev:' + year();
  const cur = parseInt((await env.AZKV.get(key)) || '0', 10) + cents;
  await env.AZKV.put(key, String(cur));
  if (cur >= CAP_CENTS && (await env.AZKV.get('pause:auto:' + year())) !== '1') {
    await env.AZKV.put('pause:auto:' + year(), '1');
    await pauseAllSubs(env, 'auto');
  }
}
async function pauseAllSubs(env, reason) {
  let starting = null, guard = 0;
  do {
    const q = 'subscriptions?status=active&limit=100' + (starting ? '&starting_after=' + starting : '');
    const list = await stripe(env, q);
    for (const s of (list.data || [])) {
      await stripe(env, 'subscriptions/' + s.id, 'POST', { 'pause_collection[behavior]': 'void' });
      starting = s.id;
    }
    var more = list.has_more;
  } while (more && ++guard < 20);
  await sendCapNotices(env, reason);
}
async function sendCapNotices(env, reason) {
  // best-effort: email known customers that billing is paused & free till Jan 1
  const list = await stripe(env, 'customers?limit=100');
  for (const c of (list.data || [])) {
    if (!c.email) continue;
    await sendMail(env, c.email, 'A+Z.app is free for everyone until January',
      '<p>Good news — every A+Z.app feature is free for all users until <b>1 January</b>. ' +
      'Your billing is paused; nothing will be charged until then.</p>');
  }
}

/* ============================================================
   DAILY GIFT — cron auto-generates one 30-day code per day
   at a random minute. Stored as KV dailygift:current.
   Roulette — global counter: 1 win per 1,500 spins.
   ============================================================ */

function giftRandCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) c += chars[b % chars.length];
  return c.slice(0,4) + '-' + c.slice(4,8) + '-' + c.slice(8);
}

async function rotateDailyGift(env) {
  const code = giftRandCode();
  const now = Math.floor(Date.now() / 1000);
  await env.AZKV.put('dailygift:current', JSON.stringify({
    code, created: now, claimed: false, claimedAt: null
  }));
  // ALSO register as a redeemable gift code (30 days, single-device) so /redeem accepts it.
  // 40-day KV TTL outlives the 30-day grant, then self-cleans.
  await env.AZKV.put('gift:' + code, JSON.stringify({
    used: 0, deviceId: null, days: 30, exp: null, created: now
  }), { expirationTtl: 40 * 86400 });
}

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


/* ============================================================
   BANK / LINK RAIL (Wise + Wero) — manual-confirm prepaid time
   ============================================================ */
const RAILS = {
  wise: 'https://wise.com/pay/business/sangdagrang',
  wero: 'https://share.weropay.eu/p/1/c/C0J41ywjKp'
};
// months -> granted days (generous to the buyer, never short)
const DURATION_DAYS = { 1: 31, 3: 92, 6: 184, 12: 366 };

function newRef() {
  const r = (randCode() + '').replace(/[^a-zA-Z0-9]/g, '');
  return 'AZ-' + r.slice(0, 8).toUpperCase();
}

// POST /buy  {tier, months, email?}  (public) -> parks pending, returns pay instructions
async function handleCheckout(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const tier = ('' + (b.tier || '')).trim();
  const months = parseInt(b.months, 10);
  const email = normEmail(b.email);
  if (!TIERS[tier])            return json({ error: 'bad_tier' }, 400, origin);
  if (!DURATION_DAYS[months])  return json({ error: 'bad_months' }, 400, origin);
  if (email && !validEmail(email)) return json({ error: 'bad_email' }, 400, origin);

  const amountCents = TIERS[tier] * months;
  const days = DURATION_DAYS[months];
  const ref = newRef();
  await createPurchase(env, {
    id: ref, rail: 'bank', tier, days,
    email: email || null, amountCents, providerRef: null
  });
  return json({
    ref, tier, months, days,
    amount: (amountCents / 100).toFixed(2), currency: 'EUR',
    pay: { wise: RAILS.wise, wero: RAILS.wero },
    note: 'Pay the exact amount, then put ' + ref + ' in the payment reference/note. Your access is emailed once confirmed.'
  }, 200, origin);
}

// GET /admin/pending?pass=...  (admin) -> list unpaid purchases
async function handleAdminPending(env, req, origin, url) {
  const pass = url.searchParams.get('pass') || '';
  const ok = (pass && pass === env.ADMIN_PASS) || await validAdminCookie(env, req);
  if (!ok) return json({ error: 'forbidden' }, 403, origin);
  const rs = await env.FARES_DB.prepare(
    `SELECT id, rail, tier, days, email, amount_cents, status, created_at
       FROM purchases WHERE status='pending' ORDER BY created_at DESC LIMIT 100`
  ).all();
  return json({ pending: (rs && rs.results) || [] }, 200, origin);
}

// POST /admin/markpaid  {pass?, id}  (admin) -> exactly-once claim + grant, then email buyer
async function handleAdminMarkpaid(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const ok = (b.pass && b.pass === env.ADMIN_PASS) || await validAdminCookie(env, req);
  if (!ok) return json({ error: 'forbidden' }, 403, origin);
  const id = ('' + (b.id || '')).trim();
  if (!id) return json({ error: 'no_id' }, 400, origin);
  const r = await claimAndGrant(env, { id });
  let emailed = false;
  if (r.granted && r.email) {
    try { await sendGrantEmail(env, r.email, r.tier, r.token, r.expiry); emailed = true; }
    catch (e) { emailed = false; }
  }
  return json(Object.assign({}, r, { emailed }), 200, origin);
}

// Buyer access email: branded, tier name+icon pair, self-contained ?grant= link.
async function sendGrantEmail(env, to, tier, token, expiry) {
  const label = tier === 'proplus' ? 'Pro+ \u{1F451}' : 'Pro \u2B50';
  const link = (env.APP_URL || 'https://aplusz.app') + '/?grant=' + encodeURIComponent(token);
  const until = new Date(expiry * 1000).toISOString().slice(0, 10);
  const html =
    '<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">' +
      '<h2 style="margin:0 0 12px">Welcome to AplusZ ' + label + '</h2>' +
      '<p style="margin:0 0 16px;line-height:1.5">Your access is active until <b>' + until + '</b>. Tap below to unlock it on this device:</p>' +
      '<p style="margin:0 0 20px"><a href="' + link + '" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Unlock ' + label + '</a></p>' +
      '<p style="margin:0 0 6px;font-size:13px;color:#475569">Or paste this link into your browser:</p>' +
      '<p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#475569">' + link + '</p>' +
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">' +
      '<p style="margin:0;font-size:12px;color:#94a3b8">AplusZ.app \u2014 the search is free as air, so you fly for less.</p>' +
    '</div>';
  const subject = 'Your AplusZ ' + label + ' access is live';
  return sendMail(env, to, subject, html);
}


/* ============================================================
   ROUTER
   ============================================================ */
export default {
  /* ---- cron: fires daily at a random-offset time (see wrangler.toml) ---- */
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      await rotateDailyGift(env);
      await env.AZKV.put('roulette:spins', '0');   // global roulette resets once per day, with the cron only
    })());
  },

  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('origin') || env.APP_URL || '*';
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });

    try {
      { const fr = await fareRoutes(req, env); if (fr) return fr; }

      /* ---- public status (drives cap banner + global unlock) ---- */
      if (url.pathname === '/status') {
        return json({ capOn: await capOn(env), year: year() }, 200, origin);
      }

      /* ---- daily gift: is a gift AVAILABLE? (never returns the code) ----
         The code is handed out only by /daily-gift/claim, to the winner.
         Reset: a code waits forever until claimed; once claimed it stays
         gone until 24h after the claim, then the next read regenerates. */
      if (url.pathname === '/daily-gift' && req.method === 'GET') {
        const raw = await env.AZKV.get('dailygift:current');
        if (!raw) return json({ available: false }, 200, origin);
        let g; try { g = JSON.parse(raw); } catch { return json({ available: false }, 200, origin); }
        if (g.claimed) {
          const now = Math.floor(Date.now() / 1000);
          if (g.claimedAt && (now - g.claimedAt) >= 86400) {
            await rotateDailyGift(env);                 // 24h since claim -> fresh code
            return json({ available: true }, 200, origin);
          }
          return json({ available: false }, 200, origin);
        }
        return json({ available: true }, 200, origin);
      }

      /* ---- daily gift: claim (first scratch wins, atomic, global) ----
         Returns the code ONLY to the first caller; everyone else gets taken. */
      if (url.pathname === '/daily-gift/claim' && req.method === 'POST') {
        const raw = await env.AZKV.get('dailygift:current');
        if (!raw) return json({ claimed: false, error: 'none' }, 200, origin);
        let g; try { g = JSON.parse(raw); } catch { return json({ claimed: false, error: 'none' }, 200, origin); }
        if (g.claimed) {
          const now = Math.floor(Date.now() / 1000);
          // if 24h passed since claim, regenerate then award the fresh one to this caller
          if (g.claimedAt && (now - g.claimedAt) >= 86400) {
            await rotateDailyGift(env);
            const fresh = await env.AZKV.get('dailygift:current');
            let fg; try { fg = JSON.parse(fresh); } catch { return json({ claimed: false, error: 'none' }, 200, origin); }
            fg.claimed = true; fg.claimedAt = now;
            await env.AZKV.put('dailygift:current', JSON.stringify(fg));
            return json({ claimed: true, code: fg.code }, 200, origin);
          }
          return json({ claimed: false, error: 'taken' }, 200, origin);
        }
        g.claimed = true;
        g.claimedAt = Math.floor(Date.now() / 1000);
        await env.AZKV.put('dailygift:current', JSON.stringify(g));
        return json({ claimed: true, code: g.code }, 200, origin);
      }

      /* ---- roulette spin: global 1-in-1500 win counter ---- */
      if (url.pathname === '/roulette-spin' && req.method === 'POST') {
        const spinCount = parseInt((await env.AZKV.get('roulette:spins')) || '0', 10) + 1;
        await env.AZKV.put('roulette:spins', String(spinCount));
        const isWin = (spinCount % 1500 === 0);
        if (isWin) {
          const code = giftRandCode();
          const now = Math.floor(Date.now() / 1000);
          // register as a redeemable 30-day single-device gift code
          await env.AZKV.put('gift:' + code, JSON.stringify({
            used: 0, deviceId: null, days: 30, exp: null, created: now
          }), { expirationTtl: 40 * 86400 });
          return json({ win: true, code }, 200, origin);
        }
        return json({ win: false }, 200, origin);
      }

      /* ---- start checkout (email-first) ---- */
      if (url.pathname === '/checkout' && req.method === 'POST') {
        const { email, tier, gate } = await req.json();
        const e = normEmail(email);
        if (!validEmail(e)) return json({ error: 'invalid_email' }, 400, origin);
        if (tier !== 'pro' && tier !== 'proplus') return json({ error: 'bad_tier' }, 400, origin);

        if (await capOn(env)) return json({ capOn: true }, 200, origin);

        // already paying? → don't double-charge, email the access link
        const existing = await tierForEmail(env, e);
        if (existing !== 'free') {
          await emailMagicLink(env, e, existing);
          return json({ existing, emailed: true }, 200, origin);
        }

        const price = tier === 'proplus' ? env.PRICE_PROPLUS : env.PRICE_PRO;
        const g = ('' + (gate || '')).trim().slice(0, 64);   // MF referral code (vref); empty = organic sale
        const form = {
          mode: 'subscription',
          customer_email: e,
          'line_items[0][price]': price,
          'line_items[0][quantity]': '1',
          'subscription_data[metadata][tier]': tier,
          success_url: env.APP_URL + '/?paid={CHECKOUT_SESSION_ID}',
          cancel_url: env.APP_URL + '/?cancelled=1'
        };
        if (g) {                                     // stamp the referrer so MF credits on checkout.session.completed
          form['metadata[gate]'] = g;                // session-level — the exact field MF's webhook reads
          form['subscription_data[metadata][gate]'] = g;
        }
        const sess = await stripe(env, 'checkout/sessions', 'POST', form);
        if (sess.url) return json({ url: sess.url }, 200, origin);
        return json({ error: 'stripe' }, 502, origin);
      }

      /* ---- confirm a completed checkout ? issue token ---- */
      if (url.pathname === '/confirm' && req.method === 'POST') {
        const { session } = await req.json();
        if (!session) return json({ error: 'no_session' }, 400, origin);
        const s = await stripe(env, 'checkout/sessions/' + encodeURIComponent(session));
        const e = normEmail(s.customer_details?.email || s.customer_email);
        if (!e || s.payment_status !== 'paid') return json({ tier: 'free' }, 200, origin);
        const tier = await tierForEmail(env, e);
        const token = await makeToken(env, e, tier);
        return json({ tier, token, email: e }, 200, origin);
      }

      /* ---- restore: email me my access link ---- */
      if (url.pathname === '/restore' && req.method === 'POST') {
        const { email } = await req.json();
        const e = normEmail(email);
        if (!validEmail(e)) return json({ error: 'invalid_email' }, 400, origin);
        const tier = await tierForEmail(env, e);
        if (tier === 'free') return json({ found: false }, 200, origin);
        await emailMagicLink(env, e, tier);
        return json({ found: true, emailed: true }, 200, origin);
      }

      /* ---- magic link → exchange for a signed token ---- */
      if (url.pathname === '/magic' && req.method === 'POST') {
        const { d } = await req.json();
        if (!d || d.indexOf('.') === -1) return json({ error: 'bad' }, 400, origin);
        const [body, sig] = d.split('.');
        const expect = b64url(await hmac(env.SIGNING_SECRET, 'magic.' + body));
        if (!timingSafe(sig, expect)) return json({ error: 'bad' }, 400, origin);
        let p; try { p = JSON.parse(fromB64url(body)); } catch { return json({ error: 'bad' }, 400, origin); }
        if (!p.x || p.x < Math.floor(Date.now() / 1000)) return json({ error: 'expired' }, 400, origin);
        /* Trust the tier baked into the signed link. The link is HMAC-signed and
           only ever emailed after the plan was confirmed (checkout/restore), and
           it expires in 30 min — so re-reading live Stripe here is unnecessary and
           was the cause of the ~10-min activation delay (Stripe sub not yet
           'active' right after payment -> tier read as free -> no token issued).
           Fall back to a live read only if the link somehow carries no tier. */
        const signedTier = (p.t === 'pro' || p.t === 'proplus') ? p.t : null;
        const tier = signedTier || await tierForEmail(env, p.e);
        if (tier === 'free') return json({ tier: 'free' }, 200, origin);
        const token = await makeToken(env, p.e, tier);
        return json({ tier, token, email: p.e }, 200, origin);
      }

      /* ---- validate a stored token (offline within TTL) ---- */
      if (url.pathname === '/validate' && req.method === 'POST') {
        const { token } = await req.json();
        const p = await readToken(env, token);
        if (!p) return json({ tier: 'free', valid: false }, 200, origin);
        return json({ tier: p.t, valid: true, email: p.e }, 200, origin);
      }

      /* ---- Item C: comments (public submit, moderated) ---- */
      if (url.pathname === '/comment' && req.method === 'POST') {
        try {
          const body = await req.json();
          const name = (body.name || '').slice(0, 60).trim();
          const comment = (body.comment || '').slice(0, 400).trim();
          if (!name || !comment) return json({ error: 'missing fields' }, 400, origin);
          const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
          await env.KV.put('comment:' + id, JSON.stringify({ id, name, comment, status: 'pending', ts: Date.now() }));
          return json({ ok: true }, 200, origin);
        } catch (e) { return json({ error: 'invalid' }, 400, origin); }
      }
      if (url.pathname === '/comments' && req.method === 'GET') {
        const list = await env.KV.list({ prefix: 'comment:' });
        const approved = [];
        for (const k of list.keys) {
          const v = await env.KV.get(k.name, 'json');
          if (v && v.status === 'approved') approved.push(v);
        }
        approved.sort(function (a, b) { return b.ts - a.ts; });
        return json({ comments: approved }, 200, origin);
      }
      if (url.pathname === '/press' && req.method === 'POST') {
        try {
          const body = await req.json();
          const name = (body.name || '').slice(0, 80).trim();
          const email = (body.email || '').slice(0, 120).trim();
          const message = (body.message || '').slice(0, 600).trim();
          const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
          await env.KV.put('press:' + id, JSON.stringify({ id, name, email, message, ts: Date.now() }));
          return json({ ok: true }, 200, origin);
        } catch (e) { return json({ error: 'invalid' }, 400, origin); }
      }
      if (url.pathname === '/comment/accept' && req.method === 'POST') {
        if (!validAdminCookie(req, env)) return json({ error: 'unauthorized' }, 401, origin);
        try {
          const { id } = await req.json();
          const key = 'comment:' + id;
          const v = await env.KV.get(key, 'json');
          if (!v) return json({ error: 'not found' }, 404, origin);
          v.status = 'approved';
          await env.KV.put(key, JSON.stringify(v));
          return json({ ok: true }, 200, origin);
        } catch (e) { return json({ error: 'invalid' }, 400, origin); }
      }
      if (url.pathname === '/comment/reject' && req.method === 'POST') {
        if (!validAdminCookie(req, env)) return json({ error: 'unauthorized' }, 401, origin);
        try {
          const { id } = await req.json();
          await env.KV.delete('comment:' + id);
          return json({ ok: true }, 200, origin);
        } catch (e) { return json({ error: 'invalid' }, 400, origin); }
      }
      if (url.pathname === '/comments-all' && req.method === 'GET') {
        if (!validAdminCookie(req, env)) return json({ error: 'unauthorized' }, 401, origin);
        const list = await env.KV.list({ prefix: 'comment:' });
        const all = [];
        for (const k of list.keys) {
          const v = await env.KV.get(k.name, 'json');
          if (v) all.push(v);
        }
        all.sort(function (a, b) { return b.ts - a.ts; });
        return json({ comments: all }, 200, origin);
      }
      /* ---- Item B: web-design landing pay-gate ---- */
      if (url.pathname === '/web-verify' && req.method === 'POST') {
        try {
          const body = await req.json();
          const email = (body.email || '').toLowerCase().trim();
          if (!email) return json({ ok: false, error: 'missing email' }, 400, origin);
          let paid = await env.KV.get('paid_web:' + email);
          if (!paid && env.STRIPE_WEB_KEY) {
            try {
              const sr = await fetch('https://api.stripe.com/v1/checkout/sessions?limit=20', { headers: { 'Authorization': 'Bearer ' + env.STRIPE_WEB_KEY } });
              const sd = await sr.json();
              if (sd.data && sd.data.some(function (s) { return s.payment_status === 'paid' && (((s.customer_details && s.customer_details.email) || s.customer_email || '').toLowerCase().trim() === email); })) {
                paid = '1';
                await env.KV.put('paid_web:' + email, '1', { expirationTtl: 2592000 });
              }
            } catch (e) {}
          }
          return json({ ok: !!paid }, 200, origin);
        } catch (e) { return json({ ok: false }, 200, origin); }
      }
      if (url.pathname === '/web-brief' && req.method === 'POST') {
        try {
          const body = await req.json();
          const email = (body.email || '').toLowerCase().trim();
          if (!email) return json({ error: 'missing email' }, 400, origin);
          const paid = await env.KV.get('paid_web:' + email);
          if (!paid) return json({ error: 'not paid' }, 403, origin);
          const id = 'WEB-' + Date.now().toString(36).toUpperCase();
          await env.KV.put('brief:' + email, JSON.stringify({ ...body, id, ts: Date.now() }));
          return json({ ok: true, id }, 200, origin);
        } catch (e) { return json({ error: 'invalid' }, 400, origin); }
      }

      /* ---- public feedback: bug report / feature idea (no auth, text only) ---- */
      if (url.pathname === '/feedback' && req.method === 'POST') {
        const b = await req.json().catch(() => ({}));
        const type = (b.type === 'idea') ? 'idea' : 'bug';
        const message = ('' + (b.message || '')).trim().slice(0, 4000);
        if (!message) return json({ error: 'empty' }, 400, origin);
        const email = normEmail(b.email).slice(0, 200);
        const lang = ('' + (b.lang || '')).slice(0, 8);
        const page = ('' + (b.page || '')).slice(0, 300);
        const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        const rec = { id, type, message, email, lang, page, ts: new Date().toISOString() };
        await env.AZKV.put('feedback:' + id, JSON.stringify(rec));
        return json({ ok: true }, 200, origin);
      }

      /* ---- Stripe webhook ? revenue tally + cap ---- */
      if (url.pathname === '/webhook' && req.method === 'POST') {
        const raw = await req.text();
        const sigHeader = req.headers.get('stripe-signature') || '';
        if (!(await verifyStripeSig(env, raw, sigHeader)))
          return new Response('bad sig', { status: 400 });
        const ev = JSON.parse(raw);
        if (ev.type === 'checkout.session.completed') { const s = ev.data.object; const wem = ((s.customer_email) || (s.customer_details && s.customer_details.email) || '').toLowerCase().trim(); if (wem) await env.KV.put('paid_web:' + wem, '1', { expirationTtl: 2592000 }); }
        if (ev.type === 'invoice.paid') {
          const amt = ev.data.object.amount_paid || 0; // cents, net of nothing — gross paid
          if (amt > 0) await addRevenue(env, amt);
        }
        return json({ received: true }, 200, origin);
      }

      /* ---- admin pause page (one-tap, password-protected) ---- */
      if (url.pathname === '/admin' && req.method === 'GET') {
        return new Response(adminPage(), {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      }

      /* ---- admin session: password ? 90-day signed cookie ---- */
      if (url.pathname === '/admin/session' && req.method === 'POST') {
        const { pass } = await req.json();
        if (pass !== env.ADMIN_PASS) return json({ error: 'forbidden' }, 403, origin);
        const exp = Math.floor(Date.now() / 1000) + 90 * 86400;
        const body = b64urlStr(JSON.stringify({ a: 1, x: exp }));
        const sig = b64url(await hmac(env.SIGNING_SECRET, 'admin.' + body));
        const tok = body + '.' + sig;
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            ...cors(origin),
            'set-cookie': 'az_admin=' + tok + '; Path=/; Max-Age=' + (90 * 86400) +
              '; HttpOnly; Secure; SameSite=Strict'
          }
        });
      }

      /* ---- admin logout: clear cookie ---- */
      if (url.pathname === '/admin/logout' && req.method === 'POST') {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            ...cors(origin),
            'set-cookie': 'az_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'
          }
        });
      }

      /* ---- admin live status (drives the page state) ---- */
      if (url.pathname === '/admin/status' && req.method === 'POST') {
        const reqBody = await req.json().catch(() => ({}));
        const ok = (reqBody.pass && reqBody.pass === env.ADMIN_PASS)
          || await validAdminCookie(env, req);
        if (!ok) return json({ error: 'forbidden' }, 403, origin);
        const manual = (await env.AZKV.get('pause:manual')) === '1';
        const cents = parseInt((await env.AZKV.get('rev:' + year())) || '0', 10);
        const auto = cents >= CAP_CENTS;
        return json({
          paused: manual || auto,
          manual, auto,
          revenue: (cents / 100),
          cap: (CAP_CENTS / 100),
          year: year()
        }, 200, origin);
      }

      /* ---- admin: list feedback (newest first) ---- */
      if (url.pathname === '/admin/feedback' && req.method === 'POST') {
        const reqBody = await req.json().catch(() => ({}));
        const ok = (reqBody.pass && reqBody.pass === env.ADMIN_PASS)
          || await validAdminCookie(env, req);
        if (!ok) return json({ error: 'forbidden' }, 403, origin);
        const list = await env.AZKV.list({ prefix: 'feedback:' });
        const items = [];
        for (const k of list.keys) {
          const v = await env.AZKV.get(k.name);
          if (v) { try { items.push(JSON.parse(v)); } catch {} }
        }
        items.sort((a, b) => (a.ts < b.ts ? 1 : -1));
        return json({ items }, 200, origin);
      }

      /* ---- admin: delete one feedback item ---- */
      if (url.pathname === '/admin/feedback/delete' && req.method === 'POST') {
        const reqBody = await req.json().catch(() => ({}));
        const ok = (reqBody.pass && reqBody.pass === env.ADMIN_PASS)
          || await validAdminCookie(env, req);
        if (!ok) return json({ error: 'forbidden' }, 403, origin);
        if (reqBody.id) await env.AZKV.delete('feedback:' + reqBody.id);
        return json({ ok: true }, 200, origin);
      }

      /* ---- GIFT: generate a comp-access code (ADMIN_PASS gated) ---- */
      if (url.pathname === '/admin/gift' && req.method === 'POST') {
        const reqBody = await req.json().catch(() => ({}));
        const ok = (reqBody.pass && reqBody.pass === env.ADMIN_PASS)
          || await validAdminCookie(env, req);
        if (!ok) return json({ error: 'forbidden' }, 403, origin);
        let days = parseInt(reqBody.days, 10);
        if (!days || days < 1) days = 180;          // default ~6 months
        if (days > 3650) days = 3650;               // sane ceiling (10y)
        const code = randCode();
        await env.AZKV.put('gift:' + code, JSON.stringify({
          used: 0, deviceId: null, days: days, exp: null,
          created: Math.floor(Date.now() / 1000)
        }));
        const redeemUrl = (env.APP_URL || 'https://aplusz.app') + '/legal/?code=' + code;
        return json({ ok: true, code: code, days: days, url: redeemUrl }, 200, origin);
      }

      /* ---- GIFT: redeem a code (PUBLIC, no secret) ---- */
      if (url.pathname === '/redeem' && req.method === 'POST') {
        const reqBody = await req.json().catch(() => ({}));
        const code = ('' + (reqBody.code || '')).trim();
        const sentDevice = ('' + (reqBody.deviceId || '')).trim();
        if (!code) return json({ error: 'no_code', valid: false }, 400, origin);

        const raw = await env.AZKV.get('gift:' + code);
        if (!raw) return json({ error: 'invalid', valid: false }, 200, origin);
        let g; try { g = JSON.parse(raw); } catch { return json({ error: 'invalid', valid: false }, 200, origin); }

        // already redeemed
        if (g.used) {
          // same device that first redeemed -> re-issue a fresh token (re-open allowed)
          if (sentDevice && g.deviceId && timingSafe(sentDevice, g.deviceId)) {
            if (g.exp && g.exp > Math.floor(Date.now() / 1000)) {
              const token = await makeGiftToken(env, g.exp);
              return json({ valid: true, token, deviceId: g.deviceId, exp: g.exp, tier: 'proplus' }, 200, origin);
            }
            return json({ error: 'expired', valid: false }, 200, origin);
          }
          // different device -> single-device lock
          return json({ error: 'used', valid: false }, 200, origin);
        }

        // first redemption -> bind device, set expiry, mint token
        const deviceId = randDevice();
        const exp = Math.floor(Date.now() / 1000) + g.days * 86400;
        g.used = 1; g.deviceId = deviceId; g.exp = exp;
        g.redeemed = Math.floor(Date.now() / 1000);
        await env.AZKV.put('gift:' + code, JSON.stringify(g));
        const token = await makeGiftToken(env, exp);
        return json({ valid: true, token, deviceId, exp, tier: 'proplus' }, 200, origin);
      }

            /* ---- bank/link rail: buy + admin confirm ---- */
      if (url.pathname === '/buy' && req.method === 'POST') {
        return handleCheckout(env, req, origin);
      }
      if (url.pathname === '/admin/pending' && req.method === 'GET') {
        return handleAdminPending(env, req, origin, url);
      }
      if (url.pathname === '/admin/markpaid' && req.method === 'POST') {
        return handleAdminMarkpaid(env, req, origin);
      }


/* ---- manual pause / resume (owner only) ---- */
      if (url.pathname === '/admin/pause' && req.method === 'POST') {
        const reqBody = await req.json().catch(() => ({}));
        const ok = (reqBody.pass && reqBody.pass === env.ADMIN_PASS)
          || await validAdminCookie(env, req);
        if (!ok) return json({ error: 'forbidden' }, 403, origin);
        const action = reqBody.action;
        if (action === 'on') { await env.AZKV.put('pause:manual', '1'); await pauseAllSubs(env, 'manual'); }
        else { await env.AZKV.delete('pause:manual'); }
        return json({ paused: action === 'on' }, 200, origin);
      }

      /* ---- admin: manually fire today's daily gift ---- */
      if (url.pathname === '/admin/fire-gift' && req.method === 'POST') {
        const reqBody = await req.json().catch(() => ({}));
        const ok = (reqBody.pass && reqBody.pass === env.ADMIN_PASS)
          || await validAdminCookie(env, req);
        if (!ok) return json({ error: 'forbidden' }, 403, origin);
        await rotateDailyGift(env);
        const raw = await env.AZKV.get('dailygift:current');
        return json({ fired: true, gift: raw ? JSON.parse(raw) : null }, 200, origin);
      }

      return json({ error: 'not_found' }, 404, origin);
    } catch (err) {
      return json({ error: 'server', detail: String(err) }, 500, origin);
    }
  }
};

/* Stripe signature: header "t=...,v1=..." ; HMAC256(`${t}.${payload}`) */
async function verifyStripeSig(env, payload, header) {
  const parts = Object.fromEntries(header.split(',').map(kv => kv.split('=')));
  if (!parts.t || !parts.v1) return false;
  const expectBuf = await hmac(env.STRIPE_WEBHOOK_SECRET, parts.t + '.' + payload);
  const expect = [...new Uint8Array(expectBuf)].map(b => b.toString(16).padStart(2, '0')).join('');
  return timingSafe(parts.v1, expect);
}

/* ============================================================
   ADMIN PAUSE PAGE  (GET /admin)
   One-tap pause/resume. Password-gated client-side; every action
   re-verifies ADMIN_PASS server-side at /admin/status & /admin/pause.
   Self-contained HTML (no external assets). Posh minimalist.
   ============================================================ */
function adminPage() {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>A+Z — Control</title>
<style>
:root{--bg:#0b1020;--card:#121a30;--ink:#eef2ff;--mut:#8a97b8;--line:#23304f;
--gold:#f5b942;--green:#34d399;--red:#fb7185;--blue:#60a5fa}
*{box-sizing:border-box;margin:0;padding:0}
body{background:radial-gradient(1200px 600px at 70% -10%,#16203c 0,var(--bg) 60%);
color:var(--ink);font-family:ui-sans-serif,-apple-system,Segoe UI,Roboto,sans-serif;
min-height:100vh;display:grid;place-items:center;padding:24px;letter-spacing:.2px}
.wrap{width:100%;max-width:420px}
.brand{text-align:center;margin-bottom:22px}
.brand b{font-size:1.5rem;font-weight:800}.brand b span{color:var(--gold)}
.brand p{color:var(--mut);font-size:.82rem;margin-top:4px}
.card{background:linear-gradient(180deg,var(--card),#0f1730);border:1px solid var(--line);
border-radius:20px;padding:26px;box-shadow:0 30px 60px -30px #000}
label{display:block;font-size:.75rem;color:var(--mut);margin:0 0 7px 2px;text-transform:uppercase;letter-spacing:1.5px}
input{width:100%;background:#0a1124;border:1px solid var(--line);color:var(--ink);
padding:14px 16px;border-radius:12px;font-size:1rem;outline:none}
input:focus{border-color:var(--blue)}
.btn{width:100%;border:0;border-radius:12px;padding:15px;font-size:1rem;font-weight:700;
cursor:pointer;margin-top:14px;transition:.15s transform,.15s opacity}
.btn:active{transform:scale(.985)}
.btn-go{background:var(--blue);color:#06122b}
.btn-pause{background:var(--red);color:#2a0712}
.btn-resume{background:var(--green);color:#04221a}
.hide{display:none}
.state{display:flex;align-items:center;gap:12px;padding:16px;border-radius:14px;
border:1px solid var(--line);background:#0a1124;margin-bottom:6px}
.dot{width:12px;height:12px;border-radius:50%;flex:0 0 auto;box-shadow:0 0 14px}
.dot.live{background:var(--green);box-shadow:0 0 14px var(--green)}
.dot.paused{background:var(--red);box-shadow:0 0 14px var(--red)}
.state .lbl{font-weight:700}.state .sub{color:var(--mut);font-size:.8rem;margin-top:2px}
.meter{margin:16px 2px 4px}
.meter .row{display:flex;justify-content:space-between;font-size:.82rem;color:var(--mut);margin-bottom:6px}
.bar{height:9px;border-radius:99px;background:#0a1124;border:1px solid var(--line);overflow:hidden}
.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gold),var(--red));width:0}
.msg{text-align:center;font-size:.85rem;margin-top:14px;min-height:18px}
.msg.err{color:var(--red)}.msg.ok{color:var(--green)}
.foot{text-align:center;margin-top:20px;font-size:.78rem}
.foot a{color:var(--blue);text-decoration:none}
.spin{display:inline-block;width:15px;height:15px;border:2px solid #ffffff55;
border-top-color:#fff;border-radius:50%;animation:s .7s linear infinite;vertical-align:-2px}
@keyframes s{to{transform:rotate(360deg)}}
.gift{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}
.giftOut input{width:100%;background:#0a1124;border:1px solid var(--line);color:var(--ink);padding:12px;border-radius:10px}
.giftOut.hide{display:none}
</style></head><body>
<div class="wrap">
  <div class="brand"><b>A<span>+</span>Z</b><p>Owner control panel</p></div>

  <!-- LOGIN -->
  <div class="card" id="login">
    <label for="pass">Admin password</label>
    <input id="pass" type="password" autocomplete="current-password" placeholder="••••••••••" />
    <button class="btn btn-go" id="enter">Unlock panel</button>
    <div class="msg err" id="loginMsg"></div>
  </div>

  <!-- PANEL -->
  <div class="card hide" id="panel">
    <div class="state">
      <span class="dot" id="dot"></span>
      <div><div class="lbl" id="stateLbl">—</div><div class="sub" id="stateSub"></div></div>
    </div>
    <div class="meter">
      <div class="row"><span>Revenue this year</span><span id="revTxt">—</span></div>
      <div class="bar"><i id="revBar"></i></div>
    </div>
    <button class="btn" id="toggle">—</button>
    <div class="msg" id="panelMsg"></div>

    <!-- ===== GIFT CODE GENERATOR ===== -->
    <div class="gift">
      <label for="giftDays">Gift access · duration (days)</label>
      <input id="giftDays" type="number" min="1" max="3650" value="180" inputmode="numeric" />
      <button class="btn btn-go" id="giftGo" style="margin-top:12px">Generate gift code</button>
      <div class="msg" id="giftMsg"></div>
      <div id="giftOut" class="giftOut hide">
        <input id="giftUrl" readonly onclick="this.select()" style="margin-top:14px;font-size:.82rem;text-align:center" />
        <button class="btn" id="giftCopy" style="margin-top:8px;background:#1f2b4a;color:var(--ink)">Copy link</button>
        <div class="sub" style="margin-top:8px;text-align:center;color:var(--mut);font-size:.75rem">Send this link to your friend. First device to open it is bound for the full period · single use.</div>
      </div>
    </div>
    <!-- ===== DAILY GIFT (scratch page) ===== -->
    <div class="gift">
      <label>Daily Gift · scratch page</label>
      <button class="btn btn-go" id="fireGift" style="margin-top:8px">Fire today's gift now</button>
      <div class="msg" id="fireGiftMsg"></div>
      <div class="sub" style="margin-top:8px;text-align:center;color:var(--mut);font-size:.75rem">Generates today's code instantly (the cron does this automatically at 14:37 UTC). Visible at aplusz.app/gift.</div>
    </div>
    <!-- ===== FLOW AI LINK SLOT · tell Claude where/label; replace below ===== -->
    <!-- <div class="foot"><a href="FLOW_AI_URL">Open Flow AI →</a></div> -->
    <div class="gift">
      <label>User feedback - bugs and ideas</label>
      <button class="btn btn-go" id="fbLoad" style="margin-top:8px">Load feedback</button>
      <div class="msg" id="fbAdminMsg"></div>
      <div id="fbList" style="margin-top:10px;display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <!-- ===== COMMENTS MODERATION ===== -->
    <div class="gift">
      <label>User comments — moderation</label>
      <button class="btn btn-go" id="loadComments" style="margin-top:8px">Load pending comments</button>
      <div class="msg" id="cmtAdminMsg"></div>
      <div id="cmtList" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div>
    <div class="foot"><a href="#" id="logout">Log out</a></div>
  </div>

  <div class="foot"><a href="https://aplusz.app">← aplusz.app</a></div>
</div>

<script>
const API = location.origin;            // same Worker origin
let PASS = '', cur = null;

const $ = id => document.getElementById(id);
async function api(path, body){
  const r = await fetch(API + path, {method:'POST',headers:{'content-type':'application/json'},
    credentials:'include',body:JSON.stringify(body||{})});
  return r.ok ? r.json() : Promise.reject(await r.json().catch(()=>({})));
}
function render(s){
  cur = s;
  const paused = s.paused;
  $('dot').className = 'dot ' + (paused ? 'paused' : 'live');
  $('stateLbl').textContent = paused ? 'PAUSED — free for everyone' : 'LIVE — billing active';
  $('stateSub').textContent = paused
    ? (s.auto ? 'Auto-paused: revenue cap reached' : 'Manually paused by you')
    : 'Subscriptions charging normally';
  $('revTxt').textContent = '€' + s.revenue.toLocaleString() + ' / €' + s.cap.toLocaleString();
  $('revBar').style.width = Math.min(100,(s.revenue/s.cap)*100) + '%';
  const t = $('toggle');
  if(paused){ t.textContent='Resume — start billing again'; t.className='btn btn-resume'; }
  else { t.textContent='Pause everything — free for all'; t.className='btn btn-pause'; }
  t.disabled = paused && s.auto && !s.manual;
  if(t.disabled){ t.textContent='Auto-paused until 1 January'; t.style.opacity=.6; }
  else t.style.opacity=1;
}
function show(which){ $('login').classList.toggle('hide',which!=='login'); $('panel').classList.toggle('hide',which!=='panel'); }
async function loadStatus(){
  // cookie path first (no password)
  try{ const s = await api('/admin/status',{}); show('panel'); render(s); return true; }
  catch{ return false; }
}

// On page load: if a valid 90-day session cookie exists, skip login.
(async ()=>{ await loadStatus(); })();

$('enter').onclick = async () => {
  PASS = $('pass').value.trim();
  if(!PASS){ $('loginMsg').textContent='Enter your password.'; return; }
  $('enter').innerHTML='<span class="spin"></span>';
  try{
    await api('/admin/session',{pass:PASS});   // sets 90-day cookie
    const s = await api('/admin/status',{pass:PASS});
    show('panel'); render(s);
    $('pass').value='';
  }catch{ $('loginMsg').textContent='Wrong password.'; }
  $('enter').textContent='Unlock panel';
};
$('pass').addEventListener('keydown',e=>{ if(e.key==='Enter') $('enter').click(); });

$('toggle').onclick = async () => {
  const goPause = !cur.paused;
  const m = $('panelMsg'); m.className='msg'; m.innerHTML='<span class="spin"></span>';
  try{
    await api('/admin/pause',{action: goPause?'on':'off'});
    m.className='msg ok'; m.textContent = goPause?'Paused. Everyone is free now.':'Resumed. Billing is active.';
    await loadStatus();
  }catch{ m.className='msg err'; m.textContent='Action failed. Try again.'; }
};

$('logout').onclick = async (e) => {
  e.preventDefault();
  try{ await api('/admin/logout',{}); }catch{}
  cur=null; show('login'); $('loginMsg').textContent=''; $('pass').focus();
};

/* ===== GIFT CODE GENERATOR (link only) ===== */
$('giftGo').onclick = async () => {
  const days = parseInt($('giftDays').value, 10) || 180;
  const m = $('giftMsg'); m.className='msg'; m.innerHTML='<span class="spin"></span>';
  try {
    const r = await api('/admin/gift', { days: days });
    m.className='msg ok'; m.textContent = 'Code created · valid ' + r.days + ' days · single device.';
    $('giftUrl').value = r.url;
    $('giftOut').classList.remove('hide');
  } catch { m.className='msg err'; m.textContent='Could not create code. Try again.'; }
};
$('giftCopy').onclick = () => {
  const i = $('giftUrl'); i.select(); i.setSelectionRange(0,99999);
  try { navigator.clipboard.writeText(i.value); $('giftCopy').textContent='Copied ✓';
        setTimeout(()=>$('giftCopy').textContent='Copy link',1500); }
  catch { document.execCommand('copy'); }
};

/* ===== DAILY GIFT FIRE ===== */
$('fireGift').onclick = async () => {
  const m = $('fireGiftMsg'); m.className='msg'; m.innerHTML='<span class="spin"></span>';
  try {
    const r = await api('/admin/fire-gift', {});
    const code = r.gift && r.gift.code ? r.gift.code : '(unknown)';
    m.className='msg ok'; m.textContent = 'Today gift is live: ' + code;
  } catch { m.className='msg err'; m.textContent='Could not fire. Try again.'; }
};

/* ===== FEEDBACK INBOX ===== */
$('fbLoad').onclick = async () => {
  const m = $('fbAdminMsg'); m.className='msg'; m.innerHTML='<span class="spin"></span>';
  try {
    const r = await api('/admin/feedback', {});
    const list = $('fbList'); list.innerHTML='';
    if (!r.items || !r.items.length) { m.className='msg'; m.textContent='No feedback yet.'; return; }
    m.textContent='';
    r.items.forEach(it => {
      const d = document.createElement('div');
      d.style.cssText='border:1px solid var(--line);border-radius:10px;padding:10px;background:#0a1124;font-size:.82rem';
      const tag = it.type==='idea' ? 'Idea' : 'Bug';
      const when = (it.ts||'').replace('T',' ').slice(0,16);
      d.innerHTML = '<div style="display:flex;justify-content:space-between;color:var(--mut)">'
        + '<b style="color:var(--ink)">'+tag+'</b><span>'+when+'</span></div>'
        + '<div style="margin:6px 0;color:var(--ink);white-space:pre-wrap">'+ (it.message||'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])) +'</div>'
        + '<div style="color:var(--mut);font-size:.75rem">'+ (it.email||'no email') +' - '+ (it.lang||'') +' - '+ (it.page||'') +'</div>'
        + '<button class="btn" data-id="'+it.id+'" style="margin-top:8px;background:#1f2b4a;color:var(--ink);padding:8px">Delete</button>';
      d.querySelector('button').onclick = async (e) => {
        try { await api('/admin/feedback/delete', { id: e.target.getAttribute('data-id') }); d.remove(); } catch {}
      };
      list.appendChild(d);
    });
  } catch { m.className='msg err'; m.textContent='Could not load feedback.'; }
};
/* ===== COMMENTS MODERATION ===== */
$('loadComments').onclick = async () => {
  const m = $('cmtAdminMsg'); m.className='msg'; m.innerHTML='<span class="spin"></span>';
  try {
    const r = await api('/comments-all');
    const list = $('cmtList'); list.innerHTML='';
    const pending = (r.comments||[]).filter(c=>c.status==='pending');
    if(!pending.length){ m.textContent='No pending comments.'; return; }
    m.textContent='';
    pending.forEach(c=>{
      const d = document.createElement('div');
      d.style.cssText='background:rgba(255,255,255,.04);border-radius:10px;padding:12px 14px';
      d.innerHTML='<strong style="color:#f5b942">'+c.name+'</strong>'
        +'<p style="color:#94a3b8;margin:4px 0 8px;font-size:.87rem">'+c.comment+'</p>'
        +'<button data-id="'+c.id+'" data-action="accept" style="margin-right:8px;padding:6px 14px;border:none;border-radius:8px;background:#f5b942;color:#0f172a;font-weight:700;cursor:pointer">Accept</button>'
        +'<button data-id="'+c.id+'" data-action="reject" style="padding:6px 14px;border:none;border-radius:8px;background:rgba(255,255,255,.08);color:#cbd5e1;font-weight:600;cursor:pointer">Reject</button>';
      d.querySelectorAll('button').forEach(btn=>btn.onclick=async()=>{
        const action = btn.getAttribute('data-action');
        await api('/comment/'+action,{id:btn.getAttribute('data-id')});
        d.remove();
      });
      list.appendChild(d);
    });
  } catch(e){ m.className='msg err'; m.textContent='Error loading comments.'; }
};
</script>
</body></html>`;
}