/* ============================================================
   APlusZ — City List Builder (run once, locally)
   File: scripts/build-cities.js
   Save: D:\Destop\AplusZ\scripts\build-cities.js
   Run:  node scripts/build-cities.js

   Downloads Travelpayouts' free city dump, trims to ~2000 real
   cities, keeps the 20 app languages from name_translations, and
   writes a static, multilingual file the autocomplete reads:
     frontend/data/cities.json
   No token needed for the public data dump. No runtime API calls.
   ============================================================ */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

// The 20 languages APlusZ ships. Travelpayouts uses zh-CN for Chinese.
const LANGS = ['en','fr','es','de','it','pt','nl','pl','ru','tr',
               'ar','fa','hi','bn','th','vi','id','ja','ko','zh-CN'];

const TARGET = 2000;   // keep the ~2000 highest-weight cities

function get(url) {
  return new Promise((resolve, reject) => {
    var lib = url.indexOf('https') === 0 ? https : http;
    lib.get(url, function (res) {
      if (res.statusCode >= 300 && res.headers.location) {
        return resolve(get(res.headers.location)); // follow redirect
      }
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

(async function () {
  console.log('Downloading cities.json + autocomplete weights…');

  // 1) full city dump (code, name, name_translations, country_code, coordinates)
  var cities = await get('http://api.travelpayouts.com/data/cities.json');
  if (!Array.isArray(cities)) throw new Error('cities.json not an array');

  // 2) airports dump gives a "weight"/popularity signal via city_code; we use
  //    it to rank cities by real traffic so we keep hubs, not noise.
  var weightByCity = {};
  try {
    var airports = await get('http://api.travelpayouts.com/data/airports.json');
    if (Array.isArray(airports)) {
      airports.forEach(function (a) {
        var c = a.city_code || a.code;
        var w = +a.weight || 0;
        if (c) weightByCity[c] = Math.max(weightByCity[c] || 0, w);
      });
    }
  } catch (e) { console.warn('airports weight unavailable, ranking by name presence only'); }

  // 3) keep cities that have a code + an English name; attach weight
  var rows = cities.filter(function (c) {
    return c && c.code && (c.name || (c.name_translations && c.name_translations.en));
  }).map(function (c) {
    return { c: c, w: weightByCity[c.code] || 0 };
  });

  // 4) rank by weight desc, take top TARGET
  rows.sort(function (a, b) { return b.w - a.w; });
  if (rows.length > TARGET) rows = rows.slice(0, TARGET);

  // 5) build compact records: code + per-language names (fallback to base name)
  var out = rows.map(function (r) {
    var c = r.c;
    var t = c.name_translations || {};
    var base = c.name || t.en || c.code;
    var names = {};
    LANGS.forEach(function (l) { names[l] = t[l] || base; });
    return { code: c.code, country: c.country_code || '', names: names };
  });

  // 6) write static file
  var outDir = path.join(__dirname, '..', 'frontend', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'cities.json'),
    JSON.stringify({ generated: new Date().toISOString(), count: out.length, langs: LANGS, cities: out }));

  console.log('Wrote frontend/data/cities.json — ' + out.length + ' cities, ' + LANGS.length + ' languages.');
})().catch(function (e) { console.error('Build failed:', e.message); process.exit(1); });
