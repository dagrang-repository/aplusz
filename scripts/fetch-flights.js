/* ============================================================
   APlusZ — Global Flight Data Fetcher (Step 13/14 — global rebuild)
   File: scripts/fetch-flights.js
   Save: D:\Destop\AplusZ\scripts\fetch-flights.js

   No fixed pairs, no Paris center. We list ~150 global ORIGIN cities;
   for each, ONE call to v2/prices/latest (destination omitted) returns
   that origin's cheapest fares to ALL its destinations. We keep the
   cheapest per destination and write one chunk per origin:
     frontend/data/<ORIGIN>.json   + frontend/data/index.json (manifest)
   Travelpayouts data is cached snapshots → meant for static pages.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN  = process.env.TRAVELPAYOUTS_TOKEN  || '';
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '531148';
const CURRENCY = 'eur';

/* ~150 global origin city codes (IATA city codes), demand-weighted, worldwide */
const ORIGINS = [
  // Europe
  'PAR','LON','AMS','FRA','MAD','BCN','ROM','MIL','LIS','ZRH','VIE','MUC','BER','DUB','CPH',
  'OSL','STO','HEL','BRU','GVA','ATH','IST','PRG','WAW','BUD','MAN','EDI','NCE','LYS',
  // Middle East / Africa
  'DXB','AUH','DOH','JED','RUH','TLV','CAI','CMN','TUN','ALG','NBO','JNB','CPT','LOS','ADD',
  'DAR','ACC','DKR','CAS',
  // Asia
  'BKK','SIN','KUL','HKG','TPE','ICN','TYO','OSA','PEK','SHA','CAN','SZX','CTU','DEL','BOM',
  'BLR','MAA','HYD','CCU','CMB','DAC','KTM','HAN','SGN','MNL','CGK','DPS','RGN','PNH',
  // Oceania
  'SYD','MEL','BNE','PER','AKL','CHC',
  // North America
  'NYC','LAX','SFO','CHI','MIA','BOS','WAS','SEA','LAS','ATL','DFW','DEN','IAH','YTO','YVR',
  'YUL','MEX','CUN','GDL','MTY',
  // Central / South America / Caribbean
  'BOG','MDE','LIM','SCL','EZE','GRU','RIO','BSB','UIO','GYE','PTY','SJO','HAV','SDQ','PUJ',
  'CCS','MVD','ASU','LPB',
  // more Asia/EU fill
  'KIX','NRT','FUK','CTS','XMN','HGH','WUH','URC','ISB','LHE','KHI','AMM','BAH','KWI','MCT',
  'TBS','EVN','BAK','ALA','TAS','SVO','LED','KBP','SOF','OTP','BEG','ZAG','LCA','MLA','KEF'
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'X-Access-Token': TOKEN } }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function ddmm(iso) { // YYYY-MM-DD -> DDMM for aviasales deep link
  if (!iso || iso.length < 10) return '';
  return iso.slice(8, 10) + iso.slice(5, 7);
}
function bookLink(o, d, dep) {
  var seg = o + ddmm(dep) + d + '1';
  return 'https://www.aviasales.com/search/' + seg + '?marker=' + MARKER;
}

async function fetchOrigin(origin) {
  // /v1/city-directions: cheapest tickets from one origin to ALL destinations.
  // Response: { success:true, data: { "<DEST>": { price, airline, departure_at, ... } } }
  const url = 'https://api.travelpayouts.com/v1/city-directions'
    + '?origin=' + origin + '&currency=' + CURRENCY;
  const res = await fetchJson(url);
  if (!res || !res.success || !res.data || typeof res.data !== 'object') {
    console.error(origin + ' -> ' + JSON.stringify(res).slice(0, 300));
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

  const outDir = path.join(__dirname, '..', 'frontend', 'data');
  fs.mkdirSync(outDir, { recursive: true });

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
    await new Promise(r => setTimeout(r, 250)); // polite rate limit
  }

  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({
    generated: new Date().toISOString(),
    marker: MARKER,
    origins: manifest.sort(),
    origin_count: manifest.length,
    total_routes: totalRoutes
  }, null, 2));

  // retire the old single-file model if present
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