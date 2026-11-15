var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// fare-intelligence/verdict.js
function classify(pctile) {
  if (pctile == null) return { band: "unknown", label: "Building history", color: "gray" };
  if (pctile <= 0.33) return { band: "cheap", label: "Cheap", color: "green" };
  if (pctile <= 0.66) return { band: "fair", label: "Fair", color: "amber" };
  return { band: "expensive", label: "Expensive", color: "red" };
}
__name(classify, "classify");
function buySignal({ pctile, trend }) {
  if (pctile == null) return { action: "unknown", reason: "not enough history yet" };
  if (pctile <= 0.5) return { action: "buy", reason: "in the cheaper half of this route's history" };
  if (trend === "rising") return { action: "buy", reason: "pricier than usual and climbing" };
  return { action: "wait", reason: "pricier than usual; may dip" };
}
__name(buySignal, "buySignal");

// fare-intelligence/routes.js
var json = /* @__PURE__ */ __name((obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
}), "json");
async function fareRoutes(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const db = env.FARES_DB;
  if (path === "/fare" && request.method === "POST") {
    if (request.headers.get("x-upload-key") !== env.UPLOAD_KEY)
      return json({ error: "unauthorized" }, 401);
    let f;
    try {
      f = await request.json();
    } catch {
      return json({ error: "bad json" }, 400);
    }
    const origin = f.origin, dest = f.dest, depart_date = f.depart_date;
    if (!origin || !dest || !depart_date || f.price == null)
      return json({ error: "missing origin/dest/depart_date/price" }, 400);
    const ret = f.return_date ?? null;
    const cur = f.currency ?? "EUR";
    const src = f.source ?? "crawler";
    const price = Math.round(Number(f.price));
    if (!Number.isFinite(price)) return json({ error: "price not numeric" }, 400);
    const last = await db.prepare(
      `SELECT price FROM fares
          WHERE origin=?1 AND dest=?2 AND depart_date=?3 AND return_date IS ?4
          ORDER BY found_at DESC LIMIT 1`
    ).bind(origin, dest, depart_date, ret).first();
    if (last && Number(last.price) === price)
      return json({ stored: false, reason: "unchanged" });
    await db.prepare(
      `INSERT INTO fares (origin,dest,depart_date,return_date,price,currency,source)
         VALUES (?1,?2,?3,?4,?5,?6,?7)`
    ).bind(origin, dest, depart_date, ret, price, cur, src).run();
    return json({ stored: true });
  }
  if (path === "/history" && request.method === "GET") {
    const o = url.searchParams.get("o"), d = url.searchParams.get("d"), depart = url.searchParams.get("depart");
    if (!o || !d || !depart) return json({ error: "need o,d,depart" }, 400);
    const win = clampInt(url.searchParams.get("window"), 7, 0, 30);
    const { lo, hi } = dateWindow(depart, win);
    const rows = await db.prepare(
      `SELECT price, currency, found_at FROM fares
          WHERE origin=?1 AND dest=?2 AND depart_date BETWEEN ?3 AND ?4
            AND found_at >= date('now','-365 days')
          ORDER BY found_at ASC`
    ).bind(o, d, lo, hi).all();
    return json({ origin: o, dest: d, depart, points: rows.results ?? [] });
  }
  if (path === "/verdict" && request.method === "GET") {
    const o = url.searchParams.get("o"), d = url.searchParams.get("d"), depart = url.searchParams.get("depart"), price = Math.round(Number(url.searchParams.get("price")));
    if (!o || !d || !depart || !Number.isFinite(price))
      return json({ error: "need o,d,depart,price" }, 400);
    const win = clampInt(url.searchParams.get("window"), 7, 0, 30);
    const { lo, hi } = dateWindow(depart, win);
    const agg = await db.prepare(
      `SELECT COUNT(*) n, MIN(price) min, MAX(price) max, AVG(price) avg,
                SUM(CASE WHEN price <= ?5 THEN 1 ELSE 0 END) below
           FROM fares
          WHERE origin=?1 AND dest=?2 AND depart_date BETWEEN ?3 AND ?4
            AND found_at >= date('now','-365 days')`
    ).bind(o, d, lo, hi, price).first();
    const n = Number(agg?.n ?? 0);
    const pctile = n > 0 ? Number(agg.below) / n : null;
    const recent = await db.prepare(
      `SELECT price FROM fares
          WHERE origin=?1 AND dest=?2 AND depart_date BETWEEN ?3 AND ?4
          ORDER BY found_at DESC LIMIT 5`
    ).bind(o, d, lo, hi).all();
    const trend = trendOf((recent.results ?? []).map((r) => Number(r.price)));
    return json({
      origin: o,
      dest: d,
      depart,
      price,
      samples: n,
      verdict: classify(pctile),
      pctile,
      stats: n ? { min: agg.min, max: agg.max, avg: Math.round(agg.avg) } : null,
      buy: buySignal({ pctile, trend }),
      trend
    });
  }
  return null;
}
__name(fareRoutes, "fareRoutes");
function clampInt(v, dflt, lo, hi) {
  const n = parseInt(v ?? "", 10);
  if (Number.isNaN(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
}
__name(clampInt, "clampInt");
function dateWindow(depart, win) {
  const base = /* @__PURE__ */ new Date(depart + "T00:00:00Z");
  const lo = new Date(base);
  lo.setUTCDate(lo.getUTCDate() - win);
  const hi = new Date(base);
  hi.setUTCDate(hi.getUTCDate() + win);
  const fmt = /* @__PURE__ */ __name((x) => x.toISOString().slice(0, 10), "fmt");
  return { lo: fmt(lo), hi: fmt(hi) };
}
__name(dateWindow, "dateWindow");
function trendOf(recentNewestFirst) {
  if (recentNewestFirst.length < 2) return "flat";
  const newest = recentNewestFirst[0];
  const oldest = recentNewestFirst[recentNewestFirst.length - 1];
  if (!oldest) return "flat";
  const chg = (newest - oldest) / oldest;
  if (chg > 0.02) return "rising";
  if (chg < -0.02) return "falling";
  return "flat";
}
__name(trendOf, "trendOf");

// index.js
var CAP_CENTS = 375e4;
var MF_URL = "https://marketing-foundation.dagrang.workers.dev";
var TOKEN_TTL = 30 * 86400;
var MAGIC_TTL = 30 * 60;
var enc = new TextEncoder();
var json2 = /* @__PURE__ */ __name((o, status = 200, origin = "*") => new Response(JSON.stringify(o), {
  status,
  headers: { "content-type": "application/json", ...cors(origin) }
}), "json");
var cors = /* @__PURE__ */ __name((origin) => ({
  "access-control-allow-origin": origin,
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
  "vary": "Origin"
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
async function readTokenSigned(env, token) {
  if (!token || ("" + token).indexOf(".") === -1) return null;
  const [body, sig] = ("" + token).split(".");
  const expect = b64url(await hmac(env.SIGNING_SECRET, body));
  if (!timingSafe(sig || "", expect)) return null;
  try {
    return JSON.parse(fromB64url(body));
  } catch {
    return null;
  }
}
__name(readTokenSigned, "readTokenSigned");
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
async function activeEntitlement(env, email) {
  email = normEmail(email);
  if (!email || !env.FARES_DB) return null;
  const now = Math.floor(Date.now() / 1e3);
  const rs = await env.FARES_DB.prepare(
    `SELECT tier, paid_at + days * 86400 AS until FROM purchases
      WHERE email = ? AND status IN ('paid', 'cancelled') AND paid_at IS NOT NULL
        AND paid_at + days * 86400 > ?`
  ).bind(email, now).all();
  let best = null;
  for (const r of rs && rs.results || []) {
    if (r.tier !== "pro" && r.tier !== "proplus") continue;
    if (!best || r.tier === "proplus" && best.tier !== "proplus" || r.tier === best.tier && r.until > best.until) {
      best = { tier: r.tier, until: r.until };
    }
  }
  return best;
}
__name(activeEntitlement, "activeEntitlement");
async function tierForEmail(env, email) {
  if (email === normEmail(env.OWNER_EMAIL)) return "proplus";
  try {
    const ent = await activeEntitlement(env, email);
    if (ent) return ent.tier;
  } catch (e) {
  }
  return "free";
}
__name(tierForEmail, "tierForEmail");
async function tierForEmailStripe(env, email) {
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
__name(tierForEmailStripe, "tierForEmailStripe");
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
  try {
    await ppSuspendAll(env);
  } catch (e) {
  }
  return sendCapNotices(env, reason);
  let starting = null, guard = 0;
  try {
  do {
    const q = "subscriptions?status=active&limit=100" + (starting ? "&starting_after=" + starting : "");
    const list = await stripe(env, q);
    for (const s of list.data || []) {
      await stripe(env, "subscriptions/" + s.id, "POST", { "pause_collection[behavior]": "void" });
      starting = s.id;
    }
    var more = list.has_more;
  } while (more && ++guard < 20);
  } catch (e) {
  }
  await sendCapNotices(env, reason);
}
__name(pauseAllSubs, "pauseAllSubs");
async function sendCapNotices(env, reason) {
  const emails = /* @__PURE__ */ new Set();
  try {
    const now = Math.floor(Date.now() / 1e3);
    const rs = await env.FARES_DB.prepare(
      `SELECT DISTINCT email FROM purchases WHERE email IS NOT NULL AND status IN ('paid', 'cancelled') AND paid_at + days * 86400 > ?`
    ).bind(now).all();
    for (const r of rs && rs.results || []) if (r.email) emails.add(normEmail(r.email));
  } catch (e) {
  }
  for (const email of emails) {
    const c = { email };
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
    claimed: false,
    claimedAt: null
  }));
  await env.AZKV.put("gift:" + code, JSON.stringify({
    used: 0,
    deviceId: null,
    days: 30,
    exp: null,
    created: now
  }), { expirationTtl: 40 * 86400 });
}
__name(rotateDailyGift, "rotateDailyGift");
var TIERS = { pro: 499, proplus: 999 };
async function mintTierToken(env, email, tier, expiryUnix) {
  const payload = { e: email || "", t: tier, x: expiryUnix };
  const body = b64urlStr(JSON.stringify(payload));
  const sig = b64url(await hmac(env.SIGNING_SECRET, body));
  return body + "." + sig;
}
__name(mintTierToken, "mintTierToken");
async function grantTier(env, { email, tier, days }) {
  if (!TIERS[tier]) throw new Error("bad tier: " + tier);
  if (!Number.isFinite(days)) throw new Error("bad days: " + days);
  const expiry = Math.floor(Date.now() / 1e3) + days * 86400;
  const token = await mintTierToken(env, email, tier, expiry);
  return { token, expiry, tier, email: email || "" };
}
__name(grantTier, "grantTier");
function cleanGate(g) {
  return ("" + (g || "")).trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
}
__name(cleanGate, "cleanGate");
async function createPurchase(env, { id, rail, tier, days, email, amountCents, providerRef, gate }) {
  const ins = await env.FARES_DB.prepare(
    `INSERT INTO purchases (id, rail, tier, days, email, amount_cents, status, provider_ref, created_at, gate)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`
  ).bind(
    id,
    rail,
    tier,
    days,
    email || null,
    amountCents,
    providerRef || null,
    Math.floor(Date.now() / 1e3),
    cleanGate(gate) || null
  ).run();
  return { id, status: "pending", isNew: !!(ins && ins.meta && ins.meta.changes === 1) };
}
__name(createPurchase, "createPurchase");
async function claimAndGrant(env, { id }) {
  const now = Math.floor(Date.now() / 1e3);
  const upd = await env.FARES_DB.prepare(
    `UPDATE purchases SET status='paid', paid_at=? WHERE id=? AND status='pending'`
  ).bind(now, id).run();
  if (!upd.meta || upd.meta.changes !== 1) {
    return { granted: false, alreadyClaimed: true };
  }
  const row = await env.FARES_DB.prepare(
    `SELECT email, tier, days, amount_cents, gate FROM purchases WHERE id=?`
  ).bind(id).first();
  const g = await grantTier(env, { email: row.email, tier: row.tier, days: row.days });
  await env.FARES_DB.prepare(`UPDATE purchases SET token=? WHERE id=?`).bind(g.token, id).run();
  return { granted: true, token: g.token, email: g.email, tier: g.tier, expiry: g.expiry, amountCents: row.amount_cents || 0, gate: row.gate || "" };
}
__name(claimAndGrant, "claimAndGrant");
async function mfCredit(env, gate, purchaseId) {
  gate = cleanGate(gate);
  const sec = env.MF_SECRET || "";
  if (!gate || !sec || !purchaseId) return { ok: false, reason: "skip" };
  const init = {
    method: "POST",
    headers: { "content-type": "application/json", "x-veliane-secret": sec },
    body: JSON.stringify({ gate, members: ["az-buy-" + purchaseId] })
  };
  const target = (env.MF_URL || MF_URL) + "/veliane/intake";
  try {
    const r = env.MF && typeof env.MF.fetch === "function" ? await env.MF.fetch(target, init) : await fetch(target, init);
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
__name(mfCredit, "mfCredit");
var RAILS = {
  wise: "https://wise.com/pay/business/sangdagrang",
  wero: "https://share.weropay.eu/p/1/c/C0J41ywjKp"
};
var DURATION_DAYS = { 12: 366, 24: 731 };
function newRef() {
  const r = (randCode() + "").replace(/[^a-zA-Z0-9]/g, "");
  return "AZ-" + r.slice(0, 8).toUpperCase();
}
__name(newRef, "newRef");
async function handleCheckout(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const tier = ("" + (b.tier || "")).trim();
  const months = parseInt(b.months, 10);
  const email = normEmail(b.email);
  if (!TIERS[tier]) return json2({ error: "bad_tier" }, 400, origin);
  if (!DURATION_DAYS[months]) return json2({ error: "bad_months" }, 400, origin);
  if (email && !validEmail(email)) return json2({ error: "bad_email" }, 400, origin);
  const amountCents = Math.round(TIERS[tier] * months * 0.8);
  const days = DURATION_DAYS[months];
  const ref = newRef();
  await createPurchase(env, {
    id: ref,
    rail: "bank",
    tier,
    days,
    email: email || null,
    amountCents,
    providerRef: null,
    gate: b.gate
  });
  return json2({
    ref,
    tier,
    months,
    days,
    amount: (amountCents / 100).toFixed(2),
    currency: "EUR",
    pay: { wise: RAILS.wise, wero: RAILS.wero },
    note: "Pay the exact amount, then put " + ref + " in the payment reference/note. Your access is emailed once confirmed."
  }, 200, origin);
}
__name(handleCheckout, "handleCheckout");
async function handleAdminPending(env, req, origin, url) {
  const pass = url.searchParams.get("pass") || "";
  const ok = pass && pass === env.ADMIN_PASS || await validAdminCookie(env, req);
  if (!ok) return json2({ error: "forbidden" }, 403, origin);
  const rs = await env.FARES_DB.prepare(
    `SELECT id, rail, tier, days, email, amount_cents, status, created_at
       FROM purchases WHERE status='pending' ORDER BY created_at DESC LIMIT 100`
  ).all();
  return json2({ pending: rs && rs.results || [] }, 200, origin);
}
__name(handleAdminPending, "handleAdminPending");
async function handleAdminMarkpaid(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const ok = b.pass && b.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
  if (!ok) return json2({ error: "forbidden" }, 403, origin);
  const id = ("" + (b.id || "")).trim();
  if (!id) return json2({ error: "no_id" }, 400, origin);
  const r = await claimAndGrant(env, { id });
  let emailed = false, mf = null;
  if (r.granted) {
    try {
      if (r.amountCents > 0) await addRevenue(env, r.amountCents);
    } catch (e) {
    }
    if (r.gate) mf = await mfCredit(env, r.gate, id);
  }
  if (r.granted && r.email) {
    try {
      await sendGrantEmail(env, r.email, r.tier, r.token, r.expiry);
      emailed = true;
    } catch (e) {
      emailed = false;
    }
  }
  return json2(Object.assign({}, r, { emailed, mf }), 200, origin);
}
__name(handleAdminMarkpaid, "handleAdminMarkpaid");
async function sendGrantEmail(env, to, tier, token, expiry) {
  const label = tier === "proplus" ? "Pro+ \u{1F451}" : "Pro \u2B50";
  const link = (env.APP_URL || "https://aplusz.app") + "/?grant=" + encodeURIComponent(token);
  const until = new Date(expiry * 1e3).toISOString().slice(0, 10);
  const html = '<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a"><h2 style="margin:0 0 12px">Welcome to AplusZ ' + label + '</h2><p style="margin:0 0 16px;line-height:1.5">Your access is active until <b>' + until + '</b>. Tap below to unlock it on this device:</p><p style="margin:0 0 20px"><a href="' + link + '" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Unlock ' + label + '</a></p><p style="margin:0 0 6px;font-size:13px;color:#475569">Or paste this link into your browser:</p><p style="margin:0 0 20px;font-size:12px;word-break:break-all;color:#475569">' + link + '</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"><p style="margin:0;font-size:12px;color:#94a3b8">AplusZ.app \u2014 the search is free as air, so you fly for less.</p></div>';
  const subject = "Your AplusZ " + label + " access is live";
  return sendMail(env, to, subject, html);
}
__name(sendGrantEmail, "sendGrantEmail");
var PP_API = "https://api-m.paypal.com";
var PP_CYCLE_DAYS = 33;
async function ppAccessToken(env) {
  const cred = btoa(env.PAYPAL_CLIENT_ID + ":" + env.PAYPAL_SECRET);
  const r = await fetch(PP_API + "/v1/oauth2/token", {
    method: "POST",
    headers: { authorization: "Basic " + cred, "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  const j = await r.json();
  return j.access_token;
}
__name(ppAccessToken, "ppAccessToken");
async function ppGetSubscription(env, subId) {
  const tok = await ppAccessToken(env);
  const r = await fetch(PP_API + "/v1/billing/subscriptions/" + encodeURIComponent(subId), {
    headers: { authorization: "Bearer " + tok, "content-type": "application/json" }
  });
  if (!r.ok) return null;
  return r.json();
}
__name(ppGetSubscription, "ppGetSubscription");
function ppTierForPlan(env, planId) {
  if (planId && planId === env.PAYPAL_PLAN_PROPLUS) return "proplus";
  if (planId && planId === env.PAYPAL_PLAN_PRO) return "pro";
  return null;
}
__name(ppTierForPlan, "ppTierForPlan");
async function ppSuspendAll(env) {
  const rs = await env.FARES_DB.prepare(
    `SELECT provider_ref FROM purchases WHERE rail = 'paypal' AND status = 'paid' AND provider_ref IS NOT NULL`
  ).all();
  const ids = (rs && rs.results || []).map((r) => r.provider_ref).filter(Boolean);
  if (!ids.length) return 0;
  const tok = await ppAccessToken(env);
  const done = [];
  for (const id of ids) {
    const r = await fetch(PP_API + "/v1/billing/subscriptions/" + encodeURIComponent(id) + "/suspend", {
      method: "POST",
      headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
      body: JSON.stringify({ reason: "Annual cap reached - AplusZ is free for everyone until 1 January" })
    });
    if (r.ok || r.status === 204) done.push(id);
  }
  const prev = JSON.parse(await env.AZKV.get("pp:suspended") || "[]");
  await env.AZKV.put("pp:suspended", JSON.stringify([...new Set(prev.concat(done))]));
  return done.length;
}
__name(ppSuspendAll, "ppSuspendAll");
async function ppResumeAll(env) {
  const ids = JSON.parse(await env.AZKV.get("pp:suspended") || "[]");
  if (!ids.length) return 0;
  const tok = await ppAccessToken(env);
  const left = [];
  for (const id of ids) {
    const r = await fetch(PP_API + "/v1/billing/subscriptions/" + encodeURIComponent(id) + "/activate", {
      method: "POST",
      headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
      body: JSON.stringify({ reason: "AplusZ paid plans resume" })
    });
    if (!(r.ok || r.status === 204 || r.status === 422)) left.push(id);
  }
  if (left.length) await env.AZKV.put("pp:suspended", JSON.stringify(left));
  else await env.AZKV.delete("pp:suspended");
  return ids.length - left.length;
}
__name(ppResumeAll, "ppResumeAll");
var WEB_PRICE = "299.00";
async function handleWebOrder(env, req, origin) {
  const tok = await ppAccessToken(env);
  const r = await fetch(PP_API + "/v2/checkout/orders", {
    method: "POST",
    headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ reference_id: "web", description: "AplusZ custom website - one-time", amount: { currency_code: "EUR", value: WEB_PRICE } }],
      application_context: { brand_name: "AplusZ", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" }
    })
  });
  const j = await r.json().catch(() => ({}));
  if (!j.id) return json2({ error: "paypal" }, 502, origin);
  return json2({ id: j.id }, 200, origin);
}
__name(handleWebOrder, "handleWebOrder");
async function handleWebCapture(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const orderId = ("" + (b.orderID || "")).trim();
  if (!/^[A-Z0-9]{8,40}$/i.test(orderId)) return json2({ error: "bad_order" }, 400, origin);
  const tok = await ppAccessToken(env);
  const r = await fetch(PP_API + "/v2/checkout/orders/" + encodeURIComponent(orderId) + "/capture", {
    method: "POST",
    headers: { authorization: "Bearer " + tok, "content-type": "application/json", "paypal-request-id": "aplusz-web-" + orderId }
  });
  let j = await r.json().catch(() => ({}));
  if (!j.status || j.name) {
    const g = await fetch(PP_API + "/v2/checkout/orders/" + encodeURIComponent(orderId), {
      headers: { authorization: "Bearer " + tok, "content-type": "application/json" }
    });
    j = await g.json().catch(() => ({}));
  }
  const pu = j.purchase_units && j.purchase_units[0] || {};
  const cap = pu.payments && pu.payments.captures && pu.payments.captures[0];
  if (j.status !== "COMPLETED" || !cap || cap.status !== "COMPLETED" || !cap.amount || cap.amount.currency_code !== "EUR" || cap.amount.value !== WEB_PRICE) {
    return json2({ ok: false, error: "not_completed" }, 402, origin);
  }
  const emails = [...new Set([normEmail(j.payer && j.payer.email_address), normEmail(b.email)].filter((e) => e && validEmail(e)))];
  for (const e of emails) await env.AZKV.put("paid_web:" + e, "1", { expirationTtl: 365 * 86400 });
  const id = "PPW-" + cap.id;
  const cp = await createPurchase(env, { id, rail: "paypal_web", tier: "web", days: 0, email: emails[0] || null, amountCents: 29900, providerRef: orderId });
  if (cp.isNew) {
    await env.FARES_DB.prepare("UPDATE purchases SET status='paid', paid_at=? WHERE id=?").bind(Math.floor(Date.now() / 1e3), id).run();
    try {
      await addRevenue(env, 29900);
    } catch (e) {
    }
  }
  return json2({ ok: true, email: emails[0] || "" }, 200, origin);
}
__name(handleWebCapture, "handleWebCapture");
async function ppGrantFromSub(env, sub, doEmail, gate) {
  const tier = ppTierForPlan(env, sub.plan_id);
  if (!tier) return { ok: false, reason: "unknown_plan" };
  const email = sub.subscriber && sub.subscriber.email_address ? normEmail(sub.subscriber.email_address) : "";
  const id = "PP-" + sub.id;
  const amountCents = TIERS[tier];
  const cp = await createPurchase(env, { id, rail: "paypal", tier, days: PP_CYCLE_DAYS, email: email || null, amountCents, providerRef: sub.id, gate });
  if (gate && !cp.isNew) {
    await env.FARES_DB.prepare("UPDATE purchases SET gate=COALESCE(gate, ?) WHERE id=?").bind(cleanGate(gate) || null, id).run();
  }
  const expiry = Math.floor(Date.now() / 1e3) + PP_CYCLE_DAYS * 86400;
  const token = await mintTierToken(env, email, tier, expiry);
  await env.FARES_DB.prepare(
    "UPDATE purchases SET status='paid', paid_at=?, token=?, email=COALESCE(?,email) WHERE id=?"
  ).bind(Math.floor(Date.now() / 1e3), token, email || null, id).run();
  if (doEmail && email) {
    try {
      await sendGrantEmail(env, email, tier, token, expiry);
    } catch (e) {
    }
  }
  return { ok: true, tier, email, token, expiry, id };
}
__name(ppGrantFromSub, "ppGrantFromSub");
async function handlePaypalActivate(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const subId = ("" + (b.subscriptionID || b.subscription_id || "")).trim();
  if (!subId) return json2({ error: "no_subscription" }, 400, origin);
  const sub = await ppGetSubscription(env, subId);
  if (!sub || !sub.id) return json2({ error: "not_found" }, 404, origin);
  if (sub.status !== "ACTIVE" && sub.status !== "APPROVED") {
    return json2({ error: "not_active", status: sub.status }, 200, origin);
  }
  const g = await ppGrantFromSub(env, sub, true, b.gate);
  if (!g.ok) return json2({ error: g.reason }, 400, origin);
  try {
    const row = await env.FARES_DB.prepare("SELECT gate FROM purchases WHERE id=?").bind(g.id).first();
    if (row && row.gate) await mfCredit(env, row.gate, g.id);
  } catch (e) {
  }
  return json2({ granted: true, tier: g.tier, email: g.email, token: g.token, expiry: g.expiry }, 200, origin);
}
__name(handlePaypalActivate, "handlePaypalActivate");
async function ppVerifyWebhook(env, req, rawBody) {
  if (!env.PAYPAL_WEBHOOK_ID) return true;
  const tok = await ppAccessToken(env);
  const h = req.headers;
  const payload = {
    auth_algo: h.get("paypal-auth-algo"),
    cert_url: h.get("paypal-cert-url"),
    transmission_id: h.get("paypal-transmission-id"),
    transmission_sig: h.get("paypal-transmission-sig"),
    transmission_time: h.get("paypal-transmission-time"),
    webhook_id: env.PAYPAL_WEBHOOK_ID,
    webhook_event: JSON.parse(rawBody)
  };
  const r = await fetch(PP_API + "/v1/notifications/verify-webhook-signature", {
    method: "POST",
    headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const j = await r.json().catch(() => ({}));
  return j.verification_status === "SUCCESS";
}
__name(ppVerifyWebhook, "ppVerifyWebhook");
async function handlePaypalWebhook(env, req, origin) {
  const raw = await req.text();
  const ok = await ppVerifyWebhook(env, req, raw);
  if (!ok) return json2({ error: "bad_signature" }, 400, origin);
  let ev;
  try {
    ev = JSON.parse(raw);
  } catch (e) {
    return json2({ ok: true }, 200, origin);
  }
  const type = ev.event_type || "";
  const res = ev.resource || {};
  const subId = res.billing_agreement_id || res.supplementary_data && res.supplementary_data.related_ids && res.supplementary_data.related_ids.subscription_id || res.id || "";
  if (type === "PAYMENT.SALE.COMPLETED" && res.id && res.amount && res.amount.total) {
    const seenKey = "revseen:" + res.id;
    if (!await env.AZKV.get(seenKey)) {
      await env.AZKV.put(seenKey, "1", { expirationTtl: 400 * 86400 });
      const cents = Math.round(parseFloat(res.amount.total) * 100);
      if (cents > 0) await addRevenue(env, cents);
    }
  }
  if (type === "PAYMENT.SALE.COMPLETED" || type === "PAYMENT.CAPTURE.COMPLETED" || type === "BILLING.SUBSCRIPTION.ACTIVATED" || type === "BILLING.SUBSCRIPTION.RE-ACTIVATED") {
    if (subId) {
      const sub = await ppGetSubscription(env, subId);
      if (sub && sub.id && (sub.status === "ACTIVE" || sub.status === "APPROVED")) {
        await ppGrantFromSub(env, sub, false);
      }
    }
  } else if (type === "BILLING.SUBSCRIPTION.CANCELLED" || type === "BILLING.SUBSCRIPTION.SUSPENDED" || type === "BILLING.SUBSCRIPTION.EXPIRED") {
    if (subId) {
      await env.FARES_DB.prepare("UPDATE purchases SET status='cancelled' WHERE id=?").bind("PP-" + subId).run();
    }
  }
  return json2({ ok: true }, 200, origin);
}
__name(handlePaypalWebhook, "handlePaypalWebhook");
var index_default = {
  /* ---- cron: fires daily at a random-offset time (see wrangler.toml) ---- */
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      await rotateDailyGift(env);
      await env.AZKV.put("roulette:spins", "0");
      try {
        if (!await capOn(env)) await ppResumeAll(env);
      } catch (e) {
      }
    })());
  },
  async fetch(req, env) {
    if (!env.KV && env.AZKV) env = Object.assign({}, env, { KV: env.AZKV });
    const url = new URL(req.url);
    const origin = req.headers.get("origin") || env.APP_URL || "*";
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    try {
      {
        const fr = await fareRoutes(req, env);
        if (fr) return fr;
      }
      if (url.pathname === "/status") {
        return json2({ capOn: await capOn(env), year: year() }, 200, origin);
      }
      if (url.pathname === "/daily-gift" && req.method === "GET") {
        const raw = await env.AZKV.get("dailygift:current");
        if (!raw) return json2({ available: false }, 200, origin);
        let g;
        try {
          g = JSON.parse(raw);
        } catch {
          return json2({ available: false }, 200, origin);
        }
        if (g.claimed) {
          const now = Math.floor(Date.now() / 1e3);
          if (g.claimedAt && now - g.claimedAt >= 86400) {
            await rotateDailyGift(env);
            return json2({ available: true }, 200, origin);
          }
          return json2({ available: false }, 200, origin);
        }
        return json2({ available: true }, 200, origin);
      }
      if (url.pathname === "/daily-gift/claim" && req.method === "POST") {
        const raw = await env.AZKV.get("dailygift:current");
        if (!raw) return json2({ claimed: false, error: "none" }, 200, origin);
        let g;
        try {
          g = JSON.parse(raw);
        } catch {
          return json2({ claimed: false, error: "none" }, 200, origin);
        }
        if (g.claimed) {
          const now = Math.floor(Date.now() / 1e3);
          if (g.claimedAt && now - g.claimedAt >= 86400) {
            await rotateDailyGift(env);
            const fresh = await env.AZKV.get("dailygift:current");
            let fg;
            try {
              fg = JSON.parse(fresh);
            } catch {
              return json2({ claimed: false, error: "none" }, 200, origin);
            }
            fg.claimed = true;
            fg.claimedAt = now;
            await env.AZKV.put("dailygift:current", JSON.stringify(fg));
            return json2({ claimed: true, code: fg.code }, 200, origin);
          }
          return json2({ claimed: false, error: "taken" }, 200, origin);
        }
        g.claimed = true;
        g.claimedAt = Math.floor(Date.now() / 1e3);
        await env.AZKV.put("dailygift:current", JSON.stringify(g));
        return json2({ claimed: true, code: g.code }, 200, origin);
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
          return json2({ win: true, code }, 200, origin);
        }
        return json2({ win: false }, 200, origin);
      }
      if (url.pathname === "/checkout" && req.method === "POST") {
        return json2({ error: "paypal_only" }, 410, origin);
        const { email, tier, gate } = await req.json();
        const e = normEmail(email);
        if (!validEmail(e)) return json2({ error: "invalid_email" }, 400, origin);
        if (tier !== "pro" && tier !== "proplus") return json2({ error: "bad_tier" }, 400, origin);
        if (await capOn(env)) return json2({ capOn: true }, 200, origin);
        const existing = await tierForEmail(env, e);
        if (existing !== "free") {
          await emailMagicLink(env, e, existing);
          return json2({ existing, emailed: true }, 200, origin);
        }
        const price = tier === "proplus" ? env.PRICE_PROPLUS : env.PRICE_PRO;
        const g = ("" + (gate || "")).trim().slice(0, 64);
        const form = {
          mode: "subscription",
          customer_email: e,
          "line_items[0][price]": price,
          "line_items[0][quantity]": "1",
          "subscription_data[metadata][tier]": tier,
          success_url: env.APP_URL + "/?paid={CHECKOUT_SESSION_ID}",
          cancel_url: env.APP_URL + "/?cancelled=1"
        };
        if (g) {
          form["metadata[gate]"] = g;
          form["subscription_data[metadata][gate]"] = g;
        }
        const sess = await stripe(env, "checkout/sessions", "POST", form);
        if (sess.url) return json2({ url: sess.url }, 200, origin);
        return json2({ error: "stripe" }, 502, origin);
      }
      if (url.pathname === "/confirm" && req.method === "POST") {
        return json2({ error: "paypal_only" }, 410, origin);
        const { session } = await req.json();
        if (!session) return json2({ error: "no_session" }, 400, origin);
        const s = await stripe(env, "checkout/sessions/" + encodeURIComponent(session));
        const e = normEmail(s.customer_details?.email || s.customer_email);
        if (!e || s.payment_status !== "paid") return json2({ tier: "free" }, 200, origin);
        const tier = await tierForEmail(env, e);
        const token = await makeToken(env, e, tier);
        return json2({ tier, token, email: e }, 200, origin);
      }
      if (url.pathname === "/restore" && req.method === "POST") {
        const { email } = await req.json();
        const e = normEmail(email);
        if (!validEmail(e)) return json2({ error: "invalid_email" }, 400, origin);
        const tier = await tierForEmail(env, e);
        if (tier === "free") return json2({ found: false }, 200, origin);
        await emailMagicLink(env, e, tier);
        return json2({ found: true, emailed: true }, 200, origin);
      }
      if (url.pathname === "/magic" && req.method === "POST") {
        const { d } = await req.json();
        if (!d || d.indexOf(".") === -1) return json2({ error: "bad" }, 400, origin);
        const [body, sig] = d.split(".");
        const expect = b64url(await hmac(env.SIGNING_SECRET, "magic." + body));
        if (!timingSafe(sig, expect)) return json2({ error: "bad" }, 400, origin);
        let p;
        try {
          p = JSON.parse(fromB64url(body));
        } catch {
          return json2({ error: "bad" }, 400, origin);
        }
        if (!p.x || p.x < Math.floor(Date.now() / 1e3)) return json2({ error: "expired" }, 400, origin);
        const usedKey = "magicused:" + sig.slice(0, 43);
        if (await env.AZKV.get(usedKey)) return json2({ error: "used" }, 400, origin);
        await env.AZKV.put(usedKey, "1", { expirationTtl: MAGIC_TTL + 300 });
        const signedTier = p.t === "pro" || p.t === "proplus" ? p.t : null;
        const tier = signedTier || await tierForEmail(env, p.e);
        if (tier === "free") return json2({ tier: "free" }, 200, origin);
        let ent = null;
        try {
          ent = await activeEntitlement(env, p.e);
        } catch (e) {
        }
        const token = ent && ent.tier === tier ? await mintTierToken(env, p.e, tier, ent.until) : await makeToken(env, p.e, tier);
        return json2({ tier, token, email: p.e }, 200, origin);
      }
      if (url.pathname === "/validate" && req.method === "POST") {
        const { token } = await req.json();
        const p = await readToken(env, token);
        const nowS = Math.floor(Date.now() / 1e3);
        const renew = /* @__PURE__ */ __name(async (email) => {
          email = normEmail(email);
          if (!email || email === "gift") return null;
          if (email === normEmail(env.OWNER_EMAIL)) return { tier: "proplus", until: nowS + TOKEN_TTL };
          try {
            return await activeEntitlement(env, email);
          } catch (e) {
            return null;
          }
        }, "renew");
        if (p) {
          if (!p.g && p.e && p.x - nowS < 7 * 86400) {
            const ent = await renew(p.e);
            if (ent && ent.until > p.x) {
              const fresh = await mintTierToken(env, normEmail(p.e), ent.tier, ent.until);
              return json2({ tier: ent.tier, valid: true, email: normEmail(p.e), token: fresh, renewed: true }, 200, origin);
            }
          }
          return json2({ tier: p.t, valid: true, email: p.e }, 200, origin);
        }
        const s = await readTokenSigned(env, token);
        if (s && !s.g && s.e) {
          const ent = await renew(s.e);
          if (ent) {
            const fresh = await mintTierToken(env, normEmail(s.e), ent.tier, ent.until);
            return json2({ tier: ent.tier, valid: true, email: normEmail(s.e), token: fresh, renewed: true }, 200, origin);
          }
        }
        return json2({ tier: "free", valid: false }, 200, origin);
      }
      if (url.pathname === "/comment" && req.method === "POST") {
        try {
          const body = await req.json();
          const name = (body.name || "").slice(0, 60).trim();
          const comment = (body.comment || "").slice(0, 400).trim();
          if (!name || !comment) return json2({ error: "missing fields" }, 400, origin);
          const id = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
          await env.KV.put("comment:" + id, JSON.stringify({ id, name, comment, status: "pending", ts: Date.now() }));
          return json2({ ok: true }, 200, origin);
        } catch (e) {
          return json2({ error: "invalid" }, 400, origin);
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
        return json2({ comments: approved }, 200, origin);
      }
      if (url.pathname === "/press" && req.method === "POST") {
        try {
          const body = await req.json();
          const name = (body.name || "").slice(0, 80).trim();
          const email = (body.email || "").slice(0, 120).trim();
          const message = (body.message || "").slice(0, 600).trim();
          const id = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
          await env.KV.put("press:" + id, JSON.stringify({ id, name, email, message, ts: Date.now() }));
          return json2({ ok: true }, 200, origin);
        } catch (e) {
          return json2({ error: "invalid" }, 400, origin);
        }
      }
      if (url.pathname === "/comment/accept" && req.method === "POST") {
        if (!validAdminCookie(req, env)) return json2({ error: "unauthorized" }, 401, origin);
        try {
          const { id } = await req.json();
          const key = "comment:" + id;
          const v = await env.KV.get(key, "json");
          if (!v) return json2({ error: "not found" }, 404, origin);
          v.status = "approved";
          await env.KV.put(key, JSON.stringify(v));
          return json2({ ok: true }, 200, origin);
        } catch (e) {
          return json2({ error: "invalid" }, 400, origin);
        }
      }
      if (url.pathname === "/comment/reject" && req.method === "POST") {
        if (!validAdminCookie(req, env)) return json2({ error: "unauthorized" }, 401, origin);
        try {
          const { id } = await req.json();
          await env.KV.delete("comment:" + id);
          return json2({ ok: true }, 200, origin);
        } catch (e) {
          return json2({ error: "invalid" }, 400, origin);
        }
      }
      if (url.pathname === "/comments-all" && req.method === "GET") {
        if (!validAdminCookie(req, env)) return json2({ error: "unauthorized" }, 401, origin);
        const list = await env.KV.list({ prefix: "comment:" });
        const all = [];
        for (const k of list.keys) {
          const v = await env.KV.get(k.name, "json");
          if (v) all.push(v);
        }
        all.sort(function(a, b) {
          return b.ts - a.ts;
        });
        return json2({ comments: all }, 200, origin);
      }
      if (url.pathname === "/web-verify" && req.method === "POST") {
        try {
          const body = await req.json();
          const email = (body.email || "").toLowerCase().trim();
          if (!email) return json2({ ok: false, error: "missing email" }, 400, origin);
          let paid = await env.KV.get("paid_web:" + email);
          if (false) {
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
          return json2({ ok: !!paid }, 200, origin);
        } catch (e) {
          return json2({ ok: false }, 200, origin);
        }
      }
      if (url.pathname === "/web-brief" && req.method === "POST") {
        try {
          const body = await req.json();
          const email = (body.email || "").toLowerCase().trim();
          if (!email) return json2({ error: "missing email" }, 400, origin);
          const paid = await env.KV.get("paid_web:" + email);
          if (!paid) return json2({ error: "not paid" }, 403, origin);
          const id = "WEB-" + Date.now().toString(36).toUpperCase();
          await env.KV.put("brief:" + email, JSON.stringify({ ...body, id, ts: Date.now() }));
          return json2({ ok: true, id }, 200, origin);
        } catch (e) {
          return json2({ error: "invalid" }, 400, origin);
        }
      }
      if (url.pathname === "/feedback" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        const type = b.type === "idea" ? "idea" : "bug";
        const message = ("" + (b.message || "")).trim().slice(0, 4e3);
        if (!message) return json2({ error: "empty" }, 400, origin);
        const email = normEmail(b.email).slice(0, 200);
        const lang = ("" + (b.lang || "")).slice(0, 8);
        const page = ("" + (b.page || "")).slice(0, 300);
        const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        const rec = { id, type, message, email, lang, page, ts: (/* @__PURE__ */ new Date()).toISOString() };
        await env.AZKV.put("feedback:" + id, JSON.stringify(rec));
        return json2({ ok: true }, 200, origin);
      }
      if (url.pathname === "/webhook" && req.method === "POST") {
        return json2({ error: "paypal_only" }, 410, origin);
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
        return json2({ received: true }, 200, origin);
      }
      if (url.pathname === "/admin" && req.method === "GET") {
        return new Response(adminPage(), {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" }
        });
      }
      if (url.pathname === "/admin/session" && req.method === "POST") {
        const { pass } = await req.json();
        if (pass !== env.ADMIN_PASS) return json2({ error: "forbidden" }, 403, origin);
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
        if (!ok) return json2({ error: "forbidden" }, 403, origin);
        const manual = await env.AZKV.get("pause:manual") === "1";
        const cents = parseInt(await env.AZKV.get("rev:" + year()) || "0", 10);
        const auto = cents >= CAP_CENTS;
        return json2({
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
        if (!ok) return json2({ error: "forbidden" }, 403, origin);
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
        return json2({ items }, 200, origin);
      }
      if (url.pathname === "/admin/feedback/delete" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const ok = reqBody.pass && reqBody.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
        if (!ok) return json2({ error: "forbidden" }, 403, origin);
        if (reqBody.id) await env.AZKV.delete("feedback:" + reqBody.id);
        return json2({ ok: true }, 200, origin);
      }
      if (url.pathname === "/admin/gift" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const ok = reqBody.pass && reqBody.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
        if (!ok) return json2({ error: "forbidden" }, 403, origin);
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
        return json2({ ok: true, code, days, url: redeemUrl }, 200, origin);
      }
      if (url.pathname === "/redeem" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const code = ("" + (reqBody.code || "")).trim();
        const sentDevice = ("" + (reqBody.deviceId || "")).trim();
        if (!code) return json2({ error: "no_code", valid: false }, 400, origin);
        const raw = await env.AZKV.get("gift:" + code);
        if (!raw) return json2({ error: "invalid", valid: false }, 200, origin);
        let g;
        try {
          g = JSON.parse(raw);
        } catch {
          return json2({ error: "invalid", valid: false }, 200, origin);
        }
        if (g.used) {
          if (sentDevice && g.deviceId && timingSafe(sentDevice, g.deviceId)) {
            if (g.exp && g.exp > Math.floor(Date.now() / 1e3)) {
              const token2 = await makeGiftToken(env, g.exp);
              return json2({ valid: true, token: token2, deviceId: g.deviceId, exp: g.exp, tier: "proplus" }, 200, origin);
            }
            return json2({ error: "expired", valid: false }, 200, origin);
          }
          return json2({ error: "used", valid: false }, 200, origin);
        }
        const deviceId = randDevice();
        const exp = Math.floor(Date.now() / 1e3) + g.days * 86400;
        g.used = 1;
        g.deviceId = deviceId;
        g.exp = exp;
        g.redeemed = Math.floor(Date.now() / 1e3);
        await env.AZKV.put("gift:" + code, JSON.stringify(g));
        const token = await makeGiftToken(env, exp);
        return json2({ valid: true, token, deviceId, exp, tier: "proplus" }, 200, origin);
      }
      if (url.pathname === "/buy" && req.method === "POST") {
        return json2({ error: "paypal_only" }, 410, origin);
      }
      if (url.pathname === "/admin/pending" && req.method === "GET") {
        return handleAdminPending(env, req, origin, url);
      }
      if (url.pathname === "/admin/markpaid" && req.method === "POST") {
        return handleAdminMarkpaid(env, req, origin);
      }
      if (url.pathname === "/paypal/config" && req.method === "GET") {
        return json2({ clientId: env.PAYPAL_CLIENT_ID || "", planPro: env.PAYPAL_PLAN_PRO || "", planProplus: env.PAYPAL_PLAN_PROPLUS || "" }, 200, origin);
      }
      if (url.pathname === "/paypal/web-order" && req.method === "POST") {
        return handleWebOrder(env, req, origin);
      }
      if (url.pathname === "/paypal/web-capture" && req.method === "POST") {
        return handleWebCapture(env, req, origin);
      }
      if (url.pathname === "/paypal/activate" && req.method === "POST") {
        return handlePaypalActivate(env, req, origin);
      }
      if (url.pathname === "/paypal/webhook" && req.method === "POST") {
        return handlePaypalWebhook(env, req, origin);
      }
      if (url.pathname === "/admin/pause" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const ok = reqBody.pass && reqBody.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
        if (!ok) return json2({ error: "forbidden" }, 403, origin);
        const action = reqBody.action;
        if (action === "on") {
          await env.AZKV.put("pause:manual", "1");
          await pauseAllSubs(env, "manual");
        } else {
          await env.AZKV.delete("pause:manual");
        }
        return json2({ paused: action === "on" }, 200, origin);
      }
      if (url.pathname === "/admin/fire-gift" && req.method === "POST") {
        const reqBody = await req.json().catch(() => ({}));
        const ok = reqBody.pass && reqBody.pass === env.ADMIN_PASS || await validAdminCookie(env, req);
        if (!ok) return json2({ error: "forbidden" }, 403, origin);
        await rotateDailyGift(env);
        const raw = await env.AZKV.get("dailygift:current");
        return json2({ fired: true, gift: raw ? JSON.parse(raw) : null }, 200, origin);
      }
      return json2({ error: "not_found" }, 404, origin);
    } catch (err) {
      return json2({ error: "server", detail: String(err) }, 500, origin);
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
