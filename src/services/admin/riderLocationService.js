import api from "@/lib/api";

export async function updateRiderLocation(payload) {
  const response = await api.post("/staff/rider-location", payload);
  return response.data?.data || response.data;
}

export function getOrCreateDeviceId() {
  if (typeof window === "undefined") return "server";
  let id = null;
  try {
    id = localStorage.getItem("tukaatu_rider_device_id");
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      localStorage.setItem("tukaatu_rider_device_id", id);
    }
  } catch {
    id = "dev_" + Date.now();
  }
  return id;
}

/** Send single one-shot real GPS ping from browser with automatic indoor/timeout fallback */
export function sendCurrentRiderLocation({ runId, shipmentId, trackingNumber, onSuccess, onError } = {}) {
  if (typeof window === "undefined" || !navigator.geolocation) {
    onError?.(new Error("Geolocation is not supported by your browser."));
    return;
  }

  const dispatch = async (position) => {
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
        device_id: getOrCreateDeviceId(),
      };
      const result = await updateRiderLocation(payload);
      onSuccess?.(result, payload);
    } catch (err) {
      onError?.(err);
    }
  };

  // Step 1: Request high-accuracy GPS with a generous 18-second satellite search window
  navigator.geolocation.getCurrentPosition(
    dispatch,
    (err) => {
      // If hardware satellite GPS timed out (code 3) or unavailable indoors (code 2), immediately try standard fused/cellular/wifi location
      if (err.code === 3 || err.code === 2) {
        console.warn("Satellite GPS cold-start timed out indoors, falling back to fused network location...");
        navigator.geolocation.getCurrentPosition(
          dispatch,
          (err2) => onError?.(err2 || err),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      } else {
        onError?.(err);
      }
    },
    { enableHighAccuracy: true, timeout: 18000, maximumAge: 10000 }
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
        device_id: getOrCreateDeviceId(),
      };

      const result = await updateRiderLocation(payload);
      onSuccess?.(result, payload);
    } catch (error) {
      onError?.(error);
    }
  }

  const geoOptionsHigh = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000,
  };

  const geoOptionsFallback = {
    enableHighAccuracy: false,
    timeout: 15000,
    maximumAge: 60000,
  };

  // 1. Immediate initial fix (with fallback if satellite GPS is slow indoors)
  navigator.geolocation.getCurrentPosition(
    handlePosition,
    (err) => {
      if (err.code === 3 || err.code === 2) {
        navigator.geolocation.getCurrentPosition(handlePosition, () => {}, geoOptionsFallback);
      } else {
        onError?.(err);
      }
    },
    geoOptionsHigh
  );

  // 2. Hardware motion sensor continuous watcher
  try {
    watchId = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => {
        // Timeouts while stationary indoors are normal; fallback to network location
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(handlePosition, () => {}, geoOptionsFallback);
        } else {
          console.warn("GPS watchPosition signal:", err?.message);
        }
      },
      geoOptionsHigh
    );
  } catch (err) {
    console.warn("GPS watchPosition init failed:", err);
  }

  // 3. Constant interval keepalive to guarantee continuous GPS updates on the road
  timer = window.setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      handlePosition,
      (err) => {
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(handlePosition, () => {}, geoOptionsFallback);
        }
      },
      geoOptionsHigh
    );
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

