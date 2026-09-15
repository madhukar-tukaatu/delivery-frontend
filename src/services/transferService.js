import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
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
 * Transfer board.
 *
 * GET /admin/transfers  params: direction ("outbound"|"inbound"), search, branch_id
 * This returns cross-branch transfers ONLY (origin_branch_id != destination_branch_id)
 */
export async function getTransfers(params = {}) {
  const response = await api.get("/admin/transfers", {
    params: { per_page: 20, direction: "outbound", ...params },
  });
  return normalizeList(response, params);
}

/**
 * Get comprehensive transfer statistics (cross-branch only).
 *
 * GET /admin/transfers/stats -> { outbound, in_transit, received, completed, total_value, pod_amount }
 */
export async function getTransferStats() {
  const response = await api.get("/admin/transfers/stats");
  const payload = unwrap(response) ?? {};
  return {
    outbound: Number(payload.outbound ?? 0),
    in_transit: Number(payload.in_transit ?? 0),
    received: Number(payload.received ?? 0),
    completed: Number(payload.completed ?? 0),
    total_value: Number(payload.total_value ?? 0),
    pod_amount: Number(payload.pod_amount ?? 0),
  };
}

/**
 * GET /admin/transfers/summary -> { outbound, inbound }
 */
export async function getTransferSummary() {
  const response = await api.get("/admin/transfers/summary");
  const payload = unwrap(response) ?? {};
  return {
    outbound: Number(payload.outbound ?? 0),
    inbound: Number(payload.inbound ?? 0),
  };
}

/**
 * Get received transfers (cross-branch only).
 *
 * GET /admin/transfers/received params: search, per_page
 */
export async function getReceivedTransfers(params = {}) {
  const response = await api.get("/admin/transfers/received", {
    params: { per_page: 20, ...params },
  });
  return normalizeList(response, params);
}

/**
 * Get completed transfers (cross-branch only - delivered to this branch).
 *
 * GET /admin/transfers/completed params: search, date_from, date_to, per_page
 */
export async function getCompletedTransfers(params = {}) {
  const response = await api.get("/admin/transfers/completed", {
    params: { per_page: 20, ...params },
  });
  return normalizeList(response, params);
}

/**
 * Get complete transfer history with timeline (cross-branch only).
 *
 * GET /admin/transfers/history params: search, date_from, date_to, status, per_page
 */
export async function getTransferHistory(params = {}) {
  const response = await api.get("/admin/transfers/history", {
    params: { per_page: 20, ...params },
  });
  return normalizeList(response, params);
}

/**
 * Dispatch one or many transfer shipments.
 *
 * POST /admin/transfers/dispatch  { shipment_ids: [] }
 */
export async function dispatchTransfers(shipmentIds) {
  if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
    throw new Error("Select at least one shipment.");
  }
  const response = await api.post("/admin/transfers/dispatch", {
    shipment_ids: shipmentIds,
  });
  return unwrap(response);
}

/**
 * Receive an in-transit transfer at the destination branch.
 *
 * POST /admin/transfers/{shipmentId}/receive
 */
export async function receiveTransfer(shipmentId) {
  if (!shipmentId) throw new Error("Shipment ID is required.");
  const response = await api.post(`/admin/transfers/${shipmentId}/receive`);
  return unwrap(response);
}