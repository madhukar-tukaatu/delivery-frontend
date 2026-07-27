// export const usePermissions = () => {
//   const { user } = useAuth(); // your auth context

//   const can = (permission) => user?.permissions?.includes(permission) || false;
//   return { can };
// };

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

let cachedUser = null;
let pendingRequest = null;

function normalizeNames(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => {
      if (typeof value === "string") return value;
      if (value && typeof value === "object")
        return value.name ?? value.code ?? null;
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
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = await response.json();
      const user =
        payload?.data?.user ?? payload?.user ?? payload?.data ?? null;
      cachedUser = user;
      return user;
    })
    .catch(() => null)
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function usePermissions() {
  const [user, setUser] = useState(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    let active = true;

    if (cachedUser) {
      setLoading(false);
      return undefined;
    }

    fetchCurrentUser().then((nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const roles = useMemo(() => normalizeNames(user?.roles), [user]);
  const permissions = useMemo(
    () => new Set(normalizeNames(user?.permissions)),
    [user],
  );
  const superAdmin = roles.some((role) =>
    ["super_admin", "super-admin", "superadmin","web","admin"].includes(role),
  );

  const can = useCallback(
    (permission) => {
      if (!permission) return true;
      if (superAdmin) return true;
      return permissions.has(permission);
    },
    [permissions, superAdmin],
  );

  return { user, roles, loading, can, isSuperAdmin: superAdmin };
}
