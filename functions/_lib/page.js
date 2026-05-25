// ── Page builder · pure, testable, no I/O ────────────────────────────
import { CONFIG } from './config.js';
import { slug } from './data.js';

const esc = s => ('' + (s ?? '')).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Ranking-critical strings (title/description/h1/cta/best) localized for every
// published market. {from} {to} {price} {brand} interpolate. Missing lang → en.
const T = {
  en:{title:'Cheap flights {from} → {to} | {brand}',desc:'Find the cheapest {from} to {to} flights. Live lowest fare, 6-month price history and the best date to book. Free, no signup.',h1:'Cheap flights from {from} to {to}',cta:'Check the live price',best:'See the best date to book in the next 6 months'},
  fr:{title:'Vols pas chers {from} → {to} | {brand}',desc:'Trouvez les vols {from}–{to} les moins chers. Tarif le plus bas en direct, historique sur 6 mois et meilleure date pour réserver. Gratuit, sans inscription.',h1:'Vols pas chers de {from} à {to}',cta:'Voir le prix en direct',best:'Voir la meilleure date pour réserver sur 6 mois'},
  es:{title:'Vuelos baratos {from} → {to} | {brand}',desc:'Encuentra los vuelos {from}–{to} más baratos. Tarifa más baja en directo, historial de 6 meses y la mejor fecha para reservar. Gratis, sin registro.',h1:'Vuelos baratos de {from} a {to}',cta:'Ver el precio en directo',best:'Ver la mejor fecha para reservar en 6 meses'},
  de:{title:'Günstige Flüge {from} → {to} | {brand}',desc:'Finde die günstigsten Flüge {from}–{to}. Live-Bestpreis, 6-Monats-Preisverlauf und das beste Buchungsdatum. Kostenlos, ohne Anmeldung.',h1:'Günstige Flüge von {from} nach {to}',cta:'Live-Preis prüfen',best:'Bestes Buchungsdatum der nächsten 6 Monate ansehen'},
  it:{title:'Voli economici {from} → {to} | {brand}',desc:'Trova i voli {from}–{to} più economici. Tariffa più bassa in tempo reale, storico di 6 mesi e la data migliore per prenotare. Gratis, senza registrazione.',h1:'Voli economici da {from} a {to}',cta:'Vedi il prezzo in tempo reale',best:'Vedi la data migliore per prenotare nei prossimi 6 mesi'},
  pt:{title:'Voos baratos {from} → {to} | {brand}',desc:'Encontre os voos {from}–{to} mais baratos. Menor tarifa ao vivo, histórico de 6 meses e a melhor data para reservar. Grátis, sem cadastro.',h1:'Voos baratos de {from} para {to}',cta:'Ver o preço ao vivo',best:'Ver a melhor data para reservar em 6 meses'},
  nl:{title:'Goedkope vluchten {from} → {to} | {brand}',desc:'Vind de goedkoopste vluchten {from}–{to}. Live laagste prijs, prijsgeschiedenis van 6 maanden en de beste boekingsdatum. Gratis, geen account.',h1:'Goedkope vluchten van {from} naar {to}',cta:'Bekijk de live prijs',best:'Bekijk de beste boekingsdatum in 6 maanden'},
  pl:{title:'Tanie loty {from} → {to} | {brand}',desc:'Znajdź najtańsze loty {from}–{to}. Najniższa cena na żywo, historia cen z 6 miesięcy i najlepsza data rezerwacji. Za darmo, bez rejestracji.',h1:'Tanie loty z {from} do {to}',cta:'Sprawdź cenę na żywo',best:'Zobacz najlepszą datę rezerwacji w 6 miesięcy'},
  ru:{title:'Дешёвые авиабилеты {from} → {to} | {brand}',desc:'Найдите самые дешёвые билеты {from}–{to}. Минимальная цена в реальном времени, история за 6 месяцев и лучшая дата брони. Бесплатно, без регистрации.',h1:'Дешёвые авиабилеты {from} – {to}',cta:'Узнать цену сейчас',best:'Лучшая дата брони в ближайшие 6 месяцев'},
  tr:{title:'Ucuz uçak bileti {from} → {to} | {brand}',desc:'En ucuz {from}–{to} uçuşlarını bulun. Canlı en düşük fiyat, 6 aylık fiyat geçmişi ve en iyi rezervasyon tarihi. Ücretsiz, üyelik yok.',h1:'{from} - {to} ucuz uçak biletleri',cta:'Canlı fiyatı gör',best:'Önümüzdeki 6 ayın en iyi rezervasyon tarihini gör'},
  ar:{title:'رحلات رخيصة {from} → {to} | {brand}',desc:'اعثر على أرخص رحلات {from}–{to}. أقل سعر مباشر، سجل أسعار 6 أشهر وأفضل موعد للحجز. مجاني، بدون تسجيل.',h1:'رحلات رخيصة من {from} إلى {to}',cta:'تحقق من السعر المباشر',best:'شاهد أفضل موعد للحجز خلال 6 أشهر'},
  zh:{title:'{from} → {to} 廉价机票 | {brand}',desc:'查找最便宜的 {from}–{to} 航班。实时最低价、6 个月价格走势和最佳预订日期。免费，无需注册。',h1:'{from} 到 {to} 的廉价机票',cta:'查看实时价格',best:'查看未来 6 个月的最佳预订日期'},
  ja:{title:'{from} → {to} の格安航空券 | {brand}',desc:'{from}–{to} の最安値航空券を検索。リアルタイム最安値、6か月の価格推移、最適な予約日。無料・登録不要。',h1:'{from} から {to} の格安航空券',cta:'リアルタイム価格を見る',best:'今後6か月で最適な予約日を見る'},
  ko:{title:'{from} → {to} 저렴한 항공권 | {brand}',desc:'가장 저렴한 {from}–{to} 항공권을 찾으세요. 실시간 최저가, 6개월 가격 추이, 최적 예약일. 무료, 가입 불필요.',h1:'{from}에서 {to}까지 저렴한 항공권',cta:'실시간 가격 보기',best:'향후 6개월 중 최적 예약일 보기'},
  th:{title:'ตั๋วเครื่องบินราคาถูก {from} → {to} | {brand}',desc:'ค้นหาเที่ยวบิน {from}–{to} ที่ถูกที่สุด ราคาต่ำสุดเรียลไทม์ ประวัติราคา 6 เดือน และวันจองที่ดีที่สุด ฟรี ไม่ต้องสมัคร',h1:'ตั๋วเครื่องบินราคาถูกจาก {from} ไป {to}',cta:'ดูราคาเรียลไทม์',best:'ดูวันจองที่ดีที่สุดใน 6 เดือนข้างหน้า'},
  vi:{title:'Vé máy bay giá rẻ {from} → {to} | {brand}',desc:'Tìm chuyến bay {from}–{to} rẻ nhất. Giá thấp nhất thời gian thực, lịch sử giá 6 tháng và ngày đặt vé tốt nhất. Miễn phí, không cần đăng ký.',h1:'Vé máy bay giá rẻ từ {from} đến {to}',cta:'Xem giá trực tiếp',best:'Xem ngày đặt vé tốt nhất trong 6 tháng tới'},
  id:{title:'Tiket pesawat murah {from} → {to} | {brand}',desc:'Temukan penerbangan {from}–{to} termurah. Harga terendah langsung, riwayat harga 6 bulan, dan tanggal pemesanan terbaik. Gratis, tanpa daftar.',h1:'Tiket pesawat murah dari {from} ke {to}',cta:'Lihat harga langsung',best:'Lihat tanggal pemesanan terbaik dalam 6 bulan'},
  hi:{title:'{from} → {to} सस्ती फ्लाइट | {brand}',desc:'सबसे सस्ती {from}–{to} फ्लाइट खोजें। लाइव सबसे कम किराया, 6 महीने का प्राइस इतिहास और बुकिंग की सबसे अच्छी तारीख। मुफ़्त, बिना साइनअप।',h1:'{from} से {to} सस्ती फ्लाइट',cta:'लाइव कीमत देखें',best:'अगले 6 महीनों में बुकिंग की सबसे अच्छी तारीख देखें'},
  bn:{title:'{from} → {to} সস্তা ফ্লাইট | {brand}',desc:'{from}–{to} সবচেয়ে সস্তা ফ্লাইট খুঁজুন। লাইভ সর্বনিম্ন ভাড়া, ৬ মাসের দামের ইতিহাস এবং বুকিংয়ের সেরা তারিখ। ফ্রি, সাইনআপ ছাড়াই।',h1:'{from} থেকে {to} সস্তা ফ্লাইট',cta:'লাইভ দাম দেখুন',best:'আগামী ৬ মাসে বুকিংয়ের সেরা তারিখ দেখুন'},
  fa:{title:'پروازهای ارزان {from} → {to} | {brand}',desc:'ارزان‌ترین پروازهای {from}–{to} را پیدا کنید. کمترین قیمت زنده، تاریخچه قیمت ۶ ماهه و بهترین زمان رزرو. رایگان، بدون ثبت‌نام.',h1:'پروازهای ارزان از {from} به {to}',cta:'مشاهده قیمت زنده',best:'بهترین تاریخ رزرو در ۶ ماه آینده را ببینید'},
};

