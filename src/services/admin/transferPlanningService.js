import api from "@/lib/api";
import { fetchWithOfflineSupport } from "@/lib/offlineCache";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export async function getTransferDemand(params = {}, options = {}) {
  const originId = params.origin_branch_id || "all";
  const cacheKey = `transfer_demand_${originId}`;

  const result = await fetchWithOfflineSupport(
    cacheKey,
    async () => {
      const response = await api.get("/admin/transfers/planning/demand", { params });
      return unwrap(response) ?? {};
    },
    { ttl: 60, staleWhileRevalidate: true, ...options }
  );

  return {
    ...result.data,
    isOffline: result.isOffline,
    fromCache: result.fromCache,
  };
}

export async function getTransferRecommendations(params = {}) {
  const response = await api.get("/admin/transfers/planning/recommend", { params });
  return unwrap(response) ?? {};
}

export async function createTransferRun(payload) {
  const response = await api.post("/admin/transfers/planning/runs", payload);
  return unwrap(response);
}

export async function acceptTransferPlan(runs) {
  const response = await api.post("/admin/transfers/planning/accept", { runs });
  return unwrap(response);
}

export async function getTransferRuns(params = {}) {
  const response = await api.get("/admin/transfers/planning/runs", { params });
  return unwrap(response) ?? { runs: [] };
}

export async function getTransferRun(id) {
  const response = await api.get(`/admin/transfers/planning/runs/${id}`);
  return unwrap(response);
}

export async function dispatchTransferRun(id, payload = {}) {
  const response = await api.post(`/admin/transfers/planning/runs/${id}/dispatch`, payload);
  return unwrap(response);
}

export async function cancelTransferRun(id, reason = null) {
  const response = await api.post(`/admin/transfers/planning/runs/${id}/cancel`, { reason });
  return unwrap(response);
}

export async function continueTransferRun(id) {
  const response = await api.post(`/admin/transfers/planning/runs/${id}/continue`);
  return unwrap(response);
}

export async function getTransferAnalytics(params = {}) {
  const response = await api.get("/admin/transfers/planning/analytics", { params });
  return unwrap(response) ?? {};
}

export async function downloadTransferAnalyticsCsv(params = {}) {
  const response = await api.get("/admin/transfers/planning/analytics/export", {
    params,
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transfer-analytics-${params.from || "from"}-to-${params.to || "to"}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function getTransferCorridors() {
  const response = await api.get("/admin/transfers/planning/corridors");
  return unwrap(response) ?? { corridors: [] };
}
