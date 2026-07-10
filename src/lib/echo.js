import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echo = null;

function getAuthToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token")
  );
}

export function getEcho() {
  if (typeof window === "undefined") return null;

  if (echo) return echo;

  window.Pusher = Pusher;

  const token = getAuthToken();

  const reverbHost =
    process.env.NEXT_PUBLIC_REVERB_HOST || "ws.tukaatuexpress.com";

  const reverbPort = Number(process.env.NEXT_PUBLIC_REVERB_PORT || 443);

  const reverbScheme =
    process.env.NEXT_PUBLIC_REVERB_SCHEME || "https";

  const apiOrigin =
    process.env.NEXT_PUBLIC_API_ORIGIN || "https://api.tukaatuexpress.com";

  echo = new Echo({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,

    wsHost: reverbHost,
    wsPort: reverbPort,
    wssPort: reverbPort,

    forceTLS: reverbScheme === "https",
    encrypted: reverbScheme === "https",

    enabledTransports: ["ws", "wss"],

    authEndpoint: `${apiOrigin}/broadcasting/auth`,

    auth: {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/json",
      },
    },
  });

  return echo;
}

export function disconnectEcho() {
  if (echo) {
    echo.disconnect();
    echo = null;
  }
}
