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
 */
export async function getTransfers(params = {}) {
  const response = await api.get("/admin/transfers", {
    params: { per_page: 20, direction: "outbound", ...params },
  });
  return normalizeList(response, params);
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
