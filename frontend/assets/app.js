/* ============================================================
   APlusZ — App Logic (Step 8/9/14/16/17 wired)
   File: frontend/assets/app.js
   Save: D:\Destop\AplusZ\frontend\assets\app.js
   ============================================================ */

(function () {
  'use strict';

  var THEME_CYCLE = ['dark-glass', 'light-expressive', 'sepia-reader', 'sepia-night'];

  var _y = document.getElementById('year'); if (_y) _y.textContent = new Date().getFullYear();

  /* ---------- Theme cycle ---------- */
  var _tt = document.getElementById('theme-toggle'); if (_tt) _tt.addEventListener('click', function () {
    var current = window.APlusZ.detect.theme;
    var idx = THEME_CYCLE.indexOf(current);
    var next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    window.APlusZ.detect.setTheme(next);
  });

  /* ---------- Language picker (all supported languages) ---------- */
  (function () {
    var btn = document.getElementById('lang-btn');
    if (!btn) return;
    var i18n = window.APlusZ.i18n;
    var menu = null;

    function activeCode() {
      return (i18n.current ? i18n.current() : window.APlusZ.detect.lang);
    }

    function buildMenu() {
      menu = document.createElement('div');
      menu.className = 'lang-menu';
      menu.setAttribute('role', 'listbox');
      i18n.supported.forEach(function (codeItem) {
        var name = (i18n.names && i18n.names[codeItem]) || codeItem;
        var opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'lang-opt';
        opt.setAttribute('role', 'option');
        opt.dataset.code = codeItem;
        opt.textContent = name;
        opt.addEventListener('click', function () {
          var _m = location.pathname.match(/^\/([a-z]{2})\/(faq|about|feedback)\b/); if (_m) { try { localStorage.setItem('aplusz-lang', codeItem); } catch (e) {} location.pathname = '/' + codeItem + '/' + _m[2]; return; } (i18n.setLang ? i18n.setLang(codeItem) : window.APlusZ.detect.setLang(codeItem));
          closeMenu();
        });
        menu.appendChild(opt);
      });
      document.body.appendChild(menu);
    }

    function markActive() {
      if (!menu) return;
      var cur = activeCode();
      menu.querySelectorAll('.lang-opt').forEach(function (o) {
        o.classList.toggle('is-active', o.dataset.code === cur);
      });
    }

    function position() {
      var r = btn.getBoundingClientRect();
      menu.style.top = (r.bottom + 8) + 'px';
      /* align right edge to the button; clamp to viewport */
      var right = Math.max(8, window.innerWidth - r.right);
      menu.style.right = right + 'px';
    }

    function openMenu() {
      if (!menu) buildMenu();
      markActive();
      position();
      menu.classList.add('open');
      document.addEventListener('click', outside, true);
      window.addEventListener('resize', position);
    }
    function closeMenu() {
      if (!menu) return;
      menu.classList.remove('open');
      document.removeEventListener('click', outside, true);
      window.removeEventListener('resize', position);
    }
    function outside(e) {
      if (menu && !menu.contains(e.target) && e.target !== btn) closeMenu();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu && menu.classList.contains('open')) closeMenu(); else openMenu();
    });
  })();

  /* ---------- Menu = open profile drawer ---------- */
  var _mb = document.getElementById('menu-btn'); if (_mb) _mb.addEventListener('click', function () {
    if (window.APlusZ.profile) window.APlusZ.profile.open();
  });

  /* ---------- Swap (values + bound codes) ---------- */
  var _sw = document.getElementById('swap'); if (_sw) _sw.addEventListener('click', function () {
    var o = document.getElementById('origin');
    var d = document.getElementById('destination');
    var tv = o.value; o.value = d.value; d.value = tv;
    var tc = o.dataset.code || ''; o.dataset.code = d.dataset.code || ''; d.dataset.code = tc;
  });

  /* ---------- search-hint helper ---------- */
  function showHint(msg) {
    var card = document.querySelector('.search-card');
    if (!card) return;
    var h = document.getElementById('search-hint');
    if (!h) {
      h = document.createElement('div');
      h.id = 'search-hint'; h.className = 'search-hint';
      card.parentNode.insertBefore(h, card.nextSibling);
    }
    h.textContent = msg;
  }
  function clearHint() { var h = document.getElementById('search-hint'); if (h) h.textContent = ''; }

  /* ---------- Search submit ---------- */
  function runSearch() {
    var oEl = document.getElementById('origin');
    var dEl = document.getElementById('destination');
    var origin = oEl.dataset.code || '';
    var dest   = dEl.dataset.code || '';
    if (!origin || !dest) {
      showHint(window.APlusZ.i18n.t('search.pick'));   // "choose cities from the list"
      return;
    }
    clearHint();

    // url-state: persist route to URL so refresh restores cities + re-fetches price
    try { history.replaceState(null, '', location.pathname + '?o=' + encodeURIComponent(origin) + '&d=' + encodeURIComponent(dest)); } catch (e) {}

    var btn = document.getElementById('search-btn');
    btn.disabled = true;
    btn.textContent = '…';

    window.APlusZ.data.search(origin, dest)
      .then(function (data) {
        btn.disabled = false;
        btn.textContent = window.APlusZ.i18n.t('search.button');
        if (!data) {
          window.APlusZ.result.renderEmpty();
          return;
        }
        window.APlusZ.result.render(data);
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = window.APlusZ.i18n.t('search.button');
        window.APlusZ.result.renderEmpty(window.APlusZ.i18n.t('errors.generic'));
      });
  }

  var _sb = document.getElementById('search-btn'); if (_sb) _sb.addEventListener('click', runSearch);

  /* Enter searches only once both cities are picked (lets autocomplete bind first) */
  ['origin', 'destination'].forEach(function (id) {
    var _el = document.getElementById(id); if (!_el) return;
    _el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      setTimeout(function () {
        var o = document.getElementById('origin').dataset.code;
        var d = document.getElementById('destination').dataset.code;
        if (o && d) runSearch();
      }, 0);
    });
  });

  /* ---------- Rescan deep-link + restore last route ---------- */
  function whenAutocompleteReady(fn, tries) {
    tries = tries || 0;
    if (window.APlusZ.autocomplete && window.APlusZ.autocomplete.ready && window.APlusZ.autocomplete.ready()) return fn();
    if (tries > 40) return;                       // ~6s max
    setTimeout(function () { whenAutocompleteReady(fn, tries + 1); }, 150);
  }

  (function () {
    var qp = new URLSearchParams(window.location.search);
    var o = qp.get('o'), d = qp.get('d');
    var resolve = (window.APlusZ.cities && window.APlusZ.cities.resolve) || function (x) { return (x || '').toUpperCase(); };

    if (o || d) {
      whenAutocompleteReady(function () {
        var oc = resolve(o), dc = resolve(d);
        var ac = window.APlusZ.autocomplete;
        if (oc) ac.setOrigin(oc).then(function () {
          if (dc) ac.setDestination(dc);
          if (oc && dc) runSearch();
        });
      });
      return;
    }
    /* no rescan params → restore last searched route (codes) into the fields */
    try {
      var saved = JSON.parse(localStorage.getItem('aplusz-saved-routes') || '[]');
      if (saved.length) {
        whenAutocompleteReady(function () {
          var ac = window.APlusZ.autocomplete;
          if (saved[0].origin) ac.setOrigin(saved[0].origin).then(function () {
            if (saved[0].destination) ac.setDestination(saved[0].destination);
          });
        });
      }
    } catch (e) {}
  })();

})();