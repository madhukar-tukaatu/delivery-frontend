"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, Tag, Badge, Space, Typography, Tooltip, Radio, Button } from "antd";
import {
  CompassOutlined,
  ThunderboltOutlined,
  CarOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;

import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip as LeafletTooltip } from "react-leaflet";

const NEPAL_CENTER = [28.2096, 84.0500]; // Geographic center of Nepal
const DEFAULT_ZOOM = 7;

// Default key hub coordinates across Nepal for fallback / demo network
const DEFAULT_HUBS = [
  { id: 1, name: "Kathmandu Central Hub", city: "Kathmandu", lat: 27.7172, lng: 85.3240, parcels: 420, isHQ: true },
  { id: 2, name: "Bharatpur Central Transit Hub", city: "Bharatpur", lat: 27.6766, lng: 84.4359, parcels: 210, isTransit: true },
  { id: 3, name: "Pokhara Regional Branch", city: "Pokhara", lat: 28.2096, lng: 83.9856, parcels: 145 },
  { id: 4, name: "Butwal Western Hub", city: "Butwal", lat: 27.7006, lng: 83.4484, parcels: 160, isTransit: true },
  { id: 5, name: "Biratnagar Eastern Gateway", city: "Biratnagar", lat: 26.4525, lng: 87.2718, parcels: 185 },
  { id: 6, name: "Itahari Crossway Hub", city: "Itahari", lat: 26.6667, lng: 87.2833, parcels: 130 },
  { id: 7, name: "Birgunj Terai Hub", city: "Birgunj", lat: 27.0149, lng: 84.8778, parcels: 110 },
  { id: 8, name: "Nepalgunj Mid-West Hub", city: "Nepalgunj", lat: 28.0500, lng: 81.6167, parcels: 95 },
  { id: 9, name: "Dhangadhi Far-West Hub", city: "Dhangadhi", lat: 28.6852, lng: 80.6078, parcels: 80 },
  { id: 10, name: "Mahendranagar Terminal", city: "Mahendranagar", lat: 28.9667, lng: 80.1833, parcels: 55 },
  { id: 11, name: "Hetauda Junction", city: "Hetauda", lat: 27.4289, lng: 85.0322, parcels: 75 },
  { id: 12, name: "Janakpur Mithila Hub", city: "Janakpur", lat: 26.7288, lng: 85.9244, parcels: 90 },
  { id: 13, name: "Dharan Foothills Branch", city: "Dharan", lat: 26.8126, lng: 87.2838, parcels: 65 },
  { id: 14, name: "Bhairahawa Airport Hub", city: "Bhairahawa", lat: 27.5044, lng: 83.4497, parcels: 70 },
  { id: 15, name: "Surkhet Valley Branch", city: "Surkhet", lat: 28.6019, lng: 81.6339, parcels: 40 },
  { id: 16, name: "Damak Eastern Branch", city: "Damak", lat: 26.6689, lng: 87.6974, parcels: 50 },
  { id: 17, name: "Lahan Siraha Hub", city: "Lahan", lat: 26.7296, lng: 86.4952, parcels: 45 },
  { id: 18, name: "Bardibas Junction", city: "Bardibas", lat: 26.9944, lng: 85.8953, parcels: 85 },
];

