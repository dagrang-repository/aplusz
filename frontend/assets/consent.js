/* ============================================================
   APlusZ — Consent (Step 24, soft single-acknowledge)
   File: frontend/assets/consent.js
   Save: C:\Users\Home PC\Desktop\AplusZ\frontend\assets\consent.js

   - Consent Mode v2: analytics_storage default DENIED is set inline
     in index.html <head> BEFORE gtag loads (see index.html).
   - This file shows a soft slim bar once. On "Got it":
       * gtag('consent','update',{analytics_storage:'granted'})
       * persists choice -> never shown again
   - Footer "Cookies" link reopens the bar so the choice can change
     (GDPR withdrawability).
   - Strings come from i18n: consent.msg / consent.ok / consent.reopen
   ============================================================ */
(function () {
  'use strict';

  var STORE = 'aplusz-consent';     // '1' = acknowledged (granted)
  var BAR_ID = 'consent-bar';

  function t(key, fallback) {
    try {
      var i = window.APlusZ && window.APlusZ.i18n;
      if (i && i.t) { var v = i.t(key); if (v && v !== key) return v; }
    } catch (e) {}
    return fallback;
  }

  function granted() {
    try { return localStorage.getItem(STORE) === '1'; } catch (e) { return false; }
  }

  function grant() {
    try { localStorage.setItem(STORE, '1'); } catch (e) {}
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          analytics_storage: 'granted',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied'
        });
      }
    } catch (e) {}
  }

  function removeBar() {
    var b = document.getElementById(BAR_ID);
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  function buildBar() {
    if (document.getElementById(BAR_ID)) return;
    var bar = document.createElement('div');
    bar.id = BAR_ID;
    bar.className = 'consent-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-live', 'polite');

    var msg = document.createElement('span');
    msg.className = 'consent-msg';
    msg.setAttribute('data-i18n', 'consent.msg');
    msg.textContent = t('consent.msg', 'We use cookies to keep the search free for everyone.');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'consent-ok';
    btn.setAttribute('data-i18n', 'consent.ok');
    btn.textContent = t('consent.ok', 'Got it');
    btn.addEventListener('click', function () {
      grant();
      bar.classList.remove('show');
      setTimeout(removeBar, 260);   // allow fade-out
    });

    bar.appendChild(msg);
    bar.appendChild(btn);
    document.body.appendChild(bar);
    /* next frame -> trigger CSS fade/slide in */
    requestAnimationFrame(function () { requestAnimationFrame(function () { bar.classList.add('show'); }); });
  }

  function maybeShow() {
    if (granted()) return;
    if (document.body) buildBar();
    else document.addEventListener('DOMContentLoaded', buildBar);
  }

  /* footer "Cookies" link -> reopen the bar (re-consent / withdraw) */
  function wireReopen() {
    var link = document.getElementById('consent-reopen');
    if (!link) return;
    var label = t('consent.reopen', 'Cookies');
    link.textContent = label;
    link.setAttribute('aria-label', label);
    link.addEventListener('click', function (e) {
      e.preventDefault();
      try { localStorage.removeItem(STORE); } catch (er) {}
      buildBar();
    });
  }

  /* keep bar + footer link in the active language on switch */
  document.addEventListener('aplusz:lang', function () {
    var bar = document.getElementById(BAR_ID);
    if (bar) {
      var m = bar.querySelector('.consent-msg'); if (m) m.textContent = t('consent.msg', m.textContent);
      var b = bar.querySelector('.consent-ok');  if (b) b.textContent = t('consent.ok', b.textContent);
    }
    var link = document.getElementById('consent-reopen');
    if (link) link.textContent = t('consent.reopen', link.textContent);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { maybeShow(); wireReopen(); });
  } else {
    maybeShow(); wireReopen();
  }
})();
