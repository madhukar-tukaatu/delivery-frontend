import api from "@/lib/api";
import {
  normalizeShipmentDetailResponse,
} from "@/services/merchantShipmentService";

/*
|--------------------------------------------------------------------------
| Shipment
|--------------------------------------------------------------------------
*/

export async function getAdminShipment(id) {
  const response = await api.get(`/admin/shipments/${id}`);

  return normalizeShipmentDetailResponse(response);
}

export async function receiveOriginSubBranch(
  shipmentId,
  payload = {}
) {
  const response = await api.post(
    `/admin/shipments/${shipmentId}/receive-origin-sub-branch`,
    payload
  );

  return response.data?.data ?? response.data;
}

export async function dispatchNextRouteStep(
  shipmentId,
  payload = {}
) {
  const response = await api.post(
    `/admin/shipments/${shipmentId}/dispatch-next-step`,
    payload
  );

  return response.data?.data ?? response.data;
}

export async function receiveCurrentRouteStep(
  shipmentId,
  payload = {}
) {
  const response = await api.post(
    `/admin/shipments/${shipmentId}/receive-current-step`,
    payload
  );

  return response.data?.data ?? response.data;
}

/*
|--------------------------------------------------------------------------
| Shipment tasks
|--------------------------------------------------------------------------
*/

export async function getShipmentTasks(params = {}) {
  const response = await api.get(
    "/admin/shipment-tasks",
    { params }
  );

  return response.data?.data ?? response.data;
}

export async function assignShipmentTask(
  id,
  payload
) {
  const response = await api.post(
    `/admin/shipment-tasks/${id}/assign`,
    payload
  );

  return response.data?.data ?? response.data;
}

export async function updateShipmentTaskStatus(
  id,
  payload
) {
  const response = await api.post(
    `/admin/shipment-tasks/${id}/status`,
    payload
  );

  return response.data?.data ?? response.data;
}