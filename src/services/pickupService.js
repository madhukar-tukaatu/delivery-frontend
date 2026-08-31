import api from "@/lib/api";

/**
 * --------------------------------------------------------------------------
 * Admin / Branch Manager
 * --------------------------------------------------------------------------
 */

/**
 * Get pickup requests.
 *
 * Backend applies branch scope.
 *
 * Super admin:
 *   - can see all authorized pickups
 *   - may optionally filter by branch_id
 *
 * Branch manager / branch staff:
 *   - backend restricts results to their branch scope
 */
export async function getPickups(params = {}) {
  const response = await api.get("/admin/pickups", {
    params: {
      per_page: 20,
      ...params,
    },
  });

  return normalizePickupListResponse(response, params);
}

/**
 * Get one pickup request.
 */
export async function getPickup(id) {
  const response = await api.get(`/admin/pickups/${id}`);

  return response.data?.data ?? response.data;
}

/**
 * Assign pickup to a staff/rider.
 *
 * Expected payload:
 *
 * {
 *   staff_id: 123
 * }
 *
 * The backend should verify that the staff member
 * belongs to the manager's authorized branch.
 */
export async function assignPickup(id, payload) {
  const response = await api.post(
    `/admin/pickups/${id}/assign`,
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * Fail pickup.
 */
export async function failPickup(id, payload) {
  const response = await api.post(
    `/admin/pickups/${id}/fail`,
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * Receive a shipment into the origin branch
 * after pickup collection.
 */
export async function receivePickupShipment(
  pickupId,
  shipmentId,
  payload = {}
) {
  const response = await api.post(
    `/admin/pickups/${pickupId}/shipments/${shipmentId}/receive`,
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * --------------------------------------------------------------------------
 * Staff / Rider
 * --------------------------------------------------------------------------
 */

/**
 * Get pickup jobs assigned to the authenticated staff/rider.
 */
export async function staffGetPickups(params = {}) {
  const response = await api.get("/staff/pickups", {
    params,
  });

  const payload =
    response.data?.data ??
    response.data;

  /*
   * Supports Laravel pagination as well as
   * a plain array response.
   */
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

/**
 * Staff accepts an assigned pickup.
 *
 * POST /staff/pickups/{pickup}/start
 *
 * Depending on your backend workflow, this can represent
 * the transition from assigned -> started.
 */
export async function staffAcceptPickup(id, payload = {}) {
  const response = await api.post(
    `/staff/pickups/${id}/start`,
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * Staff marks a pickup as arrived.
 */
export async function staffArrivePickup(id, payload = {}) {
  const response = await api.post(
    `/staff/pickups/${id}/arrive`,
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * Staff collects one shipment.
 */
export async function staffCollectShipment(
  pickupId,
  shipmentId,
  payload = {}
) {
  const response = await api.post(
    `/staff/pickups/${pickupId}/shipments/${shipmentId}/collect`,
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * Staff completes the pickup.
 */
export async function staffCompletePickup(
  id,
  payload = {}
) {
  const response = await api.post(
    `/staff/pickups/${id}/complete`,
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * Staff fails the pickup.
 */
export async function staffFailPickup(
  id,
  payload
) {
  const response = await api.post(
    `/staff/pickups/${id}/fail`,
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * Staff receives a shipment into the branch.
 *
 * Usually this is performed by branch receiving staff
 * rather than the pickup rider, but the API supports
 * the route defined by the backend.
 */
export async function staffReceivePickupShipment(
  pickupId,
  shipmentId,
  payload = {}
) {
  const response = await api.post(
    `/staff/pickups/${pickupId}/shipments/${shipmentId}/receive`,
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * --------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------
 */

function normalizePickupListResponse(
  response,
  params = {}
) {
  const payload =
    response?.data?.data ??
    response?.data ??
    response;

  /*
   * Laravel paginator:
   *
   * {
   *   data: [...],
   *   current_page: 1,
   *   per_page: 20,
   *   total: 100
   * }
   */

  const list = Array.isArray(payload)
    ? payload
    : payload?.data ?? [];

  return {
    list: Array.isArray(list)
      ? list
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
      payload?.total ??
        list.length ??
        0
    ),
  };
}