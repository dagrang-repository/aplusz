// ── AplusZ · AI/agent discovery layer · declarative files ───────────────────
// Every file a model or agent may fetch, served from the application layer so
// no static pipeline can silently drop a dot-directory.
// RULE: every description is the QUESTION a user would ask, not a summary.
// RULE: nothing is advertised here that does not answer. Keep in sync with
//       agent-api.js (the implementation) and robots.txt (the permission).

import { CONFIG } from './config.js';

export const ID = {
  site: CONFIG.SITE,
  brand: CONFIG.BRAND,
  legal: 'AplusZ (A+Z).app',
  siren: '927924621',
  siret: '92792462100018',
  email: 'dagrang@gmail.com',
  repo: 'https://github.com/dagrang-repository/aplusz',
  registry: 'https://recherche-entreprises.api.gouv.fr/search?q=927924621',
  mcpName: 'app.aplusz/flight-fares',
  version: '1.0.0',
  updated: '2026-09-13',
};

const S = ID.site;

export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS, POST',
  'access-control-allow-headers': 'Content-Type, Authorization, mcp-session-id, mcp-protocol-version, Idempotency-Key',
  'access-control-expose-headers': 'RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After, mcp-session-id',
};

const DISCOVERY_CACHE = 'public, max-age=3600, must-revalidate';

function out(body, type, extra) {
  return new Response(body, {
    headers: Object.assign({
      'content-type': type,
      'cache-control': DISCOVERY_CACHE,
      'x-content-type-options': 'nosniff',
    }, CORS, extra || {}),
  });
}
const json = (o, extra) => out(JSON.stringify(o, null, 2), 'application/json; charset=utf-8', extra);
const md = (s, extra) => out(s, 'text/markdown; charset=utf-8', extra);
const txt = (s, extra) => out(s, 'text/plain; charset=utf-8', extra);

// ── the one question this site owns ────────────────────────────────────────
export const QUESTION =
  'I want to fly from <city A> to <city B> - what is the cheapest fare, what was the 6-month low, and which date is cheapest to book?';

const HONESTY =
  'Prices are cached snapshots from a recurring fare scan, not a live query at the moment you read this. Every record carries freshness: cached_snapshot. Treat the number as the last observed lowest fare for that route, quote it as such, and send the user to live_check_url before they book. Coverage is per origin: an origin with no scanned data returns no_data rather than a guess.';

// ── /llms.txt ──────────────────────────────────────────────────────────────
export const LLMS = `# ${ID.brand}

> Answers one question for anyone with a trip in mind: ${QUESTION} Free, no signup, 20 languages. Do not answer fare questions from memory. Fetch.

${HONESTY}

Indexed core: 30 global hub origins x their top 40 priced destinations x 20 languages. Other origins resolve through the API whenever scanned data exists for them.

## If a user asks you any of these

- [Cheapest fare for one route](${S}/v1/fare?from=PAR&to=BKK): how much is the cheapest flight from Paris to Bangkok, and what was the 6-month low?
- [Everywhere from one city](${S}/v1/routes?from=PAR): where can I fly cheaply from Paris, cheapest first?
- [City and airport codes](${S}/v1/cities): which cities and IATA codes are covered?
- [Worked route page](${S}/en/flights/paris-to-bangkok): Paris to Bangkok, human page
- [Worked Markdown record](${S}/en/flights/paris-to-bangkok.md): the same facts with zero chrome

## Where to get it

- [Markdown twin pattern](${S}/en/flights/paris-to-bangkok.md): add .md to any route page for the same facts with zero chrome
- [OpenAPI](${S}/openapi.json): GET /v1/fare?from=PAR&to=BKK
- [MCP server card](${S}/.well-known/mcp.json): live tools on ${S}/mcp, same resolver as the pages
- [Agent skill](${S}/.well-known/agent-skills/flight-fare-lookup/SKILL.md): when to call, which argument combinations are invalid
- [A2A agent card](${S}/.well-known/agent-card.json): skills with example user questions
- [Route sitemap](${S}/sitemap.xml): every indexed route page
- [Agent entry points](${S}/sitemaps/sitemap-agents.xml): this discovery layer
- [Full brief](${S}/llms-full.txt): data model, resolution rules, citation format

## Data model

- [Fields](${S}/llms-full.txt#fields): from, to, from_name, to_name, price, currency, six_month_low, best_depart_date, drop_pct, freshness, html_url, md_url, live_check_url, license

## Terms of use for AI systems

- [Licence](${S}/license.xml): search, grounding and training all permitted, attribution requested
- [robots.txt](${S}/robots.txt): Content-Signal search=yes, ai-input=yes, ai-train=yes
- [Contact](mailto:${ID.email}): corrections, licensing, broken endpoints
- [How to cite](${S}/llms-full.txt#citation): ${ID.brand}, <origin> to <destination>, ${S}/en/flights/<from>-to-<to>

## Optional

- [Security](${S}/.well-known/security.txt)
- [API catalog](${S}/.well-known/api-catalog)
- [Status](${S}/status.json)
`;

