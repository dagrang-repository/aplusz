/* ============================================================
   APlusZ — Global Flight Data Fetcher (MAX coverage)
   File: scripts/fetch-flights.js
   Save: D:\Destop\AplusZ\scripts\fetch-flights.js

   Origins are read from frontend/data/cities.json (built by
   build-cities.js — ~2000 real flyable cities). For each origin,
   ONE call to v1/city-directions returns its cheapest fares to ALL
   destinations. We write one chunk per origin:
     frontend/data/<ORIGIN>.json  + frontend/data/index.json (manifest)
   This is the maximum origin coverage the data source supports.
   Falls back to a built-in hub list if cities.json is absent.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN  = process.env.TRAVELPAYOUTS_TOKEN  || '';
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '531148';
const CURRENCY = 'eur';

const outDir = path.join(__dirname, '..', 'frontend', 'data');

/* fallback hubs if cities.json missing (keeps the job alive) */
const FALLBACK = [
  'PAR','LON','AMS','FRA','MAD','BCN','ROM','MIL','LIS','ZRH','VIE','MUC','BER','DUB','CPH',
  'OSL','STO','HEL','BRU','GVA','ATH','IST','PRG','WAW','BUD','MAN','EDI','NCE','LYS',
  'DXB','AUH','DOH','JED','RUH','TLV','CAI','CMN','TUN','ALG','NBO','JNB','CPT','LOS','ADD',
  'BKK','SIN','KUL','HKG','TPE','ICN','TYO','OSA','PEK','SHA','CAN','DEL','BOM','BLR','MAA',
  'HYD','CCU','CMB','DAC','KTM','HAN','SGN','MNL','CGK','DPS','SYD','MEL','BNE','PER','AKL',
  'NYC','LAX','SFO','CHI','MIA','BOS','WAS','SEA','LAS','ATL','DFW','DEN','IAH','YTO','YVR',
  'YUL','MEX','CUN','BOG','MDE','LIM','SCL','EZE','GRU','RIO','PTY','SJO','HAV'
];

function loadOrigins() {
  try {
    const raw = fs.readFileSync(path.join(outDir, 'cities.json'), 'utf8');
    const j = JSON.parse(raw);
    if (j && Array.isArray(j.cities) && j.cities.length) {
      const codes = j.cities.map(function (c) { return c.code; }).filter(Boolean);
      // de-dupe, keep order
      const seen = {}, out = [];
      codes.forEach(function (c) { if (!seen[c]) { seen[c] = 1; out.push(c); } });
      console.log('Origins from cities.json: ' + out.length);
      return out;
    }
  } catch (e) {
    console.error('cities.json not usable (' + e.message + ') — using fallback hub list.');
  }
  console.log('Origins from fallback: ' + FALLBACK.length);
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

function ddmm(iso) {
  if (!iso || iso.length < 10) return '';
  return iso.slice(8, 10) + iso.slice(5, 7);
}
function bookLink(o, d, dep) {
  var seg = o + ddmm(dep) + d + '1';
  return 'https://www.aviasales.com/search/' + seg + '?marker=' + MARKER;
}

async function fetchOrigin(origin) {
  const url = 'https://api.travelpayouts.com/v1/city-directions'
    + '?origin=' + origin + '&currency=' + CURRENCY;
  const res = await fetchJson(url);
  if (!res || !res.success || !res.data || typeof res.data !== 'object') {
    return null;
  }
  const routes = {};
  let n = 0;
  for (const d in res.data) {
    if (!d || d === origin) continue;
    const r = res.data[d];
    if (!r || typeof r.price !== 'number') continue;
    const dep = (r.departure_at || '').slice(0, 10);
    routes[d] = {
      origin: origin,
      destination: d,
      bestDeparture: dep,
      bestBooking: new Date().toISOString().slice(0, 10),
      priceBase: Math.round(r.price),
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
