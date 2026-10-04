import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

export async function listMarketplaces(params = {}) {
  const response = await api.get("/admin/marketplaces", { params });
  const data = unwrap(response);
  return Array.isArray(data) ? data : [];
}

export async function getMarketplace(id) {
  const response = await api.get(`/admin/marketplaces/${id}`);
  return unwrap(response);
}

export async function createMarketplace(payload) {
  const response = await api.post("/admin/marketplaces", payload);
  return unwrap(response);
}

export async function updateMarketplace(id, payload) {
  const response = await api.put(`/admin/marketplaces/${id}`, payload);
  return unwrap(response);
}

export async function saveMarketplaceHamroPay(id, payload) {
  const response = await api.post(`/admin/marketplaces/${id}/hamropay`, payload);
  return unwrap(response);
}

export async function syncMarketplaceStores(id, merchantIds, action = "attach") {
  const response = await api.post(`/admin/marketplaces/${id}/stores`, {
    merchant_ids: merchantIds,
    action,
  });
  return unwrap(response);
}

export async function reissueMarketplaceApiKey(id, payload = {}) {
  const response = await api.post(`/admin/marketplaces/${id}/api-keys/reissue`, payload);
  return unwrap(response);
}

export async function deleteMarketplace(id) {
  const response = await api.delete(`/admin/marketplaces/${id}`);
  return unwrap(response);
}