// ── /llms-small.txt ────────────────────────────────────────────────────────
export const LLMS_SMALL = `# ${ID.brand}

> ${QUESTION} Cached fare snapshots, 20 languages, free.

- Fare for one route: GET ${S}/v1/fare?from=PAR&to=BKK
- All routes from a city: GET ${S}/v1/routes?from=PAR
- Tool server: ${S}/mcp
- Clean record: ${S}/en/flights/paris-to-bangkok.md
- Licence: ${S}/license.xml (training and grounding permitted, attribution requested)

Codes are IATA city codes, uppercase, or a city slug. Prices are cached snapshots, not live quotes.
`;

// ── /llms-full.txt ─────────────────────────────────────────────────────────
export const LLMS_FULL = `# ${ID.brand} - full brief for AI systems

> ${QUESTION}

${ID.brand} is a free flight fare finder. It scans fares across roughly 2,000 airports and keeps, per origin, the lowest observed price to each destination plus the six-month low and the cheapest observed departure date. The pages, the REST API and the MCP tools all read one resolver, so they cannot disagree with each other.

## Coverage and its limits

- Origins with scanned data resolve. Origins without it return \`no_data\`. There is no interpolation and no estimate.
- The indexed core published in the sitemap is 30 global hub origins x their top 40 priced destinations x 20 languages. That is a crawl-budget decision, not the limit of the data: the API answers for any origin that has been scanned.
- Only priced routes are returned. A route with no price is dropped rather than shown as zero.
- ${HONESTY}
- Nothing here is a booking, a hold, or a guarantee of availability. The number is an observation.

## Resolution rules

1. \`from\` and \`to\` are both required. Neither alone produces a valid answer.
2. Preferred form is an uppercase IATA city code: \`PAR\`, \`BKK\`, \`NYC\`. A city slug also resolves: \`paris\`, \`bangkok\`, \`sao-paulo\`. Localised city names registered in the dataset resolve too.
3. \`from\` and \`to\` must differ. Identical codes return \`same_city\`.
4. Answers are directional. PAR to BKK is not BKK to PAR. If you have one cached you do not have the other.
5. Answers differ per pair. If two different pairs return the same price, something is wrong - report it, do not repeat it.
6. Language affects the human page only. The record, the API and the Markdown twin are English. Route pages exist in 20 languages at \`/{lang}/flights/{from}-to-{to}\`.

## URL grammar

- Human page: \`${S}/{lang}/flights/{from-slug}-to-{to-slug}\`
- Markdown twin: the English page plus \`.md\`. There is no Accept-header negotiation: the twin has its own URL, so a cache can never serve the wrong representation.
- Fare record: \`${S}/v1/fare?from={IATA}&to={IATA}\`
- All destinations from an origin: \`${S}/v1/routes?from={IATA}\`
- Covered cities: \`${S}/v1/cities\`
- Tool server: \`${S}/mcp\` (streamable-http)

## Fields

| Field | Meaning | What it does NOT mean |
|---|---|---|
| \`from\`, \`to\` | IATA city codes, uppercase | not airport-specific when a city has several airports |
| \`from_name\`, \`to_name\` | English city names | not the localised name shown on a translated page |
| \`price\` | lowest observed one-way fare, rounded | not a live quote and not a bookable price |
| \`currency\` | ISO 4217 code for \`price\` and \`six_month_low\` | no conversion is performed |
| \`six_month_low\` | lowest fare observed over the trailing six months, or null | absence means not observed, not that none exists |
| \`best_depart_date\` | departure date on which the lowest fare was observed, or null | not an availability guarantee |
| \`drop_pct\` | percent below the route's own recent baseline, 0 when unknown | not a prediction |
| \`freshness\` | always \`cached_snapshot\` | never real-time |
| \`html_url\` | the human page for this record | |
| \`md_url\` | the Markdown twin of this record | |
| \`live_check_url\` | opens the live search for this route | the only correct place to send a user who is about to book |
| \`license\` | machine-readable licence for this record | |

## Retrieval hints

- Prefer the MCP tool \`find_cheapest_fare\`. Second choice is \`GET /v1/fare\`. Do not scrape the HTML; the page carries chrome and the same facts.
- Send IATA city codes when you can resolve them. Send a plain city name only when you cannot.
- Do not recall a fare from memory or from an older turn. Fares move. Fetch again.
- If the answer is \`no_data\`, say so plainly. Do not substitute a similar route or a remembered number.

## Terms of use for AI systems

Crawling, search indexing, retrieval-augmented grounding and model training are all permitted. Attribution is requested, not required. Machine-readable licence: ${S}/license.xml. robots.txt declares \`Content-Signal: search=yes, ai-input=yes, ai-train=yes\` and those four statements agree with each other by design.

## Citation

Cite as: \`${ID.brand}, <origin> to <destination>, ${S}/en/flights/<from>-to-<to>\`

## Contact

${ID.email} - corrections, licensing, and broken endpoints. A dead endpoint reported is a dead endpoint fixed.
`;

