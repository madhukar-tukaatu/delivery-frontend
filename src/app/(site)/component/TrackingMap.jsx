"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fallback Kathmandu Valley Delivery Corridors & Road Waypoints
const ROUTE_WAYPOINTS = {
  "Bhaktapur-Lalitpur": [
    [27.6710, 85.4298],
    [27.6735, 85.3980],
    [27.6755, 85.3520],
    [27.6685, 85.3360],
    [27.6710, 85.3240]
  ],
  "Kathmandu-Pokhara": [
    [27.7172, 85.3240],
    [27.7800, 85.2000],
    [27.8700, 84.8000],
    [28.1000, 84.4000],
    [28.2096, 83.9856]
  ],
  "default": [
    [27.7172, 85.3240],
    [27.7000, 85.3200],
    [27.6710, 85.3240]
  ]
};

// Calculate bearing angle (rotation degree) between two LatLng coordinates
function getBearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const lat1Rad = lat1 * (Math.PI / 180);
  const lat2Rad = lat2 * (Math.PI / 180);

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  let brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}

// Create Hub / Destination pin icon
function createHubPinIcon(label, color, isOrigin = false) {
  return L.divIcon({
    className: "hub-pin-marker",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 800;
          color: #071722;
          background: #FFFFFF;
          border: 2px solid ${color};
          padding: 3px 8px;
          border-radius: 8px;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 3px;
        ">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${color};"></span>
          <span>${label || (isOrigin ? 'Origin Hub' : 'Delivery Address')}</span>
        </div>
        <div style="
          width: 12px;
          height: 12px;
          background: ${color};
          border: 2.5px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 10px ${color};
        "></div>
      </div>
    `,
    iconSize: [120, 36],
    iconAnchor: [60, 36]
  });
}

// Create Realistic Top-Down Delivery Rider Marker
function createBikeRiderIcon() {
  return L.divIcon({
    className: "bike-rider-marker",
    html: `
      <div style="
        position: relative; 
        width: 52px; 
        height: 52px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
      ">
        <div style="
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.22);
          border: 2px solid #10B981;
          animation: realBikePulse 2s infinite ease-out;
        "></div>

        <div id="bike-icon-inner" style="
          position: relative;
          z-index: 5;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 6px 12px rgba(7, 23, 34, 0.45));
          transform: rotate(0deg);
          transition: transform 0.3s ease-out;
        ">
          <div style="
            position: absolute;
            top: -12px;
            width: 0;
            height: 0;
            border-left: 12px solid transparent;
            border-right: 12px solid transparent;
            border-bottom: 22px solid rgba(255, 208, 38, 0.7);
            filter: blur(2px);
            pointer-events: none;
          "></div>

          <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="29" y="4" width="6" height="12" rx="3" fill="#1E293B" stroke="#FFD026" stroke-width="1.5"/>
            <rect x="26" y="10" width="12" height="3" rx="1.5" fill="#027196"/>
            
            <path d="M17 17L27 13M47 17L37 13" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="16" cy="17" r="2.5" fill="#FFD026"/>
            <circle cx="48" cy="17" r="2.5" fill="#FFD026"/>

            <path d="M25 14C25 14 23 24 23 32C23 40 25 48 25 48H39C39 48 41 40 41 32C41 24 39 14 39 14H25Z" fill="#027196" stroke="#071722" stroke-width="2"/>
            
            <circle cx="32" cy="24" r="7.5" fill="#071722" stroke="#FFD026" stroke-width="2"/>
            <path d="M27 22C27 22 30 20 32 20C34 20 37 22 37 22" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>

            <rect x="21" y="34" width="22" height="16" rx="4" fill="#FFD026" stroke="#071722" stroke-width="2"/>
            <rect x="24" y="37" width="16" height="10" rx="2" fill="#027196"/>
            <path d="M29 42L32 39L35 42" stroke="#FFD026" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            
            <rect x="29" y="48" width="6" height="12" rx="3" fill="#1E293B" stroke="#FFD026" stroke-width="1.5"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26]
  });
}

