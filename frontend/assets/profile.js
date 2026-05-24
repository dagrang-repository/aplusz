/* ============================================================
   AplusZ — Profile UI: Plans / Price alerts / Progress / Share / Karma / Streak
   File: frontend/assets/profile.js
   Save: D:\Destop\AplusZ\frontend\assets\profile.js
   ============================================================ */

(function () {
  'use strict';

  var REVENUE_CAP_EUR = 62000;

  // Plans built from i18n at render time (names use the icon+key pair rule;
  // feats reuse the existing plans.* keys joined with " · ").
  function tt(k) {
    try { return (window.APlusZ.i18n && window.APlusZ.i18n.t) ? window.APlusZ.i18n.t(k) : k; }
    catch (e) { return k; }
  }
  function plansData() {
    return [
      '<div class="profile-drawer" id="profile-drawer">',
      '  <div class="pd-header">',
      '    <div class="pd-title">' + tt('profile.title') + '</div>',
      '    <div class="pd-close-wrap"><button class="pd-close" id="pd-close" aria-label="' + tt('alerts.close') + '">\u00d7</button></div>',
      '  </div>',

      '  <div class="pd-plans pd-plans-current">' + currentPlanHTML() + '</div>',

      '  <div class="pd-karma">',
      '    <div class="adopt-bar" id="adopt-bar">',
      '      <div class="adopt-fill" id="adopt-fill" style="width:0%"><div class="adopt-shimmer"></div></div>',
      '      <div class="adopt-bar-text"><span>' + tt('profile.progress') + '</span><span id="adopt-pct">0%</span></div>',
      '    </div>',
      '    <div class="pd-karma-reward">' + tt('profile.reward') + '</div>',
      '  </div>',

      '  <div class="pd-karma">',
      '    <div class="ref-link-row">',
      '      <input class="ref-link-input" id="ref-link-input" value="' + url + '" readonly>',
      '      <button class="ref-link-copy" id="ref-link-copy">' + tt('profile.copy') + '</button>',
      '    </div>',
      '    <button class="pd-share-btn" id="pd-share">\u2197 ' + tt('profile.share') + '</button>',
      '  </div>',

      '  <div class="pd-karma">',
      '    <div class="pd-karma-top">',
      '      <span class="pd-karma-label">' + tt('profile.karma_points') + '</span>',
      '      <span class="pd-karma-value">' + karma + '</span>',
      '    </div>',
      '    <div class="pd-karma-msg">' + tt('profile.karma_msg') + '</div>',
      '  </div>',

      '  <div class="pd-streak">',
      '    <span class="pd-streak-icon">\uD83D\uDD25</span>',
      '    <span class="pd-streak-value">' + streak + '</span>',
      '    <span class="pd-streak-label">' + tt('profile.streak') + '</span>',
      '  </div>',

      '  <div class="pd-section">',
      '    <div class="pd-label">' + tt('profile.saved_routes') + '</div>',
      '    <div class="pd-alerts-intro">' + tt('profile.saved_intro') + '</div>',
      '    <div id="pd-alerts-anchor"></div>',
      '  </div>',

      '  <div class="pd-plans pd-plans-others">' + otherPlansHTML() + '</div>',

      '</div>',
      '<div class="profile-overlay" id="profile-overlay"></div>'
    ].join('');
  }

  function open() {
    if (document.getElementById('profile-drawer')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = buildProfileHTML();
    document.body.appendChild(wrap);

    requestAnimationFrame(function () {
      document.getElementById('profile-drawer').classList.add('show');
      document.getElementById('profile-overlay').classList.add('show');
    });

    document.getElementById('pd-close').addEventListener('click', close);
    document.getElementById('profile-overlay').addEventListener('click', close);

    document.getElementById('ref-link-copy').addEventListener('click', function () {
      var input = document.getElementById('ref-link-input');
      input.select(); input.setSelectionRange(0, 99999);
      try { navigator.clipboard.writeText(input.value); window.APlusZ.referral.showToast(tt('profile.link_copied')); }
      catch (e) { document.execCommand('copy'); }
    });

    document.getElementById('pd-share').addEventListener('click', function () {
      if (window.APlusZ.referral) window.APlusZ.referral.share();
    });

    if (window.APlusZ.alerts && window.APlusZ.alerts.mount) window.APlusZ.alerts.mount();

    wirePlanCards();

    loadCap().then(function (cap) {
      var fill = document.getElementById('adopt-fill');
      var pctEl = document.getElementById('adopt-pct');
      if (!fill || !pctEl) return;
      var earned = (cap && typeof cap.subscription_revenue === 'number') ? cap.subscription_revenue : 0;
      var pct = Math.min(100, Math.round((earned / REVENUE_CAP_EUR) * 100));
      fill.style.width = pct + '%';
      pctEl.textContent = pct + '%';
    });
  }

  function close() {
    var d = document.getElementById('profile-drawer');
    var o = document.getElementById('profile-overlay');
    if (d) d.classList.remove('show');
    if (o) o.classList.remove('show');
    setTimeout(function () {
      if (d && d.parentNode) d.parentNode.removeChild(d);
      if (o && o.parentNode) o.parentNode.removeChild(o);
    }, 300);
  }

  document.addEventListener('aplusz:tier', function () {
    var curBox = document.querySelector('.pd-plans-current');
    if (curBox) curBox.innerHTML = currentPlanHTML();
    var upBox = document.querySelector('.pd-plans-others');
    if (upBox) upBox.innerHTML = otherPlansHTML();
    if (curBox || upBox) wirePlanCards();
  });

  // Language switched: if the drawer is open, rebuild it in the new language.
  document.addEventListener('aplusz:lang', function () {
    var existing = document.getElementById('profile-drawer');
    if (!existing) return;                 // not open -> nothing to do
    var wrap = existing.parentNode;
    var overlay = document.getElementById('profile-overlay');
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    else { if (existing.parentNode) existing.parentNode.removeChild(existing);
           if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    open();                                // rebuild fresh with current language
  });

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.profile = { open: open, close: close };

})();
