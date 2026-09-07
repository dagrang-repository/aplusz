/* ============================================================
   APlusZ â€” Config (Steps 12 + 18)
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
      booking:    'aplusz'   // https://members.cj.com (Booking.com FR â€” CJ PID)
    },

    stripe: {
      // Stripe Dashboard â†’ Products â†’ Create price â†’ Payment Link â†’ paste full URL here
      pro:     'placeholder',     // â‚¬4.99/mo  e.g. 'https://buy.stripe.com/xxxx'
      proplus: 'placeholder'      // â‚¬9.99/mo
    },

    // Front-index billboard affiliate slides. Each slide stays HIDDEN until its
    // placeholder is replaced with a real link (no bare links are ever shown).
    billboard: {
      insurance: 'https://safetywing.com/?referenceID=YOUR_ID',          // SafetyWing (or World Nomads)
      hosting:   'https://www.hostinger.com/ref/YOUR_USERNAME',          // Hostinger
      webdesign: '/web'                                                      // own aplusz.app web-design subdomain (set when live)
    },

    // Customer Portal URL (Stripe Dashboard â†’ Settings â†’ Customer Portal â†’ Activate â†’ copy link)
    customerPortal: 'placeholder' // e.g. 'https://billing.stripe.com/p/login/xxxx'

  };
})();
