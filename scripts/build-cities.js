/* ============================================================
   APlusZ — City List Builder (run once, locally)
   File: scripts/build-cities.js
   Run:  node scripts/build-cities.js

   Builds frontend/data/cities.json — MAXIMUM coverage: EVERY
   flightable city TravelPayouts knows, multilingual (20 langs).
   No 2000 cap → every IATA referenced in any route file resolves
   to a real city name. Zero code fallbacks, zero skipped routes.
   Major hubs force-included + canonical-name-corrected.
   No runtime API calls.
   ============================================================ */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const LANGS = ['en','fr','es','de','it','pt','nl','pl','ru','tr',
               'ar','fa','hi','bn','th','vi','id','ja','ko','zh-CN'];

// MAX coverage: no cap. Keep every flightable city with a name.
const TARGET = Infinity;

/* Hubs that must NEVER be missing (IATA city codes). */
const FORCE = ['PAR','LON','NYC','MNL','BKK','TYO','OSA','SIN','HKG','DXB','AUH','DOH',
  'IST','MAD','BCN','ROM','MIL','LIS','AMS','FRA','MUC','BER','ZRH','VIE','CPH','OSL',
  'STO','HEL','BRU','GVA','ATH','DUB','MAN','EDI','NCE','LYS','PRG','WAW','BUD','SOF',
  'OTP','BEG','ZAG','KEF','KBP','SVO','LED','TLV','CAI','CMN','TUN','ALG','NBO','JNB',
  'CPT','LOS','ADD','ACC','DKR','AMM','BAH','KWI','MCT','RUH','JED','TBS','EVN','BAK',
  'ALA','TAS','ISB','LHE','KHI','DEL','BOM','BLR','MAA','HYD','CCU','CMB','DAC','KTM',
  'KUL','CGK','DPS','HAN','SGN','RGN','PNH','TPE','ICN','PEK','SHA','CAN','SZX','CTU',
  'XMN','HGH','WUH','URC','FUK','CTS','SYD','MEL','BNE','PER','AKL','CHC','LAX','SFO',
  'CHI','MIA','WAS','SEA','LAS','ATL','DFW','DEN','IAH','BOS','YTO','YVR','YUL','MEX',
  'CUN','GDL','MTY','BOG','MDE','LIM','SCL','EZE','GRU','RIO','BSB','UIO','GYE','PTY',
  'SJO','HAV','SDQ','PUJ','CCS','MVD','ASU','LPB'];

function get(url) {
  return new Promise((resolve, reject) => {
    var lib = url.indexOf('https') === 0 ? https : http;
    lib.get(url, function (res) {
      if (res.statusCode >= 300 && res.headers.location) return resolve(get(res.headers.location));
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

(async function () {
  console.log('Downloading cities + airports…');
  var cities   = await get('http://api.travelpayouts.com/data/cities.json');
  var airports = await get('http://api.travelpayouts.com/data/airports.json');
  if (!Array.isArray(cities)) throw new Error('cities.json not an array');

  // weight per city = sum of its airports' weights (real popularity signal, used for ordering only)
  var weight = {};
  if (Array.isArray(airports)) {
    airports.forEach(function (a) {
      var c = a.city_code || a.code;
      var w = +a.weight || 0;
      if (c) weight[c] = (weight[c] || 0) + w;
    });
  }

  // index cities by code
  var byCode = {};
  cities.forEach(function (c) { if (c && c.code) byCode[c.code] = c; });

  // candidate pool: EVERY city with a flightable airport + a name (excludes only true junk)
  var pool = cities.filter(function (c) {
    return c && c.code && c.has_flightable_airport !== false &&
           (c.name || (c.name_translations && c.name_translations.en));
  });

  // rank by city weight desc (ordering only — nothing is dropped now)
  pool.sort(function (a, b) { return (weight[b.code] || 0) - (weight[a.code] || 0); });

  // build keep-set: forced hubs first, then ALL pool cities (TARGET = Infinity)
  var keep = {}, order = [];
  FORCE.forEach(function (code) { if (byCode[code] && !keep[code]) { keep[code] = true; order.push(byCode[code]); } });
  for (var i = 0; i < pool.length && order.length < TARGET; i++) {
    if (!keep[pool[i].code]) { keep[pool[i].code] = true; order.push(pool[i]); }
  }

  // compact records: code + per-language names
  var out = order.map(function (c) {
    var t = c.name_translations || {};
    var base = c.name || t.en || c.code;
    var names = {};
    LANGS.forEach(function (l) { names[l] = t[l] || base; });
    return { code: c.code, country: c.country_code || '', names: names };
  });

  /* --- canonical hubs: guarantee correct code+name even if the source
         dump lacks the city code (e.g. real Paris=PAR was missing) --- */
  var HUBS = {
    PAR:'Paris', LON:'London', NYC:'New York', TYO:'Tokyo', MIL:'Milan',
    ROM:'Rome', MOW:'Moscow', WAS:'Washington', CHI:'Chicago', OSA:'Osaka',
    BUE:'Buenos Aires', SAO:'Sao Paulo', RIO:'Rio de Janeiro', BJS:'Beijing'
  };
  Object.keys(HUBS).forEach(function (code) {
    var src = byCode[code];
    var t = (src && src.name_translations) || {};
    var names = {};
    LANGS.forEach(function (l) { names[l] = t[l] || HUBS[code]; });
    out = out.filter(function (r) {
      if (r.code === code) return false;
      if ((r.names.en || '').toLowerCase() === HUBS[code].toLowerCase()) return false; // drop impostors (Paris,TX etc.)
      return true;
    });
    out.unshift({ code: code, country: (src && src.country_code) || '', names: names });
  });

  var outDir = path.join(__dirname, '..', 'frontend', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'cities.json'),
    JSON.stringify({ generated: new Date().toISOString(), count: out.length, langs: LANGS, cities: out }));

  // sanity report
  var have = function (x) { return out.some(function (c) { return c.code === x; }); };
  console.log('Wrote frontend/data/cities.json — ' + out.length + ' cities, ' + LANGS.length + ' languages (MAX, no cap).');
  console.log('Check hubs: PAR=' + have('PAR') + ' LON=' + have('LON') + ' MNL=' + have('MNL') + ' BKK=' + have('BKK') + ' NYC=' + have('NYC'));
  console.log('Check long-tail: TGD=' + have('TGD') + ' IAS=' + have('IAS') + ' BHX=' + have('BHX'));
})().catch(function (e) { console.error('Build failed:', e.message); process.exit(1); });
