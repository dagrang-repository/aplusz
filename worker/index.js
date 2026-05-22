/* ============================================================
   APlusZ — Auth & Billing Worker (Step 18)
   Deploy: Cloudflare Workers  →  https://api.aplusz.app
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
   ROUTER
   ============================================================ */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('origin') || env.APP_URL || '*';
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });

    try {
      /* ---- public status (drives cap banner + global unlock) ---- */
      if (url.pathname === '/status') {
        return json({ capOn: await capOn(env), year: year() }, 200, origin);
      }

      /* ---- start checkout (email-first) ---- */
      if (url.pathname === '/checkout' && req.method === 'POST') {
        const { email, tier } = await req.json();
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
        const sess = await stripe(env, 'checkout/sessions', 'POST', {
          mode: 'subscription',
          customer_email: e,
          'line_items[0][price]': price,
          'line_items[0][quantity]': '1',
          'subscription_data[metadata][tier]': tier,
          success_url: env.APP_URL + '/?paid={CHECKOUT_SESSION_ID}',
          cancel_url: env.APP_URL + '/?cancelled=1'
        });
        if (sess.url) return json({ url: sess.url }, 200, origin);
        return json({ error: 'stripe' }, 502, origin);
      }

      /* ---- confirm a completed checkout → issue token ---- */
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
        const tier = await tierForEmail(env, p.e);   // re-check live (true to usage)
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

      /* ---- Stripe webhook → revenue tally + cap ---- */
      if (url.pathname === '/webhook' && req.method === 'POST') {
        const raw = await req.text();
        const sigHeader = req.headers.get('stripe-signature') || '';
        if (!(await verifyStripeSig(env, raw, sigHeader)))
          return new Response('bad sig', { status: 400 });
        const ev = JSON.parse(raw);
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

      /* ---- admin session: password → 90-day signed cookie ---- */
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
<title>A+Z · Control</title>
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
    <!-- ===== FLOW AI LINK SLOT — tell Claude where/label; replace below ===== -->
    <!-- <div class="foot"><a href="FLOW_AI_URL">Open Flow AI →</a></div> -->
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
</script>
</body></html>`;
}
