// verdict.js — pure fare-verdict logic. No I/O, no deps. Easy to unit-test.

// Map a price's historical percentile (0..1) to a verdict band.
// Returns the tier-paired label + a colour the UI badge can use.
export function classify(pctile) {
  if (pctile == null) return { band: "unknown",   label: "Building history", color: "gray"  };
  if (pctile <= 0.33)  return { band: "cheap",     label: "Cheap",            color: "green" };
  if (pctile <= 0.66)  return { band: "fair",      label: "Fair",             color: "amber" };
  return                       { band: "expensive", label: "Expensive",        color: "red"   };
}

// Buy-or-wait signal from the price's percentile + recent direction.
// pctile <= 0.5  -> cheaper half of this route's history -> buy.
// otherwise rising -> buy (unlikely to drop); else wait.
export function buySignal({ pctile, trend }) {
  if (pctile == null)   return { action: "unknown", reason: "not enough history yet" };
  if (pctile <= 0.5)    return { action: "buy",     reason: "in the cheaper half of this route's history" };
  if (trend === "rising") return { action: "buy",   reason: "pricier than usual and climbing" };
  return                        { action: "wait",   reason: "pricier than usual; may dip" };
}
