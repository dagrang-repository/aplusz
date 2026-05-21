/* ============================================================
   APlusZ — City Autocomplete (guaranteed-data picks)
   File: frontend/assets/autocomplete.js
   Save: D:\Destop\AplusZ\frontend\assets\autocomplete.js

   Origin field suggests ONLY cities we have data for (from
   /data/index.json). Once an origin is picked, the destination
   field suggests ONLY that origin's real destinations (from its
   chunk). Selecting binds the IATA code to input.dataset.code.
   Free-typed text that isn't picked leaves no code -> search blocked.
   ============================================================ */

(function () {
  'use strict';

  var APZ = window.APlusZ = window.APlusZ || {};
  var label = function (c) { return (APZ.cities && APZ.cities.label) ? APZ.cities.label(c) : c; };

  var originList = [];          // [{code,label,lc}]
  var destByOrigin = {};        // origin -> [{code,label,lc}]
  var ready = false;

  function item(code) { var l = label(code); return { code: code, label: l, lc: (l + ' ' + code).toLowerCase() }; }

  function loadOrigins() {
    return fetch('/data/index.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var origins = (j && j.origins) || [];
        originList = origins.map(item).sort(function (a, b) { return a.label < b.label ? -1 : 1; });
        ready = true;
      })
      .catch(function () { originList = []; });
  }

  function loadDestinations(origin) {
    if (destByOrigin[origin]) return Promise.resolve(destByOrigin[origin]);
    return fetch('/data/' + origin + '.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var routes = (j && j.routes) || {};
        var list = Object.keys(routes).map(item).sort(function (a, b) { return a.label < b.label ? -1 : 1; });
        destByOrigin[origin] = list;
        return list;
      })
      .catch(function () { destByOrigin[origin] = []; return []; });
  }

  /* ---------- dropdown widget bound to one input ---------- */
  function attach(input, getList, onPick) {
    var box = document.createElement('div');
    box.className = 'ac-menu';
    document.body.appendChild(box);
    var items = [], active = -1, open = false;

    function position() {
      var r = input.getBoundingClientRect();
      box.style.left = r.left + 'px';
      box.style.top = (r.bottom + 4) + 'px';
      box.style.width = r.width + 'px';
    }
    function close() { box.classList.remove('open'); open = false; active = -1; }
    function render(matches) {
      items = matches;
      if (!matches.length) { close(); return; }
      box.innerHTML = matches.map(function (m, i) {
        return '<div class="ac-opt' + (i === active ? ' on' : '') + '" data-i="' + i + '">' +
          '<span class="ac-name">' + m.label + '</span><span class="ac-code">' + m.code + '</span></div>';
      }).join('');
      box.querySelectorAll('.ac-opt').forEach(function (el) {
        el.addEventListener('mousedown', function (e) { e.preventDefault(); pick(items[+el.dataset.i]); });
      });
      position(); box.classList.add('open'); open = true;
    }
    function pick(m) {
      if (!m) return;
      input.value = m.label;
      input.dataset.code = m.code;
      close();
      if (onPick) onPick(m.code);
    }
    function filter() {
      input.dataset.code = '';            // typing invalidates a prior pick
      var q = input.value.trim().toLowerCase();
      var src = getList() || [];
      if (!q) { render(src.slice(0, 8)); return; }
      var hits = src.filter(function (m) { return m.lc.indexOf(q) !== -1; }).slice(0, 8);
      render(hits);
    }

    input.addEventListener('input', filter);
    input.addEventListener('focus', filter);
    input.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, items.length - 1); render(items); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render(items); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(items[active >= 0 ? active : 0]); }
      else if (e.key === 'Escape') { close(); }
    });
    input.addEventListener('blur', function () {
      setTimeout(function () {
        // if text exactly matches one option, auto-bind it; else leave unbound
        if (!input.dataset.code) {
          var q = input.value.trim().toLowerCase();
          var exact = (getList() || []).filter(function (m) {
            return m.label.toLowerCase() === q || m.code.toLowerCase() === q;
          });
          if (exact.length === 1) { input.value = exact[0].label; input.dataset.code = exact[0].code; }
        }
        close();
      }, 150);
    });
    window.addEventListener('resize', function () { if (open) position(); });
    return { setText: function (code) { input.value = label(code); input.dataset.code = code; } };
  }

  function init() {
    var oEl = document.getElementById('origin');
    var dEl = document.getElementById('destination');
    if (!oEl || !dEl) return;

    loadOrigins().then(function () {
      var curOriginDests = [];

      attach(oEl, function () { return originList; }, function (code) {
        // origin chosen -> load its destinations, reset destination field
        dEl.value = ''; dEl.dataset.code = ''; curOriginDests = [];
        loadDestinations(code).then(function (list) { curOriginDests = list; });
      });

      attach(dEl, function () { return curOriginDests; }, null);

      // expose helpers for app.js (rescan / restore / swap)
      APZ.autocomplete = {
        ready: function () { return ready; },
        setOrigin: function (code) {
          oEl.value = label(code); oEl.dataset.code = code;
          return loadDestinations(code).then(function (list) { curOriginDests = list; return list; });
        },
        setDestination: function (code) { dEl.value = label(code); dEl.dataset.code = code; },
        validDestForCurrent: function (code) {
          return curOriginDests.some(function (m) { return m.code === code; });
        }
      };
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
