import api from "@/lib/api";

export async function createMerchantShipment(payload) {
  const response = await api.post("/merchant/shipments", payload);
  return response.data?.data || response.data;
}

export async function getMerchantPickupLocations() {
  const response = await api.get("/merchant/pickup-locations");
  return response.data?.data || response.data;
}

export async function getShipments(params = {}) {
  const response = await api.get("/admin/shipments", {
    params,
  });

  return normalizeShipmentResponse(response, params);
}

/**
 * Get a single shipment.
 */
export async function getShipment(id) {
  const response = await api.get(`/admin/shipments/${id}`);

  return response.data?.data ?? response.data;
}

/**
 * Normalize Laravel pagination response.
 *
 * Expected Laravel response:
 *
 * {
 *   data: {
 *     data: [...],
 *     current_page: 1,
 *     per_page: 20,
 *     total: 100
 *   }
 * }
 */
function normalizeShipmentResponse(response, params = {}) {
  const payload = response.data?.data ?? response.data;

  const list = payload?.data ?? [];

  return {
    list: Array.isArray(list) ? list : [],

    currentPage: Number(payload?.current_page ?? params.page ?? 1),

    pageSize: Number(payload?.per_page ?? params.per_page ?? 20),

    total: Number(payload?.total ?? 0),
  };
}
