// src/lib/access.js

/**
 * Normalize permissions from different API/user response shapes.
 */
export function normalizePermissionNames(source) {
  if (!source) return [];

  // ["users.view", "users.create"]
  if (Array.isArray(source)) {
    return source
      .map((item) => {
        if (typeof item === "string") return item;

        return (
          item?.name ||
          item?.permission ||
          item?.permission_name ||
          null
        );
      })
      .filter(Boolean);
  }

  // { permissions: [...] }
  if (Array.isArray(source.permissions)) {
    return normalizePermissionNames(source.permissions);
  }

  // { permission_names: [...] }
  if (Array.isArray(source.permission_names)) {
    return normalizePermissionNames(source.permission_names);
  }

  return [];
}

/**
 * Get current logged-in user.
 */
export function getCurrentUser() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem("user");

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Get all permissions available to current user.
 */
export function getCurrentUserPermissions() {
  const user = getCurrentUser();

  if (!user) {
    return [];
  }

  // Super admin is treated as unrestricted.
  if (
    user.role === "super_admin" ||
    user.role_name === "super_admin" ||
    user.roles?.some?.(
      (role) => role?.name === "super_admin"
    )
  ) {
    return ["*"];
  }

  return normalizePermissionNames(
    user.permissions ||
      user.permission_names ||
      user.permissionNames ||
      []
  );
}

/**
 * Check one permission.
 */
export function hasPermission(permission, permissions = null) {
  if (!permission) {
    return false;
  }

  const permissionList =
    permissions || getCurrentUserPermissions();

  if (permissionList.includes("*")) {
    return true;
  }

  return permissionList.includes(permission);
}

/**
 * Check multiple permissions.
 */
export function hasAnyPermission(
  permissions,
  currentPermissions = null
) {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.some((permission) =>
    hasPermission(permission, currentPermissions)
  );
}

/**
 * Check that all permissions exist.
 */
export function hasAllPermissions(
  permissions,
  currentPermissions = null
) {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.every((permission) =>
    hasPermission(permission, currentPermissions)
  );
}