// Major corridors connecting hubs
const DEFAULT_CORRIDORS = [
  { from: 1, to: 2, service: "standard", volume: 240, activeTrucks: 2, name: "Prithvi Highway Trunk" },
  { from: 1, to: 3, service: "express", volume: 85, activeTrucks: 1, name: "KTM - PKR Express Sprint" },
  { from: 1, to: 11, service: "same_day", volume: 45, activeTrucks: 1, name: "Kanti Lokpath Rapid" },
  { from: 2, to: 3, service: "standard", volume: 90, activeTrucks: 1, name: "Mugling - Pokhara Link" },
  { from: 2, to: 4, service: "standard", volume: 150, activeTrucks: 2, name: "Narayanghat - Butwal Corridor" },
  { from: 2, to: 7, service: "standard", volume: 80, activeTrucks: 1, name: "Bypass to Birgunj" },
  { from: 4, to: 8, service: "standard", volume: 95, activeTrucks: 1, name: "East-West Western Trunk" },
  { from: 8, to: 9, service: "standard", volume: 70, activeTrucks: 1, name: "Karnali - Far West Run" },
  { from: 9, to: 10, service: "standard", volume: 55, activeTrucks: 1, name: "Mahakali Terminal Run" },
  { from: 1, to: 18, service: "express", volume: 110, activeTrucks: 1, name: "BP Highway Eastern Express" },
  { from: 18, to: 6, service: "standard", volume: 130, activeTrucks: 2, name: "East-West Highway East Run" },
  { from: 6, to: 5, service: "same_day", volume: 60, activeTrucks: 1, name: "Koshi Rapid Intra-Hub" },
  { from: 6, to: 13, service: "same_day", volume: 40, activeTrucks: 1, name: "Itahari - Dharan Shuttle" },
  { from: 4, to: 14, service: "same_day", volume: 50, activeTrucks: 1, name: "Butwal - Bhairahawa Shuttle" },
];

