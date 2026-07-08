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

  echo = new Echo({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || "127.0.0.1",
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT || 8080),
    forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https",
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"}/broadcasting/auth`,
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
