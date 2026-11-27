"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Empty, Row, Space, Tag, Tooltip, Typography, message } from "antd";
import {
  CarOutlined,
  CheckCircleOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  HomeOutlined,
  PhoneOutlined,
  FileTextOutlined,
  SendOutlined,
  ShopOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getEcho } from "@/lib/echo";
import { getDeliveryRun, sequenceRun } from "@/services/admin/deliveryRunService";
import { sequencePickupRun } from "@/services/admin/pickupRunService";
import { computeRiderStatus } from "@/services/admin/riderLocationService";

const { Text, Title } = Typography;

const KATHMANDU_PLACES = [
  ["sallaghari", 27.6718, 85.4286],
  ["sanothimi", 27.6812, 85.3705],
  ["thimi", 27.6722, 85.3868],
  ["balkot", 27.6644, 85.3615],
  ["mid baneshwor", 27.6955, 85.3375],
  ["middle baneshwor", 27.6955, 85.3375],
  ["new baneshwor", 27.6915, 85.342],
  ["old baneshwor", 27.699, 85.333],
  ["baneshwor", 27.6916, 85.3422],
  ["koteshwor", 27.6792, 85.3494],
  ["tinkune", 27.6865, 85.3465],
  ["gaushala", 27.707, 85.346],
  ["chabahil", 27.7172, 85.3468],
  ["sinamangal", 27.696, 85.35],
  ["battisputali", 27.7042, 85.3418],
  ["jorpati", 27.72, 85.375],
  ["bouddha", 27.7215, 85.362],
  ["maitighar", 27.6922, 85.3218],
  ["tripureshwor", 27.6953, 85.3134],
  ["kalanki", 27.6934, 85.2815],
  ["thamel", 27.7154, 85.3123],
  ["lazimpat", 27.7212, 85.3197],
  ["balaju", 27.7329, 85.3025],
  ["maharajgunj", 27.7364, 85.3308],
  ["kupandole", 27.6872, 85.3168],
  ["pulchowk", 27.6784, 85.3162],
  ["jawalakhel", 27.6728, 85.3155],
  ["lagankhel", 27.6672, 85.3242],
  ["satdobato", 27.6575, 85.3255],
  ["balkhu", 27.6851, 85.2974],
  ["kalimati", 27.6987, 85.2996],
  ["dillibazar", 27.7047, 85.3275],
  ["putalisadak", 27.7031, 85.3212],
  ["anamnagar", 27.6975, 85.3262],
  ["gyaneshwor", 27.7088, 85.3341],
];

