export function saveAuth(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}
export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
// export function hasPermission(permission) {
//   const user = getUser();
//   if (!permission) return true;
//   if (user?.is_super_admin || user?.role === "super_admin") return true;
//   return (user?.permissions || []).includes(permission);
// }

export function hasPermission(permission) {
  const user = getUser();

  if (!permission) return true;
  if (!user) return false;

  // ✅ Super Admin
  if (user.is_super_admin || user.role === "super_admin") return true;

  // ✅ Direct permission
  if (user.permissions?.includes(permission)) return true;

  // ✅ Support: branches.manage → branches.*
  const [resource] = permission.split(".");
  if (user.permissions?.includes(`${resource}.manage`)) return true;

  return false;
}
// export function routeForRole(role, user = null) {
//   const u = user || getUser();
//   const roles = u?.roles || [role];
//   if (roles.includes("merchant") || role === "merchant")
//     return "/merchant/dashboard";
//   if (
//     roles.includes("rider") ||
//     roles.includes("pickup_staff") ||
//     role === "rider" ||
//     role === "pickup_staff"
//   )
//     return "/staff/dashboard";
//   return "/admin/dashboard";
// }

/**
 * ✅ FILTER MENUS FROM BACKEND
 */
export function getAllowedMenus(section = "admin") {
  const user = getUser();
  if (!user) return [];

  const menus = user?.menus?.[section] || [];

  return menus
    .filter((item) => hasPermission(item.permission))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

/**
 * ✅ ROLE BASED REDIRECT
 */
export function routeForRole(role, user = null) {
  const u = user || getUser();
  const roles = u?.roles || [role];

  if (roles.includes("merchant") || role === "merchant")
    return "/merchant/dashboard";

  if (
    roles.includes("rider") ||
    roles.includes("pickup_staff") ||
    role === "rider" ||
    role === "pickup_staff"
  )
    return "/staff/dashboard";

  return "/admin/dashboard";
}

export function getMenus() {
  const user = getUser();
  return user?.menus || [];
}