/**
 * Standard Haversine distance in meters between two lat/lng coordinates
 */
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (!Number.isFinite(nLat1) || !Number.isFinite(nLon1) || !Number.isFinite(nLat2) || !Number.isFinite(nLon2)) return null;

  const R = 6371e3;
  const p1 = (nLat1 * Math.PI) / 180;
  const p2 = (nLat2 * Math.PI) / 180;
  const dp = ((nLat2 - nLat1) * Math.PI) / 180;
  const dl = ((nLon2 - nLon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 7-State Connected vs Disconnected Rider State Machine:
 * 1. Live GPS (Green #10B981): GPS ping received within last <= 120s while moving on the road (> 2 km/h).
 * 2. At Branch (Blue #0284C7): Stationary within 400m of Kathmandu Franchise hub (speed <= 10 km/h, <= 120s ping). Automatically snapped to office pin.
 * 3. At Stop #X (Purple #7C3AED): Within 220m of an active delivery/pickup customer stop (<= 120s ping).
 * 4. Idle (Amber #F59E0B): No GPS pings for 2 to 15 minutes, OR ping <= 120s but stationary on road (< 15 mins).
 *    Both the left card and map pin now show synchronized amber.
 * 5. Out of Network (Volcano #DC2626): Run is out for delivery, but no signal received for > 3 minutes (up to 15m) away from branch/stops.
 * 6. Prolonged Stop Alert (Red #EF4444): Stationary on the open road away from any stop or branch for >= 15 minutes.
 * 7. Offline (Gray #64748B): No signal for > 15 minutes, or run is inactive/closed.
 */
export function computeRiderStatus({
  runStatus,
  riderLocation,
  branchCoords,
  stops = [],
} = {}) {
  const lat = Number(riderLocation?.lat);
  const lng = Number(riderLocation?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  const statusStr = String(runStatus || "").toLowerCase();
  const isRunOut = ["out_for_delivery", "in_progress", "out_for_pickup"].includes(statusStr);
  const isRunActive = isRunOut || ["assigned", "open"].includes(statusStr);

  if (!hasCoords) {
    if (isRunActive) {
      return {
        type: "offline",
        label: "Awaiting GPS Signal",
        shortLabel: "No GPS",
        pinBadgeText: "No GPS",
        tagColor: "default",
        dotColor: "#64748B",
        isLive: false,
        isRecent: false,
        ageText: "No GPS",
        effectivePos: null,
      };
    }
    return {
      type: "none",
      label: "Offline",
      shortLabel: "Offline",
      pinBadgeText: "Offline",
      tagColor: "default",
      dotColor: "#64748B",
      isLive: false,
      isRecent: false,
      ageText: "Offline",
      effectivePos: null,
    };
  }

  // Calculate elapsed time since last GPS ping
  let diffSec = null;
  if (riderLocation?.seconds_ago != null && Number.isFinite(Number(riderLocation.seconds_ago))) {
    diffSec = Number(riderLocation.seconds_ago);
  } else if (riderLocation?.updated_at) {
    try {
      diffSec = Math.max(0, Math.round((Date.now() - new Date(riderLocation.updated_at).getTime()) / 1000));
    } catch {}
  }
  if (diffSec == null) {
    diffSec = riderLocation?.is_live ? 20 : (riderLocation?.is_recent ? 300 : 9999);
  }

  // Branch proximity & coordinates
  const bLat = Number(branchCoords?.lat ?? branchCoords?.latitude ?? 27.6916);
  const bLng = Number(branchCoords?.lng ?? branchCoords?.longitude ?? 85.3422);
  const bName = branchCoords?.name || "Kathmandu Franchise";
  const distBranchMeters = haversineDistanceMeters(lat, lng, bLat, bLng);
  const speed = Number.isFinite(Number(riderLocation?.speed)) ? Number(riderLocation.speed) : 0;

  // Snapped to branch within 400m when slow or stationary (eliminates indoor cellular/WiFi GPS drift)
  const isAtBranch = distBranchMeters != null && distBranchMeters <= 400 && speed <= 10;
  const effectivePos = isAtBranch
    ? { lat: bLat, lng: bLng, isAtBranch: true }
    : { lat, lng, isAtBranch: false };

  // Nearest delivery / pickup customer stop
  let closestStop = null;
  let minStopDist = Infinity;
  if (Array.isArray(stops) && stops.length > 0) {
    stops.forEach((s, idx) => {
      const pt = s.point || (s.lat && s.lng ? { lat: Number(s.lat), lng: Number(s.lng) } : null);
      if (pt && Number.isFinite(pt.lat) && Number.isFinite(pt.lng)) {
        const d = haversineDistanceMeters(lat, lng, pt.lat, pt.lng);
        if (d != null && d < minStopDist) {
          minStopDist = d;
          closestStop = { ...s, seq: s.sequence || s.seq || idx + 1 };
        }
      }
    });
  }
  const isAtStop = closestStop != null && minStopDist <= 220;
  const stopSeq = closestStop?.seq || 1;
  const stopArea = closestStop?.area || closestStop?.receiver_area || `Stop #${stopSeq}`;

  // Age formatting
  const mins = Math.max(1, Math.round(diffSec / 60));
  const ageText = mins >= 60 ? `${Math.round(mins / 60)}h ago` : `${mins}m ago`;

  // 1. Inactive run
  if (!isRunActive) {
    return {
      type: "offline",
      label: "Offline (Run inactive)",
      shortLabel: "Offline",
      pinBadgeText: "Offline",
      tagColor: "default",
      dotColor: "#64748B",
      isLive: false,
      isRecent: false,
      ageText: "Offline",
      effectivePos,
    };
  }

  // 2. Offline: No signal for > 15 minutes (diffSec > 900)
  if (diffSec > 900) {
    return {
      type: "offline",
      label: `Offline (Last seen: ${ageText})`,
      shortLabel: "Offline",
      pinBadgeText: `Offline (${ageText})`,
      tagColor: "default",
      dotColor: "#64748B",
      isLive: false,
      isRecent: false,
      ageText,
      effectivePos,
    };
  }

  // 3. Out of Network: Active run on open road, but no signal for > 3 minutes (180s - 900s)
  if (diffSec > 180 && isRunOut && !isAtBranch && !isAtStop) {
    return {
      type: "out_of_network",
      label: `⚠️ Out of Network (${mins}m no signal) · Data off or dead zone`,
      shortLabel: "⚠️ Out of Network",
      pinBadgeText: "Signal Lost",
      tagColor: "volcano",
      dotColor: "#DC2626",
      isLive: false,
      isRecent: true,
      ageText: `${mins}m ago`,
      effectivePos,
    };
  }

  // 4. Idle: Signal between 2 to 15 minutes (or 2 to 3m on road)
  if (diffSec > 120) {
    const locText = isAtBranch
      ? `at ${bName}`
      : isAtStop
      ? `at Stop #${stopSeq}`
      : "on Road";
    return {
      type: "idle",
      label: `● Idle ${locText} (${mins}m ago)`,
      shortLabel: "● Idle",
      pinBadgeText: `Idle (${mins}m)`,
      tagColor: "warning",
      dotColor: "#F59E0B",
      isLive: false,
      isRecent: true,
      ageText: `Idle (${mins}m)`,
      effectivePos,
    };
  }

  // 5. Signal is fresh (diffSec <= 120s):
  // 5a. At branch (Blue #0284C7)
  if (isAtBranch) {
    return {
      type: "at_branch",
      label: `At ${bName} (Ready for departure)`,
      shortLabel: "● At Branch",
      pinBadgeText: "At Branch",
      tagColor: "processing",
      dotColor: "#0284C7",
      isLive: true,
      isRecent: true,
      ageText: "At Branch",
      effectivePos,
    };
  }

  // 5b. At customer stop (Purple #7C3AED)
  if (isAtStop) {
    return {
      type: "at_stop",
      label: `At Stop #${stopSeq} (${stopArea}) · Customer Location`,
      shortLabel: `● At Stop #${stopSeq}`,
      pinBadgeText: `Stop #${stopSeq}`,
      tagColor: "purple",
      dotColor: "#7C3AED",
      isLive: true,
      isRecent: true,
      ageText: `Stop #${stopSeq}`,
      effectivePos,
    };
  }

  // 5c. Live GPS moving on road (Green #10B981)
  if (speed > 2) {
    const spdRounded = Math.round(speed);
    return {
      type: "live",
      label: `Live on Road · ${spdRounded} km/h`,
      shortLabel: "● Live GPS",
      pinBadgeText: `${spdRounded} km/h`,
      tagColor: "success",
      dotColor: "#10B981",
      isLive: true,
      isRecent: true,
      ageText: `${spdRounded} km/h`,
      effectivePos,
    };
  }

  // 5d. Stationary on open road with fresh ping:
  // Check if stationary for >= 15 minutes
  const stationarySec = Number(riderLocation?.stationary_seconds || 0);
  if (stationarySec >= 900) {
    return {
      type: "stationary_alert",
      label: "⚠️ Prolonged Stop Alert · Stationary on open road 15m+",
      shortLabel: "⚠️ Prolonged Stop",
      pinBadgeText: "Stopped 15m+",
      tagColor: "error",
      dotColor: "#EF4444",
      isLive: true,
      isRecent: true,
      ageText: "Stopped 15m+",
      effectivePos,
    };
  }

  // Stopped on open road < 15 minutes -> Idle (Amber #F59E0B)
  return {
    type: "idle",
    label: "● Idle · Paused on road",
    shortLabel: "● Idle",
    pinBadgeText: "Idle (Paused)",
    tagColor: "warning",
    dotColor: "#F59E0B",
    isLive: false,
    isRecent: true,
    ageText: "Paused",
    effectivePos,
  };
}
