import api from "@/lib/api";

export async function createMerchantShipment(payload) {
  const response = await api.post("/merchant/shipments", payload);
  return response.data?.data || response.data;
}

export async function getMerchantPickupLocations() {
  const response = await api.get("/merchant/pickup-locations");
  return response.data?.data || response.data;
}

function normalizeShipmentResponse(response) {
  const payload = response?.data?.data || response?.data || {};

  const resource = payload?.shipments || payload;

  const list = Array.isArray(resource) ? resource : resource?.data || [];

  return {
    list: Array.isArray(list) ? list : [],

    currentPage: Number(resource?.current_page || 1),

    pageSize: Number(resource?.per_page || 20),

    total: Number(resource?.total || list.length),
  };
}

export async function getShipments(params = {}) {
  const response = await api.get("/admin/shipments", {
    params,
  });

  return normalizeShipmentResponse(response);
}

export async function getShipmentsByBranchId(branchId, params = {}) {
  if (!branchId) {
    throw new Error("Branch ID is required to load shipments.");
  }

  const response = await api.get(`/admin/branches/${branchId}/shipments`, {
    params,
  });

  return normalizeShipmentResponse(response);
}
