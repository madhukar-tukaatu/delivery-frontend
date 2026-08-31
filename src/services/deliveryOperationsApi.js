import api from "@/lib/api";

/**
 * Safely unwrap Laravel ApiResponse.
 */
function unwrap(response) {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
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
  if (!id) {
    throw new Error(
      "Shipment ID is required."
    );
  }

  const response = await api.get(
    `/merchant/shipments/${id}`
  );

  return unwrap(response);
}

export async function getMerchantShipment(
  id
) {
  return merchantGetShipment(id);
}

/* ============================================================
 * ADMIN / SHIPMENTS
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
  if (!id) {
    throw new Error(
      "Shipment ID is required."
    );
  }

  const response = await api.get(
    `/admin/shipments/${id}`
  );

  return unwrap(response);
}

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
  if (!shipmentId) {
    throw new Error(
      "Shipment ID is required."
    );
  }

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
 * ADMIN / PICKUPS
 *
 * Branch Manager
 * ============================================================
 */

/**
 * Get pickup requests visible to the
 * authenticated branch manager.
 *
 * Backend applies branch.scope.
 *
 * GET /admin/pickups
 */
export async function adminGetPickups(
  params = {}
) {
  const response = await api.get(
    "/admin/pickups",
    {
      params: {
        per_page: 20,
        ...params,
      },
    }
  );

  const payload = unwrap(response);

  if (Array.isArray(payload)) {
    return {
      list: payload,
      currentPage: Number(
        params.page ?? 1
      ),
      pageSize: Number(
        params.per_page ?? 20
      ),
      total: payload.length,
    };
  }

  return {
    list: Array.isArray(
      payload?.data
    )
      ? payload.data
      : [],

    currentPage: Number(
      payload?.current_page ??
        params.page ??
        1
    ),

    pageSize: Number(
      payload?.per_page ??
        params.per_page ??
        20
    ),

    total: Number(
      payload?.total ?? 0
    ),
  };
}

/**
 * Get one pickup.
 *
 * GET /admin/pickups/{id}
 */
export async function adminGetPickup(
  id
) {
  if (!id) {
    throw new Error(
      "Pickup ID is required."
    );
  }

  const response = await api.get(
    `/admin/pickups/${id}`
  );

  return unwrap(response);
}

/**
 * Get staff assignable to this pickup.
 *
 * GET /admin/pickups/{id}/assignable-staff
 */
export async function getPickupAssignableStaff(
  id
) {
  if (!id) {
    throw new Error(
      "Pickup ID is required."
    );
  }

  const response = await api.get(
    `/admin/pickups/${id}/assignable-staff`
  );

  const payload = unwrap(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data;
  }

  return [];
}

/**
 * Assign pickup to branch staff.
 *
 * POST /admin/pickups/{id}/assign
 */
export async function assignPickup(
  pickupId,
  staffId
) {
  if (!pickupId) {
    throw new Error(
      "Pickup ID is required."
    );
  }

  if (!staffId) {
    throw new Error(
      "Staff ID is required."
    );
  }

  const response = await api.post(
    `/admin/pickups/${pickupId}/assign`,
    {
      staff_id: staffId,
    }
  );

  return unwrap(response);
}

/**
 * Fail pickup.
 *
 * POST /admin/pickups/{id}/fail
 */
export async function adminFailPickup(
  id,
  reason
) {
  if (!id) {
    throw new Error(
      "Pickup ID is required."
    );
  }

  const response = await api.post(
    `/admin/pickups/${id}/fail`,
    {
      reason,
    }
  );

  return unwrap(response);
}

/* ============================================================
 * STAFF / PICKUPS
 * ============================================================
 */

/**
 * Get pickups assigned to the
 * authenticated staff member.
 *
 * GET /staff/pickups
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

  if (
    Array.isArray(
      payload?.data
    )
  ) {
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
 * Arrive at merchant.
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
 * Collect shipment.
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
 * Backward-compatible function.
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
 * STAFF / DELIVERIES
 * ============================================================
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

  if (
    Array.isArray(
      payload?.data
    )
  ) {
    return payload.data;
  }

  return [];
}

export async function staffAcceptDelivery(
  id
) {
  const response = await api.post(
    `/staff/deliveries/${id}/accept`
  );

  return unwrap(response);
}

export async function staffOutForDelivery(
  id
) {
  const response = await api.post(
    `/staff/deliveries/${id}/out-for-delivery`
  );

  return unwrap(response);
}

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