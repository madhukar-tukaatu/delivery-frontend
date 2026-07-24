import api from "@/lib/api";

function unwrapData(response) {
  return response?.data?.data || response?.data || null;
}

/*
|--------------------------------------------------------------------------
| Pricing Settings
|--------------------------------------------------------------------------
*/

export const pricingSettingsApi = {
  async list(params = {}) {
    const response = await api.get("/admin/pricing-settings", {
      params,
    });

    return response.data;
  },

  async get(id) {
    const response = await api.get(
      `/admin/pricing-settings/${id}`,
    );

    return unwrapData(response);
  },

  async create(payload) {
    const response = await api.post(
      "/admin/pricing-settings",
      payload,
    );

    return unwrapData(response);
  },

  async update(id, payload) {
    const response = await api.put(
      `/admin/pricing-settings/${id}`,
      payload,
    );

    return unwrapData(response);
  },

  async activate(id) {
    const response = await api.post(
      `/admin/pricing-settings/${id}/activate`,
    );

    return unwrapData(response);
  },

  async remove(id) {
    const response = await api.delete(
      `/admin/pricing-settings/${id}`,
    );

    return response.data;
  },
};

/*
|--------------------------------------------------------------------------
| Service Types
|--------------------------------------------------------------------------
*/

export const serviceTypesApi = {
  async list(params = {}) {
    const response = await api.get("/admin/service-types", {
      params,
    });

    return response.data;
  },

  async get(id) {
    const response = await api.get(
      `/admin/service-types/${id}`,
    );

    return unwrapData(response);
  },

  async create(payload) {
    const response = await api.post(
      "/admin/service-types",
      payload,
    );

    return unwrapData(response);
  },

  async update(id, payload) {
    const response = await api.put(
      `/admin/service-types/${id}`,
      payload,
    );

    return unwrapData(response);
  },

  async setStatus(id, isActive) {
    const response = await api.patch(
      `/admin/service-types/${id}/status`,
      {
        is_active: isActive,
      },
    );

    return unwrapData(response);
  },

  async remove(id) {
    const response = await api.delete(
      `/admin/service-types/${id}`,
    );

    return response.data;
  },
};

/*
|--------------------------------------------------------------------------
| Branch Route Rates
|--------------------------------------------------------------------------
*/

export const branchRouteRatesApi = {
  async branches(params = {}) {
    const response = await api.get(
      "/admin/branch-route-rates/branches",
      {
        params,
      },
    );

    return response.data;
  },

  async list(params = {}) {
    const response = await api.get(
      "/admin/branch-route-rates",
      {
        params,
      },
    );

    return response.data;
  },

  async matrix(params = {}) {
    const response = await api.get(
      "/admin/branch-route-rates/matrix",
      {
        params,
      },
    );

    return response.data;
  },

  async get(id) {
    const response = await api.get(
      `/admin/branch-route-rates/${id}`,
    );

    return unwrapData(response);
  },

  async create(payload) {
    const response = await api.post(
      "/admin/branch-route-rates",
      payload,
    );

    return unwrapData(response);
  },

  async update(id, payload) {
    const response = await api.put(
      `/admin/branch-route-rates/${id}`,
      payload,
    );

    return unwrapData(response);
  },

  async setStatus(id, isActive) {
    const response = await api.patch(
      `/admin/branch-route-rates/${id}/status`,
      {
        is_active: isActive,
      },
    );

    return unwrapData(response);
  },

  async remove(id) {
    const response = await api.delete(
      `/admin/branch-route-rates/${id}`,
    );

    return response.data;
  },
};

/*
|--------------------------------------------------------------------------
| Pricing Quotes
|--------------------------------------------------------------------------
*/

export const pricingQuotesApi = {
  async list(params = {}) {
    const response = await api.get("/admin/pricing-quotes", {
      params,
    });

    return response.data;
  },

  async get(id) {
    const response = await api.get(
      `/admin/pricing-quotes/${id}`,
    );

    return unwrapData(response);
  },

  async remove(id) {
    const response = await api.delete(
      `/admin/pricing-quotes/${id}`,
    );

    return response.data;
  },
};

/*
|--------------------------------------------------------------------------
| Pricing Simulator
|--------------------------------------------------------------------------
*/

export const pricingSimulatorApi = {
  async calculate(payload) {
    const response = await api.post(
      "/admin/pricing-simulator",
      payload,
    );

    return unwrapData(response);
  },
};