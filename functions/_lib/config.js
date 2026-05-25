// ── AplusZ route-page generator · CONFIG ──────────────────────────────
// Every site-specific value lives here. The engine self-adapts to your
// data shapes; this is the only place to touch.
export const CONFIG = {
  SITE: 'https://aplusz.app',
  API: 'https://api.aplusz.app',        // Worker base (feedback POST, etc.)
  BRAND: 'AplusZ',
  // Data path relative to site root. Pages serves /frontend, so /data resolves
  // to frontend/data. Loader probes the list in order; a wrong guess self-heals.
  DATA_BASES: ['/data', '/assets/data', '/'],
  CITIES_FILE: 'cities.json',          // IATA → {name,country,...} lookup
  // Your published languages (matches frontend/i18n/*.json exactly).
  // en is x-default. Any missing string falls back to en — never breaks.
  LANGS: ['ar','bn','de','en','es','fa','fr','hi','id','it',
          'ja','ko','nl','pl','pt','ru','th','tr','vi','zh'],
  RTL: ['ar','fa'],
  // SEO rollout control — quality over volume. A young domain must NOT be
  // flooded with millions of thin pages. Start focused, widen by raising these.
  //
  // PHASE 1 (current): 30 top global hubs × 40 dests × 20 langs ≈ 24k URLs.
  // Strong, fully-indexable core for a new domain. To WIDEN later: add codes
  // to ORIGIN_ALLOWLIST (or set it to null for ALL origins) and/or raise
  // MAX_DESTS_PER_ORIGIN, then re-run scripts/build-sitemaps.mjs.
  MAX_DESTS_PER_ORIGIN: 40,            // top N priced routes per origin in sitemaps
  ORIGIN_ALLOWLIST: [
    'PAR','LON','NYC','BKK','TYO','SIN','HKG','DXB','IST','MAD',
    'BCN','ROM','AMS','FRA','LIS','DUB','LAX','SFO','MIA','CHI',
    'MEX','GRU','DEL','BOM','KUL','CGK','ICN','SYD','MEL','JNB'
  ],
  // Click handoff. SAFE BY DESIGN: CTA deep-links into your live app result
  // view, which already carries the PROVEN tracked affiliate link (tp.media,
  // trs 531148). No bare/untracked link can ever ship from here. Confirm your
  // app's real query param names against app.js/result.js when convenient.
  appLink: (fromIata, toIata, lang) =>
    `${CONFIG.SITE}/?from=${fromIata}&to=${toIata}&lang=${lang}&utm_source=route-page`,
  // IndexNow (instant Bing/Yandex/Seznam indexing). Optional accelerator.
  // 1) put any 32+ hex chars in INDEXNOW_KEY, 2) the build script hosts it at
  // /<key>.txt for you. '' = disabled.
  INDEXNOW_KEY: '',
};
