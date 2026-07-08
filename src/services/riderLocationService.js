import api from "@/lib/api";

export async function updateRiderLocation(payload) {
  const response = await api.post("/staff/rider-location", payload);
  return response.data?.data || response.data;
}

export function startBrowserRiderLocation({ shipmentId, intervalMs = 8000, onSuccess, onError } = {}) {
  if (typeof window === "undefined" || !navigator.geolocation) {
    onError?.(new Error("Geolocation is not available."));
    return () => {};
  }

  let stopped = false;
  let timer = null;

  async function sendPosition(position) {
    if (stopped) return;

    try {
      const payload = {
        shipment_id: shipmentId || undefined,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined,
      };

      const result = await updateRiderLocation(payload);
      onSuccess?.(result);
    } catch (error) {
      onError?.(error);
    }
  }

  function tick() {
    navigator.geolocation.getCurrentPosition(sendPosition, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    });
  }

  tick();
  timer = window.setInterval(tick, intervalMs);

  return () => {
    stopped = true;
    if (timer) window.clearInterval(timer);
  };
}
