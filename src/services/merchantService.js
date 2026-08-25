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