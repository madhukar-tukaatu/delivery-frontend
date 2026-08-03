"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echoInstance = null;

/**
 * Return the current authentication token.
 * The token is read again whenever a private channel
 * needs authorization.
 */
function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const token =
    window.localStorage.getItem("access_token") ||
    window.localStorage.getItem("admin_token") ||
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("auth_token") ||
    window.sessionStorage.getItem("access_token") ||
    window.sessionStorage.getItem("token");

  if (!token) {
    return null;
  }

  return token.replace(/^Bearer\s+/i, "").trim();
}

/**
 * Safely read an API response.
 */
async function readResponse(response) {
  const contentType =
    response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    message:
      text ||
      `Broadcast authorization failed (${response.status}).`,
  };
}

/**
 * Create or return the Laravel Echo instance.
 */
export function getEcho() {
  if (typeof window === "undefined") {
    return null;
  }

  if (echoInstance) {
    return echoInstance;
  }

  window.Pusher = Pusher;

  const scheme =
    process.env.NEXT_PUBLIC_REVERB_SCHEME ||
    (window.location.protocol === "https:"
      ? "https"
      : "http");

  const secure = scheme === "https";

  const host =
    process.env.NEXT_PUBLIC_REVERB_HOST ||
    "localhost";

  const configuredPort = Number(
    process.env.NEXT_PUBLIC_REVERB_PORT
  );

  const port = Number.isFinite(configuredPort)
    ? configuredPort
    : secure
      ? 443
      : 8080;

  const appKey =
    process.env.NEXT_PUBLIC_REVERB_APP_KEY ||
    "delivery-key";

  const apiOrigin = (
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    "http://localhost:8081"
  ).replace(/\/+$/, "");

  echoInstance = new Echo({
    broadcaster: "reverb",

    key: appKey,

    wsHost: host,
    wsPort: port,
    wssPort: port,

    /*
     * For production:
     * enabledTransports remains "ws".
     * forceTLS=true makes Pusher use wss://.
     */
    forceTLS: secure,
    enabledTransports: ["ws"],

    /*
     * Authorize private and presence channels.
     */
    authorizer: (channel) => ({
      authorize: async (
        socketId,
        callback
      ) => {
        try {
          const token = getAuthToken();

          const response = await fetch(
            `${apiOrigin}/api/broadcasting/auth`,
            {
              method: "POST",

              credentials: "include",

              headers: {
                Accept: "application/json",
                "Content-Type":
                  "application/json",

                ...(token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {}),
              },

              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            }
          );

          const body =
            await readResponse(response);

          if (!response.ok) {
            throw new Error(
              body?.message ||
                `Broadcast authorization failed (${response.status}).`
            );
          }

          callback(false, body);
        } catch (error) {
          console.error(
            "[Reverb] Channel authorization failed",
            error
          );

          callback(true, error);
        }
      },
    }),

    disableStats: true,
  });

  window.deliveryEcho = echoInstance;

  const connection =
    echoInstance.connector
      ?.pusher
      ?.connection;

  connection?.bind(
    "state_change",
    ({ previous, current }) => {
      console.info(
        "[Reverb] State changed",
        {
          previous,
          current,
        }
      );
    }
  );

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

  connection?.bind(
    "failed",
    () => {
      console.error(
        "[Reverb] Connection failed",
        {
          host,
          port,
          scheme,
        }
      );
    }
  );

  return echoInstance;
}

/**
 * Disconnect and remove the existing Echo instance.
 */
export function disconnectEcho() {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (error) {
      console.warn(
        "[Reverb] Disconnect warning",
        error
      );
    }
  }

  echoInstance = null;

  if (typeof window !== "undefined") {
    delete window.deliveryEcho;
  }
}