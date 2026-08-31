import api from "@/lib/api";

/*
|--------------------------------------------------------------------------
| Response helpers
|--------------------------------------------------------------------------
*/

function unwrap(response) {
  const body = response?.data ?? {};

  return body?.data ?? body;
}

/*
|--------------------------------------------------------------------------
| Roles
|--------------------------------------------------------------------------
*/

export async function getRoles(params = {}) {
  const response =
    await api.get("/admin/roles", {
      params,
    });

  return response.data?.data || [];
}

export async function getRole(id) {
  const response =
    await api.get(`/admin/roles/${id}`);

  return response.data?.data || null;
}

export async function createRole(payload) {
  const response =
    await api.post(
      "/admin/roles",
      payload
    );

  return response.data?.data || null;
}

export async function updateRole(
  id,
  payload
) {
  const response =
    await api.put(
      `/admin/roles/${id}`,
      payload
    );

  return response.data?.data || null;
}

export async function deleteRole(id) {
  const response =
    await api.delete(
      `/admin/roles/${id}`
    );

  return response.data?.data || null;
}

export async function toggleRole(id) {
  if (!id) {
    throw new Error(
      "Role ID is required."
    );
  }

  const response =
    await api.post(
      `/admin/roles/${id}/toggle`
    );

  return unwrap(response);
}

/*
|--------------------------------------------------------------------------
| Permissions
|--------------------------------------------------------------------------
|
| Permission definitions come from Laravel.
|
*/

export async function getPermissions() {
  const response =
    await api.get(
      "/admin/permissions"
    );

  return response.data?.data || [];
}

/*
|--------------------------------------------------------------------------
| Users
|--------------------------------------------------------------------------
*/

export async function getUsers(
  params = {}
) {
  const response =
    await api.get(
      "/admin/users",
      {
        params,
      }
    );

  return response.data?.data || null;
}

export async function getUser(id) {
  const response =
    await api.get(
      `/admin/users/${id}`
    );

  return response.data?.data || null;
}

export async function createUser(
  payload
) {
  const response =
    await api.post(
      "/admin/users",
      payload
    );

  return response.data?.data || null;
}

export async function updateUser(
  id,
  payload
) {
  const response =
    await api.put(
      `/admin/users/${id}`,
      payload
    );

  return response.data?.data || null;
}

export async function deleteUser(id) {
  const response =
    await api.delete(
      `/admin/users/${id}`
    );

  return response.data?.data || null;
}

export async function toggleUser(id) {
  const response =
    await api.post(
      `/admin/users/${id}/toggle`
    );

  return response.data?.data || null;
}

/*
|--------------------------------------------------------------------------
| Menus
|--------------------------------------------------------------------------
*/

export async function getMyMenus(
  section
) {
  const response =
    await api.get(
      "/admin/me/menus",
      {
        params: section
          ? { section }
          : {},
      }
    );

  return response.data?.data || [];
}

export async function getMenus(
  params = {}
) {
  const response =
    await api.get(
      "/admin/menus",
      {
        params,
      }
    );

  return response.data?.data || null;
}

export async function createMenu(
  payload
) {
  const response =
    await api.post(
      "/admin/menus",
      payload
    );

  return response.data?.data || null;
}

export async function updateMenu(
  id,
  payload
) {
  const response =
    await api.put(
      `/admin/menus/${id}`,
      payload
    );

  return response.data?.data || null;
}

export async function deleteMenu(id) {
  const response =
    await api.delete(
      `/admin/menus/${id}`
    );

  return response.data?.data || null;
}