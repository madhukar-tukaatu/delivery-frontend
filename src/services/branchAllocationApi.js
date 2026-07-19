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

export async function getBranches(params = {}) {
  const response = await api.get("/admin/branches", { params });
  return response.data;
}

export async function createBranch(payload) {
  const response = await api.post("/admin/branches", payload);
  return response.data;
}

export async function updateBranch(id, payload) {
  const response = await api.put(`/admin/branches/${id}`, payload);
  return response.data;
}

export async function deleteBranch(id) {
  const response = await api.delete(`/admin/branches/${id}`);
  return response.data;
}

export async function getBranchParentOptions(type) {
  const response = await api.get("/admin/branches/parent-options", {
    params: { type },
  });

  return response.data;
}

export async function approveBranch(id) {
  const response = await api.post(`/admin/branches/${id}/approve`);
  return response.data;
}

export async function activateBranch(id) {
  const response = await api.post(`/admin/branches/${id}/activate`);
  return response.data;
}

export async function suspendBranch(id, reason = "Suspended from admin panel.") {
  const response = await api.post(`/admin/branches/${id}/suspend`, {
    reason,
  });

  return response.data;
}

export async function rejectBranch(id, reason = "Rejected from admin panel.") {
  const response = await api.post(`/admin/branches/${id}/reject`, {
    reason,
  });

  return response.data;
}