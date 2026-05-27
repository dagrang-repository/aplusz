/* ============================================================
   APlusZ — Service Worker (Step 7 · fast + auto-fresh)
   File: frontend/sw.js
   Save: D:\Destop\AplusZ\frontend\sw.js

   Strategy (fast first, always self-freshening):
     • CSS, JS, i18n JSON, flight data
         -> STALE-WHILE-REVALIDATE: serve from cache INSTANTLY (zero
            latency) and refresh in the background for next time.
     • Icons / fonts / images -> CACHE-FIRST immutable (never refetch).
     • Navigations (page loads) -> NETWORK-FIRST with a 2.5s timeout,
            falling back to cached shell, then /offline.html.
     • Auto-version: cache name derives from /version.json (written on
            every deploy by a 1-line GitHub Action). New deploy => new
            cache name => old caches purged on activate. No manual bumps.
   ============================================================ */

const FALLBACK_VERSION = 'static';          // used only if version.json is unreachable
const OFFLINE_URL = '/offline.html';
const NAV_TIMEOUT = 2500;                    // ms before a slow navigation falls back to cache
const CACHE_PREFIX = 'aplusz';

let STATIC_CACHE = CACHE_PREFIX + '-static-' + FALLBACK_VERSION;
let DATA_CACHE   = CACHE_PREFIX + '-data-'   + FALLBACK_VERSION;

const STATIC_ASSETS = [
  '/', '/index.html', '/offline.html', '/apz.webmanifest',
  '/assets/bundle.css', '/assets/tokens.css', '/assets/detect.js', '/assets/i18n.js',
  '/i18n/ar.json','/i18n/bn.json','/i18n/de.json','/i18n/en.json',
  '/i18n/es.json','/i18n/fa.json','/i18n/fr.json','/i18n/hi.json',
  '/i18n/id.json','/i18n/it.json','/i18n/ja.json','/i18n/ko.json',
  '/i18n/nl.json','/i18n/pl.json','/i18n/pt.json','/i18n/ru.json',
  '/i18n/th.json','/i18n/tr.json','/i18n/vi.json','/i18n/zh.json'
];

/* immutable assets that never change content under the same name */
function isImmutable(url) {
  return /\/assets\/icons\//.test(url.pathname) ||
         /\.(?:png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|otf)$/i.test(url.pathname);
}

/* ---------- resolve deploy version (auto) ---------- */
function resolveVersion() {
  return fetch('/version.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var v = (j && j.v) ? String(j.v) : FALLBACK_VERSION;
      STATIC_CACHE = CACHE_PREFIX + '-static-' + v;
      DATA_CACHE   = CACHE_PREFIX + '-data-'   + v;
      return v;
    })
    .catch(function () {
      STATIC_CACHE = CACHE_PREFIX + '-static-' + FALLBACK_VERSION;
      DATA_CACHE   = CACHE_PREFIX + '-data-'   + FALLBACK_VERSION;
      return FALLBACK_VERSION;
    });
}

/* ---------- INSTALL ---------- */
self.addEventListener('install', function (event) {
  event.waitUntil(
    resolveVersion()
      .then(function () { return caches.open(STATIC_CACHE); })
      .then(function (cache) { return cache.addAll(STATIC_ASSETS).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

/* ---------- ACTIVATE (purge any cache not matching current version) ---------- */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    resolveVersion().then(function () {
      var keep = [STATIC_CACHE, DATA_CACHE];
      return caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k.indexOf(CACHE_PREFIX + '-') === 0 && keep.indexOf(k) === -1) return caches.delete(k);
        }));
      });
    }).then(function () { return self.clients.claim(); })
  );
});

/* ---------- strategies ---------- */
function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      var network = fetch(req).then(function (resp) {
        if (resp && resp.ok && (resp.type === 'basic' || resp.type === 'cors')) {
          cache.put(req, resp.clone());
        }
        return resp;
      }).catch(function () { return cached; });
      return cached || network;          // cached served INSTANTLY when present
    });
  });
}

function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        if (resp && resp.ok && (resp.type === 'basic' || resp.type === 'cors')) { var copy = resp.clone(); cache.put(req, copy); }
        return resp;
      });
    });
  });
}

function offlineShell() {
  return caches.match(OFFLINE_URL).then(function (o) { return o || new Response('Offline', { status: 503 }); });
}

function networkFirstNav(req) {
  return new Promise(function (resolve) {
    var done = false;
    var timer = setTimeout(function () {
      if (done) return; done = true;
      caches.match(req).then(function (c) { resolve(c || offlineShell()); });
    }, NAV_TIMEOUT);

    fetch(req).then(function (resp) {
      if (done) return; done = true; clearTimeout(timer);
      if (resp && resp.ok) { var copy = resp.clone(); caches.open(STATIC_CACHE).then(function (c) { c.put(req, copy); }); }
      resolve(resp);
    }).catch(function () {
      if (done) return; done = true; clearTimeout(timer);
      caches.match(req).then(function (c) { resolve(c || offlineShell()); });
    });
  });
}

/* network-first for code (CSS/JS): always fresh; cache only as offline fallback.
   Prevents a broken/old cached script from persisting after a deploy. */
function networkFirstCode(req, cacheName) {
  return fetch(req).then(function (resp) {
    if (resp && resp.ok && (resp.type === 'basic' || resp.type === 'cors')) {
      var copy = resp.clone();
      caches.open(cacheName).then(function (c) { c.put(req, copy); });
    }
    return resp;
  }).catch(function () {
    return caches.open(cacheName).then(function (c) { return c.match(req); });
  });
}

/* ---------- FETCH ---------- */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // never intercept the version probe; never touch cross-origin (affiliate/analytics)
  if (url.pathname === '/version.json') return;
  if (url.origin !== self.location.origin) return;

  // 1. Navigations -> network-first (fast 2.5s timeout) -> cache -> offline
  if (req.mode === 'navigate') { event.respondWith(networkFirstNav(req)); return; }

  // 2. Flight data + any JSON -> stale-while-revalidate
  if (url.pathname.indexOf('/data/') === 0 || url.pathname.endsWith('.json')) {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }

  // 3. Immutable art/fonts -> cache-first (fastest, never refetched)
  if (isImmutable(url)) { event.respondWith(cacheFirst(req, STATIC_CACHE)); return; }

  // 4. Code (CSS/JS/etc, same-origin) -> stale-while-revalidate
  event.respondWith(networkFirstCode(req, STATIC_CACHE));
});

/* ---------- MESSAGE (manual update trigger) ---------- */
self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});