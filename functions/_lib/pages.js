// ── Static content pages · FAQ / About / Feedback ───────────────────
// Same SEO shell as route pages (canonical, 20 hreflang, OG, footer).
// Fully localized: CONTENT[lang] for all 20 languages; en is the fallback.
import { CONFIG } from './config.js';

const esc = s => ('' + (s ?? '')).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const PATH = { faq: 'faq', about: 'about', feedback: 'feedback', web: 'web' };
const url = (lang, page) => `${CONFIG.SITE}/${lang}/${PATH[page]}`;

// Footer link labels per language (FAQ / About / Feedback / Legal / Disclosure)
const NAV = {
  en:['FAQ','About','Feedback','Legal','Disclosure','Web design'],
  fr:['FAQ','À propos','Retour','Mentions légales','Divulgation','Site web'],
  es:['Preguntas','Acerca de','Comentarios','Aviso legal','Divulgación','Diseño web'],
  de:['FAQ','Über uns','Feedback','Impressum','Offenlegung','Webdesign'],
  it:['FAQ','Chi siamo','Feedback','Note legali','Informativa','Web design'],
  pt:['Perguntas','Sobre','Comentários','Aviso legal','Divulgação','Web design'],
  nl:['FAQ','Over ons','Feedback','Juridisch','Openbaarmaking','Webdesign'],
  pl:['FAQ','O nas','Opinie','Informacje prawne','Ujawnienie','Strony www'],
  ru:['Вопросы','О нас','Отзыв','Правовая информация','Раскрытие','Сайты'],
  tr:['SSS','Hakkında','Geri bildirim','Yasal','Açıklama','Web tasarım'],
  ar:['الأسئلة','من نحن','ملاحظات','قانوني','الإفصاح','تصميم ويب'],
  fa:['سؤالات','درباره','بازخورد','حقوقی','افشا','طراحی وب'],
  hi:['सामान्य प्रश्न','परिचय','प्रतिक्रिया','कानूनी','प्रकटीकरण','वेब डिज़ाइन'],
  bn:['প্রশ্নাবলী','সম্পর্কে','মতামত','আইনি','প্রকাশ','ওয়েব ডিজাইন'],
  th:['คำถาม','เกี่ยวกับ','ความคิดเห็น','กฎหมาย','การเปิดเผย','ออกแบบเว็บ'],
  vi:['Hỏi đáp','Giới thiệu','Phản hồi','Pháp lý','Tiết lộ','Thiết kế web'],
  id:['FAQ','Tentang','Masukan','Hukum','Pengungkapan','Desain web'],
  ja:['よくある質問','概要','フィードバック','法的事項','開示','ウェブデザイン'],
  ko:['자주 묻는 질문','소개','피드백','법적 고지','공개','웹 디자인'],
  zh:['常见问题','关于','反馈','法律','披露','网页设计'],
};
const nav = l => NAV[l] || NAV.en;

function footer(lang) {
  const L = `/${lang}`; const n = nav(lang);
  return `<footer class="rg-foot">
<a href="${L}/faq">${esc(n[0])}</a> · <a href="${L}/about">${esc(n[1])}</a> · <a href="${L}/feedback">${esc(n[2])}</a> · <a href="${CONFIG.SITE}/legal/">${esc(n[3])}</a> · <a href="${CONFIG.SITE}/disclosure/">${esc(n[4])}</a> · <a href="${L}/web">${esc(n[5])}</a>
<div class="rg-foot-c">© <span>${new Date().getUTCFullYear()}</span> <a href="${CONFIG.SITE}/">AplusZ (A+Z).app</a></div>
</footer>`;
}

// ── Localized content. en authoritative; every language fully filled. ──
const CONTENT = {
  en: {
    webIntro: 'A professional, custom-designed website built and delivered in 7 days. Mobile-ready, SEO-optimized, with hosting setup included. From €699, now €299 — one-time payment, no subscription.', webInclTitle: 'What is included', webInclBody: 'Custom design tailored to your brand and audience. Mobile-first, fully responsive. SEO foundation. Contact form. Hosting setup and domain connection. 1 month support. Full handover.', webHowTitle: 'How it works', webHowBody: 'Pay once on Stripe, return here and fill in your brief with the email you paid with. We review within 24 hours and deliver in 7 days.', webCta: 'Start your project',
    faqTitle: 'Frequently Asked Questions',
    faqDesc: 'Answers about AplusZ — how it finds the lowest fares, why it is free, how booking works, languages, and offline use.',
    faq: [
      { q: 'What is AplusZ?', a: 'AplusZ finds the lowest air fare for any route and tells you the single best date to book within the next 6 months. It scans up to 50,000 prices across 2,000 airports, free, with no signup.' },
      { q: 'Is AplusZ really free?', a: 'Yes. Searching prices and tracking routes is free forever, with no signup. AplusZ earns only if you choose to book through a partner — the price you pay stays exactly the same.' },
      { q: 'How does the pricing work?', a: 'Free covers unlimited searches, the exact best date and price, one saved route, unlimited reminders, calendar export, and offline use. Pro and Pro+ add more saved routes and route swaps.' },
      { q: 'How do I book a flight?', a: 'AplusZ shows you the lowest fare and the best date, then hands you to a trusted booking partner to complete the purchase. AplusZ never charges you and never adds to the fare.' },
      { q: 'How far in advance should I book?', a: 'For most routes the lowest fares appear 4–10 weeks before departure. AplusZ shows the cheapest dates across the next 6 months, so you see the real sweet spot instead of guessing.' },
      { q: 'Does AplusZ work offline?', a: 'Yes. Once loaded, AplusZ works offline for your saved routes and reminders, so you can check them anywhere, even without a connection.' },
      { q: 'What languages does AplusZ support?', a: 'AplusZ is available in 20 languages, with the same free features in every language.' },
    ],
    aboutTitle: 'About AplusZ',
    aboutDesc: 'AplusZ helps people fly for less — free, no signup. Scanning up to 50,000 prices to find the best date to book within 6 months.',
    aboutH1: 'About AplusZ',
    aboutBody: [
      'AplusZ exists for one reason: to help people fly for less.',
      'Flying should not be a guessing game. Prices swing wildly, and most people overpay simply because they cannot see when a route is cheapest. AplusZ removes the guesswork — it scans up to 50,000 prices across 2,000 airports and shows you the single best date to book within the next 6 months.',
      'AplusZ is free, and free is the point. There is no signup, no paywall on searching, and no catch. The core of the project is meant to stay free for everyone, once the running costs are covered.',
      'When you choose to book, AplusZ may earn a small commission from a partner — at no extra cost to you. The price you pay is always the same. That is what keeps the lights on and the searches free.',
      'The more people who use and share AplusZ, the faster it reaches the point where it sustains itself and stays free for good. That is the whole idea: fly for less, help others do the same.',
    ],
    fbTitle: 'Feedback', fbDesc: 'Report a bug or suggest a feature for AplusZ. A few words, no signup.',
    fbH1: 'Send feedback', fbIntro: 'Found a bug or have an idea? Tell us in a few words. No signup needed.',
    fbBug: 'Bug', fbIdea: 'Idea', fbPlaceholder: 'Describe the bug or your idea…',
    fbEmailLabel: 'Your email (optional)', fbEmailPlaceholder: 'you@example.com',
    fbSend: 'Send', fbSending: 'Sending…', fbOk: 'Thank you — your feedback was sent.',
    fbErr: 'Could not send. Please try again.', fbEmpty: 'Please write a short message first.',
    webTitle: 'Web Design - AplusZ.app', webDesc: 'Professional website built in 7 days. Custom design, mobile-ready, SEO-optimized, hosting setup. EUR299 one-time.', webH1: 'Web Design',
  },
};

CONTENT.fr = {
  webIntro: 'Un site web professionnel conçu sur mesure et livré en 7 jours. Adapté mobile, optimisé SEO, hébergement inclus. De 699€, maintenant 299€ — paiement unique, sans abonnement.', webInclTitle: 'Ce qui est inclus', webInclBody: 'Design sur mesure adapté à votre marque et votre public. Mobile d’abord, entièrement responsive. Base SEO. Formulaire de contact. Hébergement et connexion du domaine. 1 mois de support. Remise complète.', webHowTitle: 'Comment ça marche', webHowBody: 'Payez une fois sur Stripe, revenez ici et remplissez votre brief avec l’e-mail utilisé pour le paiement. Nous examinons sous 24 heures et livrons en 7 jours.', webCta: 'Démarrer votre projet',
  webTitle: 'Création de site web - AplusZ.app', webDesc: 'Site web professionnel livré en 7 jours. Design sur mesure, adapté mobile, optimisé SEO, hébergement inclus. 299€ une seule fois.', webH1: 'Création de site web',
  faqTitle: 'Foire aux questions',
  faqDesc: 'Réponses sur AplusZ — comment il trouve les tarifs les plus bas, pourquoi il est gratuit, comment réserver, les langues et l’usage hors ligne.',
  faq: [
    { q: 'Qu’est-ce qu’AplusZ ?', a: 'AplusZ trouve le tarif aérien le plus bas pour n’importe quelle route et vous indique la meilleure date pour réserver dans les 6 prochains mois. Il analyse jusqu’à 50 000 prix sur 2 000 aéroports, gratuitement, sans inscription.' },
    { q: 'AplusZ est-il vraiment gratuit ?', a: 'Oui. Rechercher des prix et suivre des routes est gratuit pour toujours, sans inscription. AplusZ ne gagne quelque chose que si vous choisissez de réserver via un partenaire — le prix que vous payez reste exactement le même.' },
    { q: 'Comment fonctionne la tarification ?', a: 'L’offre gratuite couvre les recherches illimitées, la meilleure date et le meilleur prix exacts, une route enregistrée, des rappels illimités, l’export vers le calendrier et l’usage hors ligne. Pro et Pro+ ajoutent davantage de routes enregistrées et des changements de route.' },
    { q: 'Comment réserver un vol ?', a: 'AplusZ vous montre le tarif le plus bas et la meilleure date, puis vous oriente vers un partenaire de réservation de confiance pour finaliser l’achat. AplusZ ne vous facture jamais rien et n’ajoute rien au tarif.' },
    { q: 'Combien de temps à l’avance réserver ?', a: 'Pour la plupart des routes, les tarifs les plus bas apparaissent 4 à 10 semaines avant le départ. AplusZ affiche les dates les moins chères sur les 6 prochains mois, pour voir le bon moment au lieu de deviner.' },
    { q: 'AplusZ fonctionne-t-il hors ligne ?', a: 'Oui. Une fois chargé, AplusZ fonctionne hors ligne pour vos routes enregistrées et vos rappels, consultables partout, même sans connexion.' },
    { q: 'Quelles langues AplusZ prend-il en charge ?', a: 'AplusZ est disponible en 20 langues, avec les mêmes fonctionnalités gratuites dans chaque langue.' },
  ],
  aboutTitle: 'À propos d’AplusZ',
  aboutDesc: 'AplusZ aide à voyager pour moins cher — gratuit, sans inscription. Jusqu’à 50 000 prix analysés pour trouver la meilleure date sur 6 mois.',
  aboutH1: 'À propos d’AplusZ',
  aboutBody: [
    'AplusZ existe pour une seule raison : aider les gens à voyager pour moins cher.',
    'Prendre l’avion ne devrait pas être un jeu de devinettes. Les prix varient énormément, et la plupart des gens paient trop cher simplement parce qu’ils ne voient pas quand une route est la moins chère. AplusZ supprime les suppositions — il analyse jusqu’à 50 000 prix sur 2 000 aéroports et vous montre la meilleure date pour réserver dans les 6 prochains mois.',
    'AplusZ est gratuit, et c’est tout l’intérêt. Pas d’inscription, pas de barrière payante sur la recherche, aucun piège. Le cœur du projet est destiné à rester gratuit pour tous, une fois les coûts de fonctionnement couverts.',
    'Lorsque vous choisissez de réserver, AplusZ peut percevoir une petite commission d’un partenaire — sans coût supplémentaire pour vous. Le prix que vous payez est toujours le même. C’est ce qui finance le service et garde les recherches gratuites.',
    'Plus les gens utilisent et partagent AplusZ, plus vite il atteint le point où il s’autofinance et reste gratuit pour de bon. C’est toute l’idée : voler pour moins cher, et aider les autres à faire de même.',
  ],
  fbTitle: 'Retour', fbDesc: 'Signalez un bug ou proposez une fonctionnalité pour AplusZ. En quelques mots, sans inscription.',
  fbH1: 'Envoyer un retour', fbIntro: 'Un bug ou une idée ? Dites-le-nous en quelques mots. Sans inscription.',
  fbBug: 'Bug', fbIdea: 'Idée', fbPlaceholder: 'Décrivez le bug ou votre idée…',
  fbEmailLabel: 'Votre e-mail (facultatif)', fbEmailPlaceholder: 'vous@exemple.com',
  fbSend: 'Envoyer', fbSending: 'Envoi…', fbOk: 'Merci — votre retour a été envoyé.',
  fbErr: 'Échec de l’envoi. Veuillez réessayer.', fbEmpty: 'Veuillez d’abord écrire un court message.',
};

CONTENT.es = {
  webIntro: 'Un sitio web profesional diseñado a medida y entregado en 7 días. Adaptado a móvil, optimizado para SEO, con alojamiento incluido. De 699€, ahora 299€ — pago único, sin suscripción.', webInclTitle: 'Qué incluye', webInclBody: 'Diseño a medida adaptado a tu marca y público. Mobile-first, totalmente responsive. Base SEO. Formulario de contacto. Alojamiento y conexión de dominio. 1 mes de soporte. Entrega completa.', webHowTitle: 'Cómo funciona', webHowBody: 'Paga una vez en Stripe, vuelve aquí y completa tu brief con el correo con el que pagaste. Revisamos en 24 horas y entregamos en 7 días.', webCta: 'Inicia tu proyecto',
  webTitle: 'Diseño web - AplusZ.app', webDesc: 'Sitio web profesional en 7 días. Diseño a medida, móvil, optimizado para SEO, alojamiento incluido. 299€ pago único.', webH1: 'Diseño web',
  faqTitle: 'Preguntas frecuentes',
  faqDesc: 'Respuestas sobre AplusZ: cómo encuentra las tarifas más bajas, por qué es gratis, cómo reservar, idiomas y uso sin conexión.',
  faq: [
    { q: '¿Qué es AplusZ?', a: 'AplusZ encuentra la tarifa aérea más baja para cualquier ruta y te indica la mejor fecha para reservar en los próximos 6 meses. Analiza hasta 50 000 precios en 2 000 aeropuertos, gratis y sin registro.' },
    { q: '¿AplusZ es realmente gratis?', a: 'Sí. Buscar precios y seguir rutas es gratis para siempre, sin registro. AplusZ solo gana si decides reservar a través de un socio: el precio que pagas es exactamente el mismo.' },
    { q: '¿Cómo funcionan los planes?', a: 'El plan gratis incluye búsquedas ilimitadas, la mejor fecha y precio exactos, una ruta guardada, recordatorios ilimitados, exportar al calendario y uso sin conexión. Pro y Pro+ añaden más rutas guardadas y cambios de ruta.' },
    { q: '¿Cómo reservo un vuelo?', a: 'AplusZ te muestra la tarifa más baja y la mejor fecha, y luego te lleva a un socio de reservas de confianza para completar la compra. AplusZ nunca te cobra ni añade nada a la tarifa.' },
    { q: '¿Con cuánta antelación reservar?', a: 'En la mayoría de rutas las tarifas más bajas aparecen de 4 a 10 semanas antes de la salida. AplusZ muestra las fechas más baratas de los próximos 6 meses, para ver el momento ideal sin adivinar.' },
    { q: '¿AplusZ funciona sin conexión?', a: 'Sí. Una vez cargado, AplusZ funciona sin conexión para tus rutas guardadas y recordatorios, así puedes consultarlos en cualquier lugar, incluso sin conexión.' },
    { q: '¿Qué idiomas admite AplusZ?', a: 'AplusZ está disponible en 20 idiomas, con las mismas funciones gratuitas en todos ellos.' },
  ],
  aboutTitle: 'Acerca de AplusZ',
  aboutDesc: 'AplusZ ayuda a volar por menos: gratis, sin registro. Analiza hasta 50 000 precios para hallar la mejor fecha en 6 meses.',
  aboutH1: 'Acerca de AplusZ',
  aboutBody: [
    'AplusZ existe por una sola razón: ayudar a la gente a volar por menos.',
    'Volar no debería ser un juego de adivinanzas. Los precios varían muchísimo y la mayoría paga de más simplemente porque no ve cuándo una ruta es más barata. AplusZ elimina las conjeturas: analiza hasta 50 000 precios en 2 000 aeropuertos y te muestra la mejor fecha para reservar en los próximos 6 meses.',
    'AplusZ es gratis, y esa es la idea. Sin registro, sin muro de pago en las búsquedas y sin trampas. El núcleo del proyecto está pensado para seguir siendo gratis para todos, una vez cubiertos los costes de funcionamiento.',
    'Cuando eliges reservar, AplusZ puede ganar una pequeña comisión de un socio, sin coste adicional para ti. El precio que pagas es siempre el mismo. Eso es lo que mantiene el servicio y las búsquedas gratis.',
    'Cuanta más gente use y comparta AplusZ, antes llegará al punto en que se sostiene solo y sigue siendo gratis para siempre. Esa es toda la idea: volar por menos y ayudar a otros a hacer lo mismo.',
  ],
  fbTitle: 'Comentarios', fbDesc: 'Informa de un error o sugiere una función para AplusZ. En pocas palabras, sin registro.',
  fbH1: 'Enviar comentarios', fbIntro: '¿Encontraste un error o tienes una idea? Dínoslo en pocas palabras. Sin registro.',
  fbBug: 'Error', fbIdea: 'Idea', fbPlaceholder: 'Describe el error o tu idea…',
  fbEmailLabel: 'Tu correo (opcional)', fbEmailPlaceholder: 'tu@ejemplo.com',
  fbSend: 'Enviar', fbSending: 'Enviando…', fbOk: 'Gracias: tus comentarios se enviaron.',
  fbErr: 'No se pudo enviar. Inténtalo de nuevo.', fbEmpty: 'Escribe primero un mensaje breve.',
};

