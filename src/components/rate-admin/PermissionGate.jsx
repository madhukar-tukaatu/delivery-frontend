"use client";

import { usePermissions } from "@/hooks/usePermission";

export default function PermissionGate({ permission, children, fallback = null }) {
  const { loading, can } = usePermissions();

  if (loading) return null;
  return can(permission) ? children : fallback;
}
