import api from "@/lib/api";

export async function getMerchants(params = {}) {
  const response = await api.get(
    "/admin/merchants",
    {
      params,
    },
  );

  return normalizeMerchantResponse(
    response,
    params,
  );
}

export async function getMerchant(id) {
  const response = await api.get(
    `/admin/merchants/${id}`,
  );

  return (
    response.data?.data ??
    response.data
  );
}

/**
 * Update a merchant / store partner.
 *
 * PUT /admin/merchants/{id}
 * Accepts (among others): bulk_pickup_discount_threshold,
 * bulk_pickup_discount_amount.
 */
export async function updateMerchant(id, payload) {
  const response = await api.put(
    `/admin/merchants/${id}`,
    payload,
  );

  return (
    response.data?.data ??
    response.data
  );
}

function normalizeMerchantResponse(
  response,
  params = {},
) {
  const payload =
    response.data?.data ??
    response.data;

  /*
   * Laravel pagination:
   *
   * {
   *   data: [...],
   *   current_page: 1,
   *   per_page: 15,
   *   total: 100
   * }
   */

  const list =
    payload?.data ??
    [];

  return {
    list: Array.isArray(list)
      ? list
      : [],

    currentPage: Number(
      payload?.current_page ??
        params.page ??
        1,
    ),

    pageSize: Number(
      payload?.per_page ??
        params.per_page ??
        15,
    ),

    total: Number(
      payload?.total ??
        0,
    ),
  };
}