CONTENT.de = {
  webIntro: 'Eine professionelle, maßgeschneiderte Website, in 7 Tagen erstellt und geliefert. Mobiloptimiert, SEO-optimiert, inkl. Hosting-Einrichtung. Von 699€, jetzt 299€ — Einmalzahlung, kein Abo.', webInclTitle: 'Was enthalten ist', webInclBody: 'Maßgeschneidertes Design für Ihre Marke und Zielgruppe. Mobile-first, voll responsiv. SEO-Grundlage. Kontaktformular. Hosting und Domain-Anbindung. 1 Monat Support. Vollständige Übergabe.', webHowTitle: 'So funktioniert es', webHowBody: 'Einmal über Stripe bezahlen, hierher zurückkehren und Ihr Briefing mit der Zahlungs-E-Mail ausfüllen. Wir prüfen innerhalb von 24 Stunden und liefern in 7 Tagen.', webCta: 'Projekt starten',
  webTitle: 'Webdesign - AplusZ.app', webDesc: 'Professionelle Website in 7 Tagen. Maßgeschneidertes Design, mobiloptimiert, SEO-optimiert, Hosting inklusive. 299€ einmalig.', webH1: 'Webdesign',
  faqTitle: 'Häufige Fragen',
  faqDesc: 'Antworten zu AplusZ — wie es die günstigsten Tarife findet, warum es kostenlos ist, wie das Buchen funktioniert, Sprachen und Offline-Nutzung.',
  faq: [
    { q: 'Was ist AplusZ?', a: 'AplusZ findet den günstigsten Flugpreis für jede Strecke und nennt dir das beste Buchungsdatum innerhalb der nächsten 6 Monate. Es durchsucht bis zu 50.000 Preise an 2.000 Flughäfen, kostenlos und ohne Anmeldung.' },
    { q: 'Ist AplusZ wirklich kostenlos?', a: 'Ja. Preise suchen und Strecken verfolgen ist für immer kostenlos, ohne Anmeldung. AplusZ verdient nur, wenn du über einen Partner buchst — der Preis, den du zahlst, bleibt genau gleich.' },
    { q: 'Wie funktionieren die Tarife?', a: 'Kostenlos umfasst unbegrenzte Suchen, das genaue beste Datum und den besten Preis, eine gespeicherte Strecke, unbegrenzte Erinnerungen, Kalender-Export und Offline-Nutzung. Pro und Pro+ bieten mehr gespeicherte Strecken und Streckenwechsel.' },
    { q: 'Wie buche ich einen Flug?', a: 'AplusZ zeigt dir den günstigsten Preis und das beste Datum und leitet dich dann zu einem vertrauenswürdigen Buchungspartner weiter. AplusZ berechnet dir nie etwas und schlägt nichts auf den Preis auf.' },
    { q: 'Wie früh sollte ich buchen?', a: 'Bei den meisten Strecken erscheinen die günstigsten Preise 4 bis 10 Wochen vor Abflug. AplusZ zeigt die günstigsten Daten der nächsten 6 Monate, damit du den richtigen Zeitpunkt siehst statt zu raten.' },
    { q: 'Funktioniert AplusZ offline?', a: 'Ja. Einmal geladen, funktioniert AplusZ offline für deine gespeicherten Strecken und Erinnerungen, sodass du sie überall abrufen kannst, auch ohne Verbindung.' },
    { q: 'Welche Sprachen unterstützt AplusZ?', a: 'AplusZ ist in 20 Sprachen verfügbar, mit denselben kostenlosen Funktionen in jeder Sprache.' },
  ],
  aboutTitle: 'Über AplusZ',
  aboutDesc: 'AplusZ hilft, günstiger zu fliegen — kostenlos, ohne Anmeldung. Bis zu 50.000 Preise für das beste Datum in 6 Monaten.',
  aboutH1: 'Über AplusZ',
  aboutBody: [
    'AplusZ gibt es aus einem einzigen Grund: Menschen zu helfen, günstiger zu fliegen.',
    'Fliegen sollte kein Ratespiel sein. Preise schwanken stark, und die meisten zahlen zu viel, einfach weil sie nicht sehen, wann eine Strecke am günstigsten ist. AplusZ nimmt das Rätselraten weg — es durchsucht bis zu 50.000 Preise an 2.000 Flughäfen und zeigt dir das beste Buchungsdatum der nächsten 6 Monate.',
    'AplusZ ist kostenlos, und das ist der Sinn. Keine Anmeldung, keine Bezahlschranke bei der Suche, kein Haken. Der Kern des Projekts soll für alle kostenlos bleiben, sobald die laufenden Kosten gedeckt sind.',
    'Wenn du buchst, erhält AplusZ möglicherweise eine kleine Provision von einem Partner — ohne Mehrkosten für dich. Der Preis, den du zahlst, ist immer derselbe. Das hält den Dienst am Laufen und die Suche kostenlos.',
    'Je mehr Menschen AplusZ nutzen und teilen, desto schneller erreicht es den Punkt, an dem es sich selbst trägt und dauerhaft kostenlos bleibt. Das ist die ganze Idee: günstiger fliegen und anderen helfen, dasselbe zu tun.',
  ],
  fbTitle: 'Feedback', fbDesc: 'Melde einen Fehler oder schlage eine Funktion für AplusZ vor. Mit wenigen Worten, ohne Anmeldung.',
  fbH1: 'Feedback senden', fbIntro: 'Einen Fehler gefunden oder eine Idee? Sag es uns in wenigen Worten. Keine Anmeldung nötig.',
  fbBug: 'Fehler', fbIdea: 'Idee', fbPlaceholder: 'Beschreibe den Fehler oder deine Idee…',
  fbEmailLabel: 'Deine E-Mail (optional)', fbEmailPlaceholder: 'du@beispiel.com',
  fbSend: 'Senden', fbSending: 'Senden…', fbOk: 'Danke — dein Feedback wurde gesendet.',
  fbErr: 'Senden fehlgeschlagen. Bitte versuche es erneut.', fbEmpty: 'Bitte schreibe zuerst eine kurze Nachricht.',
};

CONTENT.it = {
  webIntro: 'Un sito web professionale su misura, realizzato e consegnato in 7 giorni. Ottimizzato per mobile e SEO, con hosting incluso. Da 699€, ora 299€ — pagamento unico, nessun abbonamento.', webInclTitle: 'Cosa è incluso', webInclBody: 'Design su misura per il tuo brand e pubblico. Mobile-first, completamente responsive. Base SEO. Modulo di contatto. Hosting e collegamento del dominio. 1 mese di supporto. Consegna completa.', webHowTitle: 'Come funziona', webHowBody: 'Paga una volta su Stripe, torna qui e compila il brief con l’email usata per il pagamento. Esaminiamo entro 24 ore e consegniamo in 7 giorni.', webCta: 'Avvia il tuo progetto',
  webTitle: 'Web design - AplusZ.app', webDesc: 'Sito web professionale in 7 giorni. Design su misura, ottimizzato per mobile e SEO, hosting incluso. 299€ una tantum.', webH1: 'Web design',
  faqTitle: 'Domande frequenti',
  faqDesc: 'Risposte su AplusZ — come trova le tariffe più basse, perché è gratuito, come prenotare, lingue e uso offline.',
  faq: [
    { q: 'Che cos’è AplusZ?', a: 'AplusZ trova la tariffa aerea più bassa per qualsiasi rotta e ti indica la data migliore per prenotare nei prossimi 6 mesi. Analizza fino a 50.000 prezzi su 2.000 aeroporti, gratis e senza registrazione.' },
    { q: 'AplusZ è davvero gratuito?', a: 'Sì. Cercare prezzi e monitorare rotte è gratis per sempre, senza registrazione. AplusZ guadagna solo se scegli di prenotare tramite un partner — il prezzo che paghi resta esattamente lo stesso.' },
    { q: 'Come funzionano i piani?', a: 'Il piano gratuito include ricerche illimitate, la data e il prezzo migliori esatti, una rotta salvata, promemoria illimitati, esportazione su calendario e uso offline. Pro e Pro+ aggiungono più rotte salvate e cambi di rotta.' },
    { q: 'Come prenoto un volo?', a: 'AplusZ ti mostra la tariffa più bassa e la data migliore, poi ti indirizza a un partner di prenotazione affidabile per completare l’acquisto. AplusZ non ti addebita mai nulla e non aggiunge nulla alla tariffa.' },
    { q: 'Con quanto anticipo prenotare?', a: 'Per la maggior parte delle rotte le tariffe più basse compaiono 4–10 settimane prima della partenza. AplusZ mostra le date più economiche dei prossimi 6 mesi, così vedi il momento giusto senza tirare a indovinare.' },
    { q: 'AplusZ funziona offline?', a: 'Sì. Una volta caricato, AplusZ funziona offline per le rotte salvate e i promemoria, così puoi consultarli ovunque, anche senza connessione.' },
    { q: 'Quali lingue supporta AplusZ?', a: 'AplusZ è disponibile in 20 lingue, con le stesse funzioni gratuite in ogni lingua.' },
  ],
  aboutTitle: 'Informazioni su AplusZ',
  aboutDesc: 'AplusZ aiuta a volare spendendo meno — gratis, senza registrazione. Fino a 50.000 prezzi per trovare la data migliore in 6 mesi.',
  aboutH1: 'Informazioni su AplusZ',
  aboutBody: [
    'AplusZ esiste per un solo motivo: aiutare le persone a volare spendendo meno.',
    'Volare non dovrebbe essere un gioco d’azzardo. I prezzi oscillano molto e la maggior parte delle persone paga troppo semplicemente perché non vede quando una rotta costa meno. AplusZ elimina le supposizioni: analizza fino a 50.000 prezzi su 2.000 aeroporti e ti mostra la data migliore per prenotare nei prossimi 6 mesi.',
    'AplusZ è gratuito, ed è proprio questo il punto. Nessuna registrazione, nessun muro a pagamento sulla ricerca, nessun inganno. Il cuore del progetto è pensato per restare gratuito per tutti, una volta coperti i costi di gestione.',
    'Quando scegli di prenotare, AplusZ può guadagnare una piccola commissione da un partner — senza costi aggiuntivi per te. Il prezzo che paghi è sempre lo stesso. È questo che mantiene attivo il servizio e gratuite le ricerche.',
    'Più persone usano e condividono AplusZ, prima raggiunge il punto in cui si sostiene da solo e resta gratuito per sempre. L’idea è tutta qui: volare spendendo meno e aiutare gli altri a fare lo stesso.',
  ],
  fbTitle: 'Feedback', fbDesc: 'Segnala un bug o proponi una funzione per AplusZ. In poche parole, senza registrazione.',
  fbH1: 'Invia feedback', fbIntro: 'Hai trovato un bug o hai un’idea? Diccelo in poche parole. Senza registrazione.',
  fbBug: 'Bug', fbIdea: 'Idea', fbPlaceholder: 'Descrivi il bug o la tua idea…',
  fbEmailLabel: 'La tua email (facoltativa)', fbEmailPlaceholder: 'tu@esempio.com',
  fbSend: 'Invia', fbSending: 'Invio…', fbOk: 'Grazie — il tuo feedback è stato inviato.',
  fbErr: 'Invio non riuscito. Riprova.', fbEmpty: 'Scrivi prima un breve messaggio.',
};

CONTENT.pt = {
  webIntro: 'Um site profissional com design personalizado, criado e entregue em 7 dias. Adaptado a móvel, otimizado para SEO, com hospedagem incluída. De 699€, agora 299€ — pagamento único, sem assinatura.', webInclTitle: 'O que está incluído', webInclBody: 'Design personalizado para a sua marca e público. Mobile-first, totalmente responsivo. Base de SEO. Formulário de contato. Hospedagem e conexão de domínio. 1 mês de suporte. Entrega completa.', webHowTitle: 'Como funciona', webHowBody: 'Pague uma vez no Stripe, volte aqui e preencha o seu briefing com o e-mail usado no pagamento. Avaliamos em 24 horas e entregamos em 7 dias.', webCta: 'Inicie o seu projeto',
  webTitle: 'Web design - AplusZ.app', webDesc: 'Site profissional em 7 dias. Design personalizado, otimizado para móvel e SEO, hospedagem incluída. 299€ pagamento único.', webH1: 'Web design',
  faqTitle: 'Perguntas frequentes',
  faqDesc: 'Respostas sobre o AplusZ — como encontra as tarifas mais baixas, por que é grátis, como reservar, idiomas e uso offline.',
  faq: [
    { q: 'O que é o AplusZ?', a: 'O AplusZ encontra a tarifa aérea mais baixa para qualquer rota e informa a melhor data para reservar nos próximos 6 meses. Analisa até 50.000 preços em 2.000 aeroportos, grátis e sem cadastro.' },
    { q: 'O AplusZ é mesmo grátis?', a: 'Sim. Pesquisar preços e acompanhar rotas é grátis para sempre, sem cadastro. O AplusZ só ganha se você optar por reservar através de um parceiro — o preço que você paga continua exatamente o mesmo.' },
    { q: 'Como funcionam os planos?', a: 'O plano grátis inclui pesquisas ilimitadas, a melhor data e o melhor preço exatos, uma rota salva, lembretes ilimitados, exportação para o calendário e uso offline. Pro e Pro+ adicionam mais rotas salvas e trocas de rota.' },
    { q: 'Como reservo um voo?', a: 'O AplusZ mostra a tarifa mais baixa e a melhor data, depois encaminha você a um parceiro de reservas confiável para concluir a compra. O AplusZ nunca cobra nada e não acrescenta nada à tarifa.' },
    { q: 'Com quanta antecedência reservar?', a: 'Na maioria das rotas, as tarifas mais baixas aparecem de 4 a 10 semanas antes da partida. O AplusZ mostra as datas mais baratas dos próximos 6 meses, para você ver o momento certo sem adivinhar.' },
    { q: 'O AplusZ funciona offline?', a: 'Sim. Depois de carregado, o AplusZ funciona offline para suas rotas salvas e lembretes, então você pode consultá-los em qualquer lugar, mesmo sem conexão.' },
    { q: 'Quais idiomas o AplusZ suporta?', a: 'O AplusZ está disponível em 20 idiomas, com os mesmos recursos gratuitos em cada idioma.' },
  ],
  aboutTitle: 'Sobre o AplusZ',
  aboutDesc: 'O AplusZ ajuda a voar pagando menos — grátis, sem cadastro. Até 50.000 preços para achar a melhor data em 6 meses.',
  aboutH1: 'Sobre o AplusZ',
  aboutBody: [
    'O AplusZ existe por um único motivo: ajudar as pessoas a voar pagando menos.',
    'Voar não deveria ser um jogo de adivinhação. Os preços variam muito e a maioria paga demais simplesmente por não ver quando uma rota está mais barata. O AplusZ elimina o achismo: analisa até 50.000 preços em 2.000 aeroportos e mostra a melhor data para reservar nos próximos 6 meses.',
    'O AplusZ é grátis, e é esse o objetivo. Sem cadastro, sem muro de pagamento na pesquisa e sem pegadinhas. O núcleo do projeto deve continuar grátis para todos, uma vez cobertos os custos de operação.',
    'Quando você opta por reservar, o AplusZ pode ganhar uma pequena comissão de um parceiro — sem custo extra para você. O preço que você paga é sempre o mesmo. É isso que mantém o serviço no ar e as pesquisas gratuitas.',
    'Quanto mais pessoas usam e compartilham o AplusZ, mais rápido ele chega ao ponto de se sustentar sozinho e continuar grátis para sempre. A ideia é essa: voar pagando menos e ajudar os outros a fazer o mesmo.',
  ],
  fbTitle: 'Comentários', fbDesc: 'Relate um bug ou sugira um recurso para o AplusZ. Em poucas palavras, sem cadastro.',
  fbH1: 'Enviar comentários', fbIntro: 'Encontrou um bug ou tem uma ideia? Conte em poucas palavras. Sem cadastro.',
  fbBug: 'Bug', fbIdea: 'Ideia', fbPlaceholder: 'Descreva o bug ou sua ideia…',
  fbEmailLabel: 'Seu e-mail (opcional)', fbEmailPlaceholder: 'voce@exemplo.com',
  fbSend: 'Enviar', fbSending: 'Enviando…', fbOk: 'Obrigado — seus comentários foram enviados.',
  fbErr: 'Não foi possível enviar. Tente novamente.', fbEmpty: 'Escreva primeiro uma mensagem curta.',
};

