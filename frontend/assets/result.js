/* ============================================================
   APlusZ — Result Card Renderer (Step 9)
   File: frontend/assets/result.js
   Save: D:\Destop\AplusZ\frontend\assets\result.js
   ============================================================ */

(function () {
  'use strict';

  /* ---------- DATE FORMAT (locale-aware) ---------- */
  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return new Intl.DateTimeFormat(navigator.language || 'en', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      }).format(d);
    } catch (e) { return iso; }
  }

  function daysFromNow(iso) {
    var ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.round(ms / 86400000));
  }

  /* ---------- CONFIDENCE BADGE ---------- */
  function confidenceBadge(level) {
    var t = window.APlusZ.i18n.t;
    var map = {
      high:   { cls: 'conf-high',   dot: '●●●', label: t('result.confidence_high') },
      medium: { cls: 'conf-medium', dot: '●●○', label: t('result.confidence_medium') },
      low:    { cls: 'conf-low',    dot: '●○○', label: t('result.confidence_low') }
    };
    var c = map[level] || map.medium;
    return '<span class="conf ' + c.cls + '"><span class="conf-dots">' + c.dot + '</span>' + c.label + '</span>';
  }

  /* ---------- CALENDAR EXPORT ---------- */
  function googleCalUrl(data) {
    var start = data.bestDeparture.replace(/-/g, '');
    var end = start;
    var title = encodeURIComponent('APlusZ · ' + data.origin + ' → ' + data.destination);
    var details = encodeURIComponent(
      'Optimal departure date for lowest fare.\n' +
      'Book by: ' + data.bestBooking + '\n' +
      'Estimated price: ' + data.priceFormatted + '\n' +
      'via APlusZ.app'
    );
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
           '&text=' + title +
           '&dates=' + start + '/' + end +
           '&details=' + details;
  }

  function icsBlob(data) {
    var dt = data.bestDeparture.replace(/-/g, '');
    var stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//APlusZ//EN',
      'BEGIN:VEVENT',
      'UID:' + Date.now() + '@aplusz.app',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + dt,
      'DTEND;VALUE=DATE:' + dt,
      'SUMMARY:APlusZ · ' + data.origin + ' → ' + data.destination,
      'DESCRIPTION:Book by ' + data.bestBooking + ' · Est. ' + data.priceFormatted,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    return new Blob([ics], { type: 'text/calendar' });
  }

  function downloadIcs(data) {
    var url = URL.createObjectURL(icsBlob(data));
    var a = document.createElement('a');
    a.href = url;
    a.download = 'aplusz-' + data.origin + '-' + data.destination + '.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- AFFILIATE LINK (Kiwi Tequila — placeholder, real id in Step 12) ---------- */
  function affiliateLink(data) {
    var partner = window.APlusZ.config && window.APlusZ.config.kiwiPartnerId || 'placeholder';
    return 'https://www.kiwi.com/deep?from=' + encodeURIComponent(data.origin) +
           '&to=' + encodeURIComponent(data.destination) +
           '&departure=' + data.bestDeparture +
           '&affilid=' + partner;
  }

  /* ---------- MAIN RENDER ---------- */
  function render(data) {
    var t = window.APlusZ.i18n.t;
    var box = document.getElementById('result');
    if (!box) return;

    var formattedPrice = window.APlusZ.detect.formatPrice(data.priceBase, data.currency);
    data.priceFormatted = formattedPrice;

    var daysOut = daysFromNow(data.bestDeparture);

    box.innerHTML = [
      '<article class="result-card">',
      '  <div class="route-line">',
      '    <span class="city">' + data.origin + '</span>',
      '    <span class="arrow">→</span>',
      '    <span class="city">' + data.destination + '</span>',
      '  </div>',

      '  <div class="dates">',
      '    <div class="date-block date-departure">',
      '      <div class="date-label">' + t('result.best_departure') + '</div>',
      '      <div class="date-value">' + formatDate(data.bestDeparture) + '</div>',
      '      <div class="date-meta">in ' + daysOut + ' days</div>',
      '    </div>',
      '    <div class="date-block date-booking">',
      '      <div class="date-label">' + t('result.best_booking') + '</div>',
      '      <div class="date-value">' + formatDate(data.bestBooking) + '</div>',
      '    </div>',
      '  </div>',

      '  <div class="price-row">',
      '    <div>',
      '      <div class="price-label">' + t('result.price_label') + '</div>',
      '      <div class="price-value">' + formattedPrice + '</div>',
      '    </div>',
      '    ' + confidenceBadge(data.confidence),
      '  </div>',

      '  <a class="cta-book" href="' + affiliateLink(data) + '" target="_blank" rel="noopener">',
      '    ' + t('result.cta_book'),
      '  </a>',

      '  <div class="cal-row">',
      '    <a class="cal-btn" href="' + googleCalUrl(data) + '" target="_blank" rel="noopener">',
      '      📅 ' + t('result.add_google'),
      '    </a>',
      '    <button class="cal-btn" id="ics-dl">⬇ ' + t('result.download_ics') + '</button>',
      '  </div>',
      '</article>'
    ].join('');

    box.classList.remove('hidden');
    var icsBtn = document.getElementById('ics-dl');
    if (icsBtn) icsBtn.addEventListener('click', function () { downloadIcs(data); });

    // Save route to localStorage (for offline fallback)
    try {
      var saved = JSON.parse(localStorage.getItem('aplusz-saved-routes') || '[]');
      var key = data.origin + '-' + data.destination;
      saved = saved.filter(function (r) { return (r.origin + '-' + r.destination) !== key; });
      saved.unshift({
        origin: data.origin,
        destination: data.destination,
        lastPrice: formattedPrice,
        savedAt: Date.now()
      });
      saved = saved.slice(0, 5);
      localStorage.setItem('aplusz-saved-routes', JSON.stringify(saved));
    } catch (e) {}
  }

  function renderEmpty(msg) {
    var box = document.getElementById('result');
    if (!box) return;
    box.classList.remove('hidden');
    box.innerHTML = '<div class="result-empty">' + (msg || window.APlusZ.i18n.t('errors.no_data')) + '</div>';
  }

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.result = {
    render: render,
    renderEmpty: renderEmpty,
    formatDate: formatDate
  };

})();