// Live Rider Component with smooth 60fps glide animation between GPS updates
function LiveRiderMarker({ position, heading, targetPosition }) {
  const map = useMap();
  const markerRef = useRef(null);
  const animRef = useRef(null);
  const currentPosRef = useRef(position);

  useEffect(() => {
    if (!map || !position || !position[0] || !position[1]) return;

    if (!markerRef.current) {
      const bikeIcon = createBikeRiderIcon();
      const marker = L.marker(position, { icon: bikeIcon, zIndexOffset: 2500 }).addTo(map);
      markerRef.current = marker;
      currentPosRef.current = position;

      const markerEl = marker.getElement();
      if (markerEl) {
        const innerEl = markerEl.querySelector("#bike-icon-inner");
        if (innerEl && heading != null) {
          innerEl.style.transform = `rotate(${heading}deg)`;
        }
      }
    } else {
      // Smoothly interpolate (glide) from current position to new position
      const startPos = currentPosRef.current || position;
      const targetPos = position;
      const startTime = performance.now();
      const duration = 1200; // 1.2s smooth glide

      if (animRef.current) cancelAnimationFrame(animRef.current);

      const animateGlide = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Cubic ease-out
        const ease = 1 - Math.pow(1 - progress, 3);

        const curLat = startPos[0] + (targetPos[0] - startPos[0]) * ease;
        const curLng = startPos[1] + (targetPos[1] - startPos[1]) * ease;
        const currentCoord = [curLat, curLng];

        markerRef.current.setLatLng(currentCoord);
        currentPosRef.current = currentCoord;

        // Rotate bearing towards movement or given heading
        const markerEl = markerRef.current?.getElement();
        if (markerEl) {
          const innerEl = markerEl.querySelector("#bike-icon-inner");
          if (innerEl) {
            let rot = heading;
            if ((rot === null || rot === undefined) && targetPosition) {
              rot = getBearing(curLat, curLng, targetPosition[0], targetPosition[1]);
            }
            if (rot !== null && rot !== undefined) {
              innerEl.style.transform = `rotate(${rot}deg)`;
            }
          }
        }

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animateGlide);
        } else {
          currentPosRef.current = targetPos;
        }
      };

      animRef.current = requestAnimationFrame(animateGlide);
    }
  }, [map, position, heading, targetPosition]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map]);

  return null;
}

// Map bounds updater
function MapBoundsUpdater({ points }) {
  const map = useMap();

  useEffect(() => {
    const valid = (points || []).filter((p) => p && typeof p[0] === "number" && typeof p[1] === "number" && !isNaN(p[0]) && !isNaN(p[1]));
    if (valid.length > 0) {
      try {
        const bounds = L.latLngBounds(valid);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        setTimeout(() => map.invalidateSize(), 150);
      } catch (err) {
        console.warn("Map fitBounds failed:", err);
      }
    }
  }, [points, map]);

  return null;
}

