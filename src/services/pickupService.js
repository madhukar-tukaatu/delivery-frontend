import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

/**
 * Normalize pickup list.
 */
function normalizePickupList(
  response,
  params = {}
) {
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
    list: Array.isArray(payload?.data)
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
 * Get pickups visible to the authenticated
 * branch manager.
 *
 * Backend MUST apply branch scope.
 *
 * GET /admin/pickups
 */
export async function getPickups(
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

  return normalizePickupList(
    response,
    params
  );
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

  const response = await api.get(
    `/admin/pickups/${id}`
  );

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
export async function getPickupAssignableStaff(
  id
) {
  if (!id) {
    throw new Error("Pickup ID is required.");
  }

  const response = await api.get(
    `/admin/pickups/${id}/assignable-staff`
  );

  const data = unwrap(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
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
export async function assignPickup(
  id,
  staffId
) {
  if (!id) {
    throw new Error("Pickup ID is required.");
  }

  if (!staffId) {
    throw new Error("Staff ID is required.");
  }

  const response = await api.post(
    `/admin/pickups/${id}/assign`,
    {
      staff_id: staffId,
    }
  );

  return unwrap(response);
}

/**
 * Fail/cancel pickup from admin/branch manager side.
 *
 * POST /admin/pickups/{id}/fail
 */
export async function failPickup(
  id,
  reason
) {
  if (!id) {
    throw new Error("Pickup ID is required.");
  }

  const response = await api.post(
    `/admin/pickups/${id}/fail`,
    {
      reason,
    }
  );

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
    `/admin/pickups/${pickupId}/shipments/${shipmentId}/receive`,
    payload
  );

  return unwrap(response);
}