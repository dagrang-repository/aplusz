/* ============================================================
   APlusZ — i18n Loader (Step 6)
   File: frontend/assets/i18n.js
   Save: D:\Destop\AplusZ\frontend\assets\i18n.js
   ============================================================ */

(function () {
  'use strict';

  var SUPPORTED = ['en', 'fr', 'es', 'de', 'ja', 'zh'];
  var FALLBACK = 'en';
  var cache = {};

  function getNested(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return null;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function applyTranslations(dict) {
    var nodes = document.querySelectorAll('[data-i18n]');
    nodes.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = getNested(dict, key);
      if (val != null) el.textContent = val;
    });
    var attrNodes = document.querySelectorAll('[data-i18n-attr]');
    attrNodes.forEach(function (el) {
      var pairs = el.getAttribute('data-i18n-attr').split(',');
      pairs.forEach(function (p) {
        var kv = p.split(':');
        if (kv.length !== 2) return;
        var attr = kv[0].trim();
        var key = kv[1].trim();
        var val = getNested(dict, key);
        if (val != null) el.setAttribute(attr, val);
      });
    });
  }

  function load(lang) {
    var code = (lang || (window.APlusZ && window.APlusZ.detect && window.APlusZ.detect.lang) || FALLBACK).toLowerCase();
    if (SUPPORTED.indexOf(code) === -1) code = FALLBACK;

    if (cache[code]) {
      applyTranslations(cache[code]);
      return Promise.resolve(cache[code]);
    }

    return fetch('i18n/' + code + '.json', { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('lang load failed');
        return r.json();
      })
      .then(function (dict) {
        cache[code] = dict;
        applyTranslations(dict);
        return dict;
      })
      .catch(function () {
        if (code !== FALLBACK) return load(FALLBACK);
      });
  }

  function t(key) {
    var code = (window.APlusZ && window.APlusZ.detect && window.APlusZ.detect.lang) || FALLBACK;
    var dict = cache[code] || cache[FALLBACK];
    if (!dict) return key;
    var val = getNested(dict, key);
    return val != null ? val : key;
  }

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.i18n = {
    load: load,
    t: t,
    supported: SUPPORTED
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { load(); });
  } else {
    load();
  }

})();