CONTENT.nl = {
  webIntro: 'Een professionele website op maat, gebouwd en geleverd in 7 dagen. Mobielklaar, SEO-geoptimaliseerd, inclusief hostingconfiguratie. Van 699€, nu 299€ — eenmalige betaling, geen abonnement.', webInclTitle: 'Wat is inbegrepen', webInclBody: 'Op maat ontworpen voor jouw merk en publiek. Mobile-first, volledig responsive. SEO-basis. Contactformulier. Hosting en domeinkoppeling. 1 maand support. Volledige overdracht.', webHowTitle: 'Hoe het werkt', webHowBody: 'Betaal eenmalig via Stripe, kom terug en vul je briefing in met het e-mailadres waarmee je betaalde. We beoordelen binnen 24 uur en leveren in 7 dagen.', webCta: 'Start je project',
  webTitle: 'Webdesign - AplusZ.app', webDesc: 'Professionele website in 7 dagen. Op maat ontworpen, mobielklaar, SEO-geoptimaliseerd, hosting inbegrepen. 299€ eenmalig.', webH1: 'Webdesign',
  faqTitle: 'Veelgestelde vragen',
  faqDesc: 'Antwoorden over AplusZ — hoe het de laagste tarieven vindt, waarom het gratis is, hoe boeken werkt, talen en offline gebruik.',
  faq: [
    { q: 'Wat is AplusZ?', a: 'AplusZ vindt het laagste vliegtarief voor elke route en toont je de beste datum om te boeken binnen de komende 6 maanden. Het scant tot 50.000 prijzen op 2.000 luchthavens, gratis en zonder aanmelding.' },
    { q: 'Is AplusZ echt gratis?', a: 'Ja. Prijzen zoeken en routes volgen is voor altijd gratis, zonder aanmelding. AplusZ verdient alleen als je ervoor kiest om via een partner te boeken — de prijs die je betaalt blijft precies hetzelfde.' },
    { q: 'Hoe werken de abonnementen?', a: 'Gratis omvat onbeperkt zoeken, de exacte beste datum en prijs, één opgeslagen route, onbeperkte herinneringen, agenda-export en offline gebruik. Pro en Pro+ voegen meer opgeslagen routes en routewissels toe.' },
    { q: 'Hoe boek ik een vlucht?', a: 'AplusZ toont je het laagste tarief en de beste datum en stuurt je vervolgens naar een betrouwbare boekingspartner om de aankoop af te ronden. AplusZ rekent je nooit iets aan en voegt niets toe aan het tarief.' },
    { q: 'Hoe ver vooruit boeken?', a: 'Voor de meeste routes verschijnen de laagste tarieven 4 tot 10 weken voor vertrek. AplusZ toont de goedkoopste data van de komende 6 maanden, zodat je het juiste moment ziet in plaats van te gokken.' },
    { q: 'Werkt AplusZ offline?', a: 'Ja. Eenmaal geladen werkt AplusZ offline voor je opgeslagen routes en herinneringen, zodat je ze overal kunt bekijken, zelfs zonder verbinding.' },
    { q: 'Welke talen ondersteunt AplusZ?', a: 'AplusZ is beschikbaar in 20 talen, met dezelfde gratis functies in elke taal.' },
  ],
  aboutTitle: 'Over AplusZ',
  aboutDesc: 'AplusZ helpt goedkoper te vliegen — gratis, zonder aanmelding. Tot 50.000 prijzen voor de beste datum binnen 6 maanden.',
  aboutH1: 'Over AplusZ',
  aboutBody: [
    'AplusZ bestaat om één reden: mensen helpen goedkoper te vliegen.',
    'Vliegen zou geen gokspel moeten zijn. Prijzen schommelen sterk en de meeste mensen betalen te veel, simpelweg omdat ze niet zien wanneer een route het goedkoopst is. AplusZ haalt het giswerk weg — het scant tot 50.000 prijzen op 2.000 luchthavens en toont je de beste datum om te boeken binnen de komende 6 maanden.',
    'AplusZ is gratis, en dat is precies de bedoeling. Geen aanmelding, geen betaalmuur bij het zoeken en geen addertjes. De kern van het project moet voor iedereen gratis blijven, zodra de lopende kosten zijn gedekt.',
    'Wanneer je ervoor kiest te boeken, kan AplusZ een kleine commissie van een partner ontvangen — zonder extra kosten voor jou. De prijs die je betaalt is altijd hetzelfde. Dat houdt de dienst draaiende en het zoeken gratis.',
    'Hoe meer mensen AplusZ gebruiken en delen, hoe sneller het het punt bereikt waarop het zichzelf bedruipt en voorgoed gratis blijft. Dat is het hele idee: goedkoper vliegen en anderen helpen hetzelfde te doen.',
  ],
  fbTitle: 'Feedback', fbDesc: 'Meld een bug of stel een functie voor AplusZ voor. In een paar woorden, zonder aanmelding.',
  fbH1: 'Feedback sturen', fbIntro: 'Een bug gevonden of een idee? Vertel het ons in een paar woorden. Geen aanmelding nodig.',
  fbBug: 'Bug', fbIdea: 'Idee', fbPlaceholder: 'Beschrijf de bug of je idee…',
  fbEmailLabel: 'Je e-mail (optioneel)', fbEmailPlaceholder: 'jij@voorbeeld.com',
  fbSend: 'Versturen', fbSending: 'Versturen…', fbOk: 'Bedankt — je feedback is verzonden.',
  fbErr: 'Verzenden mislukt. Probeer het opnieuw.', fbEmpty: 'Schrijf eerst een kort bericht.',
};

CONTENT.pl = {
  webIntro: 'Profesjonalna strona zaprojektowana na zamówienie, zbudowana i dostarczona w 7 dni. Mobilna, zoptymalizowana pod SEO, z konfiguracją hostingu. Z 699€, teraz 299€ — jednorazowa płatność, bez subskrypcji.', webInclTitle: 'Co obejmuje', webInclBody: 'Projekt na zamówienie dopasowany do Twojej marki i odbiorców. Mobile-first, w pełni responsywny. Podstawy SEO. Formularz kontaktowy. Hosting i podłączenie domeny. 1 miesiąc wsparcia. Pełne przekazanie.', webHowTitle: 'Jak to działa', webHowBody: 'Zapłać raz przez Stripe, wróć tutaj i wypełnij brief e-mailem użytym do płatności. Sprawdzamy w 24 godziny i dostarczamy w 7 dni.', webCta: 'Rozpocznij projekt',
  webTitle: 'Projektowanie stron - AplusZ.app', webDesc: 'Profesjonalna strona w 7 dni. Projekt na zamówienie, mobilna, zoptymalizowana pod SEO, hosting w cenie. 299€ jednorazowo.', webH1: 'Projektowanie stron',
  faqTitle: 'Najczęstsze pytania',
  faqDesc: 'Odpowiedzi o AplusZ — jak znajduje najniższe ceny, dlaczego jest darmowy, jak rezerwować, języki i tryb offline.',
  faq: [
    { q: 'Czym jest AplusZ?', a: 'AplusZ znajduje najniższą cenę lotu na dowolnej trasie i wskazuje najlepszą datę rezerwacji w ciągu najbliższych 6 miesięcy. Przeszukuje do 50 000 cen na 2 000 lotnisk, za darmo i bez rejestracji.' },
    { q: 'Czy AplusZ jest naprawdę darmowy?', a: 'Tak. Wyszukiwanie cen i śledzenie tras jest darmowe na zawsze, bez rejestracji. AplusZ zarabia tylko, gdy zdecydujesz się zarezerwować przez partnera — cena, którą płacisz, pozostaje dokładnie taka sama.' },
    { q: 'Jak działają plany?', a: 'Plan darmowy obejmuje nieograniczone wyszukiwania, dokładną najlepszą datę i cenę, jedną zapisaną trasę, nieograniczone przypomnienia, eksport do kalendarza i tryb offline. Pro i Pro+ dodają więcej zapisanych tras i zmiany tras.' },
    { q: 'Jak zarezerwować lot?', a: 'AplusZ pokazuje najniższą cenę i najlepszą datę, a następnie kieruje Cię do zaufanego partnera rezerwacyjnego, aby dokończyć zakup. AplusZ nigdy nic nie pobiera i niczego nie dolicza do ceny.' },
    { q: 'Z jakim wyprzedzeniem rezerwować?', a: 'Na większości tras najniższe ceny pojawiają się 4–10 tygodni przed wylotem. AplusZ pokazuje najtańsze daty w ciągu najbliższych 6 miesięcy, więc widzisz właściwy moment, zamiast zgadywać.' },
    { q: 'Czy AplusZ działa offline?', a: 'Tak. Po wczytaniu AplusZ działa offline dla zapisanych tras i przypomnień, więc możesz je sprawdzić wszędzie, nawet bez połączenia.' },
    { q: 'Jakie języki obsługuje AplusZ?', a: 'AplusZ jest dostępny w 20 językach, z tymi samymi darmowymi funkcjami w każdym z nich.' },
  ],
  aboutTitle: 'O AplusZ',
  aboutDesc: 'AplusZ pomaga latać taniej — za darmo, bez rejestracji. Do 50 000 cen, aby znaleźć najlepszą datę w 6 miesięcy.',
  aboutH1: 'O AplusZ',
  aboutBody: [
    'AplusZ istnieje z jednego powodu: aby pomagać ludziom latać taniej.',
    'Latanie nie powinno być zgadywanką. Ceny mocno się wahają, a większość ludzi przepłaca tylko dlatego, że nie widzi, kiedy trasa jest najtańsza. AplusZ usuwa zgadywanie — przeszukuje do 50 000 cen na 2 000 lotnisk i pokazuje najlepszą datę rezerwacji w ciągu najbliższych 6 miesięcy.',
    'AplusZ jest darmowy i o to właśnie chodzi. Bez rejestracji, bez płatnej bariery przy wyszukiwaniu i bez haczyków. Rdzeń projektu ma pozostać darmowy dla wszystkich, gdy tylko pokryte zostaną koszty działania.',
    'Gdy zdecydujesz się zarezerwować, AplusZ może otrzymać niewielką prowizję od partnera — bez dodatkowych kosztów dla Ciebie. Cena, którą płacisz, jest zawsze taka sama. To właśnie utrzymuje usługę i sprawia, że wyszukiwanie jest darmowe.',
    'Im więcej osób korzysta z AplusZ i go udostępnia, tym szybciej osiągnie punkt, w którym sam się utrzymuje i pozostaje darmowy na zawsze. O to właśnie chodzi: latać taniej i pomagać innym robić to samo.',
  ],
  fbTitle: 'Opinie', fbDesc: 'Zgłoś błąd lub zaproponuj funkcję dla AplusZ. W kilku słowach, bez rejestracji.',
  fbH1: 'Wyślij opinię', fbIntro: 'Znalazłeś błąd lub masz pomysł? Powiedz nam w kilku słowach. Bez rejestracji.',
  fbBug: 'Błąd', fbIdea: 'Pomysł', fbPlaceholder: 'Opisz błąd lub swój pomysł…',
  fbEmailLabel: 'Twój e-mail (opcjonalnie)', fbEmailPlaceholder: 'ty@przyklad.com',
  fbSend: 'Wyślij', fbSending: 'Wysyłanie…', fbOk: 'Dziękujemy — Twoja opinia została wysłana.',
  fbErr: 'Nie udało się wysłać. Spróbuj ponownie.', fbEmpty: 'Najpierw napisz krótką wiadomość.',
};

CONTENT.ru = {
  webIntro: 'Профессиональный сайт с индивидуальным дизайном, готовый за 7 дней. Мобильная версия, SEO, настройка хостинга. Было 699€, теперь 299€ — разовый платёж, без подписки.', webInclTitle: 'Что включено', webInclBody: 'Индивидуальный дизайн под ваш бренд и аудиторию. Mobile-first, полностью адаптивный. Основа SEO. Форма обратной связи. Хостинг и подключение домена. 1 месяц поддержки. Полная передача.', webHowTitle: 'Как это работает', webHowBody: 'Оплатите один раз через Stripe, вернитесь сюда и заполните бриф с тем же e-mail. Мы проверяем в течение 24 часов и сдаём за 7 дней.', webCta: 'Начать проект',
  webTitle: 'Создание сайтов - AplusZ.app', webDesc: 'Профессиональный сайт за 7 дней. Индивидуальный дизайн, мобильная версия, SEO, хостинг. 299€ единоразово.', webH1: 'Создание сайтов',
  faqTitle: 'Частые вопросы',
  faqDesc: 'Ответы об AplusZ — как он находит самые низкие цены, почему он бесплатный, как бронировать, языки и работа офлайн.',
  faq: [
    { q: 'Что такое AplusZ?', a: 'AplusZ находит самую низкую цену на авиабилет для любого маршрута и подсказывает лучшую дату бронирования в ближайшие 6 месяцев. Он сканирует до 50 000 цен по 2 000 аэропортам, бесплатно и без регистрации.' },
    { q: 'AplusZ действительно бесплатный?', a: 'Да. Поиск цен и отслеживание маршрутов бесплатны навсегда, без регистрации. AplusZ зарабатывает, только если вы решите забронировать через партнёра — цена, которую вы платите, остаётся точно такой же.' },
    { q: 'Как работают тарифы?', a: 'Бесплатный тариф включает неограниченный поиск, точную лучшую дату и цену, один сохранённый маршрут, неограниченные напоминания, экспорт в календарь и работу офлайн. Pro и Pro+ добавляют больше сохранённых маршрутов и их замену.' },
    { q: 'Как забронировать рейс?', a: 'AplusZ показывает самую низкую цену и лучшую дату, а затем направляет вас к надёжному партнёру по бронированию для завершения покупки. AplusZ никогда не берёт с вас плату и ничего не добавляет к цене.' },
    { q: 'За сколько времени бронировать?', a: 'Для большинства маршрутов самые низкие цены появляются за 4–10 недель до вылета. AplusZ показывает самые дешёвые даты на ближайшие 6 месяцев, чтобы вы видели нужный момент, а не угадывали.' },
    { q: 'Работает ли AplusZ офлайн?', a: 'Да. После загрузки AplusZ работает офлайн для ваших сохранённых маршрутов и напоминаний, так что вы можете проверять их где угодно, даже без подключения.' },
    { q: 'Какие языки поддерживает AplusZ?', a: 'AplusZ доступен на 20 языках, с одинаковыми бесплатными функциями на каждом из них.' },
  ],
  aboutTitle: 'Об AplusZ',
  aboutDesc: 'AplusZ помогает летать дешевле — бесплатно, без регистрации. До 50 000 цен, чтобы найти лучшую дату за 6 месяцев.',
  aboutH1: 'Об AplusZ',
  aboutBody: [
    'AplusZ существует ради одной цели: помогать людям летать дешевле.',
    'Перелёты не должны быть игрой в угадайку. Цены сильно колеблются, и большинство переплачивает просто потому, что не видит, когда маршрут дешевле всего. AplusZ убирает догадки — он сканирует до 50 000 цен по 2 000 аэропортам и показывает лучшую дату бронирования в ближайшие 6 месяцев.',
    'AplusZ бесплатный, и в этом весь смысл. Никакой регистрации, никакой платной стены при поиске и никакого подвоха. Ядро проекта должно оставаться бесплатным для всех, как только покрыты эксплуатационные расходы.',
    'Когда вы решаете забронировать, AplusZ может получить небольшую комиссию от партнёра — без дополнительных расходов для вас. Цена, которую вы платите, всегда одна и та же. Именно это поддерживает сервис и сохраняет поиск бесплатным.',
    'Чем больше людей пользуются AplusZ и делятся им, тем быстрее он достигнет точки, когда сам себя окупает и остаётся бесплатным навсегда. В этом вся идея: летать дешевле и помогать другим делать то же самое.',
  ],
  fbTitle: 'Отзыв', fbDesc: 'Сообщите об ошибке или предложите функцию для AplusZ. В нескольких словах, без регистрации.',
  fbH1: 'Отправить отзыв', fbIntro: 'Нашли ошибку или есть идея? Расскажите в нескольких словах. Регистрация не нужна.',
  fbBug: 'Ошибка', fbIdea: 'Идея', fbPlaceholder: 'Опишите ошибку или вашу идею…',
  fbEmailLabel: 'Ваш e-mail (необязательно)', fbEmailPlaceholder: 'vy@primer.com',
  fbSend: 'Отправить', fbSending: 'Отправка…', fbOk: 'Спасибо — ваш отзыв отправлен.',
  fbErr: 'Не удалось отправить. Попробуйте ещё раз.', fbEmpty: 'Сначала напишите короткое сообщение.',
};

