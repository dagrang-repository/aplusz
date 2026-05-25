// ── Data layer · self-adapting loaders ───────────────────────────────
import { CONFIG } from './config.js';

const norm = s => ('' + (s ?? '')).trim();
const up = s => norm(s).toUpperCase();

// Strip diacritics, lowercase, hyphenate → URL slug. "São Paulo" → "sao-paulo"
export const slug = s => norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Probe DATA_BASES until the file fetches with 200. Caches the winning base.
let _base = null;
async function fetchData(fetchFn, origin, file) {
  const bases = _base ? [_base, ...CONFIG.DATA_BASES] : CONFIG.DATA_BASES;
  const name = file || `${origin}.json`;
  for (const b of bases) {
    const url = `${CONFIG.SITE}${b}/${name}`.replace(/([^:])\/\/+/g, '$1/');
    try {
      const r = await fetchFn(url);
      if (r.ok) { _base = b; return await r.json(); }
    } catch (_) { /* try next base */ }
  }
  return null;
}

// cities.json → Map(IATA → {iata,name,country}) + Map(slug → IATA)
let _cities = null, _slugToIata = null;
export async function loadCities(fetchFn) {
  if (_cities) return { byIata: _cities, bySlug: _slugToIata };
  const raw = await fetchData(fetchFn, null, CONFIG.CITIES_FILE);
  _cities = new Map(); _slugToIata = new Map();
  if (!raw) return { byIata: _cities, bySlug: _slugToIata };

  const rows = Array.isArray(raw) ? raw : Object.entries(raw).map(([k, v]) =>
    (v && typeof v === 'object') ? { iata: v.iata || v.code || v.id || k, ...v } : { iata: k, name: v });

  for (const row of rows) {
    const iata = up(row.iata || row.code || row.id);
    if (!iata) continue;
    const name = norm(row.name || row.city || row.cityName || row.title || iata);
    const country = norm(row.country || row.countryName || row.cc || '');
    _cities.set(iata, { iata, name, country });
    _slugToIata.set(slug(name), iata);
    _slugToIata.set(slug(iata), iata);        // allow IATA-slug URLs too
  }
  return { byIata: _cities, bySlug: _slugToIata };
}

// Read one origin's routes → normalized [{to, price, currency, low, dates}]
// Handles object-map (key = dest IATA) and arrays, with field auto-detect.
export async function loadRoutes(fetchFn, originIata) {
  const raw = await fetchData(fetchFn, up(originIata));
  if (!raw) return [];
  const rows = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([k, v]) =>
        (v && typeof v === 'object') ? { to: v.to || v.dest || v.destination || k, ...v } : { to: k, price: v });

  const pick = (o, keys) => { for (const k of keys) if (o[k] != null) return o[k]; return null; };
  const out = [];
  for (const r of rows) {
    const to = up(pick(r, ['to', 'dest', 'destination', 'iata', 'code']));
    if (!to) continue;
    const price = Number(pick(r, ['price', 'value', 'lowest', 'min', 'amount', 'fare']));
    if (!Number.isFinite(price) || price <= 0) continue;   // quality gate: priced routes only
    out.push({
      to,
      price,
      currency: norm(pick(r, ['currency', 'cur', 'ccy'])) || 'EUR',
      low: Number(pick(r, ['low', 'min6', 'historic_low', 'sixMonthLow'])) || null,
      depart: norm(pick(r, ['depart', 'date', 'departDate', 'best_date', 'bestDate'])) || null,
    });
  }
  out.sort((a, b) => a.price - b.price);
  return out;
}
