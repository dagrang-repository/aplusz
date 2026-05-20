/* ============================================================
   APlusZ — Auto-Detect Core (Step 5)
   File: frontend/assets/detect.js
   Save: D:\Destop\AplusZ\frontend\assets\detect.js
   ============================================================ */

(function () {
  'use strict';

  /* ---------- 1. LANGUAGE (unbreakable chain) ---------- */
  function detectLang() {
    try {
      var raw =
        (navigator.languages && navigator.languages[0]) ||
        navigator.language ||
        navigator.userLanguage ||
        navigator.browserLanguage ||
        navigator.systemLanguage ||
        'en';
      return String(raw).toLowerCase().split('-')[0];
    } catch (e) {
      return 'en';
    }
  }

  /* ---------- 2. THEME (OS pref + user override) ---------- */
  function detectTheme() {
    try {
      var saved = localStorage.getItem('aplusz-theme');
      if (saved) return saved;
      if (window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark-glass';
      }
      return 'light-expressive';
    } catch (e) {
      return 'dark-glass';
    }
  }

  /* ---------- 3. CURRENCY (locale -> ISO code) ---------- */
  function detectCurrency() {
    try {
      var saved = localStorage.getItem('aplusz-currency');
      if (saved) return saved;
      var locale = navigator.language || 'en-US';
      var map = {
        'US': 'USD', 'GB': 'GBP', 'JP': 'JPY', 'CN': 'CNY', 'IN': 'INR',
        'CA': 'CAD', 'AU': 'AUD', 'CH': 'CHF', 'KR': 'KRW', 'BR': 'BRL',
        'MX': 'MXN', 'RU': 'RUB', 'TR': 'TRY', 'ZA': 'ZAR', 'SG': 'SGD',
        'HK': 'HKD', 'TH': 'THB', 'PH': 'PHP', 'ID': 'IDR', 'MY': 'MYR',
        'VN': 'VND', 'NZ': 'NZD', 'NO': 'NOK', 'SE': 'SEK', 'DK': 'DKK',
        'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'AE': 'AED', 'SA': 'SAR',
        'IL': 'ILS', 'EG': 'EGP', 'MA': 'MAD', 'NG': 'NGN', 'AR': 'ARS',
        'CL': 'CLP', 'CO': 'COP', 'PE': 'PEN'
      };
      var region = (locale.split('-')[1] || '').toUpperCase();
      return map[region] || 'EUR';
    } catch (e) {
      return 'EUR';
    }
  }

  /* ---------- 4. APPLY (instant, before paint) ---------- */
  var lang = detectLang();
  var theme = detectTheme();
  var currency = detectCurrency();

  var html = document.documentElement;
  html.lang = lang;
  html.dataset.theme = theme;
  html.dataset.currency = currency;

  /* ---------- 5. EXPOSE GLOBAL API ---------- */
  window.APlusZ = window.APlusZ || {};
  window.APlusZ.detect = {
    lang: lang,
    theme: theme,
    currency: currency,

    setTheme: function (name) {
      var allowed = ['dark-glass', 'light-expressive', 'sepia-reader', 'sepia-night'];
      if (allowed.indexOf(name) === -1) return false;
      html.dataset.theme = name;
      try { localStorage.setItem('aplusz-theme', name); } catch (e) {}
      window.APlusZ.detect.theme = name;
      return true;
    },

    setLang: function (code) {
      if (!code || typeof code !== 'string') return false;
      var c = code.toLowerCase().split('-')[0];
      html.lang = c;
      try { localStorage.setItem('aplusz-lang', c); } catch (e) {}
      window.APlusZ.detect.lang = c;
      if (window.APlusZ.i18n && typeof window.APlusZ.i18n.load === 'function') {
        window.APlusZ.i18n.load(c);
      }
      return true;
    },

    setCurrency: function (code) {
      if (!code || typeof code !== 'string') return false;
      var c = code.toUpperCase();
      html.dataset.currency = c;
      try { localStorage.setItem('aplusz-currency', c); } catch (e) {}
      window.APlusZ.detect.currency = c;
      return true;
    },

    formatPrice: function (amount, cur) {
      try {
        return new Intl.NumberFormat(navigator.language || 'en', {
          style: 'currency',
          currency: cur || window.APlusZ.detect.currency,
          maximumFractionDigits: 0
        }).format(amount);
      } catch (e) {
        return amount + ' ' + (cur || window.APlusZ.detect.currency);
      }
    }
  };

  /* ---------- 6. LIVE OS THEME CHANGE LISTENER ---------- */
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var handler = function (e) {
      if (!localStorage.getItem('aplusz-theme')) {
        var next = e.matches ? 'dark-glass' : 'light-expressive';
        html.dataset.theme = next;
        window.APlusZ.detect.theme = next;
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  } catch (e) {}

})();
