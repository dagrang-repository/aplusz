/* ============================================================
   APlusZ — App Logic (Step 8 + Step 9 wiring)
   File: frontend/assets/app.js
   Save: D:\Destop\AplusZ\frontend\assets\app.js
   ============================================================ */

(function () {
  'use strict';

  var THEME_CYCLE = ['dark-glass', 'light-expressive', 'sepia-reader', 'sepia-night'];

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Theme cycle button ---------- */
  document.getElementById('theme-toggle').addEventListener('click', function () {
    var current = window.APlusZ.detect.theme;
    var idx = THEME_CYCLE.indexOf(current);
    var next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    window.APlusZ.detect.setTheme(next);
  });

  /* ---------- Language button ---------- */
  document.getElementById('lang-btn').addEventListener('click', function () {
    var supported = window.APlusZ.i18n.supported;
    var current = window.APlusZ.detect.lang;
    var idx = supported.indexOf(current);
    var next = supported[(idx + 1) % supported.length];
    window.APlusZ.detect.setLang(next);
  });

  /* ---------- Swap origin/destination ---------- */
  document.getElementById('swap').addEventListener('click', function () {
    var o = document.getElementById('origin');
    var d = document.getElementById('destination');
    var tmp = o.value;
    o.value = d.value;
    d.value = tmp;
  });

  /* ---------- Search submit (demo payload until Step 14 wires real data) ---------- */
  document.getElementById('search-btn').addEventListener('click', function () {
    var origin = document.getElementById('origin').value.trim().toUpperCase();
    var dest = document.getElementById('destination').value.trim().toUpperCase();
    if (!origin || !dest) return;

    // Demo data — replaced by real JSON lookup in Step 14
    var today = new Date();
    var dep = new Date(today.getTime() + 75 * 86400000);
    var book = new Date(today.getTime() + 14 * 86400000);
    var iso = function (d) { return d.toISOString().split('T')[0]; };

    var demo = {
      origin: origin,
      destination: dest,
      bestDeparture: iso(dep),
      bestBooking: iso(book),
      priceBase: 387,
      currency: window.APlusZ.detect.currency,
      confidence: 'high'
    };

    window.APlusZ.result.render(demo);
  });

  /* ---------- Enter key submit ---------- */
  ['origin', 'destination'].forEach(function (id) {
    document.getElementById(id).addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('search-btn').click();
    });
  });

})();
