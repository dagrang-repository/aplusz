/* ============================================================
   APlusZ — Data Layer (global, chunked, no live calls)
   File: frontend/assets/data.js
   Save: D:\Destop\AplusZ\frontend\assets\data.js

   Reads per-origin chunks committed weekly by GitHub Actions:
     /data/<ORIGIN>.json   (+ /data/index.json manifest)
   Resolves typed cities -> IATA city codes via APlusZ.cities.

   EVERY resolvable pair is monitored + bookable via Travelpayouts
   tracked deep links (profile 730427 / program 531148). Cached fare
   shown when present; otherwise the card invites
   "Check the live price" and still opens a real affiliate search.
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

  // Travelpayouts tracked deep-link (verified format from TP dashboard):
  //   marker = profile ID, trs = program/project ID, p = Aviasales program, u = encoded search URL
  var TP_MARKER = '730427';   // profile ID
  var TP_TRS    = '531148';   // program/project ID
  var TP_P      = '4114';     // Aviasales program code
  var TP_CAMP   = '100';
  function ddmm(iso) { return (iso && iso.length >= 10) ? iso.slice(8, 10) + iso.slice(5, 7) : ''; }
  function bookLink(o, d, dep) {
    if (!dep) dep = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10); // ~30d out
    var search = 'https://www.aviasales.com/search/' + o + ddmm(dep) + d + '1';
    return 'https://tp.media/r?marker=' + TP_MARKER +
           '&trs=' + TP_TRS + '&p=' + TP_P +
           '&u=' + encodeURIComponent(search) +
           '&campaign_id=' + TP_CAMP;
  }

  function search(origin, dest) {
    if (!origin || !dest) return Promise.resolve(null);
    var o = resolve(origin), d = resolve(dest);
    if (!o || !d || o === d) return Promise.resolve(null);
    return loadChunk(o).then(function (routes) {
      if (routes && routes[d]) {
        // cached fare available -> full green card with price
        var row = routes[d];
        row.monitored = true;
        row.livePrice = false;
        if (!row.book) row.book = bookLink(o, d, row.bestDeparture);
        return row;
      }
      // no cached fare -> still green + bookable; invite live-price check
      return {
        origin: o,
        destination: d,
        monitored: true,
        livePrice: true,        // signals result.js to show "Check the live price"
        book: bookLink(o, d)
      };
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
