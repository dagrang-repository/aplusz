// functions/mf/signup.js — Cloudflare Pages Function
// Called by mf-track.js when a referred visitor SAVES A ROUTE. A saved route is the paid
// "action" (the sign-up slot in the Marketing Foundation model). memberId = the anonymous
// visitor id (vid cookie). The worker holds it and pays the promoter only if the visitor is
// still active at day 3 (activity pings below) — never a penalty if not.
export async function onRequestPost(context) {
  const { request, env } = context;
  const PF = (env.PF_WORKER_URL || "").replace(/\/$/, "");
  const SEC = env.PF_SHARED_SECRET || "";
  const gate = readCookie(request, "vref");
  const memberId = readCookie(request, "vid") || ("a_" + (request.headers.get("cf-connecting-ip") || "na"));
  if (PF && SEC && gate) {
    context.waitUntil(fetch(PF + "/veliane/signup", {
      method: "POST",
      headers: { "content-type": "application/json", "x-veliane-secret": SEC },
      body: JSON.stringify({ gate, memberId }),
    }).catch(() => {}));
  }
  return new Response(null, { status: 204 });
}
function readCookie(request, name) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]).trim().slice(0, 80) : "";
}
