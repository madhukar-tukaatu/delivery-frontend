"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip as LeafletTooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Badge, Button, Space, Tag, Typography, Progress } from "antd";
import {
  CarOutlined,
  CompassOutlined,
  SendOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  LockOutlined,
  ThunderboltOutlined,
  FullscreenOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const NEPAL_CENTER = [28.1, 84.4];

// Highway Corridor Coordinate Polylines
const CORRIDORS = [
  {
    name: "Central Triangle (Prithvi & Narayanghat Corridor)",
    color: "#2563eb",
    weight: 4,
    coords: [
      [27.7172, 85.3240], // Kathmandu
      [27.8569, 84.5574], // Mugling
      [28.2096, 83.9856], // Pokhara
      [27.8569, 84.5574], // Mugling
      [27.6833, 84.4333], // Bharatpur / Narayanghat
      [27.7172, 85.3240], // Back to KTM via Fast Track
    ],
  },
  {
    name: "Eastern Terai Corridor (BP & Mahendra East)",
    color: "#0891b2",
    weight: 3.5,
    coords: [
      [27.6833, 84.4333], // Bharatpur
      [27.4285, 85.0322], // Hetauda
      [27.2500, 85.9167], // Sindhuli
      [26.9833, 85.9000], // Bardibas
      [26.7288, 85.9244], // Janakpur
      [26.7296, 86.4950], // Lahan
      [26.6636, 87.2747], // Itahari
      [26.4525, 87.2718], // Biratnagar
      [26.6636, 87.2747], // Itahari
      [26.6588, 87.7006], // Damak
      [26.6416, 87.9904], // Birtamod
      [26.9100, 87.9275], // Ilam
    ],
  },
  {
    name: "Western Terai Corridor (Mahendra West Trunk)",
    color: "#7c3aed",
    weight: 3.5,
    coords: [
      [27.6833, 84.4333], // Bharatpur
      [27.6500, 84.1167], // Kawasoti
      [27.7006, 83.4484], // Butwal
      [27.5044, 83.4503], // Bhairahawa
      [27.7006, 83.4484], // Butwal
      [28.0417, 82.4833], // Ghorahi (Dang)
      [28.1883, 81.6917], // Kohalpur
      [28.0500, 81.6167], // Nepalgunj
      [28.1883, 81.6917], // Kohalpur
      [28.6833, 80.6000], // Dhangadhi
      [28.9667, 80.1833], // Mahendranagar
    ],
  },
  {
    name: "Mountain Feeder Spur: Pokhara to Mustang (Jomsom)",
    color: "#d97706",
    weight: 3,
    dashArray: "6, 6",
    coords: [
      [28.2096, 83.9856], // Pokhara
      [28.3439, 83.5647], // Beni
      [28.7817, 83.7381], // Mustang / Jomsom
    ],
  },
  {
    name: "Mountain Feeder Spur: Butwal to Arghakhanchi",
    color: "#ea580c",
    weight: 3,
    dashArray: "6, 6",
    coords: [
      [27.7006, 83.4484], // Butwal
      [27.8672, 83.5469], // Tansen Palpa
      [27.9772, 83.1367], // Sandhikharka Arghakhanchi
    ],
  },
];

function FitAllBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    try {
      const bounds = L.latLngBounds(points);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
      }
    } catch {
      // ignore
    }
  }, [points, map]);
  return null;
}

