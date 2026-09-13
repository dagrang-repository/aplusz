# AGENTS.md — AplusZ (A+Z).app

AplusZ is a free flight fare finder: it scans fares across roughly 2,000 airports and, per origin city, keeps the lowest observed price to each destination plus the six-month low and the cheapest observed departure date. The public site is a Cloudflare Pages app with Pages Functions; a separate Worker at `api.aplusz.app` handles payments, email and the fare-intelligence D1 store. This file is for coding agents working in this repository — it is not a crawler directive. `agents.json` is a different file with a different audience.

## File layout

| Path | What it is |
|---|---|
| `frontend/` | Pages build output: the SPA, assets, i18n, robots.txt, sitemaps |
| `frontend/robots.txt` | Named-agent allow-list, Content-Signals, License and Sitemap directives |
| `frontend/sitemaps/sitemap-agents.xml` | The agent entry points, submitted as its own sitemap |
| `functions/_middleware.js` | The single insertion point for the whole AI/agent layer |
| `functions/_lib/agent-files.js` | Every declarative file: llms.txt, cards, licence, OpenAPI, skill |
| `functions/_lib/agent-api.js` | Keyless REST `/v1/*` and the MCP tool server at `/mcp` |
| `functions/_lib/agent-md.js` | Markdown twins at their own `.md` URLs |
| `functions/_lib/config.js` | Site constants, languages, origin allow-list, affiliate deep link |
| `functions/_lib/data.js` | **The shared resolver.** `loadCities` / `loadRoutes` |
| `functions/_lib/page.js` | Route-page HTML builder and its JSON-LD graph |
| `functions/[lang]/flights/[route].js` | The human route page |
| `worker/` | `apluszworker` on `api.aplusz.app` — payments, mail, fare D1 |

## Non-negotiable rules

1. **One resolver.** Pages, `/v1/*` and `/mcp` all read `functions/_lib/data.js`. Never add a second path to the fare data. Prevents: the page and the API quoting different numbers at the same user.
2. **Never advertise a dead endpoint.** Anything named in `agent-files.js` must answer before it ships. Prevents: an agent spending trust on a 404 and not coming back.
3. **Four layers change together.** `agent-files.js` declares, `agent-api.js` implements, `robots.txt` + the sitemap publish. Changing one alone creates a dead pointer or an invisible feature.
4. **Prices are `cached_snapshot`, always.** No copy anywhere may call them live, current or bookable. Prevents: a model repeating an overstatement as fact, then being wrong in public.
5. **Policy A stays consistent.** `robots.txt` Content-Signal, `license.xml`, `ai.txt` and the terms block in `llms.txt` must give identical answers on search / ai-input / ai-train. Prevents: a model resolving a contradiction by skipping the site.
6. **`_middleware.js` must never break the site.** Non-agent paths return `next()` untouched; the agent branch is wrapped in try/catch. Prevents: one bad discovery file taking down every route page.
7. **CSS goes to both the source file and `bundle.css`.** `index.html` loads only `assets/bundle.css`.
8. **Every partner-booking link is affiliate-wrapped** via `CONFIG.appLink`. Never emit a bare booking URL.
9. **Bump `frontend/version.json` in the same change** as anything cached at the edge.
10. **Never serve two representations from one URL.** Cloudflare caches by URL and ignores `Vary: Accept`, so the first variant cached is served to everyone afterwards. Prevents: a human shown raw Markdown, or an agent shown HTML.

## Data model

`loadRoutes(fetch, ORIGIN)` returns, sorted by price ascending:

```
{ to, price, currency, low, depart, book, dropPct }
```

`loadCities(fetch)` returns `{ byIata, bySlug }`. Resolution order for a user-supplied place: exact uppercase IATA → slug of the name → localized name slug. Origin and destination must differ; answers are directional.

The API record adds `from_name`, `to_name`, `six_month_low`, `best_depart_date`, `freshness`, `html_url`, `md_url`, `live_check_url`, `license`, `cite_as`.

## Deploy

```
cd "C:\Users\Personal PC\Desktop\AplusZ" && git add -A && git commit -m "x" && git pull --no-rebase --no-edit -X ours && git push
```

Cloudflare Pages auto-builds from `main`. Worker changes: `cd worker && npx wrangler deploy`. After any Pages environment-variable change, retry the deployment manually so bindings rebind. Burn the Cloudflare cache after any push. A route checked less than a minute after deploy may still be served by the previous version — never diagnose a fresh route from an immediate check.

## Verification after touching the agent layer

Every declared path returns 200 with the right `Content-Type`; a `.md` twin returns `text/markdown` while its HTML page stays `text/html`; `/mcp` survives `initialize`, `tools/list` and `tools/call`; and two different city pairs return two different prices. Uniform output across inputs that should diverge is the classic silent failure.
