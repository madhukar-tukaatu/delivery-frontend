import api from "@/lib/api";

export async function getCoverageLocations(params = {}) {
  const response = await api.get("/admin/coverage-locations", { params });
  return response.data;
}

export async function getCoverageMap(params = {}) {
  const response = await api.get("/admin/coverage-locations/map", { params });
  return response.data;
}

export async function createCoverageLocation(payload) {
  const response = await api.post("/admin/coverage-locations", payload);
  return response.data;
}

export async function updateCoverageLocation(id, payload) {
  const response = await api.put(`/admin/coverage-locations/${id}`, payload);
  return response.data;
}

export async function deleteCoverageLocation(id) {
  const response = await api.delete(`/admin/coverage-locations/${id}`);
  return response.data;
}

export async function getBranchOffices(params = {}) {
  const response = await api.get("/admin/branches", { params });
  return response.data;
}

export async function createBranchOffice(payload) {
  const response = await api.post("/admin/branches", payload);
  return response.data;
}

export async function updateBranchOffice(id, payload) {
  const response = await api.put(`/admin/branches/${id}`, payload);
  return response.data;
}

export async function deleteBranchOffice(id) {
  const response = await api.delete(`/admin/branches/${id}`);
  return response.data;
}