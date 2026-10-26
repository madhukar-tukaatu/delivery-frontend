import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

/** Payload plus the API message (e.g. "Added 2 parcels to DR-...") as _message. */
function withMessage(response) {
  const payload = unwrap(response);
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return { ...payload, _message: response?.data?.message || "" };
  }
  return payload;
}

function normalizeList(response, params = {}) {
  const payload = unwrap(response);

  if (Array.isArray(payload)) {
    return {
      list: payload,
      currentPage: Number(params.page ?? 1),
      pageSize: Number(params.per_page ?? 20),
      total: payload.length,
    };
  }

  return {
    list: Array.isArray(payload?.data) ? payload.data : [],
    currentPage: Number(payload?.current_page ?? params.page ?? 1),
    pageSize: Number(payload?.per_page ?? params.per_page ?? 20),
    total: Number(payload?.total ?? 0),
  };
}

/**
 * Admin / branch delivery board.
 *
 * GET /admin/deliveries
 * params: page, per_page, status ("ready"|pending|assigned|accepted|out_for_delivery|delivered|failed),
 *         delivery_type (last_mile|transfer), search, branch_id
 */
export async function getDeliveries(params = {}) {
  const response = await api.get("/admin/deliveries", {
    params: { per_page: 20, ...params },
  });
  return normalizeList(response, params);
}

/**
 * Status counts for the board tabs.
 *
 * GET /admin/deliveries/summary
 */
export async function getDeliverySummary(params = {}) {
  const response = await api.get("/admin/deliveries/summary", { params });
  const payload = unwrap(response) ?? {};
  return {
    total: Number(payload.total ?? 0),
    byStatus: payload.by_status ?? {},
    // pending deliveries that are not on an active delivery run
    ready: Number(payload.ready ?? payload.by_status?.pending ?? 0),
    // pending deliveries already on an active DR (rider set, not dispatched yet)
    planned: Number(payload.planned ?? 0),
  };
}

/**
 * Riders assignable to a delivery's destination branch.
 *
 * GET /admin/deliveries/{id}/assignable-riders
 */
export async function getAssignableRiders(deliveryId) {
  if (!deliveryId) throw new Error("Delivery ID is required.");
  const response = await api.get(
    `/admin/deliveries/${deliveryId}/assignable-riders`,
  );
  const payload = unwrap(response);
  return Array.isArray(payload) ? payload : [];
}

/**
 * Assign a rider to a delivery.
 *
 * POST /admin/deliveries/{id}/assign  { rider_id, run_mode? }
 * run_mode: auto (default: joins the rider's un-started delivery run) | run | individual.
 */
export async function assignDeliveryRider(deliveryId, riderId, extra = {}) {
  if (!deliveryId) throw new Error("Delivery ID is required.");
  if (!riderId) throw new Error("Rider ID is required.");
  const response = await api.post(`/admin/deliveries/${deliveryId}/assign`, {
    rider_id: riderId,
    ...extra,
  });
  return withMessage(response);
}

/**
 * Assign many deliveries to one rider.
 *
 * POST /admin/deliveries/bulk-assign  { rider_id, delivery_ids: [], run_mode? }
 * Returns { assigned: number[], skipped: { [id]: reason }, run?, joined_run?: shipment ids, _message }
 */
export async function bulkAssignDeliveries(riderId, deliveryIds, extra = {}) {
  if (!riderId) throw new Error("Rider ID is required.");
  if (!Array.isArray(deliveryIds) || deliveryIds.length === 0) {
    throw new Error("Select at least one delivery.");
  }
  const response = await api.post("/admin/deliveries/bulk-assign", {
    rider_id: riderId,
    delivery_ids: deliveryIds,
    ...extra,
  });
  return withMessage(response);
}

/**
 * Mark a delivery failed (admin/branch manager).
 *
 * POST /admin/deliveries/{id}/failed  { reason }
 */
export async function failDelivery(deliveryId, reason) {
  if (!deliveryId) throw new Error("Delivery ID is required.");
  const response = await api.post(`/admin/deliveries/${deliveryId}/failed`, {
    reason,
  });
  return unwrap(response);
}
