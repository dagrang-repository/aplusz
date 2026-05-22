/* ============================================================
   APlusZ — Global Flight Data Fetcher (MAX coverage)
   File: scripts/fetch-flights.js
   Save: D:\Destop\AplusZ\scripts\fetch-flights.js

   Origins read from frontend/data/cities.json (~2000 flyable cities).
   For each origin we pull the MAXIMUM routes the API allows via
   v2/prices/latest (limit=1000, one-way, cheapest per destination).
   We keep the cheapest fare per destination and write one chunk
   per origin:  frontend/data/<ORIGIN>.json  + index.json (manifest)

   PRICE-DROP (Step 19B): a "drop" means a NEW ALL-TIME LOW for that route,
   not merely cheaper than yesterday. Each origin file persists per route:
     low      = lowest fare ever recorded
     lowDate  = date that all-time low was set
   Each run: if newPrice < stored low -> real drop (dropAbs/dropPct vs old
   low), then low updates. If newPrice >= low -> no drop (dropPct 0), low
   unchanged. First sighting seeds low=newPrice, dropPct 0. Self-seeding,
   no extra infra, no cron change.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN  = process.env.TRAVELPAYOUTS_TOKEN  || '';
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '531148';   // program/project ID (kept for manifest stamping)
// Travelpayouts tracked deep-link parts (verified from TP dashboard)
const TP_MARKER = '730427';   // profile ID
const TP_TRS    = MARKER;     // program/project ID (531148)
const TP_P      = '4114';     // Aviasales program code
const TP_CAMP   = '100';
const CURRENCY = 'eur';
const LIMIT = 1000;          // API hard max per request

const outDir = path.join(__dirname, '..', 'frontend', 'data');

const FALLBACK = [
  'PAR','LON','AMS','FRA','MAD','BCN','ROM','MIL','LIS','ZRH','VIE','MUC','BER','DUB','CPH',
  'BKK','SIN','KUL','HKG','TPE','ICN','TYO','OSA','PEK','SHA','DEL','BOM','DXB','DOH','IST',
  'NYC','LAX','SFO','CHI','MIA','BOS','SEA','ATL','YTO','YVR','MEX','GRU','BOG','LIM','SYD','MEL'
];

function loadOrigins() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(outDir, 'cities.json'), 'utf8'));
    if (j && Array.isArray(j.cities) && j.cities.length) {
      const seen = {}, out = [];
      j.cities.forEach(function (c) { if (c.code && !seen[c.code]) { seen[c.code] = 1; out.push(c.code); } });
      console.log('Origins from cities.json: ' + out.length);
      return out;
    }
  } catch (e) {
    console.error('cities.json not usable (' + e.message + ') — fallback list.');
  }
  return FALLBACK;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'X-Access-Token': TOKEN } }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function ddmm(iso) { return (iso && iso.length >= 10) ? iso.slice(8, 10) + iso.slice(5, 7) : ''; }
function bookLink(o, d, dep) {
  var search = 'https://www.aviasales.com/search/' + o + ddmm(dep) + d + '1';
  return 'https://tp.media/r?marker=' + TP_MARKER +
         '&trs=' + TP_TRS + '&p=' + TP_P +
         '&u=' + encodeURIComponent(search) +
         '&campaign_id=' + TP_CAMP;
}

/* load each route's ALL-TIME LOW (and the date it was set) for one origin.
   Reads whichever fields the previous file has: prefer stored `low`, else
   fall back to last priceBase so older files migrate cleanly. */
function loadLows(origin) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(outDir, origin + '.json'), 'utf8'));
    const m = {};
    if (j && j.routes) {
      for (const d in j.routes) {
        const p = j.routes[d];
        if (!p) continue;
        const low = (typeof p.low === 'number') ? p.low
                  : (typeof p.priceBase === 'number') ? p.priceBase : null;
        if (low !== null) m[d] = { low: low, lowDate: p.lowDate || (p.updated || '').slice(0,10) };
      }
    }
    return m;
  } catch (e) { return {}; }
}

/* v2/prices/latest: cheapest cached fares from one origin to ALL destinations.
   Returns { success, data:[ {origin,destination,value,depart_date,gate,...} ] } */
