var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
var CAP_CENTS = 62e5;
var TOKEN_TTL = 30 * 86400;
var MAGIC_TTL = 30 * 60;
var enc = new TextEncoder();
var json = /* @__PURE__ */ __name((o, status = 200, origin = "*") => new Response(JSON.stringify(o), {
  status,
  headers: { "content-type": "application/json", ...cors(origin) }
}), "json");
var cors = /* @__PURE__ */ __name((origin) => ({
  "access-control-allow-origin": origin,
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type"
}), "cors");
var b64url = /* @__PURE__ */ __name((buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64url");
var b64urlStr = /* @__PURE__ */ __name((s) => b64url(enc.encode(s)), "b64urlStr");
var fromB64url = /* @__PURE__ */ __name((s) => atob(s.replace(/-/g, "+").replace(/_/g, "/")), "fromB64url");
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(msg));
}
__name(hmac, "hmac");
function timingSafe(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
__name(timingSafe, "timingSafe");
var normEmail = /* @__PURE__ */ __name((e) => ("" + (e || "")).trim().toLowerCase(), "normEmail");
var validEmail = /* @__PURE__ */ __name((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e), "validEmail");
var year = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).getUTCFullYear(), "year");
async function makeToken(env, email, tier) {
  const payload = { e: email, t: tier, x: Math.floor(Date.now() / 1e3) + TOKEN_TTL };
  const body = b64urlStr(JSON.stringify(payload));
  const sig = b64url(await hmac(env.SIGNING_SECRET, body));
  return body + "." + sig;
}
__name(makeToken, "makeToken");
async function readToken(env, token) {
  if (!token || token.indexOf(".") === -1) return null;
  const [body, sig] = token.split(".");
  const expect = b64url(await hmac(env.SIGNING_SECRET, body));
  if (!timingSafe(sig, expect)) return null;
  let p;
  try {
    p = JSON.parse(fromB64url(body));
  } catch {
    return null;
  }
  if (!p.x || p.x < Math.floor(Date.now() / 1e3)) return null;
  return p;
}
__name(readToken, "readToken");
async function makeGiftToken(env, exp) {
  const payload = { e: "gift", t: "proplus", x: exp, g: 1 };
  const body = b64urlStr(JSON.stringify(payload));
  const sig = b64url(await hmac(env.SIGNING_SECRET, body));
  return body + "." + sig;
}
__name(makeGiftToken, "makeGiftToken");
function randCode() {
  return crypto.randomUUID && crypto.randomUUID() || "10000000-1000-4000".replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
__name(randCode, "randCode");
function randDevice() {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(a).map((x) => x.toString(16).padStart(2, "0")).join("");
}
__name(randDevice, "randDevice");
async function validAdminCookie(env, req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)az_admin=([^;]+)/);
  if (!m) return false;
  const tok = m[1];
  if (tok.indexOf(".") === -1) return false;
  const [body, sig] = tok.split(".");
  const expect = b64url(await hmac(env.SIGNING_SECRET, "admin." + body));
  if (!timingSafe(sig, expect)) return false;
  let p;
  try {
    p = JSON.parse(fromB64url(body));
  } catch {
    return false;
  }
  if (!p.x || p.x < Math.floor(Date.now() / 1e3)) return false;
  return true;
}
__name(validAdminCookie, "validAdminCookie");
async function stripe(env, path, method = "GET", form = null) {
  const opt = {
    method,
    headers: {
      authorization: "Bearer " + env.STRIPE_SECRET,
      "content-type": "application/x-www-form-urlencoded"
    }
  };
  if (form) opt.body = new URLSearchParams(form).toString();
  const r = await fetch("https://api.stripe.com/v1/" + path, opt);
  return r.json();
}
__name(stripe, "stripe");
async function tierForEmail(env, email) {
  if (email === normEmail(env.OWNER_EMAIL)) return "proplus";
  const cust = await stripe(env, "customers?email=" + encodeURIComponent(email) + "&limit=10");
  if (!cust.data || !cust.data.length) return "free";
  let best = "free";
  for (const c of cust.data) {
    const subs = await stripe(env, "subscriptions?customer=" + c.id + "&status=active&limit=10");
    for (const s of subs.data || []) {
      const t = s.items?.data?.[0]?.price?.metadata?.tier || s.metadata?.tier || "";
      if (t === "proplus") best = "proplus";
      else if (t === "pro" && best !== "proplus") best = "pro";
    }
  }
  return best;
}
__name(tierForEmail, "tierForEmail");
async function sendMail(env, to, subject, html) {
  return fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.RESEND_KEY,
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest"
    },
    body: JSON.stringify({
      from: { email: "automail@aplusz.app", name: "AplusZ" },
      to: [{ email: to }],
      subject,
      html
    })
  });
}
__name(sendMail, "sendMail");
async function emailMagicLink(env, email, tier) {
  const payload = { e: email, t: tier, x: Math.floor(Date.now() / 1e3) + MAGIC_TTL };
  const body = b64urlStr(JSON.stringify(payload));
  const sig = b64url(await hmac(env.SIGNING_SECRET, "magic." + body));
  const link = env.APP_URL + "/?magic=" + body + "." + sig;
  const html = '<div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:auto"><h2 style="color:#0f172a">Your A+Z.app access</h2><p>Tap below to unlock your <b>' + (tier === "proplus" ? "Pro+" : "Pro") + '</b> plan on this device.</p><p><a href="' + link + '" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">Unlock my plan</a></p><p style="color:#64748b;font-size:13px">This link works once and expires in 30 minutes. Keep this email \u2014 it is the only way to restore your paid plan on a new device.</p></div>';
  return sendMail(env, email, "Your A+Z.app access link", html);
}
__name(emailMagicLink, "emailMagicLink");
async function capOn(env) {
  if (await env.AZKV.get("pause:manual") === "1") return true;
  const cents = parseInt(await env.AZKV.get("rev:" + year()) || "0", 10);
  return cents >= CAP_CENTS;
}
__name(capOn, "capOn");
async function addRevenue(env, cents) {
  const key = "rev:" + year();
  const cur = parseInt(await env.AZKV.get(key) || "0", 10) + cents;
  await env.AZKV.put(key, String(cur));
  if (cur >= CAP_CENTS && await env.AZKV.get("pause:auto:" + year()) !== "1") {
    await env.AZKV.put("pause:auto:" + year(), "1");
    await pauseAllSubs(env, "auto");
  }
}
__name(addRevenue, "addRevenue");
async function pauseAllSubs(env, reason) {
  let starting = null, guard = 0;
  do {
    const q = "subscriptions?status=active&limit=100" + (starting ? "&starting_after=" + starting : "");
    const list = await stripe(env, q);
    for (const s of list.data || []) {
      await stripe(env, "subscriptions/" + s.id, "POST", { "pause_collection[behavior]": "void" });
      starting = s.id;
    }
    var more = list.has_more;
  } while (more && ++guard < 20);
  await sendCapNotices(env, reason);
}
__name(pauseAllSubs, "pauseAllSubs");
async function sendCapNotices(env, reason) {
  const list = await stripe(env, "customers?limit=100");
  for (const c of list.data || []) {
    if (!c.email) continue;
    await sendMail(
      env,
      c.email,
      "A+Z.app is free for everyone until January",
      "<p>Good news \u2014 every A+Z.app feature is free for all users until <b>1 January</b>. Your billing is paused; nothing will be charged until then.</p>"
    );
  }
}
__name(sendCapNotices, "sendCapNotices");
function giftRandCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) c += chars[b % chars.length];
  return c.slice(0, 4) + "-" + c.slice(4, 8) + "-" + c.slice(8);
}
__name(giftRandCode, "giftRandCode");
async function rotateDailyGift(env) {
  const code = giftRandCode();
  const now = Math.floor(Date.now() / 1e3);
  await env.AZKV.put("dailygift:current", JSON.stringify({
    code,
    created: now,
    claimed: false
  }));
  await env.AZKV.put("gift:" + code, JSON.stringify({
    used: 0,
    deviceId: null,
    days: 30,
    exp: null,
    created: now
  }), { expirationTtl: 40 * 86400 });
  await env.AZKV.put("roulette:spins", "0");
}
__name(rotateDailyGift, "rotateDailyGift");
var index_default = {
  /* ---- cron: fires daily at a random-offset time (see wrangler.toml) ---- */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(rotateDailyGift(env));
  },
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("origin") || env.APP_URL || "*";
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    try {
      if (url.pathname === "/status") {
        return json({ capOn: await capOn(env), year: year() }, 200, origin);
      }
      if (url.pathname === "/daily-gift" && req.method === "GET") {
        const raw = await env.AZKV.get("dailygift:current");
        if (!raw) return json({ code: null }, 200, origin);
        let g;
        try {
          g = JSON.parse(raw);
        } catch {
          return json({ code: null }, 200, origin);
        }
        if (g.claimed) return json({ code: null }, 200, origin);
        return json({ code: g.code }, 200, origin);
      }
      if (url.pathname === "/roulette-spin" && req.method === "POST") {
        const spinCount = parseInt(await env.AZKV.get("roulette:spins") || "0", 10) + 1;
        await env.AZKV.put("roulette:spins", String(spinCount));
        const isWin = spinCount % 1500 === 0;
        if (isWin) {
          const code = giftRandCode();
          const now = Math.floor(Date.now() / 1e3);
          await env.AZKV.put("gift:" + code, JSON.stringify({
            used: 0,
            deviceId: null,
            days: 30,
            exp: null,
            created: now
          }), { expirationTtl: 40 * 86400 });
          return json({ win: true, code }, 200, origin);
        }
        return json({ win: false }, 200, origin);
      }
      if (url.pathname === "/checkout" && req.method === "POST") {
        const { email, tier } = await req.json();
        const e = normEmail(email);
        if (!validEmail(e)) return json({ error: "invalid_email" }, 400, origin);
        if (tier !== "pro" && tier !== "proplus") return json({ error: "bad_tier" }, 400, origin);
        if (await capOn(env)) return json({ capOn: true }, 200, origin);
        const existing = await tierForEmail(env, e);
        if (existing !== "free") {
          await emailMagicLink(env, e, existing);
          return json({ existing, emailed: true }, 200, origin);
        }
        const price = tier === "proplus" ? env.PRICE_PROPLUS : env.PRICE_PRO;
        const sess = await stripe(env, "checkout/sessions", "POST", {
          mode: "subscription",
          customer_email: e,
          "line_items[0][price]": price,
          "line_items[0][quantity]": "1",
          "subscription_data[metadata][tier]": tier,
          success_url: env.APP_URL + "/?paid={CHECKOUT_SESSION_ID}",
          cancel_url: env.APP_URL + "/?cancelled=1"
        });
        if (sess.url) return json({ url: sess.url }, 200, origin);
        return json({ error: "stripe" }, 502, origin);
      }
      if (url.pathname === "/confirm" && req.method === "POST") {
        const { session } = await req.json();
        if (!session) return json({ error: "no_session" }, 400, origin);
        const s = await stripe(env, "checkout/sessions/" + encodeURIComponent(session));
        const e = normEmail(s.customer_details?.email || s.customer_email);
        if (!e || s.payment_status !== "paid") return json({ tier: "free" }, 200, origin);
        const tier = await tierForEmail(env, e);
        const token = await makeToken(env, e, tier);
        return json({ tier, token, email: e }, 200, origin);
      }
      if (url.pathname === "/restore" && req.method === "POST") {
        const { email } = await req.json();
        const e = normEmail(email);
        if (!validEmail(e)) return json({ error: "invalid_email" }, 400, origin);
        const tier = await tierForEmail(env, e);
        if (tier === "free") return json({ found: false }, 200, origin);
        await emailMagicLink(env, e, tier);
        return json({ found: true, emailed: true }, 200, origin);
      }
      if (url.pathname === "/magic" && req.method === "POST") {
        const { d } = await req.json();
        if (!d || d.indexOf(".") === -1) return json({ error: "bad" }, 400, origin);
        const [body, sig] = d.split(".");
        const expect = b64url(await hmac(env.SIGNING_SECRET, "magic." + body));
        if (!timingSafe(sig, expect)) return json({ error: "bad" }, 400, origin);
        let p;
        try {
          p = JSON.parse(fromB64url(body));
        } catch {
          return json({ error: "bad" }, 400, origin);
        }
        if (!p.x || p.x < Math.floor(Date.now() / 1e3)) return json({ error: "expired" }, 400, origin);
        const signedTier = p.t === "pro" || p.t === "proplus" ? p.t : null;
        const tier = signedTier || await tierForEmail(env, p.e);
        if (tier === "free") return json({ tier: "free" }, 200, origin);
        const token = await makeToken(env, p.e, tier);
        return json({ tier, token, email: p.e }, 200, origin);
      }
      if (url.pathname === "/validate" && req.method === "POST") {
        const { token } = await req.json();
        const p = await readToken(env, token);
        if (!p) return json({ tier: "free", valid: false }, 200, origin);
        return json({ tier: p.t, valid: true, email: p.e }, 200, origin);
      }
      if (url.pathname === "/comment" && req.method === "POST") {
        try {
          const body = await req.json();
          const name = (body.name || "").slice(0, 60).trim();
          const comment = (body.comment || "").slice(0, 400).trim();
          if (!name || !comment) return json({ error: "missing fields" }, 400, origin);
          const id = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
          await env.KV.put("comment:" + id, JSON.stringify({ id, name, comment, status: "pending", ts: Date.now() }));
          return json({ ok: true }, 200, origin);
        } catch (e) {
          return json({ error: "invalid" }, 400, origin);
        }
      }
      if (url.pathname === "/comments" && req.method === "GET") {
        const list = await env.KV.list({ prefix: "comment:" });
        const approved = [];
        for (const k of list.keys) {
          const v = await env.KV.get(k.name, "json");
          if (v && v.status === "approved") approved.push(v);
        }
        approved.sort(function(a, b) {
          return b.ts - a.ts;
        });
        return json({ comments: approved }, 200, origin);
      }
      if (url.pathname === "/press" && req.method === "POST") {
        try {
          const body = await req.json();
          const name = (body.name || "").slice(0, 80).trim();
          const email = (body.email || "").slice(0, 120).trim();
          const message = (body.message || "").slice(0, 600).trim();
          const id = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
          await env.KV.put("press:" + id, JSON.stringify({ id, name, email, message, ts: Date.now() }));
          return json({ ok: true }, 200, origin);
        } catch (e) {
          return json({ error: "invalid" }, 400, origin);
        }
      }
      if (url.pathname === "/comment/accept" && req.method === "POST") {
        if (!validAdminCookie(req, env)) return json({ error: "unauthorized" }, 401, origin);
        try {
          const { id } = await req.json();
          const key = "comment:" + id;
          const v = await env.KV.get(key, "json");
          if (!v) return json({ error: "not found" }, 404, origin);
          v.status = "approved";
          await env.KV.put(key, JSON.stringify(v));
          return json({ ok: true }, 200, origin);
        } catch (e) {
          return json({ error: "invalid" }, 400, origin);
        }
      }
      if (url.pathname === "/comment/reject" && req.method === "POST") {
        if (!validAdminCookie(req, env)) return json({ error: "unauthorized" }, 401, origin);
        try {
          const { id } = await req.json();
          await env.KV.delete("comment:" + id);
          return json({ ok: true }, 200, origin);
        } catch (e) {
          return json({ error: "invalid" }, 400, origin);
        }
      }
      if (url.pathname === "/comments-all" && req.method === "GET") {
        if (!validAdminCookie(req, env)) return json({ error: "unauthorized" }, 401, origin);
        const list = await env.KV.list({ prefix: "comment:" });
        const all = [];
        for (const k of list.keys) {
          const v = await env.KV.get(k.name, "json");
          if (v) all.push(v);
        }
        all.sort(function(a, b) {
          return b.ts - a.ts;
        });
        return json({ comments: all }, 200, origin);
      }
      if (url.pathname === "/web-verify" && req.method === "POST") {
        try {
          const body = await req.json();
          const email = (body.email || "").toLowerCase().trim();
          if (!email) return json({ ok: false, error: "missing email" }, 400, origin);
          let paid = await env.KV.get("paid_web:" + email);
          if (!paid && env.STRIPE_WEB_KEY) {
            try {
              const sr = await fetch("https://api.stripe.com/v1/checkout/sessions?limit=20", { headers: { "Authorization": "Bearer " + env.STRIPE_WEB_KEY } });
              const sd = await sr.json();
              if (sd.data && sd.data.some(function(s) {
                return s.payment_status === "paid" && (s.customer_details && s.customer_details.email || s.customer_email || "").toLowerCase().trim() === email;
              })) {
                paid = "1";
                await env.KV.put("paid_web:" + email, "1", { expirationTtl: 2592e3 });
              }
            } catch (e) {
            }
          }
          return json({ ok: !!paid }, 200, origin);
        } catch (e) {
          return json({ ok: false }, 200, origin);
        }
      }
      if (url.pathname === "/web-brief" && req.method === "POST") {
        try {
          const body = await req.json();
          const email = (body.email || "").toLowerCase().trim();
          if (!email) return json({ error: "missing email" }, 400, origin);
          const paid = await env.KV.get("paid_web:" + email);
          if (!paid) return json({ error: "not paid" }, 403, origin);
          const id = "WEB-" + Date.now().toString(36).toUpperCase();
          await env.KV.put("brief:" + email, JSON.stringify({ ...body, id, ts: Date.now() }));
          return json({ ok: true, id }, 200, origin);
        } catch (e) {
          return json({ error: "invalid" }, 400, origin);
        }
      }
      if (url.pathname === "/feedback" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        const type = b.type === "idea" ? "idea" : "bug";
        const message = ("" + (b.message || "")).trim().slice(0, 4e3);
        if (!message) return json({ error: "empty" }, 400, origin);
        const email = normEmail(b.email).slice(0, 200);
        const lang = ("" + (b.lang || "")).slice(0, 8);
        const page = ("" + (b.page || "")).slice(0, 300);
        const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        const rec = { id, type, message, email, lang, page, ts: (/* @__PURE__ */ new Date()).toISOString() };
        await env.AZKV.put("feedback:" + id, JSON.stringify(rec));
        return json({ ok: true }, 200, origin);
      }
      if (url.pathname === "/webhook" && req.method === "POST") {
        const raw = await req.text();
        const sigHeader = req.headers.get("stripe-signature") || "";
        if (!await verifyStripeSig(env, raw, sigHeader))
          return new Response("bad sig", { status: 400 });
        const ev = JSON.parse(raw);
        if (ev.type === "checkout.session.completed") {
          const s = ev.data.object;
          const wem = (s.customer_email || s.customer_details && s.customer_details.email || "").toLowerCase().trim();
          if (wem) await env.KV.put("paid_web:" + wem, "1", { expirationTtl: 2592e3 });
        }
        if (ev.type === "invoice.paid") {
          const amt = ev.data.object.amount_paid || 0;
          if (amt > 0) await addRevenue(env, amt);
        }
        return json({ received: true }, 200, origin);
      }
      if (url.pathname === "/admin" && req.method === "GET") {
        return new Response(adminPage(), {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" }
        });
      }
      if (url.pathname === "/admin/session" && req.method === "POST") {
        const { pass } = await req.json();
        if (pass !== env.ADMIN_PASS) return json({ error: "forbidden" }, 403, origin);
        const exp = Math.floor(Date.now() / 1e3) + 90 * 86400;
        const body = b64urlStr(JSON.stringify({ a: 1, x: exp }));
        const sig = b64url(await hmac(env.SIGNING_SECRET, "admin." + body));
        const tok = body + "." + sig;
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            ...cors(origin),
            "set-cookie": "az_admin=" + tok + "; Path=/; Max-Age=" + 90 * 86400 + "; HttpOnly; Secure; SameSite=Strict"
          }
        });
      }
      if (url.pathname === "/admin/logout" && req.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            ...cors(origin),
            "set-cookie": "az_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict"
          }
        });
      }
      if (url.pathname === "/admin/status" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const ok = reqBody.pass && reqBody.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
        if (!ok) return json({ error: "forbidden" }, 403, origin);
        const manual = await env.AZKV.get("pause:manual") === "1";
        const cents = parseInt(await env.AZKV.get("rev:" + year()) || "0", 10);
        const auto = cents >= CAP_CENTS;
        return json({
          paused: manual || auto,
          manual,
          auto,
          revenue: cents / 100,
          cap: CAP_CENTS / 100,
          year: year()
        }, 200, origin);
      }
      if (url.pathname === "/admin/feedback" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const ok = reqBody.pass && reqBody.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
        if (!ok) return json({ error: "forbidden" }, 403, origin);
        const list = await env.AZKV.list({ prefix: "feedback:" });
        const items = [];
        for (const k of list.keys) {
          const v = await env.AZKV.get(k.name);
          if (v) {
            try {
              items.push(JSON.parse(v));
            } catch {
            }
          }
        }
        items.sort((a, b) => a.ts < b.ts ? 1 : -1);
        return json({ items }, 200, origin);
      }
      if (url.pathname === "/admin/feedback/delete" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const ok = reqBody.pass && reqBody.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
        if (!ok) return json({ error: "forbidden" }, 403, origin);
        if (reqBody.id) await env.AZKV.delete("feedback:" + reqBody.id);
        return json({ ok: true }, 200, origin);
      }
      if (url.pathname === "/admin/gift" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const ok = reqBody.pass && reqBody.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
        if (!ok) return json({ error: "forbidden" }, 403, origin);
        let days = parseInt(reqBody.days, 10);
        if (!days || days < 1) days = 180;
        if (days > 3650) days = 3650;
        const code = randCode();
        await env.AZKV.put("gift:" + code, JSON.stringify({
          used: 0,
          deviceId: null,
          days,
          exp: null,
          created: Math.floor(Date.now() / 1e3)
        }));
        const redeemUrl = (env.APP_URL || "https://aplusz.app") + "/legal/?code=" + code;
        return json({ ok: true, code, days, url: redeemUrl }, 200, origin);
      }
      if (url.pathname === "/redeem" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const code = ("" + (reqBody.code || "")).trim();
        const sentDevice = ("" + (reqBody.deviceId || "")).trim();
        if (!code) return json({ error: "no_code", valid: false }, 400, origin);
        const raw = await env.AZKV.get("gift:" + code);
        if (!raw) return json({ error: "invalid", valid: false }, 200, origin);
        let g;
        try {
          g = JSON.parse(raw);
        } catch {
          return json({ error: "invalid", valid: false }, 200, origin);
        }
        if (g.used) {
          if (sentDevice && g.deviceId && timingSafe(sentDevice, g.deviceId)) {
            if (g.exp && g.exp > Math.floor(Date.now() / 1e3)) {
              const token2 = await makeGiftToken(env, g.exp);
              return json({ valid: true, token: token2, deviceId: g.deviceId, exp: g.exp, tier: "proplus" }, 200, origin);
            }
            return json({ error: "expired", valid: false }, 200, origin);
          }
          return json({ error: "used", valid: false }, 200, origin);
        }
        const deviceId = randDevice();
        const exp = Math.floor(Date.now() / 1e3) + g.days * 86400;
        g.used = 1;
        g.deviceId = deviceId;
        g.exp = exp;
        g.redeemed = Math.floor(Date.now() / 1e3);
        await env.AZKV.put("gift:" + code, JSON.stringify(g));
        const token = await makeGiftToken(env, exp);
        return json({ valid: true, token, deviceId, exp, tier: "proplus" }, 200, origin);
      }
      if (url.pathname === "/admin/pause" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const ok = reqBody.pass && reqBody.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
        if (!ok) return json({ error: "forbidden" }, 403, origin);
        const action = reqBody.action;
        if (action === "on") {
          await env.AZKV.put("pause:manual", "1");
          await pauseAllSubs(env, "manual");
        } else {
          await env.AZKV.delete("pause:manual");
        }
        return json({ paused: action === "on" }, 200, origin);
      }
      if (url.pathname === "/admin/fire-gift" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const ok = reqBody.pass && reqBody.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
        if (!ok) return json({ error: "forbidden" }, 403, origin);
        await rotateDailyGift(env);
        const raw = await env.AZKV.get("dailygift:current");
        return json({ fired: true, gift: raw ? JSON.parse(raw) : null }, 200, origin);
      }
      return json({ error: "not_found" }, 404, origin);
    } catch (err) {
      return json({ error: "server", detail: String(err) }, 500, origin);
    }
  }
};
async function verifyStripeSig(env, payload, header) {
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")));
  if (!parts.t || !parts.v1) return false;
  const expectBuf = await hmac(env.STRIPE_WEBHOOK_SECRET, parts.t + "." + payload);
  const expect = [...new Uint8Array(expectBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafe(parts.v1, expect);
}
__name(verifyStripeSig, "verifyStripeSig");
function adminPage() {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>A+Z \u2014 Control</title>
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
    <input id="pass" type="password" autocomplete="current-password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
    <button class="btn btn-go" id="enter">Unlock panel</button>
    <div class="msg err" id="loginMsg"></div>
  </div>

  <!-- PANEL -->
  <div class="card hide" id="panel">
    <div class="state">
      <span class="dot" id="dot"></span>
      <div><div class="lbl" id="stateLbl">\u2014</div><div class="sub" id="stateSub"></div></div>
    </div>
    <div class="meter">
      <div class="row"><span>Revenue this year</span><span id="revTxt">\u2014</span></div>
      <div class="bar"><i id="revBar"></i></div>
    </div>
    <button class="btn" id="toggle">\u2014</button>
    <div class="msg" id="panelMsg"></div>

    <!-- ===== GIFT CODE GENERATOR ===== -->
    <div class="gift">
      <label for="giftDays">Gift access \xB7 duration (days)</label>
      <input id="giftDays" type="number" min="1" max="3650" value="180" inputmode="numeric" />
      <button class="btn btn-go" id="giftGo" style="margin-top:12px">Generate gift code</button>
      <div class="msg" id="giftMsg"></div>
      <div id="giftOut" class="giftOut hide">
        <input id="giftUrl" readonly onclick="this.select()" style="margin-top:14px;font-size:.82rem;text-align:center" />
        <button class="btn" id="giftCopy" style="margin-top:8px;background:#1f2b4a;color:var(--ink)">Copy link</button>
        <div class="sub" style="margin-top:8px;text-align:center;color:var(--mut);font-size:.75rem">Send this link to your friend. First device to open it is bound for the full period \xB7 single use.</div>
      </div>
    </div>
    <!-- ===== DAILY GIFT (scratch page) ===== -->
    <div class="gift">
      <label>Daily Gift \xB7 scratch page</label>
      <button class="btn btn-go" id="fireGift" style="margin-top:8px">Fire today's gift now</button>
      <div class="msg" id="fireGiftMsg"></div>
      <div class="sub" style="margin-top:8px;text-align:center;color:var(--mut);font-size:.75rem">Generates today's code instantly (the cron does this automatically at 14:37 UTC). Visible at aplusz.app/gift.</div>
    </div>
    <!-- ===== FLOW AI LINK SLOT \xB7 tell Claude where/label; replace below ===== -->
    <!-- <div class="foot"><a href="FLOW_AI_URL">Open Flow AI \u2192</a></div> -->
    <div class="gift">
      <label>User feedback - bugs and ideas</label>
      <button class="btn btn-go" id="fbLoad" style="margin-top:8px">Load feedback</button>
      <div class="msg" id="fbAdminMsg"></div>
      <div id="fbList" style="margin-top:10px;display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <!-- ===== COMMENTS MODERATION ===== -->
    <div class="gift">
      <label>User comments \u2014 moderation</label>
      <button class="btn btn-go" id="loadComments" style="margin-top:8px">Load pending comments</button>
      <div class="msg" id="cmtAdminMsg"></div>
      <div id="cmtList" style="display:flex;flex-direction:column;gap:8px;margin-top:8px"></div>
    <div class="foot"><a href="#" id="logout">Log out</a></div>
  </div>

  <div class="foot"><a href="https://aplusz.app">\u2190 aplusz.app</a></div>
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
  $('stateLbl').textContent = paused ? 'PAUSED \u2014 free for everyone' : 'LIVE \u2014 billing active';
  $('stateSub').textContent = paused
    ? (s.auto ? 'Auto-paused: revenue cap reached' : 'Manually paused by you')
    : 'Subscriptions charging normally';
  $('revTxt').textContent = '\u20AC' + s.revenue.toLocaleString() + ' / \u20AC' + s.cap.toLocaleString();
  $('revBar').style.width = Math.min(100,(s.revenue/s.cap)*100) + '%';
  const t = $('toggle');
  if(paused){ t.textContent='Resume \u2014 start billing again'; t.className='btn btn-resume'; }
  else { t.textContent='Pause everything \u2014 free for all'; t.className='btn btn-pause'; }
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
    m.className='msg ok'; m.textContent = 'Code created \xB7 valid ' + r.days + ' days \xB7 single device.';
    $('giftUrl').value = r.url;
    $('giftOut').classList.remove('hide');
  } catch { m.className='msg err'; m.textContent='Could not create code. Try again.'; }
};
$('giftCopy').onclick = () => {
  const i = $('giftUrl'); i.select(); i.setSelectionRange(0,99999);
  try { navigator.clipboard.writeText(i.value); $('giftCopy').textContent='Copied \u2713';
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
<\/script>
</body></html>`;
}
__name(adminPage, "adminPage");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
