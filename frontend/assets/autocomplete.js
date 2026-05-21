/* ============================================================
   APlusZ — City Autocomplete (live-first, multilingual)
   File: frontend/assets/autocomplete.js
   Save: D:\Destop\AplusZ\frontend\assets\autocomplete.js

   Suggests ANY city (from cities.json), matched in the active
   language. Live-monitored cities float to the TOP, carry a
   color accent + "Live" tag. Others are listed below — still
   selectable & bookable. "Live" is contextual:
     • origin field      -> cities we monitor flights FROM (index.json)
     • destination field -> real destinations of the chosen origin
   ============================================================ */

(function () {
  'use strict';
  var APZ = window.APlusZ = window.APlusZ || {};

  var originLive = {};      // code -> true (monitored origins)
  var destLive = {};        // code -> true (destinations of current origin)

  function liveTag() {
    var t = (APZ.i18n && APZ.i18n.t) ? APZ.i18n.t('search.live') : 'Live';
    return '<span class="ac-live">' + t + '</span>';
  }

  function attach(input, getLive, onPick) {
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
        return '<div class="ac-opt' + (m.live ? ' live' : '') + (i === active ? ' on' : '') + '" data-i="' + i + '">' +
          '<span class="ac-name">' + m.label + '</span>' +
          '<span class="ac-mid">' + (m.live ? liveTag() : '') + '</span>' +
          '<span class="ac-code">' + m.code + '</span></div>';
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
      input.dataset.code = '';
      var raw = (APZ.cities ? APZ.cities.suggest(input.value, 40) : []);
      var live = getLive() || {};
      raw.forEach(function (m) { m.live = !!live[m.code]; });
      // stable sort: live first, keep original (traffic) order within groups
      raw.sort(function (a, b) { return (b.live ? 1 : 0) - (a.live ? 1 : 0); });
      render(raw.slice(0, 8));
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
        if (!input.dataset.code) {
          var code = APZ.cities ? APZ.cities.resolve(input.value) : '';
          if (code) { input.value = APZ.cities.label(code); input.dataset.code = code; if (onPick) onPick(code); }
        }
        close();
      }, 150);
    });
    window.addEventListener('resize', function () { if (open) position(); });

    return { set: function (code) { input.value = APZ.cities ? APZ.cities.label(code) : code; input.dataset.code = code; } };
  }

  function loadOriginLive() {
    return fetch('/data/index.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { (j && j.origins || []).forEach(function (c) { originLive[c] = true; }); })
      .catch(function () {});
  }

  function loadDestLive(origin) {
    destLive = {};
    return fetch('/data/' + origin + '.json', { cache: 'default' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { var rt = (j && j.routes) || {}; Object.keys(rt).forEach(function (c) { destLive[c] = true; }); })
      .catch(function () {});
  }

  function init() {
    var oEl = document.getElementById('origin');
    var dEl = document.getElementById('destination');
    if (!oEl || !dEl) return;

    var ready = Promise.all([
      (APZ.cities && APZ.cities.load) ? APZ.cities.load() : Promise.resolve(),
      loadOriginLive()
    ]);

    ready.then(function () {
      var o = attach(oEl, function () { return originLive; }, function (code) {
        dEl.value = ''; dEl.dataset.code = '';
        loadDestLive(code);
      });
      var d = attach(dEl, function () { return destLive; }, null);

      APZ.autocomplete = {
        ready: function () { return APZ.cities && APZ.cities.ready(); },
        setOrigin: function (code) { o.set(code); return loadDestLive(code); },
        setDestination: function (code) { d.set(code); }
      };
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
