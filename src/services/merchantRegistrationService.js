import api from '@/lib/api';

export async function registerMerchant(formData) {
  const res = await api.post('/public/merchant-register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data || res.data;
}

export async function getMerchantApplications(params = {}) {
  const res = await api.get('/admin/merchant-applications', { params });
  const payload = res.data?.data || res.data;
  // paginated: { data: [...], total, per_page, ... }
  if (Array.isArray(payload?.data)) {
    return { list: payload.data, total: payload.total, per_page: payload.per_page };
  }
  return { list: Array.isArray(payload) ? payload : [], total: 0, per_page: 20 };
}

export async function getMerchantApplication(id) {
  const res = await api.get(`/admin/merchant-applications/${id}`);
  return res.data.data || res.data;
}

export async function approveMerchant(id, payload) {
  const res = await api.post(`/admin/merchants/${id}/approve`, payload);
  return res.data.data || res.data;
}

export async function rejectMerchant(id, payload) {
  const res = await api.post(`/admin/merchants/${id}/reject`, payload);
  return res.data.data || res.data;
}

export async function requestMerchantInfo(id, payload) {
  const res = await api.post(`/admin/merchants/${id}/request-more-info`, payload);
  return res.data.data || res.data;
}
