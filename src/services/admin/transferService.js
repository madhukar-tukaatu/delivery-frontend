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

  // Grouped outbound board returns { routes|next_hops, unmatched, total_shipments }
  // (not a Laravel paginator). Preserve that shape so route/next-hop cards get parcels.
  const grouped = unwrap(response);
  if (
    (params.group_by_route || params.group_by_next_hop) &&
    grouped &&
    typeof grouped === "object" &&
    (Array.isArray(grouped.routes) || Array.isArray(grouped.next_hops))
  ) {
    const total = Number(grouped.total_shipments ?? 0);
    return {
      routes: Array.isArray(grouped.routes) ? grouped.routes : [],
      next_hops: Array.isArray(grouped.next_hops) ? grouped.next_hops : [],
      unmatched: Array.isArray(grouped.unmatched) ? grouped.unmatched : [],
      total_shipments: total,
      list: [],
      currentPage: 1,
      pageSize: Number(params.per_page ?? 20),
      total,
    };
  }

  return normalizeList(response, params);
}

/**
 * Get comprehensive transfer statistics (cross-branch only).
 *
 * GET /admin/transfers/stats -> { outbound, in_transit, received, completed, total_value, pod_amount }
 * Optional: branch_id to view stats for a specific branch (admin only)
 */
export async function getTransferStats(branchId = null) {
  const params = branchId ? { branch_id: branchId } : {};
  const response = await api.get("/admin/transfers/stats", { params });
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
 * Optional: branch_id to view summary for a specific branch (admin only)
 */
export async function getTransferSummary(branchId = null) {
  const params = branchId ? { branch_id: branchId } : {};
  const response = await api.get("/admin/transfers/summary", { params });
  const payload = unwrap(response) ?? {};
  return {
    outbound: Number(payload.outbound ?? 0),
    inbound: Number(payload.inbound ?? 0),
  };
}

/**
 * Get received transfers (cross-branch only).
 *
 * GET /admin/transfers/received params: search, per_page, branch_id
 * Optional: branch_id to view received transfers for a specific branch (admin only)
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
 * GET /admin/transfers/completed params: search, date_from, date_to, per_page, branch_id
 * Optional: branch_id to view completed transfers for a specific branch (admin only)
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
 * GET /admin/transfers/history params: search, date_from, date_to, status, per_page, branch_id
 * Optional: branch_id to view history for a specific branch (admin only)
 */
export async function getTransferHistory(params = {}) {
  const response = await api.get("/admin/transfers/history", {
    params: { per_page: 20, ...params },
  });
  return normalizeList(response, params);
}


/**
 * Configured transfer routes available for dispatch from the current branch.
 *
 * GET /admin/transfers/available-routes
 * optional params: service_type, branch_id (for admin users)
 */
export async function getAvailableTransferRoutes(params = {}) {
  const response = await api.get("/admin/transfers/available-routes", { params });
  const payload = unwrap(response) ?? {};
  
  // Handle both response formats:
  // 1. Branch-scoped: { routes, routes_by_destination, branch_id }
  // 2. Admin (no branch_id): { routes, routes_by_origin, branch_id: null }
  const rawRoutes = Array.isArray(payload.routes) ? payload.routes : [];
  // Defend against legacy nested origin-group payloads in `routes`.
  const routes = rawRoutes.some((r) => Array.isArray(r?.routes))
    ? rawRoutes.flatMap((g) => (Array.isArray(g.routes) ? g.routes : []))
    : rawRoutes;

  return {
    routes,
    routes_by_destination: payload.routes_by_destination ?? [],
    routes_by_origin: payload.routes_by_origin ?? [],
    branch_id: payload.branch_id ?? null,
    service_type: payload.service_type ?? 'standard',
  };
}

/**
 * Dispatch one or many transfer shipments.
 *
 * POST /admin/transfers/dispatch  { shipment_ids: [] }
 */
export async function dispatchTransfers(shipmentIds, transferRouteId) {
  if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
    throw new Error("Select at least one shipment.");
  }
  if (!transferRouteId) {
    throw new Error("Select a transfer route before dispatching.");
  }
  const response = await api.post("/admin/transfers/dispatch", {
    shipment_ids: shipmentIds,
    transfer_route_id: Number(transferRouteId),
  });
  return unwrap(response);
}

/**
 * Receive an in-transit transfer at the expected next hop (transit or final destination).
 *
 * POST /admin/transfers/{shipmentId}/receive
 */
export async function receiveTransfer(shipmentId) {
  if (!shipmentId) throw new Error("Shipment ID is required.");
  const response = await api.post(`/admin/transfers/${shipmentId}/receive`);
  return unwrap(response);
}

/**
 * Receive transfer at a transit hub (intermediate branch) and optionally re-dispatch to next hop.
 *
 * POST /admin/transfers/{shipmentId}/receive-transit
 */
export async function receiveAtTransitHub(shipmentId, data = {}) {
  if (!shipmentId) throw new Error("Shipment ID is required.");
  const response = await api.post(`/admin/transfers/${shipmentId}/receive-transit`, data);
  return unwrap(response);
}

/**
 * Get outbound transfers grouped by route for dispatch planning.
 *
 * GET /admin/transfers?group_by_route=true
 */
export async function getOutboundGroupedByRoute(params = {}) {
  const response = await api.get("/admin/transfers", {
    params: { per_page: 20, direction: "outbound", group_by_route: true, ...params },
  });
  return unwrap(response);
}

/**
 * Dispatch transfers with route-based manifest creation.
 *
 * POST /admin/transfers/dispatch
 * { shipment_ids: [], transfer_route_id?, vehicle_number?, driver_name?, driver_phone?, seal_number?, notes? }
 */
export async function dispatchTransfersWithManifest(data) {
  const { shipment_ids, transfer_route_id, ...rest } = data;
  if (!Array.isArray(shipment_ids) || shipment_ids.length === 0) {
    throw new Error("Select at least one shipment.");
  }
  const response = await api.post("/admin/transfers/dispatch", {
    shipment_ids,
    transfer_route_id: transfer_route_id ? Number(transfer_route_id) : undefined,
    ...rest,
  });
  return unwrap(response);
}

/**
 * Hub bagging: dispatch many shipments that share the same NEXT hop
 * (even when they belong to different transfer routes / final destinations).
 *
 * POST /admin/transfers/dispatch
 * { shipment_ids: [], next_hop_branch_id }
 */
export async function dispatchToNextHop(shipmentIds, nextHopBranchId, extra = {}) {
  if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
    throw new Error("Select at least one shipment.");
  }
  if (!nextHopBranchId) {
    throw new Error("Select a next hop before dispatching.");
  }
  const response = await api.post("/admin/transfers/dispatch", {
    shipment_ids: shipmentIds,
    next_hop_branch_id: Number(nextHopBranchId),
    ...extra,
  });
  return unwrap(response);
}

/**
 * GET /admin/transfers?group_by_next_hop=true
 * Hub-bagging board: groups outbound parcels by NEXT HOP.
 */
export async function getOutboundGroupedByNextHop(params = {}) {
  const response = await api.get("/admin/transfers", {
    params: { per_page: 20, direction: "outbound", group_by_next_hop: true, ...params },
  });
  return unwrap(response);
}
