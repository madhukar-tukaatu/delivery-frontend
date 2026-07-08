import api from "@/lib/api";

export async function getMerchantApplication(id) {
  const response = await api.get(`/admin/merchant-applications/${id}`);
  return response.data?.data || response.data;
}

export async function getBranches() {
  const response = await api.get("/admin/branches");
  const data = response.data?.data || response.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}
export async function getSubBranches() {
  const response = await api.get("/admin/branches");
  const data = response.data?.data || response.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export async function approveMerchantApplication(id, payload) {
  const response = await api.post(`/admin/merchant-applications/${id}/approve`, payload);
  return response.data?.data || response.data;
}

export async function rejectMerchantApplication(id, reason) {
  const response = await api.post(`/admin/merchant-applications/${id}/reject`, {
    reason,
  });

  return response.data?.data || response.data;
}

export async function requestMerchantMoreInfo(id, message) {
  const response = await api.post(`/admin/merchant-applications/${id}/request-more-info`, {
    message,
  });

  return response.data?.data || response.data;
}

// export async function downloadMerchantDocument(documentId) {
//   const response = await api.get(`/merchant/documents/${documentId}/download`, {
//     responseType: "blob",
//   });

//   return response.data;
// }

// export async function previewMerchantDocument(documentId) {
//   const response = await api.get(`/merchant-documents/${documentId}/preview`, {
//     responseType: "blob",
//   });

//   return response.data;
// }

// export async function downloadMerchantDocument(documentId) {
//   const response = await api.get(`/merchant-documents/${documentId}/download`, {
//     responseType: "blob",
//   });

//   return response.data;
// }


export async function previewMerchantDocument(documentId) {
  const response = await api.get(`/merchant-documents/${documentId}/preview`, {
    responseType: "blob",
  });

  return response.data;
}

export async function downloadMerchantDocument(documentId) {
  const response = await api.get(`/merchant-documents/${documentId}/download`, {
    responseType: "blob",
  });

  return response.data;
}