"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Empty, Row, Space, Tag, Typography, message } from "antd";
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
  PlayCircleOutlined,
  SendOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { getEcho } from "@/lib/echo";
import { getDeliveryRun } from "@/services/admin/deliveryRunService";

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

function createRunRiderPin(riderName, statusText = "Live", statusType = "live") {
  const isLive = statusType === "live";
  const isIdle = statusType === "idle";

  const ringBg = isLive ? "rgba(16, 185, 129, 0.28)" : isIdle ? "rgba(245, 158, 11, 0.22)" : "rgba(100, 116, 139, 0.15)";
  const ringBorder = isLive ? "#10B981" : isIdle ? "#F59E0B" : "#64748B";
  const pulseStyle = isLive ? "animation: realBikePulse 2s infinite ease-out;" : "";
  const borderColor = isLive ? "#10B981" : isIdle ? "#F59E0B" : "#94A3B8";
  const badgeBg = isLive ? "#064e3b" : isIdle ? "#78350f" : "#1e293b";
  const badgeColor = isLive ? "#34d399" : isIdle ? "#fbbf24" : "#94a3b8";
  const badgeBorder = isLive ? "rgba(16, 185, 129, 0.5)" : isIdle ? "rgba(245, 158, 11, 0.5)" : "rgba(100, 116, 139, 0.5)";

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
  // (stop, context: "list" | "popup") => ReactNode — status-aware workflow
  // buttons supplied by the rider panels (Accept / Start / Arrive / Collect ...).
  renderStopActions = null,
  height = "520px",
}) {
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [panTarget, setPanTarget] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [riderLocation, setRiderLocation] = useState(run?.rider_location || null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (run?.rider_location) {
      setRiderLocation(run.rider_location);
    }
  }, [run?.rider_location]);

  // Real-time rider location listener via Laravel Echo (private & public channels)
  useEffect(() => {
    const riderId = run?.rider?.id;
    if (!riderId) return;

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

        const privChannel = echo.private(`rider.${riderId}.location`);
        privChannel.listen("rider.location.updated", onLocation);
        privChannel.listen(".rider.location.updated", onLocation);

        const pubChannel = echo.channel(`rider.${riderId}.public-location`);
        pubChannel.listen("rider.location.updated", onLocation);
        pubChannel.listen(".rider.location.updated", onLocation);

        if (run?.id) {
          const runChannel = echo.channel(`delivery-runs.${run.id}.location`);
          runChannel.listen("rider.location.updated", onLocation);
          runChannel.listen(".rider.location.updated", onLocation);
        }
      } catch (err) {
        console.warn("Rider location echo subscription failed:", err);
      }
    }

    return () => {
      if (echo && riderId) {
        try {
          echo.leave(`rider.${riderId}.location`);
          echo.leave(`rider.${riderId}.public-location`);
          if (run?.id) echo.leave(`delivery-runs.${run.id}.location`);
        } catch {}
      }
    };
  }, [run?.rider?.id, run?.id]);

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

  // Interactive Live Movement Simulator (for testing on office/demo without active rider phone)
  const [isSimulating, setIsSimulating] = useState(false);
  const simIntervalRef = useRef(null);

  const toggleSimulation = () => {
    if (isSimulating) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      setIsSimulating(false);
      return;
    }

    const path = routeData?.positions && routeData.positions.length > 2
      ? routeData.positions
      : [
          [branchCoords.lat, branchCoords.lng],
          [branchCoords.lat + (stops[0]?.point?.lat ? (stops[0].point.lat - branchCoords.lat) * 0.35 : 0.005), branchCoords.lng + (stops[0]?.point?.lng ? (stops[0].point.lng - branchCoords.lng) * 0.35 : 0.005)],
          [branchCoords.lat + (stops[0]?.point?.lat ? (stops[0].point.lat - branchCoords.lat) * 0.7 : 0.01), branchCoords.lng + (stops[0]?.point?.lng ? (stops[0].point.lng - branchCoords.lng) * 0.7 : 0.01)],
          stops[0]?.point ? [stops[0].point.lat, stops[0].point.lng] : [branchCoords.lat + 0.012, branchCoords.lng + 0.012],
        ];

    let step = 0;
    setIsSimulating(true);
    message.info("Live rider movement simulation started along the route.");

    simIntervalRef.current = setInterval(() => {
      step = (step + 1) % path.length;
      const pt = path[step];
      const prevPt = path[step === 0 ? path.length - 1 : step - 1];
      const dLat = pt[0] - prevPt[0];
      const dLng = pt[1] - prevPt[1];
      const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;

      setRiderLocation({
        lat: pt[0],
        lng: pt[1],
        speed: 24 + Math.round(Math.random() * 8),
        heading: Math.round((heading + 360) % 360),
        updated_at: new Date().toISOString(),
        is_live: true,
      });
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

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

      const point = resolveCoords(latVal, lngVal, areaVal, addrVal);

      // Slight jitter if multiple stops are at the same exact point
      let adjustedPoint = null;
      if (point) {
        const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
        const count = seenLocations[key] || 0;
        seenLocations[key] = count + 1;
        const shift = count * 0.0006;
        adjustedPoint = {
          lat: point.lat + shift,
          lng: point.lng + shift,
          guessed: point.guessed,
        };
      }

      const rawStatus = isPickup ? (item.status || pr?.status) : item.status;
      return {
        ...item,
        seq,
        title,
        subtitle,
        phone,
        status: rawStatus,
        area: areaVal || "Kathmandu Area",
        address: addrVal || "No address provided",
        point: adjustedPoint,
      };
    });
  }, [run?.items, mode]);

  const isRunOut = ["out_for_delivery", "in_progress", "out_for_pickup"].includes(String(run?.status || "").toLowerCase());

  // Compute rider live freshness status
  const riderFreshness = useMemo(() => {
    if (!riderLocation?.lat || !riderLocation?.lng) {
      return { status: "none", label: "Awaiting GPS Signal", isLive: false, isRecent: false, type: "none", ageText: "" };
    }

    let diffSec = riderLocation.seconds_ago;
    if (diffSec == null && riderLocation.updated_at) {
      try {
        diffSec = Math.max(0, Math.round((Date.now() - new Date(riderLocation.updated_at).getTime()) / 1000));
      } catch {}
    }
    if (diffSec == null) {
      diffSec = riderLocation.is_live ? 20 : 9999;
    }

    if (!isRunOut) {
      return {
        status: "offline",
        label: "Offline (Run inactive)",
        type: "offline",
        ageText: "Offline",
        isLive: false,
        isRecent: false,
      };
    }

    if (diffSec <= 120 && riderLocation.is_live !== false) {
      const speedText = riderLocation.speed ? ` · ${Math.round(riderLocation.speed)} km/h` : "";
      return {
        status: "live",
        label: `Live (Just now${speedText})`,
        type: "live",
        ageText: "Live",
        isLive: true,
        isRecent: true,
      };
    }

    if (diffSec <= 900) {
      const mins = Math.max(1, Math.round(diffSec / 60));
      return {
        status: "idle",
        label: `Idle (${mins}m ago)`,
        type: "idle",
        ageText: `${mins}m ago`,
        isLive: false,
        isRecent: true,
      };
    }

    const mins = Math.round(diffSec / 60);
    const ageText = mins > 60 ? `${Math.round(mins / 60)}h ago` : `${mins}m ago`;
    return {
      status: "offline",
      label: `Offline (Last seen: ${ageText})`,
      type: "offline",
      ageText: ageText,
      isLive: false,
      isRecent: false,
    };
  }, [riderLocation, isRunOut]);

  // 3. Build ordered points starting from branch -> stop 1 -> stop 2 -> stop 3...
  const allPoints = useMemo(() => {
    const pts = [];
    if (branchCoords) pts.push({ lat: branchCoords.lat, lng: branchCoords.lng, isBranch: true });
    stops.forEach((s) => {
      if (s.point) pts.push({ lat: s.point.lat, lng: s.point.lng, id: s.id, seq: s.seq });
    });
    if (riderLocation?.lat && riderLocation?.lng && (isRunOut || riderFreshness.isRecent)) {
      pts.push({ lat: riderLocation.lat, lng: riderLocation.lng, isRider: true });
    }
    return pts;
  }, [branchCoords, stops, riderLocation, isRunOut, riderFreshness.isRecent]);

  // 4. Fetch routing polyline
  useEffect(() => {
    if (allPoints.length < 2) {
      setRouteData(null);
      return;
    }
    let cancelled = false;
    setLoadingRoute(true);
    fetchRoutePolyline(allPoints)
      .then((res) => {
        if (!cancelled && res) setRouteData(res);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoute(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allPoints]);

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

  const effectiveHeight = isFullscreen ? "calc(100vh - 56px)" : height;

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
          : undefined
      }
    >
      {/* Route Header Stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "10px 14px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: isFullscreen ? 0 : "8px 8px 0 0",
          gap: 8,
        }}
      >
        <Space wrap>
          <Tag color="cyan" style={{ fontSize: 13, padding: "3px 8px" }}>
            <CarOutlined /> {run?.run_number}
          </Tag>
          {riderLocation?.lat && riderLocation?.lng && (isRunOut || riderFreshness.isRecent) ? (
            <Space size={6}>
              <Tag
                color={riderFreshness.type === "live" ? "success" : riderFreshness.type === "idle" ? "warning" : "default"}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", margin: 0, fontWeight: 600 }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: riderFreshness.type === "live" ? "#10B981" : riderFreshness.type === "idle" ? "#F59E0B" : "#94A3B8",
                  }}
                />
                <span>Rider: {run?.rider?.name || "Assigned"} · {riderFreshness.label}</span>
              </Tag>
              <Button
                size="small"
                type="primary"
                icon={<CompassOutlined />}
                onClick={() => setPanTarget({ lat: riderLocation.lat, lng: riderLocation.lng })}
                style={{ background: "#0284c7", borderColor: "#0284c7" }}
              >
                Focus Rider
              </Button>
            </Space>
          ) : run?.rider?.name ? (
            <Space size={6}>
              <Tag color="geekblue">
                <UserOutlined /> Rider: {run.rider.name}
              </Tag>
              {isRunOut && (
                <Tag color="gold" style={{ margin: 0 }}>
                  ● Awaiting Live GPS
                </Tag>
              )}
            </Space>
          ) : null}
          {["out_for_delivery", "in_progress"].includes(String(run?.status || "").toLowerCase()) && (
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={toggleSimulation}
              type={isSimulating ? "primary" : "default"}
              danger={isSimulating}
              style={!isSimulating ? { borderColor: "#0284c7", color: "#0284c7" } : undefined}
            >
              {isSimulating ? "Stop Simulation" : "Simulate Live Move"}
            </Button>
          )}
          <Text strong>{stops.length} Stops</Text>
          {stops.some((s) => !s.point) ? (
            <Tag color="orange" style={{ margin: 0 }}>
              <ExclamationCircleOutlined /> {stops.filter((s) => !s.point).length} without location (not on map)
            </Tag>
          ) : null}
        </Space>

        <Space wrap>
          {routeData ? (
            <Text type="secondary" style={{ fontSize: 13 }}>
              🛣️ {routeData.isRoad ? "Road distance: " : "Straight line: "}
              <Text strong>{routeData.distanceKm ? `${routeData.distanceKm} km` : `${stops.length} stops`}</Text>
              {routeData.durationMin ? ` · ~${routeData.durationMin} mins drive` : ""}
            </Text>
          ) : loadingRoute ? (
            <Text type="secondary">Calculating route path...</Text>
          ) : null}
          <Button
            size="small"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => setIsFullscreen((v) => !v)}
            style={isFullscreen ? { background: "#0284c7", color: "#fff", borderColor: "#0284c7" } : undefined}
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          </Button>
        </Space>
      </div>

      <Row gutter={0} style={{ border: "1px solid #e2e8f0", borderTop: "none", borderRadius: isFullscreen ? 0 : "0 0 8px 8px", flex: isFullscreen ? 1 : undefined }}>
        {/* Left Side: Sequenced Stops List */}
        <Col xs={24} md={8} style={{ borderRight: "1px solid #e2e8f0", background: "#ffffff" }}>
          <div style={{ height: effectiveHeight, overflowY: "auto", padding: 12 }}>
            <div style={{ marginBottom: 12, padding: "8px 10px", background: "#f1f5f9", borderRadius: 6 }}>
              <Space>
                <HomeOutlined style={{ color: "#1e1b4b", fontSize: 16 }} />
                <div>
                  <Text strong style={{ fontSize: 13 }}>Start: {branchCoords.name}</Text>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {branchCoords.address}
                    {branchCoords.approx ? " (branch has no map pin – approximate start)" : ""}
                  </div>
                </div>
              </Space>
            </div>

            {stops.length === 0 ? (
              <Empty description="No stops in this run." />
            ) : (
              stops.map((stop) => {
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

                      <div style={{ fontSize: 12, color: "#334155", fontWeight: 500, marginTop: 2 }}>
                        {stop.subtitle}
                        {stop.phone ? ` · ${stop.phone}` : ""}
                      </div>

                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        📍 {stop.area} {stop.address ? `· ${stop.address}` : ""}
                        {stop.point?.guessed ? " (area estimate)" : ""}
                      </div>
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
        <Col xs={24} md={16}>
          <div style={{ height: effectiveHeight, width: "100%", position: "relative" }}>
            <MapContainer
              center={[branchCoords.lat, branchCoords.lng]}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
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
                    eventHandlers={{
                      click: () => setSelectedStopId(stop.id),
                    }}
                  >
                    <Popup>
                      <div style={{ padding: 4, minWidth: 200 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <Tag color="cyan">Stop #{stop.seq}</Tag>
                          <Tag color={stopStatusColor(stop.status)}>{stop.status || "queued"}</Tag>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{stop.title}</div>
                        <div style={{ fontSize: 12, color: "#334" }}>{stop.subtitle}</div>
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
              {riderLocation && riderLocation.lat && riderLocation.lng && (isRunOut || riderFreshness.isRecent) && (
                <>
                  <Marker
                    position={[riderLocation.lat, riderLocation.lng]}
                    icon={createRunRiderPin(run?.rider?.name, riderFreshness.ageText, riderFreshness.type)}
                    zIndexOffset={3000}
                  >
                    <Popup>
                      <div style={{ padding: 4, minWidth: 170 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 16 }}>🏍️</span>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{run?.rider?.name || "Rider"}</span>
                          <Tag
                            color={riderFreshness.type === "live" ? "green" : riderFreshness.type === "idle" ? "orange" : "default"}
                            style={{ margin: 0, fontSize: 10, textTransform: "uppercase" }}
                          >
                            {riderFreshness.type}
                          </Tag>
                        </div>
                        <div style={{ margin: "4px 0 0 0", fontSize: 11, color: riderFreshness.isLive ? "#10B981" : "#64748B", fontWeight: 700 }}>
                          ● {riderFreshness.label}
                        </div>
                        {riderLocation.speed != null && (
                          <div style={{ margin: "2px 0 0 0", fontSize: 11, color: "#64748B" }}>
                            Speed: ~{Math.round(riderLocation.speed)} km/h {riderLocation.heading != null ? `• Heading ${Math.round(riderLocation.heading)}°` : ""}
                          </div>
                        )}
                        {riderLocation.updated_at && (
                          <div style={{ margin: "2px 0 0 0", fontSize: 10, color: "#94A3B8" }}>
                            Updated: {new Date(riderLocation.updated_at).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>

                  {/* Live Path Line from Branch to Rider's Current Position (only when active) */}
                  {riderFreshness.isLive && branchCoords && (
                    <Polyline
                      positions={[
                        [branchCoords.lat, branchCoords.lng],
                        [riderLocation.lat, riderLocation.lng],
                      ]}
                      pathOptions={{
                        color: "#10B981",
                        weight: 4,
                        opacity: 0.85,
                        dashArray: "6, 8",
                      }}
                    />
                  )}

                  {/* Remaining connector from rider's live position to next stop (only when active) */}
                  {riderFreshness.isLive && stops[0]?.point && (
                    <Polyline
                      positions={[
                        [riderLocation.lat, riderLocation.lng],
                        [stops[0].point.lat, stops[0].point.lng],
                      ]}
                      pathOptions={{
                        color: "#0284c7",
                        weight: 4,
                        opacity: 0.85,
                        dashArray: "4, 6",
                      }}
                    />
                  )}
                </>
              )}

              {/* Road Route Path Polyline */}
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

