// functions/r/[code].js  — Cloudflare Pages Function
// Referral landing. A promoter shares https://aplusz.app/r/THEIRCODE
// This sets the vref (+ optional vsrc) cookie that all attribution rides on, then sends
// the visitor to the app home. NO click is counted here — a click only counts when the
// visitor later clicks a Travelpayouts outbound link (marker 531148), handled in mf-track.js.
export async function onRequestGet(context) {
  const { params, request } = context;
  const code = (params.code || "").toString().trim().slice(0, 64);
  const u = new URL(request.url);
  const src = (u.searchParams.get("src") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);

  const headers = new Headers({ Location: "/" });
  if (code) {
    // Domain=aplusz.app => valid on apex + www + api.aplusz.app (survives any host switch at checkout).
    headers.append("Set-Cookie", `vref=${code}; Domain=aplusz.app; Path=/; Max-Age=7776000; SameSite=Lax; Secure`);
    if (src) headers.append("Set-Cookie", `vsrc=${src}; Domain=aplusz.app; Path=/; Max-Age=7776000; SameSite=Lax; Secure`);
  }
  return new Response(null, { status: 302, headers });
}
