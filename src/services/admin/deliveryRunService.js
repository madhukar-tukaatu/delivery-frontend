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

export async function lookupDeliveryRun(code, branchId = null) {
  const response = await api.get("/admin/deliveries/runs/lookup", { params: scoped({ code }, branchId) });
  return unwrap(response);
}

export async function getDeliveryRun(id, branchId = null) {
  if (!id) throw new Error("Run ID is required.");
  const response = await api.get(`/admin/deliveries/runs/${id}`, { params: scoped({}, branchId) });
  return unwrap(response);
}

/** POST /admin/deliveries/runs { shipment_ids, rider_user_id?, vehicle_type?, vehicle_number?, notes?, dispatch_now? } */
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
