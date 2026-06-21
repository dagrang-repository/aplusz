const fs = require('fs');
const F = 'index.js';
let s = fs.readFileSync(F, 'utf8');
if (s.indexOf('sendGrantEmail') !== -1) { console.log('ALREADY PRESENT'); process.exit(0); }

const OLD = [
"// POST /admin/markpaid  {pass?, id}  (admin) -> exactly-once claim + grant",
"async function handleAdminMarkpaid(env, req, origin) {",
"  const b = await req.json().catch(() => ({}));",
"  const ok = (b.pass && b.pass === env.ADMIN_PASS) || await validAdminCookie(env, req);",
"  if (!ok) return json({ error: 'forbidden' }, 403, origin);",
"  const id = ('' + (b.id || '')).trim();",
"  if (!id) return json({ error: 'no_id' }, 400, origin);",
"  const r = await claimAndGrant(env, { id });",
"  return json(r, 200, origin);",
"}"
].join("\n");

if (s.indexOf(OLD) === -1) { console.log('MARKPAID ANCHOR NOT FOUND - aborting'); process.exit(1); }

const NEW = [
"// POST /admin/markpaid  {pass?, id}  (admin) -> exactly-once claim + grant, then email buyer",
"async function handleAdminMarkpaid(env, req, origin) {",
"  const b = await req.json().catch(() => ({}));",
"  const ok = (b.pass && b.pass === env.ADMIN_PASS) || await validAdminCookie(env, req);",
"  if (!ok) return json({ error: 'forbidden' }, 403, origin);",
"  const id = ('' + (b.id || '')).trim();",
"  if (!id) return json({ error: 'no_id' }, 400, origin);",
"  const r = await claimAndGrant(env, { id });",
"  let emailed = false;",
"  if (r.granted && r.email) {",
"    try { await sendGrantEmail(env, r.email, r.tier, r.token, r.expiry); emailed = true; }",
"    catch (e) { emailed = false; }",
"  }",
"  return json(Object.assign({}, r, { emailed }), 200, origin);",
"}",
"",
"// Buyer access email: branded, tier name+icon pair, self-contained ?grant= link.",
"async function sendGrantEmail(env, to, tier, token, expiry) {",
"  const label = tier === 'proplus' ? 'Pro+ \\u{1F451}' : 'Pro \\u2B50';",
"  const link = (env.APP_URL || 'https://aplusz.app') + '/?grant=' + encodeURIComponent(token);",
"  const until = new Date(expiry * 1000).toISOString().slice(0, 10);",
"  const html =",
"    '<div style=\"font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a\">' +",
"      '<h2 style=\"margin:0 0 12px\">Welcome to AplusZ ' + label + '</h2>' +",
"      '<p style=\"margin:0 0 16px;line-height:1.5\">Your access is active until <b>' + until + '</b>. Tap below to unlock it on this device:</p>' +",
"      '<p style=\"margin:0 0 20px\"><a href=\"' + link + '\" style=\"display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600\">Unlock ' + label + '</a></p>' +",
"      '<p style=\"margin:0 0 6px;font-size:13px;color:#475569\">Or paste this link into your browser:</p>' +",
"      '<p style=\"margin:0 0 20px;font-size:12px;word-break:break-all;color:#475569\">' + link + '</p>' +",
"      '<hr style=\"border:none;border-top:1px solid #e2e8f0;margin:20px 0\">' +",
"      '<p style=\"margin:0;font-size:12px;color:#94a3b8\">AplusZ.app \\u2014 the search is free as air, so you fly for less.</p>' +",
"    '</div>';",
"  const subject = 'Your AplusZ ' + label + ' access is live';",
"  return sendMail(env, to, subject, html);",
"}"
].join("\n");

s = s.replace(OLD, NEW);
fs.writeFileSync(F, s);
console.log('PATCHED');
