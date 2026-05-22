/* ============================================================
   AplusZ — Profile UI: Streak / Referrals / Tier / Plan / Adoption Bar
   File: frontend/assets/profile.js
   Save: D:\Destop\AplusZ\frontend\assets\profile.js
   ============================================================ */

(function () {
  'use strict';

  var REVENUE_CAP_EUR = 62000;

  /* Tier reward labels (shown as "next unlock") */
  var TIER_REWARD = {
    Silver:  'More saved routes + weekly trends',
    Gold:    'Free Pro for 1 month',
    Diamond: 'Lifetime Pro+'
  };

  /* Paid plan (from billing.js) → label + icon. Separate from referral tier. */
  function planInfo() {
    var p = 'free';
    try { if (window.APlusZ.billing && window.APlusZ.billing.tier) p = window.APlusZ.billing.tier(); } catch (e) {}
    if (p === 'proplus') return { label: 'Pro+', icon: '\uD83D\uDC8E' };   /* 💎 */
    if (p === 'pro')     return { label: 'Pro',  icon: '\u2B50' };          /* ⭐ */
    return { label: 'Free', icon: '\u2708\uFE0F' };                         /* ✈️ */
  }

  function loadCap() {
    return fetch('data/cap.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function buildProfileHTML() {
    var ref = window.APlusZ.referral;
    var streak = ref ? ref.getStreak() : 0;
    var bounty = ref ? ref.getBounty() : 0;
    var tier   = ref ? ref.getTier() : { name: 'Bronze', icon: '\uD83E\uDD49' };
    var next   = ref ? ref.getNextTier() : null;
    var url    = ref ? ref.getRefUrl() : '';
    var plan   = planInfo();

    var nextLine = '';
    if (next) {
      var remaining = next.min - bounty;
      nextLine =
        '<div class="tier-next">' +
        '  <div class="tier-next-label">' + remaining + ' more referral' + (remaining === 1 ? '' : 's') +
             ' to ' + next.icon + ' ' + next.name + '</div>' +
        '  <div class="tier-next-reward">Unlocks: ' + (TIER_REWARD[next.name] || '') + '</div>' +
        '</div>';
    } else {
      nextLine = '<div class="tier-next"><div class="tier-next-label">\uD83D\uDC8E Diamond — top tier reached</div>' +
                 '<div class="tier-next-reward">Lifetime Pro+ unlocked</div></div>';
    }

    return [
      '<div class="profile-drawer" id="profile-drawer">',
      '  <div class="pd-header">',
      '    <div class="pd-title">Your Profile</div>',
      '    <button class="pd-close" id="pd-close" aria-label="Close">\u00d7</button>',
      '  </div>',

      '  <div class="pd-stats">',
      '    <div class="stat" title="Open or share AplusZ daily to keep your streak alive.">',
      '      <div class="stat-icon">\uD83D\uDD25</div>',
      '      <div class="stat-value">' + streak + '</div>',
      '      <div class="stat-label">Day streak</div>',
      '    </div>',
      '    <div class="stat" title="People who installed AplusZ from your share link.">',
      '      <div class="stat-icon">\uD83C\uDFAF</div>',
      '      <div class="stat-value">' + bounty + '</div>',
      '      <div class="stat-label">Referrals</div>',
      '    </div>',
      '    <div class="stat" title="Your status. Refer friends to climb: Bronze to Silver to Gold to Diamond.">',
      '      <div class="stat-icon">' + tier.icon + '</div>',
      '      <div class="stat-value stat-tier">' + tier.name + '</div>',
      '      <div class="stat-label">Tier</div>',
      '    </div>',
      '    <div class="stat" title="Your paid plan. Pro and Pro+ unlock more alerts and route sets.">',
      '      <div class="stat-icon">' + plan.icon + '</div>',
      '      <div class="stat-value stat-plan">' + plan.label + '</div>',
      '      <div class="stat-label">Plan</div>',
      '    </div>',
      '  </div>',

      nextLine,

      '  <div id="pd-alerts-anchor"></div>',

      '  <div class="pd-section">',
      '    <div class="pd-label">Your referral link</div>',
      '    <div class="ref-link-row">',
      '      <input class="ref-link-input" id="ref-link-input" value="' + url + '" readonly>',
      '      <button class="ref-link-copy" id="ref-link-copy">Copy</button>',
      '    </div>',
      '    <button class="primary-btn pd-share" id="pd-share">\u2197 Share AplusZ</button>',
      '  </div>',

      '  <div class="pd-section">',
      '    <div class="pd-label">Progress to free-for-all \uD83C\uDFC6</div>',
      '    <div class="adopt-bar" id="adopt-bar">',
      '      <div class="adopt-fill" id="adopt-fill" style="width:0%">',
      '        <div class="adopt-shimmer"></div>',
      '      </div>',
      '      <div class="adopt-pct" id="adopt-pct">0%</div>',
      '    </div>',
      '    <div class="adopt-help">When this hits 100%, every paid plan becomes free until January 1 of next year. So share more!</div>',
      '  </div>',

      '  <div class="pd-section">',
      '    <div class="pd-label">Streak milestones</div>',
      '    <div class="milestones">',
      '      <div class="milestone ' + (streak >= 7  ? 'unlocked' : '') + '"><span>D7</span><small>+1 route</small></div>',
      '      <div class="milestone ' + (streak >= 14 ? 'unlocked' : '') + '"><span>D14</span><small>+1 route set</small></div>',
      '      <div class="milestone ' + (streak >= 30 ? 'unlocked' : '') + '"><span>D30</span><small>Lifetime Pro+</small></div>',
      '    </div>',
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
      input.select();
      input.setSelectionRange(0, 99999);
      try {
        navigator.clipboard.writeText(input.value);
        window.APlusZ.referral.showToast('Link copied');
      } catch (e) { document.execCommand('copy'); }
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

  /* live-update the Plan badge if tier changes while drawer is open */
  document.addEventListener('aplusz:tier', function () {
    var el = document.querySelector('.stat-plan');
    if (!el) return;
    var p = planInfo();
    el.textContent = p.label;
    var icon = el.parentNode.querySelector('.stat-icon');
    if (icon) icon.textContent = p.icon;
  });

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.profile = { open: open, close: close };

})();
