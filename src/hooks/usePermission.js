"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

let cachedUser = null;
let pendingRequest = null;

function normalizeNames(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object") return v.name ?? v.code ?? null;
      return null;
    })
    .filter(Boolean);
}

async function fetchCurrentUser() {
  if (cachedUser) return cachedUser;
  if (pendingRequest) return pendingRequest;

  const token =
    typeof window !== "undefined"
      ? (window.localStorage.getItem("access_token") ??
        window.localStorage.getItem("token") ??
        window.sessionStorage.getItem("access_token") ??
        window.sessionStorage.getItem("token"))
      : null;

  pendingRequest = fetch(
    `${(process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")}/api/v1/auth/me`,
    {
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  )
    .then(async (res) => {
      if (!res.ok) return null;
      const payload = await res.json();
      const user = payload?.data?.user ?? payload?.user ?? payload?.data ?? null;
      cachedUser = user;
      return user;
    })
    .catch(() => null)
    .finally(() => { pendingRequest = null; });

  return pendingRequest;
}

/** Invalidate the in-memory cache (call after login/logout). */
export function invalidateUserCache() {
  cachedUser = null;
  pendingRequest = null;
}

const STAFF_PORTAL_ROLES = new Set([
  "pickup_staff",
  "dispatch_staff",
  "delivery_staff",
  "warehouse_staff",
  "branch_staff",
  "support_staff",
  "accounts_staff",
  "rider",
]);

const ADMIN_ROLES = new Set([
  "super_admin", "super-admin", "superadmin", "admin", "web",
  "main_admin", "branch_manager", "sub_branch_manager",
  "franchise_manager", "pricing_manager", "booking_staff",
]);

export function usePermissions() {
  const [user, setUser] = useState(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    let active = true;
    if (cachedUser) { setLoading(false); return undefined; }
    fetchCurrentUser().then((u) => {
      if (!active) return;
      setUser(u);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const roles = useMemo(() => normalizeNames(user?.roles), [user]);

  const permissions = useMemo(
    () => new Set(normalizeNames(user?.permissions)),
    [user],
  );

  const primaryRole = useMemo(() => {
    if (user?.role) return String(user.role).toLowerCase().trim();
    return roles[0] ?? "";
  }, [user, roles]);

  const isSuperAdmin = roles.some((r) =>
    ["super_admin", "super-admin", "superadmin", "web", "admin"].includes(r),
  );

  const isBranchManager = !isSuperAdmin && roles.some((r) =>
    ["branch_manager", "sub_branch_manager", "franchise_manager"].includes(r),
  );

  const isStaff = !isSuperAdmin && !isBranchManager && roles.some((r) =>
    STAFF_PORTAL_ROLES.has(r),
  );

  /** The branch this user is scoped to (null for super_admin). */
  const branchId = useMemo(() => {
    if (isSuperAdmin) return null;
    return user?.branch_id ?? user?.default_branch_id ?? null;
  }, [user, isSuperAdmin]);

  const branchName = useMemo(() => {
    if (isSuperAdmin) return null;
    return user?.branch?.name ?? user?.default_branch?.name ?? null;
  }, [user, isSuperAdmin]);

  const can = useCallback(
    (permission) => {
      if (!permission) return true;
      if (isSuperAdmin) return true;
      if (permissions.has(permission)) return true;
      // wildcard: branches.manage covers branches.view, branches.create, etc.
      const [resource] = permission.split(".");
      if (permissions.has(`${resource}.manage`)) return true;
      return false;
    },
    [permissions, isSuperAdmin],
  );

  /**
   * For branch-scoped checks: returns true only if the user has the permission
   * AND (is super_admin OR the resource belongs to their branch).
   */
  const canForBranch = useCallback(
    (permission, resourceBranchId = null) => {
      if (!can(permission)) return false;
      if (isSuperAdmin) return true;
      if (resourceBranchId == null) return true;
      return Number(branchId) === Number(resourceBranchId);
    },
    [can, isSuperAdmin, branchId],
  );

  return {
    user,
    roles,
    primaryRole,
    loading,
    can,
    canForBranch,
    isSuperAdmin,
    isBranchManager,
    isStaff,
    branchId,
    branchName,
  };
}