CONTENT.tr = {
  webIntro: '7 günde hazırlanan ve teslim edilen profesyonel, özel tasarım web sitesi. Mobil uyumlu, SEO optimize, hosting kurulumu dahil. 699€’dan, şimdi 299€ — tek seferlik ödeme, abonelik yok.', webInclTitle: 'Neler dahil', webInclBody: 'Markanıza ve kitlenize özel tasarım. Mobil öncelikli, tam responsive. SEO temeli. İletişim formu. Hosting ve alan adı bağlantısı. 1 ay destek. Tam devir.', webHowTitle: 'Nasıl çalışır', webHowBody: 'Stripe üzerinden bir kez ödeyin, buraya dönün ve ödeme yaptığınız e-postayla brief’inizi doldurun. 24 saat içinde inceler, 7 günde teslim ederiz.', webCta: 'Projenizi başlatın',
  webTitle: 'Web tasarım - AplusZ.app', webDesc: '7 günde profesyonel web sitesi. Özel tasarım, mobil uyumlu, SEO optimize, hosting dahil. Tek seferlik 299€.', webH1: 'Web tasarım',
  faqTitle: 'Sıkça Sorulan Sorular',
  faqDesc: 'AplusZ hakkında yanıtlar — en düşük ücretleri nasıl bulur, neden ücretsiz, rezervasyon nasıl çalışır, diller ve çevrimdışı kullanım.',
  faq: [
    { q: 'AplusZ nedir?', a: 'AplusZ herhangi bir rota için en düşük uçak biletini bulur ve önümüzdeki 6 ay içinde rezervasyon için en iyi tarihi söyler. 2.000 havalimanında 50.000’e kadar fiyatı tarar, ücretsiz ve kayıt olmadan.' },
    { q: 'AplusZ gerçekten ücretsiz mi?', a: 'Evet. Fiyat aramak ve rotaları izlemek sonsuza dek ücretsizdir, kayıt gerekmez. AplusZ yalnızca bir ortak üzerinden rezervasyon yapmayı seçerseniz kazanır — ödediğiniz fiyat tamamen aynı kalır.' },
    { q: 'Planlar nasıl çalışır?', a: 'Ücretsiz plan sınırsız arama, tam en iyi tarih ve fiyat, bir kayıtlı rota, sınırsız hatırlatıcı, takvime aktarma ve çevrimdışı kullanımı kapsar. Pro ve Pro+ daha fazla kayıtlı rota ve rota değişimi ekler.' },
    { q: 'Uçuşu nasıl rezerve ederim?', a: 'AplusZ size en düşük ücreti ve en iyi tarihi gösterir, ardından satın alımı tamamlamanız için güvenilir bir rezervasyon ortağına yönlendirir. AplusZ sizden asla ücret almaz ve ücrete hiçbir şey eklemez.' },
    { q: 'Ne kadar önceden rezervasyon yapmalı?', a: 'Çoğu rotada en düşük ücretler kalkıştan 4–10 hafta önce ortaya çıkar. AplusZ önümüzdeki 6 ayın en ucuz tarihlerini gösterir, böylece tahmin etmek yerine doğru anı görürsünüz.' },
    { q: 'AplusZ çevrimdışı çalışır mı?', a: 'Evet. Bir kez yüklendiğinde AplusZ kayıtlı rotalarınız ve hatırlatıcılarınız için çevrimdışı çalışır, böylece bağlantı olmadan bile her yerde kontrol edebilirsiniz.' },
    { q: 'AplusZ hangi dilleri destekler?', a: 'AplusZ 20 dilde mevcuttur, her dilde aynı ücretsiz özelliklerle.' },
  ],
  aboutTitle: 'AplusZ Hakkında',
  aboutDesc: 'AplusZ daha ucuza uçmaya yardımcı olur — ücretsiz, kayıtsız. 6 ayda en iyi tarihi bulmak için 50.000’e kadar fiyat.',
  aboutH1: 'AplusZ Hakkında',
  aboutBody: [
    'AplusZ tek bir nedenle var: insanların daha ucuza uçmasına yardım etmek.',
    'Uçmak bir tahmin oyunu olmamalı. Fiyatlar büyük ölçüde dalgalanır ve çoğu kişi yalnızca bir rotanın ne zaman en ucuz olduğunu göremediği için fazla öder. AplusZ tahmini ortadan kaldırır — 2.000 havalimanında 50.000’e kadar fiyatı tarar ve önümüzdeki 6 ay içinde rezervasyon için en iyi tarihi gösterir.',
    'AplusZ ücretsizdir ve asıl mesele de budur. Kayıt yok, aramada ödeme duvarı yok ve hile yok. Projenin özü, işletme maliyetleri karşılandığında herkes için ücretsiz kalacak şekilde tasarlanmıştır.',
    'Rezervasyon yapmayı seçtiğinizde AplusZ bir ortaktan küçük bir komisyon kazanabilir — size ek bir maliyet olmadan. Ödediğiniz fiyat her zaman aynıdır. Hizmeti ayakta tutan ve aramaları ücretsiz kılan da budur.',
    'AplusZ’yi ne kadar çok kişi kullanır ve paylaşırsa, kendi kendine yettiği ve kalıcı olarak ücretsiz kaldığı noktaya o kadar hızlı ulaşır. Tüm fikir bu: daha ucuza uçmak ve başkalarının da aynısını yapmasına yardım etmek.',
  ],
  fbTitle: 'Geri bildirim', fbDesc: 'AplusZ için bir hata bildirin veya özellik önerin. Birkaç kelimeyle, kayıtsız.',
  fbH1: 'Geri bildirim gönder', fbIntro: 'Bir hata mı buldunuz veya bir fikriniz mi var? Birkaç kelimeyle anlatın. Kayıt gerekmez.',
  fbBug: 'Hata', fbIdea: 'Fikir', fbPlaceholder: 'Hatayı veya fikrinizi açıklayın…',
  fbEmailLabel: 'E-postanız (isteğe bağlı)', fbEmailPlaceholder: 'siz@ornek.com',
  fbSend: 'Gönder', fbSending: 'Gönderiliyor…', fbOk: 'Teşekkürler — geri bildiriminiz gönderildi.',
  fbErr: 'Gönderilemedi. Lütfen tekrar deneyin.', fbEmpty: 'Lütfen önce kısa bir mesaj yazın.',
};

CONTENT.ar = {
  webIntro: 'موقع ويب احترافي بتصميم مخصص، يُبنى ويُسلّم في 7 أيام. متوافق مع الجوال، محسّن لمحركات البحث، مع إعداد الاستضافة. من 699€، الآن 299€ — دفعة واحدة، دون اشتراك.', webInclTitle: 'ما الذي يتضمنه', webInclBody: 'تصميم مخصص يناسب علامتك وجمهورك. يعطي الأولوية للجوال، متجاوب بالكامل. أساس SEO. نموذج اتصال. إعداد استضافة وربط نطاق. شهر دعم. تسليم كامل.', webHowTitle: 'كيف يعمل', webHowBody: 'ادفع مرة واحدة عبر Stripe، ثم عد هنا واملأ موجزك بالبريد الإلكتروني الذي دفعت به. نراجع خلال 24 ساعة ونسلّم في 7 أيام.', webCta: 'ابدأ مشروعك',
  webTitle: 'تصميم الويب - AplusZ.app', webDesc: 'موقع احترافي في 7 أيام. تصميم مخصص، متوافق مع الجوال، محسّن لمحركات البحث، استضافة مضمنة. 299€ دفعة واحدة.', webH1: 'تصميم الويب',
  faqTitle: 'الأسئلة الشائعة',
  faqDesc: 'إجابات حول AplusZ — كيف يجد أقل الأسعار، ولماذا هو مجاني، وكيف يتم الحجز، واللغات والاستخدام دون اتصال.',
  faq: [
    { q: 'ما هو AplusZ؟', a: 'يجد AplusZ أقل سعر طيران لأي مسار ويخبرك بأفضل تاريخ للحجز خلال الأشهر الستة القادمة. يفحص ما يصل إلى 50,000 سعر عبر 2,000 مطار، مجانًا ودون تسجيل.' },
    { q: 'هل AplusZ مجاني حقًا؟', a: 'نعم. البحث عن الأسعار وتتبع المسارات مجاني إلى الأبد، دون تسجيل. لا يربح AplusZ إلا إذا اخترت الحجز عبر شريك — والسعر الذي تدفعه يبقى كما هو تمامًا.' },
    { q: 'كيف تعمل الخطط؟', a: 'تشمل الخطة المجانية عمليات بحث غير محدودة، وأفضل تاريخ وسعر بدقة، ومسارًا محفوظًا واحدًا، وتذكيرات غير محدودة، والتصدير إلى التقويم، والاستخدام دون اتصال. تضيف Pro وPro+ مزيدًا من المسارات المحفوظة وتبديل المسارات.' },
    { q: 'كيف أحجز رحلة؟', a: 'يعرض لك AplusZ أقل سعر وأفضل تاريخ، ثم يوجهك إلى شريك حجز موثوق لإتمام الشراء. لا يفرض عليك AplusZ أي رسوم ولا يضيف شيئًا إلى السعر.' },
    { q: 'كم من الوقت مقدمًا أحجز؟', a: 'في معظم المسارات تظهر أقل الأسعار قبل 4 إلى 10 أسابيع من المغادرة. يعرض AplusZ أرخص التواريخ خلال الأشهر الستة القادمة، لترى الوقت المناسب بدلًا من التخمين.' },
    { q: 'هل يعمل AplusZ دون اتصال؟', a: 'نعم. بمجرد تحميله، يعمل AplusZ دون اتصال لمساراتك المحفوظة وتذكيراتك، فيمكنك مراجعتها في أي مكان، حتى دون اتصال.' },
    { q: 'ما اللغات التي يدعمها AplusZ؟', a: 'يتوفر AplusZ بعشرين لغة، مع الميزات المجانية نفسها في كل لغة.' },
  ],
  aboutTitle: 'حول AplusZ',
  aboutDesc: 'يساعدك AplusZ على السفر جوًا بأقل تكلفة — مجانًا ودون تسجيل. يفحص حتى 50,000 سعر لإيجاد أفضل تاريخ خلال 6 أشهر.',
  aboutH1: 'حول AplusZ',
  aboutBody: [
    'يوجد AplusZ لسبب واحد: مساعدة الناس على السفر جوًا بأقل تكلفة.',
    'لا ينبغي أن يكون السفر جوًا لعبة تخمين. تتقلب الأسعار بشدة، ويدفع معظم الناس أكثر من اللازم لمجرد أنهم لا يرون متى يكون المسار أرخص. يزيل AplusZ التخمين — يفحص ما يصل إلى 50,000 سعر عبر 2,000 مطار ويعرض لك أفضل تاريخ للحجز خلال الأشهر الستة القادمة.',
    'AplusZ مجاني، وهذا هو جوهر الأمر. لا تسجيل، ولا جدار دفع على البحث، ولا حيلة. يهدف جوهر المشروع إلى أن يبقى مجانيًا للجميع، بمجرد تغطية تكاليف التشغيل.',
    'عندما تختار الحجز، قد يكسب AplusZ عمولة صغيرة من شريك — دون أي تكلفة إضافية عليك. السعر الذي تدفعه هو نفسه دائمًا. هذا ما يبقي الخدمة عاملة والبحث مجانيًا.',
    'كلما زاد عدد من يستخدمون AplusZ ويشاركونه، أسرع وصوله إلى النقطة التي يعيل فيها نفسه ويبقى مجانيًا للأبد. هذه هي الفكرة كلها: السفر بأقل تكلفة ومساعدة الآخرين على فعل المثل.',
  ],
  fbTitle: 'ملاحظات', fbDesc: 'أبلغ عن خطأ أو اقترح ميزة لـ AplusZ. بكلمات قليلة، دون تسجيل.',
  fbH1: 'إرسال ملاحظات', fbIntro: 'وجدت خطأ أو لديك فكرة؟ أخبرنا بكلمات قليلة. لا حاجة للتسجيل.',
  fbBug: 'خطأ', fbIdea: 'فكرة', fbPlaceholder: 'صف الخطأ أو فكرتك…',
  fbEmailLabel: 'بريدك الإلكتروني (اختياري)', fbEmailPlaceholder: 'you@example.com',
  fbSend: 'إرسال', fbSending: 'جارٍ الإرسال…', fbOk: 'شكرًا — تم إرسال ملاحظاتك.',
  fbErr: 'تعذّر الإرسال. يرجى المحاولة مرة أخرى.', fbEmpty: 'يرجى كتابة رسالة قصيرة أولًا.',
};

