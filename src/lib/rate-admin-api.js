const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const RATE_BASE = "/api/v1/admin/rate";

function authHeaders() {
  if (typeof window === "undefined") return {};

  const token =
    window.localStorage.getItem("access_token") ??
    window.localStorage.getItem("token") ??
    window.sessionStorage.getItem("access_token") ??
    window.sessionStorage.getItem("token");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    cache: "no-store",
    signal: options.signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.message ?? `Request failed with status ${response.status}.`);
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload;
}

export function unwrapData(payload) {
  return payload?.data ?? payload ?? null;
}

export function normalizeCollection(payload) {
  const data = unwrapData(payload);

  if (Array.isArray(data)) {
    return {
      rows: data,
      page: 1,
      totalPages: 1,
      total: data.length,
    };
  }

  const rows = data?.data ?? data?.items ?? data?.rows ?? [];

  return {
    rows: Array.isArray(rows) ? rows : [],
    page: Number(data?.current_page ?? data?.page ?? 1),
    totalPages: Number(data?.last_page ?? data?.total_pages ?? 1),
    total: Number(data?.total ?? (Array.isArray(rows) ? rows.length : 0)),
  };
}

export function normalizeBranch(branch) {
  const coverage = branch?.coverage_location ?? branch?.coverageLocation ?? branch?.coverage ?? {};

  return {
    ...branch,
    id: Number(branch?.id),
    name: branch?.name ?? branch?.branch_name ?? `Branch ${branch?.id}`,
    code: branch?.code ?? branch?.branch_code ?? "",
    latitude: Number(
      branch?.latitude ??
        branch?.lat ??
        coverage?.latitude ??
        coverage?.center_latitude ??
        coverage?.lat ??
        branch?.center_latitude ??
        branch?.address?.latitude,
    ),
    longitude: Number(
      branch?.longitude ??
        branch?.lng ??
        branch?.lon ??
        coverage?.longitude ??
        coverage?.center_longitude ??
        coverage?.lng ??
        coverage?.lon ??
        branch?.center_longitude ??
        branch?.address?.longitude,
    ),
  };
}

export const rateAdminApi = {
  listBranches(params = {}) {
    const query = new URLSearchParams({ per_page: "500", status: "active", ...params });
    return apiRequest(`/api/v1/admin/branches?${query.toString()}`);
  },

  listBranchRates(params = {}) {
    const query = new URLSearchParams(params);
    return apiRequest(`${RATE_BASE}/branch-route-rates?${query.toString()}`);
  },
  createBranchRate(body) {
    return apiRequest(`${RATE_BASE}/branch-route-rates`, { method: "POST", body });
  },
  updateBranchRate(id, body) {
    return apiRequest(`${RATE_BASE}/branch-route-rates/${id}`, { method: "PUT", body });
  },
  updateBranchRateStatus(id, isActive) {
    return apiRequest(`${RATE_BASE}/branch-route-rates/${id}/status`, {
      method: "PATCH",
      body: { is_active: Boolean(isActive) },
    });
  },
  deleteBranchRate(id) {
    return apiRequest(`${RATE_BASE}/branch-route-rates/${id}`, { method: "DELETE" });
  },

  listTransferLanes(params = {}) {
    const query = new URLSearchParams(params);
    return apiRequest(`${RATE_BASE}/branch-transfer-lanes?${query.toString()}`);
  },
  createTransferLane(body) {
    return apiRequest(`${RATE_BASE}/branch-transfer-lanes`, { method: "POST", body });
  },
  updateTransferLane(id, body) {
    return apiRequest(`${RATE_BASE}/branch-transfer-lanes/${id}`, { method: "PUT", body });
  },
  updateTransferLaneStatus(id, isActive) {
    return apiRequest(`${RATE_BASE}/branch-transfer-lanes/${id}/status`, {
      method: "PATCH",
      body: { is_active: Boolean(isActive) },
    });
  },
  deleteTransferLane(id) {
    return apiRequest(`${RATE_BASE}/branch-transfer-lanes/${id}`, { method: "DELETE" });
  },

  listTransferRoutes(params = {}) {
    const query = new URLSearchParams(params);
    return apiRequest(`${RATE_BASE}/branch-transfer-routes?${query.toString()}`);
  },
  previewTransferRoute(body) {
    return apiRequest(`${RATE_BASE}/branch-transfer-routes/preview`, { method: "POST", body });
  },
  createTransferRoute(body) {
    return apiRequest(`${RATE_BASE}/branch-transfer-routes`, { method: "POST", body });
  },
  updateTransferRoute(id, body) {
    return apiRequest(`${RATE_BASE}/branch-transfer-routes/${id}`, { method: "PUT", body });
  },
  updateTransferRouteStatus(id, isActive) {
    return apiRequest(`${RATE_BASE}/branch-transfer-routes/${id}/status`, {
      method: "PATCH",
      body: { is_active: Boolean(isActive) },
    });
  },
  deleteTransferRoute(id) {
    return apiRequest(`${RATE_BASE}/branch-transfer-routes/${id}`, { method: "DELETE" });
  },
};