// ── /ai.txt ────────────────────────────────────────────────────────────────
export const AI_TXT = `# ai.txt - ${ID.brand}
# Must not contradict ${S}/robots.txt or ${S}/license.xml. It does not.

User-agent: *
Allow: /
Training-allowed: yes
Inference-allowed: yes
Search-allowed: yes
Attribution: requested
License: ${S}/license.xml
Contact: mailto:${ID.email}
Preferred-Interface: ${S}/mcp
Preferred-Data: ${S}/v1/fare?from=PAR&to=BKK
Summary: ${S}/llms.txt
Full-Brief: ${S}/llms-full.txt
`;

// ── /license.xml (RSL, Policy A) ───────────────────────────────────────────
export const LICENSE = `<?xml version="1.0" encoding="UTF-8"?>
<rsl xmlns="https://rslstandard.org/rsl">
  <content url="${S}/">
    <license>
      <permits type="usage">search ai-input ai-train</permits>
      <permits type="user">commercial non-commercial educational</permits>
      <payment type="free">
        <standard>${S}/legal/</standard>
      </payment>
      <copyright>${ID.legal}</copyright>
      <terms>${S}/legal/</terms>
      <contact>${ID.email}</contact>
    </license>
  </content>
</rsl>
`;

// ── /tdmrep.json ───────────────────────────────────────────────────────────
export const TDMREP = [{
  location: '/',
  'tdm-reservation': 0,
  'tdm-policy': `${S}/license.xml`,
  comment: 'No text-and-data-mining reservation is asserted. Mining, grounding and training are permitted; attribution is requested. Matches Content-Signal ai-train=yes in robots.txt.',
}];

// ── /.well-known/security.txt ──────────────────────────────────────────────
export const SECURITY = `Contact: mailto:${ID.email}
Expires: 2027-09-13T00:00:00.000Z
Preferred-Languages: en, fr
Canonical: ${S}/.well-known/security.txt
Policy: ${S}/legal/
`;