export default function NepalTransferNetworkMapClient({
  branches = [],
  inTransitTrs = [],
  onRequestVehicle,
  onDispatchBranch,
  onSelectBranch,
  selectedBranchId = null,
  height = 500,
}) {
  const points = useMemo(() => {
    return (branches || [])
      .map((b) => [Number(b.latitude), Number(b.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && lat > 25 && lat < 32);
  }, [branches]);

  const createBranchIcon = (b) => {
    const isCritical = b.urgency === "critical_capacity_exceeded";
    const isHigh = b.urgency === "high" || b.transfer_requests_count > 0;
    const isSelected = Number(selectedBranchId) === Number(b.id);
    const isMajorHub = ["NP-KTM-HO", "NP-CHIT-BHR", "NP-KASK-PKR", "NP-RUPA-BTW", "NP-SUNS-ITH", "NP-MORA-BRT"].includes(b.code);

    let bg = "#2563eb"; // blue
    let border = "#ffffff";
    let ring = "";

    if (isCritical) {
      bg = "#dc2626"; // red
      ring = "box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.45);";
    } else if (isHigh) {
      bg = "#ea580c"; // orange
      ring = "box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.4);";
    } else if (isMajorHub) {
      bg = "#059669"; // green for major hubs
      ring = "box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.4);";
    }

    if (isSelected) {
      border = "#facc15"; // gold border
      ring = "box-shadow: 0 0 0 5px rgba(250, 204, 21, 0.6);";
    }

    const countLabel = b.pending_parcels > 99 ? "99+" : (b.pending_parcels ?? "0");

    return L.divIcon({
      className: "custom-branch-pin",
      html: `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${bg};
          border: 2.5px solid ${border};
          color: #ffffff;
          font-weight: 700;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          ${ring}
        ">
          ${countLabel}
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18],
    });
  };

  const createTruckIcon = (tr) => {
    return L.divIcon({
      className: "custom-truck-icon",
      html: `
        <div style="
          background: #0f172a;
          border: 2px solid #38bdf8;
          border-radius: 6px;
          padding: 3px 8px;
          color: #fff;
          font-size: 11px;
          box-shadow: 0 3px 8px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          cursor: pointer;
        ">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 3h15v13H1z"/>
            <path d="M16 8h4l3 3v5h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <span style="font-weight: 700; font-size: 11px; color: #f8fafc;">${tr.expected_count || 0} pkgs</span>
        </div>
      `,
      iconSize: [85, 26],
      iconAnchor: [42, 13],
      popupAnchor: [0, -15],
    });
  };

  const getInterpolatedPosition = (tr) => {
    const fromLat = Number(tr.from_lat || 27.7172);
    const fromLng = Number(tr.from_lng || 85.3240);
    const toLat = Number(tr.to_lat || 27.6833);
    const toLng = Number(tr.to_lng || 84.4333);

    if (!tr.dispatched_at) {
      return [(fromLat + toLat) / 2, (fromLng + toLng) / 2];
    }

    const start = new Date(tr.dispatched_at).getTime();
    const now = Date.now();
    const durationMs = (Number(tr.estimated_hours) || 4.0) * 3600 * 1000;
    const progress = Math.min(0.88, Math.max(0.12, (now - start) / durationMs));

    const curLat = fromLat + (toLat - fromLat) * progress;
    const curLng = fromLng + (toLng - fromLng) * progress;
    return [curLat, curLng];
  };

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #cbd5e1" }}>
      {/* Interactive Map Header Badge Overlay */}
      <div style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 1000,
        background: "rgba(15, 23, 42, 0.92)",
        backdropFilter: "blur(6px)",
        padding: "6px 12px",
        borderRadius: 8,
        color: "#fff",
        fontSize: 11,
        border: "1px solid rgba(255,255,255,0.15)",
      }}>
        <Space size={12} wrap>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#dc2626", marginRight: 4 }}></span>Critical (â‰¥80kg)</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#ea580c", marginRight: 4 }}></span>Vehicle Requested</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#059669", marginRight: 4 }}></span>Major Hub</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#2563eb", marginRight: 4 }}></span>Active Branch</span>
          <span><span style={{ display: "inline-block", width: 10, height: 4, background: "#38bdf8", marginRight: 4 }}></span>Moving Line-Haul</span>
        </Space>
      </div>

      <MapContainer
        center={NEPAL_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={13}
        style={{ height, width: "100%", background: "#f8fafc" }}
        scrollWheelZoom={false}
      >
        {/* Free, clean OpenStreetMap tiles with no API key requirement */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitAllBounds points={points} />

        {/* Highway Arterial Corridors */}
        {CORRIDORS.map((corridor, idx) => (
          <Polyline
            key={`corridor-${idx}`}
            positions={corridor.coords}
            pathOptions={{
              color: corridor.color,
              weight: corridor.weight,
              opacity: 0.85,
              dashArray: corridor.dashArray,
            }}
          >
            <LeafletTooltip sticky>{corridor.name}</LeafletTooltip>
          </Polyline>
        ))}

        {/* Real Branch Pins from Database */}
        {branches.map((b) => {
          const lat = Number(b.latitude);
          const lng = Number(b.longitude);
          if (!lat || !lng) return null;

          return (
            <Marker
              key={`branch-${b.id}`}
              position={[lat, lng]}
              icon={createBranchIcon(b)}
            >
              <Popup>
                <div style={{ minWidth: 230 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a", marginBottom: 2 }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                    {b.city}, {b.district} ({b.province})
                  </div>

                  <Space direction="vertical" size={3} style={{ width: "100%", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <Text type="secondary">Outbound Ready:</Text>
                      <Text strong style={{ color: "#2563eb" }}>{b.pending_parcels || 0} pkgs ({b.pending_weight_kg || 0} kg)</Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <Text type="secondary">Inbound Arriving:</Text>
                      <Text strong style={{ color: "#059669" }}>{b.inbound_parcels || 0} pkgs</Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <Text type="secondary">Dispatched Line-Hauls:</Text>
                      <Text strong>{b.dispatched_trs || 0} TR runs</Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <Text type="secondary">Vehicle Requests:</Text>
                      {b.transfer_requests_count > 0 ? (
                        <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>{b.transfer_requests_count} Pending</Tag>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 11 }}>None</Text>
                      )}
                    </div>

                    {b.urgency === "critical_capacity_exceeded" && (
                      <Tag color="error" icon={<WarningOutlined />} style={{ width: "100%", textAlign: "center", margin: "4px 0", fontSize: 10.5 }}>
                        Threshold Exceeded (â‰¥80 kg)!
                      </Tag>
                    )}
                  </Space>

                  <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
                    <Button
                      size="small"
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={() => onRequestVehicle?.(b)}
                    >
                      Request Vehicle
                    </Button>
                    <Button
                      size="small"
                      onClick={() => onSelectBranch?.(b.id)}
                    >
                      Filter TRs
                    </Button>
                  </Space>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Real Moving Trucks from Database */}
        {inTransitTrs.map((tr) => {
          const pos = getInterpolatedPosition(tr);
          const estArrival = tr.estimated_arrival_at ? new Date(tr.estimated_arrival_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A";
          const maxParcels = tr.max_parcels || 800;
          const count = tr.expected_count || 0;
          const loadPercent = Math.min(100, Math.round((count / maxParcels) * 100));

          return (
            <Marker
              key={`truck-${tr.id}`}
              position={pos}
              icon={createTruckIcon(tr)}
            >
              <Popup>
                <div style={{ minWidth: 230 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text strong style={{ color: "#2563eb", fontSize: 13 }}>{tr.transfer_number || tr.manifest_number}</Text>
                    <Tag color="processing" style={{ margin: 0 }}>On Highway</Tag>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
                    {tr.from_branch_name} â†’ {tr.to_branch_name}
                  </div>

                  <Space direction="vertical" size={3} style={{ width: "100%", fontSize: 11, marginBottom: 8 }}>
                    <div><Text type="secondary">Driver:</Text> <Text strong>{tr.driver_name}</Text> {tr.driver_phone && <a href={`tel:${tr.driver_phone}`}><PhoneOutlined /> {tr.driver_phone}</a>}</div>
                    <div><Text type="secondary">Vehicle Plate:</Text> <strong>{tr.vehicle_number}</strong> ({tr.vehicle_type?.toUpperCase()})</div>
                    <div><Text type="secondary">Cargo Load:</Text> <Badge count={`${count} pkgs`} style={{ backgroundColor: "#0284c7" }} /> ({loadPercent}% of {maxParcels} cap)</div>
                    <div><Text type="secondary">Est. Arrival (ETA):</Text> <Text strong style={{ color: "#059669" }}>{estArrival} (~{tr.estimated_hours || 4}h run)</Text></div>
                    {tr.seal_number && <div><Text type="secondary">Security Seal:</Text> <Tag color="cyan" icon={<LockOutlined />}>{tr.seal_number}</Tag></div>}
                  </Space>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
