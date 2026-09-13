// ── AplusZ · machine surface · REST + MCP ──────────────────────────────────
// SHARED RESOLVER: this file calls the SAME loadCities/loadRoutes that build
// the human route pages. There is no second path to the data, so the page,
// the API and the tool cannot disagree.

import { CONFIG } from './config.js';
import { loadCities, loadRoutes, slug } from './data.js';
import { ID, CORS } from './agent-files.js';

const S = ID.site;

const API_CACHE = 'public, max-age=300, stale-while-revalidate=60';

const RL = {
  'ratelimit-limit': '60',
  'ratelimit-remaining': '59',
  'ratelimit-reset': '60',
  'ratelimit-policy': '60;w=60',
};

function jres(obj, status) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status || 200,
    headers: Object.assign({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': API_CACHE,
      'x-content-type-options': 'nosniff',
    }, CORS, RL),
  });
}

// ── resolution ─────────────────────────────────────────────────────────────
export async function resolvePlace(q) {
  const s = String(q == null ? '' : q).trim();
  if (!s) return null;
  const { byIata, bySlug } = await loadCities(fetch);
  const up = s.toUpperCase();
  if (byIata.has(up)) return byIata.get(up);
  const hit = bySlug.get(slug(s));
  if (hit) return byIata.get(hit) || { iata: hit, name: hit, country: '' };
  return null;
}

function pageUrls(from, to) {
  const fs = slug(from.name) || slug(from.iata);
  const ts = slug(to.name) || slug(to.iata);
  const html = `${S}/en/flights/${fs}-to-${ts}`;
  return { html, md: html + '.md' };
}

function shape(from, to, r) {
  const u = pageUrls(from, to);
  return {
    from: from.iata,
    to: to.iata,
    from_name: from.name,
    to_name: to.name,
    from_country: from.country || null,
    to_country: to.country || null,
    price: Math.round(r.price),
    currency: r.currency || 'EUR',
    six_month_low: r.low == null ? null : Math.round(r.low),
    best_depart_date: r.depart || null,
    drop_pct: r.dropPct || 0,
    freshness: 'cached_snapshot',
    html_url: u.html,
    md_url: u.md,
    live_check_url: CONFIG.appLink(from.iata, to.iata, 'en'),
    source_url: u.html,
    license: `${S}/license.xml`,
    cite_as: `${ID.brand}, ${from.name} to ${to.name}, ${u.html}`,
  };
}

// One record. Returns {ok:true,record} or {ok:false,error,...}.
export async function fareRecord(fromQ, toQ) {
  if (!fromQ || !toQ) {
    return { ok: false, status: 400, body: { error: 'missing_parameter', hint: 'Both from and to are required. Neither alone produces a valid answer. Example: /v1/fare?from=PAR&to=BKK' } };
  }
  const from = await resolvePlace(fromQ);
  if (!from) return { ok: false, status: 404, body: { error: 'unknown_origin', from: String(fromQ), hint: `Send an uppercase IATA city code. Covered codes: ${S}/v1/cities` } };
  const to = await resolvePlace(toQ);
  if (!to) return { ok: false, status: 404, body: { error: 'unknown_destination', to: String(toQ), hint: `Send an uppercase IATA city code. Covered codes: ${S}/v1/cities` } };
  if (from.iata === to.iata) return { ok: false, status: 404, body: { error: 'same_city', from: from.iata, to: to.iata, hint: 'Origin and destination must differ.' } };

  const routes = await loadRoutes(fetch, from.iata);
  const r = routes.find(x => x.to === to.iata);
  if (!r) return { ok: false, status: 404, body: { error: 'no_data', from: from.iata, to: to.iata, hint: 'This pair has not been scanned. Say so plainly - do not substitute a nearby route or a remembered figure.' } };
  return { ok: true, record: shape(from, to, r) };
}

export async function routesFrom(fromQ, limit) {
  if (!fromQ) return { ok: false, status: 400, body: { error: 'missing_parameter', hint: 'from is required. Example: /v1/routes?from=PAR' } };
  const from = await resolvePlace(fromQ);
  if (!from) return { ok: false, status: 404, body: { error: 'unknown_origin', from: String(fromQ), hint: `Covered codes: ${S}/v1/cities` } };
  const { byIata } = await loadCities(fetch);
  const all = await loadRoutes(fetch, from.iata);
  if (!all.length) return { ok: false, status: 404, body: { error: 'no_data', from: from.iata, hint: 'This origin has not been scanned.' } };
  const n = Math.max(1, Math.min(200, Number(limit) || 40));
  const routes = all.slice(0, n).map(r => {
    const to = byIata.get(r.to) || { iata: r.to, name: r.to, country: '' };
    const u = pageUrls(from, to);
    return {
      to: to.iata,
      to_name: to.name,
      to_country: to.country || null,
      price: Math.round(r.price),
      currency: r.currency || 'EUR',
      six_month_low: r.low == null ? null : Math.round(r.low),
      best_depart_date: r.depart || null,
      html_url: u.html,
      md_url: u.md,
    };
  });
  return {
    ok: true,
    body: {
      from: from.iata,
      from_name: from.name,
      count: routes.length,
      total_scanned: all.length,
      currency_note: 'Currency is per route and is not converted.',
      freshness: 'cached_snapshot',
      license: `${S}/license.xml`,
      routes,
    },
  };
}

