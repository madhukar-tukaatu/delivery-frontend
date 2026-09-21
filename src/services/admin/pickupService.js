import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

/**
 * Normalize pickup list.
 */
function normalizePickupList(response, params = {}) {
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
 * Get pickups visible to the authenticated
 * branch manager.
 *
 * Backend MUST apply branch scope.
 *
 * GET /admin/pickups
 */
export async function getPickups(params = {}) {
  const response = await api.get("/admin/pickups", {
    params: {
      per_page: 20,
      ...params,
    },
  });

  return normalizePickupList(response, params);
}

/**
 * Get pickup summary / reports.
 *
 * Optional params: date_from, date_to, merchant_id.
 *
 * GET /admin/pickups/summary
 *
 * Returns:
 * {
 *   total,
 *   by_status: { requested, assigned, ... },
 *   by_merchant: [ { merchant_id, merchant_name, total, by_status } ],
 *   filters: { date_from, date_to, merchant_id }
 * }
 */
export async function getPickupSummary(params = {}) {
  const response = await api.get("/admin/pickups/summary", { params });

  const payload = unwrap(response) ?? {};

  return {
    total: Number(payload.total ?? 0),
    byStatus: payload.by_status ?? {},
    byMerchant: Array.isArray(payload.by_merchant) ? payload.by_merchant : [],
    filters: payload.filters ?? {},
  };
}

/**
 * Get one pickup.
 *
 * GET /admin/pickups/{id}
 */
export async function getPickup(id) {
  if (!id) {
    throw new Error("Pickup ID is required.");
  }

  const response = await api.get(`/admin/pickups/${id}`);

  return unwrap(response);
}

/**
 * Get staff that can be assigned to this pickup.
 *
 * Backend MUST return only staff belonging
 * to the authenticated manager's branch.
 *
 * GET /admin/pickups/{id}/assignable-staff
 */
export async function getPickupAssignableStaff(id) {
  if (!id) {
    throw new Error("Pickup ID is required.");
  }

  const response = await api.get(`/admin/pickups/${id}/assignable-staff`);

  const payload = unwrap(response);

  if (Array.isArray(payload?.staff)) {
    return payload.staff;
  }

  if (Array.isArray(payload?.data?.staff)) {
    return payload.data.staff;
  }

  /*
   * Fallback if API directly returns array.
   */

  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
}

/**
 * Assign pickup to branch staff.
 *
 * POST /admin/pickups/{id}/assign
 *
 * Payload:
 *
 * {
 *   staff_id: 123
 * }
 */
export async function assignPickup(id, staffId) {
  if (!id) {
    throw new Error("Pickup ID is required.");
  }

  if (!staffId) {
    throw new Error("Staff ID is required.");
  }

  const response = await api.post(`/admin/pickups/${id}/assign`, {
    staff_id: staffId,
  });

  return unwrap(response);
}

/**
 * Fail/cancel pickup from admin/branch manager side.
 *
 * POST /admin/pickups/{id}/fail
 */
export async function failPickup(id, reason) {
  if (!id) {
    throw new Error("Pickup ID is required.");
  }

  const response = await api.post(`/admin/pickups/${id}/fail`, {
    reason,
  });

  return unwrap(response);
}

/**
 * Receive shipment at origin branch after pickup.
 *
 * POST /admin/pickups/{pickup}/shipments/{shipment}/receive
 */
export async function receivePickupShipment(
  pickupId,
  shipmentId,
  payload = {},
) {
  if (!pickupId) {
    throw new Error("Pickup ID is required.");
  }

  if (!shipmentId) {
    throw new Error("Shipment ID is required.");
  }

  const response = await api.post(
    `/admin/pickups/${pickupId}/shipments/${shipmentId}/receive`,
    payload,
  );

  return unwrap(response);
}

/**
 * Reject a shipment at the origin branch (verification discrepancy).
 *
 * POST /admin/pickups/{pickup}/shipments/{shipment}/reject
 *
 * Payload:
 * {
 *   reason: string,                                  // required
 *   type: "missing" | "damaged" | "mismatch" | "other"
 * }
 */
export async function rejectPickupShipment(
  pickupId,
  shipmentId,
  { reason, type = "other" } = {},
) {
  if (!pickupId) {
    throw new Error("Pickup ID is required.");
  }

  if (!shipmentId) {
    throw new Error("Shipment ID is required.");
  }

  if (!reason?.trim()) {
    throw new Error("Rejection reason is required.");
  }

  const response = await api.post(
    `/admin/pickups/${pickupId}/shipments/${shipmentId}/reject`,
    {
      reason: reason.trim(),
      type,
    },
  );

  return unwrap(response);
}

export async function transferPickup(id, staffId, reason) {
  if (!id) {
    throw new Error("Pickup ID is required.");
  }

  if (!staffId) {
    throw new Error("Staff ID is required.");
  }

  if (!reason?.trim()) {
    throw new Error("Transfer reason is required.");
  }

  const response = await api.post(`/admin/pickups/${id}/transfer`, {
    staff_id: staffId,
    reason: reason.trim(),
  });

  return unwrap(response);
}

/**
 * Re-send a pickup lifecycle callback to the store partner.
 *
 * POST /admin/pickups/{id}/resend-callback
 *
 * Payload:
 * {
 *   event: "pickup.rider_assigned" | "pickup.rider_started" |
 *          "pickup.rider_arrived" | "pickup.completed" |
 *          "shipment.collected" | "shipment.received_at_origin",
 *   shipment_id?: number   // required only for shipment.* events
 * }
 */
export async function resendPickupCallback(id, event, shipmentId = null) {
  if (!id) {
    throw new Error("Pickup ID is required.");
  }

  if (!event) {
    throw new Error("Callback event is required.");
  }

  const payload = { event };

  if (shipmentId) {
    payload.shipment_id = shipmentId;
  }

  const response = await api.post(
    `/admin/pickups/${id}/resend-callback`,
    payload,
  );

  return unwrap(response);
}