async function fetchOrigin(origin) {
  const url = 'https://api.travelpayouts.com/v2/prices/latest'
    + '?origin=' + origin
    + '&currency=' + CURRENCY
    + '&period_type=year'
    + '&one_way=true'
    + '&page=1'
    + '&limit=' + LIMIT
    + '&sorting=price'
    + '&token=' + TOKEN;
  const res = await fetchJson(url);
  if (!res || !res.success || !Array.isArray(res.data)) return null;

  const lows = loadLows(origin);   // all-time low per destination (persisted)
  const today = new Date().toISOString().slice(0, 10);
  const routes = {};
  let n = 0;
  for (const r of res.data) {
    const d = r.destination;
    if (!d || d === origin || typeof r.value !== 'number') continue;
    // keep cheapest per destination
    if (routes[d] && routes[d].priceBase <= Math.round(r.value)) continue;
    const dep = (r.depart_date || '').slice(0, 10);
    const newPrice = Math.round(r.value);

    const prior = lows[d] || null;         // { low, lowDate } or null
    // guard against missing/zero/negative stored lows (bad data) — reseed instead of dividing
    const priorLow = (prior && typeof prior.low === 'number' && prior.low > 0) ? prior.low : null;

    let dropAbs = 0, dropPct = 0;
    let low, lowDate;
    if (priorLow === null) {
      // first ever sighting: seed the all-time low, no drop
      low = newPrice; lowDate = today;
    } else if (newPrice < priorLow) {
      // NEW ALL-TIME LOW -> real drop, measured against the old record
      dropAbs = priorLow - newPrice;
      dropPct = Math.round((dropAbs / priorLow) * 100);
      low = newPrice; lowDate = today;
    } else {
      // not a record: keep the historic low, no drop
      low = priorLow; lowDate = prior.lowDate || '';
    }

    routes[d] = {
      origin: origin,
      destination: d,
      bestDeparture: dep,
      bestBooking: today,
      priceBase: newPrice,
      low: low,             // all-time lowest ever recorded
      lowDate: lowDate,     // date that low was set
      dropAbs: dropAbs,     // >0 only when this run set a NEW low
      dropPct: dropPct,     // >0 only when this run set a NEW low
      currency: 'EUR',
      airline: r.airline || '',
      confidence: 'high',
      book: bookLink(origin, d, dep),
      updated: new Date().toISOString()
    };
    n++;
  }
  return n ? { origin: origin, generated: new Date().toISOString(), count: n, routes: routes } : null;
}

async function main() {
  if (!TOKEN) { console.error('Missing TRAVELPAYOUTS_TOKEN'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });

  const ORIGINS = loadOrigins();
  const manifest = [];
  let totalRoutes = 0, okOrigins = 0, failOrigins = 0;
  let allDrops = [];   // 19B: collect every route that dropped

  for (const origin of ORIGINS) {
    try {
      const chunk = await fetchOrigin(origin);
      if (chunk) {
        fs.writeFileSync(path.join(outDir, origin + '.json'), JSON.stringify(chunk));
        manifest.push(origin);
        totalRoutes += chunk.count;
        okOrigins++;
        for (const d in chunk.routes) {
          const r = chunk.routes[d];
          if (r.dropPct > 0) allDrops.push({
            origin: r.origin, destination: r.destination,
            priceBase: r.priceBase, low: r.low, lowDate: r.lowDate,
            dropAbs: r.dropAbs, dropPct: r.dropPct,
            currency: r.currency, bestDeparture: r.bestDeparture, book: r.book
          });
        }
      } else { failOrigins++; }
    } catch (e) {
      console.error('Failed ' + origin + ':', e.message);
      failOrigins++;
    }
    await new Promise(r => setTimeout(r, 200)); // polite rate limit
  }

  // 19B: biggest price drops across all origins (top 100)
  allDrops.sort(function (a, b) { return (b.dropPct - a.dropPct) || (b.dropAbs - a.dropAbs); });
  fs.writeFileSync(path.join(outDir, 'drops.json'), JSON.stringify({
    generated: new Date().toISOString(),
    marker: MARKER,
    count: Math.min(allDrops.length, 100),
    drops: allDrops.slice(0, 100)
  }));

  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({
    generated: new Date().toISOString(),
    marker: MARKER,
    origins: manifest.sort(),
    origin_count: manifest.length,
    total_routes: totalRoutes
  }, null, 2));

  try { fs.unlinkSync(path.join(outDir, 'routes.json')); } catch (e) {}

  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({
    generated: new Date().toISOString(),
    origins_ok: okOrigins,
    origins_failed: failOrigins,
    total_routes: totalRoutes,
    marker: MARKER ? 'set' : 'missing'
  }, null, 2));

  console.log('Done. ' + okOrigins + ' origins ok, ' + failOrigins + ' empty, ' + totalRoutes + ' routes, ' + allDrops.length + ' drops.');
}

main().catch((e) => { console.error(e); process.exit(1); });
