import api from "@/lib/api";

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export async function getTransferRoutePricingSettings(
  routeId,
  params = {},
) {
  const response = await api.get(
    `/admin/rate/branch-transfer-routes/${routeId}/pricing-settings`,
    {
      params,
    },
  );

  return unwrapData(response);
}

export async function createTransferRoutePricingVersion(
  routeId,
  payload,
) {
  const response = await api.post(
    `/admin/rate/branch-transfer-routes/${routeId}/pricing-settings`,
    payload,
  );

  return unwrapData(response);
}

export async function activateTransferRoutePricingVersion(
  routeId,
  pricingSettingId,
) {
  const response = await api.post(
    `/admin/rate/branch-transfer-routes/${routeId}/pricing-settings/${pricingSettingId}/activate`,
  );

  return unwrapData(response);
}

export async function useGlobalTransferRoutePricing(routeId) {
  const response = await api.post(
    `/admin/rate/branch-transfer-routes/${routeId}/pricing-settings/use-global`,
  );

  return response?.data ?? null;
}

export async function deleteTransferRoutePricingVersion(
  routeId,
  pricingSettingId,
) {
  const response = await api.delete(
    `/admin/rate/branch-transfer-routes/${routeId}/pricing-settings/${pricingSettingId}`,
  );

  return response?.data ?? null;
}
