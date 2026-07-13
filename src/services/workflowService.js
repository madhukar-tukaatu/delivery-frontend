import api from '@/lib/api';
import { unwrapApi, unwrapPaginated } from '@/config/workflowStatus';

export async function getStaffPickups(params = {}) {
  const response = await api.get('/staff/pickups', { params });
  return unwrapPaginated(response);
}

export async function markPickupPickedUp(pickupId, payload = {}) {
  const response = await api.post(`/staff/pickups/${pickupId}/picked-up`, payload);
  return unwrapApi(response);
}

export async function markPickupFailed(pickupId, payload = {}) {
  const response = await api.post(`/staff/pickups/${pickupId}/failed`, payload);
  return unwrapApi(response);
}

export async function getStaffDeliveries(params = {}) {
  const response = await api.get('/staff/deliveries', { params });
  return unwrapPaginated(response);
}

export async function markDeliveryOutForDelivery(deliveryId, payload = {}) {
  const response = await api.post(`/staff/deliveries/${deliveryId}/out-for-delivery`, payload);
  return unwrapApi(response);
}

export async function markDeliveryDelivered(deliveryId, payload = {}) {
  const response = await api.post(`/staff/deliveries/${deliveryId}/delivered`, payload);
  return unwrapApi(response);
}

export async function markDeliveryFailed(deliveryId, payload = {}) {
  const response = await api.post(`/staff/deliveries/${deliveryId}/failed`, payload);
  return unwrapApi(response);
}

export async function getAdminShipment(id) {
  const response = await api.get(`/admin/shipments/${id}`);
  return unwrapApi(response);
}

export async function receiveOriginSubBranch(shipmentId, payload = {}) {
  const response = await api.post(`/admin/shipments/${shipmentId}/receive-origin-sub-branch`, payload);
  return unwrapApi(response);
}

export async function dispatchNextRouteStep(shipmentId, payload = {}) {
  const response = await api.post(`/admin/shipments/${shipmentId}/dispatch-next-step`, payload);
  return unwrapApi(response);
}

export async function receiveCurrentRouteStep(shipmentId, payload = {}) {
  const response = await api.post(`/admin/shipments/${shipmentId}/receive-current-step`, payload);
  return unwrapApi(response);
}


export async function getAdminShipments(params = {}) {
  const response = await api.get('/admin/shipments', { params });
  return response.data;
}

// export async function getAdminShipment(id) {
//   const response = await api.get(`/admin/shipments/${id}`);
//   return response.data;
// }

// export async function receiveOriginSubBranch(id) {
//   const response = await api.post(`/admin/shipments/${id}/receive-origin-sub-branch`);
//   return response.data;
// }

// export async function dispatchNextRouteStep(id) {
//   const response = await api.post(`/admin/shipments/${id}/dispatch-next-route-step`);
//   return response.data;
// }

// export async function receiveCurrentRouteStep(id) {
//   const response = await api.post(`/admin/shipments/${id}/receive-current-route-step`);
//   return response.data;
// }

export async function getShipmentTasks(params = {}) {
  const response = await api.get('/admin/shipment-tasks', { params });
  return response.data;
}

export async function assignShipmentTask(id, payload) {
  const response = await api.post(`/admin/shipment-tasks/${id}/assign`, payload);
  return response.data;
}

export async function updateShipmentTaskStatus(id, payload) {
  const response = await api.post(`/admin/shipment-tasks/${id}/status`, payload);
  return response.data;
}
