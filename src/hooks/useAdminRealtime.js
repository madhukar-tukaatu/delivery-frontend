"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Tag, message } from "antd";
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
 * Universal hook for real-time admin channel subscriptions
 *
 * @param {Object} options
 * @param {string} options.channelName - Primary private channel (e.g., 'admin.shipments', 'admin.deliveries', 'admin.pickups', 'admin.transfers')
 * @param {Function} options.onRefresh - Callback to reload data when an event is received
 * @param {boolean} [options.showToasts=false] - Whether to show toast notifications
 * @param {number} [options.debounceMs=300] - Debounce burst updates
 */
export function useAdminRealtime({
  channelName,
  onRefresh,
  showToasts = false,
  debounceMs = 300,
} = {}) {
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const triggerRefresh = useCallback(
    (event) => {
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

    // Channels to listen on: primary channel and admin.dashboard
    const channels = [];
    if (channelName) {
      channels.push(echo.private(channelName));
    }
    if (channelName !== "admin.dashboard") {
      channels.push(echo.private("admin.dashboard"));
    }

    const handleShipmentUpdated = (event) => {
      if (showToasts && (event?.tracking_number || event?.id)) {
        message.info(`Shipment ${event.tracking_number || event.id} updated`);
      }
      triggerRefresh(event);
    };

    const handlePickupAssigned = (event) => {
      if (showToasts) {
        message.success(`Pickup assigned: ${event?.tracking_number || event?.id}`);
      }
      triggerRefresh(event);
    };

    const handlePickupUpdated = (event) => {
      triggerRefresh(event);
    };

    const handleDeliveryAssigned = (event) => {
      if (showToasts) {
        message.success(`Delivery assigned: ${event?.tracking_number || event?.id}`);
      }
      triggerRefresh(event);
    };

    const handleDeliveryUpdated = (event) => {
      triggerRefresh(event);
    };

    const handleTransferUpdated = (event) => {
      if (showToasts && event?.action) {
        message.info(`Transfer ${event.action}`);
      }
      triggerRefresh(event);
    };

    channels.forEach((ch) => {
      ch.listen(".shipment.status.updated", handleShipmentUpdated);
      ch.listen("shipment.status.updated", handleShipmentUpdated);
      ch.listen(".pickup.assigned", handlePickupAssigned);
      ch.listen("pickup.assigned", handlePickupAssigned);
      ch.listen(".pickup.status.updated", handlePickupUpdated);
      ch.listen("pickup.status.updated", handlePickupUpdated);
      ch.listen(".delivery.assigned", handleDeliveryAssigned);
      ch.listen("delivery.assigned", handleDeliveryAssigned);
      ch.listen(".delivery.status.updated", handleDeliveryUpdated);
      ch.listen("delivery.status.updated", handleDeliveryUpdated);
      ch.listen(".transfer.status.updated", handleTransferUpdated);
      ch.listen("transfer.status.updated", handleTransferUpdated);
    });

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      channels.forEach((ch) => {
        ch.stopListening(".shipment.status.updated");
        ch.stopListening("shipment.status.updated");
        ch.stopListening(".pickup.assigned");
        ch.stopListening("pickup.assigned");
        ch.stopListening(".pickup.status.updated");
        ch.stopListening("pickup.status.updated");
        ch.stopListening(".delivery.assigned");
        ch.stopListening("delivery.assigned");
        ch.stopListening(".delivery.status.updated");
        ch.stopListening("delivery.status.updated");
        ch.stopListening(".transfer.status.updated");
        ch.stopListening("transfer.status.updated");
      });

      if (channelName) {
        try {
          echo.leave(channelName);
        } catch {}
      }

      connection?.unbind("connected", handleConnected);
      connection?.unbind("disconnected", handleDisconnected);
      connection?.unbind("error", handleDisconnected);
      connection?.unbind("unavailable", handleDisconnected);
    };
  }, [channelName, showToasts, triggerRefresh]);

  return { realtimeConnected };
}