export default function TrackingMap({
  liveLocation = null,
  origin = null,
  destination = null,
  fromCity = "Bhaktapur",
  toCity = "Lalitpur",
  isOutForDelivery = false,
  isDelivered = false,
}) {
  const originLat = origin?.latitude || (fromCity === "Kathmandu" ? 27.7172 : 27.6710);
  const originLng = origin?.longitude || (fromCity === "Kathmandu" ? 85.3240 : 85.4298);

  const destLat = destination?.latitude || (toCity === "Lalitpur" ? 27.6710 : 27.7172);
  const destLng = destination?.longitude || (toCity === "Lalitpur" ? 85.3240 : 85.3240);

  const originPoint = [originLat, originLng];
  const destPoint = [destLat, destLng];

  // Live rider GPS is only considered active when rider is Out for Delivery
  const hasLiveCoords = Boolean(isOutForDelivery && liveLocation && liveLocation.lat && liveLocation.lng);
  const currentRiderPoint = hasLiveCoords ? [liveLocation.lat, liveLocation.lng] : null;

  // Breadcrumb Trail State: Tracks the actual live path traversed by the rider from the origin hub
  const [traveledTrail, setTraveledTrail] = useState([originPoint]);

  useEffect(() => {
    if (!hasLiveCoords || !currentRiderPoint) {
      setTraveledTrail([originPoint]);
      return;
    }

    setTraveledTrail((prev) => {
      const lastPoint = prev[prev.length - 1];
      if (
        lastPoint &&
        Math.abs(lastPoint[0] - currentRiderPoint[0]) < 0.0001 &&
        Math.abs(lastPoint[1] - currentRiderPoint[1]) < 0.0001
      ) {
        return prev;
      }
      return [...prev, currentRiderPoint];
    });
  }, [hasLiveCoords, currentRiderPoint?.[0], currentRiderPoint?.[1], originPoint?.[0], originPoint?.[1]]);

  const pointsToBound = useMemo(() => {
    const pts = [originPoint, destPoint];
    if (hasLiveCoords && currentRiderPoint) pts.push(currentRiderPoint);
    return pts;
  }, [originPoint, destPoint, hasLiveCoords, currentRiderPoint]);

  const originIcon = useMemo(() => createHubPinIcon(origin?.name || fromCity, "#027196", true), [origin, fromCity]);
  const destIcon = useMemo(() => createHubPinIcon(destination?.name || toCity, isDelivered ? "#10B981" : "#FFD026", false), [destination, toCity, isDelivered]);

  // Static fallback route when not out for delivery
  const fallbackRoute = useMemo(() => {
    const routeKey = `${fromCity}-${toCity}`;
    return ROUTE_WAYPOINTS[routeKey] || [originPoint, destPoint];
  }, [originPoint, destPoint, fromCity, toCity]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", isolation: "isolate", borderRadius: "20px", overflow: "hidden" }}>
      <style>{`
        @keyframes realBikePulse {
          0% { transform: scale(0.8); opacity: 0.9; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      {/* Floating Status Badge */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2 shadow-lg backdrop-blur border border-slate-200">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            hasLiveCoords
              ? "bg-emerald-500 animate-ping"
              : isOutForDelivery
              ? "bg-blue-500 animate-pulse"
              : isDelivered
              ? "bg-emerald-500"
              : "bg-slate-400"
          }`}
        />
        <span className="text-xs font-black text-slate-800">
          {hasLiveCoords
            ? "Live GPS Path Active • Rider Moving"
            : isOutForDelivery
            ? "Rider Started Delivery"
            : isDelivered
            ? "Delivered to Recipient"
            : "Hub Corridor Route • Live path activates when rider starts delivery"}
        </span>
      </div>

      {/* Floating Map Legend (Shows Live Path meaning) */}
      {hasLiveCoords && (
        <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-3 rounded-xl bg-white/95 px-3 py-1.5 shadow-md backdrop-blur border border-slate-200 text-[11px] font-bold">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span style={{ width: 14, height: 4, borderRadius: 2, background: "#10B981" }} />
            <span>Traveled Path</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-600">
            <span style={{ width: 14, height: 3, borderRadius: 2, borderTop: "2px dashed #0284c7" }} />
            <span>Remaining Route</span>
          </div>
        </div>
      )}

      <MapContainer
        center={currentRiderPoint || destPoint}
        zoom={13}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: "#F8FAFC" }}
      >
        <TileLayer
          url="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        {/* 1. Traveled Path Polyline (Vibrant Emerald Green Solid Line) - Represents the live movement trail */}
        {hasLiveCoords && (
          <Polyline
            positions={traveledTrail}
            pathOptions={{
              color: "#10B981",
              weight: 5,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round"
            }}
          />
        )}

        {/* 2. Remaining Path Polyline (Dashed Sky Blue Line) - Connects Rider to Destination */}
        {hasLiveCoords && currentRiderPoint && (
          <Polyline
            positions={[currentRiderPoint, destPoint]}
            pathOptions={{
              color: "#0284c7",
              weight: 3.5,
              dashArray: "8, 10",
              opacity: 0.8,
              lineCap: "round"
            }}
          />
        )}

        {/* 3. Static Route Corridor Line (When not out for delivery) */}
        {!hasLiveCoords && (
          <Polyline
            positions={fallbackRoute}
            pathOptions={{
              color: "#64748B",
              weight: 3.5,
              dashArray: "6, 8",
              opacity: 0.6
            }}
          />
        )}

        {/* Origin and Destination Markers */}
        <Marker position={originPoint} icon={originIcon} />
        <Marker position={destPoint} icon={destIcon} />

        {/* Live Rider Marker - Glides smoothly along road as rider moves */}
        {hasLiveCoords && (
          <LiveRiderMarker
            position={currentRiderPoint}
            heading={liveLocation.heading}
            targetPosition={destPoint}
          />
        )}

        <MapBoundsUpdater points={pointsToBound} />
      </MapContainer>
    </div>
  );
}
