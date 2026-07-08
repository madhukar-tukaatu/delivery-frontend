import api from '@/lib/api';

export async function getPickupLocations(params = {}) {
  const res = await api.get('/merchant/pickup-locations', { params });
  return res.data.data || res.data;
}

export async function createPickupLocation(payload) {
  const res = await api.post('/merchant/pickup-locations', payload);
  return res.data.data || res.data;
}

export async function updatePickupLocation(id, payload) {
  const res = await api.put(`/merchant/pickup-locations/${id}`, payload);
  return res.data.data || res.data;
}

export async function deletePickupLocation(id) {
  const res = await api.delete(`/merchant/pickup-locations/${id}`);
  return res.data.data || res.data;
}