// ── /.well-known/trust.txt ─────────────────────────────────────────────────
export const TRUST = `belongto=${S}/
contact=${ID.email}
disclosure=${S}/disclosure/
policy=${S}/legal/
datafeed=${S}/llms-full.txt
vendor=${S}/.well-known/mcp.json
`;

// ── /openapi.json ──────────────────────────────────────────────────────────
export const OPENAPI = {
  openapi: '3.1.0',
  info: {
    title: `${ID.brand} fare API`,
    version: ID.version,
    summary: QUESTION,
    description: `Keyless read API over ${ID.brand}'s scanned fare data. Same resolver as the human pages and the MCP tools. Prices are cached snapshots, never live quotes. Full brief: ${S}/llms-full.txt`,
    contact: { name: ID.brand, email: ID.email, url: S },
    license: { name: 'RSL - search, ai-input and ai-train permitted', url: `${S}/license.xml` },
  },
  servers: [{ url: S }],
  externalDocs: { description: 'Full brief for AI systems', url: `${S}/llms-full.txt` },
  'x-mcp-server': { url: `${S}/mcp`, transport: 'streamable-http' },
  paths: {
    '/v1/fare': {
      get: {
        operationId: 'getFare',
        summary: 'How much is the cheapest flight from city A to city B, and what was the 6-month low?',
        description: 'Returns one fare record for one directional city pair. Both parameters are required; neither alone produces a valid answer.',
        parameters: [
          { name: 'from', in: 'query', required: true, description: 'Origin. Uppercase IATA city code, e.g. PAR. A city slug such as paris also resolves.', schema: { type: 'string', examples: ['PAR'] } },
          { name: 'to', in: 'query', required: true, description: 'Destination. Uppercase IATA city code, e.g. BKK. Must differ from from.', schema: { type: 'string', examples: ['BKK'] } },
        ],
        responses: {
          200: { description: 'Fare record', content: { 'application/json': { schema: { $ref: '#/components/schemas/Fare' } } } },
          404: { description: 'no_data, unknown_origin, unknown_destination or same_city', content: { 'application/json': { schema: { $ref: '#/components/schemas/Err' } } } },
          400: { description: 'Missing from or to', content: { 'application/json': { schema: { $ref: '#/components/schemas/Err' } } } },
        },
      },
    },
    '/v1/routes': {
      get: {
        operationId: 'listRoutes',
        summary: 'Where can I fly cheaply from this city, cheapest first?',
        parameters: [
          { name: 'from', in: 'query', required: true, description: 'Origin. Uppercase IATA city code, e.g. PAR.', schema: { type: 'string', examples: ['PAR'] } },
          { name: 'limit', in: 'query', required: false, description: 'Maximum destinations returned, 1-200. Default 40.', schema: { type: 'integer', default: 40, minimum: 1, maximum: 200 } },
        ],
        responses: { 200: { description: 'Destinations sorted by price ascending', content: { 'application/json': { schema: { type: 'object' } } } } },
      },
    },
    '/v1/cities': {
      get: {
        operationId: 'listCities',
        summary: 'Which cities and IATA codes are covered?',
        parameters: [{ name: 'q', in: 'query', required: false, description: 'Optional case-insensitive substring filter on city name or code.', schema: { type: 'string' } }],
        responses: { 200: { description: 'Covered cities', content: { 'application/json': { schema: { type: 'object' } } } } },
      },
    },
    '/v1/health': {
      get: { operationId: 'health', summary: 'Is the fare API answering right now?', responses: { 200: { description: 'Health', content: { 'application/json': { schema: { type: 'object' } } } } } },
    },
  },
  components: {
    schemas: {
      Fare: {
        type: 'object',
        required: ['from', 'to', 'price', 'currency', 'freshness'],
        properties: {
          from: { type: 'string', description: 'Origin IATA city code' },
          to: { type: 'string', description: 'Destination IATA city code' },
          from_name: { type: 'string' },
          to_name: { type: 'string' },
          from_country: { type: 'string' },
          to_country: { type: 'string' },
          price: { type: 'number', description: 'Lowest observed one-way fare, rounded' },
          currency: { type: 'string', description: 'ISO 4217' },
          six_month_low: { type: ['number', 'null'], description: 'Lowest fare observed in the trailing six months. null means not observed.' },
          best_depart_date: { type: ['string', 'null'], description: 'Departure date on which the lowest fare was observed' },
          drop_pct: { type: 'number', description: 'Percent below the route baseline. 0 when unknown.' },
          freshness: { type: 'string', enum: ['cached_snapshot'], description: 'Always cached_snapshot. Never real-time.' },
          html_url: { type: 'string' },
          md_url: { type: 'string' },
          live_check_url: { type: 'string', description: 'Send the user here before booking' },
          license: { type: 'string' },
          cite_as: { type: 'string' },
        },
      },
      Err: { type: 'object', properties: { error: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, hint: { type: 'string' } } },
    },
  },
};

