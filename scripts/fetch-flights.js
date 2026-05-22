/* ============================================================
   APlusZ — Global Flight Data Fetcher (MAX coverage)
   File: scripts/fetch-flights.js
   Save: D:\Destop\AplusZ\scripts\fetch-flights.js

   Origins read from frontend/data/cities.json (~2000 flyable cities).
   For each origin we pull the MAXIMUM routes the API allows via
   v2/prices/latest (limit=1000, one-way, cheapest per destination).
   We keep the cheapest fare per destination and write one chunk
   per origin:  frontend/data/<ORIGIN>.json  + index.json (manifest)
   ============================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN  = process.env.TRAVELPAYOUTS_TOKEN  || '';
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '531148';
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
  return 'https://www.aviasales.com/search/' + o + ddmm(dep) + d + '1?marker=' + MARKER;
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

  const routes = {};
  let n = 0;
  for (const r of res.data) {
    const d = r.destination;
    if (!d || d === origin || typeof r.value !== 'number') continue;
    // keep cheapest per destination
    if (routes[d] && routes[d].priceBase <= Math.round(r.value)) continue;
    const dep = (r.depart_date || '').slice(0, 10);
    routes[d] = {
      origin: origin,
      destination: d,
      bestDeparture: dep,
      bestBooking: new Date().toISOString().slice(0, 10),
      priceBase: Math.round(r.value),
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

  for (const origin of ORIGINS) {
    try {
      const chunk = await fetchOrigin(origin);
      if (chunk) {
        fs.writeFileSync(path.join(outDir, origin + '.json'), JSON.stringify(chunk));
        manifest.push(origin);
        totalRoutes += chunk.count;
        okOrigins++;
      } else { failOrigins++; }
    } catch (e) {
      console.error('Failed ' + origin + ':', e.message);
      failOrigins++;
    }
    await new Promise(r => setTimeout(r, 200)); // polite rate limit
  }

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

  console.log('Done. ' + okOrigins + ' origins ok, ' + failOrigins + ' empty, ' + totalRoutes + ' routes.');
}

main().catch((e) => { console.error(e); process.exit(1); });
