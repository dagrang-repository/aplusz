/* ============================================================
   AplusZ — Profile UI: Plan status / Karma / Referral / Alerts / Streak
   File: frontend/assets/profile.js
   Save: D:\Destop\AplusZ\frontend\assets\profile.js
   ============================================================ */

(function () {
  'use strict';

  var REVENUE_CAP_EUR = 62000;

  /* ---- plan copy (Bronze = free, Pro, Pro+) ---- */
  var PLANS = [
    { id: 'free',    name: 'Bronze', tag: 'Free',
      feats: 'Unlimited searches \u00b7 exact best date + price \u00b7 1 saved route \u00b7 works offline' },
    { id: 'pro',     name: 'Pro', tag: '',
      feats: 'Everything in Bronze \u00b7 3 alerts/day \u00b7 2 custom route sets \u00b7 priority data refresh' },
    { id: 'proplus', name: 'Pro+', tag: '',
      feats: 'Everything in Pro \u00b7 5 alerts/day or custom \u00b7 unlimited route sets \u00b7 early access' }
  ];

  function currentPlan() {
    var p = 'free';
    try { if (window.APlusZ.billing && window.APlusZ.billing.tier) p = window.APlusZ.billing.tier(); } catch (e) {}
    return p;
  }

  function loadCap() {
    return fetch('data/cap.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function planCardsHTML() {
    var cur = currentPlan();
    return PLANS.map(function (pl) {
      var active = (pl.id === cur);
      return '' +
        '<div class="plan-card' + (active ? ' active' : '') + '">' +
          '<div class="plan-card-top">' +
            '<span class="plan-card-name">' + pl.name +
              (pl.tag ? ' <span class="plan-card-tag">' + pl.tag + '</span>' : '') + '</span>' +
            (active ? '<span class="plan-card-badge">Your plan</span>' : '') +
          '</div>' +
          '<div class="plan-card-feats">' + pl.feats + '</div>' +
        '</div>';
    }).join('');
  }

  function buildProfileHTML() {
    var ref    = window.APlusZ.referral;
    var streak = ref ? ref.getStreak() : 0;
    var karma  = ref ? ref.getBounty() : 0;
    var url    = ref ? ref.getRefUrl() : '';

    return [
      '<div class="profile-drawer" id="profile-drawer">',
      '  <div class="pd-header">',
      '    <div class="pd-title">Your Profile</div>',
      '    <button class="pd-close" id="pd-close" aria-label="Close">\u00d7</button>',
      '  </div>',

      '  <div class="pd-plans">' + planCardsHTML() + '</div>',

      '  <div class="pd-karma">',
      '    <div class="pd-karma-top">',
      '      <span class="pd-karma-label">Karma points</span>',
      '      <span class="pd-karma-value">' + karma + '</span>',
      '    </div>',
      '    <div class="pd-karma-msg">The more you share AplusZ, the faster the whole site — including Pro and Pro+ — becomes free for everyone.</div>',
      '    <div class="pd-bar-label"><span>Progress to free-for-all</span><span id="adopt-pct">0%</span></div>',
      '    <div class="adopt-bar" id="adopt-bar"><div class="adopt-fill" id="adopt-fill" style="width:0%"><div class="adopt-shimmer"></div></div></div>',
      '    <div class="pd-karma-reward">When this hits 100%, every paid plan becomes free for everyone until January 1. So share more!</div>',
      '  </div>',

      '  <div class="pd-section">',
      '    <div class="pd-label">Your referral link</div>',
      '    <div class="ref-link-row">',
      '      <input class="ref-link-input" id="ref-link-input" value="' + url + '" readonly>',
      '      <button class="ref-link-copy" id="ref-link-copy">Copy</button>',
      '    </div>',
      '    <button class="pd-share-btn" id="pd-share">\u2197 Share AplusZ</button>',
      '  </div>',

      '  <div class="pd-section">',
      '    <div class="pd-label">Price alerts</div>',
      '    <div class="pd-alerts-intro">Get notified when your route hits an all-time low.</div>',
      '    <div id="pd-alerts-anchor"></div>',
      '  </div>',

      '  <div class="pd-streak">',
      '    <span class="pd-streak-icon">\uD83D\uDD25</span>',
      '    <span class="pd-streak-value">' + streak + '</span>',
      '    <span class="pd-streak-label">Day streak — open or share AplusZ daily to keep it alive.</span>',
      '  </div>',

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
      try { navigator.clipboard.writeText(input.value); window.APlusZ.referral.showToast('Link copied'); }
      catch (e) { document.execCommand('copy'); }
    });

    document.getElementById('pd-share').addEventListener('click', function () {
      if (window.APlusZ.referral) window.APlusZ.referral.share();
    });

    if (window.APlusZ.alerts && window.APlusZ.alerts.mount) window.APlusZ.alerts.mount();

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

  /* live-refresh the active plan card if tier changes while open */
  document.addEventListener('aplusz:tier', function () {
    var box = document.querySelector('.pd-plans');
    if (box) box.innerHTML = planCardsHTML();
  });

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.profile = { open: open, close: close };

})();
