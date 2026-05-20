/* ============================================================
   APlusZ — Service Worker Registration (Step 7)
   File: frontend/assets/sw-register.js
   Save: D:\Destop\AplusZ\frontend\assets\sw-register.js
   ============================================================ */

(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function (reg) {
        // Auto-update check every hour
        setInterval(function () { reg.update(); }, 3600000);

        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — silent activation on next reload
              nw.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch(function () {});
  });

  // Reload page when new SW takes control
  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
})();
