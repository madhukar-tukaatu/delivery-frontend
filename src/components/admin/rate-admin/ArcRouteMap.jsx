"use client";

/**
 * ArcRouteMap
 * Shows a curved arc between two points on a Leaflet map.
 * Used for flight and rail transport modes.
 *
 * Props:
 *  - fromNode  { id, name, latitude, longitude }
 *  - toNode    { id, name, latitude, longitude }
 *  - mode      "flight" | "rail"
 *  - height    number (px)
 */

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── helpers ────────────────────────────────────────────────────────────────

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Generate a smooth arc (great-circle approximation) between two lat/lng points.
 * Returns an array of [lat, lng] tuples.
 */
function buildArc(lat1, lng1, lat2, lng2, steps = 80) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;

  const φ1 = toRad(lat1), λ1 = toRad(lng1);
  const φ2 = toRad(lat2), λ2 = toRad(lng2);

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;

    // Slerp between the two unit vectors
    const d = 2 * Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    );
    if (d === 0) {
      points.push([lat1, lng1]);
      continue;
    }
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    points.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }
  return points;
}

/** Bearing from point A to point B in degrees (0 = north, clockwise) */
function bearing(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const y = Math.sin(dLng) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Midpoint along the arc for the icon
function midpoint(arc) {
  return arc[Math.floor(arc.length / 2)];
}

// ─── custom icons ───────────────────────────────────────────────────────────

function makeIcon(emoji, rotateDeg = 0, size = 32) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      font-size:${size * 0.75}px;
      transform:rotate(${rotateDeg}deg);
      filter: drop-shadow(0 2px 4px rgba(0,0,0,.35));
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

function endpointIcon(label, bg) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${bg};
      color:#fff;
      border:2px solid #fff;
      border-radius:6px;
      padding:2px 6px;
      font-size:11px;
      font-weight:700;
      white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,.3);
    ">${label}</div>`,
    iconSize: null,
    iconAnchor: [0, 14],
    popupAnchor: [0, -14],
  });
}

// ─── FitBounds helper ───────────────────────────────────────────────────────

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
  }, [points, map]);
  return null;
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ArcRouteMap({ fromNode, toNode, mode = "flight", height = 300 }) {
  const lat1 = toNum(fromNode?.latitude);
  const lng1 = toNum(fromNode?.longitude);
  const lat2 = toNum(toNode?.latitude);
  const lng2 = toNum(toNode?.longitude);

  const isValid = lat1 !== null && lng1 !== null && lat2 !== null && lng2 !== null;

  const arc = useMemo(
    () => (isValid ? buildArc(lat1, lng1, lat2, lng2) : []),
    [lat1, lng1, lat2, lng2, isValid],
  );

  const vehicleBearing = useMemo(
    () => (isValid ? bearing(lat1, lng1, lat2, lng2) : 0),
    [lat1, lng1, lat2, lng2, isValid],
  );

  const mid = useMemo(() => (arc.length ? midpoint(arc) : null), [arc]);

  const isFlight = mode === "flight";
  const emoji = isFlight ? "✈️" : "🚂";
  const arcColor = isFlight ? "#1677ff" : "#fa8c16";
  const bgFrom = "#52c41a";
  const bgTo   = "#f5222d";

  const center = isValid
    ? [(lat1 + lat2) / 2, (lng1 + lng2) / 2]
    : [27.7172, 85.324];

  if (!isValid) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          borderRadius: 8,
          color: "#bbb",
        }}
      >
        No coordinates available for selected branches
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={7}
      scrollWheelZoom
      style={{ height, width: "100%", borderRadius: 8, overflow: "hidden" }}
      key={`${lat1}-${lng1}-${lat2}-${lng2}`}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds points={arc} />

      {/* White halo for readability */}
      <Polyline
        positions={arc}
        pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.7 }}
      />

      {/* Arc line */}
      <Polyline
        positions={arc}
        pathOptions={{
          color: arcColor,
          weight: isFlight ? 3 : 4,
          opacity: 0.9,
          dashArray: isFlight ? "8 6" : null,
        }}
      />

      {/* Vehicle icon at midpoint, rotated in direction of travel */}
      {mid && (
        <Marker
          position={mid}
          icon={makeIcon(emoji, isFlight ? vehicleBearing - 45 : 0, 36)}
        >
          <Popup>
            <strong>{isFlight ? "Flight" : "Rail"}</strong>
            <br />
            {fromNode?.name} → {toNode?.name}
          </Popup>
        </Marker>
      )}

      {/* Origin marker */}
      <Marker position={[lat1, lng1]} icon={endpointIcon(fromNode?.name || "Origin", bgFrom)}>
        <Popup><strong>Origin</strong><br />{fromNode?.name}</Popup>
      </Marker>

      {/* Destination marker */}
      <Marker position={[lat2, lng2]} icon={endpointIcon(toNode?.name || "Destination", bgTo)}>
        <Popup><strong>Destination</strong><br />{toNode?.name}</Popup>
      </Marker>
    </MapContainer>
  );
}