export default function NepalTransferNetworkMap({ branches = [], activeTrs = [], onSelectBranch = null }) {
  const [selectedService, setSelectedService] = useState("all");
  const [activeHubId, setActiveHubId] = useState(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Merge provided DB branches with coordinates
  const hubs = useMemo(() => {
    if (!branches || branches.length === 0) return DEFAULT_HUBS;
    return branches.map((b, idx) => {
      const fallback = DEFAULT_HUBS.find((h) => h.city?.toLowerCase() === b.city?.toLowerCase()) || DEFAULT_HUBS[idx % DEFAULT_HUBS.length];
      return {
        id: b.id,
        name: b.name,
        city: b.city || fallback?.city,
        lat: Number(b.latitude || fallback?.lat || 27.7),
        lng: Number(b.longitude || fallback?.lng || 85.3),
        parcels: b.staging_count || fallback?.parcels || Math.floor(Math.random() * 80 + 10),
        isHQ: b.id === 19 || b.name?.toLowerCase().includes("kathmandu"),
        isTransit: b.name?.toLowerCase().includes("bharatpur") || b.name?.toLowerCase().includes("butwal"),
      };
    });
  }, [branches]);

  const hubMap = useMemo(() => new Map(hubs.map((h) => [h.id, h])), [hubs]);

  // Filtered corridors
  const corridors = useMemo(() => {
    return DEFAULT_CORRIDORS.filter((c) => {
      if (selectedService !== "all" && c.service !== selectedService) return false;
      if (activeHubId !== null && c.from !== activeHubId && c.to !== activeHubId) return false;
      return true;
    });
  }, [selectedService, activeHubId]);

  if (!isClient) {
    return (
      <Card style={{ minHeight: 460, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Space direction="vertical" align="center">
          <CompassOutlined spin style={{ fontSize: 32, color: "#1677ff" }} />
          <Text type="secondary">Loading Nepal Multi-Corridor Logistics Network Map...</Text>
        </Space>
      </Card>
    );
  }

  // Dynamic Leaflet DivIcon helpers
  const getHubIcon = (hub, isSelected) => {
    if (typeof window === "undefined" || !L) return null;
    const size = hub.isHQ ? 28 : hub.isTransit ? 22 : 16;
    const color = hub.isHQ ? "#f5222d" : hub.isTransit ? "#fa8c16" : isSelected ? "#722ed1" : "#1677ff";
    const pulseRing = hub.parcels > 100 ? `<div style="position:absolute;top:-4px;left:-4px;width:${size + 8}px;height:${size + 8}px;border-radius:50%;border:2px solid ${color};animation:pulse 2s infinite;opacity:0.6;"></div>` : "";

    return L.divIcon({
      className: "hub-marker-pin",
      html: `
        <div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:bold;">
          ${pulseRing}
          ${hub.parcels > 150 ? hub.parcels : ""}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const getServiceColor = (service) => {
    switch (service) {
      case "express":
        return "#fa8c16"; // Orange
      case "same_day":
        return "#722ed1"; // Purple
      case "standard":
      default:
        return "#1677ff"; // Blue Line-haul
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: 520, borderRadius: 8, overflow: "hidden" }}>
      {/* Control Overlay */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.95)",
          padding: "10px 14px",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          backdropFilter: "blur(4px)",
        }}
      >
        <Space direction="vertical" size={6}>
          <Text strong style={{ fontSize: 13 }}>
            <CompassOutlined style={{ color: "#1677ff", marginRight: 4 }} />
            Corridor Network Filter
          </Text>
          <Radio.Group
            size="small"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="all">All ({corridors.length})</Radio.Button>
            <Radio.Button value="standard">
              <span style={{ color: "#1677ff" }}>●</span> Standard
            </Radio.Button>
            <Radio.Button value="express">
              <span style={{ color: "#fa8c16" }}>●</span> Express
            </Radio.Button>
            <Radio.Button value="same_day">
              <span style={{ color: "#722ed1" }}>●</span> Same-Day
            </Radio.Button>
          </Radio.Group>
          {activeHubId && (
            <Button
              size="small"
              type="link"
              danger
              onClick={() => setActiveHubId(null)}
              style={{ padding: 0, height: "auto" }}
            >
              Clear Hub Focus (Show all Nepal)
            </Button>
          )}
        </Space>
      </div>

      {/* Legend Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.95)",
          padding: "8px 14px",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          fontSize: 12,
        }}
      >
        <Space size={14}>
          <span>
            <Badge color="#f5222d" text="HQ / Central Valley" />
          </span>
          <span>
            <Badge color="#fa8c16" text="Primary Transit Hub (Bharatpur / Butwal)" />
          </span>
          <span>
            <Badge color="#1677ff" text="Branch Terminal" />
          </span>
          <span>
            <CarOutlined style={{ color: "#52c41a", marginRight: 4 }} />
            Active Line-haul Truck
          </span>
        </Space>
      </div>

      {/* Main Map */}
      <MapContainer
        center={NEPAL_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Corridor Arcs / Lines */}
        {corridors.map((c, idx) => {
          const fromHub = hubMap.get(c.from);
          const toHub = hubMap.get(c.to);
          if (!fromHub || !toHub) return null;

          const color = getServiceColor(c.service);
          const positions = [
            [fromHub.lat, fromHub.lng],
            [toHub.lat, toHub.lng],
          ];

          return (
            <Polyline
              key={`corridor-${idx}`}
              positions={positions}
              pathOptions={{
                color: color,
                weight: c.service === "express" ? 4 : c.service === "same_day" ? 3 : 2.5,
                dashArray: c.service === "same_day" ? "6, 6" : undefined,
                opacity: 0.85,
              }}
            >
              <LeafletTooltip sticky>
                <div>
                  <strong>{c.name}</strong>
                  <br />
                  <span>
                    {fromHub.city} → {toHub.city}
                  </span>
                  <br />
                  <Tag color={color} style={{ marginTop: 4 }}>
                    {c.service?.toUpperCase()}
                  </Tag>
                  <span>{c.volume} parcels moving</span>
                </div>
              </LeafletTooltip>
            </Polyline>
          );
        })}

        {/* Branch Hub Markers */}
        {hubs.map((hub) => {
          const isSelected = activeHubId === hub.id;
          return (
            <Marker
              key={`hub-${hub.id}`}
              position={[hub.lat, hub.lng]}
              icon={getHubIcon(hub, isSelected)}
              eventHandlers={{
                click: () => {
                  setActiveHubId(isSelected ? null : hub.id);
                  if (onSelectBranch) onSelectBranch(hub.id);
                },
              }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <Text strong style={{ fontSize: 13, display: "block" }}>
                    {hub.name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {hub.city} Hub
                  </Text>
                  <div style={{ marginTop: 6 }}>
                    <Tag color={hub.isHQ ? "red" : hub.isTransit ? "orange" : "blue"}>
                      {hub.isHQ ? "Central HQ" : hub.isTransit ? "Transit Gateway" : "Branch Terminal"}
                    </Tag>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    <span>Staging Load: </span>
                    <strong style={{ color: "#1677ff" }}>{hub.parcels} parcels</strong>
                  </div>
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    style={{ marginTop: 8, width: "100%" }}
                    onClick={() => setActiveHubId(hub.id)}
                  >
                    View Connected Hubs
                  </Button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

