// ── AplusZ · Markdown twins ────────────────────────────────────────────────
// Same facts as the route page, zero chrome, zero scripts.
// Language policy: ONE authoritative language (English) with 301s from the
// others. A half-translated twin is less honest than an English one.
//
// NO Accept-header negotiation. Cloudflare caches a route page by URL
// and ignores Vary: Accept, so whichever variant is cached first is served to
// everyone after it - a human gets Markdown, or an agent gets HTML, at random.
// The twin lives at its own URL instead, advertised by the rel=alternate Link
// header, the JSON-LD encoding node and llms.txt. One URL, one representation.

import { fareRecord } from './agent-api.js';
import { ID, CORS } from './agent-files.js';

const S = ID.site;
const RE_ROUTE = /^\/([a-z]{2})\/flights\/([a-z0-9-]+)-to-([a-z0-9-]+)$/;
const RE_MD = /^\/([a-z]{2})\/flights\/([a-z0-9-]+)-to-([a-z0-9-]+)\.md$/;

export function mdUrlFor(p) {
  const m = RE_ROUTE.exec(p);
  return m ? `${S}/en/flights/${m[2]}-to-${m[3]}.md` : null;
}

const money = (n, c) => (!c || c === 'EUR') ? `EUR ${n}` : `${n} ${c}`;

function buildTwin(rec) {
  const low = rec.six_month_low == null ? 'not observed' : money(rec.six_month_low, rec.currency);
  const best = rec.best_depart_date || 'not observed';
  const drop = rec.drop_pct ? `${rec.drop_pct}% below its recent baseline` : 'no drop recorded';
  return `# How much is the cheapest flight from ${rec.from_name} to ${rec.to_name}?

| Field | Value |
|---|---|
| Origin | ${rec.from} (${rec.from_name}${rec.from_country ? ', ' + rec.from_country : ''}) |
| Destination | ${rec.to} (${rec.to_name}${rec.to_country ? ', ' + rec.to_country : ''}) |
| Cheapest observed fare | ${money(rec.price, rec.currency)} |
| Currency | ${rec.currency} |
| Six-month low | ${low} |
| Cheapest observed departure date | ${best} |
| Movement | ${drop} |
| Freshness | cached_snapshot |

## The short answer

The lowest fare ${ID.brand} has observed from ${rec.from_name} to ${rec.to_name} is ${money(rec.price, rec.currency)} one way. Over the trailing six months the lowest it reached was ${low}${rec.best_depart_date ? `, on a departure dated ${rec.best_depart_date}` : ''}.

## What this does not guarantee

This is a cached snapshot from a recurring fare scan, not a live quote and not a bookable price. Availability, taxes, baggage and seat fees are settled at the airline or agency, not here. Check the live price before booking:

${rec.live_check_url}

## Machine access

- Fare record: ${S}/v1/fare?from=${rec.from}&to=${rec.to}
- All destinations from ${rec.from_name}: ${S}/v1/routes?from=${rec.from}
- Tool server: ${S}/mcp (tool: find_cheapest_fare)
- Field meanings: ${S}/llms-full.txt#fields

---

HTML: ${rec.html_url}
JSON: ${S}/v1/fare?from=${rec.from}&to=${rec.to}
Tool: ${S}/mcp
Source: ${ID.brand} fare scan, cached snapshot
Licence: ${S}/license.xml
Cite as: ${rec.cite_as}
`;
}

function mdResponse(body, extra) {
  return new Response(body, {
    headers: Object.assign({
      'content-type': 'text/markdown; charset=utf-8',
      'content-language': 'en',
      'cache-control': 'public, max-age=3600',
      vary: 'Accept',
      'x-robots-tag': 'max-snippet:-1',
      link: `<${S}/license.xml>; rel="license"; type="application/rsl+xml", <${S}/llms.txt>; rel="describedby"; type="text/markdown"`,
    }, CORS, extra || {}),
  });
}

async function twinFor(fromSlug, toSlug) {
  const r = await fareRecord(fromSlug, toSlug);
  if (!r.ok) return null;
  return buildTwin(r.record);
}

// Handles:  /{lang}/flights/x-to-y.md  -  non-English langs 301 to the English twin
export async function mdRoute(p, url, request) {
  const m = RE_MD.exec(p);
  if (m) {
    if (m[1] !== 'en') {
      return Response.redirect(`${S}/en/flights/${m[2]}-to-${m[3]}.md`, 301);
    }
    const body = await twinFor(m[2], m[3]);
    if (!body) return null;              // fall through to the 404 the site owns
    return mdResponse(body);
  }

  return null;
}
