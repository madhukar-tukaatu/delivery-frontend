import api from "@/lib/api";

/**
 * PR pickup runs (first-mile containers grouping merchant pickups).
 * Admin / branch manager: /admin/pickups/runs/*
 * Rider:                  /staff/pickups/runs/*
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

export async function getPickupRuns(params = {}, branchId = null) {
  const response = await api.get("/admin/pickups/runs", { params: scoped({ per_page: 15, ...params }, branchId) });
  const payload = unwrap(response) ?? {};
  return {
    list: Array.isArray(payload?.data) ? payload.data : [],
    total: Number(payload?.total ?? 0),
    currentPage: Number(payload?.current_page ?? params.page ?? 1),
    pageSize: Number(payload?.per_page ?? 15),
  };
}

export async function getPickupRunStats(branchId = null) {
  const response = await api.get("/admin/pickups/runs/stats", { params: scoped({}, branchId) });
  return unwrap(response) ?? {};
}

export async function getReadyForPickup(params = {}, branchId = null) {
  const response = await api.get("/admin/pickups/runs/ready", { params: scoped(params, branchId) });
  const payload = unwrap(response);
  return Array.isArray(payload) ? payload : [];
}

export async function getPickupRunRiders(params = {}, branchId = null) {
  try {
    const response = await api.get("/admin/pickups/runs/riders", { params: scoped(params, branchId) });
    const payload = unwrap(response);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.riders)) return payload.riders;
    if (Array.isArray(payload?.staff)) return payload.staff;
  } catch (e) {
    console.warn("getPickupRunRiders direct fetch failed, falling back:", e);
  }

  // Graceful fallback to staff list
  try {
    const response = await api.get("/admin/staff", { params: scoped(params, branchId) });
    const payload = unwrap(response);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.staff)) return payload.staff;
  } catch {}

  return [];
}

export async function receivePickupRunShipment(runId, pickupRequestId, shipmentId, payload = {}, branchId = null) {
  const response = await api.post(
    `/admin/pickups/runs/${runId}/receive-shipment`,
    {
      pickup_request_id: pickupRequestId,
      shipment_id: shipmentId,
      ...payload,
    },
    { params: scoped({}, branchId) }
  );
  return unwrap(response);
}

export async function receiveAllPickupRunShipments(runId, branchId = null) {
  const response = await api.post(
    `/admin/pickups/runs/${runId}/receive-all`,
    {},
    { params: scoped({}, branchId) }
  );
  return unwrap(response);
}

export async function lookupPickupRun(code, branchId = null) {
  const response = await api.get("/admin/pickups/runs/lookup", { params: scoped({ code }, branchId) });
  return unwrap(response);
}

export async function getPickupRun(id, branchId = null) {
  const response = await api.get(`/admin/pickups/runs/${id}`, { params: scoped({}, branchId) });
  return unwrap(response);
}

export async function createPickupRun(payload, branchId = null) {
  const response = await api.post("/admin/pickups/runs", payload, { params: scoped({}, branchId) });
  return unwrap(response);
}

export async function addPickupRunItems(runId, pickupRequestIds, branchId = null) {
  const response = await api.post(
    `/admin/pickups/runs/${runId}/items`,
    { pickup_request_ids: pickupRequestIds },
    { params: scoped({}, branchId) }
  );
  return unwrap(response);
}

export async function removePickupRunItems(runId, pickupRequestIds, reason = null, branchId = null) {
  const response = await api.post(
    `/admin/pickups/runs/${runId}/items/remove`,
    { pickup_request_ids: pickupRequestIds, reason },
    { params: scoped({}, branchId) }
  );
  return unwrap(response);
}

export async function assignPickupRunRider(runId, payload, branchId = null) {
  const response = await api.post(`/admin/pickups/runs/${runId}/rider`, payload, { params: scoped({}, branchId) });
  return unwrap(response);
}

export async function sequencePickupRun(runId, itemIds = null, branchId = null) {
  const response = await api.post(
    `/admin/pickups/runs/${runId}/sequence`,
    { item_ids: itemIds },
    { params: scoped({}, branchId) }
  );
  return unwrap(response);
}

export async function dispatchPickupRun(runId, payload = {}, branchId = null) {
  const response = await api.post(`/admin/pickups/runs/${runId}/dispatch`, payload, { params: scoped({}, branchId) });
  return unwrap(response);
}

export async function closePickupRun(runId, payload = {}, branchId = null) {
  const response = await api.post(`/admin/pickups/runs/${runId}/close`, payload, { params: scoped({}, branchId) });
  return unwrap(response);
}

export async function cancelPickupRun(runId, reason = null, branchId = null) {
  const response = await api.post(
    `/admin/pickups/runs/${runId}/cancel`,
    { reason },
    { params: scoped({}, branchId) }
  );
  return unwrap(response);
}

/* ----------------------- Staff / Rider ----------------------- */

export async function staffGetPickupRuns() {
  const response = await api.get("/staff/pickups/runs");
  return unwrap(response) ?? { active: [], recent: [] };
}

export async function staffGetPickupRun(runId) {
  const response = await api.get(`/staff/pickups/runs/${runId}`);
  return unwrap(response);
}

export async function staffStartPickupRun(runId) {
  const response = await api.post(`/staff/pickups/runs/${runId}/start`);
  return unwrap(response);
}

/** Rider finishes the pickup run once every stop is picked up or failed. */
export async function staffFinishPickupRun(runId) {
  const response = await api.post(`/staff/pickups/runs/${runId}/finish`);
  return { data: unwrap(response), message: response?.data?.message };
}

