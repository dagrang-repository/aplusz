// routes.js — self-contained fare-intelligence routes for apluszworker.
// Mount in your existing fetch handler with ONE line (see MOUNT.md):
//   const fr = await fareRoutes(request, env); if (fr) return fr;
// Returns a Response when it handles the path, else null (host worker falls through).
//
// Bindings required:  env.FARES_DB  (D1)   env.UPLOAD_KEY  (your existing secret)

import { classify, buySignal } from "./verdict.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });

export async function fareRoutes(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const db = env.FARES_DB;

  // ---- Ingest (server-side only): change-only write, auth-gated ----
  if (path === "/fare" && request.method === "POST") {
    if (request.headers.get("x-upload-key") !== env.UPLOAD_KEY)
      return json({ error: "unauthorized" }, 401);

    let f;
    try { f = await request.json(); } catch { return json({ error: "bad json" }, 400); }

    const origin = f.origin, dest = f.dest, depart_date = f.depart_date;
    if (!origin || !dest || !depart_date || f.price == null)
      return json({ error: "missing origin/dest/depart_date/price" }, 400);

    const ret   = f.return_date ?? null;
    const cur   = f.currency ?? "EUR";
    const src   = f.source ?? "crawler";
    const price = Math.round(Number(f.price)); // minor units (cents)
    if (!Number.isFinite(price)) return json({ error: "price not numeric" }, 400);

    // Hash gate: insert only when newest stored price for this exact route differs.
    const last = await db
      .prepare(
        `SELECT price FROM fares
          WHERE origin=?1 AND dest=?2 AND depart_date=?3 AND return_date IS ?4
          ORDER BY found_at DESC LIMIT 1`
      )
      .bind(origin, dest, depart_date, ret)
      .first();

    if (last && Number(last.price) === price)
      return json({ stored: false, reason: "unchanged" });

    await db
      .prepare(
        `INSERT INTO fares (origin,dest,depart_date,return_date,price,currency,source)
         VALUES (?1,?2,?3,?4,?5,?6,?7)`
      )
      .bind(origin, dest, depart_date, ret, price, cur, src)
      .run();

    return json({ stored: true });
  }

  // ---- History time-series (Pro) ----
  if (path === "/history" && request.method === "GET") {
    const o = url.searchParams.get("o"),
          d = url.searchParams.get("d"),
          depart = url.searchParams.get("depart");
    if (!o || !d || !depart) return json({ error: "need o,d,depart" }, 400);

    const win = clampInt(url.searchParams.get("window"), 7, 0, 30);
    const { lo, hi } = dateWindow(depart, win);

    const rows = await db
      .prepare(
        `SELECT price, currency, found_at FROM fares
          WHERE origin=?1 AND dest=?2 AND depart_date BETWEEN ?3 AND ?4
            AND found_at >= date('now','-365 days')
          ORDER BY found_at ASC`
      )
      .bind(o, d, lo, hi)
      .all();

    return json({ origin: o, dest: d, depart, points: rows.results ?? [] });
  }

  // ---- Verdict: cheap/fair/expensive + buy/wait (Pro / Pro+) ----
  if (path === "/verdict" && request.method === "GET") {
    const o = url.searchParams.get("o"),
          d = url.searchParams.get("d"),
          depart = url.searchParams.get("depart"),
          price = Math.round(Number(url.searchParams.get("price")));
    if (!o || !d || !depart || !Number.isFinite(price))
      return json({ error: "need o,d,depart,price" }, 400);

    const win = clampInt(url.searchParams.get("window"), 7, 0, 30);
    const { lo, hi } = dateWindow(depart, win);

    const agg = await db
      .prepare(
        `SELECT COUNT(*) n, MIN(price) min, MAX(price) max, AVG(price) avg,
                SUM(CASE WHEN price <= ?5 THEN 1 ELSE 0 END) below
           FROM fares
          WHERE origin=?1 AND dest=?2 AND depart_date BETWEEN ?3 AND ?4
            AND found_at >= date('now','-365 days')`
      )
      .bind(o, d, lo, hi, price)
      .first();

    const n = Number(agg?.n ?? 0);
    const pctile = n > 0 ? Number(agg.below) / n : null;

    // Recent direction from the last 5 snapshots (newest first).
    const recent = await db
      .prepare(
        `SELECT price FROM fares
          WHERE origin=?1 AND dest=?2 AND depart_date BETWEEN ?3 AND ?4
          ORDER BY found_at DESC LIMIT 5`
      )
      .bind(o, d, lo, hi)
      .all();
    const trend = trendOf((recent.results ?? []).map((r) => Number(r.price)));

    return json({
      origin: o, dest: d, depart, price, samples: n,
      verdict: classify(pctile),
      pctile,
      stats: n ? { min: agg.min, max: agg.max, avg: Math.round(agg.avg) } : null,
      buy: buySignal({ pctile, trend }),
      trend,
    });
  }

  return null; // not ours — let the host worker handle it
}

// ---------- helpers ----------
function clampInt(v, dflt, lo, hi) {
  const n = parseInt(v ?? "", 10);
  if (Number.isNaN(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
}

function dateWindow(depart, win) {
  const base = new Date(depart + "T00:00:00Z");
  const lo = new Date(base); lo.setUTCDate(lo.getUTCDate() - win);
  const hi = new Date(base); hi.setUTCDate(hi.getUTCDate() + win);
  const fmt = (x) => x.toISOString().slice(0, 10);
  return { lo: fmt(lo), hi: fmt(hi) };
}

// recent[0] = newest. >2% up = rising, >2% down = falling, else flat.
function trendOf(recentNewestFirst) {
  if (recentNewestFirst.length < 2) return "flat";
  const newest = recentNewestFirst[0];
  const oldest = recentNewestFirst[recentNewestFirst.length - 1];
  if (!oldest) return "flat";
  const chg = (newest - oldest) / oldest;
  if (chg > 0.02) return "rising";
  if (chg < -0.02) return "falling";
  return "flat";
}