// FAQ — en shared, expandable per-lang later (kept short + useful → FAQPage rich result)
const FAQ = [
  { q: 'How far in advance should I book {from} to {to}?', a: 'For most {from}–{to} routes the lowest fares appear 4–10 weeks before departure. {brand} shows the cheapest dates across the next 6 months, so you see the real sweet spot instead of guessing.' },
  { q: 'What is the cheapest day to fly {from} to {to}?', a: 'Mid-week departures (Tuesday–Thursday) and off-peak weeks are usually cheapest. The live tracker highlights the lowest-priced dates for this exact route.' },
  { q: 'Is {brand} free?', a: 'Yes. Searching prices and tracking routes is free with no signup. {brand} earns only if you choose to book through a partner — the price you pay stays the same.' },
];

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const t = (lang, key, v) => fill((T[lang] && T[lang][key]) || T.en[key], v);

const url = (lang, fs, ts) => `${CONFIG.SITE}/${lang}/flights/${fs}-to-${ts}`;
const money = (p, c) => c === 'EUR' || !c ? `€${Math.round(p)}` : `${Math.round(p)} ${c}`;

// from/to: {iata,name,country}; route: {price,currency,low,depart}
// related: [{iata,name}] same-origin top dests; reverse: bool
export function buildRoutePage({ lang, from, to, route, related = [] }) {
  const fs = slug(from.name) || slug(from.iata);
  const ts = slug(to.name) || slug(to.iata);
  const v = { from: from.name, to: to.name, price: Math.round(route.price), brand: CONFIG.BRAND };
  const dir = CONFIG.RTL.includes(lang) ? 'rtl' : 'ltr';
  const canonical = url(lang, fs, ts);
  const app = CONFIG.appLink(from.iata, to.iata, lang);

  const alts = CONFIG.LANGS.map(l =>
    `<link rel="alternate" hreflang="${l}" href="${url(l, fs, ts)}">`).join('') +
    `<link rel="alternate" hreflang="x-default" href="${url('en', fs, ts)}">`;

  const faq = FAQ.map(f => ({ q: fill(f.q, v), a: fill(f.a, v) }));
  const ld = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: CONFIG.BRAND, item: CONFIG.SITE },
        { '@type': 'ListItem', position: 2, name: t(lang, 'h1', v), item: canonical } ] },
      { '@type': 'FAQPage', mainEntity: faq.map(f => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a } })) } ] };

  const relHtml = related.length ? `<nav class="rg-rel" aria-label="Related routes"><h2>More routes from ${esc(from.name)}</h2><ul>${
    related.map(r => `<li><a href="${url(lang, fs, slug(r.name) || slug(r.iata))}">${esc(from.name)} → ${esc(r.name)}</a></li>`).join('')
  }<li><a href="${url(lang, ts, fs)}">${esc(to.name)} → ${esc(from.name)}</a></li></ul></nav>` : '';

  const lowLine = route.low ? `<p class="rg-sub">6-month low: <strong>${money(route.low, route.currency)}</strong></p>` : '';

  return `<!doctype html><html lang="${lang}" dir="${dir}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t(lang, 'title', v))}</title>
<meta name="description" content="${esc(t(lang, 'desc', v))}">
<link rel="canonical" href="${canonical}">${alts}
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(t(lang, 'title', v))}">
<meta property="og:description" content="${esc(t(lang, 'desc', v))}"><meta property="og:url" content="${canonical}">
<link rel="stylesheet" href="/assets/bundle.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>.rg{max-width:760px;margin:0 auto;padding:28px 18px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5}.rg h1{font-size:1.7rem;margin:.2em 0}.rg .rg-price{font-size:2.2rem;font-weight:700;margin:.1em 0}.rg-sub{color:#555;margin:.2em 0}.rg-cta{display:inline-block;margin:18px 0;padding:14px 22px;background:#1558d6;color:#fff;border-radius:10px;text-decoration:none;font-weight:600}.rg-cta.sec{background:#eef2fb;color:#1558d6}.rg-faq h3{margin:1.1em 0 .2em;font-size:1.05rem}.rg-rel ul{columns:2;list-style:none;padding:0}.rg-rel a{color:#1558d6;text-decoration:none}.rg-note{color:#777;font-size:.85rem;margin-top:24px}</style>
</head><body><main class="rg">
<h1>${esc(t(lang, 'h1', v))}</h1>
<p class="rg-price">${money(route.price, route.currency)}</p>
${lowLine}
<a class="rg-cta" href="${app}" rel="nofollow">${esc(t(lang, 'cta', v))}</a>
<a class="rg-cta sec" href="${app}" rel="nofollow">${esc(t(lang, 'best', v))}</a>
<section class="rg-faq">${faq.map(f => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>
${relHtml}
<p class="rg-note">${esc(CONFIG.BRAND)} scans up to 50,000 prices across 2,000 airports to surface the lowest fare on the best date to book within the next 6 months. Compare and book with partners — the price you pay is the same.</p>
</main></body></html>`;
}

export { slug };
