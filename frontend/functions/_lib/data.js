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

// Unwrap a payload to the row collection regardless of envelope shape.
// Accepts: bare array · bare object-map · {cities:[…]} · {routes:{…}} · {data:…}
// Returns an array of row objects.
function rowsOf(raw, ...arrayKeys) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  for (const k of arrayKeys) {
    if (raw[k] != null) {
      const inner = raw[k];
      if (Array.isArray(inner)) return inner;
      if (inner && typeof inner === 'object')
        return Object.entries(inner).map(([key, v]) =>
          (v && typeof v === 'object') ? { __key: key, ...v } : { __key: key, value: v });
    }
  }
  // Fallback: treat the object itself as a map (legacy shape)
  return Object.entries(raw).map(([key, v]) =>
    (v && typeof v === 'object') ? { __key: key, ...v } : { __key: key, value: v });
}

// Resolve a localized/plain name from a row. Handles names:{en,fr,…} maps.
function nameOf(row, iata) {
  if (row.names && typeof row.names === 'object') {
    return norm(row.names.en || row.names[Object.keys(row.names)[0]] || iata);
  }
  return norm(row.name || row.city || row.cityName || row.title || iata);
}

// cities.json → Map(IATA → {iata,name,names,country}) + Map(slug → IATA)
let _cities = null, _slugToIata = null;
export async function loadCities(fetchFn) {
  if (_cities) return { byIata: _cities, bySlug: _slugToIata };
  const raw = await fetchData(fetchFn, null, CONFIG.CITIES_FILE);
  _cities = new Map(); _slugToIata = new Map();
  if (!raw) return { byIata: _cities, bySlug: _slugToIata };

  const rows = rowsOf(raw, 'cities');

  for (const row of rows) {
    const iata = up(row.iata || row.code || row.id || row.__key);
    if (!iata) continue;
    const names = (row.names && typeof row.names === 'object') ? row.names : null;
    const name = nameOf(row, iata);
    const country = norm(row.country || row.countryName || row.cc || '');
    _cities.set(iata, { iata, name, names, country });

    // Register slug for the primary name, the IATA, and every localized name —
    // so /fr/flights/<localized>-to-… resolves too. First writer wins on clash.
    const reg = s => { const sl = slug(s); if (sl && !_slugToIata.has(sl)) _slugToIata.set(sl, iata); };
    reg(name);
    reg(iata);
    if (names) for (const v of Object.values(names)) reg(v);
  }
  return { byIata: _cities, bySlug: _slugToIata };
}

// Read one origin's routes → normalized [{to, price, currency, low, depart, book, dropPct}]
// Handles {routes:{…}} envelope, object-map, and arrays, with field auto-detect.
export async function loadRoutes(fetchFn, originIata) {
  const raw = await fetchData(fetchFn, up(originIata));
  if (!raw) return [];
  const rows = rowsOf(raw, 'routes');

  const pick = (o, keys) => { for (const k of keys) if (o[k] != null) return o[k]; return null; };
  const out = [];
  for (const r of rows) {
    const to = up(pick(r, ['to', 'dest', 'destination', 'iata', 'code', '__key']));
    if (!to) continue;
    const price = Number(pick(r, ['price', 'priceBase', 'value', 'lowest', 'min', 'amount', 'fare', 'value']));
    if (!Number.isFinite(price) || price <= 0) continue;   // quality gate: priced routes only
    out.push({
      to,
      price,
      currency: norm(pick(r, ['currency', 'cur', 'ccy'])) || 'EUR',
      low: Number(pick(r, ['low', 'min6', 'historic_low', 'sixMonthLow'])) || null,
      depart: norm(pick(r, ['depart', 'date', 'departDate', 'best_date', 'bestDate', 'bestDeparture'])) || null,
      book: norm(pick(r, ['book', 'url', 'link', 'deeplink'])) || null,
      dropPct: Number(pick(r, ['dropPct', 'drop_pct', 'dropPercent'])) || 0,
    });
  }
  out.sort((a, b) => a.price - b.price);
  return out;
}
