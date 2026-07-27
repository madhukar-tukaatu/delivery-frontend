import api from "@/lib/api";

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export async function getPricingSettings(params = {}) {
  const response = await api.get("/admin/pricing-settings", {
    params,
  });

  return response.data;
}

export async function createPricingSettingsVersion(payload) {
  const response = await api.post(
    "/admin/pricing-settings",
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

export async function previewDefaultPricing() {
  const response = await api.get(
    "/admin/pricing-defaults/preview",
  );

  return unwrapData(response);
}

export async function importDefaultPricing(payload = {}) {
  const response = await api.post(
    "/admin/pricing-defaults/import",
    {
      activate: true,
      create_direct_routes: true,
      ...payload,
    },
  );

  return unwrapData(response);
}

export async function getPricingReturnRules() {
  const response = await api.get(
    "/admin/pricing-return-rules",
  );

  return unwrapData(response) ?? [];
}

export async function updatePricingReturnRule(id, payload) {
  const response = await api.put(
    `/admin/pricing-return-rules/${id}`,
    payload,
  );

  return unwrapData(response);
}
