/* ============================================================
   APlusZ — Data Layer (Step 14)
   File: frontend/assets/data.js
   Save: D:\Destop\AplusZ\frontend\assets\data.js

   Reads the static JSON committed weekly by GitHub Actions.
   Falls back to demo data when /data/routes.json is missing
   (e.g. before the first cron run).
   ============================================================ */

(function () {
  'use strict';

  var DATA_URL = '/data/routes.json';
  var cache = null;
  var loading = null;

  /* ---------- Load (cached, single fetch) ---------- */
  function load() {
    if (cache) return Promise.resolve(cache);
    if (loading) return loading;
    loading = fetch(DATA_URL, { cache: 'default' })
      .then(function (r) {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(function (j) { cache = j; return j; })
      .catch(function () { cache = null; return null; });
    return loading;
  }

  /* ---------- IATA normalization (very light) ---------- */
  function normalize(s) {
    return String(s || '').trim().toUpperCase().slice(0, 3);
  }

  /* ---------- Lookup by O/D pair ---------- */
  function lookup(origin, dest) {
    var o = normalize(origin);
    var d = normalize(dest);
    return load().then(function (j) {
      if (!j || !j.routes) return null;
      var key = o + '-' + d;
      return j.routes[key] || null;
    });
  }

  /* ---------- Demo fallback (used until real data exists) ---------- */
  function demo(origin, dest) {
    var today = new Date();
    var dep = new Date(today.getTime() + 75 * 86400000);
    var book = new Date(today.getTime() + 14 * 86400000);
    var iso = function (d) { return d.toISOString().split('T')[0]; };
    // Pseudo-random but stable per route
    var seed = (origin + dest).split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0);
    var price = 180 + (seed % 700);
    return {
      origin: normalize(origin),
      destination: normalize(dest),
      bestDeparture: iso(dep),
      bestBooking: iso(book),
      priceBase: price,
      currency: window.APlusZ.detect.currency,
      confidence: 'medium',
      isDemo: true
    };
  }

  /* ---------- Public API ---------- */
  function search(origin, dest) {
    if (!origin || !dest) return Promise.resolve(null);
    return lookup(origin, dest).then(function (row) {
      return row || demo(origin, dest);
    });
  }

  function metadata() {
    return load().then(function (j) {
      if (!j) return { available: false };
      return {
        available: true,
        version: j.version,
        generated: j.generated,
        count: j.count
      };
    });
  }

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.data = {
    search: search,
    metadata: metadata,
    normalize: normalize
  };

})();
