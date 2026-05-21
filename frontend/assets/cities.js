/* ============================================================
   APlusZ — City Resolver + Labels
   File: frontend/assets/cities.js
   Save: D:\Destop\AplusZ\frontend\assets\cities.js

   resolve(text) -> IATA city code IF confidently known, else ''
                    (no more turning "Banggok" into a random "BAN")
   label(code)   -> display name for a city code (fallback: the code)
   names         -> { lowercased name : CODE } for autocomplete labels
   ============================================================ */

(function () {
  'use strict';

  var NAME = {
    'paris':'PAR','london':'LON','amsterdam':'AMS','frankfurt':'FRA','madrid':'MAD',
    'barcelona':'BCN','rome':'ROM','roma':'ROM','milan':'MIL','milano':'MIL','lisbon':'LIS',
    'lisboa':'LIS','zurich':'ZRH','vienna':'VIE','wien':'VIE','munich':'MUC','muenchen':'MUC',
    'berlin':'BER','dublin':'DUB','copenhagen':'CPH','oslo':'OSL','stockholm':'STO',
    'helsinki':'HEL','brussels':'BRU','geneva':'GVA','athens':'ATH','istanbul':'IST',
    'prague':'PRG','praha':'PRG','warsaw':'WAW','budapest':'BUD','manchester':'MAN',
    'edinburgh':'EDI','nice':'NCE','lyon':'LYS','sofia':'SOF','bucharest':'OTP',
    'belgrade':'BEG','zagreb':'ZAG','malta':'MLA','reykjavik':'KEF','kyiv':'KBP','kiev':'KBP',
    'moscow':'SVO','saint petersburg':'LED','st petersburg':'LED',
    'dubai':'DXB','abu dhabi':'AUH','doha':'DOH','jeddah':'JED','riyadh':'RUH',
    'tel aviv':'TLV','cairo':'CAI','casablanca':'CMN','tunis':'TUN','algiers':'ALG',
    'nairobi':'NBO','johannesburg':'JNB','cape town':'CPT','lagos':'LOS','addis ababa':'ADD',
    'dar es salaam':'DAR','accra':'ACC','dakar':'DKR','amman':'AMM','bahrain':'BAH',
    'kuwait':'KWI','muscat':'MCT','tbilisi':'TBS','yerevan':'EVN','baku':'BAK',
    'almaty':'ALA','tashkent':'TAS','islamabad':'ISB','lahore':'LHE','karachi':'KHI',
    'bangkok':'BKK','singapore':'SIN','kuala lumpur':'KUL','hong kong':'HKG','taipei':'TPE',
    'seoul':'ICN','tokyo':'TYO','osaka':'OSA','beijing':'PEK','shanghai':'SHA',
    'guangzhou':'CAN','shenzhen':'SZX','chengdu':'CTU','delhi':'DEL','new delhi':'DEL',
    'mumbai':'BOM','bombay':'BOM','bangalore':'BLR','bengaluru':'BLR','chennai':'MAA',
    'hyderabad':'HYD','kolkata':'CCU','colombo':'CMB','dhaka':'DAC','kathmandu':'KTM',
    'hanoi':'HAN','ho chi minh':'SGN','saigon':'SGN','manila':'MNL','jakarta':'CGK',
    'bali':'DPS','denpasar':'DPS','yangon':'RGN','phnom penh':'PNH','xiamen':'XMN',
    'hangzhou':'HGH','wuhan':'WUH','urumqi':'URC','fukuoka':'FUK','sapporo':'CTS',
    'sydney':'SYD','melbourne':'MEL','brisbane':'BNE','perth':'PER','auckland':'AKL',
    'christchurch':'CHC',
    'new york':'NYC','newyork':'NYC','los angeles':'LAX','san francisco':'SFO',
    'chicago':'CHI','miami':'MIA','washington':'WAS','seattle':'SEA','las vegas':'LAS',
    'atlanta':'ATL','dallas':'DFW','denver':'DEN','houston':'IAH','boston':'BOS',
    'toronto':'YTO','vancouver':'YVR','montreal':'YUL','mexico city':'MEX','cancun':'CUN',
    'guadalajara':'GDL','monterrey':'MTY',
    'bogota':'BOG','medellin':'MDE','lima':'LIM','santiago':'SCL','buenos aires':'EZE',
    'sao paulo':'GRU','rio de janeiro':'RIO','rio':'RIO','brasilia':'BSB','quito':'UIO',
    'guayaquil':'GYE','panama city':'PTY','panama':'PTY','san jose':'SJO','havana':'HAV',
    'santo domingo':'SDQ','punta cana':'PUJ','caracas':'CCS','montevideo':'MVD',
    'asuncion':'ASU','la paz':'LPB'
  };

  var LABELS = {};
  for (var k in NAME) {
    var c = NAME[k];
    if (!LABELS[c]) LABELS[c] = k.replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function label(code) {
    var c = String(code || '').toUpperCase();
    return LABELS[c] || c;
  }

  function resolve(input) {
    var s = String(input || '').trim();
    if (!s) return '';
    var lower = s.toLowerCase();
    if (NAME[lower]) return NAME[lower];
    var up = s.toUpperCase().replace(/[^A-Z]/g, '');
    if (up.length === 3) return up;
    var first = lower.split(/[,\s]/)[0];
    if (NAME[first]) return NAME[first];
    return '';
  }

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.cities = { resolve: resolve, label: label, names: NAME };

})();
