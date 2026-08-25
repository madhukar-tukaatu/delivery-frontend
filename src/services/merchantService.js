import api from "@/lib/api";

export async function getMerchants(params = {}) {
  const response = await api.get("/admin/merchants", {
    params,
  });

  return normalizeMerchantResponse(
    response,
    params,
  );
}

export async function getMerchantsByBranchId(
  branchId,
  params = {},
) {
  const response = await api.get(
    `/admin/branches/${branchId}/merchants`,
    {
      params,
    },
  );

  return normalizeMerchantResponse(
    response,
    params,
  );
}

function normalizeMerchantResponse(
  response,
  params = {},
) {
  const payload =
    response.data?.data ||
    response.data;

  const list =
    payload?.data ||
    payload ||
    [];

  return {
    list: Array.isArray(list)
      ? list
      : [],

    currentPage: Number(
      payload?.current_page ||
        params.page ||
        1,
    ),

    pageSize: Number(
      payload?.per_page ||
        params.per_page ||
        15,
    ),

    total: Number(
      payload?.total || 0,
    ),
  };
}