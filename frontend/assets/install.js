/* ============================================================
   APlusZ — PWA Install Prompt (custom UI)
   File: frontend/assets/install.js
   Save: D:\Destop\AplusZ\frontend\assets\install.js
   ============================================================ */

(function () {
  'use strict';

  var deferredPrompt = null;
  var promptShown = false;

  /* ---------- Listen for browser's install eligibility ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    // Don't show immediately — wait 5 seconds for user to engage
    setTimeout(showInstallBanner, 5000);
  });

  /* ---------- Already installed? Hide forever ---------- */
  window.addEventListener('appinstalled', function () {
    try { localStorage.setItem('aplusz-installed', '1'); } catch (e) {}
    hideBanner();
  });

  /* ---------- Show custom banner ---------- */
  function showInstallBanner() {
    if (promptShown) return;
    try {
      if (localStorage.getItem('aplusz-installed') === '1') return;
      if (localStorage.getItem('aplusz-install-dismissed-at')) {
        var last = parseInt(localStorage.getItem('aplusz-install-dismissed-at'), 10);
        // Re-show 7 days after dismissal
        if (Date.now() - last < 7 * 86400000) return;
      }
    } catch (e) {}

    promptShown = true;
    var banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.innerHTML =
      '<div class="ib-icon">✈️</div>' +
      '<div class="ib-text">' +
      '  <div class="ib-title">Install APlusZ</div>' +
      '  <div class="ib-sub">Fly for LESS — one tap away</div>' +
      '</div>' +
      '<button class="ib-install" id="ib-install">Install</button>' +
      '<button class="ib-close" id="ib-close" aria-label="Dismiss">×</button>';
    document.body.appendChild(banner);

    document.getElementById('ib-install').addEventListener('click', function () {
      if (!deferredPrompt) return hideBanner();
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        deferredPrompt = null;
        hideBanner();
      });
    });

    document.getElementById('ib-close').addEventListener('click', function () {
      try { localStorage.setItem('aplusz-install-dismissed-at', Date.now()); } catch (e) {}
      hideBanner();
    });

    requestAnimationFrame(function () {
      banner.classList.add('show');
    });
  }

  function hideBanner() {
    var b = document.getElementById('install-banner');
    if (b) {
      b.classList.remove('show');
      setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 300);
    }
  }

  /* ---------- iOS Safari (no beforeinstallprompt support) ---------- */
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isIOS && !isStandalone) {
    setTimeout(function () {
      try {
        if (localStorage.getItem('aplusz-ios-hint-shown') === '1') return;
        localStorage.setItem('aplusz-ios-hint-shown', '1');
      } catch (e) {}
      var hint = document.createElement('div');
      hint.id = 'install-banner';
      hint.innerHTML =
        '<div class="ib-icon">✈️</div>' +
        '<div class="ib-text">' +
        '  <div class="ib-title">Install APlusZ</div>' +
        '  <div class="ib-sub">Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></div>' +
        '</div>' +
        '<button class="ib-close" id="ib-close-ios" aria-label="Dismiss">×</button>';
      document.body.appendChild(hint);
      document.getElementById('ib-close-ios').addEventListener('click', function () {
        hint.classList.remove('show');
        setTimeout(function () { if (hint.parentNode) hint.parentNode.removeChild(hint); }, 300);
      });
      requestAnimationFrame(function () { hint.classList.add('show'); });
    }, 5000);
  }

})();
