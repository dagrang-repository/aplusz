/* ============================================================
   APlusZ — App Logic (Step 8/9/14/16/17 wired)
   File: frontend/assets/app.js
   Save: D:\Destop\AplusZ\frontend\assets\app.js
   ============================================================ */

(function () {
  'use strict';

  var THEME_CYCLE = ['dark-glass', 'light-expressive', 'sepia-reader', 'sepia-night'];

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Theme cycle ---------- */
  document.getElementById('theme-toggle').addEventListener('click', function () {
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
          (i18n.setLang ? i18n.setLang(codeItem) : window.APlusZ.detect.setLang(codeItem));
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
  document.getElementById('menu-btn').addEventListener('click', function () {
    if (window.APlusZ.profile) window.APlusZ.profile.open();
  });

  /* ---------- Swap ---------- */
  document.getElementById('swap').addEventListener('click', function () {
    var o = document.getElementById('origin');
    var d = document.getElementById('destination');
    var tmp = o.value;
    o.value = d.value;
    d.value = tmp;
  });

  /* ---------- Search submit ---------- */
  function runSearch() {
    var origin = document.getElementById('origin').value.trim().toUpperCase();
    var dest   = document.getElementById('destination').value.trim().toUpperCase();
    if (!origin || !dest) return;

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

  document.getElementById('search-btn').addEventListener('click', runSearch);

  ['origin', 'destination'].forEach(function (id) {
    document.getElementById(id).addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runSearch();
    });
  });

  /* ---------- Rescan deep-link + restore last route ---------- */
  (function () {
    var qp = new URLSearchParams(window.location.search);
    var o = qp.get('o'), d = qp.get('d');
    if (o || d) {
      if (o) document.getElementById('origin').value = o.toUpperCase();
      if (d) document.getElementById('destination').value = d.toUpperCase();
      if (o && d) runSearch();
      return;
    }
    /* no rescan params → bring back the last route the user searched
       (fixes "typed cities lost on refresh"); inputs only, no auto-search */
    try {
      var saved = JSON.parse(localStorage.getItem('aplusz-saved-routes') || '[]');
      if (saved.length) {
        document.getElementById('origin').value = saved[0].origin || '';
        document.getElementById('destination').value = saved[0].destination || '';
      }
    } catch (e) {}
  })();

})();
