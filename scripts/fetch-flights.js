/* ============================================================
   APlusZ — Weekly Flight Data Fetcher (Step 13)
   File: scripts/fetch-flights.js
   Save: D:\Destop\AplusZ\scripts\fetch-flights.js

   Uses Travelpayouts Data API (free for affiliates):
   https://support.travelpayouts.com/hc/en-us/categories/200358578
   ============================================================ */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN  = process.env.TRAVELPAYOUTS_TOKEN  || '';
const MARKER = process.env.TRAVELPAYOUTS_MARKER || '';

// Top 200 worldwide routes — origin/destination IATA codes
// These are the most-searched routes; expand later as needed.
const ROUTES = [
  // Europe ↔ Europe
  ['CDG','LHR'],['CDG','MAD'],['CDG','FCO'],['CDG','BCN'],['CDG','LIS'],
  ['CDG','AMS'],['CDG','BER'],['CDG','MUC'],['CDG','ZRH'],['CDG','VIE'],
  ['CDG','ATH'],['CDG','IST'],['CDG','DUB'],['CDG','CPH'],['CDG','OSL'],
  ['LHR','JFK'],['LHR','LAX'],['LHR','SFO'],['LHR','DXB'],['LHR','SIN'],
  // Europe ↔ North America
  ['CDG','JFK'],['CDG','LAX'],['CDG','SFO'],['CDG','YYZ'],['CDG','YUL'],
  ['CDG','MIA'],['CDG','BOS'],['CDG','ORD'],['CDG','SEA'],['CDG','ATL'],
  // Europe ↔ Asia
  ['CDG','NRT'],['CDG','HND'],['CDG','ICN'],['CDG','PEK'],['CDG','PVG'],
  ['CDG','HKG'],['CDG','SIN'],['CDG','BKK'],['CDG','KUL'],['CDG','MNL'],
  ['CDG','DEL'],['CDG','BOM'],['CDG','DXB'],['CDG','DOH'],['CDG','AUH'],
  // Europe ↔ Australia/Africa
  ['CDG','SYD'],['CDG','MEL'],['CDG','AKL'],['CDG','CPT'],['CDG','JNB'],
  ['CDG','CAI'],['CDG','CMN'],['CDG','TUN'],['CDG','DKR'],['CDG','NBO'],
  // Asia ↔ Asia
  ['NRT','ICN'],['NRT','HKG'],['NRT','BKK'],['NRT','SIN'],['NRT','TPE'],
  ['HKG','SIN'],['HKG','BKK'],['HKG','MNL'],['HKG','TPE'],['HKG','NRT'],
  ['SIN','BKK'],['SIN','KUL'],['SIN','CGK'],['SIN','MNL'],['SIN','HAN'],
  // Americas
  ['JFK','LAX'],['JFK','SFO'],['JFK','MIA'],['JFK','LAS'],['JFK','ORD'],
  ['LAX','HNL'],['LAX','NRT'],['LAX','ICN'],['LAX','SYD'],['LAX','MEX'],
  ['YYZ','LHR'],['YYZ','CDG'],['YYZ','HKG'],['YYZ','DEL'],['YYZ','LAX'],
  // Hubs
  ['DXB','LHR'],['DXB','BOM'],['DXB','DEL'],['DXB','BKK'],['DXB','SIN'],
  ['IST','CDG'],['IST','LHR'],['IST','DXB'],['IST','JFK'],['IST','NRT']
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'X-Access-Token': TOKEN } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchCheapestForRoute(origin, dest) {
  // Travelpayouts API v2 — cheapest tickets month by month
  const url = `https://api.travelpayouts.com/v2/prices/latest?origin=${origin}&destination=${dest}&beginning_of_period=${new Date().toISOString().slice(0,10)}&period_type=year&limit=30&currency=eur&sorting=price`;
  try {
    const res = await fetchJson(url);
    if (!res.success || !res.data || res.data.length === 0) return null;
    // Find absolute lowest in the period
    const lowest = res.data.reduce((a, b) => (a.value < b.value ? a : b));
    return {
      origin: origin,
      destination: dest,
      bestDeparture: lowest.depart_date,
      bestBooking: lowest.found_at ? lowest.found_at.slice(0, 10) : new Date().toISOString().slice(0,10),
      priceBase: Math.round(lowest.value),
      currency: 'EUR',
      airline: lowest.gate || lowest.airline || '',
      confidence: res.data.length >= 12 ? 'high' : res.data.length >= 6 ? 'medium' : 'low',
      sample_size: res.data.length,
      updated: new Date().toISOString()
    };
  } catch (e) {
    console.error(`Failed ${origin}-${dest}:`, e.message);
    return null;
  }
}

async function main() {
  if (!TOKEN) {
    console.error('Missing TRAVELPAYOUTS_TOKEN');
    process.exit(1);
  }

  console.log(`Fetching ${ROUTES.length} routes…`);
  const results = {};
  let ok = 0, fail = 0;

  for (const [o, d] of ROUTES) {
    const data = await fetchCheapestForRoute(o, d);
    if (data) {
      results[`${o}-${d}`] = data;
      ok++;
    } else {
      fail++;
    }
    // Rate limit politely
    await new Promise(r => setTimeout(r, 200));
  }

  const outDir = path.join(__dirname, '..', 'frontend', 'data');
  fs.mkdirSync(outDir, { recursive: true });

  // Single big file (CDN-friendly, one fetch from client)
  fs.writeFileSync(
    path.join(outDir, 'routes.json'),
    JSON.stringify({
      version: 1,
      generated: new Date().toISOString(),
      count: Object.keys(results).length,
      routes: results
    }, null, 0)
  );

  // Metadata only (for dashboards / health checks)
  fs.writeFileSync(
    path.join(outDir, 'meta.json'),
    JSON.stringify({
      generated: new Date().toISOString(),
      total_routes: ROUTES.length,
      successful: ok,
      failed: fail,
      marker: MARKER ? 'set' : 'missing'
    }, null, 2)
  );

  console.log(`Done. ${ok} ok, ${fail} failed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
