// services/pickupService.js

import api from '@/lib/api';

export async function getPickups(params = {}) {
  const response = await api.get('/admin/pickups', {
    params: {
      per_page: 20,
      ...params,
    },
  });

  return response.data?.data ?? response.data;
}

export async function getPickup(id) {
  const response = await api.get(`/admin/pickups/${id}`);

  return response.data?.data ?? response.data;
}

export async function assignPickup(id, payload) {
  const response = await api.post(
    `/admin/pickups/${id}/assign`,
    payload
  );

  return response.data?.data ?? response.data;
}

export async function failPickup(id, payload) {
  const response = await api.post(
    `/admin/pickups/${id}/fail`,
    payload
  );

  return response.data?.data ?? response.data;
}

export async function receivePickupShipment(
  pickupId,
  shipmentId,
  payload = {}
) {
  const response = await api.post(
    `/admin/pickups/${pickupId}/shipments/${shipmentId}/receive`,
    payload
  );

  return response.data?.data ?? response.data;
}