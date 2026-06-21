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

// POST /admin/markpaid  {pass?, id}  (admin) -> exactly-once claim + grant
async function handleAdminMarkpaid(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const ok = (b.pass && b.pass === env.ADMIN_PASS) || await validAdminCookie(env, req);
  if (!ok) return json({ error: 'forbidden' }, 403, origin);
  const id = ('' + (b.id || '')).trim();
  if (!id) return json({ error: 'no_id' }, 400, origin);
  const r = await claimAndGrant(env, { id });
  return json(r, 200, origin);
}
