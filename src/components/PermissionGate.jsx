"use client";

import { usePermissions } from "@/hooks/usePermission";

/**
 * Conditionally renders children based on role/permission.
 *
 * Props:
 *   permission      – e.g. "shipments.view"  (optional)
 *   role            – e.g. "branch_manager"  (optional, OR logic with permission)
 *   anyRole         – string[]  (user must have at least one)
 *   branchId        – number    (if set, also checks canForBranch)
 *   fallback        – ReactNode shown when access is denied (default: null)
 *   loadingFallback – ReactNode shown while permissions are loading (default: null)
 */
export default function PermissionGate({
  permission,
  role,
  anyRole,
  branchId,
  children,
  fallback = null,
  loadingFallback = null,
}) {
  const { loading, can, canForBranch, roles, isSuperAdmin } = usePermissions();

  if (loading) return loadingFallback;

  if (isSuperAdmin) return children;

  // Role check
  if (role && !roles.includes(role)) return fallback;
  if (anyRole?.length && !anyRole.some((r) => roles.includes(r))) return fallback;

  // Permission check (with optional branch scope)
  if (permission) {
    const allowed = branchId != null
      ? canForBranch(permission, branchId)
      : can(permission);
    if (!allowed) return fallback;
  }

  return children;
}
