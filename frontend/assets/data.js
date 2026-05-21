/* ============================================================
   APlusZ — Data Layer (global, chunked, no live calls)
   File: frontend/assets/data.js
   Save: D:\Destop\AplusZ\frontend\assets\data.js

   Reads per-origin chunks committed weekly by GitHub Actions:
     /data/<ORIGIN>.json   (+ /data/index.json manifest)
   Resolves typed cities -> IATA city codes via APlusZ.cities.
   Shows ONLY real fetched fares; a miss returns null -> honest
   empty-state. No fabricated prices (demo behind dev flag only).
   ============================================================ */

(function () {
  'use strict';

  var chunkCache = {};   // origin -> routes map (or null)
  var manifest = null;

  function resolve(s) {
    return (window.APlusZ.cities && window.APlusZ.cities.resolve)
      ? window.APlusZ.cities.resolve(s)
      : String(s || '').trim().toUpperCase().slice(0, 3);
  }

  function loadManifest() {
    if (manifest) return Promise.resolve(manifest);
    return fetch('/data/index.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { manifest = j || { origins: [] }; return manifest; })
      .catch(function () { manifest = { origins: [] }; return manifest; });
  }

  function loadChunk(origin) {
    if (origin in chunkCache) return Promise.resolve(chunkCache[origin]);
    return fetch('/data/' + origin + '.json', { cache: 'default' })
      .then(function (r) { if (!r.ok) throw new Error('no chunk'); return r.json(); })
      .then(function (j) { chunkCache[origin] = (j && j.routes) || null; return chunkCache[origin]; })
      .catch(function () { chunkCache[origin] = null; return null; });
  }

  /* demo kept ONLY for local dev: window.APlusZ.config.allowDemo === true */
  function demo(o, d) {
    var today = new Date();
    var iso = function (t) { return t.toISOString().split('T')[0]; };
    var seed = (o + d).split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 0);
    return {
      origin: o, destination: d,
      bestDeparture: iso(new Date(today.getTime() + 75 * 86400000)),
      bestBooking: iso(new Date(today.getTime() + 14 * 86400000)),
      priceBase: 180 + (seed % 700), currency: 'EUR',
      confidence: 'medium', isDemo: true
    };
  }

  var MARKER = '531148';
  function ddmm(iso) { return (iso && iso.length >= 10) ? iso.slice(8, 10) + iso.slice(5, 7) : ''; }
  function bookLink(o, d, dep) {
    if (!dep) dep = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10); // default ~30d out
    return 'https://www.aviasales.com/search/' + o + ddmm(dep) + d + '1?marker=' + MARKER;
  }

  function search(origin, dest) {
    if (!origin || !dest) return Promise.resolve(null);
    var o = resolve(origin), d = resolve(dest);
    if (!o || !d || o === d) return Promise.resolve(null);
    return loadChunk(o).then(function (routes) {
      if (routes && routes[d]) {
        var row = routes[d];
        row.monitored = true;
        if (!row.book) row.book = bookLink(o, d, row.bestDeparture);
        return row;
      }
      var devDemo = window.APlusZ.config && window.APlusZ.config.allowDemo === true;
      if (devDemo) return demo(o, d);
      // not live-monitored — still fully bookable (affiliate, marker 531148)
      return { origin: o, destination: d, monitored: false, noData: true, book: bookLink(o, d) };
    });
  }

  function metadata() {
    return loadManifest().then(function (m) {
      return {
        available: !!(m && m.origins && m.origins.length),
        generated: m && m.generated,
        origins: m && m.origin_count,
        routes: m && m.total_routes
      };
    });
  }

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.data = { search: search, metadata: metadata, resolve: resolve };

})();
