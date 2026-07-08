"use client";

import { useEffect, useState } from "react";
import { Badge, Tooltip } from "antd";
import { getEcho } from "@/lib/echo";

export default function RealtimeStatusBadge() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const echo = getEcho();
    const connector = echo?.connector;
    const pusher = connector?.pusher;

    if (!pusher) return;

    const handleConnected = () => setConnected(true);
    const handleDisconnected = () => setConnected(false);

    pusher.connection.bind("connected", handleConnected);
    pusher.connection.bind("disconnected", handleDisconnected);
    pusher.connection.bind("unavailable", handleDisconnected);
    pusher.connection.bind("failed", handleDisconnected);

    setConnected(pusher.connection.state === "connected");

    return () => {
      pusher.connection.unbind("connected", handleConnected);
      pusher.connection.unbind("disconnected", handleDisconnected);
      pusher.connection.unbind("unavailable", handleDisconnected);
      pusher.connection.unbind("failed", handleDisconnected);
    };
  }, []);

  return (
    <Tooltip title={connected ? "Realtime connected" : "Realtime disconnected"}>
      <Badge status={connected ? "success" : "default"} text={connected ? "Live" : "Offline"} />
    </Tooltip>
  );
}
