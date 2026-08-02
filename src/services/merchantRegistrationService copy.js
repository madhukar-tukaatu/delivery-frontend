import api from "@/lib/api";

export async function getMerchantApplications(params = {}) {
  const response = await api.get("/admin/merchant-applications", { params });
  const body = response?.data || {};
  const meta = body?.meta || {};

  return {
    list: Array.isArray(body?.data) ? body.data : [],
    total: Number(meta?.total || 0),
    page: Number(meta?.current_page || 1),
    pageSize: Number(meta?.per_page || params?.per_page || 20),
    lastPage: Number(meta?.last_page || 1),
    counts: meta?.counts || {},
    sourceCounts: meta?.source_counts || {},
  };
}

export async function getMerchantApplication(id) {
  const response = await api.get(`/admin/merchant-applications/${id}`);
  return response?.data?.data || null;
}

export async function approveMerchantApplication(id, payload) {
  const response = await api.post(
    `/admin/merchant-applications/${id}/approve`,
    payload,
  );

  return response?.data;
}

export async function requestMerchantMoreInfo(id, reason) {
  const response = await api.post(
    `/admin/merchant-applications/${id}/request-more-info`,
    { reason },
  );

  return response?.data;
}

export async function rejectMerchantApplication(id, reason) {
  const response = await api.post(
    `/admin/merchant-applications/${id}/reject`,
    { reason },
  );

  return response?.data;
}
