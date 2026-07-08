import { useEffect } from "react";
import { message } from "antd";
import { getEcho } from "@/lib/echo";

export function useMerchantSocket(merchantId, { onShipmentUpdated, onPickupAssigned, onDeliveryUpdated } = {}) {
  useEffect(() => {
    if (!merchantId) return;

    const echo = getEcho();
    if (!echo) return;

    const channelName = `merchant.${merchantId}`;
    const channel = echo.private(channelName);

    channel.listen(".shipment.status.updated", (event) => {
      message.info(`Shipment ${event.tracking_number || event.id}: ${event.status}`);
      onShipmentUpdated?.(event);
    });

    channel.listen(".pickup.assigned", (event) => {
      onPickupAssigned?.(event);
    });

    channel.listen(".delivery.status.updated", (event) => {
      onDeliveryUpdated?.(event);
    });

    return () => {
      echo.leave(channelName);
    };
  }, [merchantId, onShipmentUpdated, onPickupAssigned, onDeliveryUpdated]);
}
