import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

/* ============================================================
 * MERCHANT
 * ============================================================
 */

export async function getMerchantPickupLocations() {
  const response = await api.get(
    "/merchant/pickup-locations"
  );

  return unwrap(response);
}

export async function merchantQuoteShipment(
  payload
) {
  const response = await api.post(
    "/merchant/shipments/quote",
    payload
  );

  return unwrap(response);
}

export async function merchantCreateShipment(
  payload
) {
  const response = await api.post(
    "/merchant/shipments",
    payload
  );

  return unwrap(response);
}

export async function merchantGetShipment(
  id
) {
  const response = await api.get(
    `/merchant/shipments/${id}`
  );

  return unwrap(response);
}

export async function getMerchantShipment(
  id
) {
  const response = await api.get(
    `/merchant/shipments/${id}`
  );

  return unwrap(response);
}

/* ============================================================
 * ADMIN / SHIPMENT
 * ============================================================
 */

export async function adminQuoteShipment(
  payload
) {
  const response = await api.post(
    "/admin/shipments/quote",
    payload
  );

  return unwrap(response);
}

export async function adminCreateShipment(
  payload
) {
  const response = await api.post(
    "/admin/shipments",
    payload
  );

  return unwrap(response);
}

export async function adminGetShipment(
  id
) {
  const response = await api.get(
    `/admin/shipments/${id}`
  );

  return unwrap(response);
}

/**
 * Assign shipment pickup.
 *
 * Keep this only if your backend has a shipment-level
 * pickup assignment endpoint.
 *
 * POST /admin/shipments/{shipment}/assign-pickup
 */
export async function adminAssignPickup(
  shipmentId,
  staffId
) {
  if (!shipmentId) {
    throw new Error(
      "Shipment ID is required."
    );
  }

  if (!staffId) {
    throw new Error(
      "Staff ID is required."
    );
  }

  const response = await api.post(
    `/admin/shipments/${shipmentId}/assign-pickup`,
    {
      staff_id: staffId,
    }
  );

  return unwrap(response);
}

export async function adminReceiveOrigin(
  shipmentId,
  note = ""
) {
  const response = await api.post(
    `/admin/shipments/${shipmentId}/receive-origin`,
    {
      note,
    }
  );

  return unwrap(response);
}

export async function adminCreateTransfer(
  shipmentId,
  payload
) {
  const response = await api.post(
    `/admin/shipments/${shipmentId}/create-transfer`,
    payload
  );

  return unwrap(response);
}

export async function adminDispatchTransfer(
  batchId
) {
  const response = await api.post(
    `/admin/transfers/${batchId}/dispatch`
  );

  return unwrap(response);
}

export async function adminReceiveTransfer(
  batchId
) {
  const response = await api.post(
    `/admin/transfers/${batchId}/receive`
  );

  return unwrap(response);
}

export async function adminAssignDelivery(
  shipmentId,
  riderId
) {
  if (!shipmentId) {
    throw new Error(
      "Shipment ID is required."
    );
  }

  if (!riderId) {
    throw new Error(
      "Rider ID is required."
    );
  }

  const response = await api.post(
    `/admin/shipments/${shipmentId}/assign-delivery`,
    {
      rider_id: riderId,
    }
  );

  return unwrap(response);
}

/* ============================================================
 * STAFF - PICKUPS
 * ============================================================
 */

/**
 * Get pickups assigned to authenticated staff.
 *
 * GET /staff/pickups
 *
 * Backend MUST automatically identify the authenticated
 * staff member.
 */
