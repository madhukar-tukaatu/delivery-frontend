"use client";

import { Fragment, useEffect, useMemo } from "react";
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
import { Button, Space, Tag, Typography } from "antd";
import {
  ClockCircleOutlined,
  PhoneOutlined,
  SendOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const NEPAL_CENTER = [28.1, 84.4];

function isNepalCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat > 25 && lat < 32 && lng > 80 && lng < 89;
}

function lerp(from, to, t) {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

function bearingDeg(from, to) {
  const lat1 = (from[0] * Math.PI) / 180;
  const lat2 = (to[0] * Math.PI) / 180;
  const dLng = ((to[1] - from[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function formatClock(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function FitAllBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) {
      map.setView(NEPAL_CENTER, 7);
      return;
    }
    try {
      const bounds = L.latLngBounds(points);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: points.length === 1 ? 9 : 10 });
      }
    } catch {
      // ignore
    }
  }, [points, map]);
  return null;
}

function createBranchIcon(b, selectedBranchId) {
  const isCritical = b.urgency === "critical_capacity_exceeded";
  const isHigh = b.urgency === "high" || b.transfer_requests_count > 0;
  const isSelected = Number(selectedBranchId) === Number(b.id);
  const hasInbound = Number(b.inbound_trs || 0) > 0;

  let bg = "#2563eb";
  let ring = "";
  if (isCritical) {
    bg = "#dc2626";
    ring = "box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.45);";
  } else if (isHigh) {
    bg = "#ea580c";
    ring = "box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.4);";
  } else if (hasInbound) {
    bg = "#0891b2";
    ring = "box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.4);";
  }

  if (isSelected) {
    ring = "box-shadow: 0 0 0 5px rgba(250, 204, 21, 0.65);";
  }

  const waiting = Number(b.pending_parcels || 0);
  const inbound = Number(b.inbound_trs || 0);
  const countLabel = waiting > 99 ? "99+" : String(waiting);
  const inboundMark = inbound > 0
    ? `<span style="position:absolute;right:-4px;top:-4px;background:#0f172a;color:#38bdf8;border:1px solid #38bdf8;border-radius:8px;font-size:8px;font-weight:700;padding:0 3px;line-height:14px;">${inbound}↘</span>`
    : "";

  return L.divIcon({
    className: "custom-branch-pin",
    html: `
      <div style="
        position:relative;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${bg};
        border: 2.5px solid ${isSelected ? "#facc15" : "#ffffff"};
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
        ${inboundMark}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function createTruckIcon(tr) {
  const pkgs = tr.expected_count || tr.parcel_count || 0;
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
        <span style="font-weight: 700; font-size: 10.5px;">${pkgs} pkgs</span>
      </div>
    `,
    iconSize: [84, 24],
    iconAnchor: [42, 12],
    popupAnchor: [0, -14],
  });
}

