import { useEffect } from "react";
import { message } from "antd";
import { getEcho } from "@/lib/echo";

export function useStaffSocket(userId, { onPickupAssigned, onPickupUpdated, onDeliveryAssigned, onDeliveryUpdated } = {}) {
  useEffect(() => {
    if (!userId) return;

    const echo = getEcho();
    if (!echo) return;

    const channelName = `staff.${userId}`;
    const channel = echo.private(channelName);

    channel.listen(".pickup.assigned", (event) => {
      message.success(`New pickup: ${event.tracking_number || event.id}`);
      onPickupAssigned?.(event);
    });

    channel.listen(".pickup.status.updated", (event) => {
      onPickupUpdated?.(event);
    });

    channel.listen(".delivery.assigned", (event) => {
      message.success(`New delivery: ${event.tracking_number || event.id}`);
      onDeliveryAssigned?.(event);
    });

    channel.listen(".delivery.status.updated", (event) => {
      onDeliveryUpdated?.(event);
    });

    return () => {
      echo.leave(channelName);
    };
  }, [userId, onPickupAssigned, onPickupUpdated, onDeliveryAssigned, onDeliveryUpdated]);
}