export async function citiesList(q) {
  const { byIata } = await loadCities(fetch);
  const needle = String(q == null ? '' : q).trim().toLowerCase();
  const cities = [];
  for (const c of byIata.values()) {
    if (needle && !(c.iata.toLowerCase().includes(needle) || String(c.name).toLowerCase().includes(needle))) continue;
    cities.push({ iata: c.iata, name: c.name, country: c.country || null, slug: slug(c.name) || slug(c.iata) });
    if (cities.length >= 4000) break;
  }
  cities.sort((a, b) => a.iata < b.iata ? -1 : a.iata > b.iata ? 1 : 0);
  return { count: cities.length, note: 'Send iata as from/to. A slug also resolves.', cities };
}

// ── MCP tool server (streamable-http, JSON-RPC 2.0) ────────────────────────
// Tool descriptions are PROMPTS. They state what the tool answers and the
// argument rules that prevent wrong calls.
const TOOLS = [
  {
    name: 'find_cheapest_fare',
    title: 'Cheapest fare between two cities',
    description: 'Returns the cheapest observed one-way fare between two cities, plus the six-month low and the departure date on which the low was observed. Use whenever the user names an origin and a destination and asks about price, the cheapest date to fly, or whether a fare is a good deal. Both arguments are required; neither alone produces a valid answer. Answers are directional and per pair - PAR to BKK is not BKK to PAR and is not PAR to SIN. Prices are cached snapshots, never live quotes: say "last observed", never "current price", and surface live_check_url to any user about to book.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Origin city. Uppercase IATA city code such as PAR. A city slug such as paris also resolves. If you cannot resolve the city, call resolve_city first - do not guess a code.' },
        to: { type: 'string', description: 'Destination city. Uppercase IATA city code such as BKK. Must differ from from.' },
      },
      required: ['from', 'to'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_routes_from',
    title: 'Cheapest destinations from one city',
    description: 'Returns destinations reachable from one origin, sorted cheapest first. Use when the user asks where they can fly cheaply from a city, or wants inspiration rather than one specific pair. One call replaces dozens of page fetches. Prices are cached snapshots.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Origin city. Uppercase IATA city code such as LON.' },
        limit: { type: 'integer', description: 'How many destinations to return, 1-200. Default 40.', minimum: 1, maximum: 200 },
      },
      required: ['from'],
      additionalProperties: false,
    },
  },
  {
    name: 'resolve_city',
    title: 'Resolve a city name to its IATA code',
    description: 'Turns a spoken city name into the uppercase IATA city code the other tools expect. Call this before find_cheapest_fare whenever you are not certain of a code. Do not invent codes.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'City name or partial name, e.g. "sao paulo".' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
];

const rpc = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcErr = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

function toolResult(obj, isError) {
  return {
    content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }],
    structuredContent: obj,
    isError: !!isError,
  };
}

async function callTool(name, args) {
  const a = args || {};
  if (name === 'find_cheapest_fare') {
    const r = await fareRecord(a.from, a.to);
    return r.ok ? toolResult(r.record) : toolResult(r.body, true);
  }
  if (name === 'list_routes_from') {
    const r = await routesFrom(a.from, a.limit);
    return r.ok ? toolResult(r.body) : toolResult(r.body, true);
  }
  if (name === 'resolve_city') {
    const hit = await resolvePlace(a.query);
    if (hit) return toolResult({ query: String(a.query || ''), iata: hit.iata, name: hit.name, country: hit.country || null, resolved: true });
    const list = await citiesList(a.query);
    return toolResult({ query: String(a.query || ''), resolved: false, candidates: list.cities.slice(0, 10), hint: 'No exact match. Pick a candidate or ask the user which city they mean. Do not guess a code.' }, true);
  }
  return toolResult({ error: 'unknown_tool', name }, true);
}

