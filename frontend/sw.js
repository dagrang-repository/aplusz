/* ============================================================
   APlusZ — Service Worker (Step 7)
   File: frontend/sw.js
   Save: D:\Destop\AplusZ\frontend\sw.js
   ============================================================ */

const CACHE_VERSION = 'aplusz-v1';
const STATIC_CACHE = CACHE_VERSION + '-static';
const DATA_CACHE = CACHE_VERSION + '-data';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/apz.webmanifest',
  '/assets/tokens.css',
  '/assets/detect.js',
  '/assets/i18n.js',
  '/i18n/en.json',
  '/i18n/fr.json',
  '/i18n/es.json',
  '/i18n/de.json',
  '/i18n/ja.json',
  '/i18n/zh.json'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

/* ---------- ACTIVATE (clean old caches) ---------- */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf(CACHE_VERSION) !== 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // 1. Navigation requests -> network first, fallback offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(function () {
        return caches.match(OFFLINE_URL).then(function (r) {
          return r || new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // 2. Flight data JSON -> stale-while-revalidate
  if (url.pathname.indexOf('/data/') === 0 || url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(DATA_CACHE).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var network = fetch(req).then(function (resp) {
            if (resp && resp.ok) cache.put(req, resp.clone());
            return resp;
          }).catch(function () { return cached; });
          return cached || network;
        });
      })
    );
    return;
  }

  // 3. Static assets -> cache first
  event.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (resp) {
        if (resp && resp.ok && resp.type === 'basic') {
          var copy = resp.clone();
          caches.open(STATIC_CACHE).then(function (c) { c.put(req, copy); });
        }
        return resp;
      }).catch(function () {
        return caches.match(OFFLINE_URL);
      });
    })
  );
});

/* ---------- MESSAGE (manual update trigger) ---------- */
self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
