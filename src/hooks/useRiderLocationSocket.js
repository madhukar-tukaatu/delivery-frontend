import { useEffect } from "react";
import { getEcho } from "@/lib/echo";

export function useRiderLocationSocket(riderId, onLocation) {
  useEffect(() => {
    if (!riderId) return;

    const echo = getEcho();
    if (!echo) return;

    const channelName = `rider.${riderId}.location`;
    const channel = echo.private(channelName);

    channel.listen(".rider.location.updated", (event) => {
      onLocation?.(event);
    });

    return () => {
      echo.leave(channelName);
    };
  }, [riderId, onLocation]);
}
