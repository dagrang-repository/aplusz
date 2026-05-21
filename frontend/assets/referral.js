/* ============================================================
   AplusZ — Referral System (Step 16 + tier system)
   File: frontend/assets/referral.js
   Save: D:\Destop\AplusZ\frontend\assets\referral.js
   ============================================================ */

(function () {
  'use strict';

  var KEY_CODE        = 'aplusz-ref-code';
  var KEY_REFERRED_BY = 'aplusz-referred-by';
  var KEY_STREAK      = 'aplusz-streak';
  var KEY_LAST_SHARE  = 'aplusz-last-share';
  var KEY_BOUNTY      = 'aplusz-bounty';

  /* ---------- Tier thresholds (by referrals) ---------- */
  var TIERS = [
    { name: 'Bronze',  icon: '🥉', min: 0  },
    { name: 'Silver',  icon: '🥈', min: 5  },
    { name: 'Gold',    icon: '🥇', min: 15 },
    { name: 'Diamond', icon: '💎', min: 30 }
  ];

  function getOwnCode() {
    try {
      var existing = localStorage.getItem(KEY_CODE);
      if (existing) return existing;
      var code = (Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 4)).toUpperCase();
      localStorage.setItem(KEY_CODE, code);
      return code;
    } catch (e) { return 'GUEST'; }
  }

  function captureInbound() {
    try {
      var params = new URLSearchParams(window.location.search);
      var inbound = params.get('ref');
      if (!inbound) return;
      var mine = getOwnCode();
      if (inbound === mine) return;
      if (localStorage.getItem(KEY_REFERRED_BY)) return;
      localStorage.setItem(KEY_REFERRED_BY, inbound);
      params.delete('ref');
      var clean = window.location.pathname + (params.toString() ? '?' + params : '') + window.location.hash;
      history.replaceState({}, '', clean);
    } catch (e) {}
  }

  function getBounty() {
    try { return parseInt(localStorage.getItem(KEY_BOUNTY) || '0', 10); }
    catch (e) { return 0; }
  }

  /* ---------- Current tier from referral count ---------- */
  function getTier() {
    var b = getBounty();
    var cur = TIERS[0];
    for (var i = 0; i < TIERS.length; i++) {
      if (b >= TIERS[i].min) cur = TIERS[i];
    }
    return cur;
  }
  function getNextTier() {
    var b = getBounty();
    for (var i = 0; i < TIERS.length; i++) {
      if (b < TIERS[i].min) return TIERS[i];
    }
    return null; // already Diamond
  }

  function getStreak() {
    try { return parseInt(localStorage.getItem(KEY_STREAK) || '0', 10); }
    catch (e) { return 0; }
  }

  function updateStreak() {
    try {
      var today = new Date().toISOString().slice(0, 10);
      var last  = localStorage.getItem(KEY_LAST_SHARE);
      var streak = getStreak();
      if (last === today) return streak;
      var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      streak = (last === yesterday) ? streak + 1 : 1;
      localStorage.setItem(KEY_STREAK, String(streak));
      localStorage.setItem(KEY_LAST_SHARE, today);
      return streak;
    } catch (e) { return 0; }
  }

  function getRefUrl() {
    return 'https://aplusz.app/?ref=' + getOwnCode();
  }

  function share() {
    var url = getRefUrl();
    var text = 'I just found the cheapest day of the year to book any flight with AplusZ — and it\'s free. ✈️';
    var payload = { title: 'AplusZ — Fly for LESS', text: text, url: url };

    var done = function () {
      updateStreak();
      window.dispatchEvent(new CustomEvent('aplusz:shared', { detail: { url: url } }));
    };

    if (navigator.share) {
      navigator.share(payload).then(done).catch(function () {});
      return;
    }
    try {
      navigator.clipboard.writeText(text + ' ' + url).then(function () {
        showToast('Link copied — paste and share');
        done();
      });
    } catch (e) {
      showToast(url);
    }
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.className = 'aplusz-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 2400);
  }

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.referral = {
    getOwnCode:  getOwnCode,
    getRefUrl:   getRefUrl,
    share:       share,
    getStreak:   getStreak,
    getBounty:   getBounty,
    getTier:     getTier,
    getNextTier: getNextTier,
    tiers:       TIERS,
    showToast:   showToast
  };

  captureInbound();
  getOwnCode();

})();