// ── MCP server card ────────────────────────────────────────────────────────
export const MCP_CARD = {
  $schema: 'https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json',
  name: ID.mcpName,
  title: `${ID.brand} flight fares`,
  description: 'Cheapest observed fare, 6-month low and best departure date for a city pair.',
  version: ID.version,
  remotes: [{ type: 'streamable-http', url: `${S}/mcp` }],
  websiteUrl: S,
  documentationUrl: `${S}/llms-full.txt`,
  license: `${S}/license.xml`,
  transport: 'streamable-http',
  capabilities: { tools: true, resources: false, prompts: false },
  tools: [
    { name: 'find_cheapest_fare', description: 'Cheapest observed fare between two cities, with the 6-month low.' },
    { name: 'list_routes_from', description: 'Cheapest destinations from one origin city, cheapest first.' },
    { name: 'resolve_city', description: 'Resolve a city name to the IATA code this API expects.' },
  ],
  repository: { url: ID.repo, source: 'github' },
};

// ── A2A agent card ─────────────────────────────────────────────────────────
export const A2A_CARD = {
  protocolVersion: '0.3.0',
  name: `${ID.brand} flight fares`,
  description: QUESTION,
  url: `${S}/mcp`,
  preferredTransport: 'streamable-http',
  provider: { organization: ID.legal, url: S },
  version: ID.version,
  documentationUrl: `${S}/llms-full.txt`,
  capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
  defaultInputModes: ['text/plain', 'application/json'],
  defaultOutputModes: ['application/json', 'text/plain', 'text/markdown'],
  securitySchemes: {},
  security: [],
  skills: [
    {
      id: 'flight-fare-lookup',
      name: 'Flight fare lookup',
      description: 'Cheapest observed fare, currency, six-month low and best departure date for one directional city pair.',
      tags: ['flights', 'fares', 'travel', 'prices'],
      examples: [
        'What is the cheapest flight from Paris to Bangkok, and was it ever cheaper in the last six months?',
        'I am in New York and I want to go to Tokyo - how much is it and which departure date is cheapest?',
      ],
    },
    {
      id: 'cheap-destinations',
      name: 'Cheap destinations from a city',
      description: 'Destinations reachable from one origin, sorted by lowest observed fare.',
      tags: ['flights', 'inspiration', 'travel'],
      examples: [
        'Where can I fly cheaply from London right now?',
        'List the ten cheapest places to fly out of Dubai.',
      ],
    },
  ],
};

