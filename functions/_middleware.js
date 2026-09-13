// ── AplusZ · agent layer · single insertion point ──────────────────────────
// Runs ahead of every Pages Function route. Early-returns for the machine
// surface, otherwise hands straight back to the existing handlers and only
// decorates the response headers.
//
// Nothing here changes an existing route's body or status.

import { agentRoute, CORS, ID } from './_lib/agent-files.js';
import { apiRoute } from './_lib/agent-api.js';
import { mdRoute, mdUrlFor } from './_lib/agent-md.js';

const S = ID.site;

const PREFLIGHT = /^\/(v1|mcp|\.well-known|llms|openapi\.json|status\.json|agents\.json|agent-permissions\.json|license\.xml|ai\.txt|tdmrep\.json|opensearch\.xml)/;

function decorate(res, p) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('text/html')) return res;
  const h = new Headers(res.headers);
  const links = [
    `<${S}/llms.txt>; rel="describedby"; type="text/markdown"; title="Site index for LLMs"`,
    `<${S}/license.xml>; rel="license"; type="application/rsl+xml"`,
    `<${S}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
  ];
  const alt = mdUrlFor(p);
  if (alt) links.push(`<${alt}>; rel="alternate"; type="text/markdown"`);
  h.set('link', links.join(', '));
  h.set('x-robots-tag', 'max-snippet:-1, max-image-preview:large, max-video-preview:-1');
  h.set('vary', 'Accept, Accept-Language');
  h.set('content-signal', 'search=yes, ai-input=yes, ai-train=yes');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  let p = url.pathname;
  if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '');

  if (request.method === 'OPTIONS' && (PREFLIGHT.test(p) || p.endsWith('.md'))) {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    let r = await agentRoute(p);
    if (!r) r = await apiRoute(p, url, request);
    if (!r) r = await mdRoute(p, url, request);
    if (r) return r;
  } catch (e) {
    // The agent layer must never take the site down with it.
    if (PREFLIGHT.test(p) || p.endsWith('.md')) {
      return new Response(JSON.stringify({ error: 'agent_layer_error', detail: String(e && e.message || e) }, null, 2),
        { status: 500, headers: Object.assign({ 'content-type': 'application/json' }, CORS) });
    }
  }

  return decorate(await next(), p);
}
