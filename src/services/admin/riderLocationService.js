import api from "@/lib/api";

export async function updateRiderLocation(payload) {
  const response = await api.post("/staff/rider-location", payload);
  return response.data?.data || response.data;
}

/** Send single one-shot real GPS ping from browser */
export function sendCurrentRiderLocation({ runId, shipmentId, trackingNumber, onSuccess, onError } = {}) {
  if (typeof window === "undefined" || !navigator.geolocation) {
    onError?.(new Error("Geolocation is not supported by your browser."));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const payload = {
          run_id: runId || undefined,
          shipment_id: shipmentId || undefined,
          tracking_number: trackingNumber || undefined,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: Number.isFinite(position.coords.heading) ? position.coords.heading : undefined,
          speed: Number.isFinite(position.coords.speed) ? position.coords.speed * 3.6 : undefined, // m/s to km/h
          accuracy: position.coords.accuracy,
        };
        const result = await updateRiderLocation(payload);
        onSuccess?.(result, payload);
      } catch (err) {
        onError?.(err);
      }
    },
    (err) => onError?.(err),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 4000 }
  );
}

/** Continuous real-time GPS tracking via watchPosition + interval fallback */
export function startBrowserRiderLocation({ runId, shipmentId, trackingNumber, intervalMs = 8000, onSuccess, onError } = {}) {
  if (typeof window === "undefined" || !navigator.geolocation) {
    onError?.(new Error("Geolocation is not available on this device."));
    return () => {};
  }

  let stopped = false;
  let timer = null;
  let watchId = null;
  let lastSentTime = 0;
  let lastLat = null;
  let lastLng = null;

  async function handlePosition(position) {
    if (stopped) return;
    const now = Date.now();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Throttle duplicate pings if moved less than 3 meters and within 5 seconds
    if (
      lastLat !== null &&
      lastLng !== null &&
      now - lastSentTime < 5000 &&
      Math.abs(lat - lastLat) < 0.00003 &&
      Math.abs(lng - lastLng) < 0.00003
    ) {
      return;
    }

    lastSentTime = now;
    lastLat = lat;
    lastLng = lng;

    try {
      const payload = {
        run_id: runId || undefined,
        shipment_id: shipmentId || undefined,
        tracking_number: trackingNumber || undefined,
        lat,
        lng,
        heading: Number.isFinite(position.coords.heading) ? position.coords.heading : undefined,
        speed: Number.isFinite(position.coords.speed) ? position.coords.speed * 3.6 : undefined,
        accuracy: position.coords.accuracy,
      };

      const result = await updateRiderLocation(payload);
      onSuccess?.(result, payload);
    } catch (error) {
      onError?.(error);
    }
  }

  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 4000,
  };

  // 1. Initial fix
  navigator.geolocation.getCurrentPosition(handlePosition, onError, geoOptions);

  // 2. Hardware motion sensor watcher
  try {
    watchId = navigator.geolocation.watchPosition(handlePosition, () => {}, geoOptions);
  } catch {}

  // 3. Keepalive timer interval (every 8s)
  timer = window.setInterval(() => {
    navigator.geolocation.getCurrentPosition(handlePosition, () => {}, geoOptions);
  }, intervalMs);

  return () => {
    stopped = true;
    if (timer) window.clearInterval(timer);
    if (watchId !== null && navigator.geolocation.clearWatch) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}
