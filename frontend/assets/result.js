/* ============================================================
   APlusZ — Result Card Renderer (Step 9 + multi-affiliate fan-out)
   File: frontend/assets/result.js
   Save: D:\Destop\AplusZ\frontend\assets\result.js
   ============================================================ */

(function () {
  'use strict';

  /* ---------- DATE FORMAT ---------- */
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

  /* ---------- CONFIDENCE ---------- */
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

  /* ---------- CALENDAR ---------- */
  function googleCalUrl(d) {
    var start = d.bestDeparture.replace(/-/g, '');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
           '&text=' + encodeURIComponent('APlusZ · ' + d.origin + ' → ' + d.destination) +
           '&dates=' + start + '/' + start +
           '&details=' + encodeURIComponent('Book by: ' + d.bestBooking + '\nEst: ' + d.priceFormatted + '\nvia APlusZ.app');
  }
  function icsBlob(d) {
    var dt = d.bestDeparture.replace(/-/g, '');
    var stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    var ics = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//APlusZ//EN',
      'BEGIN:VEVENT','UID:' + Date.now() + '@aplusz.app',
      'DTSTAMP:' + stamp,'DTSTART;VALUE=DATE:' + dt,'DTEND;VALUE=DATE:' + dt,
      'SUMMARY:APlusZ · ' + d.origin + ' → ' + d.destination,
      'DESCRIPTION:Book by ' + d.bestBooking + ' · Est. ' + d.priceFormatted,
      'END:VEVENT','END:VCALENDAR'
    ].join('\r\n');
    return new Blob([ics], { type: 'text/calendar' });
  }
  function downloadIcs(d) {
    var url = URL.createObjectURL(icsBlob(d));
    var a = document.createElement('a');
    a.href = url;
    a.download = 'aplusz-' + d.origin + '-' + d.destination + '.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- AFFILIATES (multi-source fan-out) ---------- */
  function affiliates(d) {
    var c = (window.APlusZ.config && window.APlusZ.config.affiliates) || {};
    var o = encodeURIComponent(d.origin);
    var dest = encodeURIComponent(d.destination);
    var date = d.bestDeparture;

    return {
      kiwi: 'https://www.kiwi.com/deep?from=' + o + '&to=' + dest +
            '&departure=' + date + '&affilid=' + (c.kiwi || 'placeholder'),
      skyscanner: 'https://www.skyscanner.net/transport/flights/' + d.origin.toLowerCase() + '/' +
                  d.destination.toLowerCase() + '/' + date.slice(2,4) + date.slice(5,7) + date.slice(8,10) +
                  '/?associateid=' + (c.skyscanner || 'placeholder'),
      kayak: 'https://www.kayak.com/flights/' + d.origin + '-' + d.destination + '/' + date +
             '?utm_source=' + (c.kayak || 'aplusz'),
      booking: 'https://www.booking.com/searchresults.html?ss=' + dest +
               '&checkin=' + date + '&aid=' + (c.booking || 'placeholder')
    };
  }

  /* ---------- RENDER ---------- */
  function render(d) {
    var t = window.APlusZ.i18n.t;
    var box = document.getElementById('result');
    if (!box) return;

    d.priceFormatted = window.APlusZ.detect.formatPrice(d.priceBase, d.currency);
    var daysOut = daysFromNow(d.bestDeparture);
    var aff = affiliates(d);

    box.innerHTML = [
      '<article class="result-card">',
      '  <div class="route-line">',
      '    <span class="city">' + d.origin + '</span>',
      '    <span class="arrow">→</span>',
      '    <span class="city">' + d.destination + '</span>',
      '  </div>',

      '  <div class="dates">',
      '    <div class="date-block date-departure">',
      '      <div class="date-label">' + t('result.best_departure') + '</div>',
      '      <div class="date-value">' + formatDate(d.bestDeparture) + '</div>',
      '      <div class="date-meta">in ' + daysOut + ' days</div>',
      '    </div>',
      '    <div class="date-block date-booking">',
      '      <div class="date-label">' + t('result.best_booking') + '</div>',
      '      <div class="date-value">' + formatDate(d.bestBooking) + '</div>',
      '    </div>',
      '  </div>',

      '  <div class="price-row">',
      '    <div>',
      '      <div class="price-label">' + t('result.price_label') + '</div>',
      '      <div class="price-value">' + d.priceFormatted + '</div>',
      '    </div>',
      '    ' + confidenceBadge(d.confidence),
      '  </div>',

      '  <a class="cta-book" href="' + aff.kiwi + '" target="_blank" rel="noopener nofollow">',
      '    ' + t('result.cta_book'),
      '  </a>',

      '  <div class="also-check">',
      '    <span class="also-label">Also check:</span>',
      '    <a href="' + aff.skyscanner + '" target="_blank" rel="noopener nofollow">Skyscanner</a>',
      '    <a href="' + aff.kayak + '" target="_blank" rel="noopener nofollow">Kayak</a>',
      '    <a href="' + aff.booking + '" target="_blank" rel="noopener nofollow">Hotel near ' + d.destination + '</a>',
      '  </div>',

      '  <div class="cal-row">',
      '    <a class="cal-btn" href="' + googleCalUrl(d) + '" target="_blank" rel="noopener">📅 ' + t('result.add_google') + '</a>',
      '    <button class="cal-btn" id="ics-dl">⬇ ' + t('result.download_ics') + '</button>',
      '  </div>',
      '</article>'
    ].join('');

    box.classList.remove('hidden');
    var icsBtn = document.getElementById('ics-dl');
    if (icsBtn) icsBtn.addEventListener('click', function () { downloadIcs(d); });

    // Save route locally
    try {
      var saved = JSON.parse(localStorage.getItem('aplusz-saved-routes') || '[]');
      var key = d.origin + '-' + d.destination;
      saved = saved.filter(function (r) { return (r.origin + '-' + r.destination) !== key; });
      saved.unshift({ origin: d.origin, destination: d.destination, lastPrice: d.priceFormatted, savedAt: Date.now() });
      localStorage.setItem('aplusz-saved-routes', JSON.stringify(saved.slice(0, 5)));
    } catch (e) {}
  }

  function renderEmpty(msg) {
    var box = document.getElementById('result');
    if (!box) return;
    box.classList.remove('hidden');
    box.innerHTML = '<div class="result-empty">' + (msg || window.APlusZ.i18n.t('errors.no_data')) + '</div>';
  }

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.result = { render: render, renderEmpty: renderEmpty, formatDate: formatDate };

})();
