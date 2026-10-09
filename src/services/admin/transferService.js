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
 * GET /admin/transfers  params: direction ("outbound"|"inbound"|"sent"), search, status, service_type, branch_id
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
 * GET /admin/transfers/stats -> { outbound, sent, in_transit, received, completed, total_value, pod_amount }
 * Optional: branch_id to view stats for a specific branch (admin only)
 */
export async function getTransferStats(branchId = null) {
  const params = branchId ? { branch_id: branchId } : {};
  const response = await api.get("/admin/transfers/stats", { params });
  const payload = unwrap(response) ?? {};
  return {
    outbound: Number(payload.outbound ?? 0),
    sent: Number(payload.sent ?? 0),
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
export async function dispatchTransfers(shipmentIds, transferRouteId, extra = {}) {
  if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
    throw new Error("Select at least one shipment.");
  }
  if (!transferRouteId) {
    throw new Error("Select a transfer route before dispatching.");
  }
  const response = await api.post("/admin/transfers/dispatch", {
    shipment_ids: shipmentIds,
    transfer_route_id: Number(transferRouteId),
    // transport_cost / transport_cost_split_mode entered by the dispatching branch
    ...extra,
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

/* ------------------------------------------------------------------ */
/* TR containers: one transfer per (this branch -> next hop) trip      */
/* ------------------------------------------------------------------ */

/**
 * GET /admin/transfers/containers
 * params: direction ("outbound"|"inbound"|"all"), status (comma list), search, date_from, date_to, page, per_page, branch_id
 * Inbound without a status lists TRs still arriving (dispatched / in transit / partially received).
 */
export async function getContainers(params = {}) {
  const response = await api.get("/admin/transfers/containers", {
    params: { per_page: 20, direction: "outbound", ...params },
  });
  return normalizeList(response, params);
}

/** GET /admin/transfers/containers/{id} -> TR with items and can_receive / can_resolve / can_dispatch / can_cancel */
export async function getContainer(containerId, params = {}) {
  if (!containerId) throw new Error("TR id is required.");
  const response = await api.get(`/admin/transfers/containers/${containerId}`, { params });
  return unwrap(response);
}

/**
 * Check a TR in at this branch.
 * POST /admin/transfers/containers/{id}/receive { scanned: [shipment ids or tracking numbers], remarks? }
 * Unscanned parcels are flagged missing; scanned parcels from other TRs headed here are taken as extras.
 * -> { container, received, missing, extras, rejected }
 */
export async function receiveContainer(containerId, scanned = [], remarks = null, params = {}, seal = null) {
  if (!containerId) throw new Error("TR id is required.");
  const body = { scanned: Array.isArray(scanned) ? scanned : [], remarks: remarks || undefined };
  // Seal check at arrival: { value, intact, remark }
  if (seal) {
    body.seal_value = seal.value || undefined;
    body.seal_intact = seal.intact !== undefined ? !!seal.intact : undefined;
    body.seal_remark = seal.remark || undefined;
  }
  const response = await api.post(`/admin/transfers/containers/${containerId}/receive`, body, { params });
  return { ...(unwrap(response) || {}), message: response?.data?.message };
}

/** POST /admin/transfers/containers/{id}/items/{itemId}/resolve { action: "found"|"lost", note? } */
export async function resolveContainerItem(containerId, itemId, action, note = null, params = {}) {
  if (!containerId || !itemId) throw new Error("TR and parcel are required.");
  const response = await api.post(
    `/admin/transfers/containers/${containerId}/items/${itemId}/resolve`,
    { action, note: note || undefined },
    { params }
  );
  return unwrap(response);
}

/** POST /admin/transfers/containers/{id}/dispatch : send an open (held) TR with vehicle / rider / cost. */
export async function dispatchContainer(containerId, data = {}, params = {}) {
  if (!containerId) throw new Error("TR id is required.");
  const response = await api.post(`/admin/transfers/containers/${containerId}/dispatch`, data, { params });
  return unwrap(response);
}

/** POST /admin/transfers/containers/{id}/cancel { reason? } : only an open TR; its parcels stay ready. */
export async function cancelContainer(containerId, reason = null, params = {}) {
  if (!containerId) throw new Error("TR id is required.");
  const response = await api.post(
    `/admin/transfers/containers/${containerId}/cancel`,
    { reason: reason || undefined },
    { params }
  );
  return unwrap(response);
}

/** GET /admin/transfers/riders : staff of the dispatching branch (riders first) for the TR rider picker. */
export async function getTransferRiders(params = {}) {
  const response = await api.get("/admin/transfers/riders", { params });
  const payload = unwrap(response);
  return Array.isArray(payload) ? payload : [];
}

/** GET /admin/transfers/shipments/{id}/hops : per-hop TR number, trip and transport cost of one parcel. */
export async function getShipmentHops(shipmentId) {
  if (!shipmentId) return [];
  const response = await api.get(`/admin/transfers/shipments/${shipmentId}/hops`);
  const payload = unwrap(response) ?? {};
  return Array.isArray(payload.hops) ? payload.hops : [];
}

/** GET /admin/transfers/containers/lookup?number=TR-000001 : open a TR from its bag barcode (receiving branch only). */
export async function lookupContainer(number, params = {}) {
  const response = await api.get("/admin/transfers/containers/lookup", { params: { number, ...params } });
  return unwrap(response);
}

/** GET /admin/transfers/containers/{id}/candidates : ready parcels for this open TR's next hop, not on any TR. */
export async function getContainerCandidates(containerId, params = {}) {
  if (!containerId) return [];
  const response = await api.get(`/admin/transfers/containers/${containerId}/candidates`, { params });
  const payload = unwrap(response);
  return Array.isArray(payload) ? payload : [];
}

/** POST /admin/transfers/containers/{id}/items { shipment_ids } : load more parcels on an open TR. */
export async function addContainerItems(containerId, shipmentIds = [], params = {}) {
  const response = await api.post(`/admin/transfers/containers/${containerId}/items`, { shipment_ids: shipmentIds }, { params });
  return { ...(unwrap(response) || {}), message: response?.data?.message };
}

/** POST /admin/transfers/containers/{id}/items/remove { shipment_ids, reason? } : take parcels off an open TR. */
export async function removeContainerItems(containerId, shipmentIds = [], reason = null, params = {}) {
  const response = await api.post(
    `/admin/transfers/containers/${containerId}/items/remove`,
    { shipment_ids: shipmentIds, reason: reason || undefined },
    { params }
  );
  return { ...(unwrap(response) || {}), message: response?.data?.message };
}

/** POST /admin/transfers/containers/{id}/auto-append { enabled } */
export async function setContainerAutoAppend(containerId, enabled, params = {}) {
  const response = await api.post(`/admin/transfers/containers/${containerId}/auto-append`, { enabled: !!enabled }, { params });
  return { ...(unwrap(response) || {}), message: response?.data?.message };
}

/** Printable TR bag label / manifest sheet (opens in a new tab). type: "label" | "manifest" */
export function trPrintUrl(containerId, type = "label", branchId = null) {
  const q = new URLSearchParams({ type });
  if (branchId) q.set("branch_id", String(branchId));
  return `/admin/transfers/containers/${containerId}/print?${q.toString()}`;
}

export function openTrPrint(containerId, type = "label", branchId = null) {
  if (typeof window === "undefined" || !containerId) return;
  window.open(trPrintUrl(containerId, type, branchId), "_blank", "noopener");
}
