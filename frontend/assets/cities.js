/* ============================================================
   APlusZ — City Data (multilingual, full list)
   File: frontend/assets/cities.js
   Save: D:\Destop\AplusZ\frontend\assets\cities.js

   Loads /data/cities.json (built by scripts/build-cities.js):
     { cities: [ { code, country, names:{en,fr,zh-CN,...} } ] }
   Every city is selectable & bookable. Matching works in ANY of
   the 20 languages. label(code) shows the name in the active UI
   language. A tiny built-in fallback keeps things working until
   cities.json is generated.
   ============================================================ */

(function () {
  'use strict';
  var APZ = window.APlusZ = window.APlusZ || {};

  var LANG_MAP = { zh: 'zh-CN' };           // app lang -> cities.json key
  var byCode = {};                          // CODE -> { country, names }
  var index  = [];                          // [{ code, all }] for searching
  var loaded = false, loadingP = null;

  /* minimal fallback so resolve/label work before cities.json exists */
  var FALLBACK = {
    PAR:'Paris', LON:'London', NYC:'New York', BKK:'Bangkok', MNL:'Manila',
    TYO:'Tokyo', SIN:'Singapore', DXB:'Dubai', HKG:'Hong Kong', IST:'Istanbul'
  };

  function activeLang() {
    var l = (APZ.i18n && APZ.i18n.current) ? APZ.i18n.current()
          : (APZ.detect && APZ.detect.lang) || 'en';
    return LANG_MAP[l] || l;
  }

  function nameOf(rec, lang) {
    if (!rec) return '';
    if (rec.names) return rec.names[lang] || rec.names.en || rec.code;
    return rec.name || rec.code;
  }

  function label(code) {
    var c = String(code || '').toUpperCase();
    var rec = byCode[c];
    if (rec) return nameOf(rec, activeLang());
    return FALLBACK[c] || c;
  }

  function load() {
    if (loaded) return Promise.resolve(true);
    if (loadingP) return loadingP;
    loadingP = fetch('/data/cities.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var list = (j && j.cities) || [];
        list.forEach(function (rec) {
          byCode[rec.code] = { country: rec.country || '', names: rec.names || {} };
          var all = rec.code.toLowerCase();
          if (rec.names) for (var k in rec.names) all += ' ' + String(rec.names[k]).toLowerCase();
          index.push({ code: rec.code, all: all });
        });
        loaded = true;
        return true;
      })
      .catch(function () {
        // fallback list
        for (var c in FALLBACK) {
          byCode[c] = { country: '', names: { en: FALLBACK[c] } };
          index.push({ code: c, all: (c + ' ' + FALLBACK[c]).toLowerCase() });
        }
        loaded = true;
        return true;
      });
    return loadingP;
  }

  /* suggestions for autocomplete: matches q against all language names */
  function suggest(q, limit) {
    limit = limit || 8;
    var s = String(q || '').trim().toLowerCase();
    var lang = activeLang();
    if (!s) {
      return index.slice(0, limit).map(function (r) {
        return { code: r.code, label: nameOf(byCode[r.code], lang) };
      });
    }
    var hits = [];
    for (var i = 0; i < index.length && hits.length < limit; i++) {
      if (index[i].all.indexOf(s) !== -1) {
        hits.push({ code: index[i].code, label: nameOf(byCode[index[i].code], lang) });
      }
    }
    return hits;
  }

  function resolve(input) {
    var s = String(input || '').trim();
    if (!s) return '';
    var up = s.toUpperCase().replace(/[^A-Z]/g, '');
    if (byCode[up]) return up;                 // exact known code
    var lo = s.toLowerCase();
    for (var i = 0; i < index.length; i++) {   // exact name match (any lang)
      var rec = byCode[index[i].code];
      if (rec && rec.names) {
        for (var k in rec.names) {
          if (String(rec.names[k]).toLowerCase() === lo) return index[i].code;
        }
      }
    }
    if (up.length === 3) return up;            // clean 3-letter code passthrough
    return '';                                 // never fabricate
  }

  APZ.cities = { load: load, suggest: suggest, resolve: resolve, label: label,
                 ready: function () { return loaded; } };
  load();
})();
