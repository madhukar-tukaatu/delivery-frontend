import { useEffect, useRef } from "react";
import { message } from "antd";
import { getEcho } from "@/lib/echo";

export function useStaffSocket(userId, { onPickupAssigned, onPickupUpdated, onDeliveryAssigned, onDeliveryUpdated } = {}) {
  const cbs = useRef({ onPickupAssigned, onPickupUpdated, onDeliveryAssigned, onDeliveryUpdated });
  useEffect(() => {
    cbs.current = { onPickupAssigned, onPickupUpdated, onDeliveryAssigned, onDeliveryUpdated };
  }, [onPickupAssigned, onPickupUpdated, onDeliveryAssigned, onDeliveryUpdated]);

  useEffect(() => {
    if (!userId) return undefined;

    try {
      const echo = getEcho();
      if (!echo) return undefined;

      const channelName = `staff.${userId}`;
      const channel = echo.private(channelName);

      const handlePickupAssigned = (event) => {
        message.success(`New pickup: ${event?.tracking_number || event?.id || ""}`);
        cbs.current.onPickupAssigned?.(event);
      };

      const handlePickupUpdated = (event) => {
        cbs.current.onPickupUpdated?.(event);
      };

      const handleDeliveryAssigned = (event) => {
        message.success(`New delivery: ${event?.tracking_number || event?.id || ""}`);
        cbs.current.onDeliveryAssigned?.(event);
      };

      const handleDeliveryUpdated = (event) => {
        cbs.current.onDeliveryUpdated?.(event);
      };

      channel.listen(".pickup.assigned", handlePickupAssigned);
      channel.listen("pickup.assigned", handlePickupAssigned);
      channel.listen(".pickup.status.updated", handlePickupUpdated);
      channel.listen("pickup.status.updated", handlePickupUpdated);
      channel.listen(".delivery.assigned", handleDeliveryAssigned);
      channel.listen("delivery.assigned", handleDeliveryAssigned);
      channel.listen(".delivery.status.updated", handleDeliveryUpdated);
      channel.listen("delivery.status.updated", handleDeliveryUpdated);

      return () => {
        try {
          channel.stopListening(".pickup.assigned");
          channel.stopListening("pickup.assigned");
          channel.stopListening(".pickup.status.updated");
          channel.stopListening("pickup.status.updated");
          channel.stopListening(".delivery.assigned");
          channel.stopListening("delivery.assigned");
          channel.stopListening(".delivery.status.updated");
          channel.stopListening("delivery.status.updated");
          echo.leave(channelName);
        } catch {}
      };
    } catch (err) {
      console.warn("useStaffSocket error:", err);
      return undefined;
    }
  }, [userId]);
}