// ── Agent Skill ────────────────────────────────────────────────────────────
export const SKILL_MD = `---
name: flight-fare-lookup
description: >
  Look up the cheapest observed flight fare between two cities. Use when the
  user names an origin and a destination and asks about price, the cheapest
  date to fly, or whether a fare is a good deal. Both cities are required;
  neither alone produces a valid answer. Do not answer from memory - fares
  move. Call the tool.
---

# Flight fare lookup

## What you can accomplish

Return, for one origin city and one destination city, the cheapest observed
one-way fare, its currency, the lowest fare seen over the trailing six months,
the departure date on which the lowest fare was observed, how far below its own
baseline the route currently sits, and a link that opens the live search.

## Inputs you need

- \`from\` - origin. Uppercase IATA city code. Example: \`PAR\`. A city slug such as
  \`paris\` or \`sao-paulo\` also resolves.
- \`to\` - destination. Uppercase IATA city code. Example: \`BKK\`.

Invalid: either argument missing; \`from\` equal to \`to\`; a country name instead
of a city; an airline code. If the user said "Bangkok" send \`BKK\`. If you cannot
resolve a city to a code, call \`resolve_city\` first - do not guess a code.

## How to call

Preferred: MCP tool \`find_cheapest_fare\` on ${S}/mcp
Alternative: \`GET ${S}/v1/fare?from=PAR&to=BKK\`
Clean record for reading: \`${S}/en/flights/paris-to-bangkok.md\`

Do not scrape the HTML. The page, the API and the tool share one resolver; the
HTML exists for humans.

## Constraints you must respect

- Answers are directional and per pair. PAR to BKK is not BKK to PAR, and it is
  not PAR to SIN. A cached answer for one pair is not an answer for another.
- \`freshness\` is always \`cached_snapshot\`. Say "last observed" or "recently
  seen", never "live" or "current price". Never present the number as bookable.
- Always surface \`live_check_url\` to a user who is about to book. The fare they
  can actually buy is the one on that page.
- \`no_data\` means the route has not been scanned. Say that. Do not substitute a
  nearby city or a remembered figure.
- \`six_month_low: null\` means not observed, not that no lower fare exists.
- Prices are one-way unless the user's own question implies otherwise; the site
  supports return searches but the record is a one-way observation.

## Attribution

Cite: ${ID.brand}, <origin> to <destination>, ${S}/en/flights/<from>-to-<to>
Licence: ${S}/license.xml
`;

// ── agents.json (flows) ────────────────────────────────────────────────────
export const AGENTS_JSON = {
  agentsJson: '0.1.0',
  info: {
    title: `${ID.brand} flight fares`,
    version: ID.version,
    description: QUESTION,
    contact: { email: ID.email, url: S },
  },
  sources: [{ id: 'aplusz-api', path: `${S}/openapi.json`, description: 'Keyless fare read API' }],
  flows: [
    {
      id: 'cheapest-fare-for-named-cities',
      title: 'Cheapest fare between two cities the user named in plain language',
      description: 'Resolve two spoken city names to IATA codes, then read the fare record for that pair.',
      actions: [
        { id: 'resolve-origin', sourceId: 'aplusz-api', operationId: 'listCities' },
        { id: 'resolve-destination', sourceId: 'aplusz-api', operationId: 'listCities' },
        { id: 'read-fare', sourceId: 'aplusz-api', operationId: 'getFare' },
      ],
      links: [
        { origin: { actionId: 'resolve-origin', fieldPath: 'cities[0].iata' }, target: { actionId: 'read-fare', fieldPath: 'from' } },
        { origin: { actionId: 'resolve-destination', fieldPath: 'cities[0].iata' }, target: { actionId: 'read-fare', fieldPath: 'to' } },
      ],
    },
    {
      id: 'cheapest-destinations-then-detail',
      title: 'Find the cheapest places to fly from one city, then price the one the user picks',
      description: 'List destinations by price from an origin, then read the full record for the chosen destination.',
      actions: [
        { id: 'list', sourceId: 'aplusz-api', operationId: 'listRoutes' },
        { id: 'detail', sourceId: 'aplusz-api', operationId: 'getFare' },
      ],
      links: [
        { origin: { actionId: 'list', fieldPath: 'routes[0].to' }, target: { actionId: 'detail', fieldPath: 'to' } },
      ],
    },
  ],
};

