"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Tag } from "antd";
import { getEcho } from "@/lib/echo";

/**
 * Reusable Realtime Badge for Admin page headers.
 * Matches the live pulse look from Merchant Applications.
 */
export function RealtimeStatusBadge({ connected, style = {} }) {
  return (
    <Tag
      color={connected ? "success" : "default"}
      style={{
        margin: 0,
        fontSize: 11,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "1px 8px",
        borderRadius: 12,
        fontWeight: 600,
        verticalAlign: "middle",
        ...style,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: connected ? "#22c55e" : "#94a3b8",
          boxShadow: connected ? "0 0 6px #22c55e" : "none",
        }}
      />
      {connected ? "Live" : "Connecting"}
    </Tag>
  );
}

/**
 * Universal hook for real-time admin channel subscriptions.
 * Updates data silently in the background without intrusive toast popups
 * or disruptive full-page flashes.
 *
 * @param {Object} options
 * @param {string} options.channelName - Primary private channel ('admin.shipments', 'admin.deliveries', 'admin.pickups', 'admin.transfers')
 * @param {Function} options.onRefresh - Callback to reload data when an event is received
 * @param {number} [options.debounceMs=1000] - Debounce burst updates
 */
export function useAdminRealtime({
  channelName,
  onRefresh,
  debounceMs = 1000,
} = {}) {
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  const debounceTimerRef = useRef(null);
  const seenEventsRef = useRef(new Map());

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const triggerRefresh = useCallback(
    (event, eventName) => {
      // 1. Deduplicate identical events arriving within 2.5 seconds
      const eventKey = `${eventName}:${event?.id || event?.tracking_number || event?.transfer?.id || ""}:${event?.status || event?.action || ""}`;
      const now = Date.now();
      const lastSeen = seenEventsRef.current.get(eventKey);
      if (lastSeen && now - lastSeen < 2500) {
        return;
      }
      seenEventsRef.current.set(eventKey, now);

      // Clean up old seen keys periodically
      if (seenEventsRef.current.size > 100) {
        for (const [k, t] of seenEventsRef.current.entries()) {
          if (now - t > 10000) seenEventsRef.current.delete(k);
        }
      }

      // 2. Debounce burst triggers into a single silent refresh
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onRefreshRef.current?.(event);
      }, debounceMs);
    },
    [debounceMs]
  );

  useEffect(() => {
    if (!channelName) return undefined;

    const echo = getEcho();
    if (!echo) return undefined;

    const connection = echo?.connector?.pusher?.connection;

    const handleConnected = () => {
      setRealtimeConnected(true);
    };

    const handleDisconnected = () => {
      setRealtimeConnected(false);
    };

    connection?.bind("connected", handleConnected);
    connection?.bind("disconnected", handleDisconnected);
    connection?.bind("error", handleDisconnected);
    connection?.bind("unavailable", handleDisconnected);

    setRealtimeConnected(connection?.state === "connected");

    // ONLY listen to the specific channel requested (never bleed admin.dashboard into other pages)
    const channel = echo.private(channelName);

    // Map channels to their specific event listeners
    const listeners = [];

    const bind = (eventName) => {
      const handler = (event) => triggerRefresh(event, eventName);
      channel.listen(`.${eventName}`, handler);
      channel.listen(eventName, handler);
      listeners.push({ eventName, handler });
    };

    if (channelName === "admin.shipments") {
      bind("shipment.status.updated");
    } else if (channelName === "admin.pickups") {
      bind("pickup.assigned");
      bind("pickup.status.updated");
    } else if (channelName === "admin.deliveries") {
      bind("delivery.assigned");
      bind("delivery.status.updated");
    } else if (channelName === "admin.transfers") {
      bind("transfer.status.updated");
    } else if (channelName === "admin.dashboard") {
      bind("shipment.status.updated");
      bind("pickup.assigned");
      bind("pickup.status.updated");
      bind("delivery.assigned");
      bind("delivery.status.updated");
      bind("transfer.status.updated");
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      listeners.forEach(({ eventName, handler }) => {
        try {
          channel.stopListening(`.${eventName}`);
          channel.stopListening(eventName);
        } catch {}
      });

      try {
        echo.leave(channelName);
      } catch {}

      connection?.unbind("connected", handleConnected);
      connection?.unbind("disconnected", handleDisconnected);
      connection?.unbind("error", handleDisconnected);
      connection?.unbind("unavailable", handleDisconnected);
    };
  }, [channelName, triggerRefresh]);

  return { realtimeConnected };
}
