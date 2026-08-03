"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echoInstance = null;

function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("admin_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");

  return token
    ? token.replace(/^Bearer\s+/i, "")
    : null;
}

export function getEcho() {
  if (typeof window === "undefined") {
    return null;
  }

  if (echoInstance) {
    return echoInstance;
  }

  window.Pusher = Pusher;

  const scheme =
    process.env
      .NEXT_PUBLIC_REVERB_SCHEME ||
    "http";

  const secure =
    scheme === "https";

  const host =
    process.env
      .NEXT_PUBLIC_REVERB_HOST ||
    "localhost";

  const port = Number(
    process.env
      .NEXT_PUBLIC_REVERB_PORT ||
      (secure ? 443 : 8080)
  );

  const appKey =
    process.env
      .NEXT_PUBLIC_REVERB_APP_KEY ||
    "delivery-key";

  const apiOrigin =
    process.env
      .NEXT_PUBLIC_API_ORIGIN ||
    "http://localhost:8081";

  echoInstance = new Echo({
    broadcaster: "reverb",
    key: appKey,

    wsHost: host,
    wsPort: port,
    wssPort: port,

    forceTLS: secure,
    encrypted: secure,

    enabledTransports: secure
      ? ["wss"]
      : ["ws"],

    /*
     * Reads the current token each time a private
     * channel is authorized.
     */
    authorizer: (channel) => ({
      authorize: async (
        socketId,
        callback
      ) => {
        try {
          const token =
            getAuthToken();

          const response =
            await fetch(
              `${apiOrigin}/api/broadcasting/auth`,
              {
                method: "POST",

                credentials:
                  "include",

                headers: {
                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json",

                  ...(token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : {}),
                },

                body: JSON.stringify({
                  socket_id:
                    socketId,

                  channel_name:
                    channel.name,
                }),
              }
            );

          const body =
            await response.json();

          if (!response.ok) {
            throw new Error(
              body?.message ||
                `Broadcast authorization failed (${response.status}).`
            );
          }

          callback(
            false,
            body
          );
        } catch (error) {
          console.error(
            "[Reverb] Channel authorization failed",
            error
          );

          callback(
            true,
            error
          );
        }
      },
    }),

    disableStats: true,
  });

  window.deliveryEcho =
    echoInstance;

  const connection =
    echoInstance.connector
      ?.pusher?.connection;

  connection?.bind(
    "connected",
    () => {
      console.info(
        "[Reverb] Connected",
        {
          socketId:
            connection.socket_id,

          host,
          port,
          scheme,
        }
      );
    }
  );

  connection?.bind(
    "error",
    (error) => {
      console.error(
        "[Reverb] Connection error",
        error
      );
    }
  );

  connection?.bind(
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

  if (
    typeof window !== "undefined"
  ) {
    delete window.deliveryEcho;
  }
}