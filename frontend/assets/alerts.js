/* ============================================================
   APlusZ — Mailto Alerts (Step 19) · Pure mailto, zero infra
   File: frontend/assets/alerts.js
   Save: D:\Destop\AplusZ\frontend\assets\alerts.js

   Self-reminders sent via the user's OWN mail app (mailto:).
   No server, no Resend, no cost. REMINDERS ARE UNLIMITED (all tiers).
   The ONLY gate is how many saved routes you may keep + how many
   removes/swaps you may do:
     Free  : 1 route, 0 removes  (remove/swap -> upgrade banner)
     Pro   : 3 routes, 3 removes (4th remove -> upgrade banner)
     Pro+  : unlimited routes + unlimited removes.
     Cap-on (€62k) -> everyone gets Pro+ behaviour.
   Email body carries an affiliate "Book it now" link + a "Rescan" link.
   ============================================================ */

(function () {
  'use strict';

  var APZ = window.APlusZ = window.APlusZ || {};
  var APP_URL = (APZ.config && APZ.config.appUrl) || 'https://aplusz.app';

  var LS_LIST = 'aplusz-alerts';     // [{o,d,price,book,dep,savedAt}]
  var LS_REMOVES = 'aplusz-removes'; // count of removes/swaps used (gate)
  var LS_EMAIL = 'aplusz-email';     // set by billing.js at paid signup

  /* ---------- i18n with English fallback ---------- */
  var EN = {
    'alerts.remind': 'Remind me',
    'alerts.save': 'Save this route',
    'alerts.saved': 'Saved',
    'alerts.saved_profile': 'Saved to your Profile',
    'alerts.title': 'My alerts',
    'alerts.empty': 'No alerts yet. Tap "Remind me" on a result to add one.',
    'alerts.resend': 'Re-send',
    'alerts.remove': 'Remove',
    'alerts.sent': 'Reminder ready in your mail app.',
    'alerts.limit_free': 'Free keeps 1 saved route, locked. Upgrade to Pro to swap routes (3 changes) or Pro+ for unlimited.',
    'alerts.limit_pro': 'Pro allows 3 route changes — you have used them all. Upgrade to Pro+ for unlimited routes and swaps.',
    'alerts.tier_free': 'Free',
    'alerts.tier_pro': 'Pro',
    'alerts.tier_proplus': 'Pro+',
    'alerts.upgrade_btn': 'Upgrade',
    'alerts.book': 'Book it now',
    'alerts.rescan': 'Rescan latest price',
    'alerts.mail_subject': '✈️ Price watch: {route}',
    'alerts.mail_intro': 'Your A+Z.app price watch:',
    'alerts.mail_price': 'Lowest seen',
    'alerts.mail_outro': '— A+Z.app · fly for LESS'
  };
  function t(key, vars) {
    var s = (APZ.i18n && APZ.i18n.t) ? APZ.i18n.t(key) : key;
    if (s === key && EN[key]) s = EN[key];
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  /* ---------- storage helpers ---------- */
  function get(key, def) { try { return JSON.parse(localStorage.getItem(key)) || def; } catch (e) { return def; } }
  function set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function rawGet(key) { try { return localStorage.getItem(key) || ''; } catch (e) { return ''; } }

  /* ---------- tier + ROUTE/REMOVE gate ---------- */
  function tier() {
    return (APZ.billing && APZ.billing.tier) ? APZ.billing.tier() : 'free';
  }
  function capOn() {
    return !!(APZ.billing && APZ.billing.isCapOn && APZ.billing.isCapOn());
  }
  /* how many saved routes this tier may keep */
  function routeCap() {
    if (capOn()) return Infinity;
    var tr = tier();
    if (tr === 'proplus') return Infinity;
    if (tr === 'pro') return 3;
    return 1; // free
  }
  /* how many removes/swaps this tier is allowed in total */
  function removeCap() {
    if (capOn()) return Infinity;
    var tr = tier();
    if (tr === 'proplus') return Infinity;
    if (tr === 'pro') return 3;
    return 0; // free: route is locked
  }
  function removesUsed() { var n = parseInt(rawGet(LS_REMOVES), 10); return isNaN(n) ? 0 : n; }
  function canRemove() { return removesUsed() < removeCap(); }
  function recordRemove() {
    if (removeCap() === Infinity) return;
    set(LS_REMOVES, removesUsed() + 1);
  }
  /* reminders are ALWAYS allowed now */
  function canSend() { return true; }

  /* ---------- affiliate "Book" link (mirrors result.js) ---------- */
  function bookLink(o, d, dep) {
    var c = (APZ.config && APZ.config.affiliates) || {};
    var url = 'https://www.kiwi.com/deep?from=' + encodeURIComponent(o) + '&to=' + encodeURIComponent(d);
    if (dep) url += '&departure=' + dep;
    url += '&affilid=' + (c.kiwi || 'placeholder');
    return url;
  }
  function rescanLink(o, d) {
    return APP_URL + '/?o=' + encodeURIComponent(o) + '&d=' + encodeURIComponent(d);
  }

  /* ---------- build + open the mailto ---------- */
  function openMail(item) {
    var route = item.o + ' \u2192 ' + item.d;
    var book = item.book || bookLink(item.o, item.d, item.dep);
    var rescan = rescanLink(item.o, item.d);
    var to = rawGet(LS_EMAIL); // paid users prefilled; free users blank

    var subject = t('alerts.mail_subject', { route: route });
    var body =
      t('alerts.mail_intro') + '\n\n' +
      route + '\n' +
      t('alerts.mail_price') + ': ' + (item.price || '') + '\n\n' +
      t('alerts.book') + ': ' + book + '\n' +
      t('alerts.rescan') + ': ' + rescan + '\n\n' +
      t('alerts.mail_outro');

    var href = 'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    window.location.href = href;
  }

  function limitBanner() {
    var old = document.querySelector('.azb-limit'); if (old) old.remove();
    var tr = tier();
    var msg = (tr === 'pro') ? t('alerts.limit_pro') : t('alerts.limit_free');
    var nextTier = (tr === 'pro') ? 'proplus' : 'pro';
    var el = document.createElement('div');
    el.className = 'azb-limit';
    el.innerHTML =
      '<span class="azb-limit-msg">' + msg + '</span>' +
      '<button class="azb-limit-up" type="button">' +
        (function(){ var u=t('billing.free_upgrade'); return (u==='billing.free_upgrade')?t('alerts.upgrade_btn'):u; })() +
      '</button>' +
      '<button class="azb-limit-x" type="button" aria-label="close">\u00d7</button>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    el.querySelector('.azb-limit-up').onclick = function () {
      if (window.APlusZ && APlusZ.billing) APlusZ.billing.buy(nextTier);
      el.remove();
    };
    el.querySelector('.azb-limit-x').onclick = function () { el.remove(); };
  }

  function toast(msg) {
    if (APZ.referral && APZ.referral.showToast) { APZ.referral.showToast(msg); return; }
    var el = document.createElement('div');
    el.className = 'azb-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 400); }, 3000);
  }

  /* ---------- build a saveable/remindable item from a result card ---------- */
  function mkItem(d) {
    return {
      o: d.origin, d: d.destination,
      price: d.priceFormatted || d.price || '',
      book: d.book || (function () {
        try { return bookLink(d.origin, d.destination, d.bestDeparture); } catch (e) { return ''; }
      })(),
      dep: d.bestDeparture || '',
      savedAt: Date.now()
    };
  }

  /* ---------- public: SAVE this route (independent of reminding) ----------
     Adds to the saved list shown in the Profile drawer. Cap-gated:
     Free 1, Pro 3, Pro+ ∞. Returns true if saved, false if blocked.
     On success, fires a toast that POINTS TO the Profile (tap to open). */
  function save(d) {
    if (!d || !d.origin) return false;
    var item = mkItem(d);
    var list = get(LS_LIST, []);
    var already = list.some(function (r) { return (r.o + r.d) === (item.o + item.d); });
    if (already) { toastProfile(); return true; } // already saved -> still confirm + point
    var cap = routeCap();
    if (cap !== Infinity && list.length >= cap) { limitBanner(); return false; } // at cap -> upsell, don't silently drop
    list.unshift(item);
    set(LS_LIST, list);
    toastProfile();
    refresh();
    return true;
  }

  /* tappable toast: "✓ Saved to your Profile" -> opens the profile drawer */
  function toastProfile() {
    var old = document.querySelector('.azb-toast.azb-tap'); if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'azb-toast azb-tap';
    el.innerHTML = '\u2713 ' + t('alerts.saved_profile') + ' \u2192';
    el.setAttribute('role', 'button');
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    el.onclick = function () {
      var m = document.getElementById('menu-btn');
      if (m) m.click();
      else if (window.APlusZ.profile && APlusZ.profile.open) APlusZ.profile.open();
      el.classList.remove('show'); setTimeout(function () { el.remove(); }, 400);
    };
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 400); }, 5000);
  }

  /* ---------- public: REMIND me (mail only; does NOT save) ---------- */
  function remind(d) {
    if (!d || !d.origin) return;
    openMail(mkItem(d));
    toast(t('alerts.sent'));
  }

  function resend(i) {
    var list = get(LS_LIST, []);
    if (!list[i]) return;
    openMail(list[i]);
    toast(t('alerts.sent'));
  }
  function remove(i) {
    var list = get(LS_LIST, []);
    if (!list[i]) return;
    if (!canRemove()) { limitBanner(); return; }
    list.splice(i, 1);
    set(LS_LIST, list);
    recordRemove();
    refresh();
    updateBadge();
  }

  /* ---------- "My alerts" section inside the profile drawer ---------- */
  function sectionHTML() {
    var list = get(LS_LIST, []);
    var rows = list.length
      ? list.map(function (r, i) {
          return '<div class="al-item">' +
            '<div class="al-route"><b>' + r.o + '</b> \u2192 <b>' + r.d + '</b>' +
            (r.price ? '<span class="al-price">' + r.price + '</span>' : '') + '</div>' +
            '<div class="al-actions">' +
            '<button class="al-resend" data-i="' + i + '">\u2192 ' + t('alerts.resend') + '</button>' +
            '<button class="al-remove" data-i="' + i + '" aria-label="' + t('alerts.remove') + '">\u00d7</button>' +
            '</div></div>';
        }).join('')
      : '<div class="al-empty">' + t('alerts.empty') + '</div>';

    return '<div class="pd-section" id="pd-alerts">' +
      '<div class="pd-label">\uD83D\uDD14 ' + t('alerts.title') + '</div>' +
      '<div class="al-list">' + rows + '</div>' +
      '</div>';
  }

  function wire() {
    var root = document.getElementById('pd-alerts');
    if (!root) return;
    root.querySelectorAll('.al-resend').forEach(function (b) {
      b.addEventListener('click', function () { resend(+b.dataset.i); });
    });
    root.querySelectorAll('.al-remove').forEach(function (b) {
      b.addEventListener('click', function () { remove(+b.dataset.i); });
    });
  }


  /* ---------- TIER BADGE (left of theme toggle, opens the menu) ---------- */
  var TIER_ICON = { free: '\uD83C\uDD93', pro: '\u2B50', proplus: '\uD83D\uDC51' }; // 🆓 ⭐ 👑
  function tierLabel(tr) {
    if (tr === 'proplus') return t('alerts.tier_proplus');
    if (tr === 'pro') return t('alerts.tier_pro');
    return t('alerts.tier_free');
  }
  function updateBadge() {
    var b = document.getElementById('tier-badge');
    if (!b) return;
    var tr = tier();
    var icon = TIER_ICON[tr] || TIER_ICON.free;
    var name = tierLabel(tr);
    // Pro+ crown glows (icon only); other tiers plain
    var iconHTML = (tr === 'proplus') ? '<span class="az-crown">' + icon + '</span>' : icon;
    // HARD RULE: icon + name always together, never one alone
    b.innerHTML = '<span class="tb-ic">' + iconHTML + '</span><span class="tb-nm">' + name + '</span>';
    b.setAttribute('aria-label', name);
    b.title = name;
  }
  function bindBadge(b) {
    b.onclick = function () {
      var m = document.getElementById('menu-btn');
      if (m) m.click();
      else if (window.APlusZ && APlusZ.profile && APlusZ.profile.open) APlusZ.profile.open();
    };
  }
  function ensureBadge() {
    var existing = document.getElementById('tier-badge');
    if (existing) { bindBadge(existing); updateBadge(); return; }   // static markup: bind + update
    var nav = document.querySelector('.topnav');
    var theme = document.getElementById('theme-toggle');
    if (!nav || !theme) return;
    var b = document.createElement('button');
    b.className = 'icon-btn tier-badge';
    b.id = 'tier-badge';
    b.type = 'button';
    nav.insertBefore(b, theme);          // sits to the LEFT of the theme icon
    bindBadge(b);
    updateBadge();
  }
  // reset the remove/swap counter whenever the tier changes (new plan period
  // grants its full quota again; prevents stale lifetime carry-over on
  // upgrade, downgrade, churn, or re-subscribe).
  document.addEventListener('aplusz:tier', function () {
    try { localStorage.removeItem(LS_REMOVES); } catch (e) {}
    updateBadge(); refresh();
  });

  /* called by profile.js after the drawer is built */
  function mount() {
    var anchor = document.getElementById('pd-alerts-anchor');
    if (!anchor) return;
    anchor.outerHTML = sectionHTML();
    wire();
  }
  function refresh() {
    var root = document.getElementById('pd-alerts');
    if (!root) return;
    root.outerHTML = sectionHTML();
    wire();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureBadge);
  } else { ensureBadge(); }

  APZ.alerts = { save: save, remind: remind, resend: resend, remove: remove, mount: mount, tier: tier, updateBadge: updateBadge };

})();
