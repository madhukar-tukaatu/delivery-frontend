import api from '@/lib/api';

export async function createMerchantShipment(payload) {
  const response = await api.post('/merchant/shipments', payload);
  return response.data?.data || response.data;
}

export async function getMerchantPickupLocations() {
  const response = await api.get('/merchant/pickup-locations');
  return response.data?.data || response.data;
}
