# APlusZ — Step 18 Go-Live Checklist (Stripe + Worker + Resend)

Products are already created in Stripe (Pro €4.99, Pro+ €9.99). This file is
the one-time wiring to make paid plans actually work. Nothing here puts a
secret in the repo — all secrets live in Cloudflare.

---

## 1. Get your Price IDs (Stripe dashboard)
Product catalog → open **AplusZ Pro** → its price row → copy the `price_...` id → that's `PRICE_PRO`.
Repeat for **AplusZ Pro+** → `PRICE_PROPLUS`.

## 2. Get your Stripe secret key
Developers → API keys → **Secret key** (`sk_live_...`) → that's `STRIPE_SECRET`.

## 3. Deploy the Worker (folder: `worker/`)
```
cd worker
npx wrangler kv namespace create AZKV      # paste the printed id into wrangler.toml
npx wrangler deploy
```
Then map the custom domain: Cloudflare dashboard → Workers & Pages → aplusz-api →
Settings → Domains & Routes → add **api.aplusz.app**.

## 4. Set the Worker secrets (never in repo)
```
npx wrangler secret put STRIPE_SECRET          # sk_live_...
npx wrangler secret put PRICE_PRO              # price_...
npx wrangler secret put PRICE_PROPLUS          # price_...
npx wrangler secret put RESEND_KEY             # re_...  (Resend → API Keys)
npx wrangler secret put SIGNING_SECRET         # any long random string
npx wrangler secret put ADMIN_PASS             # any long random string (for manual pause)
npx wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_... (from step 5)
```

## 5. Create the Stripe webhook
Developers → Webhooks → **Add endpoint**
- URL: `https://api.aplusz.app/webhook`
- Events: **invoice.paid**
- Save → reveal **Signing secret** (`whsec_...`) → put it via `wrangler secret put STRIPE_WEBHOOK_SECRET` (step 4).

## 6. Verify Resend sending domain
Resend → Domains → add **aplusz.app** → add the DNS records it shows (SPF/DKIM)
so `automail@aplusz.app` lands in real inboxes, not spam.

## 7. Frontend
Already wired (`billing.js` loaded in `index.html`, Pro/Pro+ buttons call it).
`billing.js` defaults the API base to `https://api.aplusz.app`. To override,
add `window.APlusZ.config.api = "..."` in `assets/config.js`.

---

## Owner unlimited Pro+
Your owner email is set in `wrangler.toml` (`OWNER_EMAIL = dagrang@gmail.com`).
Using that email anywhere returns **Pro+** automatically, is **never charged**,
and is **never counted** toward the cap.

## The revenue cap (auto)
- Limit: **€62,000 of Stripe revenue per calendar year**.
- The Worker tallies every paid invoice. At €62,000 it auto-pauses all
  subscriptions and emails customers that everything is free until 1 January.
- When `capOn` is true, `billing.js` unlocks every feature for **everyone**
  and shows the gold banner. It resets automatically on 1 January (new-year tally).

## Manual pause (your yearly lever)
Pause everything yourself at any time:
```
curl -X POST https://api.aplusz.app/admin/pause \
  -H "content-type: application/json" \
  -d '{"pass":"YOUR_ADMIN_PASS","action":"on"}'
```
Resume (e.g. new year):
```
curl -X POST https://api.aplusz.app/admin/pause \
  -H "content-type: application/json" \
  -d '{"pass":"YOUR_ADMIN_PASS","action":"off"}'
```

## Token lifetime
Access token lasts **30 days** on a device, then `billing.js` silently
re-validates against Stripe. Cancel/lapse → access drops at re-check.
Lost device or cleared browser → user taps **"Already paid? Restore access"**,
enters their email, and gets the magic link again.

## NOTE — affiliate income is NOT in this cap
The Worker only sees Stripe revenue. Affiliate income (Travelpayouts/CJ) is
tracked in their own dashboards and is your responsibility to watch separately.
If combined income nears €62,000, use the manual pause above.