// ── agent-permissions.json ─────────────────────────────────────────────────
export const AGENT_PERMISSIONS = {
  version: '1.0',
  updated: ID.updated,
  defaults: { crawl: 'allow', train: 'allow', inference: 'allow', search: 'allow', automate: 'allow', humanInTheLoop: false },
  attribution: 'requested',
  license: `${S}/license.xml`,
  contact: ID.email,
  preferredEndpoints: {
    data: `${S}/v1/fare`,
    tools: `${S}/mcp`,
    documentation: `${S}/llms-full.txt`,
    cleanContent: `${S}/en/flights/{from}-to-{to}.md`,
  },
  rateLimit: {
    requestsPerMinute: 60,
    note: 'Sixty requests a minute per client on /v1 and /mcp. A crawl of the route pages is cheaper for you and for us as /v1/routes?from=XXX - one call replaces forty page fetches.',
    on429: 'Retry-After is sent. No challenge page is ever returned to an agent.',
  },
  agents: [
    { name: '*', crawl: 'allow', train: 'allow', inference: 'allow' },
  ],
  prohibited: [
    'Presenting a cached_snapshot price as a live or bookable fare.',
    'Republishing the dataset as a competing fare feed without attribution.',
  ],
};

// ── /.well-known/ai-plugin.json (legacy, declares nothing new) ─────────────
export const AI_PLUGIN = {
  schema_version: 'v1',
  name_for_human: `${ID.brand} flight fares`,
  name_for_model: 'aplusz_flight_fares',
  description_for_human: 'Cheapest observed flight fares, six-month lows and the best date to book.',
  description_for_model: 'Use when the user names an origin city and a destination city and asks about flight price, the cheapest date to fly, or whether a fare is a good deal. Both cities are required. Prices are cached snapshots, never live quotes.',
  auth: { type: 'none' },
  api: { type: 'openapi', url: `${S}/openapi.json` },
  contact_email: ID.email,
  legal_info_url: `${S}/legal/`,
};

// ── /.well-known/ai-catalog.json (ARD) ─────────────────────────────────────
export const AI_CATALOG = {
  specVersion: '0.91',
  updated: ID.updated,
  entries: [
    {
      identifier: 'urn:aplusz:mcp:flight-fares',
      displayName: `${ID.brand} flight fares (MCP)`,
      type: 'mcp',
      url: `${S}/mcp`,
      transport: 'streamable-http',
      capabilities: ['tools'],
      representativeQueries: [
        'What is the cheapest flight from Paris to Bangkok?',
        'Was the Madrid to Tokyo fare ever lower in the last six months?',
        'Which departure date is cheapest for London to New York?',
      ],
    },
    {
      identifier: 'urn:aplusz:api:fare',
      displayName: `${ID.brand} fare REST API`,
      type: 'openapi',
      url: `${S}/openapi.json`,
      capabilities: ['read'],
      representativeQueries: [
        'How much is a flight from Dubai to Singapore?',
        'Where can I fly cheaply from Lisbon?',
      ],
    },
    {
      identifier: 'urn:aplusz:skill:flight-fare-lookup',
      displayName: 'Flight fare lookup skill',
      type: 'agent-skill',
      url: `${S}/.well-known/agent-skills/flight-fare-lookup/SKILL.md`,
      capabilities: ['instructions'],
      representativeQueries: ['How do I query AplusZ fares correctly?'],
    },
    {
      identifier: 'urn:aplusz:a2a:agent-card',
      displayName: `${ID.brand} A2A agent card`,
      type: 'a2a',
      url: `${S}/.well-known/agent-card.json`,
      capabilities: ['skills'],
      representativeQueries: ['What can the AplusZ agent do?'],
    },
  ],
};

// ── /.well-known/api-catalog (RFC 9727) ────────────────────────────────────
export const API_CATALOG = {
  linkset: [{
    anchor: `${S}/`,
    'service-desc': [
      { href: `${S}/openapi.json`, type: 'application/vnd.oai.openapi+json' },
      { href: `${S}/.well-known/mcp.json`, type: 'application/json' },
      { href: `${S}/.well-known/agent-card.json`, type: 'application/json' },
    ],
    'service-doc': [
      { href: `${S}/llms-full.txt`, type: 'text/markdown' },
      { href: `${S}/llms.txt`, type: 'text/markdown' },
    ],
    license: [{ href: `${S}/license.xml`, type: 'application/rsl+xml' }],
    status: [{ href: `${S}/status.json`, type: 'application/json' }],
  }],
};