async function mcpHandler(request) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return new Response(JSON.stringify({
      name: ID.mcpName,
      transport: 'streamable-http',
      hint: 'POST JSON-RPC 2.0 here. Server card: ' + S + '/.well-known/mcp.json',
    }, null, 2), { status: 405, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', allow: 'POST, OPTIONS' }, CORS) });
  }
  let body;
  try { body = await request.json(); } catch (_) {
    return new Response(JSON.stringify(rpcErr(null, -32700, 'Parse error')), { status: 400, headers: Object.assign({ 'content-type': 'application/json' }, CORS) });
  }

  const one = async (msg) => {
    const { id, method, params } = msg || {};
    if (method === 'initialize') {
      return rpc(id, {
        protocolVersion: (params && params.protocolVersion) || '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: ID.mcpName, title: ID.brand + ' flight fares', version: ID.version },
        instructions: 'Cheapest observed flight fares between cities. Prices are cached snapshots, never live quotes - present them as last observed and link the user to live_check_url before they book. Full brief: ' + S + '/llms-full.txt',
      });
    }
    if (method === 'ping') return rpc(id, {});
    if (method === 'tools/list') return rpc(id, { tools: TOOLS });
    if (method === 'resources/list') return rpc(id, { resources: [] });
    if (method === 'prompts/list') return rpc(id, { prompts: [] });
    if (method === 'tools/call') {
      const nm = params && params.name;
      try { return rpc(id, await callTool(nm, params && params.arguments)); }
      catch (e) { return rpc(id, toolResult({ error: 'tool_failed', name: nm, detail: String(e && e.message || e) }, true)); }
    }
    if (typeof method === 'string' && method.startsWith('notifications/')) return null;
    return rpcErr(id === undefined ? null : id, -32601, 'Method not found: ' + method);
  };

  const hdr = Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'mcp-session-id': 'stateless' }, CORS, RL);

  if (Array.isArray(body)) {
    const outs = [];
    for (const m of body) { const r = await one(m); if (r) outs.push(r); }
    if (!outs.length) return new Response(null, { status: 202, headers: CORS });
    return new Response(JSON.stringify(outs), { headers: hdr });
  }
  const r = await one(body);
  if (!r) return new Response(null, { status: 202, headers: CORS });
  return new Response(JSON.stringify(r), { headers: hdr });
}

// ── status ─────────────────────────────────────────────────────────────────
async function statusJson() {
  let deploy = null;
  try {
    const r = await fetch(`${S}/version.json`, { cf: { cacheTtl: 60 } });
    if (r.ok) deploy = await r.json();
  } catch (_) { /* status must never fail because a probe failed */ }
  let citiesOk = false;
  try { const { byIata } = await loadCities(fetch); citiesOk = byIata.size > 0; } catch (_) { }
  return jres({
    ok: true,
    service: ID.brand,
    version: ID.version,
    freshness: 'cached_snapshot',
    endpoints: {
      fare: `${S}/v1/fare?from=PAR&to=BKK`,
      routes: `${S}/v1/routes?from=PAR`,
      cities: `${S}/v1/cities`,
      mcp: `${S}/mcp`,
      docs: `${S}/llms-full.txt`,
    },
    checks: { cities_dataset: citiesOk },
    deploy,
  });
}

// ── router ─────────────────────────────────────────────────────────────────
export async function apiRoute(p, url, request) {
  if (p === '/mcp') return mcpHandler(request);
  if (p === '/status.json') return statusJson();

  if (p === '/v1/health') {
    return jres({ ok: true, service: ID.brand, version: ID.version, freshness: 'cached_snapshot' });
  }
  if (p === '/v1/fare') {
    const r = await fareRecord(url.searchParams.get('from'), url.searchParams.get('to'));
    return r.ok ? jres(r.record) : jres(r.body, r.status);
  }
  if (p === '/v1/routes') {
    const r = await routesFrom(url.searchParams.get('from'), url.searchParams.get('limit'));
    return r.ok ? jres(r.body) : jres(r.body, r.status);
  }
  if (p === '/v1/cities') {
    return jres(await citiesList(url.searchParams.get('q')));
  }
  if (p === '/v1' || p === '/v1/') {
    return jres({
      service: ID.brand,
      question: 'What is the cheapest observed fare between two cities?',
      openapi: `${S}/openapi.json`,
      endpoints: ['/v1/fare?from=PAR&to=BKK', '/v1/routes?from=PAR', '/v1/cities', '/v1/health'],
      tools: `${S}/mcp`,
      docs: `${S}/llms-full.txt`,
      license: `${S}/license.xml`,
    });
  }
  return null;
}
