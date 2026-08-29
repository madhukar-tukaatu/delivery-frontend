import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

export async function getShipments(params = {}) {
  const response = await api.get("/admin/shipments", {
    params,
  });

  const payload = unwrap(response);

  if (payload?.data && Array.isArray(payload.data)) {
    return {
      list: payload.data,
      currentPage: payload.current_page ?? 1,
      pageSize: payload.per_page ?? 20,
      total: payload.total ?? 0,
      lastPage: payload.last_page ?? 1,
    };
  }

  if (Array.isArray(payload)) {
    return {
      list: payload,
      currentPage: 1,
      pageSize: payload.length,
      total: payload.length,
      lastPage: 1,
    };
  }

  return {
    list: payload?.list ?? [],
    currentPage: payload?.currentPage ?? 1,
    pageSize: payload?.pageSize ?? 20,
    total: payload?.total ?? 0,
    lastPage: payload?.lastPage ?? 1,
  };
}

export async function getAdminShipment(id) {
  const response = await api.get(`/admin/shipments/${id}`);

  return unwrap(response);
}

export async function createAdminShipment(payload) {
  const response = await api.post(
    "/admin/shipments",
    payload,
  );

  return unwrap(response);
}

export async function updateAdminShipment(id, payload) {
  const response = await api.put(
    `/admin/shipments/${id}`,
    payload,
  );

  return unwrap(response);
}

export async function updateShipmentStatus(id, payload) {
  const response = await api.post(
    `/admin/shipments/${id}/status`,
    payload,
  );

  return unwrap(response);
}

export async function cancelAdminShipment(id, payload = {}) {
  const response = await api.post(
    `/admin/shipments/${id}/cancel`,
    payload,
  );

  return unwrap(response);
}