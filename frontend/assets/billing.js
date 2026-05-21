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

  function submit() {
    var email = emailEl.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say(t('billing.invalid_email'), 'err'); return; }
    busy(true);
    post('/checkout', { email: email, tier: currentTier }).then(function (r) {
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
      ['paid', 'magic', 'cancelled'].forEach(function (p) { u.searchParams.delete(p); });
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
    if (params.get('cancelled')) cleanUrl();

    // 3) validate stored token
    var saved = '';
    try { saved = localStorage.getItem(LS_TOKEN) || ''; } catch (e) {}
    if (saved) {
      post('/validate', { token: saved }).then(function (r) {
        if (r.valid) setTier(r.tier, null, r.email);
        else setTier('free');
      }).catch(function () {
        // offline: trust last known tier from storage
        try { state.tier = localStorage.getItem(LS_TIER) || 'free'; } catch (e) {}
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

  APZ.billing = { buy: open, restore: restore, tier: tier, isCapOn: function () { return state.capOn; } };

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
