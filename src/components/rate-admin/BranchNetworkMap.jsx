"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Space, Tag, Typography } from "antd";

const { Text } = Typography;

const NEPAL_CENTER = [27.7172, 85.324];

// Distinct colour per service type for visual verification.
const SERVICE_COLORS = {
  standard: "#1677ff",
  express: "#fa8c16",
  same_day: "#722ed1",
  flight: "#eb2f96",
};

const SERVICE_LABELS = {
  standard: "Standard",
  express: "Express",
  same_day: "Same Day",
  flight: "Flight",
};

function serviceColor(service) {
  return SERVICE_COLORS[String(service)] || "#8c8c8c";
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function coordOf(branch) {
  const lat = toNumber(branch?.latitude);
  const lng = toNumber(branch?.longitude);
  return lat !== null && lng !== null ? [lat, lng] : null;
}

function hubIcon(isCenter) {
  const size = isCenter ? 34 : 24;
  const bg = isCenter ? "#f5222d" : "#1677ff";
  return L.divIcon({
    className: "branch-network-marker",
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${bg};border:3px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,.35);
      "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function FitToPoints({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 9));
      return;
    }
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
}

// Slight curve so overlapping lanes between the same pair (different services)
// don't perfectly overlap. offsetIndex shifts the midpoint perpendicular.
function curvedPositions(from, to, offsetIndex) {
  if (offsetIndex === 0) {
    return [from, to];
  }
  const midLat = (from[0] + to[0]) / 2;
  const midLng = (from[1] + to[1]) / 2;
  const dLat = to[0] - from[0];
  const dLng = to[1] - from[1];
  // Perpendicular offset scaled small.
  const scale = 0.06 * offsetIndex;
  const offLat = midLat - dLng * scale;
  const offLng = midLng + dLat * scale;
  return [from, [offLat, offLng], to];
}

/**
 * Draws a branch's connected lanes on a map.
 *
 * Props:
 *  - centerBranch: the focused branch { name, latitude, longitude }
 *  - lanes: array of normalized lanes (from_branch/to_branch objects with coords,
 *    service_type, distance_km, estimated_hours, is_active)
 *  - height
 *  - activeServices: optional array of service types to show (defaults to all)
 */
export default function BranchNetworkMap({
  centerBranch,
  lanes = [],
  height = 460,
  activeServices = null,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Keep only lanes with drawable coordinates + allowed services.
  const drawable = useMemo(() => {
    // Track how many lanes share the same unordered branch pair so we can fan them.
    const pairCounts = new Map();

    return lanes
      .filter((lane) => {
        if (
          activeServices &&
          !activeServices.includes(String(lane.service_type))
        ) {
          return false;
        }
        return coordOf(lane.from_branch) && coordOf(lane.to_branch);
      })
      .map((lane) => {
        const from = coordOf(lane.from_branch);
        const to = coordOf(lane.to_branch);
        const a = Number(lane.from_branch_id);
        const b = Number(lane.to_branch_id);
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        const idx = pairCounts.get(key) || 0;
        pairCounts.set(key, idx + 1);
        return {
          lane,
          positions: curvedPositions(from, to, idx),
          from,
          to,
        };
      });
  }, [lanes, activeServices]);

  const allPoints = useMemo(() => {
    const points = [];
    const center = coordOf(centerBranch);
    if (center) points.push(center);
    for (const d of drawable) {
      points.push(d.from, d.to);
    }
    return points;
  }, [drawable, centerBranch]);

  // Unique other-branch markers.
  const branchMarkers = useMemo(() => {
    const seen = new Map();
    const centerId = Number(centerBranch?.id);
    for (const d of drawable) {
      for (const b of [d.lane.from_branch, d.lane.to_branch]) {
        const id = Number(b?.id);
        const c = coordOf(b);
        if (c && !seen.has(id)) {
          seen.set(id, { branch: b, position: c, isCenter: id === centerId });
        }
      }
    }
    return Array.from(seen.values());
  }, [drawable, centerBranch]);

  const servicesPresent = useMemo(() => {
    const set = new Set(drawable.map((d) => String(d.lane.service_type)));
    return Array.from(set);
  }, [drawable]);

  const center = coordOf(centerBranch) || allPoints[0] || NEPAL_CENTER;

  if (!mounted) {
    return (
      <div
        style={{ height, width: "100%", borderRadius: 12, background: "#f5f5f5" }}
      />
    );
  }

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      {/* Legend */}
      <Space wrap size={12}>
        {servicesPresent.length === 0 ? (
          <Text type="secondary">No lanes with coordinates to display.</Text>
        ) : (
          servicesPresent.map((service) => (
            <Space key={service} size={6}>
              <span
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 4,
                  borderRadius: 2,
                  background: serviceColor(service),
                }}
              />
              <Text style={{ fontSize: 12 }}>
                {SERVICE_LABELS[service] || service}
              </Text>
            </Space>
          ))
        )}
      </Space>

      <div
        style={{
          height,
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #f0f0f0",
        }}
      >
        <MapContainer
          center={center}
          zoom={8}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitToPoints points={allPoints} />

          {drawable.map((d, index) => {
            const color = serviceColor(d.lane.service_type);
            return (
              <Polyline
                key={`lane-${d.lane.id}-${index}`}
                positions={d.positions}
                pathOptions={{
                  color,
                  weight: 4,
                  opacity: d.lane.is_active ? 0.85 : 0.35,
                  dashArray: d.lane.is_active ? null : "6 8",
                }}
              >
                <LeafletTooltip sticky>
                  {d.lane.from_branch?.name} → {d.lane.to_branch?.name}
                  {" · "}
                  {SERVICE_LABELS[d.lane.service_type] || d.lane.service_type}
                  {" · "}
                  {Number(d.lane.distance_km || 0)} km
                </LeafletTooltip>
              </Polyline>
            );
          })}

          {branchMarkers.map((m) => (
            <Marker
              key={`branch-${m.branch.id}`}
              position={m.position}
              icon={hubIcon(m.isCenter)}
            >
              <Popup>
                <strong>{m.branch.name}</strong>
                {m.isCenter ? (
                  <>
                    <br />
                    <span style={{ color: "#f5222d" }}>Selected branch</span>
                  </>
                ) : null}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </Space>
  );
}

export { SERVICE_COLORS, SERVICE_LABELS };
