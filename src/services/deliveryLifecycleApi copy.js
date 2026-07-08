import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data;
}

export async function getMerchantPickupLocations() {
  const response = await api.get("/merchant/pickup-locations");
  return unwrap(response) || [];
}

export async function merchantQuoteShipment(payload) {
  const response = await api.post("/merchant/shipments/quote", payload);
  return unwrap(response);
}

export async function merchantCreateShipment(payload) {
  const response = await api.post("/merchant/shipments", payload);
  return unwrap(response);
}

export async function getMerchantShipment(shipmentId) {
  const response = await api.get(`/merchant/shipments/${shipmentId}`);
  return unwrap(response);
}

export async function storeApiCreateShipment(apiKey, idempotencyKey, payload) {
  const response = await api.post("/store/shipments", payload, {
    headers: {
      "X-API-KEY": apiKey,
      "Idempotency-Key": idempotencyKey,
    },
  });
  return unwrap(response);
}
