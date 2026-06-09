// functions/mf/click.js — Cloudflare Pages Function
// Called by mf-track.js when a referred visitor clicks a Travelpayouts outbound link
// (marker 531148). Forwards the click to the Marketing Foundation worker with the shared
// secret (kept server-side, never exposed to the page). 1 unique click per visitor per day.
export async function onRequestPost(context) {
  const { request, env } = context;
  const PF = (env.PF_WORKER_URL || "").replace(/\/$/, "");
  const SEC = env.PF_SHARED_SECRET || "";
  const gate = readCookie(request, "vref");                 // the promoter code the visitor arrived with
  if (PF && SEC && gate) {
    let src = "";
    try { src = ((await request.json()).src || "").toString().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32); } catch (_) {}
    const ip = request.headers.get("cf-connecting-ip") || "na";
    const cf = request.cf || {};
    const id = `${gate}:${ip}:${new Date().toISOString().slice(0, 10)}`;   // same visitor + same day = 1
    context.waitUntil(fetch(PF + "/owned/click", {
      method: "POST",
      headers: { "content-type": "application/json", "x-veliane-secret": SEC },
      body: JSON.stringify({ gate, id, ip, src, geo: { country: cf.country, region: cf.region, city: cf.city } }),
    }).catch(() => {}));
  }
  return new Response(null, { status: 204 });
}
function readCookie(request, name) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]).trim().slice(0, 64) : "";
}
