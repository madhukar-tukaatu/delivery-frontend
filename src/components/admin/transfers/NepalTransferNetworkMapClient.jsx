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
} from "@ant-design/icons";

const { Text } = Typography;

const NEPAL_CENTER = [28.1, 84.4];

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
  realLanes = [],
  inTransitTrs = [],
  onRequestVehicle,
  onSelectBranch,
  selectedBranchId = null,
  height = 520,
}) {
  const points = useMemo(() => {
    return (branches || [])
      .map((b) => [Number(b.latitude), Number(b.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && lat > 25 && lat < 32);
  }, [branches]);

  // Convert real database lanes into polylines
  const lanePolylines = useMemo(() => {
    if (realLanes && realLanes.length > 0) {
      return realLanes.map((l, idx) => ({
        id: l.id || idx,
        name: `${l.from_name} -> ${l.to_name} (${l.distance_km || 0} km, ${l.estimated_hours || 0}h)`,
        mode: l.transport_mode || "road",
        service: l.service_type || "standard",
        coords: [
          [Number(l.from_lat), Number(l.from_lng)],
          [Number(l.to_lat), Number(l.to_lng)],
        ],
        color: l.transport_mode === "flight" ? "#ea580c" : l.service_type === "express" ? "#0891b2" : "#2563eb",
        dashArray: l.transport_mode === "flight" ? "6, 6" : undefined,
      }));
    }

    // Default fallback connecting visible branches in order
    const valid = (branches || []).filter((b) => Number(b.latitude) && Number(b.longitude));
    const lines = [];
    for (let i = 0; i < valid.length - 1; i++) {
      lines.push({
        id: `fb-${i}`,
        name: `${valid[i].name} -> ${valid[i + 1].name}`,
        coords: [
          [Number(valid[i].latitude), Number(valid[i].longitude)],
          [Number(valid[i + 1].latitude), Number(valid[i + 1].longitude)],
        ],
        color: "#2563eb",
      });
    }
    return lines;
  }, [realLanes, branches]);

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
      ring = "box-shadow: 0 0 0 5px rgba(250, 204, 21, 0.65);";
    }

    const countLabel = b.pending_parcels > 99 ? "99+" : (b.pending_parcels || "0");

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

  // Sharp SVG Truck Icon without encoding mojibake
  const createTruckIcon = (tr) => {
    return L.divIcon({
      className: "custom-truck-icon",
      html: `
        <div style="
          background: #0f172a;
          border: 2px solid #38bdf8;
          border-radius: 6px;
          padding: 3px 7px;
          color: #fff;
          font-size: 11px;
          box-shadow: 0 3px 8px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          cursor: pointer;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
            <path d="M1 3h15v13H1z"></path>
            <path d="M16 8h4l3 3v5h-7V8z"></path>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
          <span style="font-weight: 700; font-size: 10.5px;">${tr.expected_count || 0} pkgs</span>
        </div>
      `,
      iconSize: [84, 24],
      iconAnchor: [42, 12],
      popupAnchor: [0, -14],
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
      {/* Interactive Map Header Legend Overlay */}
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
      }}>
        <Space size={10} wrap>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#dc2626", marginRight: 4 }}></span>Critical (&ge;80kg / &ge;50 pkgs)</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#ea580c", marginRight: 4 }}></span>Vehicle Requested</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#059669", marginRight: 4 }}></span>Major Hub</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#2563eb", marginRight: 4 }}></span>Branch Node</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "#38bdf8", marginRight: 4 }}></span>Moving Line-Haul</span>
        </Space>
      </div>

      <MapContainer
        center={NEPAL_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={14}
        style={{ height, width: "100%", background: "#f8fafc" }}
        scrollWheelZoom={false}
      >
        {/* Clean OpenStreetMap Standard Tiles without API KEY watermark */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitAllBounds points={points} />

        {/* Real Database Transfer Lanes & Corridors */}
        {lanePolylines.map((lane) => (
          <Polyline
            key={`lane-${lane.id}`}
            positions={lane.coords}
            pathOptions={{
              color: lane.color || "#2563eb",
              weight: 3.5,
              opacity: 0.8,
              dashArray: lane.dashArray,
            }}
          >
            <LeafletTooltip sticky>{lane.name}</LeafletTooltip>
          </Polyline>
        ))}

        {/* Real Database Branch Pins */}
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
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 2 }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                    {b.city}, {b.district} ({b.province})
                  </div>

                  <Space direction="vertical" size={3} style={{ width: "100%", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <Text type="secondary">Pending Outbound:</Text>
                      <Text strong style={{ color: "#2563eb" }}>{b.pending_parcels || 0} pkgs ({b.pending_weight_kg || 0} kg)</Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <Text type="secondary">Expected Inbound:</Text>
                      <Text strong style={{ color: "#059669" }}>{b.inbound_expected_parcels || 0} pkgs</Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <Text type="secondary">Vehicle Requests:</Text>
                      {b.transfer_requests_count > 0 ? (
                        <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>{b.transfer_requests_count} Pending</Tag>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 11 }}>0</Text>
                      )}
                    </div>

                    {b.urgency === "critical_capacity_exceeded" && (
                      <Tag color="error" icon={<WarningOutlined />} style={{ width: "100%", textAlign: "center", margin: "4px 0", fontSize: 10.5 }}>
                        Threshold Exceeded (&ge;80 kg)!
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

        {/* Real Active Line-Haul Moving Trucks */}
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
                    {tr.from_branch_name} &rarr; {tr.to_branch_name}
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
