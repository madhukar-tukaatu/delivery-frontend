const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("admin_token") ||
    null
  );
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      query.set(key, String(value));
    }
  });

  const result = query.toString();

  return result ? `?${result}` : "";
}

async function apiRequest(path, options = {}) {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const validationMessage = body?.errors
      ? Object.values(body.errors)?.[0]?.[0]
      : null;

    const error = new Error(
      validationMessage ||
        body?.message ||
        "The request could not be completed.",
    );

    error.status = response.status;
    error.errors = body?.errors || {};
    error.response = body;

    throw error;
  }

  return body;
}

export const pricingSettingsApi = {
  list(params = {}) {
    return apiRequest(
      `/admin/rate/pricing-settings${buildQuery(params)}`,
    );
  },

  get(id) {
    return apiRequest(`/admin/rate/pricing-settings/${id}`);
  },

  create(payload) {
    return apiRequest("/admin/rate/pricing-settings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return apiRequest(`/admin/rate/pricing-settings/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  activate(id) {
    return apiRequest(
      `/admin/rate/pricing-settings/${id}/activate`,
      {
        method: "POST",
      },
    );
  },

  remove(id) {
    return apiRequest(`/admin/rate/pricing-settings/${id}`, {
      method: "DELETE",
    });
  },
};

export const serviceTypesApi = {
  list(params = {}) {
    return apiRequest(
      `/admin/rate/service-types${buildQuery(params)}`,
    );
  },

  create(payload) {
    return apiRequest("/admin/rate/service-types", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return apiRequest(`/admin/rate/service-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  setStatus(id, isActive) {
    return apiRequest(`/admin/rate/service-types/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  remove(id) {
    return apiRequest(`/admin/rate/service-types/${id}`, {
      method: "DELETE",
    });
  },
};

export const branchRouteRatesApi = {
  branches() {
    return apiRequest("/admin/rate/branch-route-rates/branches");
  },

  list(params = {}) {
    return apiRequest(
      `/admin/rate/branch-route-rates${buildQuery(params)}`,
    );
  },

  matrix() {
    return apiRequest("/admin/rate/branch-route-rates/matrix");
  },

  create(payload) {
    return apiRequest("/admin/rate/branch-route-rates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id, payload) {
    return apiRequest(`/admin/rate/branch-route-rates/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  setStatus(id, isActive) {
    return apiRequest(
      `/admin/rate/branch-route-rates/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive }),
      },
    );
  },

  remove(id) {
    return apiRequest(`/admin/rate/branch-route-rates/${id}`, {
      method: "DELETE",
    });
  },
};

export const pricingQuotesApi = {
  list(params = {}) {
    return apiRequest(
      `/admin/rate/pricing-quotes${buildQuery(params)}`,
    );
  },

  get(id) {
    return apiRequest(`/admin/rate/pricing-quotes/${id}`);
  },

  remove(id) {
    return apiRequest(`/admin/rate/pricing-quotes/${id}`, {
      method: "DELETE",
    });
  },
};

export const pricingSimulatorApi = {
  calculate(payload) {
    return apiRequest("/admin/rate/pricing-simulator", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