CONTENT.fa = {
  webIntro: 'یک وب‌سایت حرفه‌ای با طراحی اختصاصی، ساخته و تحویل در ۷ روز. سازگار با موبایل، بهینه برای SEO، با راه‌اندازی میزبانی. از 699€، اکنون 299€ — پرداخت یک‌باره، بدون اشتراک.', webInclTitle: 'چه چیزی شامل است', webInclBody: 'طراحی اختصاصی متناسب با برند و مخاطبان شما. موبایل‌اول، کاملاً واکنش‌گرا. پایه SEO. فرم تماس. راه‌اندازی میزبانی و اتصال دامنه. ۱ ماه پشتیبانی. تحویل کامل.', webHowTitle: 'چگونه کار می‌کند', webHowBody: 'یک بار در Stripe پرداخت کنید، به اینجا بازگردید و با همان ایمیل پرداخت، بریف خود را پر کنید. در عرض 24 ساعت بررسی و در 7 روز تحویل می‌دهیم.', webCta: 'پروژه خود را شروع کنید',
  webTitle: 'طراحی وب - AplusZ.app', webDesc: 'وب‌سایت حرفه‌ای در ۷ روز. طراحی اختصاصی، سازگار با موبایل، بهینه برای SEO، میزبانی شامل. ۲۹۹€ یک‌بار.', webH1: 'طراحی وب',
  faqTitle: 'پرسش‌های متداول',
  faqDesc: 'پاسخ‌هایی درباره AplusZ — چگونه ارزان‌ترین قیمت‌ها را می‌یابد، چرا رایگان است، رزرو چگونه است، زبان‌ها و استفاده آفلاین.',
  faq: [
    { q: 'AplusZ چیست؟', a: 'AplusZ کمترین قیمت پرواز را برای هر مسیر پیدا می‌کند و بهترین تاریخ رزرو در ۶ ماه آینده را به شما می‌گوید. تا ۵۰٬۰۰۰ قیمت را در ۲٬۰۰۰ فرودگاه بررسی می‌کند، رایگان و بدون ثبت‌نام.' },
    { q: 'آیا AplusZ واقعاً رایگان است؟', a: 'بله. جست‌وجوی قیمت و پیگیری مسیرها برای همیشه رایگان است، بدون ثبت‌نام. AplusZ تنها در صورتی درآمد دارد که از طریق یک شریک رزرو کنید — قیمتی که می‌پردازید دقیقاً همان می‌ماند.' },
    { q: 'طرح‌ها چگونه کار می‌کنند؟', a: 'طرح رایگان شامل جست‌وجوی نامحدود، بهترین تاریخ و قیمت دقیق، یک مسیر ذخیره‌شده، یادآوری‌های نامحدود، خروجی تقویم و استفاده آفلاین است. Pro و Pro+ مسیرهای ذخیره‌شده بیشتر و تعویض مسیر را اضافه می‌کنند.' },
    { q: 'چگونه پرواز رزرو کنم؟', a: 'AplusZ کمترین قیمت و بهترین تاریخ را نشان می‌دهد، سپس شما را به یک شریک رزرو معتبر برای تکمیل خرید هدایت می‌کند. AplusZ هرگز از شما هزینه‌ای نمی‌گیرد و چیزی به قیمت اضافه نمی‌کند.' },
    { q: 'چقدر زودتر رزرو کنم؟', a: 'برای بیشتر مسیرها کمترین قیمت‌ها ۴ تا ۱۰ هفته پیش از پرواز ظاهر می‌شوند. AplusZ ارزان‌ترین تاریخ‌های ۶ ماه آینده را نشان می‌دهد تا به‌جای حدس زدن، زمان مناسب را ببینید.' },
    { q: 'آیا AplusZ آفلاین کار می‌کند؟', a: 'بله. پس از بارگذاری، AplusZ برای مسیرهای ذخیره‌شده و یادآوری‌های شما آفلاین کار می‌کند، بنابراین می‌توانید در هر جایی، حتی بدون اتصال، آن‌ها را ببینید.' },
    { q: 'AplusZ از چه زبان‌هایی پشتیبانی می‌کند؟', a: 'AplusZ به ۲۰ زبان در دسترس است، با همان امکانات رایگان در هر زبان.' },
  ],
  aboutTitle: 'درباره AplusZ',
  aboutDesc: 'AplusZ کمک می‌کند ارزان‌تر پرواز کنید — رایگان و بدون ثبت‌نام. بررسی تا ۵۰٬۰۰۰ قیمت برای یافتن بهترین تاریخ در ۶ ماه.',
  aboutH1: 'درباره AplusZ',
  aboutBody: [
    'AplusZ تنها به یک دلیل وجود دارد: کمک به مردم برای ارزان‌تر پرواز کردن.',
    'پرواز نباید یک بازی حدس و گمان باشد. قیمت‌ها به‌شدت نوسان دارند و بیشتر مردم تنها به این دلیل بیش از حد می‌پردازند که نمی‌بینند چه زمانی یک مسیر ارزان‌تر است. AplusZ حدس را حذف می‌کند — تا ۵۰٬۰۰۰ قیمت را در ۲٬۰۰۰ فرودگاه بررسی می‌کند و بهترین تاریخ رزرو در ۶ ماه آینده را نشان می‌دهد.',
    'AplusZ رایگان است و هدف همین است. نه ثبت‌نام، نه دیوار پرداخت در جست‌وجو و نه هیچ ترفندی. هسته این پروژه قرار است پس از پوشش هزینه‌های جاری، برای همه رایگان بماند.',
    'وقتی رزرو را انتخاب می‌کنید، AplusZ ممکن است کارمزد کوچکی از یک شریک دریافت کند — بدون هزینه اضافی برای شما. قیمتی که می‌پردازید همیشه یکسان است. همین است که سرویس را پابرجا و جست‌وجو را رایگان نگه می‌دارد.',
    'هرچه افراد بیشتری از AplusZ استفاده کنند و آن را به اشتراک بگذارند، سریع‌تر به نقطه‌ای می‌رسد که خودکفا شود و برای همیشه رایگان بماند. تمام ایده همین است: ارزان‌تر پرواز کنید و به دیگران کمک کنید همین کار را بکنند.',
  ],
  fbTitle: 'بازخورد', fbDesc: 'یک اشکال را گزارش دهید یا قابلیتی برای AplusZ پیشنهاد دهید. در چند کلمه، بدون ثبت‌نام.',
  fbH1: 'ارسال بازخورد', fbIntro: 'اشکالی پیدا کردید یا ایده‌ای دارید؟ در چند کلمه به ما بگویید. نیازی به ثبت‌نام نیست.',
  fbBug: 'اشکال', fbIdea: 'ایده', fbPlaceholder: 'اشکال یا ایده خود را شرح دهید…',
  fbEmailLabel: 'ایمیل شما (اختیاری)', fbEmailPlaceholder: 'you@example.com',
  fbSend: 'ارسال', fbSending: 'در حال ارسال…', fbOk: 'سپاسگزاریم — بازخورد شما ارسال شد.',
  fbErr: 'ارسال نشد. لطفاً دوباره تلاش کنید.', fbEmpty: 'لطفاً ابتدا یک پیام کوتاه بنویسید.',
};

CONTENT.hi = {
  webIntro: '7 दिनों में बना और डिलीवर किया गया एक पेशेवर, कस्टम-डिज़ाइन किया वेबसाइट। मोबाइल-तैयार, SEO-अनुकूलित, होस्टिंग सेटअप सहित। 699€ से, अब 299€ — एकबार भुगतान, कोई सब्सक्रिप्शन नहीं।', webInclTitle: 'इसमें क्या शामिल है', webInclBody: 'आपके ब्रांड और दर्शकों के अनुसार कस्टम डिज़ाइन। मोबाइल-पहला, पूरी तरह रिस्पॉन्सिव। SEO आधार। संपर्क फ़ॉर्म। होस्टिंग सेटअप और डोमेन कनेक्शन। 1 महीने का सपोर्ट। पूर्ण हैंडओवर।', webHowTitle: 'यह कैसे काम करता है', webHowBody: 'Stripe पर एक बार भुगतान करें, यहां वापस आएं और जिस ईमेल से भुगतान किया उससे अपना ब्रीफ भरें। हम 24 घंटे में समीक्षा करते हैं और 7 दिनों में डिलीवर करते हैं।', webCta: 'अपना प्रोजेक्ट शुरू करें',
  webTitle: 'वेब डिज़ाइन - AplusZ.app', webDesc: '7 दिनों में पेशेवर वेबसाइट। कस्टम डिज़ाइन, मोबाइल-तैयार, SEO-अनुकूलित, होस्टिंग शामिल। 299€ एकबारगी।', webH1: 'वेब डिज़ाइन',
  faqTitle: 'अक्सर पूछे जाने वाले प्रश्न',
  faqDesc: 'AplusZ के बारे में उत्तर — यह सबसे कम किराया कैसे ढूँढता है, यह मुफ़्त क्यों है, बुकिंग कैसे होती है, भाषाएँ और ऑफ़लाइन उपयोग।',
  faq: [
    { q: 'AplusZ क्या है?', a: 'AplusZ किसी भी रूट के लिए सबसे कम हवाई किराया ढूँढता है और अगले 6 महीनों में बुकिंग के लिए सबसे अच्छी तारीख बताता है। यह 2,000 हवाई अड्डों पर 50,000 तक कीमतें स्कैन करता है, मुफ़्त और बिना साइनअप के।' },
    { q: 'क्या AplusZ सचमुच मुफ़्त है?', a: 'हाँ। कीमतें खोजना और रूट ट्रैक करना हमेशा के लिए मुफ़्त है, बिना साइनअप के। AplusZ केवल तभी कमाता है जब आप किसी पार्टनर के ज़रिए बुक करना चुनते हैं — आप जो कीमत चुकाते हैं वह बिलकुल वही रहती है।' },
    { q: 'प्लान कैसे काम करते हैं?', a: 'मुफ़्त प्लान में असीमित खोज, सटीक सबसे अच्छी तारीख और कीमत, एक सहेजा गया रूट, असीमित रिमाइंडर, कैलेंडर निर्यात और ऑफ़लाइन उपयोग शामिल हैं। Pro और Pro+ अधिक सहेजे गए रूट और रूट बदलाव जोड़ते हैं।' },
    { q: 'मैं फ़्लाइट कैसे बुक करूँ?', a: 'AplusZ आपको सबसे कम किराया और सबसे अच्छी तारीख दिखाता है, फिर खरीद पूरी करने के लिए आपको एक भरोसेमंद बुकिंग पार्टनर के पास भेजता है। AplusZ आपसे कभी शुल्क नहीं लेता और किराए में कुछ नहीं जोड़ता।' },
    { q: 'कितना पहले बुक करूँ?', a: 'ज़्यादातर रूट पर सबसे कम किराया प्रस्थान से 4 से 10 सप्ताह पहले दिखता है। AplusZ अगले 6 महीनों की सबसे सस्ती तारीखें दिखाता है, ताकि अनुमान लगाने के बजाय आप सही समय देख सकें।' },
    { q: 'क्या AplusZ ऑफ़लाइन काम करता है?', a: 'हाँ। एक बार लोड होने पर, AplusZ आपके सहेजे गए रूट और रिमाइंडर के लिए ऑफ़लाइन काम करता है, ताकि आप उन्हें कहीं भी, बिना कनेक्शन के भी देख सकें।' },
    { q: 'AplusZ कौन-सी भाषाएँ समर्थित करता है?', a: 'AplusZ 20 भाषाओं में उपलब्ध है, हर भाषा में वही मुफ़्त सुविधाओं के साथ।' },
  ],
  aboutTitle: 'AplusZ के बारे में',
  aboutDesc: 'AplusZ कम में उड़ान भरने में मदद करता है — मुफ़्त, बिना साइनअप। 6 महीनों में सबसे अच्छी तारीख के लिए 50,000 तक कीमतें।',
  aboutH1: 'AplusZ के बारे में',
  aboutBody: [
    'AplusZ एक ही कारण से मौजूद है: लोगों को कम में उड़ान भरने में मदद करना।',
    'उड़ान भरना अनुमान का खेल नहीं होना चाहिए। कीमतें बहुत बदलती हैं, और ज़्यादातर लोग केवल इसलिए अधिक चुकाते हैं क्योंकि वे नहीं देख पाते कि कोई रूट कब सबसे सस्ता है। AplusZ अनुमान को हटा देता है — यह 2,000 हवाई अड्डों पर 50,000 तक कीमतें स्कैन करता है और अगले 6 महीनों में बुकिंग के लिए सबसे अच्छी तारीख दिखाता है।',
    'AplusZ मुफ़्त है, और यही मुख्य बात है। कोई साइनअप नहीं, खोज पर कोई भुगतान दीवार नहीं, और कोई छल नहीं। परियोजना का मूल भाग सभी के लिए मुफ़्त रहने के लिए है, एक बार परिचालन लागत पूरी हो जाने पर।',
    'जब आप बुक करना चुनते हैं, तो AplusZ किसी पार्टनर से एक छोटा कमीशन कमा सकता है — आपके लिए बिना किसी अतिरिक्त लागत के। आप जो कीमत चुकाते हैं वह हमेशा वही रहती है। यही सेवा को चालू और खोज को मुफ़्त रखता है।',
    'जितने अधिक लोग AplusZ का उपयोग और साझा करेंगे, उतनी ही जल्दी यह उस बिंदु पर पहुँचेगा जहाँ यह खुद को चलाता है और हमेशा के लिए मुफ़्त रहता है। पूरा विचार यही है: कम में उड़ान भरें और दूसरों को भी ऐसा करने में मदद करें।',
  ],
  fbTitle: 'प्रतिक्रिया', fbDesc: 'AplusZ के लिए कोई बग बताएँ या सुविधा सुझाएँ। कुछ शब्दों में, बिना साइनअप।',
  fbH1: 'प्रतिक्रिया भेजें', fbIntro: 'कोई बग मिला या कोई विचार है? कुछ शब्दों में बताएँ। साइनअप की ज़रूरत नहीं।',
  fbBug: 'बग', fbIdea: 'विचार', fbPlaceholder: 'बग या अपना विचार बताएँ…',
  fbEmailLabel: 'आपका ईमेल (वैकल्पिक)', fbEmailPlaceholder: 'aap@udaharan.com',
  fbSend: 'भेजें', fbSending: 'भेजा जा रहा है…', fbOk: 'धन्यवाद — आपकी प्रतिक्रिया भेज दी गई।',
  fbErr: 'भेजा नहीं जा सका। कृपया फिर से प्रयास करें।', fbEmpty: 'कृपया पहले एक छोटा संदेश लिखें।',
};

