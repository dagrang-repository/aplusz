// /flights/<from>-to-<to>  →  301  /en/flights/<from>-to-<to>
import { CONFIG } from '../_lib/config.js';
export function onRequestGet(context) {
  const { route } = context.params;
  return Response.redirect(`${CONFIG.SITE}/en/flights/${route}`, 301);
}
