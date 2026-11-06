import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export async function getTransportSummary() {
  const response = await api.get("/v1/transport/summary");
  return unwrap(response) || { active_trips: 0, trips_on_road: 0, moving_parcels: 0, moving_weight_kg: 0 };
}

export async function recommendFleet(payload) {
  const response = await api.post("/v1/transport/recommend-fleet", payload);
  return unwrap(response);
}

export async function getVehicles(params = {}) {
  const response = await api.get("/v1/transport/vehicles", { params });
  return unwrap(response);
}

export async function createVehicle(payload) {
  const response = await api.post("/v1/transport/vehicles", payload);
  return unwrap(response);
}

export async function updateVehicle(id, payload) {
  const response = await api.put(`/v1/transport/vehicles/${id}`, payload);
  return unwrap(response);
}

export async function getDrivers(params = {}) {
  const response = await api.get("/v1/transport/drivers", { params });
  return unwrap(response);
}

export async function createDriver(payload) {
  const response = await api.post("/v1/transport/drivers", payload);
  return unwrap(response);
}

export async function getTrips(params = {}) {
  const response = await api.get("/v1/transport/trips", { params });
  return unwrap(response);
}

export async function createTrip(payload) {
  const response = await api.post("/v1/transport/trips", payload);
  return unwrap(response);
}

export async function dispatchTrip(id, payload = {}) {
  const response = await api.post(`/v1/transport/trips/${id}/dispatch`, payload);
  return unwrap(response);
}

export async function completeTrip(id, payload = {}) {
  const response = await api.post(`/v1/transport/trips/${id}/complete`, payload);
  return unwrap(response);
}