function createArrowIcon(angle) {
  return L.divIcon({
    className: "tr-arrow-icon",
    html: `<div style="width:18px;height:18px;transform:rotate(${angle}deg);display:flex;align-items:center;justify-content:center;">
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:12px solid #0ea5e9;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45));"></div>
    </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function getRunCoords(tr) {
  const from = [Number(tr.from_lat), Number(tr.from_lng)];
  const to = [Number(tr.to_lat), Number(tr.to_lng)];
  if (!isNepalCoord(from[0], from[1]) || !isNepalCoord(to[0], to[1])) return null;
  const progress = Math.min(0.95, Math.max(0.05, Number(tr.progress ?? 0.5)));
  return { from, to, progress, pos: lerp(from, to, progress), arrowPos: lerp(from, to, Math.min(0.92, progress + 0.08)) };
}

export default function NepalTransferNetworkMapClient({
  branches = [],
  inTransitTrs = [],
  demandFlows = [],
  showDemandArcs = false,
  outboundByBranch = {},
  onRequestVehicle,
  onSelectBranch,
  onSelectTr,
  selectedBranchId = null,
  height = 520,
}) {
  const validBranches = useMemo(
    () =>
      (branches || []).filter((b) => isNepalCoord(Number(b.latitude ?? b.lat), Number(b.longitude ?? b.lng))),
    [branches]
  );

  const runs = useMemo(
    () =>
      (inTransitTrs || [])
        .map((tr) => {
          const coords = getRunCoords(tr);
          return coords ? { tr, ...coords } : null;
        })
        .filter(Boolean),
    [inTransitTrs]
  );

  const flows = useMemo(() => {
    if (!showDemandArcs) return [];
    const max = Math.max(1, ...((demandFlows || []).map((f) => Number(f.count) || 0)));
    return (demandFlows || [])
      .map((f) => {
        const from = [Number(f.from_lat), Number(f.from_lng)];
        const to = [Number(f.to_lat), Number(f.to_lng)];
        if (!isNepalCoord(from[0], from[1]) || !isNepalCoord(to[0], to[1])) return null;
        const weight = 2 + (8 * (Number(f.count) || 0)) / max;
        return { f, from, to, weight };
      })
      .filter(Boolean);
  }, [demandFlows, showDemandArcs]);

  const points = useMemo(() => {
    const pts = validBranches.map((b) => [Number(b.latitude ?? b.lat), Number(b.longitude ?? b.lng)]);
    runs.forEach((r) => {
      pts.push(r.from, r.to, r.pos);
    });
    flows.forEach((r) => pts.push(r.from, r.to));
    return pts;
  }, [validBranches, runs, flows]);

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #cbd5e1" }}>
      <style>{`
        .tr-run-line {
          stroke-dasharray: 12 10;
          animation: tr-dash 1.4s linear infinite;
        }
        @keyframes tr-dash { to { stroke-dashoffset: -22; } }
        .custom-branch-pin, .custom-truck-icon, .tr-arrow-icon { background: transparent; border: 0; }
      `}</style>

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
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#dc2626", marginRight: 4 }} />Critical load</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#ea580c", marginRight: 4 }} />High / requested</span>
          <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#2563eb", marginRight: 4 }} />Waiting parcels</span>
          <span><span style={{ display: "inline-block", width: 10, height: 4, background: "#38bdf8", marginRight: 4 }} />Active line-haul</span>
          {showDemandArcs ? <span><span style={{ display: "inline-block", width: 10, height: 4, background: "#f97316", marginRight: 4 }} />Demand O-D</span> : null}
        </Space>
      </div>

      {runs.length === 0 && (
        <div style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.92)",
          color: "#e2e8f0",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 12,
          maxWidth: 320,
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        }}>
          <Text strong style={{ color: "#fff", display: "block", marginBottom: 2 }}>
            No line-haul runs on the road right now
          </Text>
          <Text style={{ color: "#94a3b8", fontSize: 11 }}>
            Branch pins still show parcels waiting to transfer. Dispatched TR runs will appear as directed routes with an estimated position.
          </Text>
        </div>
      )}

      <MapContainer
        center={NEPAL_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={13}
        style={{ height, width: "100%", background: "#f8fafc" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitAllBounds points={points} />

        {flows.map(({ f, from, to, weight }) => (
          <Polyline
            key={`flow-${f.origin_branch_id}-${f.destination_branch_id}`}
            positions={[from, to]}
            pathOptions={{ color: "#ea580c", weight, opacity: 0.55 }}
          >
            <LeafletTooltip sticky>
              {f.origin_name} → {f.destination_name}: {f.count} parcels
              {f.sla_risk_count ? ` · ${f.sla_risk_count} SLA risk` : ""}
            </LeafletTooltip>
          </Polyline>
        ))}

        {runs.map(({ tr, from, to, pos, arrowPos }) => {
          const code = tr.code || tr.transfer_number || tr.manifest_number || `#${tr.id}`;
          const angle = bearingDeg(from, to);
          return (
            <Fragment key={`run-${tr.id}`}>
              <Polyline
                positions={[from, to]}
                pathOptions={{
                  color: "#0284c7",
                  weight: 4,
                  opacity: 0.9,
                  className: "tr-run-line",
                }}
              >
                <LeafletTooltip sticky>
                  {code}: {tr.from_branch_name} → {tr.to_branch_name}
                </LeafletTooltip>
              </Polyline>
              <Marker position={arrowPos} icon={createArrowIcon(angle)} interactive={false} />
              <Marker position={pos} icon={createTruckIcon(tr)}>
                <Popup>
                  <div style={{ minWidth: 230 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a", marginBottom: 2 }}>
                      {code}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      <strong>{tr.from_branch_name}</strong> → <strong>{tr.to_branch_name}</strong>
                    </div>
                    <Space direction="vertical" size={3} style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                        <Text type="secondary">Parcels</Text>
                        <Text strong>{tr.expected_count || tr.parcel_count || 0}{(tr.weight_kg ? ` · ${tr.weight_kg} kg` : "")}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                        <Text type="secondary">Vehicle</Text>
                        <Text strong>{tr.vehicle_number || tr.vehicle_type || "Line-haul"}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                        <Text type="secondary">Driver</Text>
                        <Text strong>
                          {tr.driver_name || "Unassigned"}
                          {tr.driver_phone ? (
                            <a href={`tel:${tr.driver_phone}`} style={{ marginLeft: 6, fontSize: 11 }}>
                              <PhoneOutlined /> {tr.driver_phone}
                            </a>
                          ) : null}
                        </Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                        <Text type="secondary">Dispatched</Text>
                        <Text strong>{formatClock(tr.dispatched_at)}</Text>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                        <Text type="secondary">ETA</Text>
                        <Text strong>
                          <ClockCircleOutlined /> {formatClock(tr.estimated_arrival_at)}
                        </Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        Estimated position from dispatch time &amp; ETA
                      </Text>
                    </Space>
                    {onSelectTr ? (
                      <Button
                        size="small"
                        type="link"
                        style={{ paddingLeft: 0, marginTop: 6 }}
                        onClick={() => onSelectTr(tr)}
                      >
                        Open this TR →
                      </Button>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}

        {validBranches.map((b) => (
          <Marker
            key={`branch-${b.id}`}
            position={[Number(b.latitude ?? b.lat), Number(b.longitude ?? b.lng)]}
            icon={createBranchIcon(b, selectedBranchId)}
            eventHandlers={{
              click: () => onSelectBranch?.(b.id),
            }}
          >
            <Popup>
              <div style={{ minWidth: 230 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a", marginBottom: 2 }}>
                  {b.name}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                  {[b.city, b.district, b.province].filter(Boolean).join(", ")}
                </div>
                <Space direction="vertical" size={3} style={{ width: "100%", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                    <Text type="secondary">Waiting to transfer</Text>
                    <Text strong style={{ color: "#2563eb" }}>
                      {b.pending_parcels || 0} pkgs ({b.pending_weight_kg || 0} kg)
                    </Text>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                    <Text type="secondary">Inbound parcels / TRs</Text>
                    <Text strong style={{ color: "#059669" }}>
                      {b.inbound_parcels || b.inbound_expected_parcels || 0} pkgs · {b.inbound_trs || 0} TR
                    </Text>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                    <Text type="secondary">Vehicle requests</Text>
                    {b.transfer_requests_count > 0 ? (
                      <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>{b.transfer_requests_count} pending</Tag>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 11 }}>None</Text>
                    )}
                  </div>
                </Space>
                {(outboundByBranch[b.id] || outboundByBranch[String(b.id)]) && (
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Outbound demand</Text>
                    {(outboundByBranch[b.id] || outboundByBranch[String(b.id)]).map((d) => (
                      <div key={d.destination_branch_id} style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                        <span>{d.destination_name}</span>
                        <strong>{d.count}</strong>
                      </div>
                    ))}
                  </div>
                )}
                {onRequestVehicle ? (
                  <Button
                    size="small"
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => onRequestVehicle(b)}
                  >
                    Request vehicle
                  </Button>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