export async function staffGetPickups(
  params = {}
) {
  const response = await api.get(
    "/staff/pickups",
    {
      params: {
        per_page: 20,
        ...params,
      },
    }
  );

  const payload = unwrap(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

/**
 * Accept assigned pickup.
 *
 * POST /staff/pickups/{id}/accept
 */
export async function staffAcceptPickup(
  id
) {
  if (!id) {
    throw new Error(
      "Pickup ID is required."
    );
  }

  const response = await api.post(
    `/staff/pickups/${id}/accept`
  );

  return unwrap(response);
}

/**
 * Start pickup.
 *
 * POST /staff/pickups/{id}/start
 */
export async function staffStartPickup(
  id,
  payload = {}
) {
  if (!id) {
    throw new Error(
      "Pickup ID is required."
    );
  }

  const response = await api.post(
    `/staff/pickups/${id}/start`,
    payload
  );

  return unwrap(response);
}

/**
 * Arrive at merchant pickup location.
 *
 * POST /staff/pickups/{id}/arrive
 */
export async function staffArrivePickup(
  id,
  payload = {}
) {
  if (!id) {
    throw new Error(
      "Pickup ID is required."
    );
  }

  const response = await api.post(
    `/staff/pickups/${id}/arrive`,
    payload
  );

  return unwrap(response);
}

/**
 * Mark pickup shipment as collected.
 *
 * POST
 * /staff/pickups/{pickup}/shipments/{shipment}/collect
 */
export async function staffCollectPickupShipment(
  pickupId,
  shipmentId,
  payload = {}
) {
  if (!pickupId) {
    throw new Error(
      "Pickup ID is required."
    );
  }

  if (!shipmentId) {
    throw new Error(
      "Shipment ID is required."
    );
  }

  const response = await api.post(
    `/staff/pickups/${pickupId}/shipments/${shipmentId}/collect`,
    payload
  );

  return unwrap(response);
}

/**
 * Complete pickup.
 *
 * POST /staff/pickups/{id}/complete
 */
export async function staffCompletePickup(
  id,
  payload = {}
) {
  if (!id) {
    throw new Error(
      "Pickup ID is required."
    );
  }

  const response = await api.post(
    `/staff/pickups/${id}/complete`,
    payload
  );

  return unwrap(response);
}

/**
 * Backward-compatible alias.
 *
 * If your existing staff page still calls:
 *
 * staffPickedUp(id, note)
 *
 * this will continue to work.
 */
export async function staffPickedUp(
  id,
  note = ""
) {
  return staffCompletePickup(
    id,
    {
      note,
    }
  );
}

/* ============================================================
 * STAFF - DELIVERIES
 * ============================================================
 */

/**
 * Get deliveries assigned to authenticated staff.
 *
 * GET /staff/deliveries
 */
export async function staffGetDeliveries(
  params = {}
) {
  const response = await api.get(
    "/staff/deliveries",
    {
      params: {
        per_page: 20,
        ...params,
      },
    }
  );

  const payload = unwrap(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

/**
 * Accept delivery.
 *
 * POST /staff/deliveries/{id}/accept
 */
export async function staffAcceptDelivery(
  id
) {
  const response = await api.post(
    `/staff/deliveries/${id}/accept`
  );

  return unwrap(response);
}

/**
 * Mark shipment out for delivery.
 *
 * POST /staff/deliveries/{id}/out-for-delivery
 */
export async function staffOutForDelivery(
  id
) {
  const response = await api.post(
    `/staff/deliveries/${id}/out-for-delivery`
  );

  return unwrap(response);
}

/**
 * Mark shipment delivered.
 *
 * POST /staff/deliveries/{id}/delivered
 */
export async function staffMarkDelivered(
  id,
  payload = {}
) {
  const response = await api.post(
    `/staff/deliveries/${id}/delivered`,
    payload
  );

  return unwrap(response);
}

/**
 * Mark delivery failed.
 *
 * POST /staff/deliveries/{id}/failed
 */
export async function staffMarkFailed(
  id,
  reason
) {
  const response = await api.post(
    `/staff/deliveries/${id}/failed`,
    {
      reason,
    }
  );

  return unwrap(response);
}

/* ============================================================
 * ACCOUNTS
 * ============================================================
 */

export async function accountsGetCodPending() {
  const response = await api.get(
    "/admin/accounts/pod-pending"
  );

  return unwrap(response);
}

export async function accountsConfirmCodDeposit(
  codId,
  payload
) {
  const response = await api.post(
    `/admin/accounts/pod/${codId}/confirm-deposit`,
    payload
  );

  return unwrap(response);
}

export async function accountsGetSettlements() {
  const response = await api.get(
    "/admin/accounts/settlements"
  );

  return unwrap(response);
}

export async function accountsCreateSettlement(
  payload
) {
  const response = await api.post(
    "/admin/accounts/settlements",
    payload
  );

  return unwrap(response);
}

export async function accountsMarkSettlementPaid(
  id
) {
  const response = await api.post(
    `/admin/accounts/settlements/${id}/mark-paid`
  );

  return unwrap(response);
}