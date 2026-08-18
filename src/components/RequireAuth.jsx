"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spin } from "antd";
import { getToken, getUser } from "@/lib/auth";

// Roles that use /staff/* portal
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

// Roles that use /merchant/* portal
const MERCHANT_PORTAL_ROLES = new Set([
  "merchant",
  "merchant_owner",
  "merchant_admin",
  "merchant_staff",
]);

// Everything else (super_admin, main_admin, branch_manager, sub_branch_manager,
// pricing_manager, booking_staff) → /admin/*

function getPrimaryRole(user) {
  if (!user) return "";
  if (user.role) return String(user.role).toLowerCase().trim();
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return String(roles[0]?.name ?? roles[0] ?? "").toLowerCase().trim();
}

function getPortalForRole(role) {
  if (MERCHANT_PORTAL_ROLES.has(role)) return "merchant";
  if (STAFF_PORTAL_ROLES.has(role)) return "staff";
  return "admin";
}

function getPortalFromPath(pathname) {
  if (pathname.startsWith("/staff/")) return "staff";
  if (pathname.startsWith("/merchant/")) return "merchant";
  if (pathname.startsWith("/rider/")) return "rider";
  return "admin";
}

export default function RequireAuth({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    const user = getUser();
    const role = getPrimaryRole(user);
    const allowedPortal = getPortalForRole(role);
    const currentPortal = getPortalFromPath(pathname);

    if (currentPortal !== allowedPortal) {
      router.replace(`/${allowedPortal}/dashboard`);
      return;
    }

    setReady(true);
  }, [router, pathname]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return children;
}
