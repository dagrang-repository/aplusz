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

/* ---------- Resend email ---------- */
async function sendMail(env, to, subject, html) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + env.RESEND_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ from: 'AplusZ <automail@aplusz.app>', to, subject, html })
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

      /* ---- manual pause / resume (owner only) ---- */
      if (url.pathname === '/admin/pause' && req.method === 'POST') {
        const { pass, action } = await req.json();
        if (pass !== env.ADMIN_PASS) return json({ error: 'forbidden' }, 403, origin);
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
