/* ============================================================
   APlusZ — Result Card Renderer (Step 9 + 12 + 16)
   File: frontend/assets/result.js
   Save: D:\Destop\AplusZ\frontend\assets\result.js
   ============================================================ */

(function () {
  'use strict';

  // Travelpayouts tracked deep-link (mirrors data.js). Used only as a safety
  // fallback so the primary CTA is NEVER a bare/placeholder partner link.
  function ddmm(iso) { return (iso && iso.length >= 10) ? iso.slice(8, 10) + iso.slice(5, 7) : ''; }
  function tpBook(o, d, dep) {
    if (!o || !d) return '#';
    if (!dep) dep = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    var search = 'https://www.aviasales.com/search/' + o + ddmm(dep) + d + '1';
    return 'https://tp.media/r?marker=730427&trs=531148&p=4114&u=' +
           encodeURIComponent(search) + '&campaign_id=100';
  }

  function kiwitaxiLink(o){return 'https://tp.media/r?marker=730427&trs=531148&p=647&u='+encodeURIComponent('https://kiwitaxi.com/'+(o?o+'/':''))+'&campaign_id=1';}
  function affiliateRow(d) {
    affiliates(d);
    var a = d._affil || {};
    var k = kiwitaxiLink(d.origin);
    return '<div class="kiwitaxi-cta"><a href="' + k + '" target="_blank" rel="noopener nofollow" class="kiwi-transfer-btn">&#128661; Airport transfer -5% &bull; code TPO5</a></div>' +
      '<div class="affil-row">' +
      '<a href="' + a.gettransfer + '" target="_blank" rel="noopener nofollow" class="affil-btn">&#128652; GetTransfer</a>' +
      '<a href="' + a.airalo + '" target="_blank" rel="noopener nofollow" class="affil-btn">&#128241; Airalo eSIM</a>' +
      '<a href="' + a.drimsim + '" target="_blank" rel="noopener nofollow" class="affil-btn">&#128241; Drimsim</a>' +
      '<a href="' + a.tiqets + '" target="_blank" rel="noopener nofollow" class="affil-btn">&#127981; Tiqets</a>' +
      '<a href="' + a.klook + '" target="_blank" rel="noopener nofollow" class="affil-btn">&#127758; Klook</a>' +
      '<a href="' + a.airhelp + '" target="_blank" rel="noopener nofollow" class="affil-btn airhelp-btn">&#9992; AirHelp</a>' +
      '</div>';
  }  function formatDate(iso) {
    try {
      var d = new Date(iso);
      var loc = (window.APlusZ.i18n && window.APlusZ.i18n.locale)
        ? window.APlusZ.i18n.locale() : (navigator.language || 'en');
      return new Intl.DateTimeFormat(loc, {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      }).format(d);
    } catch (e) { return iso; }
  }
  function daysFromNow(iso) {
    var ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.round(ms / 86400000));
  }
  function cityLabel(code) {
    return (window.APlusZ.cities && window.APlusZ.cities.label)
      ? window.APlusZ.cities.label(code) : code;
  }
  /* Save-button label: "✓ Saved" if this route is already in the saved
     list, else "Save this route". Uses alerts' i18n keys (all 20 langs). */
  function savedWord() {
    var t = window.APlusZ.i18n.t;
    return '\u2713 ' + t('alerts.saved');
  }
  function isSaved(d) {
    try {
      var list = JSON.parse(localStorage.getItem('aplusz-alerts') || '[]');
      return list.some(function (r) { return (r.o + r.d) === (d.origin + d.destination); });
    } catch (e) { return false; }
  }
  function saveLabel(d) {
    var t = window.APlusZ.i18n.t;
    return isSaved(d) ? savedWord() : t('alerts.save');
  }

  function planHint(t) {
    var tier = (window.APlusZ.billing && window.APlusZ.billing.tier) ? window.APlusZ.billing.tier() : 'free';
    if (tier === 'proplus') return '<span class="plan-badge plan-badge-pp">' + t('billing.proplus_active') + '</span>';
    if (tier === 'pro') return '<span class="plan-badge plan-badge-pro">' + t('billing.pro_active') + '</span>';
    return '<button class="plan-up" onclick="if(window.APlusZ&&APlusZ.billing)APlusZ.billing.buy(\'pro\')">' + t('billing.free_upgrade') + '</button>';
  }

  function confidenceBadge(level) {
    var t = window.APlusZ.i18n.t;
    var map = {
      high:   { cls: 'conf-high',   dot: '\u25CF\u25CF\u25CF', label: t('result.confidence_high') },
      medium: { cls: 'conf-medium', dot: '\u25CF\u25CF\u25CB', label: t('result.confidence_medium') },
      low:    { cls: 'conf-low',    dot: '\u25CF\u25CB\u25CB', label: t('result.confidence_low') }
    };
    var c = map[level] || map.medium;
    return '<span class="conf ' + c.cls + '"><span class="conf-dots">' + c.dot + '</span>' + c.label + '</span>';
  }

  /* All-time-low banner. Shows ONLY when this fetch set a NEW record
     (d.dropPct > 0). Near-symbolic + inline FR/EN label (French for French
     users, English for everyone else) — no i18n JSON keys needed. */
  function isFrench() {
    try {
      var l = (localStorage.getItem('aplusz-lang') ||
               (window.APlusZ.i18n && window.APlusZ.i18n.locale && window.APlusZ.i18n.locale()) ||
               navigator.language || 'en').toLowerCase();
      return l.indexOf('fr') === 0;
    } catch (e) { return false; }
  }
  function lowBanner(d) {
    var pct = (typeof d.dropPct === 'number') ? d.dropPct : 0;
    if (pct <= 0) return '';                 // only on a fresh all-time low
    var abs = (typeof d.dropAbs === 'number' && d.dropAbs > 0)
      ? window.APlusZ.detect.formatPrice(d.dropAbs, d.currency || 'EUR') : '';
    var label = isFrench()
      ? ('Plus bas jamais vu' + (abs ? ' \u2014 ' + abs + ' de moins' : '') + ' (\u2212' + pct + '\u202F%)')
      : ('All-time low' + (abs ? ' \u2014 ' + abs + ' cheaper' : '') + ' (\u2212' + pct + '%)');
    return '  <div class="alltime-low">\u2B07\uFE0F ' + label + '</div>';
  }

  function googleCalUrl(d) {
    var start = d.bestDeparture.replace(/-/g, '');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
           '&text=' + encodeURIComponent('APlusZ \u00B7 ' + d.origin + ' \u2192 ' + d.destination) +
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
      'SUMMARY:APlusZ \u00B7 ' + d.origin + ' \u2192 ' + d.destination,
      'DESCRIPTION:Book by ' + d.bestBooking + ' \u00B7 Est. ' + d.priceFormatted,
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

  function affiliates(d) {
    var tp = 'https://tp.media/r?marker=730427&trs=531148';
    d._affil = {
      gettransfer: tp + '&p=4439&u=' + encodeURIComponent('https://gettransfer.com') + '&campaign_id=147',
      airalo:      tp + '&p=8310&u=' + encodeURIComponent('https://airalo.com')      + '&campaign_id=541',
      drimsim:     tp + '&p=2762&u=' + encodeURIComponent('https://w1.drimsim.com')  + '&campaign_id=102',
      airhelp:     tp + '&p=9139&u=' + encodeURIComponent('https://airhelp.com')     + '&campaign_id=120',
      tiqets:      tp + '&p=2074&u=' + encodeURIComponent('https://tiqets.com')      + '&campaign_id=89',
      klook:       tp + '&p=4110&u=' + encodeURIComponent('https://klook.com')       + '&campaign_id=137'
    };
    var c = (window.APlusZ.config && window.APlusZ.config.affiliates) || {};
    var o = encodeURIComponent(d.origin);
    var dest = encodeURIComponent(d.destination);
    var date = d.bestDeparture;
    return {
      kiwi: 'https://www.kiwi.com/deep?from=' + o + '&to=' + dest + '&departure=' + date + '&affilid=' + (c.kiwi || 'placeholder'),
      skyscanner: 'https://www.skyscanner.net/transport/flights/' + d.origin.toLowerCase() + '/' + d.destination.toLowerCase() + '/' + date.slice(2,4) + date.slice(5,7) + date.slice(8,10) + '/?associateid=' + (c.skyscanner || 'placeholder'),
      kayak: 'https://www.kayak.com/flights/' + d.origin + '-' + d.destination + '/' + date + '?utm_source=' + (c.kayak || 'aplusz'),

    };
  }

  /* green, monitored, but no cached fare yet -> invite live-price check */
  function renderLivePrice(d) {
    var t = window.APlusZ.i18n.t;
    var box = document.getElementById('result');
    if (!box) return;
    var hotelDest = encodeURIComponent(d.destination);
    var c = (window.APlusZ.config && window.APlusZ.config.affiliates) || {};
    var bookingId = c.booking && c.booking !== 'placeholder' ? c.booking : null;
    var hotel = bookingId ? 'https://tp.media/r?marker=730427&trs=531148&p=4114&u=' + encodeURIComponent('https://www.booking.com/searchresults.html?ss=' + hotelDest + '&aid=' + bookingId) + '&campaign_id=100' : null;
    var primaryBook = d.book || tpBook(d.origin, d.destination, d.bestDeparture);   // never undefined; always tracked

    box.innerHTML = [
      '<article class="result-card">',
      '  <div class="route-line">',
      '    <span class="city">' + cityLabel(d.origin) + '</span>',
      '    <span class="arrow">\u2192</span>',
      '    <span class="city">' + cityLabel(d.destination) + '</span>',
      '  </div>',

      '  <div class="price-row">',
      '    <div>',
      '      <div class="price-label">' + t('result.price_label') + '</div>',
      '      <div class="price-value price-live">' + t('result.check_live') + '</div>',
      '    </div>',
      '  </div>',

      '  <a class="cta-book" href="' + primaryBook + '" target="_blank" rel="noopener nofollow">',
      '    ' + t('result.cta_book'),
      '  </a>',

      hotel ? '  <div class="also-check"><span class="also-label">' + t('result.also_check') + '</span><a href="' + hotel + '" target="_blank" rel="noopener nofollow">' + t('result.hotel_near').replace('{city}', d.destination) + '</a></div>' : '',
      affiliateRow(d),

      '  <div class="share-row">',
      '    <div class="share-info">',
      '      <div class="share-title">' + t('result.share_title') + '</div>',
      '      <div class="share-sub">' + t('result.share_sub') + '</div>',
      '    </div>',
      '    <button class="share-btn" id="share-btn">\u2197 ' + t('result.share_btn') + '</button>',
      '  </div>',

      '  <div class="plan-hint">' + planHint(t) + '</div>',
      '</article>'
    ].join('');

    box.classList.remove('hidden');
    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.addEventListener('click', function () {
      if (window.APlusZ.referral) window.APlusZ.referral.share();
    });
  }

  function render(d) {
    var t = window.APlusZ.i18n.t;
    var box = document.getElementById('result');
    if (!box) return;

    // ---- monitored but no cached fare: green, "Check the live price" ----
    if (d.livePrice) { renderLivePrice(d); return; }

    d.priceFormatted = window.APlusZ.detect.formatPrice(d.priceBase, d.currency);
    var daysOut = daysFromNow(d.bestDeparture);
    var aff = affiliates(d);
    var primaryBook = d.book || tpBook(d.origin, d.destination, d.bestDeparture);   // tracked link; fallback also tracked, never bare

    box.innerHTML = [
      '<article class="result-card">',
      '  <div class="route-line">',
      '    <span class="city">' + cityLabel(d.origin) + '</span>',
      '    <span class="arrow">\u2192</span>',
      '    <span class="city">' + cityLabel(d.destination) + '</span>',
      '  </div>',

      '  <div class="dates">',
      '    <div class="date-block date-departure">',
      '      <div class="date-label">' + t('result.best_departure') + '</div>',
      '      <div class="date-value">' + formatDate(d.bestDeparture) + '</div>',
      '      <div class="date-meta">' + t('result.days_out').replace('{n}', daysOut) + '</div>',
      '    </div>',
      '    <div class="date-block date-booking">',
      '      <div class="date-label">' + t('result.best_booking') + '</div>',
      '      <div class="date-value">' + formatDate(d.bestBooking) + '</div>',
      '    </div>',
      '  </div>',

      lowBanner(d),

      '  <div class="price-row">',
      '    <div>',
      '      <div class="price-label">' + t('result.price_label') + '</div>',
      '      <div class="price-value">' + d.priceFormatted + '</div>',
      '    </div>',
      '    ' + confidenceBadge(d.confidence),
      '  </div>',

      '  <a class="cta-book" href="' + primaryBook + '" target="_blank" rel="noopener nofollow">',
      '    ' + t('result.cta_book'),
      '  </a>',

      affiliateRow(d),

      '  <div class="cal-row">',
      '    <a class="cal-btn" href="' + googleCalUrl(d) + '" target="_blank" rel="noopener">\uD83D\uDCC5 ' + t('result.add_google') + '</a>',
      '    <button class="cal-btn" id="ics-dl">\u2B07 ' + t('result.download_ics') + '</button>',
      '  </div>',

      '  <div class="sr-bar">',
      '    <button class="sr-half sr-save" id="save-btn">\uD83D\uDCBE <span class="sr-lbl">' + saveLabel(d) + '</span></button>',
      '    <button class="sr-half sr-remind" id="remind-btn">\uD83D\uDD14 ' + t('alerts.remind') + '</button>',
      '  </div>',

      '  <div class="share-row">',
      '    <div class="share-info">',
      '      <div class="share-title">' + t('result.share_title') + '</div>',
      '      <div class="share-sub">' + t('result.share_sub') + '</div>',
      '    </div>',
      '    <button class="share-btn" id="share-btn">\u2197 ' + t('result.share_btn') + '</button>',
      '  </div>',

      '  <div class="plan-hint">' + planHint(t) + '</div>',

      '</article>'
    ].join('');

    box.classList.remove('hidden');

    var icsBtn = document.getElementById('ics-dl');
    if (icsBtn) icsBtn.addEventListener('click', function () { downloadIcs(d); });

    var saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      if (window.APlusZ.alerts && window.APlusZ.alerts.save) {
        var ok = window.APlusZ.alerts.save(d);
        if (ok) {
          if (window.mfSaveRoute) window.mfSaveRoute();   /* MF: saved route = paid action */
          saveBtn.classList.add('is-saved');
          var lbl = saveBtn.querySelector('.sr-lbl');
          if (lbl) lbl.textContent = savedWord();
        }
      }
    });

    var remindBtn = document.getElementById('remind-btn');
    if (remindBtn) remindBtn.addEventListener('click', function () {
      if (window.APlusZ.alerts) window.APlusZ.alerts.remind(d);
    });

    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.addEventListener('click', function () {
      if (window.APlusZ.referral) window.APlusZ.referral.share();
    });
  }

  /* round-trip renderer: two legs + combined total */
  function legPriceNum(d) {
    return (d && typeof d.priceBase === 'number' && !d.livePrice) ? d.priceBase : null;
  }
  function legBlock(d, head) {
    var t = window.APlusZ.i18n.t;
    var headHtml = '<div class="rt-leg-head" style="font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim);font-weight:600;margin-bottom:var(--sp-2);">' + head + '</div>';
    if (!d) {
      return '<div class="rt-leg">' + headHtml + '<div class="result-empty">' + t('errors.no_data') + '</div></div>';
    }
    var primaryBook = d.book || tpBook(d.origin, d.destination, d.bestDeparture);
    var routeHtml = '<div class="route-line"><span class="city">' + cityLabel(d.origin) + '</span><span class="arrow">\u2192</span><span class="city">' + cityLabel(d.destination) + '</span></div>';
    var body;
    if (d.livePrice) {
      body = '<div class="price-row"><div><div class="price-label">' + t('result.price_label') + '</div><div class="price-value price-live">' + t('result.check_live') + '</div></div></div>';
    } else {
      d.priceFormatted = window.APlusZ.detect.formatPrice(d.priceBase, d.currency);
      body =
        '<div class="dates">' +
          '<div class="date-block date-departure"><div class="date-label">' + t('result.best_departure') + '</div><div class="date-value">' + formatDate(d.bestDeparture) + '</div><div class="date-meta">' + t('result.days_out').replace('{n}', daysFromNow(d.bestDeparture)) + '</div></div>' +
          '<div class="date-block date-booking"><div class="date-label">' + t('result.best_booking') + '</div><div class="date-value">' + formatDate(d.bestBooking) + '</div></div>' +
        '</div>' +
        lowBanner(d) +
        '<div class="price-row"><div><div class="price-label">' + t('result.price_label') + '</div><div class="price-value">' + d.priceFormatted + '</div></div>' + confidenceBadge(d.confidence) + '</div>';
    }
    return '<div class="rt-leg">' + headHtml + routeHtml + body +
      '<a class="cta-book" href="' + primaryBook + '" target="_blank" rel="noopener nofollow">' + t('result.cta_book') + '</a></div>';
  }
  function renderRound(out, back) {
    var t = window.APlusZ.i18n.t;
    var rtl = function (k) { return (window.APlusZ && window.APlusZ.rt) ? window.APlusZ.rt(k) : k; };
    var box = document.getElementById('result');
    if (!box) return;
    var on = legPriceNum(out), bn = legPriceNum(back);
    var totalHtml = '';
    if (on != null && bn != null) {
      var cur = (out && out.currency) || (back && back.currency) || 'EUR';
      totalHtml = '<div class="price-row" style="border-top:1px solid var(--border);"><div><div class="price-label">' + rtl('total') + '</div><div class="price-value">' + window.APlusZ.detect.formatPrice(on + bn, cur) + '</div></div></div>';
    }
    var affBase = out || back;
    box.innerHTML =
      '<article class="result-card">' +
      legBlock(out, rtl('out')) +
      '<div style="height:1px;background:var(--border);margin:2px 0;"></div>' +
      legBlock(back, rtl('back')) +
      totalHtml +
      affiliateRow(affBase) +
      '<div class="share-row"><div class="share-info"><div class="share-title">' + t('result.share_title') + '</div><div class="share-sub">' + t('result.share_sub') + '</div></div><button class="share-btn" id="share-btn">\u2197 ' + t('result.share_btn') + '</button></div>' +
      '<div class="plan-hint">' + planHint(t) + '</div>' +
      '</article>';
    box.classList.remove('hidden');
    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.addEventListener('click', function () {
      if (window.APlusZ.referral) window.APlusZ.referral.share();
    });
  }

  function renderEmpty(msg) {
    var box = document.getElementById('result');
    if (!box) return;
    box.classList.remove('hidden');
    box.innerHTML = '<div class="result-empty">' + (msg || window.APlusZ.i18n.t('errors.no_data')) + '</div>';
  }

  window.APlusZ = window.APlusZ || {};
  window.APlusZ.result = { render: render, renderRound: renderRound, renderEmpty: renderEmpty, formatDate: formatDate };

})();
