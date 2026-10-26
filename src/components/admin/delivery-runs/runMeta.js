/** Shared labels / colours for DR delivery runs (admin board, print, rider panel). */

export const RUN_STATUS_META = {
  open: { label: "Open", color: "blue", hint: "No rider yet" },
  assigned: { label: "Collecting", color: "gold", hint: "Rider is collecting and bagging parcels" },
  out_for_delivery: { label: "Out for delivery", color: "cyan", hint: "With the rider" },
  completed: { label: "Back - close it", color: "purple", hint: "All parcels done, cash not checked" },
  closed: { label: "Closed", color: "green", hint: "Reconciled" },
  cancelled: { label: "Cancelled", color: "default", hint: "Cancelled before the run started" },
};

export const ITEM_STATUS_META = {
  queued: { label: "To bag", color: "default" },
  bagged: { label: "Bagged", color: "geekblue" },
  out_for_delivery: { label: "On the road", color: "cyan" },
  delivered: { label: "Delivered", color: "green" },
  failed: { label: "Failed", color: "red" },
  removed: { label: "Removed", color: "default" },
};

export const OUTCOME_META = {
  reattempt: { label: "Re-delivery", color: "orange" },
  returned: { label: "Return to merchant", color: "magenta" },
  missing: { label: "Missing at warehouse", color: "volcano" },
};

export const VEHICLE_OPTIONS = [
  { value: "bike", label: "Bike" },
  { value: "scooter", label: "Scooter" },
  { value: "cycle", label: "Cycle" },
  { value: "van", label: "Van" },
  { value: "pickup", label: "Pickup" },
  { value: "on_foot", label: "On foot" },
  { value: "other", label: "Other" },
];

export function vehicleText(type, number) {
  const label = VEHICLE_OPTIONS.find((v) => v.value === type)?.label || (type ? String(type) : "");
  return [label, number].filter(Boolean).join(" · ");
}

export function rs(value) {
  const n = Number(value || 0);
  return `Rs ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

/** Display-only area guess from an address: the locality before "Kathmandu-31" style ward tokens. */
export function areaFromAddress(address) {
  const parts = String(address || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  const skip = /\b(marg|marga|galli|gali|road|rd|street|sadak|path|lane|nepal|province|pradesh|metropolitan|municipality|district)\b|\d/i;
  const ward = parts.findIndex((p) => /^[A-Za-z .]+-\s*\d{1,2}$/.test(p));
  const candidates = ward >= 0 ? parts.slice(0, ward).reverse() : parts;
  const hit = candidates.find((p) => p.length >= 3 && p.length <= 40 && !skip.test(p));
  if (hit) return hit;
  return ward >= 0 ? parts[ward].replace(/-\s*\d{1,2}$/, "").trim() : "";
}

export function areaOf(row) {
  return (
    (row?.area || row?.receiver_area || row?.receiver_city || "").trim() ||
    areaFromAddress(row?.delivery_address || row?.address) ||
    "No area"
  );
}

/** Bagging progress of a run that is still collecting at the warehouse. */
export function bagProgress(run) {
  const items = (run?.items || []).filter((i) => i.status !== "removed");
  const bagged = run?.bagged_count ?? items.filter((i) => i.status === "bagged").length;
  const total = items.length || Number(run?.expected_count) || 0;
  return { bagged, total, done: total > 0 && bagged >= total };
}
