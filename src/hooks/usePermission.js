"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

let cachedUser = null;
let pendingRequest = null;

const USER_STORAGE_KEYS = [
  "user",
  "auth_user",
  "current_user",
  "authenticated_user",
];

function normalizeNames(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((v) => {
      if (typeof v === "string") {
        return v;
      }

      if (v && typeof v === "object") {
        return v.name ?? v.code ?? null;
      }

      return null;
    })
    .filter(Boolean)
    .map((value) =>
      String(value).toLowerCase().trim(),
    );
}

/**
 * Try to retrieve the authenticated user from
 * localStorage/sessionStorage.
 *
 * Your stored user looks like:
 *
 * {
 *   id: 1,
 *   name: "Tukaatu Admin",
 *   role: "super_admin",
 *   roles: ["super_admin"],
 *   is_super_admin: true,
 *   branch: null,
 *   permissions: [...]
 * }
 */
function getStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const storages = [
    window.localStorage,
    window.sessionStorage,
  ];

  for (const storage of storages) {
    for (const key of USER_STORAGE_KEYS) {
      try {
        const value = storage.getItem(key);

        if (!value) {
          continue;
        }

        const parsed = JSON.parse(value);

        /*
         * Support common wrapper formats.
         */
        const user =
          parsed?.data?.user ??
          parsed?.user ??
          parsed?.data ??
          parsed;

        if (
          user &&
          typeof user === "object" &&
          user.id
        ) {
          return user;
        }
      } catch {
        // Ignore malformed localStorage values.
      }
    }
  }

  return null;
}

/**
 * Fetch current user from backend as fallback.
 */
