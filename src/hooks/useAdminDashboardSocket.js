import { useEffect, useRef } from "react";
import { message } from "antd";
import { getEcho } from "@/lib/echo";

export function useAdminDashboardSocket({ onRefresh, channelName = "admin.dashboard", showToasts = true } = {}) {
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private(channelName);

    channel.listen(".shipment.status.updated", (event) => {
      if (showToasts && (event.tracking_number || event.id)) {
        message.info(`Shipment ${event.tracking_number || event.id} updated`);
      }
      onRefreshRef.current?.(event);
    });

    channel.listen(".pickup.assigned", (event) => {
      if (showToasts) {
        message.success(`New pickup assigned: ${event.tracking_number || event.id}`);
      }
      onRefreshRef.current?.(event);
    });

    channel.listen(".pickup.status.updated", (event) => {
      onRefreshRef.current?.(event);
    });

    channel.listen(".delivery.assigned", (event) => {
      if (showToasts) {
        message.success(`New delivery assigned: ${event.tracking_number || event.id}`);
      }
      onRefreshRef.current?.(event);
    });

    channel.listen(".delivery.status.updated", (event) => {
      onRefreshRef.current?.(event);
    });

    return () => {
      echo.leave(channelName);
    };
  }, [channelName, showToasts]);
}
