import api from "@/lib/api";

/**
 * Safely unwrap Laravel ApiResponse.
 */
function unwrap(response) {
  return (
    response?.data?.data ??
    response?.data ??
    null
  );
}

/**
 * Normalize Laravel pagination.
 */
function normalizeList(response, params = {}) {
  const payload = unwrap(response);

  /*
   * Simple array response
   */
  if (Array.isArray(payload)) {
    return {
      list: payload,
      currentPage: Number(
        params.page ?? 1
      ),
      pageSize: Number(
        params.per_page ?? 20
      ),
      total: payload.length,
    };
  }

  /*
   * Laravel paginator:
   *
   * {
   *   current_page: 1,
   *   data: [],
   *   per_page: 20,
   *   total: 100
   * }
   */
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
 * ============================================================
 * STAFF
 * ============================================================
 */

/**
 * Get staff.
 *
 * GET /admin/staff
 *
 * IMPORTANT:
 *
 * Do NOT send branch_id from the frontend
 * for a branch manager.
 *
 * Backend branch.scope middleware/controller
 * must determine the branch.
 */
export async function getBranchStaff(
  params = {}
) {
  const response = await api.get(
    "/admin/staff",
    {
      params: {
        per_page: 20,
        ...params,
      },
    }
  );

  return normalizeList(
    response,
    params
  );
}

/**
 * Get one staff member.
 *
 * GET /admin/staff/{id}
 */
export async function getBranchStaffMember(
  id
) {
  if (!id) {
    throw new Error(
      "Staff ID is required."
    );
  }

  const response = await api.get(
    `/admin/staff/${id}`
  );

  return unwrap(response);
}

/**
 * Create staff.
 *
 * POST /admin/staff
 *
 * IMPORTANT:
 *
 * Do not send branch_id for branch managers.
 *
 * Backend should determine:
 *
 * authenticated user
 *        ↓
 * authenticated branch
 *        ↓
 * new staff branch
 */
export async function createBranchStaff(
  payload
) {
  const response = await api.post(
    "/admin/staff",
    payload
  );

  return unwrap(response);
}

/**
 * Update staff.
 *
 * PUT /admin/staff/{id}
 */
export async function updateBranchStaff(
  id,
  payload
) {
  if (!id) {
    throw new Error(
      "Staff ID is required."
    );
  }

  const response = await api.put(
    `/admin/staff/${id}`,
    payload
  );

  return unwrap(response);
}

/**
 * Delete/deactivate staff.
 *
 * DELETE /admin/staff/{id}
 */
export async function deleteBranchStaff(
  id
) {
  if (!id) {
    throw new Error(
      "Staff ID is required."
    );
  }

  const response = await api.delete(
    `/admin/staff/${id}`
  );

  return unwrap(response);
}

/**
 * Toggle staff active status.
 *
 * POST /admin/staff/{id}/toggle
 */
export async function toggleBranchStaff(
  id
) {
  if (!id) {
    throw new Error(
      "Staff ID is required."
    );
  }

  const response = await api.post(
    `/admin/staff/${id}/toggle`
  );

  return unwrap(response);
}

/**
 * ============================================================
 * ROLES
 * ============================================================
 *
 * IMPORTANT:
 *
 * Roles are NOT staff-specific.
 *
 * Your application already has:
 *
 * GET /admin/roles
 *
 * Therefore:
 *
 * DO NOT call:
 *
 * /admin/staff/roles
 *
 * ============================================================
 */

/**
 * Get available roles.
 *
 * GET /admin/roles
 *
 * The backend should return only roles the
 * authenticated user is allowed to manage/assign.
 */
export async function getStaffRoles(
  params = {}
) {
  const response = await api.get(
    "/admin/roles",
    {
      params,
    }
  );

  const payload = unwrap(response);

  /*
   * Laravel paginator
   */
  if (
    payload &&
    Array.isArray(payload.data)
  ) {
    return payload.data;
  }

  /*
   * Simple array
   */
  if (Array.isArray(payload)) {
    return payload;
  }

  return [];
}

/**
 * Backward-compatible name.
 *
 * If existing components call:
 *
 * getBranchStaffRoles()
 *
 * they will still work.
 */
export async function getBranchStaffRoles(
  params = {}
) {
  return getStaffRoles(params);
}

/**
 * Get role by ID.
 *
 * GET /admin/roles/{id}
 */
export async function getStaffRole(
  id
) {
  if (!id) {
    throw new Error(
      "Role ID is required."
    );
  }

  const response = await api.get(
    `/admin/roles/${id}`
  );

  return unwrap(response);
}