function num(val) {
  const n = Number(val);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function resolveCoords(latVal, lngVal, areaText, addressText) {
  const lat = num(latVal);
  const lng = num(lngVal);
  if (lat != null && lng != null) {
    return { lat, lng, guessed: false };
  }
  const text = `${areaText || ""} ${addressText || ""}`.toLowerCase();
  const sorted = [...KATHMANDU_PLACES].sort((a, b) => b[0].length - a[0].length);
  for (const [place, pLat, pLng] of sorted) {
    if (text.includes(place)) {
      return { lat: pLat, lng: pLng, guessed: true };
    }
  }
  return null;
}

function stopStatusColor(status) {
  const s = String(status || "").toLowerCase();
  if (["delivered", "picked_up", "completed"].includes(s)) return "#10B981"; // green
  if (["out_for_delivery", "in_progress", "arrived"].includes(s)) return "#2563EB"; // blue
  if (["failed", "rejected"].includes(s)) return "#EF4444"; // red
  return "#F59E0B"; // amber / queued
}

function createNumberedPin(seq, status, isSelected = false) {
  const bg = stopStatusColor(status);
  const ring = isSelected ? "0 0 0 4px #0891b2" : "0 2px 6px rgba(0,0,0,0.3)";
  const html = `
    <div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${bg};
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      font-family: sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
      box-shadow: ${ring};
      transition: transform 0.15s ease;
      cursor: pointer;
    ">
      ${seq}
    </div>
  `;
  return L.divIcon({
    className: "",
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createBranchPin() {
  const html = `
    <div style="
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #1e1b4b;
      color: #fbbf24;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      cursor: pointer;
    ">
      🏢
    </div>
  `;
  return L.divIcon({
    className: "",
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createRunRiderPin(riderName, statusText = "Live", statusType = "live") {
  const isAtBranch = statusType === "at_branch";
  const isAtStop = statusType === "at_stop";
  const isStationaryAlert = statusType === "stationary_alert";
  const isOutOfNetwork = statusType === "out_of_network";
  const isLive = statusType === "live";
  const isIdle = statusType === "idle";
  const isOffline = statusType === "offline";

  const ringBg = isStationaryAlert
    ? "rgba(239, 68, 68, 0.35)"
    : isOutOfNetwork
    ? "rgba(220, 38, 38, 0.25)"
    : isAtBranch
    ? "rgba(2, 132, 199, 0.28)"
    : isAtStop
    ? "rgba(124, 58, 237, 0.28)"
    : isLive
    ? "rgba(16, 185, 129, 0.28)"
    : isIdle
    ? "rgba(245, 158, 11, 0.28)"
    : "rgba(100, 116, 139, 0.15)";

  const ringBorder = isStationaryAlert
    ? "#ef4444"
    : isOutOfNetwork
    ? "#dc2626"
    : isAtBranch
    ? "#0284c7"
    : isAtStop
    ? "#7c3aed"
    : isLive
    ? "#10B981"
    : isIdle
    ? "#F59E0B"
    : "#64748B";

  const pulseStyle = (isLive || isStationaryAlert) ? "animation: realBikePulse 2s infinite ease-out;" : "";
  const borderColor = isStationaryAlert
    ? "#f87171"
    : isOutOfNetwork
    ? "#ef4444"
    : isAtBranch
    ? "#38bdf8"
    : isAtStop
    ? "#a78bfa"
    : isLive
    ? "#10B981"
    : isIdle
    ? "#F59E0B"
    : "#94A3B8";

  const badgeBg = isStationaryAlert
    ? "#7f1d1d"
    : isOutOfNetwork
    ? "#450a0a"
    : isAtBranch
    ? "#0c4a6e"
    : isAtStop
    ? "#4c1d95"
    : isLive
    ? "#064e3b"
    : isIdle
    ? "#78350f"
    : "#1e293b";

  const badgeColor = isStationaryAlert
    ? "#fca5a5"
    : isOutOfNetwork
    ? "#fca5a5"
    : isAtBranch
    ? "#7dd3fc"
    : isAtStop
    ? "#ddd6fe"
    : isLive
    ? "#34d399"
    : isIdle
    ? "#fbbf24"
    : "#94a3b8";

  const badgeBorder = isStationaryAlert
    ? "rgba(239, 68, 68, 0.6)"
    : isOutOfNetwork
    ? "rgba(220, 38, 38, 0.6)"
    : isAtBranch
    ? "rgba(56, 189, 248, 0.6)"
    : isAtStop
    ? "rgba(167, 139, 250, 0.6)"
    : isLive
    ? "rgba(16, 185, 129, 0.6)"
    : isIdle
    ? "rgba(245, 158, 11, 0.6)"
    : "rgba(100, 116, 139, 0.5)";

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
      <div style="
        position: absolute;
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: ${ringBg};
        border: 2px solid ${ringBorder};
        ${pulseStyle}
      "></div>
      <div style="
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #071722;
        border: 2.5px solid ${borderColor};
        color: #ffffff;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(7, 23, 34, 0.5);
        position: relative;
        z-index: 5;
      ">
        🏍️
      </div>
      <div style="
        position: absolute;
        top: 38px;
        background: ${badgeBg};
        color: ${badgeColor};
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 6px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        border: 1px solid ${badgeBorder};
      ">
        ${riderName || "Rider"} (${statusText})
      </div>
    </div>
  `;
  return L.divIcon({
    className: "run-rider-marker",
    html,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function MapAutoFit({ points }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  useEffect(() => {
    // The map is often mounted inside a collapsing panel, tab or modal (0px or
    // still animating), so recompute the size and refit when it becomes visible.
    const fit = () => {
      const el = map.getContainer();
      if (!el || !el.clientWidth || !el.clientHeight) return;
      map.invalidateSize();
      if (!points.length) return;
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])).pad(0.2), { maxZoom: 15 });
    };
    fit();
    const timers = [setTimeout(fit, 120), setTimeout(fit, 450)];
    let observer = null;
    let lastSize = "";
    const el = map.getContainer();
    if (el && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        const size = `${el.clientWidth}x${el.clientHeight}`;
        if (size !== lastSize && el.clientWidth > 0) {
          lastSize = size;
          fit();
        }
      });
      observer.observe(el);
    }
    return () => {
      timers.forEach(clearTimeout);
      observer?.disconnect();
    };
  }, [map, key]);
  return null;
}

function MapPanTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target?.lat && target?.lng) {
      map.setView([target.lat, target.lng], 15, { animate: true });
    }
  }, [map, target]);
  return null;
}

async function fetchRoutePolyline(points) {
  if (points.length < 2) return null;
  // OSRM accepts up to 100 coordinates
  const slice = points.slice(0, 50);
  const coords = slice.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("OSRM failed");
    const data = await res.json();
    if (data.code === "Ok" && data.routes?.[0]) {
      const route = data.routes[0];
      const positions = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      return {
        positions,
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMin: Math.round(route.duration / 60),
        isRoad: true,
      };
    }
  } catch {
    // fallback
  }

  return {
    positions: points.map((p) => [p.lat, p.lng]),
    distanceKm: null,
    durationMin: null,
    isRoad: false,
  };
}

export default function RunRouteMapInner({
  run,
  mode = "delivery", // 'delivery' or 'pickup'
  isRider = false,
  onStopAction = null,
  onOpenPickup = null,
  onOpenDelivery = null,
  onManageRun = null,
  // (stop, context: "list" | "popup") => ReactNode — status-aware workflow
  // buttons supplied by the rider panels (Accept / Start / Arrive / Collect ...).
  renderStopActions = null,
  height = "520px",
  onRefresh = null,
}) {
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [panTarget, setPanTarget] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [riderLocation, setRiderLocation] = useState(run?.rider_location || null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const handleOptimizeRoute = async () => {
    if (!run?.id) return;
    setOptimizing(true);
    try {
      if (mode === "pickup") {
        await sequencePickupRun(run.id, null);
      } else {
        await sequenceRun(run.id, null);
      }
      message.success("Stop sequence optimized along the shortest road route!");
      if (typeof onRefresh === "function") {
        onRefresh();
      } else if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshRunData", { detail: { runId: run.id } }));
        // Also trigger router refresh if supported
        window.location.reload();
      }
    } catch (err) {
      message.error(err?.message || "Failed to optimize route sequence");
    } finally {
      setOptimizing(false);
    }
  };

  useEffect(() => {
    if (run?.rider_location) {
      setRiderLocation(run.rider_location);
    }
  }, [run?.rider_location]);

  // Real-time rider location listener via Laravel Echo (private & public channels)
  useEffect(() => {
    const riderId = run?.rider?.id || run?.rider_user_id || run?.rider_id || run?.assigned_to;
    const runId = run?.id;
    if (!riderId && !runId) return;

    const echo = getEcho();
    if (echo) {
      try {
        const onLocation = (e) => {
          if (e && e.lat && e.lng) {
            setRiderLocation({
              lat: Number(e.lat),
              lng: Number(e.lng),
              heading: e.heading != null ? Number(e.heading) : null,
              speed: e.speed != null ? Number(e.speed) : null,
              updated_at: e.updated_at || new Date().toISOString(),
              is_live: true,
            });
          }
        };

        if (riderId) {
          const privChannel = echo.private(`rider.${riderId}.location`);
          privChannel.listen("rider.location.updated", onLocation);
          privChannel.listen(".rider.location.updated", onLocation);

          const pubChannel = echo.channel(`rider.${riderId}.public-location`);
          pubChannel.listen("rider.location.updated", onLocation);
          pubChannel.listen(".rider.location.updated", onLocation);
        }

        if (runId) {
          const runChannel = echo.channel(`delivery-runs.${runId}.location`);
          runChannel.listen("rider.location.updated", onLocation);
          runChannel.listen(".rider.location.updated", onLocation);

          const altRunChannel = echo.channel(`runs.${runId}`);
          altRunChannel.listen("rider.location.updated", onLocation);
          altRunChannel.listen(".rider.location.updated", onLocation);
        }
      } catch (err) {
        console.warn("Rider location echo subscription failed:", err);
      }
    }

    return () => {
      if (echo) {
        try {
          if (riderId) {
            echo.leave(`rider.${riderId}.location`);
            echo.leave(`rider.${riderId}.public-location`);
          }
          if (runId) {
            echo.leave(`delivery-runs.${runId}.location`);
            echo.leave(`runs.${runId}`);
          }
        } catch {}
      }
    };
  }, [run?.rider?.id, run?.rider_user_id, run?.rider_id, run?.assigned_to, run?.id]);

  // Periodic polling fallback for active runs (6s)
  useEffect(() => {
    if (!run?.id) return;
    const isLive = ["out_for_delivery", "in_progress", "assigned"].includes(String(run?.status || "").toLowerCase());
    if (!isLive) return;

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const fresh = await getDeliveryRun(run.id, run.branch_id || run.branch?.id);
        const freshRun = fresh?.run || fresh;
        if (!cancelled && freshRun?.rider_location) {
          setRiderLocation((prev) => {
            const nextLoc = freshRun.rider_location;
            if (!prev || prev.lat !== nextLoc.lat || prev.lng !== nextLoc.lng) {
              return nextLoc;
            }
            return prev;
          });
        }
      } catch (err) {
        // quiet fallback
      }
    }, 6000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [run?.id, run?.status, run?.branch_id, run?.branch?.id]);

  // 1. Resolve branch origin
  const branchCoords = useMemo(() => {
    const b = run?.branch;
    const lat = num(b?.latitude);
    const lng = num(b?.longitude);
    if (lat && lng) return { lat, lng, name: b.name || "Branch Origin", address: b.address || "", approx: false };
    // Kathmandu default branch location fallback (Tinkune / Kathmandu center)
    return {
      lat: 27.6865,
      lng: 85.3465,
      name: b?.name || "Kathmandu Branch",
      address: b?.address || "Kathmandu",
      approx: true,
    };
  }, [run?.branch]);

  // 2. Prepare items with sequence and resolved coordinates
  const stops = useMemo(() => {
    const rawItems = (run?.items || []).filter((i) => i.status !== "removed");
    const seenLocations = {};

    // Seed branch location so stops at the branch don't get completely hidden behind branch marker
    if (branchCoords?.lat && branchCoords?.lng) {
      const bKey = `${branchCoords.lat.toFixed(4)},${branchCoords.lng.toFixed(4)}`;
      seenLocations[bKey] = 1;
    }

    return rawItems.map((item, index) => {
      const seq = item.sequence || index + 1;
      const isPickup = mode === "pickup";
      const pr = isPickup ? item.pickupRequest || item : null;
      const latVal = isPickup
        ? item.pickup_lat ?? pr?.pickup_lat
        : item.delivery_lat ?? item.receiver_latitude ?? item.receiver_lat;
      const lngVal = isPickup
        ? item.pickup_lng ?? pr?.pickup_lng
        : item.delivery_lng ?? item.receiver_longitude ?? item.receiver_lng;
      const areaVal = isPickup ? item.pickup_area || item.area || pr?.pickup_area : item.receiver_area || item.area;
      const addrVal = isPickup ? item.pickup_address || pr?.pickup_address : item.delivery_address;
      const title = isPickup
        ? pr?.request_number || item.request_number || `PR #${item.pickup_request_id || item.id}`
        : item.tracking_number || `#${item.shipment_id}`;
      const subtitle = isPickup
        ? pr?.merchant?.name || pr?.pickup_name || item.pickup_name || "Merchant"
        : item.receiver_name || "Recipient";
      const phone = isPickup ? pr?.pickup_phone || item.pickup_phone : item.receiver_phone;

      const merchantName = isPickup
        ? pr?.merchant?.name || pr?.pickup_name || item.pickup_name || item.merchant_name || item.merchant?.name
        : item.merchant_name || item.merchant?.name || item.shipment?.merchant?.name;
      const merchantPhone = isPickup
        ? pr?.merchant?.phone || pr?.pickup_phone || item.pickup_phone || item.merchant_phone || item.merchant?.phone
        : item.merchant_phone || item.merchant?.phone || item.shipment?.merchant?.phone;

      const point = resolveCoords(latVal, lngVal, areaVal, addrVal);

      // Jitter / radial offset so multiple stops or branch-overlapping stops are clearly visible
      let adjustedPoint = null;
      if (point) {
        const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
        const count = seenLocations[key] || 0;
        seenLocations[key] = count + 1;
        if (count > 0) {
          const angle = (count - 1) * 1.5708;
          const dist = 0.00075;
          adjustedPoint = {
            lat: point.lat + dist * Math.cos(angle),
            lng: point.lng + dist * Math.sin(angle),
            guessed: point.guessed,
          };
        } else {
          adjustedPoint = point;
        }
      }

      const rawStatus = isPickup ? (item.status || pr?.status) : item.status;
      return {
        ...item,
        seq,
        title,
        subtitle,
        phone,
        merchantName,
        merchantPhone,
        status: rawStatus,
        area: areaVal || "Kathmandu Area",
        address: addrVal || "No address provided",
        point: adjustedPoint,
      };
    });
  }, [run?.items, mode, branchCoords]);

  // Compute travel distance from previous stop or branch origin along the route
  const stopsWithLegs = useMemo(() => {
    let prev = branchCoords;
    return stops.map((stop, index) => {
      let legDistKm = null;
      if (prev && stop.point) {
        const meters = haversineM(prev.lat, prev.lng, stop.point.lat, stop.point.lng);
        legDistKm = Math.round((meters / 1000) * 10) / 10;
      }
      if (stop.point) {
        prev = stop.point;
      }
      return {
        ...stop,
        legDistKm,
        fromLabel: index === 0 ? "Branch" : `Stop #${index}`,
      };
    });
  }, [stops, branchCoords]);

  const isRunOut = ["out_for_delivery", "in_progress", "out_for_pickup"].includes(String(run?.status || "").toLowerCase());

  // Distance from rider's reported coordinates to the branch office
  const distToBranchMeters = useMemo(() => {
    if (!riderLocation?.lat || !riderLocation?.lng || !branchCoords?.lat || !branchCoords?.lng) return null;
    return haversineM(riderLocation.lat, riderLocation.lng, branchCoords.lat, branchCoords.lng);
  }, [riderLocation, branchCoords]);

  // Unified 7-state connected vs disconnected rider tracking status
  const riderFreshness = useMemo(() => {
    return computeRiderStatus({
      runStatus: run?.status,
      riderLocation,
      branchCoords,
      stops,
    });
  }, [run?.status, riderLocation, branchCoords, stops]);

  const effectiveRiderPos = riderFreshness.effectivePos;

  // Delivered stops for covered path highlighting
  const deliveredStops = useMemo(() => {
    return stops.filter((s) => ["delivered", "completed", "picked_up"].includes(String(s.status || "").toLowerCase()) && s.point);
  }, [stops]);

  const coveredRoutePoints = useMemo(() => {
    if (deliveredStops.length === 0 || !branchCoords) return [];
    return [
      [branchCoords.lat, branchCoords.lng],
      ...deliveredStops.map((s) => [s.point.lat, s.point.lng]),
    ];
  }, [deliveredStops, branchCoords]);

  // 3. The planned delivery route path: Branch -> Stop 1 -> Stop 2 -> Stop 3 (in road sequence)
  const plannedRoutePoints = useMemo(() => {
    const pts = [];
    if (branchCoords) pts.push({ lat: branchCoords.lat, lng: branchCoords.lng, isBranch: true });
    stops.forEach((s) => {
      if (s.point) pts.push({ lat: s.point.lat, lng: s.point.lng, id: s.id, seq: s.seq });
    });
    return pts;
  }, [branchCoords, stops]);

  // Points included for map auto-fit viewport
  const allPoints = useMemo(() => {
    const pts = [...plannedRoutePoints];
    if (effectiveRiderPos) {
      pts.push({ lat: effectiveRiderPos.lat, lng: effectiveRiderPos.lng, isRider: true });
    }
    return pts;
  }, [plannedRoutePoints, effectiveRiderPos]);

  // 4. Fetch routing polyline along actual streets from Branch to Stops
  useEffect(() => {
    if (plannedRoutePoints.length < 2) {
      setRouteData(null);
      return;
    }
    let cancelled = false;
    setLoadingRoute(true);
    fetchRoutePolyline(plannedRoutePoints)
      .then((res) => {
        if (!cancelled && res) setRouteData(res);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoute(false);
      });
    return () => {
      cancelled = true;
    };
  }, [plannedRoutePoints]);

  const selectStop = (stop) => {
    setSelectedStopId(stop.id);
    if (stop.point) {
      setPanTarget({ lat: stop.point.lat, lng: stop.point.lng });
    }
  };

  const getNavigationUrl = (stop) => {
    if (stop.point) {
      return `https://www.google.com/maps/dir/?api=1&destination=${stop.point.lat},${stop.point.lng}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address + ", " + stop.area)}`;
  };

  const effectiveHeight = isFullscreen
    ? "calc(100vh - 56px)"
    : height && height !== "100%"
    ? height
    : "calc(100vh - 265px)";

  return (
    <div
      style={
        isFullscreen
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              height: "100vh",
              width: "100vw",
            }
          : {
              height: "100%",
              minHeight: "560px",
              display: "flex",
              flexDirection: "column",
              width: "100%",
            }
      }
    >
      {/* Route Header Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "8px 12px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: isFullscreen ? 0 : "8px 8px 0 0",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <Space wrap size={6}>
          <Tag color="cyan" style={{ fontSize: 13, padding: "2px 8px", margin: 0 }}>
            <CarOutlined /> {run?.run_number}
          </Tag>
          {run?.status && (
            <Tag
              color={
                ["delivered", "picked_up", "completed"].includes(run.status)
                  ? "green"
                  : ["out_for_delivery", "in_progress"].includes(run.status)
                  ? "blue"
                  : "default"
              }
              style={{ margin: 0, textTransform: "capitalize", fontWeight: 600 }}
            >
              {run.status.replace(/_/g, " ")}
            </Tag>
          )}
          {effectiveRiderPos && (isRunOut || riderFreshness.isRecent) ? (
            <Space size={6}>
              <Tag
                color={riderFreshness.tagColor}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 8px",
                  margin: 0,
                  fontWeight: 600,
                  borderColor: riderFreshness.dotColor,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: riderFreshness.dotColor,
                  }}
                />
                <span>Rider: {run?.rider?.name || "Assigned"} · {riderFreshness.label}</span>
              </Tag>
              <Button
                size="small"
                type="primary"
                icon={<CompassOutlined />}
                onClick={() => setPanTarget({ lat: effectiveRiderPos.lat, lng: effectiveRiderPos.lng })}
                style={{ background: "#0284c7", borderColor: "#0284c7" }}
              >
                Focus Rider
              </Button>
            </Space>
          ) : run?.rider?.name ? (
            <Space size={6}>
              <Tag color="geekblue" style={{ margin: 0 }}>
                <UserOutlined /> Rider: {run.rider.name}
              </Tag>
              {isRunOut && (
                <Tag color="gold" style={{ margin: 0 }}>
                  ● Awaiting Live GPS
                </Tag>
              )}
            </Space>
          ) : null}
          <Text strong style={{ fontSize: 12 }}>{stops.length} Stops</Text>
          {stops.some((s) => !s.point) ? (
            <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
              <ExclamationCircleOutlined /> {stops.filter((s) => !s.point).length} without location
            </Tag>
          ) : null}
        </Space>

        <Space wrap size={6}>
          {routeData ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              🛣️ {routeData.isRoad ? "Road: " : "Direct: "}
              <Text strong>{routeData.distanceKm ? `${routeData.distanceKm} km` : `${stops.length} stops`}</Text>
              {routeData.durationMin ? ` · ~${routeData.durationMin} mins` : ""}
            </Text>
          ) : loadingRoute ? (
            <Text type="secondary" style={{ fontSize: 12 }}>Calculating route...</Text>
          ) : null}
          {stops.length > 1 && (
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              loading={optimizing}
              onClick={handleOptimizeRoute}
              style={{ borderColor: "#0284c7", color: "#0284c7", fontWeight: 600 }}
              title="Automatically reorder stops along the shortest road route"
            >
              Optimize
            </Button>
          )}
          <Button
            size="small"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => setIsFullscreen((v) => !v)}
            style={isFullscreen ? { background: "#0284c7", color: "#fff", borderColor: "#0284c7" } : undefined}
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
          {onManageRun && (
            <Button
              size="small"
              type="primary"
              style={{ background: "#0891b2", borderColor: "#0891b2" }}
              onClick={onManageRun}
            >
              Manage Stops &amp; {mode === "pickup" ? "Pickups" : "Parcels"}
            </Button>
          )}
        </Space>
      </div>

      <Row
        gutter={0}
        style={{
          border: "1px solid #e2e8f0",
          borderTop: "none",
          borderRadius: isFullscreen ? 0 : "0 0 8px 8px",
          height: effectiveHeight,
          minHeight: "520px",
          display: "flex",
          flexWrap: "nowrap",
          overflow: "hidden",
        }}
      >
        {/* Left Side: Sequenced Stops List */}
        <Col
          xs={24}
          md={9}
          lg={8}
          xl={7}
          style={{
            borderRight: "1px solid #e2e8f0",
            background: "#f8fafc",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              overflowY: "auto",
              padding: 10,
              flex: 1,
            }}
          >
            <div style={{ marginBottom: 10, padding: "8px 10px", background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
              <Space align="start">
                <HomeOutlined style={{ color: "#0891b2", fontSize: 16, marginTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 12, color: "#0f172a" }}>Start: {branchCoords.name}</Text>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
                    {branchCoords.address}
                    {branchCoords.approx ? " (branch has no map pin – approximate start)" : ""}
                  </div>
                </div>
              </Space>
            </div>

            {stopsWithLegs.length === 0 ? (
              <Empty description="No stops in this run." />
            ) : (
              stopsWithLegs.map((stop, index) => {
                const isSelected = selectedStopId === stop.id;
                const statusColor = stopStatusColor(stop.status);
                return (
                  <div
                    key={stop.id}
                    onClick={() => selectStop(stop)}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "10px",
                      marginBottom: 8,
                      borderRadius: 8,
                      border: isSelected ? "2px solid #0891b2" : "1px solid #e2e8f0",
                      background: isSelected ? "#f0fdfa" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {/* Sequence Badge */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: statusColor,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {stop.seq}
                    </div>

                    {/* Stop Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <Text strong style={{ fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {stop.title}
                        </Text>
                        <Tag color={statusColor} style={{ margin: 0, fontSize: 10 }}>
                          {stop.status || "queued"}
                        </Tag>
                      </div>

                      {/* Merchant / Store Tag */}
                      {stop.merchantName ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                          <Tag
                            color="cyan"
                            style={{
                              margin: 0,
                              fontSize: 11,
                              lineHeight: "20px",
                              padding: "0 6px",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            🏬 {stop.merchantName}
                          </Tag>
                          {stop.merchantPhone ? (
                            <a
                              href={`tel:${stop.merchantPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ fontSize: 11, color: "#0891b2", textDecoration: "none" }}
                              title="Call Merchant"
                            >
                              📞 {stop.merchantPhone}
                            </a>
                          ) : null}
                        </div>
                      ) : null}

                      <div style={{ fontSize: 12, color: "#334155", fontWeight: 500, marginTop: 3 }}>
                        👤 {stop.subtitle}
                        {stop.phone ? ` · ${stop.phone}` : ""}
                      </div>

                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        📍 {stop.area} {stop.address ? `· ${stop.address}` : ""}
                        {stop.point?.guessed ? " (area estimate)" : ""}
                      </div>
                      {stop.legDistKm != null && (
                        <div style={{ fontSize: 11, color: "#0284c7", fontWeight: 600, marginTop: 2 }}>
                          🛵 ~{stop.legDistKm} km from {stop.fromLabel}
                        </div>
                      )}
                      {!stop.point ? (
                        <Tag color="orange" style={{ margin: "4px 0 0", fontSize: 10 }}>
                          <ExclamationCircleOutlined /> No location – not on map
                        </Tag>
                      ) : null}

                      {/* COD or Parcels */}
                      {/* COD or Parcels */}
                      {mode === "delivery" && Number(stop.cod_amount) > 0 ? (
                        <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginTop: 2 }}>
                          Collect COD: Rs {Number(stop.cod_amount).toFixed(2)}
                        </div>
                      ) : null}

                      {mode === "pickup" ? (
                        <div style={{ marginTop: 4 }}>
                          {(stop.shipments || []).length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 2 }}>
                              {stop.shipments.slice(0, 4).map((s) => (
                                <Tag key={s.id || s.tracking_number} color="blue" style={{ margin: 0, fontSize: 10, fontFamily: "monospace" }}>
                                  {s.tracking_number}
                                </Tag>
                              ))}
                              {stop.shipments.length > 4 && (
                                <Tag style={{ margin: 0, fontSize: 10 }}>+{stop.shipments.length - 4} more</Tag>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: "#0284c7", fontWeight: 600 }}>
                              📦 {stop.parcel_quantity || 1} parcel{(stop.parcel_quantity || 1) > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Action buttons on stop */}
                      <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {renderStopActions ? renderStopActions(stop, "list") : null}
                        {/* type="default" (not primary+ghost): the global .ant-btn-primary
                            background !important made ghost buttons solid teal with
                            teal text, i.e. an invisible label. */}
                        {mode === "pickup" && onOpenPickup && (
                          <Button
                            size="small"
                            icon={<FileTextOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPickup(stop.pickup_request_id || stop.id);
                            }}
                            style={{ borderColor: "#0891b2", color: "#0891b2", background: "#fff" }}
                          >
                            Open PR
                          </Button>
                        )}
                        {mode === "delivery" && onOpenDelivery && (
                          <Button
                            size="small"
                            icon={<FileTextOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDelivery(stop.shipment_id || stop.id);
                            }}
                            style={{ borderColor: "#0891b2", color: "#0891b2", background: "#fff" }}
                          >
                            Open Parcel
                          </Button>
                        )}
                        <Button
                          size="small"
                          icon={<CompassOutlined />}
                          href={getNavigationUrl(stop)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Navigate
                        </Button>
                        {stop.phone ? (
                          <Button
                            size="small"
                            icon={<PhoneOutlined />}
                            href={`tel:${stop.phone}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Call
                          </Button>
                        ) : null}
                        {isRider && onStopAction && !renderStopActions ? (
                          <Button
                            size="small"
                            type="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStopAction(stop);
                            }}
                          >
                            {mode === "pickup" ? "Collect" : "Deliver"}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Col>

        {/* Right Side: Leaflet Interactive Route Map */}
        <Col
          xs={24}
          md={15}
          lg={16}
          xl={17}
          style={{
            height: "100%",
            minHeight: "520px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div style={{ height: "100%", width: "100%", position: "relative", flex: 1, minHeight: "520px" }}>
            <MapContainer
              center={[branchCoords.lat, branchCoords.lng]}
              zoom={13}
              style={{ height: "100%", width: "100%", minHeight: "520px" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapAutoFit points={allPoints} />
              <MapPanTo target={panTarget} />

              {/* Branch Start Marker */}
              {branchCoords && (
                <Marker position={[branchCoords.lat, branchCoords.lng]} icon={createBranchPin()} zIndexOffset={1000}>
                  <LeafletTooltip permanent direction="top" offset={[0, -18]}>
                    <span style={{ fontWeight: 700, fontSize: 11 }}>
                      Start · {branchCoords.name}
                    </span>
                  </LeafletTooltip>
                  <Popup>
                    <div style={{ padding: 4 }}>
                      <strong>🏢 Branch Origin (Starting Point)</strong>
                      <div>{branchCoords.name}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{branchCoords.address}</div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Numbered Stops Markers */}
              {stops.map((stop) => {
                if (!stop.point) return null;
                const isSelected = selectedStopId === stop.id;
                return (
                  <Marker
                    key={stop.id}
                    position={[stop.point.lat, stop.point.lng]}
                    icon={createNumberedPin(stop.seq, stop.status, isSelected)}
                    zIndexOffset={isSelected ? 3500 : 2000}
                    eventHandlers={{
                      click: () => setSelectedStopId(stop.id),
                    }}
                  >
                    <LeafletTooltip direction="top" offset={[0, -14]} opacity={0.95}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>
                        #{stop.seq} · {stop.title}
                      </div>
                      {stop.merchantName ? (
                        <div style={{ fontSize: 11, color: "#0891b2", fontWeight: 700 }}>
                          🏬 {stop.merchantName}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 11, color: "#334" }}>
                        👤 {stop.subtitle} ({stop.area})
                      </div>
                    </LeafletTooltip>
                    <Popup>
                      <div style={{ padding: 4, minWidth: 220 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <Tag color="cyan">Stop #{stop.seq}</Tag>
                          <Tag color={stopStatusColor(stop.status)}>{stop.status || "queued"}</Tag>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{stop.title}</div>

                        {/* Merchant Details in Popup */}
                        {stop.merchantName ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 4,
                              padding: "3px 6px",
                              background: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              borderRadius: 4,
                            }}
                          >
                            <span style={{ fontSize: 12 }}>🏬</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#166534" }}>
                              {stop.merchantName}
                            </span>
                            {stop.merchantPhone ? (
                              <a
                                href={`tel:${stop.merchantPhone}`}
                                style={{ fontSize: 11, color: "#0284c7", marginLeft: "auto", textDecoration: "none" }}
                              >
                                📞 {stop.merchantPhone}
                              </a>
                            ) : null}
                          </div>
                        ) : null}

                        <div style={{ fontSize: 12, color: "#334", marginTop: 4 }}>
                          👤 <strong>{stop.subtitle}</strong>
                          {stop.phone ? ` · ${stop.phone}` : ""}
                        </div>
                        <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>📍 {stop.area}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{stop.address}</div>

                        {mode === "pickup" && (
                          <div style={{ marginTop: 6 }}>
                            {(stop.shipments || []).length > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 4 }}>
                                {stop.shipments.slice(0, 3).map((s) => (
                                  <Tag key={s.id || s.tracking_number} color="blue" style={{ margin: 0, fontSize: 10, fontFamily: "monospace" }}>
                                    {s.tracking_number}
                                  </Tag>
                                ))}
                                {stop.shipments.length > 3 && (
                                  <Tag style={{ margin: 0, fontSize: 10 }}>+{stop.shipments.length - 3} more</Tag>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: "#0284c7", fontWeight: 600 }}>
                                📦 {stop.parcel_quantity || 1} parcel{(stop.parcel_quantity || 1) > 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        )}

                        {mode === "delivery" && Number(stop.cod_amount) > 0 && (
                          <div style={{ color: "#059669", fontWeight: 600, fontSize: 12, marginTop: 4 }}>
                            COD: Rs {Number(stop.cod_amount).toFixed(2)}
                          </div>
                        )}

                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {renderStopActions ? renderStopActions(stop, "popup") : null}
                          {mode === "pickup" && onOpenPickup && (
                            <Button
                              size="small"
                              icon={<FileTextOutlined />}
                              onClick={() => onOpenPickup(stop.pickup_request_id || stop.id)}
                              style={{ borderColor: "#0891b2", color: "#0891b2", background: "#fff" }}
                            >
                              Open PR
                            </Button>
                          )}
                          {mode === "delivery" && onOpenDelivery && (
                            <Button
                              size="small"
                              icon={<FileTextOutlined />}
                              onClick={() => onOpenDelivery(stop.shipment_id || stop.id)}
                              style={{ borderColor: "#0891b2", color: "#0891b2", background: "#fff" }}
                            >
                              Open Parcel
                            </Button>
                          )}
                          <Button
                            size="small"
                            icon={<CompassOutlined />}
                            href={getNavigationUrl(stop)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Navigate
                          </Button>
                          {stop.phone && (
                            <Button size="small" icon={<PhoneOutlined />} href={`tel:${stop.phone}`}>
                              Call
                            </Button>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Live Rider Position on Delivery Run Map */}
              {effectiveRiderPos && (isRunOut || riderFreshness.isRecent) && (
                <Marker
                  position={[effectiveRiderPos.lat, effectiveRiderPos.lng]}
                  icon={createRunRiderPin(run?.rider?.name, riderFreshness.pinBadgeText, riderFreshness.type)}
                  zIndexOffset={3000}
                >
                  <Popup>
                    <div style={{ padding: 4, minWidth: 170 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 16 }}>🏍️</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{run?.rider?.name || "Rider"}</span>
                        <Tag
                          color={riderFreshness.tagColor}
                          style={{ margin: 0, fontSize: 10, fontWeight: 700, borderColor: riderFreshness.dotColor }}
                        >
                          {riderFreshness.shortLabel}
                        </Tag>
                      </div>
                      <div style={{ margin: "4px 0 0 0", fontSize: 11, color: riderFreshness.isLive ? "#10B981" : "#64748B", fontWeight: 700 }}>
                        ● {riderFreshness.label}
                      </div>
                      {riderLocation?.speed != null && Number(riderLocation.speed) > 0 && (
                        <div style={{ margin: "2px 0 0 0", fontSize: 11, color: "#64748B" }}>
                          Speed: ~{Math.round(riderLocation.speed)} km/h {riderLocation.heading != null ? `• Heading ${Math.round(riderLocation.heading)}°` : ""}
                        </div>
                      )}
                      {riderLocation?.updated_at && (
                        <div style={{ margin: "2px 0 0 0", fontSize: 10, color: "#94A3B8" }}>
                          Updated: {new Date(riderLocation.updated_at).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Covered Path Polyline (Completed / Delivered Stops) */}
              {coveredRoutePoints.length > 1 && (
                <Polyline
                  positions={coveredRoutePoints}
                  pathOptions={{
                    color: "#10B981",
                    weight: 6,
                    opacity: 0.92,
                  }}
                />
              )}

              {/* Remaining Road Route Path Polyline */}
              {routeData?.positions?.length > 1 && (
                <Polyline
                  positions={routeData.positions}
                  pathOptions={{
                    color: "#0891b2",
                    weight: 5,
                    opacity: 0.85,
                    dashArray: routeData.isRoad ? null : "8, 8",
                  }}
                />
              )}
            </MapContainer>
          </div>
        </Col>
      </Row>
    </div>
  );
}

