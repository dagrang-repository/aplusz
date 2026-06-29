/* ============================================================
   APlusZ — Billing & Access (Step 18)
   File: frontend/assets/billing.js
   Save: D:\Destop\AplusZ\frontend\assets\billing.js

   No honor-flag. Access proven by an HMAC token issued by the
   Worker only after Stripe confirms payment. Email = identity.
   When the yearly cap is on, everyone is unlocked until 1 Jan.
   ============================================================ */

(function () {
  'use strict';

  var APZ = window.APlusZ = window.APlusZ || {};
  var API = (APZ.config && APZ.config.api) || 'https://api.aplusz.app';

  var LS_TOKEN = 'aplusz-token';
  var LS_TIER = 'aplusz-tier';
  var LS_EMAIL = 'aplusz-email';

  var state = { tier: 'free', capOn: false };

  /* ---------- i18n helper (English fallback so keys never leak) ---------- */
  var EN = {
    'billing.title': 'Go paid',
    'billing.email_prompt': 'Enter your email to continue',
    'billing.email_note': 'Your email is how you keep and restore your plan — use a real inbox you check.',
    'billing.email_ph': 'you@email.com',
    'billing.continue': 'Continue',
    'billing.restore': 'Already paid? Restore access',
    'billing.have_plan': "You already have a {tier} plan — we've emailed your access link.",
    'billing.check_inbox': 'Check your inbox for your access link.',
    'billing.not_found': 'No active plan found for that email.',
    'billing.cap_banner': 'Every feature is free for everyone until 1 January.',
    'billing.pro_active': 'Pro active',
    'billing.proplus_active': 'Pro+ active',
    'billing.free_upgrade': 'Free plan — upgrade for daily alerts',
    'billing.invalid_email': 'Please enter a valid email.',
    'billing.processing': 'Processing…',
    'billing.error': 'Something went wrong. Please try again.',
    'billing.unlocked': 'Unlocked — {tier} active on this device.',
    'billing.close': 'Close'
  };
  function t(key, vars) {
    var s = (APZ.i18n && APZ.i18n.t) ? APZ.i18n.t(key) : key;
    if (s === key && EN[key]) s = EN[key];
    if (vars) for (var k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }
  function tierName(tier) { return tier === 'proplus' ? 'Pro+' : 'Pro'; }

  /* ---------- POST helper ---------- */
  function post(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) { return r.json(); });
  }

  /* ---------- entitlement application ---------- */
  function effectiveTier() {
    return state.capOn ? 'proplus' : state.tier;
  }
  function applyTier() {
    var eff = effectiveTier();
    document.documentElement.setAttribute('data-tier', eff);
    document.dispatchEvent(new CustomEvent('aplusz:tier', { detail: { tier: eff, capOn: state.capOn } }));
  }
  function setTier(tier, token, email) {
    state.tier = tier || 'free';
    try {
      if (token) localStorage.setItem(LS_TOKEN, token);
      localStorage.setItem(LS_TIER, state.tier);
      if (email) localStorage.setItem(LS_EMAIL, email);
    } catch (e) {}
    applyTier();
  }

  /* ---------- public tier getter ---------- */
  function tier() { return effectiveTier(); }

  /* decode a stored token's payload {e,t,x} locally (no secret needed — this is
     for instant UI only; the server re-verifies the HMAC on any real action).
     Lets us show the correct tier immediately on boot, independent of network
     or Stripe/KV propagation timing. */
  function decodeToken(tok) {
    try {
      var body = ('' + tok).split('.')[0];
      var b = body.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';            // worker strips '=' padding; atob needs it
      var p = JSON.parse(atob(b));
      if (!p || (p.t !== 'pro' && p.t !== 'proplus')) return null;
      if (p.x && p.x < Math.floor(Date.now() / 1000)) return null; // expired
      return p;
    } catch (e) { return null; }
  }

  /* ============================================================
     Modal (hardcoded colors — consistent with the How-it-works modal)
     ============================================================ */
  var modal, msgEl, emailEl, btnEl, currentTier = 'pro';

  function buildModal() {
    modal = document.createElement('div');
    modal.id = 'az-bill';
    modal.innerHTML =
      '<div class="azb-backdrop"></div>' +
      '<div class="azb-card" role="dialog" aria-modal="true">' +
      '  <button class="azb-x" aria-label="Close">×</button>' +
      '  <div class="azb-head"></div>' +
      '  <p class="azb-note"></p>' +
      '  <input class="azb-email" type="email" autocomplete="email" inputmode="email" spellcheck="false">' +
      '  <button class="azb-go"></button>' +
      '  <div class="azb-msg" aria-live="polite"></div>' +
      '  <button class="azb-restore"></button>' +
      '</div>';
    document.body.appendChild(modal);

    emailEl = modal.querySelector('.azb-email');
    btnEl = modal.querySelector('.azb-go');
    msgEl = modal.querySelector('.azb-msg');

    modal.querySelector('.azb-x').addEventListener('click', close);
    modal.querySelector('.azb-backdrop').addEventListener('click', close);
    btnEl.addEventListener('click', submit);
    emailEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    modal.querySelector('.azb-restore').addEventListener('click', restore);

    var css = document.createElement('style');
    css.textContent = AZB_CSS;
    document.head.appendChild(css);
  }

  function refreshLabels() {
    modal.querySelector('.azb-head').textContent = t('billing.email_prompt');
    modal.querySelector('.azb-note').textContent = t('billing.email_note');
    emailEl.placeholder = t('billing.email_ph');
    btnEl.textContent = t('billing.continue');
    modal.querySelector('.azb-restore').textContent = t('billing.restore');
    modal.querySelector('.azb-x').setAttribute('title', t('billing.close'));
  }

  function open(tierWanted) {
    if (!modal) buildModal();
    currentTier = tierWanted;
    refreshLabels();
    msgEl.textContent = '';
    msgEl.className = 'azb-msg';
    var saved = '';
    try { saved = localStorage.getItem(LS_EMAIL) || ''; } catch (e) {}
    emailEl.value = saved;
    modal.classList.add('open');
    setTimeout(function () { emailEl.focus(); }, 50);
  }
  function close() { if (modal) modal.classList.remove('open'); }

  function busy(on) {
    btnEl.disabled = on;
    btnEl.textContent = on ? t('billing.processing') : t('billing.continue');
  }
  function say(text, kind) {
    msgEl.textContent = text;
    msgEl.className = 'azb-msg' + (kind ? ' azb-' + kind : '');
  }

  /* MF: read the referral code the visitor arrived with (vref cookie) */
  function mfGate() {
    try { var m = (document.cookie || '').match(/(?:^|; )vref=([^;]*)/); return m ? decodeURIComponent(m[1]) : ''; }
    catch (e) { return ''; }
  }

  function submit() {
    var email = emailEl.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say(t('billing.invalid_email'), 'err'); return; }
    busy(true);
    post('/checkout', { email: email, tier: currentTier, gate: mfGate() }).then(function (r) {
      busy(false);
      if (r.url) { window.location.href = r.url; return; }
      if (r.existing) { say(t('billing.have_plan', { tier: tierName(r.existing) }), 'ok'); return; }
      if (r.capOn) { say(t('billing.cap_banner'), 'ok'); return; }
      if (r.error === 'invalid_email') { say(t('billing.invalid_email'), 'err'); return; }
      say(t('billing.error'), 'err');
    }).catch(function () { busy(false); say(t('billing.error'), 'err'); });
  }

  function restore() {
    var email = emailEl.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say(t('billing.invalid_email'), 'err'); return; }
    post('/restore', { email: email }).then(function (r) {
      if (r.found) say(t('billing.check_inbox'), 'ok');
      else say(t('billing.not_found'), 'err');
    }).catch(function () { say(t('billing.error'), 'err'); });
  }

  /* ============================================================
     Return-from-Stripe / magic-link handling + boot
     ============================================================ */
  function cleanUrl() {
    try {
      var u = new URL(window.location.href);
      ['paid', 'magic', 'cancelled', 'grant'].forEach(function (p) { u.searchParams.delete(p); });
      history.replaceState({}, '', u.pathname + (u.search || '') + u.hash);
    } catch (e) {}
  }

  function toast(text) {
    var el = document.createElement('div');
    el.className = 'azb-toast';
    el.textContent = text;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 400); }, 3200);
  }

  function boot() {
    var params = new URLSearchParams(window.location.search);

    // 1) returned from Stripe checkout
    if (params.get('paid')) {
      post('/confirm', { session: params.get('paid') }).then(function (r) {
        if (r.token) { setTier(r.tier, r.token, r.email); toast(t('billing.unlocked', { tier: tierName(r.tier) })); }
        cleanUrl();
      }).catch(cleanUrl);
      return bootStatus();
    }
    // 2) magic link
    if (params.get('magic')) {
      post('/magic', { d: params.get('magic') }).then(function (r) {
        if (r.token) { setTier(r.tier, r.token, r.email); toast(t('billing.unlocked', { tier: tierName(r.tier) })); }
        cleanUrl();
      }).catch(cleanUrl);
      return bootStatus();
    }
    // 2b) bank/link-rail grant: the signed token travels in the link itself
    if (params.get('grant')) {
      var gtok = params.get('grant');
      post('/validate', { token: gtok }).then(function (r) {
        if (r.valid) { setTier(r.tier, gtok, r.email); toast(t('billing.unlocked', { tier: tierName(r.tier) })); }
        cleanUrl();
      }).catch(cleanUrl);
      return bootStatus();
    }

    if (params.get('cancelled')) cleanUrl();

    // 3) validate stored token
    var saved = '';
    try { saved = localStorage.getItem(LS_TOKEN) || ''; } catch (e) {}
    if (saved) {
      /* Show the correct tier INSTANTLY from the signed token (survives reloads,
         offline, and Stripe/KV propagation lag — the cause of the old ~10-min
         "stuck on Free" delay). The server still re-verifies on any real action. */
      var local = decodeToken(saved);
      if (local) setTier(local.t, null, local.e);

      post('/validate', { token: saved }).then(function (r) {
        if (r.valid) setTier(r.tier, null, r.email);
        else if (!local) setTier('free');   // only downgrade if the token is genuinely bad/expired
      }).catch(function () {
        // offline / server hiccup: keep last known tier, never downgrade
        if (!local) { try { state.tier = localStorage.getItem(LS_TIER) || 'free'; } catch (e) {} }
        applyTier();
      });
    }
    bootStatus();
  }

  function bootStatus() {
    fetch(API + '/status').then(function (r) { return r.json(); }).then(function (s) {
      state.capOn = !!s.capOn;
      applyTier();
      renderBanner();
    }).catch(function () {});
  }

  function renderBanner() {
    var existing = document.getElementById('az-cap-banner');
    if (state.capOn) {
      if (!existing) {
        var b = document.createElement('div');
        b.id = 'az-cap-banner';
        b.textContent = t('billing.cap_banner');
        document.body.insertBefore(b, document.body.firstChild);
        var css = document.createElement('style');
        css.textContent =
          '#az-cap-banner{background:#f5b942;color:#0f172a;font-weight:700;text-align:center;' +
          'padding:10px 16px;font-size:.95rem}';
        document.head.appendChild(css);
      }
    } else if (existing) existing.remove();
  }

  /* re-localize modal + badge when language changes */
  if (APZ.i18n && typeof APZ.i18n.load === 'function') {
    var origLoad = APZ.i18n.load;
    APZ.i18n.load = function () {
      var p = origLoad.apply(this, arguments);
      if (modal) refreshLabels();
      renderBanner();
      return p;
    };
  }


  /* ============================================================
     Buyer view (multi-rail prepaid): duration + Wise/Wero QR.
     Replaces the dead Stripe checkout. English-only by design;
     full i18n pass deferred until explicit "Go". Reuses
     post()/setTier()/storage + the /buy + /restore endpoints.
     ============================================================ */
  var buyModal, buyTier = 'pro', buyMonths = 12, buyEmailEl, buyGoEl, buyMsgEl,
      buyTotalEl, buyPayEl, buyRefEl, buyWiseLink, buyWeroLink, buyTitleEl,
      buyHeroPriceEl, buyPrepayBody;
  var BUY_PRICE = { pro: 4.99, proplus: 9.99 };
  var BUY_MONTHS = [12, 24];     // prepay year blocks (Wise/Wero)
  var BUY_DISCOUNT = 0.8;        // 20% off prepaid

  function buyLabel(tier) { return tier === 'proplus' ? 'Pro+ \u{1F451}' : 'Pro \u2B50'; }
  function buyValidEmail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }

  function buildBuyModal() {
    buyModal = document.createElement('div');
    buyModal.id = 'az-buy';
    var durBtns = BUY_MONTHS.map(function (m) {
      var yrs = m / 12;
      var lbl = yrs === 1 ? '1 year' : yrs + ' years';
      return '<button class="azbuy-dur-b" data-m="' + m + '" data-lbl="' + lbl + '">' +
             '<span class="azbuy-dur-lbl">' + lbl + '</span>' +
             '<span class="azbuy-dur-price"></span>' +
             '</button>';
    }).join('');
    buyModal.innerHTML =
      '<div class="azbuy-backdrop"></div>' +
      '<div class="azbuy-card" role="dialog" aria-modal="true" aria-label="Upgrade">' +
      '  <button class="azbuy-x" aria-label="Close">\u00D7</button>' +
      // --- TOP: small, muted, optional prepay (Wise/Wero) ---
      '  <div class="azbuy-prepay">' +
      '    <div class="azbuy-prepay-lbl"><span data-i18n="buy.prepay_optional">Optional \u00B7 20% off</span></div>' +
      '    <div class="azbuy-dur">' + durBtns + '</div>' +
      '    <div class="azbuy-prepay-body" hidden>' +
      '      <div class="azbuy-total"></div>' +
      '      <input class="azbuy-email" type="email" autocomplete="email" inputmode="email" spellcheck="false" placeholder="your@email.com">' +
      '      <button class="azbuy-go">Get access</button>' +
      '      <div class="azbuy-pay" hidden>' +
      '        <div class="azbuy-ref"></div>' +
      '        <p class="azbuy-paynote" data-i18n="buy.paynote">Pay the exact amount and put this reference in the payment note. Your access is emailed within minutes of confirmation.</p>' +
      '        <div class="azbuy-rails">' +
      '          <div class="azbuy-rail"><img class="azbuy-qr" alt="Wise QR" src="assets/wise-qr.png"><a class="azbuy-paybtn" target="_blank" rel="noopener">Pay with Wise \u25B8</a></div>' +
      '          <div class="azbuy-rail"><img class="azbuy-qr" alt="Wero QR" src="assets/wero-qr.png"><a class="azbuy-paybtn" target="_blank" rel="noopener">Pay with Wero \u25B8</a></div>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      // --- divider ---
      '  <div class="azbuy-sep"></div>' +
      // --- CENTER STAGE: big bold monthly PayPal (the hero) ---
      '  <div class="azbuy-hero">' +
      '    <h3 class="azbuy-title"></h3>' +
      '    <div class="azbuy-hero-price"></div>' +
      '    <div id="az-pp-btns"></div>' +
      '    <div class="azbuy-cancel" data-i18n-html="buy.cancel_line"></div>' +
      '  </div>' +
      '  <div class="azbuy-msg" aria-live="polite"></div>' +
      '  <button class="azbuy-restore" data-i18n="buy.restore">Already paid? Restore my access</button>' +
      '</div>';
    document.body.appendChild(buyModal);

    buyTitleEl = buyModal.querySelector('.azbuy-title');
    buyTotalEl = buyModal.querySelector('.azbuy-total');
    buyEmailEl = buyModal.querySelector('.azbuy-email');
    buyGoEl = buyModal.querySelector('.azbuy-go');
    buyMsgEl = buyModal.querySelector('.azbuy-msg');
    buyPayEl = buyModal.querySelector('.azbuy-pay');
    buyRefEl = buyModal.querySelector('.azbuy-ref');
    buyHeroPriceEl = buyModal.querySelector('.azbuy-hero-price');
    buyPrepayBody = buyModal.querySelector('.azbuy-prepay-body');
    var links = buyModal.querySelectorAll('.azbuy-paybtn');
    buyWiseLink = links[0]; buyWeroLink = links[1];

    buyModal.querySelector('.azbuy-x').addEventListener('click', closeBuy);
    buyModal.querySelector('.azbuy-backdrop').addEventListener('click', closeBuy);
    buyGoEl.addEventListener('click', buySubmit);
    buyEmailEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') buySubmit(); });
    buyModal.querySelector('.azbuy-restore').addEventListener('click', buyRestore);
    buyModal.querySelectorAll('.azbuy-dur-b').forEach(function (b) {
      b.addEventListener('click', function () {
        buyMonths = parseInt(b.getAttribute('data-m'), 10);
        if (buyPrepayBody) buyPrepayBody.hidden = false;   // reveal email + Get access on first year pick
        markDur(); renderTotal(); hidePay();
      });
    });

    var css = document.createElement('style');
    css.textContent = BUY_CSS;
    document.head.appendChild(css);
  }

  function markDur() {
    buyModal.querySelectorAll('.azbuy-dur-b').forEach(function (b) {
      if (parseInt(b.getAttribute('data-m'), 10) === buyMonths) b.classList.add('on');
      else b.classList.remove('on');
    });
  }
  function renderTotal() {
    if (!buyTotalEl) return;
    var yrs = buyMonths / 12;
    var per = yrs === 1 ? (t('buy.one_year') || '1 year') : (t('buy.n_years') || '{n} years').replace('{n}', yrs);
    var tot = (BUY_PRICE[buyTier] * buyMonths * BUY_DISCOUNT).toFixed(2);
    buyTotalEl.innerHTML = per + ' \u2014 \u20AC' + tot + ' <span class="azbuy-save">' + (t('buy.save20') || 'save 20%') + '</span>';
  }
  function renderHeroPrice() {
    if (!buyHeroPriceEl) return;
    var mo = t('buy.per_month') || '/ month';
    buyHeroPriceEl.innerHTML = '\u20AC' + BUY_PRICE[buyTier].toFixed(2) + ' <span class="azbuy-hero-mo">' + mo + '</span>';
  }
  function renderDurPrices() {
    if (!buyModal) return;
    buyModal.querySelectorAll('.azbuy-dur-b').forEach(function (btn) {
      var m = parseInt(btn.getAttribute('data-m'), 10);
      var tot = (BUY_PRICE[buyTier] * m * BUY_DISCOUNT).toFixed(2);
      var slot = btn.querySelector('.azbuy-dur-price');
      if (slot) slot.textContent = '\u20AC' + tot;
    });
  }
  function hidePay() { if (buyPayEl) buyPayEl.hidden = true; }
  function buySay(text, kind) {
    buyMsgEl.textContent = text;
    buyMsgEl.className = 'azbuy-msg' + (kind ? ' azbuy-' + kind : '');
  }
  function buyBusy(on) {
    buyGoEl.disabled = on;
    buyGoEl.textContent = on ? 'Working\u2026' : 'Get access';
  }

  function translateBuyModal() {
    if (!buyModal) return;
    var mail = 'mailto:dagrang@gmail.com?subject=' + encodeURIComponent('I want to cancel') + '&body=' + encodeURIComponent('I want to cancel');
    var defaults = {
      'buy.prepay_optional': 'Optional \u00B7 20% off',
      'buy.per_month': '/ month',
      'buy.save20': 'save 20%',
      'buy.cancel_line': 'Cancel anytime \u2014 <a href="' + mail + '">email \u201CI want to cancel\u201D</a>, no questions asked.',
      'buy.restore': 'Already paid? Restore my access',
      'buy.paynote': 'Pay the exact amount and put this reference in the payment note. Your access is emailed within minutes of confirmation.'
    };
    buyModal.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n'); var v = t(k);
      if (v === k && defaults[k]) v = defaults[k];
      if (v && v !== k) el.textContent = v;
    });
    buyModal.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-html'); var v = t(k);
      if (v === k && defaults[k]) v = defaults[k];
      if (k === 'buy.cancel_line') v = (v || defaults[k]).replace('{mail}', mail);
      if (v && v !== k) el.innerHTML = v;
    });
    // re-render the year button labels in the active language
    buyModal.querySelectorAll('.azbuy-dur-b').forEach(function (b) {
      var m = parseInt(b.getAttribute('data-m'), 10), yrs = m / 12;
      var lbl = yrs === 1 ? (t('buy.one_year') || '1 year') : (t('buy.n_years') || '{n} years').replace('{n}', yrs);
      b.textContent = lbl;
    });
  }

  function openBuy(tierWanted) {
    if (!buyModal) buildBuyModal();
    buyTier = (tierWanted === 'proplus') ? 'proplus' : 'pro';
    buyMonths = 12;
    buyTitleEl.textContent = (t('buy.upgrade_to') || 'Upgrade to') + ' ' + buyLabel(buyTier);
    renderHeroPrice();
    renderDurPrices();
    translateBuyModal();
    renderPayPal(buyTier);
    if (buyPrepayBody) buyPrepayBody.hidden = true;   // collapse prepay until a year is picked
    markDur(); renderTotal(); hidePay();
    buySay('', '');
    var saved = '';
    try { saved = localStorage.getItem(LS_EMAIL) || ''; } catch (e) {}
    buyEmailEl.value = saved;
    buyModal.classList.add('open');
    setTimeout(function () { buyEmailEl.focus(); }, 50);
  }
  function renderPayPal(tier) {
    var mount = document.getElementById('az-pp-btns');
    if (!mount) return;
    mount.innerHTML = '';
    ppEnsureSdk(function (cfg) {
      if (!cfg || !window.paypal) { mount.innerHTML = '<div style=\"font-size:12px;color:#dc2626\">Card option unavailable right now.</div>'; return; }
      var planId = (tier === 'proplus') ? cfg.planProplus : cfg.planPro;
      if (!planId) { mount.innerHTML = '<div style=\"font-size:12px;color:#dc2626\">Card option unavailable right now.</div>'; return; }
      try {
        window.paypal.Buttons({
          fundingSource: window.paypal.FUNDING.CARD,
          style: { layout: 'vertical', shape: 'pill', label: 'subscribe', height: 44 },
          createSubscription: function (data, actions) { return actions.subscription.create({ plan_id: planId }); },
          onApprove: function (data) {
            buySay('Activating\u2026', '');
            post('/paypal/activate', { subscriptionID: data.subscriptionID }).then(function (r) {
              if (r && r.granted) {
                setTier(r.tier, r.token, r.email);
                try { if (r.email) localStorage.setItem(LS_EMAIL, r.email); } catch (e) {}
                buySay('Subscription active \u2713', 'ok');
                setTimeout(closeBuy, 1300);
              } else { buySay('Could not activate \u2014 contact support.', 'err'); }
            }).catch(function () { buySay('Network error. Please try again.', 'err'); });
          },
          onError: function () { buySay('Card error. Please try again.', 'err'); }
        }).render('#az-pp-btns');
      } catch (e) { mount.innerHTML = '<div style=\"font-size:12px;color:#dc2626\">Card option unavailable right now.</div>'; }
    });
  }
  var ppSdkState = 0, ppCfg = null, ppCbs = [];
  function ppEnsureSdk(cb) {
    if (ppSdkState === 2) { cb(ppCfg); return; }
    ppCbs.push(cb);
    if (ppSdkState === 1) return;
    ppSdkState = 1;
    fetch(API + '/paypal/config').then(function (r) { return r.json(); }).then(function (cfg) {
      ppCfg = cfg;
      if (!cfg || !cfg.clientId) { ppSdkState = 0; ppCbs.forEach(function (f) { f(null); }); ppCbs = []; return; }
      var sc = document.createElement('script');
      sc.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(cfg.clientId) + '&vault=true&intent=subscription&currency=EUR';
      sc.onload = function () { ppSdkState = 2; ppCbs.forEach(function (f) { f(ppCfg); }); ppCbs = []; };
      sc.onerror = function () { ppSdkState = 0; ppCbs.forEach(function (f) { f(null); }); ppCbs = []; };
      document.head.appendChild(sc);
    }).catch(function () { ppSdkState = 0; ppCbs.forEach(function (f) { f(null); }); ppCbs = []; });
  }

  function closeBuy() { if (buyModal) buyModal.classList.remove('open'); }

  function buySubmit() {
    var email = buyEmailEl.value.trim();
    if (!buyValidEmail(email)) { buySay('Please enter a valid email.', 'err'); return; }
    buyBusy(true);
    post('/buy', { tier: buyTier, months: buyMonths, email: email,
                   gate: (typeof mfGate === 'function' ? mfGate() : '') }).then(function (r) {
      buyBusy(false);
      if (!r || !r.ref) { buySay('Something went wrong. Please try again.', 'err'); return; }
      try { localStorage.setItem(LS_EMAIL, email); } catch (e) {}
      buyRefEl.textContent = 'Reference: ' + r.ref + '  \u2022  \u20AC' + r.amount;
      if (r.pay) {
        if (r.pay.wise) buyWiseLink.href = r.pay.wise;
        if (r.pay.wero) buyWeroLink.href = r.pay.wero;
      }
      buyPayEl.hidden = false;
      buySay('', '');
    }).catch(function () { buyBusy(false); buySay('Network error. Please try again.', 'err'); });
  }

  function buyRestore() {
    var email = buyEmailEl.value.trim();
    if (!buyValidEmail(email)) { buySay('Enter your email to restore access.', 'err'); return; }
    post('/restore', { email: email }).then(function (r) {
      if (r && r.found) buySay('Check your inbox for your access link.', 'ok');
      else buySay('No access found for that email.', 'err');
    }).catch(function () { buySay('Network error. Please try again.', 'err'); });
  }

  var BUY_CSS =
    '#az-buy{position:fixed;inset:0;z-index:10001;display:none;align-items:center;justify-content:center;padding:16px}' +
    '#az-buy.open{display:flex}' +
    '#az-buy .azbuy-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.55)}' +
    '#az-buy .azbuy-card{position:relative;width:100%;max-width:420px;max-height:90vh;overflow:auto;background:#fff;color:#0f172a;border-radius:16px;padding:22px 20px;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:system-ui,Segoe UI,Arial,sans-serif}' +
    '#az-buy .azbuy-x{position:absolute;top:10px;right:12px;border:0;background:transparent;font-size:22px;line-height:1;cursor:pointer;color:#64748b}' +
    '#az-buy .azbuy-title{margin:2px 0 16px;font-size:20px;font-weight:700;text-align:center}' +
    '#az-buy .azbuy-lbl{font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px}' +
    '#az-buy .azbuy-dur{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 14px}' +
    '#az-buy .azbuy-dur-b{padding:10px 0;border:1px solid #e2e8f0;background:#f8fafc;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;color:#0f172a}' +
      '#az-buy .azbuy-dur-b{display:flex;flex-direction:column;align-items:center;gap:2px;line-height:1.1}' +
      '#az-buy .azbuy-dur-price{font-size:12px;font-weight:700;opacity:.85}' +
      '#az-buy .azbuy-dur-lbl{font-size:13px}' +
    '#az-buy .azbuy-dur-b.on{background:#2563eb;border-color:#2563eb;color:#fff}' +
    '#az-buy .azbuy-total{font-size:18px;font-weight:700;margin:0 0 16px}' +
    '#az-buy .azbuy-email{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px;margin:0 0 12px}' +
    '#az-buy .azbuy-go{width:100%;padding:13px 0;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;font-size:15px;cursor:pointer}' +
    '#az-buy .azbuy-go:disabled{opacity:.6;cursor:default}' +
    '#az-buy .azbuy-pay{margin-top:18px;border-top:1px solid #e2e8f0;padding-top:16px}' +
    '#az-buy .azbuy-ref{font-weight:700;font-size:15px;margin:0 0 6px}' +
    '#az-buy .azbuy-paynote{font-size:13px;color:#475569;line-height:1.5;margin:0 0 16px}' +
    '#az-buy .azbuy-rails{display:grid;grid-template-columns:1fr 1fr;gap:14px}' +
    '#az-buy .azbuy-rail{text-align:center;border:1px solid #e2e8f0;border-radius:12px;padding:12px}' +
    '#az-buy .azbuy-qr{width:100%;max-width:150px;height:auto;display:block;margin:0 auto 10px;image-rendering:pixelated}' +
    '#az-buy .azbuy-paybtn{display:inline-block;width:100%;box-sizing:border-box;padding:9px 0;border-radius:8px;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;font-size:13px;cursor:pointer}' +
    '#az-buy .azbuy-msg{font-size:13px;margin-top:12px;min-height:1em}' +
    '#az-buy .azbuy-err{color:#dc2626}' +
    '#az-buy .azbuy-ok{color:#16a34a}' +
    '#az-buy .azbuy-restore{display:block;width:100%;margin-top:14px;border:0;background:transparent;color:#64748b;font-size:13px;text-decoration:underline;cursor:pointer}' +
    '#az-buy .azbuy-pp{margin:0 0 14px}' +
    '#az-buy .azbuy-pp-lbl{font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin:0 0 8px}' +
    '#az-buy .azbuy-prepay{margin:0 0 4px}' +
    '#az-buy .azbuy-prepay-lbl{text-align:center;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px}' +
    '#az-buy .azbuy-dur{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:0 0 10px}' +
    '#az-buy .azbuy-dur-b{padding:8px 0;border:1px solid #e2e8f0;background:#f8fafc;border-radius:9px;font-weight:600;font-size:13px;cursor:pointer;color:#475569}' +
    '#az-buy .azbuy-dur-b.on{background:#0f172a;border-color:#0f172a;color:#fff}' +
    '#az-buy .azbuy-total{font-size:14px;font-weight:700;margin:6px 0 10px;text-align:center}' +
    '#az-buy .azbuy-save{display:inline-block;font-size:10px;font-weight:700;color:#16a34a;background:rgba(22,163,74,.12);padding:2px 7px;border-radius:999px;margin-left:4px}' +
    '#az-buy .azbuy-sep{height:1px;background:#e2e8f0;margin:14px 0}' +
    '#az-buy .azbuy-hero{text-align:center}' +
    '#az-buy .azbuy-hero-price{font-size:30px;font-weight:800;color:#0f172a;margin:0 0 12px;letter-spacing:-.5px}' +
    '#az-buy .azbuy-hero-mo{font-size:15px;font-weight:600;color:#64748b}' +
    '#az-buy .azbuy-cancel{font-size:12px;color:#64748b;line-height:1.5;margin:10px 0 2px}' +
    '#az-buy .azbuy-cancel a{color:#2563eb;text-decoration:underline;font-weight:600}';

  APZ.billing = { buy: openBuy, restore: restore, tier: tier, isCapOn: function () { return state.capOn; } };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ---------- modal styles (hardcoded colors) ---------- */
  var AZB_CSS =
    '#az-bill{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:16px}' +
    '#az-bill.open{display:flex}' +
    '#az-bill .azb-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(4px)}' +
    '#az-bill .azb-card{position:relative;width:100%;max-width:380px;background:rgba(15,23,42,.94);' +
    'backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:26px 22px;' +
    'box-shadow:0 30px 80px rgba(0,0,0,.55);color:#e8eef7}' +
    '#az-bill .azb-x{position:absolute;top:10px;right:12px;background:none;border:none;color:#94a3b8;' +
    'font-size:26px;line-height:1;cursor:pointer}' +
    '#az-bill .azb-head{font-size:1.25rem;font-weight:800;margin:2px 0 8px}' +
    '#az-bill .azb-note{font-size:.86rem;color:#94a3b8;margin:0 0 16px;line-height:1.45}' +
    '#az-bill .azb-email{width:100%;padding:13px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);' +
    'background:rgba(255,255,255,.05);color:#fff;font-size:1rem;outline:none}' +
    '#az-bill .azb-email:focus{border-color:#f5b942;box-shadow:0 0 0 3px rgba(245,185,66,.18)}' +
    '#az-bill .azb-go{width:100%;margin-top:12px;padding:13px;border:none;border-radius:12px;background:#2563eb;' +
    'color:#fff;font-weight:700;font-size:1rem;cursor:pointer}' +
    '#az-bill .azb-go:disabled{opacity:.6;cursor:default}' +
    '#az-bill .azb-msg{min-height:18px;margin-top:12px;font-size:.88rem;text-align:center}' +
    '#az-bill .azb-ok{color:#f5b942}#az-bill .azb-err{color:#fca5a5}' +
    '#az-bill .azb-restore{display:block;width:100%;margin-top:14px;background:none;border:none;' +
    'color:#94a3b8;font-size:.85rem;text-decoration:underline;cursor:pointer}' +
    '.azb-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);' +
    'background:#f5b942;color:#0f172a;font-weight:700;padding:12px 20px;border-radius:999px;' +
    'box-shadow:0 12px 40px rgba(0,0,0,.4);opacity:0;transition:.35s;z-index:10001}' +
    '.azb-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}' +
    '.plan-hint{margin-top:14px;text-align:center}' +
    '.plan-badge{display:inline-block;padding:5px 12px;border-radius:999px;font-size:.8rem;font-weight:700}' +
    '.plan-badge-pro{background:rgba(245,185,66,.15);color:#f5b942}' +
    '.plan-badge-pp{background:#f5b942;color:#0f172a}' +
    '.plan-up{background:none;border:1px solid rgba(245,185,66,.5);color:#f5b942;padding:7px 14px;' +
    'border-radius:999px;font-size:.82rem;font-weight:600;cursor:pointer}';

})();