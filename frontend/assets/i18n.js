/* ============================================================
   APlusZ — i18n Loader
   File: frontend/assets/i18n.js
   Save: D:\Destop\AplusZ\frontend\assets\i18n.js

   - 20 supported languages
   - Auto-detect device language (via detect.js)
   - Manual override wins and persists (localStorage)
   - Sets <html lang> + dir (RTL for Arabic/Persian)
   - Exposes native language names for the picker
   ============================================================ */

(function () {
  'use strict';

  var SUPPORTED = ['en','zh','es','hi','ar','fr','pt','ru','ja','de','ko','it','tr','vi','id','th','nl','pl','bn','fa'];
  var RTL = ['ar', 'fa'];
  var FALLBACK = 'en';
  var STORE = 'aplusz-lang';
  var cache = {};

  /* BCP-47 tags for Intl date/number formatting */
  var LOCALES = {
    en:'en-GB', zh:'zh-CN', es:'es-ES', hi:'hi-IN', ar:'ar', fr:'fr-FR', pt:'pt-PT',
    ru:'ru-RU', ja:'ja-JP', de:'de-DE', ko:'ko-KR', it:'it-IT', tr:'tr-TR', vi:'vi-VN',
    id:'id-ID', th:'th-TH', nl:'nl-NL', pl:'pl-PL', bn:'bn-BD', fa:'fa-IR'
  };

  /* native language names — for the manual switcher menu */
  var NAMES = {
    en:'English', zh:'中文', es:'Español', hi:'हिन्दी', ar:'العربية',
    fr:'Français', pt:'Português', ru:'Русский', ja:'日本語', de:'Deutsch',
    ko:'한국어', it:'Italiano', tr:'Türkçe', vi:'Tiếng Việt', id:'Bahasa Indonesia',
    th:'ไทย', nl:'Nederlands', pl:'Polski', bn:'বাংলা', fa:'فارسی'
  };

  function getNested(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return null;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function valid(code) {
    code = ('' + (code || '')).toLowerCase();
    /* accept region tags too: 'pt-BR' -> 'pt' */
    if (SUPPORTED.indexOf(code) === -1 && code.indexOf('-') > -1) {
      code = code.split('-')[0];
    }
    return SUPPORTED.indexOf(code) > -1 ? code : null;
  }

  function stored() {
    try { return localStorage.getItem(STORE); } catch (e) { return null; }
  }

  function deviceLang() {
    return (window.APlusZ && window.APlusZ.detect && window.APlusZ.detect.lang) || null;
  }

  /* priority: explicit > saved manual choice > device > English */
  function resolve(lang) {
    return valid(lang) || valid(stored()) || valid(deviceLang()) || FALLBACK;
  }

  function applyDocLang(code) {
    try {
      document.documentElement.setAttribute('lang', code);
      document.documentElement.setAttribute('dir', RTL.indexOf(code) > -1 ? 'rtl' : 'ltr');
    } catch (e) {}
    /* keep every consumer (incl. detect.lang readers) in sync with the active language */
    window.APlusZ = window.APlusZ || {};
    window.APlusZ.detect = window.APlusZ.detect || {};
    window.APlusZ.detect.lang = code;
  }

  function applyTranslations(dict) {
    var nodes = document.querySelectorAll('[data-i18n]');
    nodes.forEach(function (el) {
      var val = getNested(dict, el.getAttribute('data-i18n'));
      if (val != null) el.textContent = val;
    });
    var attrNodes = document.querySelectorAll('[data-i18n-attr]');
    attrNodes.forEach(function (el) {
      var pairs = el.getAttribute('data-i18n-attr').split(',');
      pairs.forEach(function (p) {
        var kv = p.split(':');
        if (kv.length !== 2) return;
        var val = getNested(dict, kv[1].trim());
        if (val != null) el.setAttribute(kv[0].trim(), val);
      });
    });
  }

  function load(lang) {
    var code = resolve(lang);
    applyDocLang(code);

    if (cache[code]) {
      applyTranslations(cache[code]);
      notifyLang(code);
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
        notifyLang(code);
        return dict;
      })
      .catch(function () {
        if (code !== FALLBACK) return load(FALLBACK);
      });
  }

  /* tell JS-built UI (profile drawer, alerts) to re-render in the new language */
  function notifyLang(code) {
    try { document.dispatchEvent(new CustomEvent('aplusz:lang', { detail: { lang: code } })); } catch (e) {}
  }

  /* manual switch — persists and overrides device language */
  function setLang(lang) {
    var code = valid(lang) || FALLBACK;
    try { localStorage.setItem(STORE, code); } catch (e) {}
    return load(code);
  }

  /* the currently active language code */
  function current() {
    return resolve();
  }

  /* active BCP-47 locale for Intl (dates, currency) */
  function locale() {
    return LOCALES[current()] || 'en-GB';
  }

  function t(key) {
    var code = current();
    var dict = cache[code] || cache[FALLBACK];
    if (!dict) return key;
    var val = getNested(dict, key);
    return val != null ? val : key;
  }

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.i18n = {
    load: load,
    setLang: setLang,
    current: current,
    locale: locale,
    t: t,
    supported: SUPPORTED,
    names: NAMES,
    rtl: RTL
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { load(); });
  } else {
    load();
  }

})();
