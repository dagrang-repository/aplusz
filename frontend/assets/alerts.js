/* ============================================================
   APlusZ — Mailto Alerts (Step 19) · Pure mailto, zero infra
   File: frontend/assets/alerts.js
   Save: D:\Destop\AplusZ\frontend\assets\alerts.js

   Self-reminders sent via the user's OWN mail app (mailto:).
   No server, no Resend, no cost. Limits enforced locally:
     Free 1/week · Pro 3/day · Pro+ unlimited (optional self-cap)
     Cap-on (€62k) → unlimited for everyone.
   Email body carries an affiliate "Book it now" link + a "Rescan" link.
   ============================================================ */

(function () {
  'use strict';

  var APZ = window.APlusZ = window.APlusZ || {};
  var APP_URL = (APZ.config && APZ.config.appUrl) || 'https://aplusz.app';

  var LS_LIST = 'aplusz-alerts';     // [{o,d,price,book,dep,savedAt}]
  var LS_LOG = 'aplusz-alert-log';   // [timestamps]
  var LS_CAP = 'aplusz-alert-cap';   // Pro+ self-set per-day cap ('' = unlimited)
  var LS_EMAIL = 'aplusz-email';     // set by billing.js at paid signup

  var DAY = 86400000, WEEK = 7 * DAY;

  /* ---------- i18n with English fallback ---------- */
  var EN = {
    'alerts.remind': 'Remind me',
    'alerts.title': 'My alerts',
    'alerts.empty': 'No alerts yet. Tap "Remind me" on a result to add one.',
    'alerts.resend': 'Re-send',
    'alerts.remove': 'Remove',
    'alerts.limit': 'Reminder limit reached for your plan — upgrade for more.',
    'alerts.sent': 'Reminder ready in your mail app.',
    'alerts.cap_label': 'Max reminders per day (blank = unlimited)',
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

  /* ---------- tier + limits ---------- */
  function tier() {
    return (APZ.billing && APZ.billing.tier) ? APZ.billing.tier() : 'free';
  }
  function capOn() {
    return !!(APZ.billing && APZ.billing.isCapOn && APZ.billing.isCapOn());
  }
  /* returns { unlimited, max, win } */
  function limit() {
    if (capOn()) return { unlimited: true };
    var tr = tier();
    if (tr === 'proplus') {
      var c = parseInt(rawGet(LS_CAP), 10);
      return (c > 0) ? { unlimited: false, max: c, win: DAY } : { unlimited: true };
    }
    if (tr === 'pro') return { unlimited: false, max: 3, win: DAY };
    return { unlimited: false, max: 1, win: WEEK }; // free
  }
  function usedWithin(win) {
    var now = Date.now();
    return get(LS_LOG, []).filter(function (ts) { return now - ts < win; }).length;
  }
  function canSend() {
    var l = limit();
    if (l.unlimited) return true;
    return usedWithin(l.win) < l.max;
  }
  function record() {
    var now = Date.now();
    var log = get(LS_LOG, []).filter(function (ts) { return now - ts < WEEK; });
    log.push(now);
    set(LS_LOG, log);
  }

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

  function toast(msg) {
    if (APZ.referral && APZ.referral.showToast) { APZ.referral.showToast(msg); return; }
    var el = document.createElement('div');
    el.className = 'azb-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 400); }, 3000);
  }

  /* ---------- public: add reminder from a result card ---------- */
  function remind(d) {
    if (!d || !d.origin) return;
    var item = {
      o: d.origin, d: d.destination,
      price: d.priceFormatted || d.price || '',
      book: (function () {
        try { return bookLink(d.origin, d.destination, d.bestDeparture); } catch (e) { return ''; }
      })(),
      dep: d.bestDeparture || '',
      savedAt: Date.now()
    };
    // save/dedupe into the list (max 12)
    var list = get(LS_LIST, []).filter(function (r) { return (r.o + r.d) !== (item.o + item.d); });
    list.unshift(item);
    set(LS_LIST, list.slice(0, 12));

    if (!canSend()) { toast(t('alerts.limit')); refresh(); return; }
    openMail(item);
    record();
    toast(t('alerts.sent'));
    refresh();
  }

  function resend(i) {
    var list = get(LS_LIST, []);
    if (!list[i]) return;
    if (!canSend()) { toast(t('alerts.limit')); return; }
    openMail(list[i]);
    record();
    toast(t('alerts.sent'));
  }
  function remove(i) {
    var list = get(LS_LIST, []);
    list.splice(i, 1);
    set(LS_LIST, list);
    refresh();
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

    var capField = '';
    if (tier() === 'proplus' && !capOn()) {
      capField =
        '<div class="al-cap">' +
        '<label class="al-cap-label">' + t('alerts.cap_label') + '</label>' +
        '<input class="al-cap-input" id="al-cap-input" type="number" min="1" inputmode="numeric" value="' +
        rawGet(LS_CAP) + '">' +
        '</div>';
    }

    return '<div class="pd-section" id="pd-alerts">' +
      '<div class="pd-label">\uD83D\uDD14 ' + t('alerts.title') + '</div>' +
      '<div class="al-list">' + rows + '</div>' +
      capField +
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
    var cap = document.getElementById('al-cap-input');
    if (cap) cap.addEventListener('change', function () {
      var v = parseInt(cap.value, 10);
      if (v > 0) { try { localStorage.setItem(LS_CAP, String(v)); } catch (e) {} }
      else { try { localStorage.removeItem(LS_CAP); } catch (e) {} }
    });
  }

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

  APZ.alerts = { remind: remind, resend: resend, remove: remove, mount: mount, canSend: canSend, tier: tier };

})();
