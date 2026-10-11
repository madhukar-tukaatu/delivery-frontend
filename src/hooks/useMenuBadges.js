"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";

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
 * Refreshes on navigation, every `intervalMs`, when the tab regains focus
 * and when a page calls refreshMenuBadges(). Keeps the last good result on
 * errors so the sidebar never flickers.
 */
export default function useMenuBadges(section, pathname, intervalMs = 60000) {
  const [badges, setBadges] = useState({});
  const busy = useRef(false);
  const enabled = section === "admin" || section === "staff";

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

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const timer = window.setInterval(load, intervalMs);
    const onWake = () => load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onWake);
    window.addEventListener(MENU_BADGES_EVENT, onWake);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onWake);
      window.removeEventListener(MENU_BADGES_EVENT, onWake);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, load, intervalMs]);

  return enabled ? badges : {};
}
