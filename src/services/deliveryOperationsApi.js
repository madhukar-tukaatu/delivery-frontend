import api from "@/lib/api";

function unwrap(response) {
  return response.data?.data ?? response.data;
}

export async function getMerchantPickupLocations() {
  const response = await api.get("/merchant/pickup-locations");
  return unwrap(response);
}

export async function merchantQuoteShipment(payload) {
  const response = await api.post("/merchant/shipments/quote", payload);
  return unwrap(response);
}

export async function merchantCreateShipment(payload) {
  const response = await api.post("/merchant/shipments", payload);
  return unwrap(response);
}

export async function merchantGetShipment(id) {
  const response = await api.get(`/merchant/shipments/${id}`);
  return unwrap(response);
}

export async function getMerchantShipment(id) {
  const response = await api.get(`/merchant/shipments/${id}`);
  return unwrap(response);
}

export async function adminQuoteShipment(payload) {
  const response = await api.post("/admin/shipments/quote", payload);
  return unwrap(response);
}

export async function adminCreateShipment(payload) {
  const response = await api.post("/admin/shipments", payload);
  return unwrap(response);
}

export async function adminGetShipment(id) {
  const response = await api.get(`/admin/shipments/${id}`);
  return unwrap(response);
}

export async function adminAssignPickup(shipmentId, staffId) {
  const response = await api.post(`/admin/shipments/${shipmentId}/assign-pickup`, { staff_id: staffId });
  return unwrap(response);
}

export async function adminReceiveOrigin(shipmentId, note) {
  const response = await api.post(`/admin/shipments/${shipmentId}/receive-origin`, { note });
  return unwrap(response);
}

export async function adminCreateTransfer(shipmentId, payload) {
  const response = await api.post(`/admin/shipments/${shipmentId}/create-transfer`, payload);
  return unwrap(response);
}

export async function adminDispatchTransfer(batchId) {
  const response = await api.post(`/admin/transfers/${batchId}/dispatch`);
  return unwrap(response);
}

export async function adminReceiveTransfer(batchId) {
  const response = await api.post(`/admin/transfers/${batchId}/receive`);
  return unwrap(response);
}

export async function adminAssignDelivery(shipmentId, riderId) {
  const response = await api.post(`/admin/shipments/${shipmentId}/assign-delivery`, { rider_id: riderId });
  return unwrap(response);
}

export async function staffGetPickups() {
  const response = await api.get("/staff/pickups");
  return unwrap(response);
}

export async function staffAcceptPickup(id) {
  const response = await api.post(`/staff/pickups/${id}/accept`);
  return unwrap(response);
}

export async function staffPickedUp(id, note) {
  const response = await api.post(`/staff/pickups/${id}/picked-up`, { note });
  return unwrap(response);
}

export async function staffGetDeliveries() {
  const response = await api.get("/staff/deliveries");
  return unwrap(response);
}

export async function staffAcceptDelivery(id) {
  const response = await api.post(`/staff/deliveries/${id}/accept`);
  return unwrap(response);
}

export async function staffOutForDelivery(id) {
  const response = await api.post(`/staff/deliveries/${id}/out-for-delivery`);
  return unwrap(response);
}

export async function staffMarkDelivered(id, payload) {
  const response = await api.post(`/staff/deliveries/${id}/delivered`, payload);
  return unwrap(response);
}

export async function staffMarkFailed(id, reason) {
  const response = await api.post(`/staff/deliveries/${id}/failed`, { reason });
  return unwrap(response);
}

export async function accountsGetCodPending() {
  const response = await api.get("/admin/accounts/pod-pending");
  return unwrap(response);
}

export async function accountsConfirmCodDeposit(codId, payload) {
  const response = await api.post(`/admin/accounts/pod/${codId}/confirm-deposit`, payload);
  return unwrap(response);
}

export async function accountsGetSettlements() {
  const response = await api.get("/admin/accounts/settlements");
  return unwrap(response);
}

export async function accountsCreateSettlement(payload) {
  const response = await api.post("/admin/accounts/settlements", payload);
  return unwrap(response);
}

export async function accountsMarkSettlementPaid(id) {
  const response = await api.post(`/admin/accounts/settlements/${id}/mark-paid`);
  return unwrap(response);
}