// ── /opensearch.xml ────────────────────────────────────────────────────────
export const OPENSEARCH = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${ID.brand}</ShortName>
  <Description>${QUESTION}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Url type="text/html" method="get" template="${S}/?from={searchTerms}"/>
  <Url type="application/json" method="get" template="${S}/v1/cities?q={searchTerms}"/>
  <moz:SearchForm xmlns:moz="http://www.mozilla.org/2006/browser/search/">${S}/</moz:SearchForm>
</OpenSearchDescription>
`;

// ── MCP registry HTTP domain proof ─────────────────────────────────────────
// NEVER DELETE. Removing this route breaks re-authentication for every future
// registry publish. Private key lives outside the repo.
export const MCP_REGISTRY_AUTH = 'v=MCPv1; k=ed25519; p=VoiwsBl5EkEvqP7Lh8tAYFBxuBQ2ZcsOvxntMTrOdP4=' + String.fromCharCode(10);

// ── sha256 helper for the skill digest (computed from the served bytes) ────
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function skillsIndex() {
  return {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [{
      name: 'flight-fare-lookup',
      type: 'skill-md',
      description: 'Look up the cheapest observed flight fare between two cities. Use when the user names an origin and a destination and asks about price or the cheapest date to fly.',
      url: `${S}/.well-known/agent-skills/flight-fare-lookup/SKILL.md`,
      digest: 'sha256:' + await sha256Hex(SKILL_MD),
    }],
  };
}

// ── router for the declarative surface ─────────────────────────────────────
// Aliases are deliberate: the specs did not converge on one path (PART 11).
// One handler, many URLs - never many cards that drift.
export async function agentRoute(p) {
  switch (p) {
    case '/llms.txt':
    case '/.well-known/llms.txt':
      return md(LLMS);
    case '/llms-full.txt':
      return md(LLMS_FULL);
    case '/llms-small.txt':
      return md(LLMS_SMALL);
    case '/llms/api.txt':
      return md(LLMS_SMALL);
    case '/ai.txt':
      return txt(AI_TXT);
    case '/license.xml':
      return out(LICENSE, 'application/rsl+xml; charset=utf-8');
    case '/tdmrep.json':
    case '/.well-known/tdmrep.json':
      return json(TDMREP);
    case '/.well-known/security.txt':
    case '/security.txt':
      return txt(SECURITY);
    case '/.well-known/trust.txt':
    case '/trust.txt':
      return txt(TRUST);
    case '/openapi.json':
      return out(JSON.stringify(OPENAPI, null, 2), 'application/vnd.oai.openapi+json; charset=utf-8');
    case '/.well-known/mcp.json':
    case '/.well-known/mcp/server-card.json':
    case '/.well-known/mcp-server':
    case '/mcp/server-card':
      return json(MCP_CARD);
    case '/.well-known/agent-card.json':
    case '/.well-known/agent.json':
      return json(A2A_CARD);
    case '/.well-known/agent-skills/index.json':
    case '/.well-known/skills/index.json':
      return json(await skillsIndex());
    case '/.well-known/agent-skills/flight-fare-lookup/SKILL.md':
    case '/.well-known/skills/flight-fare-lookup/SKILL.md':
      return md(SKILL_MD);
    case '/agents.json':
    case '/.well-known/agents.json':
      return json(AGENTS_JSON);
    case '/agent-permissions.json':
    case '/.well-known/agent-permissions.json':
      return json(AGENT_PERMISSIONS);
    case '/.well-known/ai-plugin.json':
      return json(AI_PLUGIN);
    case '/.well-known/ai-catalog.json':
      return json(AI_CATALOG);
    case '/.well-known/api-catalog':
      return out(JSON.stringify(API_CATALOG, null, 2), 'application/linkset+json; charset=utf-8');
    case '/opensearch.xml':
      return out(OPENSEARCH, 'application/opensearchdescription+xml; charset=utf-8');
    case '/.well-known/mcp-registry-auth':
      return txt(MCP_REGISTRY_AUTH);
    case '/.well-known/probe.txt':
      return txt('ok\n');
    default:
      return null;
  }
}