CONTENT.bn = {
  webIntro: '7 দিনে তৈরি এবং ডেলিভার করা একটি পেশাদার, কাস্টম-ডিজাইন ওয়েবসাইট। মোবাইল-রেডি, SEO-অপ্টিমাইজড, হোস্টিং সেটআপসহ। 699€ থেকে, এখন 299€ — একবারের পেমেন্ট, কোনো সাবস্ক্রিপশন নেই।', webInclTitle: 'কী অন্তর্ভুক্ত', webInclBody: 'আপনার ব্র্যান্ড এবং দর্শকের জন্য কাস্টম ডিজাইন। মোবাইল-ফার্স্ট, সম্পূর্ণ রেসপন্সিভ। SEO ভিত্তি। যোগাযোগ ফরম। হোস্টিং সেটআপ এবং ডোমেইন সংযোগ। 1 মাসের সাপোর্ট। সম্পূর্ণ হ্যান্ডওভার।', webHowTitle: 'এটি কীভাবে কাজ করে', webHowBody: 'Stripe-এ একবার পেমেন্ট করুন, এখানে ফিরে আসুন এবং যে ইমেইল দিয়ে পেমেন্ট করেছেন তা দিয়ে আপনার ব্রিফ পূরণ করুন। আমরা 24 ঘণ্টার মধ্যে পর্যালোচনা করি এবং 7 দিনে ডেলিভার করি।', webCta: 'আপনার প্রজেক্ট শুরু করুন',
  webTitle: 'ওয়েব ডিজাইন - AplusZ.app', webDesc: '৭ দিনে পেশাদার ওয়েবসাইট। কাস্টম ডিজাইন, মোবাইল-রেডি, SEO-অপ্টিমাইজড, হোস্টিং অন্তর্ভুক্ত। 299€ একবার।', webH1: 'ওয়েব ডিজাইন',
  faqTitle: 'প্রায়শই জিজ্ঞাসিত প্রশ্ন',
  faqDesc: 'AplusZ সম্পর্কে উত্তর — এটি কীভাবে সর্বনিম্ন ভাড়া খুঁজে পায়, কেন এটি বিনামূল্যে, বুকিং কীভাবে হয়, ভাষা ও অফলাইন ব্যবহার।',
  faq: [
    { q: 'AplusZ কী?', a: 'AplusZ যেকোনো রুটের জন্য সর্বনিম্ন বিমান ভাড়া খুঁজে বের করে এবং আগামী ৬ মাসের মধ্যে বুকিংয়ের সেরা তারিখ জানায়। এটি ২,০০০ বিমানবন্দরে ৫০,০০০ পর্যন্ত দাম স্ক্যান করে, বিনামূল্যে এবং সাইনআপ ছাড়াই।' },
    { q: 'AplusZ কি সত্যিই বিনামূল্যে?', a: 'হ্যাঁ। দাম খোঁজা ও রুট ট্র্যাক করা চিরকাল বিনামূল্যে, সাইনআপ ছাড়াই। AplusZ কেবল তখনই আয় করে যখন আপনি কোনো পার্টনারের মাধ্যমে বুক করতে বেছে নেন — আপনি যে দাম দেন তা ঠিক একই থাকে।' },
    { q: 'প্ল্যানগুলো কীভাবে কাজ করে?', a: 'বিনামূল্যে প্ল্যানে রয়েছে সীমাহীন অনুসন্ধান, সঠিক সেরা তারিখ ও দাম, একটি সংরক্ষিত রুট, সীমাহীন রিমাইন্ডার, ক্যালেন্ডার রপ্তানি ও অফলাইন ব্যবহার। Pro ও Pro+ আরও সংরক্ষিত রুট এবং রুট পরিবর্তন যোগ করে।' },
    { q: 'আমি কীভাবে ফ্লাইট বুক করব?', a: 'AplusZ আপনাকে সর্বনিম্ন ভাড়া ও সেরা তারিখ দেখায়, তারপর কেনাকাটা সম্পূর্ণ করতে আপনাকে একটি বিশ্বস্ত বুকিং পার্টনারের কাছে পাঠায়। AplusZ কখনো আপনার কাছ থেকে চার্জ নেয় না এবং ভাড়ায় কিছু যোগ করে না।' },
    { q: 'কত আগে বুক করব?', a: 'বেশিরভাগ রুটে সর্বনিম্ন ভাড়া যাত্রার ৪ থেকে ১০ সপ্তাহ আগে দেখা যায়। AplusZ আগামী ৬ মাসের সবচেয়ে সস্তা তারিখগুলো দেখায়, যাতে অনুমান না করে আপনি সঠিক সময় দেখতে পারেন।' },
    { q: 'AplusZ কি অফলাইনে কাজ করে?', a: 'হ্যাঁ। একবার লোড হলে, AplusZ আপনার সংরক্ষিত রুট ও রিমাইন্ডারের জন্য অফলাইনে কাজ করে, তাই সংযোগ ছাড়াই যেকোনো জায়গায় সেগুলো দেখতে পারেন।' },
    { q: 'AplusZ কোন কোন ভাষা সমর্থন করে?', a: 'AplusZ ২০টি ভাষায় উপলব্ধ, প্রতিটি ভাষায় একই বিনামূল্যের সুবিধা সহ।' },
  ],
  aboutTitle: 'AplusZ সম্পর্কে',
  aboutDesc: 'AplusZ কম খরচে ওড়ায় সাহায্য করে — বিনামূল্যে, সাইনআপ ছাড়াই। ৬ মাসে সেরা তারিখ খুঁজতে ৫০,০০০ পর্যন্ত দাম।',
  aboutH1: 'AplusZ সম্পর্কে',
  aboutBody: [
    'AplusZ একটি কারণেই আছে: মানুষকে কম খরচে উড়তে সাহায্য করা।',
    'ওড়া অনুমানের খেলা হওয়া উচিত নয়। দাম খুব ওঠানামা করে, আর বেশিরভাগ মানুষ কেবল এই কারণে বেশি দেয় যে তারা দেখতে পায় না কখন একটি রুট সবচেয়ে সস্তা। AplusZ অনুমান দূর করে — এটি ২,০০০ বিমানবন্দরে ৫০,০০০ পর্যন্ত দাম স্ক্যান করে এবং আগামী ৬ মাসে বুকিংয়ের সেরা তারিখ দেখায়।',
    'AplusZ বিনামূল্যে, আর এটাই মূল কথা। কোনো সাইনআপ নেই, অনুসন্ধানে কোনো পেমেন্ট দেয়াল নেই, কোনো ফাঁদ নেই। প্রকল্পের মূল অংশটি পরিচালন খরচ মিটে গেলে সবার জন্য বিনামূল্যে থাকার জন্য তৈরি।',
    'আপনি যখন বুক করতে বেছে নেন, AplusZ কোনো পার্টনার থেকে একটি ছোট কমিশন পেতে পারে — আপনার জন্য কোনো বাড়তি খরচ ছাড়াই। আপনি যে দাম দেন তা সবসময় একই। এটিই পরিষেবা চালু এবং অনুসন্ধান বিনামূল্যে রাখে।',
    'যত বেশি মানুষ AplusZ ব্যবহার ও শেয়ার করবে, তত দ্রুত এটি এমন একটি অবস্থানে পৌঁছাবে যেখানে এটি নিজেই চলে এবং চিরকাল বিনামূল্যে থাকে। পুরো ধারণাটি এই: কম খরচে উড়ুন এবং অন্যদেরও তা করতে সাহায্য করুন।',
  ],
  fbTitle: 'মতামত', fbDesc: 'AplusZ-এর জন্য একটি বাগ জানান বা একটি ফিচার প্রস্তাব করুন। কয়েকটি শব্দে, সাইনআপ ছাড়াই।',
  fbH1: 'মতামত পাঠান', fbIntro: 'বাগ পেয়েছেন বা কোনো আইডিয়া আছে? কয়েকটি শব্দে জানান। সাইনআপের দরকার নেই।',
  fbBug: 'বাগ', fbIdea: 'আইডিয়া', fbPlaceholder: 'বাগ বা আপনার আইডিয়া বর্ণনা করুন…',
  fbEmailLabel: 'আপনার ইমেল (ঐচ্ছিক)', fbEmailPlaceholder: 'apni@udaharan.com',
  fbSend: 'পাঠান', fbSending: 'পাঠানো হচ্ছে…', fbOk: 'ধন্যবাদ — আপনার মতামত পাঠানো হয়েছে।',
  fbErr: 'পাঠানো যায়নি। আবার চেষ্টা করুন।', fbEmpty: 'প্রথমে একটি ছোট বার্তা লিখুন।',
};

CONTENT.th = {
  webIntro: 'เว็บไซต์มืออาชีพที่ออกแบบเฉพาะ สร้างและส่งมอบภายใน 7 วัน รองรับมือถือ ปรับแต่ง SEO รวมตั้งค่าโฮสติง จาก 699€ ตอนนี้ 299€ — จ่ายครั้งเดียว ไม่มีระบบสมาชิก', webInclTitle: 'สิ่งที่รวมอยู่', webInclBody: 'ออกแบบเฉพาะสำหรับแบรนด์และกลุ่มเป้าหมายของคุณ มือถือมาก่อน รองรับทุกหน้าจอ พื้นฐาน SEO แบบฟอร์มติดต่อ ตั้งค่าโฮสติงและเชื่อมต่อโดเมน สนับสนุน 1 เดือน ส่งมอบงานครบถ้วน', webHowTitle: 'วิธีการทำงาน', webHowBody: 'จ่ายครั้งเดียวผ่าน Stripe กลับมาที่นี่และกรอกบรีฟของคุณด้วยอีเมลที่ใช้จ่ายเงิน เราตรวจสอบภายใน 24 ชั่วโมงและส่งมอบภายใน 7 วัน', webCta: 'เริ่มโปรเจกต์ของคุณ',
  webTitle: 'ออกแบบเว็บ - AplusZ.app', webDesc: 'เว็บไซต์มืออาชีพใน 7 วัน ออกแบบเฉพาะ รองรับมือถือ ปรับแต่ง SEO รวมโฮสติง 299€ จ่ายครั้งเดียว', webH1: 'ออกแบบเว็บ',
  faqTitle: 'คำถามที่พบบ่อย',
  faqDesc: 'คำตอบเกี่ยวกับ AplusZ — วิธีหาตั๋วถูกที่สุด ทำไมจึงฟรี การจองทำงานอย่างไร ภาษา และการใช้งานออฟไลน์',
  faq: [
    { q: 'AplusZ คืออะไร?', a: 'AplusZ ค้นหาค่าตั๋วเครื่องบินที่ถูกที่สุดสำหรับทุกเส้นทาง และบอกวันที่ดีที่สุดในการจองภายใน 6 เดือนข้างหน้า โดยสแกนราคาสูงสุดถึง 50,000 รายการใน 2,000 สนามบิน ฟรี ไม่ต้องสมัคร' },
    { q: 'AplusZ ฟรีจริงไหม?', a: 'ใช่ การค้นหาราคาและติดตามเส้นทางฟรีตลอดไป ไม่ต้องสมัคร AplusZ จะได้รายได้ก็ต่อเมื่อคุณเลือกจองผ่านพาร์ทเนอร์ — ราคาที่คุณจ่ายยังคงเท่าเดิมทุกประการ' },
    { q: 'แผนต่าง ๆ ทำงานอย่างไร?', a: 'แผนฟรีครอบคลุมการค้นหาไม่จำกัด วันที่และราคาที่ดีที่สุดอย่างแม่นยำ เส้นทางที่บันทึกได้หนึ่งรายการ การแจ้งเตือนไม่จำกัด การส่งออกปฏิทิน และการใช้งานออฟไลน์ Pro และ Pro+ เพิ่มเส้นทางที่บันทึกได้มากขึ้นและการสลับเส้นทาง' },
    { q: 'จองเที่ยวบินอย่างไร?', a: 'AplusZ แสดงค่าตั๋วที่ถูกที่สุดและวันที่ดีที่สุด จากนั้นส่งคุณไปยังพาร์ทเนอร์การจองที่เชื่อถือได้เพื่อทำการซื้อให้เสร็จ AplusZ ไม่เคยเรียกเก็บเงินจากคุณและไม่เพิ่มอะไรลงในค่าตั๋ว' },
    { q: 'ควรจองล่วงหน้านานแค่ไหน?', a: 'สำหรับเส้นทางส่วนใหญ่ ราคาถูกที่สุดจะปรากฏ 4–10 สัปดาห์ก่อนออกเดินทาง AplusZ แสดงวันที่ถูกที่สุดในช่วง 6 เดือนข้างหน้า เพื่อให้คุณเห็นจังหวะที่เหมาะสมแทนการเดา' },
    { q: 'AplusZ ใช้งานออฟไลน์ได้ไหม?', a: 'ได้ เมื่อโหลดแล้ว AplusZ ทำงานออฟไลน์สำหรับเส้นทางที่บันทึกไว้และการแจ้งเตือนของคุณ คุณจึงตรวจสอบได้ทุกที่ แม้ไม่มีการเชื่อมต่อ' },
    { q: 'AplusZ รองรับภาษาใดบ้าง?', a: 'AplusZ มีให้บริการใน 20 ภาษา โดยมีฟีเจอร์ฟรีเหมือนกันในทุกภาษา' },
  ],
  aboutTitle: 'เกี่ยวกับ AplusZ',
  aboutDesc: 'AplusZ ช่วยให้บินถูกลง — ฟรี ไม่ต้องสมัคร สแกนราคาสูงสุด 50,000 รายการเพื่อหาวันที่ดีที่สุดใน 6 เดือน',
  aboutH1: 'เกี่ยวกับ AplusZ',
  aboutBody: [
    'AplusZ มีอยู่เพื่อเหตุผลเดียว: เพื่อช่วยให้ผู้คนบินได้ถูกลง',
    'การบินไม่ควรเป็นเกมเดา ราคาผันผวนอย่างมาก และคนส่วนใหญ่จ่ายแพงเกินไปเพียงเพราะมองไม่เห็นว่าเส้นทางถูกที่สุดเมื่อใด AplusZ ขจัดการคาดเดา — สแกนราคาสูงสุดถึง 50,000 รายการใน 2,000 สนามบิน และแสดงวันที่ดีที่สุดในการจองภายใน 6 เดือนข้างหน้า',
    'AplusZ ฟรี และนั่นคือหัวใจสำคัญ ไม่มีการสมัคร ไม่มีกำแพงเก็บเงินในการค้นหา และไม่มีกลลวง แกนหลักของโครงการตั้งใจให้ฟรีสำหรับทุกคน เมื่อครอบคลุมค่าใช้จ่ายในการดำเนินงานแล้ว',
    'เมื่อคุณเลือกจอง AplusZ อาจได้รับค่าคอมมิชชันเล็กน้อยจากพาร์ทเนอร์ — โดยไม่มีค่าใช้จ่ายเพิ่มสำหรับคุณ ราคาที่คุณจ่ายเท่าเดิมเสมอ นั่นคือสิ่งที่ทำให้บริการดำเนินต่อไปและการค้นหายังคงฟรี',
    'ยิ่งมีคนใช้และแชร์ AplusZ มากเท่าไร ก็ยิ่งไปถึงจุดที่เลี้ยงตัวเองได้และฟรีตลอดไปเร็วขึ้นเท่านั้น นี่คือแนวคิดทั้งหมด: บินให้ถูกลงและช่วยให้คนอื่นทำเช่นเดียวกัน',
  ],
  fbTitle: 'ความคิดเห็น', fbDesc: 'รายงานข้อบกพร่องหรือเสนอฟีเจอร์สำหรับ AplusZ ในไม่กี่คำ ไม่ต้องสมัคร',
  fbH1: 'ส่งความคิดเห็น', fbIntro: 'พบข้อบกพร่องหรือมีไอเดีย? บอกเราในไม่กี่คำ ไม่ต้องสมัคร',
  fbBug: 'ข้อบกพร่อง', fbIdea: 'ไอเดีย', fbPlaceholder: 'อธิบายข้อบกพร่องหรือไอเดียของคุณ…',
  fbEmailLabel: 'อีเมลของคุณ (ไม่บังคับ)', fbEmailPlaceholder: 'you@example.com',
  fbSend: 'ส่ง', fbSending: 'กำลังส่ง…', fbOk: 'ขอบคุณ — ส่งความคิดเห็นของคุณแล้ว',
  fbErr: 'ส่งไม่สำเร็จ โปรดลองอีกครั้ง', fbEmpty: 'โปรดเขียนข้อความสั้น ๆ ก่อน',
};

