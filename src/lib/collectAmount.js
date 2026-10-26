/**
 * Amount the rider collects at the door. Same rule as the shipment drawer and
 * the backend Shipment::collect_amount: POD collects pod_amount (the order
 * total, delivery already included when the customer pays it); the stored
 * total collectable is only a fallback. Prepaid collects nothing.
 */
export function collectAmount(shipment = {}) {
  const s = shipment || {};
  if (s.collect_amount != null && s.collect_amount !== "") {
    const n = Number(s.collect_amount);
    if (!Number.isNaN(n)) return n;
  }
  const type = String(s.payment_type ?? s.payment_method ?? "").toLowerCase();
  if (!["pod", "cod", "to_pay"].includes(type)) return 0;
  for (const v of [s.pod_amount, s.total_collectable_amount, s.total_collectable]) {
    const n = Number(v);
    if (n > 0) return Math.round(n * 100) / 100;
  }
  return 0;
}
