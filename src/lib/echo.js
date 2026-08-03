"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echoInstance = null;

function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored =
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token");

  if (!stored) {
    return null;
  }

  return stored.replace(/^Bearer\s+/i, "");
}

export function getEcho() {
  if (typeof window === "undefined") {
    return null;
  }

  if (echoInstance) {
    return echoInstance;
  }

  window.Pusher = Pusher;

  const token = getAuthToken();

  const secure =
    window.location.protocol === "https:";

  const scheme =
    process.env.NEXT_PUBLIC_REVERB_SCHEME ||
    (secure ? "https" : "http");

  const forceTLS =
    scheme === "https";

  const host =
    process.env.NEXT_PUBLIC_REVERB_HOST ||
    window.location.hostname;

  const port = Number(
    process.env.NEXT_PUBLIC_REVERB_PORT ||
      (forceTLS ? 443 : 8080)
  );

  const apiOrigin =
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    (
      secure
        ? "https://api.tukaatuexpress.com"
        : "http://localhost:8081"
    );

  echoInstance = new Echo({
    broadcaster: "reverb",

    key:
      process.env.NEXT_PUBLIC_REVERB_APP_KEY,

    wsHost: host,
    wsPort: port,
    wssPort: port,

    forceTLS,
    encrypted: forceTLS,

    enabledTransports: forceTLS
      ? ["wss"]
      : ["ws", "wss"],

    authEndpoint:
      `${apiOrigin}/broadcasting/auth`,

    auth: {
      headers: {
        ...(token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {}),

        Accept: "application/json",
      },
    },

    disableStats: true,
  });

  window.deliveryEcho = echoInstance;

  const connection =
    echoInstance.connector.pusher.connection;

  connection.bind(
    "connected",
    () => {
      console.info(
        "[Reverb] Connected",
        connection.socket_id
      );
    }
  );

  connection.bind(
    "error",
    (error) => {
      console.error(
        "[Reverb] Connection error",
        error
      );
    }
  );

  connection.bind(
    "disconnected",
    () => {
      console.warn(
        "[Reverb] Disconnected"
      );
    }
  );

  return echoInstance;
}

export function disconnectEcho() {
  if (!echoInstance) {
    return;
  }

  echoInstance.disconnect();
  echoInstance = null;

  if (typeof window !== "undefined") {
    delete window.deliveryEcho;
  }
}