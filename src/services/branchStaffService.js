import api from "@/lib/api";

/**
 * Safely unwrap Laravel ApiResponse payloads.
 */
function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

/**
 * Normalize paginated Laravel responses.
 *
 * Supports:
 *
 * {
 *   data: {
 *     current_page: 1,
 *     data: [],
 *     total: 10,
 *     per_page: 20
 *   }
 * }
 *
 * and simple arrays.
 */
function normalizeList(response, params = {}) {
  const payload = unwrap(response);

  if (Array.isArray(payload)) {
    return {
      list: payload,
      currentPage: Number(params.page ?? 1),
      pageSize: Number(params.per_page ?? 20),
      total: payload.length,
    };
  }

  return {
    list: Array.isArray(payload?.data)
      ? payload.data
      : [],
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
      0
    ),
  };
}

/**
 * Get staff belonging to the authenticated
 * branch manager's branch.
 *
 * IMPORTANT:
 * The backend must determine the branch.
 *
 * Frontend must NOT send branch_id.
 *
 * GET /admin/staff
 */
export async function getBranchStaff(params = {}) {
  const response = await api.get("/admin/staff", {
    params: {
      per_page: 20,
      ...params,
    },
  });

  return normalizeList(response, params);
}

/**
 * Get one staff member.
 *
 * GET /admin/staff/{id}
 */
export async function getBranchStaffMember(id) {
  if (!id) {
    throw new Error("Staff ID is required.");
  }

  const response = await api.get(
    `/admin/staff/${id}`
  );

  return unwrap(response);
}

/**
 * Create a staff member.
 *
 * IMPORTANT:
 * Do not send branch_id from the branch-manager frontend.
 *
 * Backend should automatically assign the authenticated
 * branch manager's branch.
 *
 * POST /admin/staff
 */
export async function createBranchStaff(payload) {
  const response = await api.post(
    "/admin/staff",
    payload
  );

  return unwrap(response);
}

/**
 * Update a staff member.
 *
 * PUT /admin/staff/{id}
 */
export async function updateBranchStaff(
  id,
  payload
) {
  if (!id) {
    throw new Error("Staff ID is required.");
  }

  const response = await api.put(
    `/admin/staff/${id}`,
    payload
  );

  return unwrap(response);
}

/**
 * Delete/deactivate a staff member.
 *
 * DELETE /admin/staff/{id}
 */
export async function deleteBranchStaff(id) {
  if (!id) {
    throw new Error("Staff ID is required.");
  }

  const response = await api.delete(
    `/admin/staff/${id}`
  );

  return unwrap(response);
}

/**
 * Enable/disable staff account.
 *
 * POST /admin/staff/{id}/toggle
 */
export async function toggleBranchStaff(id) {
  if (!id) {
    throw new Error("Staff ID is required.");
  }

  const response = await api.post(
    `/admin/staff/${id}/toggle`
  );

  return unwrap(response);
}

/**
 * Get roles that can be used for branch staff.
 *
 * GET /admin/staff/roles
 *
 * Example roles:
 *
 * - pickup_staff
 * - delivery_staff
 * - rider
 */
export async function getBranchStaffRoles() {
  const response = await api.get(
    "/admin/staff/roles"
  );

  const data = unwrap(response);

  return Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];
}