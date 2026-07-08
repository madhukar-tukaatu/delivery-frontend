import api from "@/lib/api";

function unwrapData(response) {
  return response?.data?.data || response?.data || null;
}

export async function getBranches(params = {}) {
  const response = await api.get("/admin/branches", { params });
  return response.data;
}

export async function getBranch(id) {
  const response = await api.get(`/admin/branches/${id}`);
  return unwrapData(response);
}

export async function createBranch(payload) {
  const response = await api.post("/admin/branches", payload);
  return unwrapData(response);
}

export async function updateBranch(id, payload) {
  const response = await api.put(`/admin/branches/${id}`, payload);
  return unwrapData(response);
}

export async function deleteBranch(id) {
  const response = await api.delete(`/admin/branches/${id}`);
  return response.data;
}

export async function approveBranch(id) {
  const response = await api.post(`/admin/branches/${id}/approve`);
  return unwrapData(response);
}

export async function activateBranch(id) {
  const response = await api.post(`/admin/branches/${id}/activate`);
  return unwrapData(response);
}

export async function suspendBranch(id, reason = "") {
  const response = await api.post(`/admin/branches/${id}/suspend`, {
    reason,
  });

  return unwrapData(response);
}

export async function rejectBranch(id, reason) {
  const response = await api.post(`/admin/branches/${id}/reject`, {
    reason,
  });

  return unwrapData(response);
}

export async function getBranchParentOptions(type) {
  const response = await api.get("/admin/branches/parent-options", {
    params: { type },
  });

  return response.data?.data || [];
}

export async function uploadBranchDocument(branchId, formData) {
  const response = await api.post(
    `/admin/branches/${branchId}/documents`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return unwrapData(response);
}

export async function previewBranchDocument(documentId) {
  const response = await api.get(
    `/admin/branch-documents/${documentId}/preview`,
    {
      responseType: "blob",
    }
  );

  return response.data;
}

export async function downloadBranchDocument(documentId) {
  const response = await api.get(
    `/admin/branch-documents/${documentId}/download`,
    {
      responseType: "blob",
    }
  );

  return response.data;
}

export async function uploadBranchAgreement(branchId, formData) {
  const response = await api.post(
    `/admin/branches/${branchId}/agreements`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return unwrapData(response);
}

export async function previewBranchAgreement(agreementId) {
  const response = await api.get(
    `/admin/branch-agreements/${agreementId}/preview`,
    {
      responseType: "blob",
    }
  );

  return response.data;
}

export async function downloadBranchAgreement(agreementId) {
  const response = await api.get(
    `/admin/branch-agreements/${agreementId}/download`,
    {
      responseType: "blob",
    }
  );

  return response.data;
}