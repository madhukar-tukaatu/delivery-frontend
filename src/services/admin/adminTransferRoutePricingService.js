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

export async function getActiveGlobalPricingSettings() {
  const response = await api.get(
    "/admin/pricing-settings",
    {
      params: {
        page: 1,
        per_page: 1,
      },
    },
  );

  const data =
    unwrapData(response) ?? {};

  return data?.active ?? null;
}