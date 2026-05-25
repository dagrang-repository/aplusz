// ── Route-page FAQ · 20 languages ───────────────────────────────────
// 3 Q&A per language, with {from} {to} {brand} placeholders preserved.
// Consumed by page.js: (FAQ_T[lang] || FAQ_T.en).map(...).
export const FAQ_T = {
  en: [
    { q: 'How far in advance should I book {from} to {to}?', a: 'For most {from}–{to} routes the lowest fares appear 4–10 weeks before departure. {brand} shows the cheapest dates across the next 6 months, so you see the real sweet spot instead of guessing.' },
    { q: 'What is the cheapest day to fly {from} to {to}?', a: 'Mid-week departures (Tuesday–Thursday) and off-peak weeks are usually cheapest. The live tracker highlights the lowest-priced dates for this exact route.' },
    { q: 'Is {brand} free?', a: 'Yes. Searching prices and tracking routes is free with no signup. {brand} earns only if you choose to book through a partner — the price you pay stays the same.' },
  ],
  fr: [
    { q: 'Combien de temps à l’avance réserver {from}–{to} ?', a: 'Pour la plupart des routes {from}–{to}, les tarifs les plus bas apparaissent 4 à 10 semaines avant le départ. {brand} affiche les dates les moins chères sur les 6 prochains mois, pour voir le bon moment au lieu de deviner.' },
    { q: 'Quel est le jour le moins cher pour voler {from}–{to} ?', a: 'Les départs en milieu de semaine (mardi à jeudi) et les semaines creuses sont généralement les moins chers. Le suivi en direct met en évidence les dates les moins chères pour cette route exacte.' },
    { q: '{brand} est-il gratuit ?', a: 'Oui. Rechercher des prix et suivre des routes est gratuit, sans inscription. {brand} ne gagne quelque chose que si vous réservez via un partenaire — le prix que vous payez reste le même.' },
  ],
  es: [
    { q: '¿Con cuánta antelación reservar {from}–{to}?', a: 'En la mayoría de rutas {from}–{to}, las tarifas más bajas aparecen de 4 a 10 semanas antes de la salida. {brand} muestra las fechas más baratas de los próximos 6 meses, para ver el momento ideal sin adivinar.' },
    { q: '¿Cuál es el día más barato para volar {from}–{to}?', a: 'Las salidas entre semana (martes a jueves) y las semanas de temporada baja suelen ser las más baratas. El seguimiento en vivo destaca las fechas más económicas para esta ruta exacta.' },
    { q: '¿{brand} es gratis?', a: 'Sí. Buscar precios y seguir rutas es gratis, sin registro. {brand} solo gana si decides reservar a través de un socio: el precio que pagas es el mismo.' },
  ],
  de: [
    { q: 'Wie früh sollte ich {from}–{to} buchen?', a: 'Bei den meisten {from}–{to}-Strecken erscheinen die günstigsten Preise 4 bis 10 Wochen vor Abflug. {brand} zeigt die günstigsten Daten der nächsten 6 Monate, damit du den richtigen Zeitpunkt siehst statt zu raten.' },
    { q: 'Was ist der günstigste Tag für {from}–{to}?', a: 'Abflüge unter der Woche (Dienstag bis Donnerstag) und Nebensaisonwochen sind meist am günstigsten. Der Live-Tracker hebt die preiswertesten Daten für genau diese Strecke hervor.' },
    { q: 'Ist {brand} kostenlos?', a: 'Ja. Preise suchen und Strecken verfolgen ist kostenlos, ohne Anmeldung. {brand} verdient nur, wenn du über einen Partner buchst — der Preis, den du zahlst, bleibt gleich.' },
  ],
  it: [
    { q: 'Con quanto anticipo prenotare {from}–{to}?', a: 'Per la maggior parte delle rotte {from}–{to}, le tariffe più basse compaiono 4–10 settimane prima della partenza. {brand} mostra le date più economiche dei prossimi 6 mesi, così vedi il momento giusto senza tirare a indovinare.' },
    { q: 'Qual è il giorno più economico per volare {from}–{to}?', a: 'Le partenze infrasettimanali (martedì–giovedì) e le settimane di bassa stagione sono di solito le più economiche. Il monitoraggio in tempo reale evidenzia le date più convenienti per questa rotta esatta.' },
    { q: '{brand} è gratuito?', a: 'Sì. Cercare prezzi e monitorare rotte è gratis, senza registrazione. {brand} guadagna solo se scegli di prenotare tramite un partner — il prezzo che paghi resta lo stesso.' },
  ],
  pt: [
    { q: 'Com quanta antecedência reservar {from}–{to}?', a: 'Na maioria das rotas {from}–{to}, as tarifas mais baixas aparecem de 4 a 10 semanas antes da partida. {brand} mostra as datas mais baratas dos próximos 6 meses, para você ver o momento certo sem adivinhar.' },
    { q: 'Qual é o dia mais barato para voar {from}–{to}?', a: 'Partidas no meio da semana (terça a quinta) e semanas de baixa temporada costumam ser as mais baratas. O monitoramento ao vivo destaca as datas mais baratas para esta rota exata.' },
    { q: 'O {brand} é grátis?', a: 'Sim. Pesquisar preços e acompanhar rotas é grátis, sem cadastro. O {brand} só ganha se você optar por reservar através de um parceiro — o preço que você paga continua o mesmo.' },
  ],
  nl: [
    { q: 'Hoe ver vooruit moet ik {from}–{to} boeken?', a: 'Voor de meeste {from}–{to}-routes verschijnen de laagste tarieven 4 tot 10 weken voor vertrek. {brand} toont de goedkoopste data van de komende 6 maanden, zodat je het juiste moment ziet in plaats van te gokken.' },
    { q: 'Wat is de goedkoopste dag om {from}–{to} te vliegen?', a: 'Vertrek doordeweeks (dinsdag tot donderdag) en weken buiten het seizoen zijn meestal het goedkoopst. De live tracker markeert de voordeligste data voor precies deze route.' },
    { q: 'Is {brand} gratis?', a: 'Ja. Prijzen zoeken en routes volgen is gratis, zonder aanmelding. {brand} verdient alleen als je via een partner boekt — de prijs die je betaalt blijft hetzelfde.' },
  ],
  pl: [
    { q: 'Z jakim wyprzedzeniem rezerwować {from}–{to}?', a: 'Na większości tras {from}–{to} najniższe ceny pojawiają się 4–10 tygodni przed wylotem. {brand} pokazuje najtańsze daty w ciągu najbliższych 6 miesięcy, więc widzisz właściwy moment, zamiast zgadywać.' },
    { q: 'Który dzień jest najtańszy na lot {from}–{to}?', a: 'Wyloty w środku tygodnia (wtorek–czwartek) i tygodnie poza sezonem są zwykle najtańsze. Śledzenie na żywo wyróżnia najtańsze daty dla dokładnie tej trasy.' },
    { q: 'Czy {brand} jest darmowy?', a: 'Tak. Wyszukiwanie cen i śledzenie tras jest darmowe, bez rejestracji. {brand} zarabia tylko, gdy zdecydujesz się zarezerwować przez partnera — cena, którą płacisz, pozostaje taka sama.' },
  ],
  ru: [
    { q: 'За сколько времени бронировать {from}–{to}?', a: 'Для большинства маршрутов {from}–{to} самые низкие цены появляются за 4–10 недель до вылета. {brand} показывает самые дешёвые даты на ближайшие 6 месяцев, чтобы вы видели нужный момент, а не угадывали.' },
    { q: 'Какой день самый дешёвый для перелёта {from}–{to}?', a: 'Вылеты в середине недели (со вторника по четверг) и недели вне сезона обычно самые дешёвые. Отслеживание в реальном времени выделяет самые выгодные даты для именно этого маршрута.' },
    { q: '{brand} бесплатный?', a: 'Да. Поиск цен и отслеживание маршрутов бесплатны, без регистрации. {brand} зарабатывает, только если вы бронируете через партнёра — цена, которую вы платите, остаётся прежней.' },
  ],
  tr: [
    { q: '{from}–{to} için ne kadar önceden rezervasyon yapmalı?', a: 'Çoğu {from}–{to} rotasında en düşük ücretler kalkıştan 4–10 hafta önce ortaya çıkar. {brand} önümüzdeki 6 ayın en ucuz tarihlerini gösterir, böylece tahmin etmek yerine doğru anı görürsünüz.' },
    { q: '{from}–{to} uçmak için en ucuz gün hangisi?', a: 'Hafta ortası kalkışlar (Salı–Perşembe) ve sezon dışı haftalar genellikle en ucuzdur. Canlı takip, tam olarak bu rota için en uygun fiyatlı tarihleri vurgular.' },
    { q: '{brand} ücretsiz mi?', a: 'Evet. Fiyat aramak ve rotaları izlemek ücretsizdir, kayıt gerekmez. {brand} yalnızca bir ortak üzerinden rezervasyon yaparsanız kazanır — ödediğiniz fiyat aynı kalır.' },
  ],
  ar: [
    { q: 'كم من الوقت مقدمًا أحجز {from}–{to}؟', a: 'في معظم مسارات {from}–{to} تظهر أقل الأسعار قبل 4 إلى 10 أسابيع من المغادرة. يعرض {brand} أرخص التواريخ خلال الأشهر الستة القادمة، لترى الوقت المناسب بدلًا من التخمين.' },
    { q: 'ما أرخص يوم للسفر {from}–{to}؟', a: 'عادةً ما تكون المغادرات في منتصف الأسبوع (الثلاثاء إلى الخميس) وأسابيع خارج الموسم هي الأرخص. يبرز التتبع المباشر أقل التواريخ سعرًا لهذا المسار بالتحديد.' },
    { q: 'هل {brand} مجاني؟', a: 'نعم. البحث عن الأسعار وتتبع المسارات مجاني، دون تسجيل. لا يربح {brand} إلا إذا اخترت الحجز عبر شريك — والسعر الذي تدفعه يبقى كما هو.' },
  ],
  fa: [
    { q: 'چقدر زودتر {from}–{to} را رزرو کنم؟', a: 'برای بیشتر مسیرهای {from}–{to} کمترین قیمت‌ها ۴ تا ۱۰ هفته پیش از پرواز ظاهر می‌شوند. {brand} ارزان‌ترین تاریخ‌های ۶ ماه آینده را نشان می‌دهد تا به‌جای حدس زدن، زمان مناسب را ببینید.' },
    { q: 'ارزان‌ترین روز برای پرواز {from}–{to} کدام است؟', a: 'پروازهای میان هفته (سه‌شنبه تا پنجشنبه) و هفته‌های خارج از فصل معمولاً ارزان‌ترین‌اند. ردیابی زنده ارزان‌ترین تاریخ‌ها را برای همین مسیر برجسته می‌کند.' },
    { q: 'آیا {brand} رایگان است؟', a: 'بله. جست‌وجوی قیمت و پیگیری مسیرها رایگان است، بدون ثبت‌نام. {brand} تنها در صورتی درآمد دارد که از طریق یک شریک رزرو کنید — قیمتی که می‌پردازید همان می‌ماند.' },
  ],
  hi: [
    { q: '{from}–{to} कितना पहले बुक करूँ?', a: 'ज़्यादातर {from}–{to} रूट पर सबसे कम किराया प्रस्थान से 4 से 10 सप्ताह पहले दिखता है। {brand} अगले 6 महीनों की सबसे सस्ती तारीखें दिखाता है, ताकि अनुमान लगाने के बजाय आप सही समय देख सकें।' },
    { q: '{from}–{to} उड़ान के लिए सबसे सस्ता दिन कौन-सा है?', a: 'सप्ताह के मध्य की उड़ानें (मंगलवार–गुरुवार) और ऑफ-सीज़न सप्ताह आमतौर पर सबसे सस्ते होते हैं। लाइव ट्रैकर इस सटीक रूट के लिए सबसे कम कीमत वाली तारीखें दिखाता है।' },
    { q: 'क्या {brand} मुफ़्त है?', a: 'हाँ। कीमतें खोजना और रूट ट्रैक करना मुफ़्त है, बिना साइनअप। {brand} केवल तभी कमाता है जब आप किसी पार्टनर के ज़रिए बुक करते हैं — आप जो कीमत चुकाते हैं वह वही रहती है।' },
  ],
  bn: [
    { q: '{from}–{to} কত আগে বুক করব?', a: 'বেশিরভাগ {from}–{to} রুটে সর্বনিম্ন ভাড়া যাত্রার ৪ থেকে ১০ সপ্তাহ আগে দেখা যায়। {brand} আগামী ৬ মাসের সবচেয়ে সস্তা তারিখগুলো দেখায়, যাতে অনুমান না করে আপনি সঠিক সময় দেখতে পারেন।' },
    { q: '{from}–{to} ওড়ার সবচেয়ে সস্তা দিন কোনটি?', a: 'সপ্তাহের মাঝের যাত্রা (মঙ্গল–বৃহস্পতি) এবং অফ-সিজন সপ্তাহগুলো সাধারণত সবচেয়ে সস্তা। লাইভ ট্র্যাকার এই নির্দিষ্ট রুটের জন্য সবচেয়ে কম দামের তারিখগুলো তুলে ধরে।' },
    { q: '{brand} কি বিনামূল্যে?', a: 'হ্যাঁ। দাম খোঁজা ও রুট ট্র্যাক করা বিনামূল্যে, সাইনআপ ছাড়াই। {brand} কেবল তখনই আয় করে যখন আপনি কোনো পার্টনারের মাধ্যমে বুক করেন — আপনি যে দাম দেন তা একই থাকে।' },
  ],
  th: [
    { q: 'ควรจอง {from}–{to} ล่วงหน้านานแค่ไหน?', a: 'สำหรับเส้นทาง {from}–{to} ส่วนใหญ่ ราคาถูกที่สุดจะปรากฏ 4–10 สัปดาห์ก่อนออกเดินทาง {brand} แสดงวันที่ถูกที่สุดในช่วง 6 เดือนข้างหน้า เพื่อให้คุณเห็นจังหวะที่เหมาะสมแทนการเดา' },
    { q: 'วันไหนบินถูกที่สุดสำหรับ {from}–{to}?', a: 'การบินกลางสัปดาห์ (อังคารถึงพฤหัสบดี) และสัปดาห์นอกฤดูกาลมักถูกที่สุด ระบบติดตามแบบเรียลไทม์จะเน้นวันที่ราคาถูกที่สุดสำหรับเส้นทางนี้โดยเฉพาะ' },
    { q: '{brand} ฟรีไหม?', a: 'ใช่ การค้นหาราคาและติดตามเส้นทางฟรี ไม่ต้องสมัคร {brand} จะได้รายได้ก็ต่อเมื่อคุณเลือกจองผ่านพาร์ทเนอร์ — ราคาที่คุณจ่ายยังคงเท่าเดิม' },
  ],
  vi: [
    { q: 'Nên đặt {from}–{to} trước bao lâu?', a: 'Với hầu hết tuyến {from}–{to}, giá thấp nhất xuất hiện 4–10 tuần trước khi khởi hành. {brand} hiển thị những ngày rẻ nhất trong 6 tháng tới, để bạn thấy thời điểm hợp lý thay vì phải đoán.' },
    { q: 'Ngày nào bay {from}–{to} rẻ nhất?', a: 'Các chuyến giữa tuần (thứ Ba đến thứ Năm) và các tuần thấp điểm thường rẻ nhất. Công cụ theo dõi trực tiếp làm nổi bật những ngày có giá thấp nhất cho đúng tuyến này.' },
    { q: '{brand} có miễn phí không?', a: 'Có. Tìm giá và theo dõi tuyến bay miễn phí, không cần đăng ký. {brand} chỉ có thu nhập nếu bạn chọn đặt qua đối tác — giá bạn trả vẫn giữ nguyên.' },
  ],
  id: [
    { q: 'Berapa jauh hari sebelumnya memesan {from}–{to}?', a: 'Untuk sebagian besar rute {from}–{to}, tarif termurah muncul 4–10 minggu sebelum keberangkatan. {brand} menampilkan tanggal termurah dalam 6 bulan ke depan, agar Anda melihat saat yang tepat alih-alih menebak.' },
    { q: 'Hari apa paling murah untuk terbang {from}–{to}?', a: 'Keberangkatan tengah pekan (Selasa–Kamis) dan minggu di luar musim ramai biasanya paling murah. Pelacak langsung menyoroti tanggal termurah untuk rute persis ini.' },
    { q: 'Apakah {brand} gratis?', a: 'Ya. Mencari harga dan memantau rute gratis, tanpa pendaftaran. {brand} hanya memperoleh penghasilan jika Anda memesan melalui mitra — harga yang Anda bayar tetap sama.' },
  ],
  ja: [
    { q: '{from}–{to} はどのくらい前に予約すべきですか？', a: 'ほとんどの {from}–{to} 路線では、最安値は出発の4〜10週間前に現れます。{brand} は今後6か月で最も安い日付を表示するので、推測せずに最適なタイミングが分かります。' },
    { q: '{from}–{to} を飛ぶ最も安い曜日は？', a: '週半ば（火曜〜木曜）の出発やオフピークの週がたいてい最も安くなります。ライブ追跡がこの路線専用の最安値の日付を強調表示します。' },
    { q: '{brand} は無料ですか？', a: 'はい。価格検索と路線の追跡は無料で、登録は不要です。{brand} はパートナー経由で予約した場合にのみ収益を得ます。お支払い価格は変わりません。' },
  ],
  ko: [
    { q: '{from}–{to}는 얼마나 미리 예약해야 하나요?', a: '대부분의 {from}–{to} 노선에서 최저 요금은 출발 4~10주 전에 나타납니다. {brand}는 앞으로 6개월 중 가장 저렴한 날짜를 보여주므로, 추측 대신 적절한 시점을 확인할 수 있습니다.' },
    { q: '{from}–{to} 비행에 가장 저렴한 요일은?', a: '주중 출발(화~목)과 비수기 주간이 보통 가장 저렴합니다. 실시간 추적이 바로 이 노선의 최저가 날짜를 강조해 줍니다.' },
    { q: '{brand}는 무료인가요?', a: '네. 가격 검색과 노선 추적은 가입 없이 무료입니다. {brand}는 파트너를 통해 예약하실 때만 수익을 얻으며, 지불하시는 가격은 동일합니다.' },
  ],
  zh: [
    { q: '{from}–{to} 应提前多久预订？', a: '对大多数 {from}–{to} 航线而言，最低票价出现在出发前4到10周。{brand} 显示未来6个月内最便宜的日期，让你看到合适时机，而不必猜测。' },
    { q: '{from}–{to} 哪天飞最便宜？', a: '周中出发（周二至周四）和淡季周通常最便宜。实时追踪会突出显示这条航线最低价格的日期。' },
    { q: '{brand} 免费吗？', a: '是的。搜索价格和跟踪航线免费，无需注册。只有当你选择通过合作伙伴预订时，{brand} 才会有收入——你支付的价格保持不变。' },
  ],
};
