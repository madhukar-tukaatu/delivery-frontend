// src/hooks/useAccess.js

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCurrentUser,
  getCurrentUserPermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "@/lib/access";

import { getMyMenus } from "@/services/accessApi";

export function useAccess() {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadAccess() {
      try {
        const currentUser = getCurrentUser();
        const localPermissions =
          getCurrentUserPermissions();

        if (mounted) {
          setUser(currentUser);
          setPermissions(localPermissions);
        }

        /*
         * Load menus as well.
         *
         * This keeps this hook compatible with your existing
         * /me/menus architecture.
         */
        try {
          const menuData = await getMyMenus();

          if (mounted) {
            setMenus(Array.isArray(menuData) ? menuData : []);
          }
        } catch {
          // Menu loading failure should not destroy
          // already available permission information.
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAccess();

    return () => {
      mounted = false;
    };
  }, []);

  const can = useCallback(
    (permission) =>
      hasPermission(permission, permissions),
    [permissions]
  );

  const canAny = useCallback(
    (permissionList) =>
      hasAnyPermission(
        permissionList,
        permissions
      ),
    [permissions]
  );

  const canAll = useCallback(
    (permissionList) =>
      hasAllPermissions(
        permissionList,
        permissions
      ),
    [permissions]
  );

  return useMemo(
    () => ({
      user,
      permissions,
      menus,
      loading,
      can,
      canAny,
      canAll,
    }),
    [
      user,
      permissions,
      menus,
      loading,
      can,
      canAny,
      canAll,
    ]
  );
}