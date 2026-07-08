import api from '@/lib/api';

export async function registerMerchant(formData) {
  const res = await api.post('/public/merchant-register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data || res.data;
}

export async function getMerchantApplications(params = {}) {
  const res = await api.get('/admin/merchant-applications', { params });
  return res.data.data || res.data;
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