CONTENT.vi = {
  webIntro: 'Một trang web chuyên nghiệp, thiết kế riêng, xây dựng và bàn giao trong 7 ngày. Tương thích di động, tối ưu SEO, kèm cài đặt hosting. Từ 699€, nay 299€ — thanh toán một lần, không đăng ký thuê bao.', webInclTitle: 'Bao gồm những gì', webInclBody: 'Thiết kế riêng phù hợp với thương hiệu và khán giả của bạn. Ưu tiên di động, hoàn toàn responsive. Nền tảng SEO. Biểu mẫu liên hệ. Cài đặt hosting và kết nối tên miền. 1 tháng hỗ trợ. Bàn giao đầy đủ.', webHowTitle: 'Cách hoạt động', webHowBody: 'Thanh toán một lần trên Stripe, quay lại đây và điền thông tin dự án bằng email bạn đã thanh toán. Chúng tôi xem xét trong 24 giờ và bàn giao trong 7 ngày.', webCta: 'Bắt đầu dự án của bạn',
  webTitle: 'Thiết kế web - AplusZ.app', webDesc: 'Trang web chuyên nghiệp trong 7 ngày. Thiết kế riêng, tương thích di động, tối ưu SEO, kèm hosting. 299€ thanh toán một lần.', webH1: 'Thiết kế web',
  faqTitle: 'Câu hỏi thường gặp',
  faqDesc: 'Giải đáp về AplusZ — cách tìm vé rẻ nhất, vì sao miễn phí, cách đặt vé, ngôn ngữ và dùng ngoại tuyến.',
  faq: [
    { q: 'AplusZ là gì?', a: 'AplusZ tìm giá vé máy bay thấp nhất cho mọi tuyến và cho bạn biết ngày đặt tốt nhất trong 6 tháng tới. Nó quét tới 50.000 mức giá trên 2.000 sân bay, miễn phí và không cần đăng ký.' },
    { q: 'AplusZ có thực sự miễn phí không?', a: 'Có. Tìm giá và theo dõi tuyến bay miễn phí mãi mãi, không cần đăng ký. AplusZ chỉ có thu nhập nếu bạn chọn đặt vé qua đối tác — giá bạn trả vẫn giữ nguyên hoàn toàn.' },
    { q: 'Các gói hoạt động thế nào?', a: 'Gói miễn phí bao gồm tìm kiếm không giới hạn, ngày và giá tốt nhất chính xác, một tuyến đã lưu, nhắc nhở không giới hạn, xuất lịch và dùng ngoại tuyến. Pro và Pro+ thêm nhiều tuyến đã lưu và đổi tuyến.' },
    { q: 'Tôi đặt vé như thế nào?', a: 'AplusZ hiển thị giá thấp nhất và ngày tốt nhất, rồi chuyển bạn đến một đối tác đặt vé đáng tin cậy để hoàn tất mua hàng. AplusZ không bao giờ thu phí bạn và không cộng thêm gì vào giá vé.' },
    { q: 'Nên đặt trước bao lâu?', a: 'Với hầu hết tuyến, giá thấp nhất xuất hiện 4–10 tuần trước khi khởi hành. AplusZ hiển thị những ngày rẻ nhất trong 6 tháng tới, để bạn thấy thời điểm hợp lý thay vì phải đoán.' },
    { q: 'AplusZ có hoạt động ngoại tuyến không?', a: 'Có. Sau khi tải, AplusZ hoạt động ngoại tuyến cho các tuyến đã lưu và lời nhắc của bạn, nên bạn có thể kiểm tra ở bất cứ đâu, kể cả khi không có kết nối.' },
    { q: 'AplusZ hỗ trợ những ngôn ngữ nào?', a: 'AplusZ có sẵn bằng 20 ngôn ngữ, với cùng các tính năng miễn phí ở mọi ngôn ngữ.' },
  ],
  aboutTitle: 'Giới thiệu AplusZ',
  aboutDesc: 'AplusZ giúp bay với chi phí thấp hơn — miễn phí, không đăng ký. Quét tới 50.000 mức giá để tìm ngày tốt nhất trong 6 tháng.',
  aboutH1: 'Giới thiệu AplusZ',
  aboutBody: [
    'AplusZ tồn tại vì một lý do duy nhất: giúp mọi người bay với chi phí thấp hơn.',
    'Bay không nên là trò đoán mò. Giá dao động rất lớn, và phần lớn mọi người trả quá cao chỉ vì không thấy được khi nào một tuyến rẻ nhất. AplusZ loại bỏ việc phỏng đoán — nó quét tới 50.000 mức giá trên 2.000 sân bay và cho bạn ngày đặt tốt nhất trong 6 tháng tới.',
    'AplusZ miễn phí, và đó chính là điều cốt lõi. Không đăng ký, không tường phí khi tìm kiếm, và không có mánh khóe. Phần lõi của dự án được thiết kế để luôn miễn phí cho mọi người, một khi chi phí vận hành được trang trải.',
    'Khi bạn chọn đặt vé, AplusZ có thể nhận một khoản hoa hồng nhỏ từ đối tác — không tốn thêm chi phí cho bạn. Giá bạn trả luôn như nhau. Đó là điều duy trì dịch vụ và giữ cho việc tìm kiếm miễn phí.',
    'Càng nhiều người dùng và chia sẻ AplusZ, nó càng nhanh đạt đến điểm tự duy trì và miễn phí mãi mãi. Toàn bộ ý tưởng là vậy: bay rẻ hơn và giúp người khác làm điều tương tự.',
  ],
  fbTitle: 'Phản hồi', fbDesc: 'Báo lỗi hoặc đề xuất tính năng cho AplusZ. Vài từ thôi, không cần đăng ký.',
  fbH1: 'Gửi phản hồi', fbIntro: 'Phát hiện lỗi hoặc có ý tưởng? Hãy cho chúng tôi biết trong vài từ. Không cần đăng ký.',
  fbBug: 'Lỗi', fbIdea: 'Ý tưởng', fbPlaceholder: 'Mô tả lỗi hoặc ý tưởng của bạn…',
  fbEmailLabel: 'Email của bạn (không bắt buộc)', fbEmailPlaceholder: 'ban@vidu.com',
  fbSend: 'Gửi', fbSending: 'Đang gửi…', fbOk: 'Cảm ơn — phản hồi của bạn đã được gửi.',
  fbErr: 'Không gửi được. Vui lòng thử lại.', fbEmpty: 'Vui lòng viết một tin nhắn ngắn trước.',
};

CONTENT.id = {
  webIntro: 'Situs web profesional dengan desain khusus, dibangun dan dikirim dalam 7 hari. Siap seluler, dioptimalkan SEO, dengan penyiapan hosting. Dari 699€, sekarang 299€ — pembayaran sekali, tanpa langganan.', webInclTitle: 'Yang termasuk', webInclBody: 'Desain khusus sesuai merek dan audiens Anda. Mobile-first, sepenuhnya responsif. Fondasi SEO. Formulir kontak. Penyiapan hosting dan koneksi domain. Dukungan 1 bulan. Serah terima penuh.', webHowTitle: 'Cara kerjanya', webHowBody: 'Bayar sekali di Stripe, kembali ke sini dan isi brief Anda dengan email yang Anda gunakan untuk membayar. Kami meninjau dalam 24 jam dan mengirim dalam 7 hari.', webCta: 'Mulai proyek Anda',
  webTitle: 'Desain web - AplusZ.app', webDesc: 'Situs web profesional dalam 7 hari. Desain khusus, siap seluler, dioptimalkan SEO, hosting termasuk. 299€ sekali bayar.', webH1: 'Desain web',
  faqTitle: 'Pertanyaan Umum',
  faqDesc: 'Jawaban tentang AplusZ — cara menemukan tarif termurah, mengapa gratis, cara memesan, bahasa, dan penggunaan offline.',
  faq: [
    { q: 'Apa itu AplusZ?', a: 'AplusZ menemukan tarif penerbangan termurah untuk rute mana pun dan memberi tahu tanggal terbaik untuk memesan dalam 6 bulan ke depan. Ia memindai hingga 50.000 harga di 2.000 bandara, gratis dan tanpa pendaftaran.' },
    { q: 'Apakah AplusZ benar-benar gratis?', a: 'Ya. Mencari harga dan memantau rute gratis selamanya, tanpa pendaftaran. AplusZ hanya memperoleh penghasilan jika Anda memilih memesan melalui mitra — harga yang Anda bayar tetap persis sama.' },
    { q: 'Bagaimana paketnya bekerja?', a: 'Paket gratis mencakup pencarian tanpa batas, tanggal dan harga terbaik yang akurat, satu rute tersimpan, pengingat tanpa batas, ekspor kalender, dan penggunaan offline. Pro dan Pro+ menambah rute tersimpan dan pergantian rute.' },
    { q: 'Bagaimana cara memesan penerbangan?', a: 'AplusZ menampilkan tarif termurah dan tanggal terbaik, lalu mengarahkan Anda ke mitra pemesanan tepercaya untuk menyelesaikan pembelian. AplusZ tidak pernah menagih Anda dan tidak menambah apa pun pada tarif.' },
    { q: 'Berapa jauh hari sebelumnya harus memesan?', a: 'Untuk sebagian besar rute, tarif termurah muncul 4–10 minggu sebelum keberangkatan. AplusZ menampilkan tanggal termurah dalam 6 bulan ke depan, agar Anda melihat saat yang tepat alih-alih menebak.' },
    { q: 'Apakah AplusZ bekerja offline?', a: 'Ya. Setelah dimuat, AplusZ bekerja offline untuk rute tersimpan dan pengingat Anda, sehingga dapat diperiksa di mana saja, bahkan tanpa koneksi.' },
    { q: 'Bahasa apa saja yang didukung AplusZ?', a: 'AplusZ tersedia dalam 20 bahasa, dengan fitur gratis yang sama di setiap bahasa.' },
  ],
  aboutTitle: 'Tentang AplusZ',
  aboutDesc: 'AplusZ membantu terbang lebih murah — gratis, tanpa pendaftaran. Memindai hingga 50.000 harga untuk tanggal terbaik dalam 6 bulan.',
  aboutH1: 'Tentang AplusZ',
  aboutBody: [
    'AplusZ ada untuk satu alasan: membantu orang terbang lebih murah.',
    'Terbang seharusnya bukan permainan tebak-tebakan. Harga sangat berfluktuasi, dan kebanyakan orang membayar terlalu mahal hanya karena tidak melihat kapan sebuah rute paling murah. AplusZ menghilangkan tebakan — ia memindai hingga 50.000 harga di 2.000 bandara dan menampilkan tanggal terbaik untuk memesan dalam 6 bulan ke depan.',
    'AplusZ gratis, dan itulah intinya. Tanpa pendaftaran, tanpa dinding bayar pada pencarian, dan tanpa jebakan. Inti proyek ini dimaksudkan tetap gratis untuk semua orang, setelah biaya operasional tertutupi.',
    'Saat Anda memilih memesan, AplusZ mungkin memperoleh komisi kecil dari mitra — tanpa biaya tambahan bagi Anda. Harga yang Anda bayar selalu sama. Itulah yang menjaga layanan tetap berjalan dan pencarian tetap gratis.',
    'Semakin banyak orang menggunakan dan membagikan AplusZ, semakin cepat ia mencapai titik di mana ia menghidupi dirinya sendiri dan tetap gratis selamanya. Itulah keseluruhan idenya: terbang lebih murah dan membantu orang lain melakukan hal yang sama.',
  ],
  fbTitle: 'Masukan', fbDesc: 'Laporkan bug atau usulkan fitur untuk AplusZ. Dalam beberapa kata, tanpa pendaftaran.',
  fbH1: 'Kirim masukan', fbIntro: 'Menemukan bug atau punya ide? Beri tahu kami dalam beberapa kata. Tanpa pendaftaran.',
  fbBug: 'Bug', fbIdea: 'Ide', fbPlaceholder: 'Jelaskan bug atau ide Anda…',
  fbEmailLabel: 'Email Anda (opsional)', fbEmailPlaceholder: 'anda@contoh.com',
  fbSend: 'Kirim', fbSending: 'Mengirim…', fbOk: 'Terima kasih — masukan Anda telah dikirim.',
  fbErr: 'Gagal mengirim. Silakan coba lagi.', fbEmpty: 'Tulis pesan singkat terlebih dahulu.',
};

CONTENT.ja = {
  webIntro: '7日で制作・納品するプロ仕様のカスタムデザインウェブサイト。モバイル対応、SEO最適化、ホスティング設定込み。699€から、今なら299€ — 一回払い、サブスクなし。', webInclTitle: '含まれるもの', webInclBody: 'ブランドと読者に合わせたカスタムデザイン。モバイルファースト、完全レスポンシブ。SEO基盤。お問い合わせフォーム。ホスティング設定とドメイン接続。1ヶ月のサポート。完全な引き渡し。', webHowTitle: '仕組み', webHowBody: 'Stripeで一度お支払いいただき、こちらに戻ってお支払いに使ったメールでブリーフを記入してください。24時間以内に確認し7日で納品します。', webCta: 'プロジェクトを始める',
  webTitle: 'ウェブデザイン - AplusZ.app', webDesc: '7日でプロのウェブサイトを制作。カスタムデザイン、モバイル対応、SEO最適化、ホスティング設定込み。299€一回限り。', webH1: 'ウェブデザイン',
  faqTitle: 'よくある質問',
  faqDesc: 'AplusZ について — 最安値の見つけ方、無料の理由、予約の仕組み、対応言語、オフライン利用の回答。',
  faq: [
    { q: 'AplusZ とは何ですか？', a: 'AplusZ はあらゆる路線の最安航空券を見つけ、今後6か月以内で最適な予約日をお知らせします。2,000の空港で最大50,000件の価格をスキャンし、無料・登録不要です。' },
    { q: 'AplusZ は本当に無料ですか？', a: 'はい。価格検索と路線の追跡は永久に無料で、登録は不要です。AplusZ はパートナー経由で予約した場合にのみ収益を得ます。お支払い価格はまったく変わりません。' },
    { q: 'プランはどのように機能しますか？', a: '無料プランには無制限の検索、正確な最適日と価格、保存路線1件、無制限のリマインダー、カレンダー書き出し、オフライン利用が含まれます。Pro と Pro+ では保存路線の追加と路線の入れ替えができます。' },
    { q: '航空券はどう予約しますか？', a: 'AplusZ が最安値と最適な日付を表示し、購入を完了するために信頼できる予約パートナーへご案内します。AplusZ が料金を請求したり、運賃に上乗せしたりすることは一切ありません。' },
    { q: 'どのくらい前に予約すべきですか？', a: 'ほとんどの路線では、最安値は出発の4〜10週間前に現れます。AplusZ は今後6か月で最も安い日付を表示するので、推測せずに最適なタイミングが分かります。' },
    { q: 'AplusZ はオフラインで動作しますか？', a: 'はい。一度読み込めば、保存した路線とリマインダーについて AplusZ はオフラインで動作するため、接続がなくてもどこでも確認できます。' },
    { q: 'AplusZ は何語に対応していますか？', a: 'AplusZ は20言語で利用でき、どの言語でも同じ無料機能を提供します。' },
  ],
  aboutTitle: 'AplusZ について',
  aboutDesc: 'AplusZ はより安く飛ぶための支援をします — 無料・登録不要。最大50,000件の価格をスキャンし6か月で最適な日付を見つけます。',
  aboutH1: 'AplusZ について',
  aboutBody: [
    'AplusZ はただ一つの理由のために存在します。人々がより安く飛べるよう手助けすることです。',
    '空の旅は当てずっぽうであってはなりません。価格は大きく変動し、多くの人は路線がいつ最も安いのかが見えないために払いすぎています。AplusZ は推測を取り除きます。2,000の空港で最大50,000件の価格をスキャンし、今後6か月で最適な予約日を表示します。',
    'AplusZ は無料であり、それこそが要点です。登録もなく、検索に課金の壁もなく、裏もありません。運営費がまかなえれば、プロジェクトの中核は誰にとっても無料であり続けることを目指しています。',
    '予約を選ぶと、AplusZ はパートナーからわずかな手数料を得ることがあります。あなたに追加費用はかかりません。お支払い価格は常に同じです。それがサービスを支え、検索を無料に保ちます。',
    'AplusZ を使い、共有する人が増えるほど、自立して永久に無料であり続ける地点へと早く到達します。それがすべての考えです。より安く飛び、他の人も同じようにできるよう手助けすること。',
  ],
  fbTitle: 'フィードバック', fbDesc: 'AplusZ の不具合を報告したり機能を提案したりできます。短い言葉で、登録不要。',
  fbH1: 'フィードバックを送信', fbIntro: '不具合を見つけた、またはアイデアがありますか？短い言葉でお知らせください。登録は不要です。',
  fbBug: '不具合', fbIdea: 'アイデア', fbPlaceholder: '不具合またはアイデアをご記入ください…',
  fbEmailLabel: 'メールアドレス（任意）', fbEmailPlaceholder: 'you@example.com',
  fbSend: '送信', fbSending: '送信中…', fbOk: 'ありがとうございます。フィードバックを送信しました。',
  fbErr: '送信できませんでした。もう一度お試しください。', fbEmpty: 'まず短いメッセージをご記入ください。',
};

