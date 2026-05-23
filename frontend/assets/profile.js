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
      { id: 'free',
        name: '\uD83C\uDD93 ' + tt('plans.free_head'),
        feats: [tt('plans.f_unlimited'), tt('plans.f_exact'), tt('plans.f_saved1'),
                tt('plans.f_reminders'), tt('plans.f_offline')].join(' \u00b7 ') },
      { id: 'pro',
        name: '\u2B50 ' + tt('plans.pro_head'),
        feats: [tt('plans.p_everything_free'), tt('plans.p_routes3'),
                tt('plans.p_swaps3'), tt('plans.p_reminders')].join(' \u00b7 ') },
      { id: 'proplus',
        name: '<span class="az-crown">\uD83D\uDC51</span> ' + tt('plans.proplus_head'),
        feats: [tt('plans.pp_everything_pro'), tt('plans.pp_routes_unlim'),
                tt('plans.pp_swaps_unlim'), tt('plans.pp_reminders')].join(' \u00b7 ') }
    ];
  }

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

  var RANK = { free: 0, pro: 1, proplus: 2 };
  function planCardsHTML() {
    var cur = currentPlan();
    var curRank = RANK[cur] || 0;
    return plansData().map(function (pl) {
      var active = (pl.id === cur);
      var upgradable = (RANK[pl.id] > curRank);
      var attrs = 'class="plan-card' + (active ? ' active' : '') + (upgradable ? ' upgradable' : '') + '"';
      if (upgradable) {
        attrs += ' role="button" tabindex="0" data-buy="' + pl.id + '"';
      }
      return '' +
        '<div ' + attrs + '>' +
          '<div class="plan-card-top">' +
            '<span class="plan-card-name">' + pl.name + '</span>' +
            (active ? '<span class="plan-card-badge">' + tt('profile.your_plan') + '</span>' : '') +
          '</div>' +
          '<div class="plan-card-feats">' + pl.feats + '</div>' +
        '</div>';
    }).join('');
  }
  function wirePlanCards() {
    var cards = document.querySelectorAll('.pd-plans .plan-card.upgradable');
    cards.forEach(function (c) {
      var id = c.getAttribute('data-buy');
      var go = function () {
        if (!(window.APlusZ && APlusZ.billing)) return;
        close();                       // close drawer first so the billing modal isn't stacked behind it
        setTimeout(function () { APlusZ.billing.buy(id); }, 60);
      };
      c.addEventListener('click', go);
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });
  }

  function buildProfileHTML() {
    var ref    = window.APlusZ.referral;
    var streak = ref ? ref.getStreak() : 0;
    var karma  = ref ? ref.getBounty() : 0;
    var url    = ref ? ref.getRefUrl() : '';

    return [
      '<div class="profile-drawer" id="profile-drawer">',
      '  <div class="pd-header">',
      '    <div class="pd-title">' + tt('profile.title') + '</div>',
      '    <div class="pd-close-wrap"><button class="pd-close" id="pd-close" aria-label="' + tt('alerts.close') + '">\u00d7</button></div>',
      '  </div>',

      '  <div class="pd-plans">' + planCardsHTML() + '</div>',

      '  <div class="pd-section">',
      '    <div class="pd-label">' + tt('profile.saved_routes') + '</div>',
      '    <div class="pd-alerts-intro">' + tt('profile.saved_intro') + '</div>',
      '    <div id="pd-alerts-anchor"></div>',
      '  </div>',

      '  <div class="pd-karma">',
      '    <div class="adopt-bar" id="adopt-bar">',
      '      <div class="adopt-fill" id="adopt-fill" style="width:0%"><div class="adopt-shimmer"></div></div>',
      '      <div class="adopt-bar-text"><span>' + tt('profile.progress') + '</span><span id="adopt-pct">0%</span></div>',
      '    </div>',
      '    <div class="pd-karma-reward">' + tt('profile.reward') + '</div>',

      '    <div class="ref-link-row">',
      '      <input class="ref-link-input" id="ref-link-input" value="' + url + '" readonly>',
      '      <button class="ref-link-copy" id="ref-link-copy">' + tt('profile.copy') + '</button>',
      '    </div>',
      '    <button class="pd-share-btn" id="pd-share">\u2197 ' + tt('profile.share') + '</button>',

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
    var box = document.querySelector('.pd-plans');
    if (box) { box.innerHTML = planCardsHTML(); wirePlanCards(); }
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
