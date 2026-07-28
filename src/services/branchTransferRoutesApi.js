import api from "@/lib/api";

const BASE_URL = "/admin/rate/transfer-routes";

function unwrapData(response) {
  return response?.data?.data ??
    response?.data ??
    null;
}

export const BranchTransferRoutesApi = {
    list(params = {}) {
        return api.get(BASE_URL, { params });
    },

    show(id) {
        return api.get(`${BASE_URL}/${id}`);
    },

    create(payload) {
        return api.post(BASE_URL, payload);
    },

    update(id, payload) {
        return api.put(`${BASE_URL}/${id}`, payload);
    },

    disable(id) {
        return api.delete(`${BASE_URL}/${id}`);
    },
};


export async function getTransferRoutePricingProfile(
  routeId,
) {
  const response = await api.get(
    `/admin/rate/branch-transfer-routes/${routeId}/pricing-profile`,
  );

  return unwrapData(response);
}

export async function updateTransferRoutePricingProfile(
  routeId,
  payload,
) {
  const response = await api.put(
    `/admin/rate/branch-transfer-routes/${routeId}/pricing-profile`,
    payload,
  );

  return unwrapData(response);
}
