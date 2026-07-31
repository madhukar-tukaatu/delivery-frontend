import api from "@/lib/api";

function unwrapData(response) {
  return response?.data?.data ?? null;
}

function normalizeHistory(history) {
  const rows = Array.isArray(history)
    ? history
    : Array.isArray(history?.data)
      ? history.data
      : [];

  return {
    current_page: Number(history?.current_page ?? 1),
    data: rows,
    from: Number(history?.from ?? (rows.length ? 1 : 0)),
    last_page: Number(history?.last_page ?? 1),
    per_page: Number(history?.per_page ?? 20),
    to: Number(history?.to ?? rows.length),
    total: Number(history?.total ?? rows.length),
  };
}

export async function getPricingSettings(params = {}) {
  const response = await api.get("/admin/pricing-settings", {
    params,
  });

  const data = unwrapData(response) ?? {};

  return {
    active: data?.active ?? null,
    history: normalizeHistory(data?.history),
  };
}

export async function getPricingSetting(id) {
  const response = await api.get(
    `/admin/pricing-settings/${id}`,
  );

  return unwrapData(response);
}

export async function getDefaultPricingSettings() {
  const response = await api.get(
    "/admin/pricing-settings/defaults",
  );

  return unwrapData(response);
}

export async function createPricingSettingsVersion(payload) {
  const response = await api.post(
    "/admin/pricing-settings",
    payload,
  );

  return unwrapData(response);
}

export async function updatePricingSettingsVersion(
  id,
  payload,
) {
  const response = await api.put(
    `/admin/pricing-settings/${id}`,
    payload,
  );

  return unwrapData(response);
}

export async function activatePricingSettings(id) {
  const response = await api.post(
    `/admin/pricing-settings/${id}/activate`,
  );

  return unwrapData(response);
}

export async function deletePricingSettings(id) {
  const response = await api.delete(
    `/admin/pricing-settings/${id}`,
  );

  return response?.data ?? null;
}

export async function getPricingReturnRules() {
  const response = await api.get(
    "/admin/pricing-return-rules",
  );

  const data = unwrapData(response);

  return Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];
}

export async function updatePricingReturnRule(id, payload) {
  const response = await api.put(
    `/admin/pricing-return-rules/${id}`,
    payload,
  );

  return unwrapData(response);
}
