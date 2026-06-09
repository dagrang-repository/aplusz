// functions/mf/activity.js — Cloudflare Pages Function
// Called by mf-track.js on a return visit (once/day) for referred visitors. Tells the
// Marketing Foundation worker this visitor is still active, so a pending "saved route"
// action stays eligible for the day-3 payout. Idempotent by memberId on the worker side.
export async function onRequestPost(context) {
  const { request, env } = context;
  const PF = (env.PF_WORKER_URL || "").replace(/\/$/, "");
  const SEC = env.PF_SHARED_SECRET || "";
  const memberId = readCookie(request, "vid");
  if (PF && SEC && memberId) {
    context.waitUntil(fetch(PF + "/veliane/activity", {
      method: "POST",
      headers: { "content-type": "application/json", "x-veliane-secret": SEC },
      body: JSON.stringify({ memberId }),
    }).catch(() => {}));
  }
  return new Response(null, { status: 204 });
}
function readCookie(request, name) {
  const m = (request.headers.get("cookie") || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]).trim().slice(0, 80) : "";
}
