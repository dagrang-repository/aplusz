# Fare-Intelligence — Mount & Run

Backend foundation for the AplusZ premium addition. Deploy this and the **moat starts
filling immediately**. Everything below runs on your existing Cloudflare stack — no new vendors.

Files live in apluszworker under `src/fare-intelligence/`:
`schema.sql` · `verdict.js` · `routes.js` · `wrangler.d1.toml`

---

## 1. Create the D1 database
```
npx wrangler d1 create aplusz-fares
```
Copy the printed `database_id`.

## 2. Bind it
Open `fare-intelligence/wrangler.d1.toml`, paste the id into `database_id`, then copy the
`[[d1_databases]]` block into apluszworker's `wrangler.toml`.

## 3. Create the table
```
npx wrangler d1 execute aplusz-fares --remote --file=src/fare-intelligence/schema.sql
```

## 4. Mount the routes (one line)
In apluszworker's entry file, at the **top** of your `fetch` handler:
```js
import { fareRoutes } from "./fare-intelligence/routes.js";

export default {
  async fetch(request, env, ctx) {
    const fr = await fareRoutes(request, env);
    if (fr) return fr;                 // /fare, /history, /verdict handled here
    // ... your existing routing continues unchanged ...
  }
}
```
`UPLOAD_KEY` is your existing secret — already set, nothing to add.

## 5. Deploy
```
npx wrangler deploy
```
Smoke-test:
```
curl "https://api.aplusz.app/verdict?o=CDG&d=MNL&depart=2026-09-15&price=62000"
# -> {"samples":0,"verdict":{"band":"unknown","label":"Building history",...}}
```
`samples:0` is expected on day one — it climbs as the crawler feeds it.

---

## 6. Feed the moat — crawler dual-write

The engine is fed by your **existing** crawlerbot. After its fare-signature change check
(the gate that already decides "republish or not"), POST the fare once per changed route.
Reuses your `X-Upload-Key` pattern, exactly like `/upload`.

**Ingest contract** (any language — it's one POST):
```
POST https://api.aplusz.app/fare
Header: x-upload-key: <UPLOAD_KEY>
Body (JSON):
  { "origin":"CDG", "dest":"MNL", "depart_date":"2026-09-15",
    "return_date":"2026-09-29",            // or null for one-way
    "price":62000,                          // MINOR UNITS (cents). €620.00 -> 62000
    "currency":"EUR" }
```
The server applies its own change-only gate too, so over-posting is harmless.

**Node reference** (drop in if the crawler is Node; call after your signature check):
```js
export async function recordFare(fare, uploadKey) {
  // fare: { origin, dest, depart_date, return_date|null, price(cents), currency }
  await fetch("https://api.aplusz.app/fare", {
    method: "POST",
    headers: { "content-type": "application/json", "x-upload-key": uploadKey },
    body: JSON.stringify({ ...fare, source: "crawler" }),
  });
}
```

---

## Endpoints (for the frontend, next phase)
- `GET /verdict?o=&d=&depart=&price=`  → `{ verdict:{band,label,color}, pctile, buy:{action,reason}, stats }`
- `GET /history?o=&d=&depart=[&window=7]` → `{ points:[{price,currency,found_at}] }`

Gate the **badge** behind Pro, **history chart** behind Pro, **buy/wait** behind Pro+ in the UI.

## Cost discipline (rule 4)
- The change-only write gate keeps D1 `rows_written` low — the new cost dial.
- The route index keeps `/verdict` scanning only one route's rows.
- One D1 db is fine well past launch; shard by region only if you near the 10 GB cap.
- `wrangler d1 time-travel` restores any minute in the last 30 days if a write goes bad.
