// Route page:  /<lang>/flights/<from>-to-<to>     e.g. /fr/flights/paris-to-bangkok
import { CONFIG } from '../../_lib/config.js';
import { loadCities, loadRoutes } from '../../_lib/data.js';
import { buildRoutePage } from '../../_lib/page.js';

const notFound = () => new Response('Not found', { status: 404 });

export async function onRequestGet(context) {
  const { lang, route } = context.params;
  if (!CONFIG.LANGS.includes(lang)) return notFound();

  const parts = String(route).toLowerCase().split('-to-');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return notFound();

  const { byIata, bySlug } = await loadCities(fetch);
  const fromIata = bySlug.get(parts[0]);
  const toIata = bySlug.get(parts[1]);
  if (!fromIata || !toIata || fromIata === toIata) return notFound();

  const routes = await loadRoutes(fetch, fromIata);
  const r = routes.find(x => x.to === toIata);
  if (!r) return notFound();

  const from = byIata.get(fromIata) || { iata: fromIata, name: fromIata };
  const to = byIata.get(toIata) || { iata: toIata, name: toIata };
  const related = routes.filter(x => x.to !== toIata).slice(0, 6)
    .map(x => byIata.get(x.to) || { iata: x.to, name: x.to });

  const html = buildRoutePage({ lang, from, to, route: r, related });
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
