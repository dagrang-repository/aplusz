/* ============================================================
   APlusZ — Front-index Billboard (rotating slides)
   File: frontend/assets/billboard.js
   Fixed-height CROSSFADE stage: nothing below the billboard moves
   when slides change. Two absolute layers fade opacity; the stage
   height is auto-locked to the tallest slide (measured live, so it
   fits any screen width / language with no clipping and no reflow).
   Slides:
     • STAT slide — no link, informational, 10s   (LIVE now)
     • Affiliate slides — clickable, 6s each, auto-HIDDEN until their
       real ID is set in config.billboard (no bare links ever).
   i18n: reads billboard.* keys with English fallback; re-renders and
   re-measures on language change + on resize.
   ============================================================ */
(function () {
  'use strict';
  var APZ = window.APlusZ = window.APlusZ || {};
  var EN = {
    'billboard.stat': 'This app scans up to 50,000 possible lowest prices across 2,000 airports and finds the lowest possible fare on the best date to book within the next 6 months.',
    'billboard.insurance': 'Looking for trusted travel assurance, we have a good link for that.',
    'billboard.hosting': 'A partner web hosting service, if you are interested.',
    'billboard.webdesign': 'If you need a powerful website, we have the perfect solution for you, at a huge discount at the moment. Follow this link!'
  };
  function t(k) {
    var v = (APZ.i18n && APZ.i18n.t) ? APZ.i18n.t(k) : k;
    return (v && v !== k) ? v : (EN[k] != null ? EN[k] : k);
  }
  function realLink(u) {
    return !!u && u.indexOf('YOUR_') === -1 && u.indexOf('placeholder') === -1;
  }
  function slides() {
    var bb = (APZ.config && APZ.config.billboard) || {};
    var all = [
      { key: 'billboard.stat',      url: null,          ms: 10000 },
      { key: 'billboard.insurance', url: bb.insurance,  ms: 6000 },
      { key: 'billboard.hosting',   url: bb.hosting,    ms: 6000 },
      { key: 'billboard.webdesign', url: bb.webdesign,  ms: 6000 }
    ];
    return all.filter(function (s) { return s.url === null || realLink(s.url); });
  }
  function slideHTML(s, text) {
    if (s.url) {
      var isInt = s.url.charAt(0) === '/';
      var tgt = isInt ? '' : ' target="_blank" rel="noopener nofollow sponsored"';
      return '<a class="bb-slide bb-link" href="' + s.url + '"' + tgt + '>' + text + '</a>';
    }
    return '<span class="bb-slide">' + text + '</span>';
  }
  var host, layers = [], front = 0, idx = 0, timer = null;

  /* lock the stage to the tallest slide so swaps never reflow the page */
  function lockHeight(list) {
    if (!host || !layers.length || !list.length) return;
    var probe = document.createElement('div');
    probe.className = 'bb-layer';
    probe.style.visibility = 'hidden';
    probe.style.bottom = 'auto';
    probe.style.height = 'auto';
    host.appendChild(probe);
    var max = 0, i;
    for (i = 0; i < list.length; i++) {
      probe.innerHTML = slideHTML(list[i], t(list[i].key));
      if (probe.offsetHeight > max) max = probe.offsetHeight;
    }
    host.removeChild(probe);
    if (max > 0) host.style.height = max + 'px';
  }

  function paint() {
    var list = slides();
    if (!host || !list.length) return;
    if (idx >= list.length) idx = 0;
    var s = list[idx];
    var back = layers[1 - front];
    back.innerHTML = slideHTML(s, t(s.key));
    back.classList.add('on');
    layers[front].classList.remove('on');
    front = 1 - front;
    if (timer) { clearTimeout(timer); timer = null; }
    if (list.length > 1) {
      timer = setTimeout(function () { idx = (idx + 1) % list.length; paint(); }, s.ms);
    }
  }

  function mount() {
    host = document.getElementById('billboard');
    if (!host) return;
    host.innerHTML = '';
    layers = [];
    for (var i = 0; i < 2; i++) {
      var d = document.createElement('div');
      d.className = 'bb-layer';
      host.appendChild(d);
      layers.push(d);
    }
    lockHeight(slides());
    paint();
  }

  var rT;
  window.addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () { lockHeight(slides()); }, 200);
  });
  document.addEventListener('aplusz:lang', function () { if (host) { lockHeight(slides()); paint(); } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
