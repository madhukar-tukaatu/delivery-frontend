import { useEffect } from "react";
import { message } from "antd";
import { getEcho } from "@/lib/echo";

export function useAdminDashboardSocket({ onRefresh } = {}) {
  useEffect(() => {
    const echo = getEcho();
    if (!echo) return;

    const channel = echo.private("admin.dashboard");

    channel.listen(".shipment.status.updated", (event) => {
      message.info(`Shipment ${event.tracking_number || event.id} updated`);
      onRefresh?.(event);
    });

    channel.listen(".pickup.assigned", (event) => {
      message.success(`New pickup assigned: ${event.tracking_number || event.id}`);
      onRefresh?.(event);
    });

    channel.listen(".pickup.status.updated", (event) => {
      onRefresh?.(event);
    });

    channel.listen(".delivery.assigned", (event) => {
      message.success(`New delivery assigned: ${event.tracking_number || event.id}`);
      onRefresh?.(event);
    });

    channel.listen(".delivery.status.updated", (event) => {
      onRefresh?.(event);
    });

    return () => {
      echo.leave("admin.dashboard");
    };
  }, [onRefresh]);
}
