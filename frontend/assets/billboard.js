/* ============================================================
   APlusZ — Front-index Billboard (rotating slides)
   File: frontend/assets/billboard.js
   Save: D:\Destop\AplusZ\frontend\assets\billboard.js

   Fills the gap above the plans strip. Mixed slides:
     • STAT slide  — no link, informational, 10s   (LIVE now)
     • Affiliate slides — clickable, 6s each, but each is auto-HIDDEN
       until its real ID is set in config.billboard (no bare links ever).
   i18n: reads billboard.* keys with English fallback so it never
   shows raw keys; re-renders on language change.
   ============================================================ */
(function () {
  'use strict';
  var APZ = window.APlusZ = window.APlusZ || {};

  var EN = {
    'billboard.stat': 'This app scans up to 50,000 possible lowest prices across 2,000 airports and finds the lowest possible fare on the best date to book within the next 6 months.',
    'billboard.insurance': 'Looking for trusted travel assurance, we have a good link for that.',
    'billboard.hosting': 'A partner web hosting service, if you are interested.',
    'billboard.webdesign': 'If you need a powerful website, we have the perfect solution for you, at a huge discount at the moment. Follow this link!'
  };
  function t(k) {
    var v = (APZ.i18n && APZ.i18n.t) ? APZ.i18n.t(k) : k;
    return (v && v !== k) ? v : (EN[k] != null ? EN[k] : k);
  }

  /* a link is "real" only if it's set and carries no placeholder token */
  function realLink(u) {
    return !!u && u.indexOf('YOUR_') === -1 && u.indexOf('placeholder') === -1;
  }

  /* slide set — stat is always live; affiliates appear only when their
     config.billboard.<key> holds a real ID. */
  function slides() {
    var bb = (APZ.config && APZ.config.billboard) || {};
    var all = [
      { key: 'billboard.stat',      url: null,          ms: 10000 },               // no link, 10s
      { key: 'billboard.insurance', url: bb.insurance,  ms: 6000 },
      { key: 'billboard.hosting',   url: bb.hosting,    ms: 6000 },
      { key: 'billboard.webdesign', url: bb.webdesign,  ms: 6000 }
    ];
    return all.filter(function (s) { return s.url === null || realLink(s.url); });
  }

  var host, idx = 0, timer = null;

  function paint() {
    var list = slides();
    if (!host || !list.length) return;
    if (idx >= list.length) idx = 0;
    var s = list[idx];
    var text = t(s.key);
    if (s.url) {
      var _isInt = s.url.charAt(0) === "/";
      var _tgt = _isInt ? '' : ' target="_blank" rel="noopener nofollow sponsored"';
      host.innerHTML = '<a class="bb-slide bb-link" href="' + s.url + '"' + _tgt + '>' + text + '</a>';
    } else {
      host.innerHTML = '<span class="bb-slide">' + text + '</span>';
    }
    // schedule next only when more than one slide is live
    if (timer) { clearTimeout(timer); timer = null; }
    if (list.length > 1) {
      timer = setTimeout(function () { idx = (idx + 1) % list.length; paint(); }, s.ms);
    }
  }

  function mount() {
    host = document.getElementById('billboard');
    if (!host) return;
    paint();
  }

  /* re-render text on language change (keeps current slide index) */
  document.addEventListener('aplusz:lang', function () { if (host) paint(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

})();