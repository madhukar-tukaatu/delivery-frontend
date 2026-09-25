import api from "@/lib/api";

function unwrapResponse(response) {
  const payload = response?.data ?? response;

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload
  ) {
    return payload.data;
  }

  return payload;
}

/*
|--------------------------------------------------------------------------
| Get branch staff
|--------------------------------------------------------------------------
*/

export async function getBranchStaff(
  params = {}
) {
  const response = await api.get(
    "/admin/staff",
    {
      params,
    }
  );

  const data = unwrapResponse(
    response
  );

  return {
    list: Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [],

    currentPage:
      data?.current_page ?? 1,

    pageSize:
      data?.per_page ?? 20,

    total:
      data?.total ?? 0,
  };
}

/*
|--------------------------------------------------------------------------
| Get staff roles
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This is NOT the generic roles endpoint.
|
*/

export async function getBranchStaffRoles() {
  const response = await api.get(
    "/admin/staff/roles"
  );

  return unwrapResponse(
    response
  );
}

/*
|--------------------------------------------------------------------------
| Get staff member
|--------------------------------------------------------------------------
*/

export async function getBranchStaffMember(
  id
) {
  const response = await api.get(
    `/admin/staff/${id}`
  );

  return unwrapResponse(
    response
  );
}

/*
|--------------------------------------------------------------------------
| Create
|--------------------------------------------------------------------------
*/

export async function createBranchStaff(
  payload
) {
  const response = await api.post(
    "/admin/staff",
    payload
  );

  return unwrapResponse(
    response
  );
}

/*
|--------------------------------------------------------------------------
| Update
|--------------------------------------------------------------------------
*/

export async function updateBranchStaff(
  id,
  payload
) {
  const response = await api.put(
    `/admin/staff/${id}`,
    payload
  );

  return unwrapResponse(
    response
  );
}

/*
|--------------------------------------------------------------------------
| Toggle
|--------------------------------------------------------------------------
*/

export async function toggleBranchStaff(
  id
) {
  const response = await api.patch(
    `/admin/staff/${id}/toggle`
  );

  return unwrapResponse(
    response
  );
}

/*
|--------------------------------------------------------------------------
| Delete / deactivate
|--------------------------------------------------------------------------
*/

export async function deleteBranchStaff(
  id
) {
  const response = await api.delete(
    `/admin/staff/${id}`
  );

  return unwrapResponse(
    response
  );
}

/*
|--------------------------------------------------------------------------
| Normalize roles
|--------------------------------------------------------------------------
*/

export function normalizeStaffRoles(
  roles
) {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.map(
    (role) => ({
      id: role.id,
      name: role.name,
      label:
        role.label ??
        role.display_name ??
        role.name
          ?.replaceAll("_", " ")
          ?.replace(
            /\b\w/g,
            (character) =>
              character.toUpperCase()
          ),
    })
  );
}