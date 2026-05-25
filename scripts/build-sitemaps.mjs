// node scripts/build-sitemaps.mjs   (run from repo root)
// Self-contained: no imports from functions/ (avoids ESM/CJS clashes on older
// local node). Reads frontend/data/*.json, writes frontend/sitemap.xml (index)
// + frontend/sitemaps/sitemap-N.xml. Preserves any existing <urlset> sitemap.xml
// as sitemap-core.xml. Optional IndexNow ping.
import { readFile, readdir, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// ── Mirror of functions/_lib/config.js — PHASE-1 levers. Keep in sync. ──
const CONFIG = {
  SITE: 'https://aplusz.app',
  CITIES_FILE: 'cities.json',
  LANGS: ['ar','bn','de','en','es','fa','fr','hi','id','it',
          'ja','ko','nl','pl','pt','ru','th','tr','vi','zh'],
  MAX_DESTS_PER_ORIGIN: 40,
  ORIGIN_ALLOWLIST: [
    'PAR','LON','NYC','BKK','TYO','SIN','HKG','DXB','IST','MAD',
    'BCN','ROM','AMS','FRA','LIS','DUB','LAX','SFO','MIA','CHI',
    'MEX','GRU','DEL','BOM','KUL','CGK','ICN','SYD','MEL','JNB'
  ],
  INDEXNOW_KEY: '',
};

// ── slug() — identical to functions/_lib/data.js ──
const norm = s => ('' + (s ?? '')).trim();
const slug = s => norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const ROOT = process.cwd();
const PER_FILE = 45000;
const TODAY = new Date().toISOString().slice(0, 10);

const dataDir = ['frontend/data', 'data', 'assets/data', 'public/data', '.']
  .map(d => path.join(ROOT, d)).find(d => existsSync(path.join(d, CONFIG.CITIES_FILE)));
if (!dataDir) { console.error('cities.json not found'); process.exit(1); }
const OUT = path.dirname(dataDir);
const readJson = async f => JSON.parse(await readFile(path.join(dataDir, f), 'utf8'));

// IATA → slug, from cities.json (handles {cities:[...]} envelope + names.en)
const citiesRaw = await readJson(CONFIG.CITIES_FILE);
const rows = Array.isArray(citiesRaw) ? citiesRaw
  : (citiesRaw.cities && Array.isArray(citiesRaw.cities) ? citiesRaw.cities
  : Object.entries(citiesRaw).map(([k, v]) => (v && typeof v === 'object') ? { iata: v.iata || k, ...v } : { iata: k, name: v }));
const name = new Map();
for (const r of rows) {
  const iata = String(r.iata || r.code || r.id || '').toUpperCase();
  const nm = r.name || (r.names && (r.names.en || Object.values(r.names)[0])) || r.city || iata;
  if (iata) name.set(iata, slug(nm) || slug(iata));
}

// Origins = 3-letter IATA data files that are known cities
let origins = (await readdir(dataDir))
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace(/\.json$/i, '').toUpperCase())
  .filter(o => /^[A-Z]{3}$/.test(o) && name.has(o));
if (CONFIG.ORIGIN_ALLOWLIST) origins = origins.filter(o => CONFIG.ORIGIN_ALLOWLIST.includes(o));

const pick = (o, keys) => { for (const k of keys) if (o[k] != null) return o[k]; return null; };
const urls = [];
for (const origin of origins) {
  const fromSlug = name.get(origin);
  let raw; try { raw = await readJson(`${origin}.json`); } catch { continue; }
  const recs = Array.isArray(raw) ? raw
    : (raw.routes && typeof raw.routes === 'object'
        ? Object.entries(raw.routes).map(([k, v]) => (v && typeof v === 'object') ? { to: v.to || v.destination || k, ...v } : { to: k, price: v })
        : Object.entries(raw).map(([k, v]) => (v && typeof v === 'object') ? { to: v.to || k, ...v } : { to: k, price: v }));
  const priced = recs.map(r => ({
    to: String(pick(r, ['to', 'dest', 'destination', 'iata', 'code']) || '').toUpperCase(),
    price: Number(pick(r, ['price', 'priceBase', 'value', 'lowest', 'min', 'amount', 'fare'])),
  })).filter(r => r.to && r.to !== origin && name.has(r.to) && Number.isFinite(r.price) && r.price > 0)
    .sort((a, b) => a.price - b.price).slice(0, CONFIG.MAX_DESTS_PER_ORIGIN);

  for (const r of priced) {
    const toSlug = name.get(r.to);
    for (const lang of CONFIG.LANGS) urls.push(`${CONFIG.SITE}/${lang}/flights/${fromSlug}-to-${toSlug}`);
  }
}

await mkdir(path.join(OUT, 'sitemaps'), { recursive: true });

const existingIndex = path.join(OUT, 'sitemap.xml');
let coreEntry = '';
if (existsSync(existingIndex)) {
  const cur = await readFile(existingIndex, 'utf8');
  if (cur.includes('<urlset')) {
    await rename(existingIndex, path.join(OUT, 'sitemaps', 'sitemap-core.xml'));
    coreEntry = `<sitemap><loc>${CONFIG.SITE}/sitemaps/sitemap-core.xml</loc><lastmod>${TODAY}</lastmod></sitemap>`;
  }
}

const chunks = [];
for (let i = 0; i < urls.length; i += PER_FILE) chunks.push(urls.slice(i, i + PER_FILE));
let n = 0;
for (const chunk of chunks) {
  n++;
  const body = chunk.map(u => `<url><loc>${u}</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq></url>`).join('');
  await writeFile(path.join(OUT, 'sitemaps', `sitemap-${n}.xml`),
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
}
const index = coreEntry + Array.from({ length: n }, (_, i) =>
  `<sitemap><loc>${CONFIG.SITE}/sitemaps/sitemap-${i + 1}.xml</loc><lastmod>${TODAY}</lastmod></sitemap>`).join('');
await writeFile(existingIndex,
  `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${index}</sitemapindex>`);

console.log(`Wrote ${urls.length} URLs across ${n} route sitemap(s) for ${origins.length} origins.${coreEntry ? ' Existing sitemap preserved as sitemap-core.xml.' : ''}`);

if (CONFIG.INDEXNOW_KEY) {
  await writeFile(path.join(OUT, `${CONFIG.INDEXNOW_KEY}.txt`), CONFIG.INDEXNOW_KEY);
  const host = new URL(CONFIG.SITE).host;
  for (let i = 0; i < urls.length; i += 10000) {
    try {
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ host, key: CONFIG.INDEXNOW_KEY,
          keyLocation: `${CONFIG.SITE}/${CONFIG.INDEXNOW_KEY}.txt`, urlList: urls.slice(i, i + 10000) }),
      });
      console.log(`IndexNow batch ${i / 10000 + 1}: ${res.status}`);
    } catch (e) { console.error('IndexNow error', e.message); }
  }
}
