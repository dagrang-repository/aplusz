/* mf-track.js — Marketing Foundation referral tracking for aplusz.app
   Loads site-wide. Idle unless the visitor arrived via /r/CODE (vref cookie present).

   Wires the three paid paths to the Marketing Foundation worker (via the /mf/* Pages
   Functions, which hold the secret — none of it is exposed here):
     • Travelpayouts outbound click (marker 531148)  -> /mf/click    (promoter dust)
     • Save a route                                  -> /mf/signup   (promoter action)
     • Return visit while referred (once/day)        -> /mf/activity (keeps day-3 alive)
   And carries the referrer into Stripe:
     • Click on a buy.stripe.com link  -> appends ?client_reference_id=<vref>
       so the subscription credits the promoter (Stripe -> MF webhook reads it).
*/
(function () {
  "use strict";

  function get(name) {
    var m = (document.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  function setCookie(name, val, maxAge) {
    document.cookie = name + "=" + val + "; Domain=aplusz.app; Path=/; Max-Age=" + maxAge + "; SameSite=Lax; Secure";
  }

  var VREF = get("vref");                          // promoter code (empty = organic visitor)

  // stable anonymous visitor id (NOT a secret) for sign-up / activity
  var VID = get("vid");
  if (!VID) {
    VID = "v_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    setCookie("vid", VID, 7776000);                // 90 days
  }

  function ping(path, payload) {
    try {
      var body = JSON.stringify(payload || {});
      if (navigator.sendBeacon) {
        navigator.sendBeacon(path, new Blob([body], { type: "application/json" }));
      } else {
        fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: body, keepalive: true }).catch(function () {});
      }
    } catch (e) {}
  }

  // ---- Travelpayouts outbound click detection -------------------------------------
  // Primary signal = our marker in the URL. Host list is a fallback.
  var TP_HOSTS = /(^|\.)(aviasales\.|jetradar\.|wayaway\.|tp\.media|trip\.com|kiwi\.com|hotellook\.|travelpayouts\.|kiwitaxi\.)/i;
  function isTPLink(a) {
    if (!a || !a.href) return false;
    if (a.href.indexOf("marker=531148") !== -1) return true;
    try { return TP_HOSTS.test(new URL(a.href).hostname); } catch (e) { return false; }
  }
  function isStripeLink(a) { return !!(a && a.href && a.href.indexOf("buy.stripe.com") !== -1); }

  // capture phase: run before navigation so we can rewrite the Stripe href and fire the beacon
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a) return;

    if (VREF && isStripeLink(a) && a.href.indexOf("client_reference_id=") === -1) {
      a.href += (a.href.indexOf("?") === -1 ? "?" : "&") + "client_reference_id=" + encodeURIComponent(VREF);
    }

    if (VREF && isTPLink(a)) {
      ping("/mf/click", { src: get("vsrc") });
    }
  }, true);

  // ---- Save route = referral action -----------------------------------------------
  var savedThisLoad = false;                        // MF is idempotent by memberId; one ping/load is enough
  function onSaveRoute() {
    if (!VREF || savedThisLoad) return;
    savedThisLoad = true;
    ping("/mf/signup", {});
  }
  window.mfSaveRoute = onSaveRoute;                            // <-- call this in your save handler
  document.addEventListener("aplusz:save", onSaveRoute);      // <-- or dispatch this event
  document.addEventListener("aplusz:saveroute", onSaveRoute);
  document.addEventListener("click", function (ev) {           // <-- or add data-mf-save to the save button
    if (ev.target && ev.target.closest && ev.target.closest("[data-mf-save]")) onSaveRoute();
  }, true);

  // ---- Keep referred visitor alive for the day-3 check (once/day) ------------------
  if (VREF) {
    var today = new Date().toISOString().slice(0, 10);
    if (get("vidA") !== today) {
      setCookie("vidA", today, 172800);             // 2 days
      ping("/mf/activity", {});
    }
  }
})();