async function fetchCurrentUser() {
  if (cachedUser) {
    return cachedUser;
  }

  /*
   * First try localStorage/sessionStorage.
   */
  const storedUser = getStoredUser();

  if (storedUser) {
    cachedUser = storedUser;
    return cachedUser;
  }

  /*
   * Prevent duplicate /auth/me requests.
   */
  if (pendingRequest) {
    return pendingRequest;
  }

  const token =
    typeof window !== "undefined"
      ? (
          window.localStorage.getItem(
            "access_token",
          ) ??
          window.localStorage.getItem(
            "token",
          ) ??
          window.sessionStorage.getItem(
            "access_token",
          ) ??
          window.sessionStorage.getItem(
            "token",
          )
        )
      : null;

  /*
   * If there is no token, there is no authenticated
   * user to fetch.
   */
  if (!token) {
    return null;
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
  ).replace(/\/$/, "");

  pendingRequest = fetch(
    `${baseUrl}/api/v1/auth/me`,
    {
      credentials: "include",
      cache: "no-store",

      headers: {
        Accept: "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    },
  )
    .then(async (res) => {
      if (!res.ok) {
        return null;
      }

      const payload = await res.json();

      const user =
        payload?.data?.user ??
        payload?.user ??
        payload?.data ??
        null;

      if (user) {
        cachedUser = user;
      }

      return user;
    })
    .catch(() => null)
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

/**
 * Invalidate the in-memory cache.
 *
 * Call this after login/logout.
 */
export function invalidateUserCache() {
  cachedUser = null;
  pendingRequest = null;
}

/**
 * Staff portal roles.
 */
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

/**
 * Admin roles.
 */
const ADMIN_ROLES = new Set([
  "super_admin",
  "super-admin",
  "superadmin",
  "admin",
  "web",
  "main_admin",
  "branch_manager",
  "sub_branch_manager",
  "franchise_manager",
  "pricing_manager",
  "booking_staff",
]);

export function usePermissions() {
  const [user, setUser] = useState(
    cachedUser ?? getStoredUser(),
  );

  const [loading, setLoading] = useState(
    !cachedUser && !getStoredUser(),
  );

  useEffect(() => {
    let active = true;

    /*
     * Check localStorage/sessionStorage first.
     */
    const storedUser = getStoredUser();

    if (storedUser) {
      cachedUser = storedUser;

      if (active) {
        setUser(storedUser);
        setLoading(false);
      }

      return undefined;
    }

    /*
     * Fall back to API.
     */
    fetchCurrentUser().then((currentUser) => {
      if (!active) {
        return;
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  /*
   * Normalize roles.
   */
  const roles = useMemo(
    () => {
      const userRoles = normalizeNames(
        user?.roles,
      );

      /*
       * Also support a single role field.
       */
      if (
        userRoles.length === 0 &&
        user?.role
      ) {
        return [
          String(user.role)
            .toLowerCase()
            .trim(),
        ];
      }

      return userRoles;
    },
    [user],
  );

  /*
   * Normalize permissions.
   */
  const permissions = useMemo(
    () =>
      new Set(
        normalizeNames(
          user?.permissions,
        ),
      ),
    [user],
  );

  /*
   * Primary role.
   */
  const primaryRole = useMemo(() => {
    if (user?.role) {
      return String(user.role)
        .toLowerCase()
        .trim();
    }

    return roles[0] ?? "";
  }, [user, roles]);

  /*
   * Super admin.
   *
   * Your stored user explicitly contains:
   *
   * is_super_admin: true
   *
   * so we should honor that.
   */
  const isSuperAdmin = useMemo(() => {
    if (user?.is_super_admin === true) {
      return true;
    }

    return roles.some((role) =>
      [
        "super_admin",
        "super-admin",
        "superadmin",
        "web",
        "admin",
      ].includes(role),
    );
  }, [user, roles]);

  /*
   * Branch manager.
   */
  const isBranchManager = useMemo(
    () =>
      !isSuperAdmin &&
      roles.some((role) =>
        [
          "branch_manager",
          "sub_branch_manager",
          "franchise_manager",
        ].includes(role),
      ),
    [isSuperAdmin, roles],
  );

  /*
   * Staff.
   */
  const isStaff = useMemo(
    () =>
      !isSuperAdmin &&
      !isBranchManager &&
      roles.some((role) =>
        STAFF_PORTAL_ROLES.has(role),
      ),
    [
      isSuperAdmin,
      isBranchManager,
      roles,
    ],
  );

  /*
   * Branch scope.
   *
   * Super admin has no branch restriction.
   */
  const branchId = useMemo(() => {
    if (isSuperAdmin) {
      return null;
    }

    return (
      user?.branch_id ??
      user?.default_branch_id ??
      user?.branch?.id ??
      user?.default_branch?.id ??
      null
    );
  }, [user, isSuperAdmin]);

  /*
   * Branch name.
   */
  const branchName = useMemo(() => {
    if (isSuperAdmin) {
      return null;
    }

    return (
      user?.branch?.name ??
      user?.default_branch?.name ??
      null
    );
  }, [user, isSuperAdmin]);

  /**
   * Check permission.
   *
   * Super admin automatically has access.
   *
   * Example:
   *
   * can("merchants.view")
   *
   * Also supports:
   *
   * merchants.manage
   *
   * granting:
   *
   * merchants.view
   * merchants.create
   * merchants.update
   * etc.
   */
  const can = useCallback(
    (permission) => {
      if (!permission) {
        return true;
      }

      if (isSuperAdmin) {
        return true;
      }

      if (permissions.has(permission)) {
        return true;
      }

      const [resource] =
        permission.split(".");

      if (
        permissions.has(
          `${resource}.manage`,
        )
      ) {
        return true;
      }

      return false;
    },
    [
      permissions,
      isSuperAdmin,
    ],
  );

  /**
   * Branch-scoped permission check.
   */
  const canForBranch = useCallback(
    (
      permission,
      resourceBranchId = null,
    ) => {
      if (!can(permission)) {
        return false;
      }

      if (isSuperAdmin) {
        return true;
      }

      if (resourceBranchId == null) {
        return true;
      }

      return (
        Number(branchId) ===
        Number(resourceBranchId)
      );
    },
    [
      can,
      isSuperAdmin,
      branchId,
    ],
  );

  return {
    user,
    roles,
    primaryRole,
    loading,
    permissions,

    can,
    canForBranch,

    isSuperAdmin,
    isBranchManager,
    isStaff,

    branchId,
    branchName,
  };
}