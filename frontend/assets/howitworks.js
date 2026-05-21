/* How it works — i18n-aware modal (no page leave).
   Hooks into APlusZ.i18n: reads hiw.* keys from i18n/<code>.json,
   localizes city names + best dates (Intl), re-renders on language change.
   Falls back to English if a key is missing so it never shows raw keys. */
(function () {
  var APZ = window.APlusZ = window.APlusZ || {};
  var SUPPORTED = ['en','zh','es','hi','ar','fr','pt','ru','ja','de','ko','it','tr','vi','id','th','nl','pl','bn','fa'];
  var LOCALE = {
    en:'en-GB', zh:'zh-CN', es:'es-ES', hi:'hi-IN', ar:'ar', fr:'fr-FR', pt:'pt-PT',
    ru:'ru-RU', ja:'ja-JP', de:'de-DE', ko:'ko-KR', it:'it-IT', tr:'tr-TR', vi:'vi-VN',
    id:'id-ID', th:'th-TH', nl:'nl-NL', pl:'pl-PL', bn:'bn-BD', fa:'fa-IR'
  };
  var RTL = ['ar','fa'];

  /* English fallback — modal works even before JSON blocks are merged */
  var EN = {
    'hiw.link':'How it works','hiw.title':'How it works',
    'hiw.concept':'A+Z.app fulfils your flying needs. Set two cities — we find the lowest possible price and the best date to book. We do the heavy lifting so you fly {i}for{/i} {hl}LESS{/hl}.',
    'hiw.foot':'Your two cities are saved automatically — until you change them.',
    'hiw.nav.back':'Back','hiw.nav.next':'Next','hiw.nav.done':'Got it',
    'hiw.s1.step':'A → Z','hiw.s1.body':'Pick your two cities.',
    'hiw.s2.step':'Scan','hiw.s2.head':'Scan','hiw.s2.body':'We sweep months of dates for the lowest fare.',
    'hiw.s3.step':'Book that flight','hiw.s3.head':'Book that flight','hiw.s3.body':'Cheapest price + best day shown. 10-min timer before the price disappears.',
    'hiw.demo.untaxed':'lowest ever, without tax','hiw.demo.book':'Book that flight',
    'hiw.cities.paris':'Paris','hiw.cities.newyork':'New York','hiw.cities.bangkok':'Bangkok',
    'hiw.cities.tokyo':'Tokyo','hiw.cities.marrakech':'Marrakech','hiw.cities.london':'London',
    'hiw.cities.bali':'Bali','hiw.cities.madrid':'Madrid','hiw.cities.cancun':'Cancún','hiw.cities.lisbon':'Lisbon'
  };

  /* historical-low one-way fares, EUR, without tax — illustrative demo */
  var PAIRS = [
    { a:'paris',  b:'newyork',  y:2026, m:7,  d:14, price:'€198' },
    { a:'paris',  b:'bangkok',  y:2026, m:9,  d:9,  price:'€342' },
    { a:'paris',  b:'tokyo',    y:2026, m:10, d:1,  price:'€405' },
    { a:'paris',  b:'marrakech',y:2026, m:6,  d:8,  price:'€39'  },
    { a:'london', b:'bali',     y:2026, m:8,  d:25, price:'€388' },
    { a:'madrid', b:'cancun',   y:2026, m:9,  d:16, price:'€276' },
    { a:'paris',  b:'lisbon',   y:2026, m:6,  d:6,  price:'€29'  }
  ];

  var modal, slides, dots, nextBtn, backBtn, footLink, idx = 0, demoTimer, pairIdx = 0;
  var LAST = 2; /* last slide index */

  function code() {
    var c = (APZ.detect && APZ.detect.lang) || 'en';
    c = ('' + c).toLowerCase();
    return SUPPORTED.indexOf(c) > -1 ? c : 'en';
  }
  function L(k) {
    var v = (APZ.i18n && APZ.i18n.t) ? APZ.i18n.t(k) : k;
    if (v && v !== k) return v;
    return EN[k] != null ? EN[k] : k;
  }
  function city(key) { return L('hiw.cities.' + key); }
  function fmtDate(p) {
    try {
      return new Intl.DateTimeFormat(LOCALE[code()] || 'en-GB',
        { weekday:'long', day:'numeric', month:'long', year:'numeric' })
        .format(new Date(p.y, p.m - 1, p.d));
    } catch (e) { return p.d + '/' + p.m + '/' + p.y; }
  }
  function rich(s) {
    return s.replace(/\{i\}([\s\S]*?)\{\/i\}/g, '<em>$1</em>')
            .replace(/\{hl\}([\s\S]*?)\{\/hl\}/g, '<span class="hiw-less">$1</span>');
  }
  function q(sel) { return modal.querySelector(sel); }

  function build() {
    modal = document.createElement('dialog');
    modal.id = 'hiw-modal';
    modal.innerHTML =
      '<div class="hiw-card">' +
        '<div class="hiw-top"><div class="hiw-title js-title"></div>' +
        '<button class="hiw-x" aria-label="Close">✕</button></div>' +
        '<p class="hiw-concept js-concept"></p>' +
        '<div class="hiw-stage">' +
          '<div class="hiw-slide is-active">' +
            '<div class="hiw-step js-s1step"></div>' +
            '<div class="hiw-route"><span class="js-c1a"></span>' +
            '<span class="arr">→</span><span class="js-c1b"></span></div>' +
            '<p class="hiw-body js-s1body" style="margin-top:10px"></p></div>' +
          '<div class="hiw-slide">' +
            '<div class="hiw-step js-s2step"></div>' +
            '<div class="hiw-head js-s2head"></div>' +
            '<p class="hiw-body js-s2body"></p></div>' +
          '<div class="hiw-slide">' +
            '<div class="hiw-step js-s3step"></div>' +
            '<div class="hiw-head js-s3head"></div>' +
            '<p class="hiw-body js-s3body"></p>' +
            '<div class="hiw-demo">' +
              '<div class="hiw-demo-route"><span class="d-from"></span>' +
              '<span class="arr">→</span><span class="d-to"></span></div>' +
              '<div class="hiw-price"></div>' +
              '<div class="hiw-date"></div>' +
              '<div class="hiw-timer">⏱ 10:00 · <span class="js-untaxed"></span></div>' +
              '<button class="hiw-book js-book" type="button"></button>' +
            '</div></div>' +
        '</div>' +
        '<div class="hiw-nav">' +
          '<button class="hiw-back js-back" type="button" hidden></button>' +
          '<div class="hiw-dots"><span class="hiw-dot on"></span>' +
          '<span class="hiw-dot"></span><span class="hiw-dot"></span></div>' +
          '<button class="hiw-next js-next" type="button"></button></div>' +
        '<p class="hiw-foot js-foot"></p>' +
      '</div>';

    document.body.appendChild(modal);
    slides = modal.querySelectorAll('.hiw-slide');
    dots = modal.querySelectorAll('.hiw-dot');
    nextBtn = q('.js-next');
    backBtn = q('.js-back');

    nextBtn.addEventListener('click', next);
    backBtn.addEventListener('click', function () { if (idx > 0) go(idx - 1); });
    q('.hiw-x').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.addEventListener('close', stopDemo);
  }

  /* set every string from the active language (or EN fallback) */
  function apply() {
    if (!modal) return;
    modal.setAttribute('dir', RTL.indexOf(code()) > -1 ? 'rtl' : 'ltr');
    q('.js-title').textContent = L('hiw.title');
    q('.js-concept').innerHTML = rich(L('hiw.concept'));
    q('.js-foot').textContent = L('hiw.foot');
    q('.js-s1step').textContent = L('hiw.s1.step');
    q('.js-s1body').textContent = L('hiw.s1.body');
    q('.js-c1a').textContent = city('paris');
    q('.js-c1b').textContent = city('newyork');
    q('.js-s2step').textContent = L('hiw.s2.step');
    q('.js-s2head').textContent = L('hiw.s2.head');
    q('.js-s2body').textContent = L('hiw.s2.body');
    q('.js-s3step').textContent = L('hiw.s3.step');
    q('.js-s3head').textContent = L('hiw.s3.head');
    q('.js-s3body').textContent = L('hiw.s3.body');
    q('.js-untaxed').textContent = L('hiw.demo.untaxed');
    q('.js-book').textContent = L('hiw.demo.book');
    backBtn.textContent = L('hiw.nav.back');
    if (footLink) footLink.textContent = L('hiw.link');
    refreshNav();
    renderPair();
  }

  function refreshNav() {
    nextBtn.textContent = idx === LAST ? L('hiw.nav.done') : L('hiw.nav.next');
    backBtn.hidden = idx === 0;
  }

  function go(n) {
    slides[idx].classList.remove('is-active');
    slides[idx].classList.toggle('is-prev', n > idx);
    idx = n;
    slides[idx].classList.remove('is-prev');
    slides[idx].classList.add('is-active');
    dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
    refreshNav();
    if (idx === LAST) startDemo(); else stopDemo();
  }
  function next() { if (idx === LAST) { close(); return; } go(idx + 1); }

  function renderPair() {
    var demo = modal && modal.querySelector('.hiw-demo');
    if (!demo) return;
    var p = PAIRS[pairIdx];
    demo.querySelector('.d-from').textContent = city(p.a);
    demo.querySelector('.d-to').textContent = city(p.b);
    demo.querySelector('.hiw-price').textContent = p.price;
    demo.querySelector('.hiw-date').textContent = fmtDate(p);
  }
  function startDemo() {
    stopDemo();
    var demo = modal.querySelector('.hiw-demo');
    if (!demo) return;
    renderPair();
    demoTimer = setInterval(function () {
      demo.classList.add('fading');
      setTimeout(function () {
        pairIdx = (pairIdx + 1) % PAIRS.length;
        renderPair();
        demo.classList.remove('fading');
      }, 900);
    }, 3600);
  }
  function stopDemo() {
    if (demoTimer) { clearInterval(demoTimer); demoTimer = null; }
    var demo = modal && modal.querySelector('.hiw-demo');
    if (demo) demo.classList.remove('fading');
  }

  function open() { go(0); modal.showModal(); }
  function close() { modal.close(); }

  function injectLink() {
    var footer = document.querySelector('.footer');
    if (!footer) return;
    var legal = footer.querySelector('a[href*="legal"]');
    footLink = document.createElement('button');
    footLink.className = 'hiw-link';
    footLink.type = 'button';
    footLink.addEventListener('click', open);
    var sep = document.createElement('span');
    sep.className = 'footer-sep';
    if (legal && legal.nextSibling) {
      footer.insertBefore(footLink, legal.nextSibling.nextSibling);
      footer.insertBefore(sep, footLink.nextSibling);
    } else {
      footer.insertBefore(footLink, footer.firstChild);
      footer.insertBefore(sep, footLink.nextSibling);
    }
  }

  /* re-apply whenever the site changes language */
  function hookLanguage() {
    if (APZ.i18n && typeof APZ.i18n.load === 'function') {
      var orig = APZ.i18n.load;
      APZ.i18n.load = function (lang) {
        return Promise.resolve(orig.call(APZ.i18n, lang)).then(function (d) {
          apply(); return d;
        });
      };
      APZ.i18n.load();          /* initial apply (now wrapped) */
    } else {
      apply();                  /* i18n absent → English */
    }
  }

  function init() { build(); injectLink(); hookLanguage(); }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
