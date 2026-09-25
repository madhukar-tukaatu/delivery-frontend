import api from "@/lib/api";

/**
 * Create shipment from merchant portal.
 */
export async function createMerchantShipment(payload) {
  const response = await api.post("/merchant/shipments", payload);

  return response.data?.data ?? response.data;
}

/**
 * Get merchant pickup locations.
 */
export async function getMerchantPickupLocations() {
  const response = await api.get("/merchant/pickup-locations");

  return response.data?.data ?? response.data;
}

/**
 * Get admin shipments.
 *
 * Backend automatically applies branch scope.
 *
 * Super admin:
 *   - sees all shipments
 *   - may send branch_id as a filter
 *
 * Branch users:
 *   - backend ignores/overrides branch_id
 *   - only their authorized branch shipments are returned
 */
export async function getShipments(params = {}) {
  const response = await api.get("/admin/shipments", {
    params,
  });

  return normalizeShipmentListResponse(response, params);
}

/**
 * Get one shipment.
 *
 * The response is normalized here so pages/components
 * do not need to know Laravel's response structure.
 */
export async function getShipment(id) {
  const response = await api.get(`/admin/shipments/${id}`);

  return normalizeShipmentDetailResponse(response);
}

/**
 * Alias used by workflow pages.
 */
export async function getAdminShipment(id) {
  return getShipment(id);
}

/**
 * Normalize shipment list response.
 *
 * Supports:
 *
 * {
 *   data: {
 *      data: [],
 *      current_page: 1,
 *      per_page: 20,
 *      total: 100
 *   }
 * }
 */
export function normalizeShipmentListResponse(response, params = {}) {
  const payload =
    response?.data?.data ??
    response?.data ??
    response;

  const list = payload?.data ?? [];

  return {
    list: Array.isArray(list) ? list : [],

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
      0
    ),
  };
}

/**
 * Normalize shipment detail response.
 *
 * Backend may return:
 *
 * {
 *   data: {
 *      shipment: {...},
 *      tracking_events: [...]
 *   }
 * }
 *
 * OR:
 *
 * {
 *   data: {...shipment}
 * }
 */
export function normalizeShipmentDetailResponse(response) {
  const payload =
    response?.data ??
    response;

  /*
   * Already normalized:
   */
  if (payload?.shipment) {
    return {
      shipment: payload.shipment,
      tracking_events:
        payload.tracking_events ??
        payload.trackingEvents ??
        [],
      tasks:
        payload.tasks ??
        [],
      price_breakdown:
        payload.price_breakdown ??
        payload.priceBreakdown ??
        null,
      status_logs:
        payload.status_logs ??
        payload.statusLogs ??
        [],
      notifications:
        payload.notifications ??
        [],
    };
  }

  /*
   * Laravel:
   *
   * data:
   * {
   *   shipment: ...
   * }
   */
  if (payload?.data?.shipment) {
    const data = payload.data;

    return {
      shipment: data.shipment,

      tracking_events:
        data.tracking_events ??
        data.trackingEvents ??
        [],

      tasks:
        data.tasks ??
        [],

      price_breakdown:
        data.price_breakdown ??
        data.priceBreakdown ??
        null,

      status_logs:
        data.status_logs ??
        data.statusLogs ??
        [],

      notifications:
        data.notifications ??
        [],
    };
  }

  /*
   * Laravel directly returns shipment:
   *
   * data:
   * {
   *   id: ...
   * }
   */
  if (payload?.data && !payload.data.shipment) {
    const shipment = payload.data;

    return {
      shipment,

      tracking_events:
        shipment.tracking_events ??
        shipment.trackingEvents ??
        [],

      tasks:
        shipment.tasks ??
        [],

      price_breakdown:
        shipment.price_breakdown ??
        shipment.priceBreakdown ??
        null,

      status_logs:
        shipment.status_logs ??
        shipment.statusLogs ??
        [],

      notifications:
        shipment.notifications ??
        [],
    };
  }

  return {
    shipment: payload,
    tracking_events:
      payload?.tracking_events ??
      payload?.trackingEvents ??
      [],

    tasks:
      payload?.tasks ??
      [],

    price_breakdown:
      payload?.price_breakdown ??
      null,

    status_logs:
      payload?.status_logs ??
      [],

    notifications:
      payload?.notifications ??
      [],
  };
}