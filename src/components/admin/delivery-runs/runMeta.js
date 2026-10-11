/** Shared labels / colours for DR delivery runs (admin board, print, rider panel). */

export const RUN_STATUS_META = {
  open: { label: "Open", color: "blue", hint: "No rider yet" },
  assigned: { label: "Assigned", color: "gold", hint: "Rider set, not dispatched" },
  out_for_delivery: { label: "Out for delivery", color: "cyan", hint: "With the rider" },
  completed: { label: "Back - close it", color: "purple", hint: "All parcels done, cash not checked" },
  closed: { label: "Closed", color: "green", hint: "Reconciled" },
  cancelled: { label: "Cancelled", color: "default", hint: "Cancelled before dispatch" },
};

export const ITEM_STATUS_META = {
  queued: { label: "Queued", color: "default" },
  out_for_delivery: { label: "On the road", color: "cyan" },
  delivered: { label: "Delivered", color: "green" },
  failed: { label: "Failed", color: "red" },
  removed: { label: "Removed", color: "default" },
};

export const OUTCOME_META = {
  reattempt: { label: "Re-delivery", color: "orange" },
  returned: { label: "Return to merchant", color: "magenta" },
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

export function areaOf(row) {
  return (row?.area || row?.receiver_area || row?.receiver_city || "").trim() || "No area";
}
