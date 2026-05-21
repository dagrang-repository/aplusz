/* ============================================================
   APlusZ — Config (Steps 12 + 18)
   File: frontend/assets/config.js
   Save: D:\Destop\AplusZ\frontend\assets\config.js

   Fill in real IDs once accounts approved.
   ============================================================ */

(function () {
  window.APlusZ = window.APlusZ || {};
  window.APlusZ.config = {

    affiliates: {
      kiwi:       'placeholder',  // https://www.travelpayouts.com (Kiwi via TP marker)
      skyscanner: 'placeholder',  // https://www.travelpayouts.com (Skyscanner via TP marker)
      kayak:      'aplusz',       // https://www.travelpayouts.com (Kayak via TP marker)
      booking:    'placeholder'   // https://members.cj.com (Booking.com FR — CJ PID)
    },

    stripe: {
      // Stripe Dashboard → Products → Create price → Payment Link → paste full URL here
      pro:     'placeholder',     // €4.99/mo  e.g. 'https://buy.stripe.com/xxxx'
      proplus: 'placeholder'      // €9.99/mo
    },

    // Customer Portal URL (Stripe Dashboard → Settings → Customer Portal → Activate → copy link)
    customerPortal: 'placeholder' // e.g. 'https://billing.stripe.com/p/login/xxxx'

  };
})();
