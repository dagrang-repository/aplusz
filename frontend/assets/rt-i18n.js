/* ============================================================
   APlusZ - Trip-type + round-trip micro-i18n
   File: frontend/assets/rt-i18n.js
   Self-contained: One-way / Return / Total / leg labels in all
   20 locales, so the round-trip UI needs no edits to the main
   i18n JSON files. Exposes window.APlusZ.rt(key).
   ============================================================ */
(function () {
  'use strict';

  var M = {
    en: { oneway: 'One-way',        round: 'Return',              total: 'Total',   out: 'Outbound',   back: 'Return' },
    fr: { oneway: 'Aller simple',   round: 'Aller-retour',        total: 'Total',   out: 'Aller',      back: 'Retour' },
    es: { oneway: 'Solo ida',       round: 'Ida y vuelta',        total: 'Total',   out: 'Ida',        back: 'Vuelta' },
    de: { oneway: 'Hinflug',        round: 'Hin- und Rückflug',   total: 'Gesamt',  out: 'Hinflug',    back: 'Rückflug' },
    it: { oneway: 'Solo andata',    round: 'Andata e ritorno',    total: 'Totale',  out: 'Andata',     back: 'Ritorno' },
    pt: { oneway: 'Só ida',         round: 'Ida e volta',         total: 'Total',   out: 'Ida',        back: 'Volta' },
    nl: { oneway: 'Enkele reis',    round: 'Retour',              total: 'Totaal',  out: 'Heenreis',   back: 'Terugreis' },
    pl: { oneway: 'W jedną stronę', round: 'W obie strony',       total: 'Razem',   out: 'Tam',        back: 'Powrót' },
    ru: { oneway: 'В одну сторону', round: 'Туда и обратно',      total: 'Итого',   out: 'Туда',       back: 'Обратно' },
    tr: { oneway: 'Tek yön',        round: 'Gidiş-dönüş',         total: 'Toplam',  out: 'Gidiş',      back: 'Dönüş' },
    ar: { oneway: 'ذهاب فقط',       round: 'ذهاب وعودة',          total: 'المجموع', out: 'ذهاب',       back: 'عودة' },
    fa: { oneway: 'یک‌طرفه',         round: 'رفت و برگشت',         total: 'مجموع',   out: 'رفت',        back: 'برگشت' },
    hi: { oneway: 'एक तरफ़ा',        round: 'आना-जाना',            total: 'कुल',     out: 'प्रस्थान',    back: 'वापसी' },
    bn: { oneway: 'একমুখী',         round: 'যাওয়া-আসা',          total: 'মোট',     out: 'যাত্রা',      back: 'ফেরা' },
    id: { oneway: 'Sekali jalan',   round: 'Pulang-pergi',        total: 'Total',   out: 'Berangkat',  back: 'Pulang' },
    ja: { oneway: '片道',            round: '往復',                 total: '合計',     out: '往路',        back: '復路' },
    ko: { oneway: '편도',            round: '왕복',                 total: '합계',     out: '가는 편',     back: '오는 편' },
    th: { oneway: 'เที่ยวเดียว',      round: 'ไป-กลับ',             total: 'รวม',     out: 'ขาไป',        back: 'ขากลับ' },
    vi: { oneway: 'Một chiều',      round: 'Khứ hồi',             total: 'Tổng',    out: 'Chiều đi',   back: 'Chiều về' },
    zh: { oneway: '单程',            round: '往返',                 total: '总计',     out: '去程',        back: '返程' }
  };

  function lang() {
    try {
      var l = (localStorage.getItem('aplusz-lang') ||
        (window.APlusZ && window.APlusZ.i18n && window.APlusZ.i18n.locale && window.APlusZ.i18n.locale()) ||
        navigator.language || 'en').slice(0, 2).toLowerCase();
      return M[l] ? l : 'en';
    } catch (e) { return 'en'; }
  }

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.rtI18n = M;
  window.APlusZ.rt = function (key) {
    var o = M[lang()] || M.en;
    return o[key] || M.en[key] || key;
  };
})();
