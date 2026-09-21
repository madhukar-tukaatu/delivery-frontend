import api from "@/lib/api";

/**
 * Get staff/riders available to the authenticated branch manager.
 *
 * Backend:
 * GET /admin/staff
 *
 * IMPORTANT:
 * The backend must apply branch scope.
 *
 * Branch manager:
 *   - sees staff belonging to their branch
 *
 * Super admin:
 *   - may see all staff
 *   - may optionally filter by branch
 */
export async function getBranchStaff(params = {}) {
  const response = await api.get("/admin/staff", {
    params,
  });

  return normalizeStaffListResponse(response, params);
}

/**
 * Get one staff member.
 *
 * Backend:
 * GET /admin/staff/{id}
 */
export async function getBranchStaffMember(id) {
  const response = await api.get(`/admin/staff/${id}`);

  return normalizeStaffDetailResponse(response);
}

/**
 * Create staff/rider.
 *
 * Backend:
 * POST /admin/staff
 */
export async function createBranchStaff(payload) {
  const response = await api.post(
    "/admin/staff",
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * Update staff/rider.
 *
 * Backend:
 * PUT /admin/staff/{id}
 */
export async function updateBranchStaff(id, payload) {
  const response = await api.put(
    `/admin/staff/${id}`,
    payload
  );

  return response.data?.data ?? response.data;
}

/**
 * Delete staff/rider.
 *
 * Backend:
 * DELETE /admin/staff/{id}
 */
export async function deleteBranchStaff(id) {
  const response = await api.delete(
    `/admin/staff/${id}`
  );

  return response.data?.data ?? response.data;
}

/**
 * Enable/disable staff.
 *
 * Backend:
 * POST /admin/staff/{id}/toggle
 */
export async function toggleBranchStaff(id) {
  const response = await api.post(
    `/admin/staff/${id}/toggle`
  );

  return response.data?.data ?? response.data;
}

/**
 * Normalize paginated staff response.
 */
export function normalizeStaffListResponse(
  response,
  params = {}
) {
  const payload =
    response?.data?.data ??
    response?.data ??
    response;

  /*
   * Laravel paginator:
   *
   * {
   *   data: [],
   *   current_page: 1,
   *   per_page: 20,
   *   total: 100
   * }
   */

  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  return {
    list,

    currentPage: Number(
      payload?.current_page ??
        params.page ??
        1
    ),

    pageSize: Number(
      payload?.per_page ??
        params.per_page ??
        20
    ),

    total: Number(
      payload?.total ??
        list.length ??
        0
    ),
  };
}

/**
 * Normalize one staff response.
 */
export function normalizeStaffDetailResponse(
  response
) {
  const payload =
    response?.data?.data ??
    response?.data ??
    response;

  if (payload?.user) {
    return payload.user;
  }

  return payload;
}