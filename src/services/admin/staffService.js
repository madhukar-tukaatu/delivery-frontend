import api from "@/lib/api";

/**
 * Get staff/riders available to the authenticated
 * branch manager.
 *
 * IMPORTANT:
 *
 * The backend must apply branch scope.
 *
 * The frontend should NEVER decide which staff
 * belong to which branch.
 */
export async function getBranchStaff(params = {}) {
  const response = await api.get(
    "/admin/staff",
    {
      params,
    }
  );

  const payload =
    response.data?.data ??
    response.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}