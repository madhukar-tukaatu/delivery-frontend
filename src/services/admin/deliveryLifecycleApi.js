import api from "@/lib/api";

export async function merchantQuoteShipment(payload) {
  const { data } = await api.post("/merchant/shipments/quote", payload);
  return data.data;
}

export async function merchantCreateShipment(payload) {
  const { data } = await api.post("/merchant/shipments", payload);
  return data;
}

export async function adminQuoteShipment(payload) {
  const { data } = await api.post("/admin/shipments/quote", payload);
  return data.data;
}

export async function adminCreateShipment(payload) {
  const { data } = await api.post("/admin/shipments", payload);
  return data;
}

export async function getAdminShipmentLifecycle(shipmentId) {
  const { data } = await api.get(`/admin/shipments/${shipmentId}/lifecycle`);
  return data.data;
}

export async function assignPickupStaff(shipmentId, staffId) {
  const { data } = await api.post(`/admin/shipments/${shipmentId}/assign-pickup`, {
    staff_id: staffId,
  });
  return data.data;
}

export async function receiveShipmentAtOrigin(shipmentId, remarks = "") {
  const { data } = await api.post(`/admin/shipments/${shipmentId}/receive-origin`, {
    remarks,
  });
  return data.data;
}

export async function createTransferBatch(payload) {
  const { data } = await api.post("/admin/shipments/transfer-batches", payload);
  return data.data;
}

export async function dispatchTransferBatch(batchId) {
  const { data } = await api.post(`/admin/shipments/transfer-batches/${batchId}/dispatch`);
  return data.data;
}

export async function receiveTransferBatch(batchId) {
  const { data } = await api.post(`/admin/shipments/transfer-batches/${batchId}/receive`);
  return data.data;
}

export async function assignDeliveryRider(shipmentId, riderId) {
  const { data } = await api.post(`/admin/shipments/${shipmentId}/assign-delivery`, {
    rider_id: riderId,
  });
  return data.data;
}

export async function getStaffPickups() {
  const { data } = await api.get("/staff/pickups");
  return data.data;
}

export async function acceptPickup(pickupId) {
  const { data } = await api.post(`/staff/pickups/${pickupId}/accept`);
  return data.data;
}

export async function markPickupPickedUp(pickupId, payload) {
  const { data } = await api.post(`/staff/pickups/${pickupId}/picked-up`, payload);
  return data.data;
}

export async function getStaffDeliveries() {
  const { data } = await api.get("/staff/deliveries");
  return data.data;
}

export async function acceptDelivery(deliveryId) {
  const { data } = await api.post(`/staff/deliveries/${deliveryId}/accept`);
  return data.data;
}

export async function markOutForDelivery(deliveryId) {
  const { data } = await api.post(`/staff/deliveries/${deliveryId}/out-for-delivery`);
  return data.data;
}

export async function markDeliveryDelivered(deliveryId, payload) {
  const { data } = await api.post(`/staff/deliveries/${deliveryId}/delivered`, payload);
  return data.data;
}

export async function markDeliveryFailed(deliveryId, payload) {
  const { data } = await api.post(`/staff/deliveries/${deliveryId}/failed`, payload);
  return data.data;
}

export async function getCodCollections() {
  const { data } = await api.get("/admin/accounts/pod-collections");
  return data.data;
}

export async function confirmRiderDeposit(payload) {
  const { data } = await api.post("/admin/accounts/rider-deposits", payload);
  return data.data;
}

export async function createMerchantSettlement(payload) {
  const { data } = await api.post("/admin/accounts/merchant-settlements", payload);
  return data.data;
}

export async function markSettlementPaid(settlementId, remarks = "") {
  const { data } = await api.post(`/admin/accounts/merchant-settlements/${settlementId}/mark-paid`, { remarks });
  return data.data;
}
