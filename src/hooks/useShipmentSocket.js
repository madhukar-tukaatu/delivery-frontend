import { useEffect } from "react";
import { getEcho } from "@/lib/echo";

export function useShipmentSocket(shipmentId, { onShipmentUpdated, onRiderLocation } = {}) {
  useEffect(() => {
    if (!shipmentId) return;

    const echo = getEcho();
    if (!echo) return;

    const channelName = `shipments.${shipmentId}`;
    const channel = echo.private(channelName);

    channel.listen(".shipment.status.updated", (event) => {
      onShipmentUpdated?.(event);
    });

    channel.listen(".rider.location.updated", (event) => {
      onRiderLocation?.(event);
    });

    return () => {
      echo.leave(channelName);
    };
  }, [shipmentId, onShipmentUpdated, onRiderLocation]);
}
