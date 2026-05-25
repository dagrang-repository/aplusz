// /<lang>/about
import { CONFIG } from '../_lib/config.js';
import { buildAboutPage } from '../_lib/pages.js';

export async function onRequestGet(context) {
  const { lang } = context.params;
  if (!CONFIG.LANGS.includes(lang)) return new Response('Not found', { status: 404 });
  return new Response(buildAboutPage(lang), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=86400' },
  });
}
