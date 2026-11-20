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
          heading: Number.isFinite(position.coords.heading) && position.coords.heading >= 0 ? position.coords.heading : undefined,
          speed: Number.isFinite(position.coords.speed) && position.coords.speed >= 0 ? position.coords.speed * 3.6 : undefined, // m/s to km/h
          accuracy: position.coords.accuracy,
        };
        const result = await updateRiderLocation(payload);
        onSuccess?.(result, payload);
      } catch (err) {
        onError?.(err);
      }
    },
    (err) => onError?.(err),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

/** 
 * Continuous exact real-time GPS tracking via watchPosition + interval fallback
 * Automatically requests Screen WakeLock to prevent phone sleep while riding.
 */
export function startBrowserRiderLocation({ runId, shipmentId, trackingNumber, intervalMs = 5000, onSuccess, onError } = {}) {
  if (typeof window === "undefined" || !navigator.geolocation) {
    onError?.(new Error("Geolocation is not available on this device."));
    return () => {};
  }

  let stopped = false;
  let timer = null;
  let watchId = null;
  let wakeLock = null;
  let lastSentTime = 0;
  let lastLat = null;
  let lastLng = null;

  // Keep mobile screen awake while rider is on delivery run
  async function acquireWakeLock() {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
      }
    } catch {
      // wakeLock optional depending on browser/battery permissions
    }
  }
  acquireWakeLock();

  // Re-acquire lock if user switches apps and comes back
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible" && !stopped) {
      acquireWakeLock();
    }
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  async function handlePosition(position) {
    if (stopped || !position?.coords) return;
    const now = Date.now();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Send immediately if moved > 2.5m or if more than 4s elapsed since last update
    const moved =
      lastLat === null ||
      lastLng === null ||
      Math.abs(lat - lastLat) > 0.000025 ||
      Math.abs(lng - lastLng) > 0.000025;

    if (!moved && now - lastSentTime < 4000) {
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
        heading: Number.isFinite(position.coords.heading) && position.coords.heading >= 0 ? position.coords.heading : undefined,
        speed: Number.isFinite(position.coords.speed) && position.coords.speed >= 0 ? position.coords.speed * 3.6 : undefined,
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
    maximumAge: 0, // Force fresh hardware GPS fix
  };

  // 1. Immediate initial fix
  navigator.geolocation.getCurrentPosition(handlePosition, (err) => onError?.(err), geoOptions);

  // 2. Hardware motion sensor continuous watcher
  try {
    watchId = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => {
        // Log watch error but keep polling interval alive
        console.warn("GPS watchPosition signal:", err?.message);
      },
      geoOptions
    );
  } catch (err) {
    console.warn("GPS watchPosition init failed:", err);
  }

  // 3. Constant 5s interval keepalive to guarantee continuous GPS updates
  timer = window.setInterval(() => {
    navigator.geolocation.getCurrentPosition(handlePosition, () => {}, geoOptions);
  }, intervalMs);

  return () => {
    stopped = true;
    if (timer) window.clearInterval(timer);
    if (watchId !== null && navigator.geolocation.clearWatch) {
      navigator.geolocation.clearWatch(watchId);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    if (wakeLock) {
      try {
        wakeLock.release();
      } catch {}
      wakeLock = null;
    }
  };
}