CONTENT.ko = {
  webIntro: '7일 만에 제작·납품하는 전문 맞춤 디자인 웹사이트. 모바일 대응, SEO 최적화, 호스팅 설정 포함. 699€에서 지금 299€ — 일회성 결제, 구독 없음.', webInclTitle: '포함 사항', webInclBody: '브랜드와 관객에 맞춘 맞춤 디자인. 모바일 우선, 완전 반응형. SEO 기반. 문의 양식. 호스팅 설정 및 도메인 연결. 1개월 지원. 완전 인계.', webHowTitle: '진행 방식', webHowBody: 'Stripe에서 한 번 결제하고 여기로 돌아와 결제한 이메일로 브리프를 작성하세요. 24시간 이내 검토하고 7일 만에 납품합니다.', webCta: '프로젝트 시작하기',
  webTitle: '웹 디자인 - AplusZ.app', webDesc: '7일 만에 전문 웹사이트 제작. 맞춤 디자인, 모바일 대응, SEO 최적화, 호스팅 포함. 299€ 일회성.', webH1: '웹 디자인',
  faqTitle: '자주 묻는 질문',
  faqDesc: 'AplusZ에 대한 답변 — 최저 항공권을 찾는 방법, 무료인 이유, 예약 방식, 지원 언어, 오프라인 사용.',
  faq: [
    { q: 'AplusZ란 무엇인가요?', a: 'AplusZ는 모든 노선의 최저 항공 요금을 찾아 앞으로 6개월 이내 예약하기 가장 좋은 날짜를 알려줍니다. 2,000개 공항에서 최대 50,000개의 가격을 검색하며, 무료이고 가입이 필요 없습니다.' },
    { q: 'AplusZ는 정말 무료인가요?', a: '네. 가격 검색과 노선 추적은 가입 없이 영원히 무료입니다. AplusZ는 파트너를 통해 예약하기로 선택하실 때만 수익을 얻으며, 지불하시는 가격은 완전히 동일하게 유지됩니다.' },
    { q: '요금제는 어떻게 작동하나요?', a: '무료 요금제는 무제한 검색, 정확한 최적 날짜와 가격, 저장 노선 1개, 무제한 알림, 캘린더 내보내기, 오프라인 사용을 포함합니다. Pro와 Pro+는 더 많은 저장 노선과 노선 교체를 추가합니다.' },
    { q: '항공편은 어떻게 예약하나요?', a: 'AplusZ가 최저 요금과 최적 날짜를 보여준 뒤, 구매를 완료하도록 신뢰할 수 있는 예약 파트너로 안내합니다. AplusZ는 절대 요금을 청구하지 않으며 운임에 아무것도 추가하지 않습니다.' },
    { q: '얼마나 미리 예약해야 하나요?', a: '대부분의 노선에서 최저 요금은 출발 4~10주 전에 나타납니다. AplusZ는 앞으로 6개월 중 가장 저렴한 날짜를 보여주므로, 추측 대신 적절한 시점을 확인할 수 있습니다.' },
    { q: 'AplusZ는 오프라인에서 작동하나요?', a: '네. 한 번 불러오면 AplusZ는 저장한 노선과 알림에 대해 오프라인으로 작동하므로, 연결이 없어도 어디서나 확인할 수 있습니다.' },
    { q: 'AplusZ는 어떤 언어를 지원하나요?', a: 'AplusZ는 20개 언어로 제공되며, 모든 언어에서 동일한 무료 기능을 제공합니다.' },
  ],
  aboutTitle: 'AplusZ 소개',
  aboutDesc: 'AplusZ는 더 저렴하게 비행하도록 돕습니다 — 무료, 가입 불필요. 최대 50,000개 가격을 검색해 6개월 내 최적 날짜를 찾습니다.',
  aboutH1: 'AplusZ 소개',
  aboutBody: [
    'AplusZ는 단 하나의 이유로 존재합니다. 사람들이 더 저렴하게 비행하도록 돕는 것입니다.',
    '비행이 추측 게임이어서는 안 됩니다. 가격은 크게 요동치고, 대부분의 사람들은 노선이 언제 가장 저렴한지 볼 수 없어서 너무 많이 지불합니다. AplusZ는 추측을 없앱니다 — 2,000개 공항에서 최대 50,000개의 가격을 검색해 앞으로 6개월 중 최적의 예약 날짜를 보여줍니다.',
    'AplusZ는 무료이며, 그것이 핵심입니다. 가입도, 검색에 대한 결제 장벽도, 함정도 없습니다. 운영 비용이 충당되면 프로젝트의 핵심은 모두에게 계속 무료로 유지되도록 설계되었습니다.',
    '예약을 선택하시면 AplusZ는 파트너로부터 소액의 수수료를 받을 수 있습니다 — 추가 비용은 없습니다. 지불하시는 가격은 항상 동일합니다. 그것이 서비스를 유지하고 검색을 무료로 지켜줍니다.',
    'AplusZ를 사용하고 공유하는 사람이 많아질수록, 스스로 유지되며 영원히 무료로 남는 지점에 더 빨리 도달합니다. 이것이 전체 아이디어입니다. 더 저렴하게 비행하고, 다른 사람도 그렇게 하도록 돕는 것.',
  ],
  fbTitle: '피드백', fbDesc: 'AplusZ의 버그를 신고하거나 기능을 제안하세요. 몇 마디로, 가입 없이.',
  fbH1: '피드백 보내기', fbIntro: '버그를 발견했거나 아이디어가 있으신가요? 몇 마디로 알려주세요. 가입이 필요 없습니다.',
  fbBug: '버그', fbIdea: '아이디어', fbPlaceholder: '버그나 아이디어를 설명해 주세요…',
  fbEmailLabel: '이메일 (선택)', fbEmailPlaceholder: 'you@example.com',
  fbSend: '보내기', fbSending: '보내는 중…', fbOk: '감사합니다 — 피드백이 전송되었습니다.',
  fbErr: '보낼 수 없습니다. 다시 시도해 주세요.', fbEmpty: '먼저 짧은 메시지를 작성해 주세요.',
};

CONTENT.zh = {
  webIntro: '7天内打造并交付的专业定制设计网站。适配移动端、SEO优化、含主机设置。原价699€，现价299€ — 一次性付款，无需订阅。', webInclTitle: '包含内容', webInclBody: '量身定制的设计，贴合您的品牌与受众。移动优先，完全响应式。SEO基础。联系表单。主机设置与域名连接。1个月支持。完整交接。', webHowTitle: '运作方式', webHowBody: '在Stripe上一次性付款，返回此处并用付款邮箱填写您的需求。我们在24小时内审核并在7天内交付。', webCta: '开始您的项目',
  webTitle: '网页设计 - AplusZ.app', webDesc: '7天打造专业网站。定制设计、适配移动端、SEO优化、含主机设置。299€一次性。', webH1: '网页设计',
  faqTitle: '常见问题',
  faqDesc: '关于 AplusZ 的解答——如何找到最低票价、为何免费、如何预订、支持语言以及离线使用。',
  faq: [
    { q: 'AplusZ 是什么？', a: 'AplusZ 为任意航线找出最低机票价格，并告诉你未来6个月内最佳的预订日期。它在2,000个机场扫描多达50,000个价格，免费且无需注册。' },
    { q: 'AplusZ 真的免费吗？', a: '是的。搜索价格和跟踪航线永久免费，无需注册。只有当你选择通过合作伙伴预订时，AplusZ 才会有收入——你支付的价格完全不变。' },
    { q: '套餐如何运作？', a: '免费套餐包含无限次搜索、精确的最佳日期与价格、一个已保存航线、无限提醒、日历导出和离线使用。Pro 和 Pro+ 增加更多已保存航线和航线更换。' },
    { q: '我如何预订航班？', a: 'AplusZ 向你展示最低票价和最佳日期，然后引导你前往可信赖的预订合作伙伴完成购买。AplusZ 从不向你收费，也绝不在票价上加价。' },
    { q: '应提前多久预订？', a: '对大多数航线而言，最低票价出现在出发前4到10周。AplusZ 显示未来6个月内最便宜的日期，让你看到合适时机，而不必猜测。' },
    { q: 'AplusZ 能离线使用吗？', a: '可以。加载后，AplusZ 可对你已保存的航线和提醒离线工作，因此你随时随地都能查看，即使没有网络连接。' },
    { q: 'AplusZ 支持哪些语言？', a: 'AplusZ 提供20种语言，每种语言都具备相同的免费功能。' },
  ],
  aboutTitle: '关于 AplusZ',
  aboutDesc: 'AplusZ 帮助你以更低价格飞行——免费、无需注册。扫描多达50,000个价格，找出6个月内的最佳日期。',
  aboutH1: '关于 AplusZ',
  aboutBody: [
    'AplusZ 的存在只有一个原因：帮助人们以更低的价格飞行。',
    '飞行不应是一场猜谜游戏。价格大幅波动，大多数人只是因为看不到航线何时最便宜而多花了钱。AplusZ 消除了猜测——它在2,000个机场扫描多达50,000个价格，并向你展示未来6个月内最佳的预订日期。',
    'AplusZ 是免费的，而这正是关键所在。没有注册，搜索没有付费墙，也没有套路。一旦运营成本得到覆盖，项目的核心将始终对所有人免费。',
    '当你选择预订时，AplusZ 可能从合作伙伴处获得少量佣金——不会让你额外付费。你支付的价格始终相同。正是这一点维持着服务运转并让搜索保持免费。',
    '使用和分享 AplusZ 的人越多，它就越快达到自给自足、永久免费的那一刻。这就是全部理念：以更低价格飞行，并帮助他人也能如此。',
  ],
  fbTitle: '反馈', fbDesc: '为 AplusZ 报告问题或建议功能。三言两语，无需注册。',
  fbH1: '发送反馈', fbIntro: '发现问题或有想法？用几句话告诉我们。无需注册。',
  fbBug: '问题', fbIdea: '想法', fbPlaceholder: '描述问题或你的想法…',
  fbEmailLabel: '你的邮箱（可选）', fbEmailPlaceholder: 'you@example.com',
  fbSend: '发送', fbSending: '发送中…', fbOk: '谢谢——你的反馈已发送。',
  fbErr: '发送失败，请重试。', fbEmpty: '请先写一条简短的信息。',
};

// pick localized content, fall back to English per-field
const C = lang => {
  const en = CONTENT.en, l = CONTENT[lang] || {};
  return new Proxy({}, { get: (_, k) => (l[k] !== undefined ? l[k] : en[k]) });
};

function shell({ lang, page, title, desc, inner }) {
  const dir = CONFIG.RTL.includes(lang) ? 'rtl' : 'ltr';
  const canonical = url(lang, page);
  const alts = CONFIG.LANGS.map(l =>
    `<link rel="alternate" hreflang="${l}" href="${url(l, page)}">`).join('') +
    `<link rel="alternate" hreflang="x-default" href="${url('en', page)}">`;
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | ${esc(CONFIG.BRAND)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">${alts}
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)} | ${esc(CONFIG.BRAND)}">
<meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${canonical}">
<link rel="stylesheet" href="/assets/bundle.css">
<style>.rg{max-width:760px;margin:0 auto;padding:28px 18px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#0f172a}.rg h1{font-size:1.7rem;margin:.2em 0 .6em}.rg h2,.rg h3{font-size:1.08rem;margin:1.2em 0 .25em}.rg p{margin:.5em 0}.rg-foot{max-width:760px;margin:36px auto 24px;padding:18px;border-top:1px solid #e5e7eb;font-size:.85rem;color:#555;text-align:center}.rg-foot a{color:#1558d6;text-decoration:none}.rg-foot-c{margin-top:8px;color:#777}.fb-toggle{display:inline-flex;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;margin:.4em 0}.fb-toggle button{border:0;background:#fff;padding:10px 20px;font-size:.95rem;cursor:pointer;color:#334155}.fb-toggle button.on{background:#1558d6;color:#fff}.fb-field{margin:.7em 0}.fb-field label{display:block;font-size:.85rem;color:#475569;margin-bottom:5px}.fb-field textarea,.fb-field input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:12px 14px;font-size:1rem;font-family:inherit}.fb-field textarea{min-height:120px;resize:vertical}.fb-send{background:#1558d6;color:#fff;border:0;border-radius:10px;padding:13px 26px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:6px}.fb-msg{margin-top:12px;font-size:.9rem;min-height:18px}.fb-msg.ok{color:#0a7d33}.fb-msg.err{color:#c0341d}</style>
<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=AW-995108846"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-995108846');</script></head><body><header class="topbar"><a class="brand" id="brand-home" href="/" aria-label="AplusZ home"><span class="brand-mark">A+Z</span><span class="brand-name"><span class="bn-az">A</span><span class="bn-plus">plus</span><span class="bn-az">Z</span><span class="bn-app">.app</span></span></a><nav class="topnav"><button class="icon-btn tier-badge" id="tier-badge" type="button" aria-label="Free"><span class="tb-ic">&#x1F193;</span><span class="tb-nm">Free</span></button><button class="icon-btn" id="theme-toggle" aria-label="Theme">&#9728;</button><button class="icon-btn" id="lang-btn" aria-label="Language">&#127760;</button><button class="icon-btn" id="menu-btn" aria-label="Profile">&#9776;</button></nav></header><main class="rg">
${inner}
</main>
${footer(lang)}
<script defer src="/assets/detect.js"></script><script defer src="/assets/config.js"></script><script defer src="/assets/i18n.js"></script><script defer src="/assets/billing.js"></script><script defer src="/assets/alerts.js"></script><script defer src="/assets/profile.js"></script><script defer src="/assets/app.js"></script></body></html>`;
}

export function buildFaqPage(lang) {
  const c = C(lang);
  const items = c.faq;
  const ld = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: items.map(f => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const inner = `<h1>${esc(c.faqTitle)}</h1>` +
    items.map(f => `<h2>${esc(f.q)}</h2><p>${esc(f.a)}</p>`).join('') +
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
  return shell({ lang, page: 'faq', title: c.faqTitle, desc: c.faqDesc, inner });
}

export function buildAboutPage(lang) {
  const c = C(lang);
  const inner = `<h1>${esc(c.aboutH1)}</h1>` + c.aboutBody.map(p => `<p>${esc(p)}</p>`).join('');
  return shell({ lang, page: 'about', title: c.aboutTitle, desc: c.aboutDesc, inner });
}

export function buildFeedbackPage(lang) {
  const c = C(lang);
  const api = CONFIG.API || 'https://api.aplusz.app';
  const inner = `<h1>${esc(c.fbH1)}</h1><p>${esc(c.fbIntro)}</p>
<div class="fb-toggle" role="group">
  <button type="button" id="fbBug" class="on" data-type="bug">${esc(c.fbBug)}</button>
  <button type="button" id="fbIdea" data-type="idea">${esc(c.fbIdea)}</button>
</div>
<div class="fb-field"><label for="fbMsg">${esc(c.fbPlaceholder)}</label>
  <textarea id="fbMsg" placeholder="${esc(c.fbPlaceholder)}"></textarea></div>
<div class="fb-field"><label for="fbEmail">${esc(c.fbEmailLabel)}</label>
  <input id="fbEmail" type="email" placeholder="${esc(c.fbEmailPlaceholder)}"></div>
<button class="fb-send" id="fbSend">${esc(c.fbSend)}</button>
<div class="fb-msg" id="fbMsgOut" aria-live="polite"></div>
<script>
(function(){
  var type='bug';
  var bug=document.getElementById('fbBug'), idea=document.getElementById('fbIdea');
  bug.onclick=function(){type='bug';bug.classList.add('on');idea.classList.remove('on');};
  idea.onclick=function(){type='idea';idea.classList.add('on');bug.classList.remove('on');};
  document.getElementById('fbSend').onclick=async function(){
    var msg=document.getElementById('fbMsg').value.trim();
    var email=document.getElementById('fbEmail').value.trim();
    var out=document.getElementById('fbMsgOut'); var btn=this;
    if(!msg){out.className='fb-msg err';out.textContent=${JSON.stringify(c.fbEmpty)};return;}
    btn.disabled=true; var old=btn.textContent; btn.textContent=${JSON.stringify(c.fbSending)};
    try{
      var r=await fetch(${JSON.stringify(api)}+'/feedback',{method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({type:type,message:msg,email:email,lang:${JSON.stringify(lang)},page:location.pathname})});
      if(!r.ok)throw 0;
      out.className='fb-msg ok';out.textContent=${JSON.stringify(c.fbOk)};
      document.getElementById('fbMsg').value='';document.getElementById('fbEmail').value='';
    }catch(e){out.className='fb-msg err';out.textContent=${JSON.stringify(c.fbErr)};}
    btn.disabled=false;btn.textContent=old;
  };
})();
</script>`;
  return shell({ lang, page: 'feedback', title: c.fbTitle, desc: c.fbDesc, inner });
}

export function buildWebPage(lang) {
  const c = C(lang);
  const inner = `<h1>${esc(c.webH1 || 'Web Design')}</h1>
<p>${esc(c.webIntro || '')}</p>
<h2>${esc(c.webInclTitle || 'What is included')}</h2>
<p>${esc(c.webInclBody || '')}</p>
<h2>${esc(c.webHowTitle || 'How it works')}</h2>
<p>${esc(c.webHowBody || '')}</p>
<a href="/web" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#f5b942;color:#0f172a;border-radius:12px;font-weight:700;text-decoration:none;">${esc(c.webCta || 'Start your project')} \u2192</a>`;
  return shell({ lang, page: 'web', title: c.webTitle || 'Web Design - AplusZ.app', desc: c.webDesc || 'Professional website built in 7 days.', inner });
}