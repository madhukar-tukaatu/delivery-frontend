"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { getEcho } from "@/lib/echo";
import { getUser } from "@/lib/auth";

/** Window event any page can fire after an action that changes the counts. */
export const MENU_BADGES_EVENT = "menu-badges:refresh";

export function refreshMenuBadges() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MENU_BADGES_EVENT));
  }
}

/**
 * Sidebar badge counts keyed by menu path, from GET /me/menu-badges.
 * { "/admin/transfers": [{ key, count, label, color }], ... }
 *
 * Real-time WebSocket driven via Laravel Echo (Reverb).
 * No interval HTTP polling is used.
 */
export default function useMenuBadges(section, pathname, _intervalMs) {
  const [badges, setBadges] = useState({});
  const busy = useRef(false);
  const enabled = section === "admin" || section === "staff";
  const debounceTimer = useRef(null);

  const load = useCallback(async () => {
    if (!enabled || busy.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    busy.current = true;
    try {
      const res = await api.get("/me/menu-badges", { params: { section } });
      const next = res?.data?.data?.badges;
      setBadges(next && typeof next === "object" && !Array.isArray(next) ? next : {});
    } catch {
      /* keep the last counts */
    } finally {
      busy.current = false;
    }
  }, [enabled, section]);

  const debouncedLoad = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      load();
    }, 400);
  }, [load]);

  // Initial load when section changes or on first mount
  useEffect(() => {
    load();
  }, [load]);

  // Listen to manual local refresh events triggered by page actions
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    window.addEventListener(MENU_BADGES_EVENT, debouncedLoad);
    return () => {
      window.removeEventListener(MENU_BADGES_EVENT, debouncedLoad);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [enabled, debouncedLoad]);

  // WebSocket real-time subscription via Laravel Echo (Reverb)
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const echo = getEcho();
    if (!echo) return undefined;

    const user = getUser();
    const channels = [];

    const operationalEvents = [
      ".shipment.status.updated",
      ".pickup.assigned",
      ".pickup.status.updated",
      ".delivery.assigned",
      ".delivery.status.updated",
      ".branch.changed",
      ".merchant.application.changed",
      ".menu.badges.updated",
    ];

    try {
      if (section === "admin") {
        const adminChannel = echo.private("admin.dashboard");
        operationalEvents.forEach((evt) => {
          adminChannel.listen(evt, debouncedLoad);
        });
        channels.push("admin.dashboard");

        if (user?.branch_id) {
          const branchChannel = echo.private(`branch.${user.branch_id}`);
          operationalEvents.forEach((evt) => {
            branchChannel.listen(evt, debouncedLoad);
          });
          channels.push(`branch.${user.branch_id}`);
        }
      } else if (section === "staff" && user?.id) {
        const staffChannel = echo.private(`staff.${user.id}`);
        operationalEvents.forEach((evt) => {
          staffChannel.listen(evt, debouncedLoad);
        });
        channels.push(`staff.${user.id}`);
      }
    } catch (err) {
      console.warn("[MenuBadges] WebSocket subscription error:", err);
    }

    return () => {
      channels.forEach((name) => {
        try {
          echo.leave(name);
        } catch {
          // ignore cleanup errors
        }
      });
    };
  }, [enabled, section, debouncedLoad]);

  return enabled ? badges : {};
}
