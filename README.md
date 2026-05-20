# ✈️ APlusZ

**APlusZ.app makes you fly for LESS.**

A free, mobile-first PWA that shows the exact calendar day to book and depart for the lowest air ticket price on any route.

---

## 🌍 Live

- **Domain:** [aplusz.app](https://aplusz.app)
- **Status:** In development

---

## ⚡ Stack (always free)

| Layer | Service |
|---|---|
| Frontend | Static HTML/CSS/JS (PWA) |
| Hosting | Cloudflare Pages |
| Data fetcher | GitHub Actions (cron) |
| Data storage | JSON in this repo |
| Flight data source | Kiwi Tequila (affiliate) |
| Email alerts | `mailto:` deep links |
| Payments | Stripe (subscriptions only) |

**Monthly infrastructure cost: €0.**

---

## 📂 Structure

```
frontend/
├── index.html             # Landing + search
├── offline.html           # Service worker fallback
├── apz.webmanifest        # PWA manifest
├── sw.js                  # Service worker
├── legal/
│   └── index.html         # Mentions légales + GDPR + ToS
├── assets/
│   ├── tokens.css         # Design tokens (4 themes)
│   ├── app.css            # Layout + components
│   ├── result.css         # Result card styles
│   ├── detect.js          # Auto language/theme/currency
│   ├── i18n.js            # Translation loader
│   ├── app.js             # Page logic
│   ├── result.js          # Result card renderer
│   ├── sw-register.js     # PWA install/update
│   └── icons/             # PWA icons (192/512 + maskable)
├── i18n/
│   ├── en.json
│   ├── fr.json
│   ├── es.json
│   ├── de.json
│   ├── ja.json
│   └── zh.json
└── data/                  # Updated weekly by GitHub Actions
    └── routes.json
```

---

## 🎨 Themes (4)

- 🌑 **Dark Glass** — iOS Liquid Glass style (default for OS dark mode)
- 🌕 **Light Expressive** — Android Material 3 Expressive style
- 📖 **Sepia Reader** — eBook warm daytime
- 🌙 **Sepia Night** — warm dark night reading

Cycle via top-bar button. Persists in `localStorage`.

---

## 🌐 Languages

Auto-detected from `navigator.language` with 5-fallback chain. Supported: `en · fr · es · de · ja · zh`. Manual override persists.

---

## 💸 Revenue cap

Subscription revenue auto-pauses at **€62,000/yr** (Stripe `subscription.pause_collection`). Resets January 1. Affiliate revenue (Kiwi Tequila) is uncapped and sits outside this ceiling.

---

## 📜 Legal

[aplusz.app/legal](https://aplusz.app/legal) — GDPR + ToS + Mentions Légales.

- Éditeur: Sang DAGRANG (EI)
- SIRET: 92792462100018
- Contact: dagrang@gmail.com

---

## 📄 License

Proprietary. All rights reserved.
