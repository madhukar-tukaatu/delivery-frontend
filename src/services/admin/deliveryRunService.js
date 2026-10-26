import api from "@/lib/api";

/**
 * DR delivery runs (last-mile containers, like PR pickups and TR transfers).
 * Admin / branch manager: /admin/deliveries/runs/*  (deliveries.view / deliveries.assign)
 * Rider:                  /staff/deliveries/runs/*  (deliveries.view / deliveries.status)
 */

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

function scoped(params = {}, branchId = null) {
  const out = { ...params };
  if (branchId) out.branch_id = branchId;
  return out;
}

/** Laravel validation / API error -> one readable line. */
export function runErrorText(error, fallback = "Request failed") {
  const data = error?.response?.data;
  const errors = data?.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors).flat().find(Boolean);
    if (first) return String(first);
  }
  return data?.message || error?.message || fallback;
}

export async function getDeliveryRuns(params = {}, branchId = null) {
  const response = await api.get("/admin/deliveries/runs", { params: scoped({ per_page: 15, ...params }, branchId) });
  const payload = unwrap(response) ?? {};
  return {
    list: Array.isArray(payload?.data) ? payload.data : [],
    total: Number(payload?.total ?? 0),
    currentPage: Number(payload?.current_page ?? params.page ?? 1),
    pageSize: Number(payload?.per_page ?? 15),
  };
}

export async function getDeliveryRunStats(branchId = null) {
  const response = await api.get("/admin/deliveries/runs/stats", { params: scoped({}, branchId) });
  return unwrap(response) ?? {};
}

export async function getReadyForDelivery(params = {}, branchId = null) {
  const response = await api.get("/admin/deliveries/runs/ready", { params: scoped(params, branchId) });
  const payload = unwrap(response);
  return Array.isArray(payload) ? payload : [];
}

export async function getRunRiders(params = {}, branchId = null) {
  const response = await api.get("/admin/deliveries/runs/riders", { params: scoped(params, branchId) });
  const payload = unwrap(response);
  return Array.isArray(payload) ? payload : [];
}

/**
 * Un-started runs (open/assigned) the given parcels could join, best route match
 * first (shared area / coverage, or within ~2 km of a stop), plus riders on the road.
 */
export async function suggestDeliveryRuns(shipmentIds = [], branchId = null) {
  const response = await api.get("/admin/deliveries/runs/suggest", { params: scoped({ shipment_ids: shipmentIds }, branchId) });
  const payload = unwrap(response) ?? {};
  return {
    branchId: payload.branch_id ?? null,
    runs: Array.isArray(payload.runs) ? payload.runs : [],
    onRoad: Array.isArray(payload.on_road) ? payload.on_road : [],
  };
}

export async function lookupDeliveryRun(code, branchId = null) {
  const response = await api.get("/admin/deliveries/runs/lookup", { params: scoped({ code }, branchId) });
  return unwrap(response);
}

export async function getDeliveryRun(id, branchId = null) {
  if (!id) throw new Error("Run ID is required.");
  const response = await api.get(`/admin/deliveries/runs/${id}`, { params: scoped({}, branchId) });
  return unwrap(response);
}

/**
 * POST /admin/deliveries/runs { shipment_ids, rider_user_id?, vehicle_type?, vehicle_number?, notes?, run_mode? }
 * run_mode: auto (default: join the rider's un-started run) | existing | new (explicit second run).
 * A merged result has data.merged = true, data.run = the rider's run, data.off_route = tracking numbers.
 */
export async function createDeliveryRun(payload, branchId = null) {
  const response = await api.post("/admin/deliveries/runs", scoped(payload, branchId));
  return { data: unwrap(response), message: response?.data?.message };
}

export async function addRunItems(id, shipmentIds, branchId = null) {
  const response = await api.post(`/admin/deliveries/runs/${id}/items`, scoped({ shipment_ids: shipmentIds }, branchId));
  return { data: unwrap(response), message: response?.data?.message };
}

export async function removeRunItems(id, shipmentIds, reason = null, branchId = null) {
  const response = await api.post(`/admin/deliveries/runs/${id}/items/remove`, scoped({ shipment_ids: shipmentIds, reason }, branchId));
  return { data: unwrap(response), message: response?.data?.message };
}

/** payload: { rider_user_id, vehicle_type?, vehicle_number?, allow_second_run? } */
export async function assignRunRider(id, payload, branchId = null) {
  const response = await api.post(`/admin/deliveries/runs/${id}/rider`, scoped(payload, branchId));
  return { data: unwrap(response), message: response?.data?.message };
}

export async function sequenceRun(id, itemIds = null, branchId = null) {
  const response = await api.post(`/admin/deliveries/runs/${id}/sequence`, scoped(itemIds ? { item_ids: itemIds } : {}, branchId));
  return { data: unwrap(response), message: response?.data?.message };
}

export async function dispatchRun(id, payload = {}, branchId = null) {
  const response = await api.post(`/admin/deliveries/runs/${id}/dispatch`, scoped(payload, branchId));
  return { data: unwrap(response), message: response?.data?.message };
}

/** POST close { cash_received, deposit_cash, default_action, items:[{item_id, action, reason}], notes } */
export async function closeRun(id, payload, branchId = null) {
  const response = await api.post(`/admin/deliveries/runs/${id}/close`, scoped(payload, branchId));
  return { data: unwrap(response), message: response?.data?.message };
}

export async function cancelRun(id, reason = null, branchId = null) {
  const response = await api.post(`/admin/deliveries/runs/${id}/cancel`, scoped({ reason }, branchId));
  return { data: unwrap(response), message: response?.data?.message };
}

/* ------------------------------ rider ------------------------------ */

export async function staffGetRuns() {
  const response = await api.get("/staff/deliveries/runs");
  const payload = unwrap(response) ?? {};
  return {
    active: Array.isArray(payload.active) ? payload.active : [],
    recent: Array.isArray(payload.recent) ? payload.recent : [],
  };
}

export async function staffStartRun(id) {
  const response = await api.post(`/staff/deliveries/runs/${id}/start`);
  return { data: unwrap(response), message: response?.data?.message };
}

/** Rider bags one parcel at the warehouse: { item_id } or { code } (tracking number). */
export async function staffBagRun(id, payload) {
  const response = await api.post(`/staff/deliveries/runs/${id}/bag`, payload);
  return { data: unwrap(response), message: response?.data?.message };
}

export async function staffUnbagRun(id, itemId) {
  const response = await api.post(`/staff/deliveries/runs/${id}/unbag`, { item_id: itemId });
  return { data: unwrap(response), message: response?.data?.message };
}

/** Parcel not found at the warehouse: leaves the run, back to the branch queue. */
export async function staffMissingRun(id, itemId, note = null) {
  const response = await api.post(`/staff/deliveries/runs/${id}/missing`, { item_id: itemId, note });
  return { data: unwrap(response), message: response?.data?.message };
}

/** Rider finishes the run once every stop is delivered or failed. */
export async function staffFinishRun(id) {
  const response = await api.post(`/staff/deliveries/runs/${id}/finish`);
  return { data: unwrap(response), message: response?.data?.message };
}
