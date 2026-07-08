"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

function createPinIcon({ color, label }) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        background: ${color};
        transform: rotate(-45deg);
        border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.28);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          font-family: Arial, sans-serif;
          line-height: 1;
        ">
          ${label}
        </span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

const ICONS = {
  merchant: createPinIcon({
    color: "#16a34a",
    label: "M",
  }),
  branch: createPinIcon({
    color: "#2563eb",
    label: "B",
  }),
  sub_branch: createPinIcon({
    color: "#f59e0b",
    label: "S",
  }),
  assigned_branch: createPinIcon({
    color: "#1d4ed8",
    label: "AB",
  }),
  assigned_sub_branch: createPinIcon({
    color: "#d97706",
    label: "AS",
  }),
};

const LINE_OPTIONS = {
  color: "#2563eb",
  weight: 4,
  opacity: 0.75,
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasPoint(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng);
}

function formatLocation(item) {
  if (!item) return "-";

  return [item.name, item.area, item.city].filter(Boolean).join(", ") || "-";
}

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    const validPoints = points.filter(hasPoint);

    if (validPoints.length === 1) {
      map.setView([validPoints[0].lat, validPoints[0].lng], 14);
    }

    if (validPoints.length > 1) {
      const bounds = L.latLngBounds(
        validPoints.map((point) => [point.lat, point.lng])
      );

      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 15,
      });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  }, [map, points]);

  return null;
}

function MapLegend() {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 1000,
        background: "#ffffff",
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow: "0 6px 18px rgba(0,0,0,0.16)",
        fontSize: 12,
        minWidth: 160,
      }}
    >
      <LegendItem color="#16a34a" label="Merchant / Pickup" />
      <LegendItem color="#2563eb" label="Suggested Branch" />
      <LegendItem color="#f59e0b" label="Suggested Sub-Branch" />
      <LegendItem color="#1d4ed8" label="Assigned Branch" />
      <LegendItem color="#d97706" label="Assigned Sub-Branch" />
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 5,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

export default function MerchantApplicationMap({ merchant }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  const points = useMemo(() => {
    const pickupLat =
      toNumber(merchant?.pickup_location?.latitude) ||
      toNumber(merchant?.pickup_lat);

    const pickupLng =
      toNumber(merchant?.pickup_location?.longitude) ||
      toNumber(merchant?.pickup_lng);

    const suggestedBranch = merchant?.suggested_branch;
    const suggestedSubBranch = merchant?.suggested_sub_branch;
    const assignedBranch = merchant?.default_branch;
    const assignedSubBranch = merchant?.default_sub_branch;

    return [
      {
        key: "merchant_pickup",
        type: "merchant",
        title: "Merchant / Pickup Location",
        lat: pickupLat,
        lng: pickupLng,
        popup:
          merchant?.pickup_location?.address ||
          merchant?.pickup_address ||
          merchant?.address ||
          merchant?.name ||
          "Merchant pickup location",
      },
      {
        key: "suggested_branch",
        type: "branch",
        title: `Suggested Branch: ${suggestedBranch?.name || "-"}`,
        lat: toNumber(suggestedBranch?.latitude),
        lng: toNumber(suggestedBranch?.longitude),
        popup: formatLocation(suggestedBranch),
      },
      {
        key: "suggested_sub_branch",
        type: "sub_branch",
        title: `Suggested Sub-Branch: ${suggestedSubBranch?.name || "-"}`,
        lat: toNumber(suggestedSubBranch?.latitude),
        lng: toNumber(suggestedSubBranch?.longitude),
        popup: formatLocation(suggestedSubBranch),
      },
      {
        key: "assigned_branch",
        type: "assigned_branch",
        title: `Assigned Branch: ${assignedBranch?.name || "-"}`,
        lat: toNumber(assignedBranch?.latitude),
        lng: toNumber(assignedBranch?.longitude),
        popup: formatLocation(assignedBranch),
      },
      {
        key: "assigned_sub_branch",
        type: "assigned_sub_branch",
        title: `Assigned Sub-Branch: ${assignedSubBranch?.name || "-"}`,
        lat: toNumber(assignedSubBranch?.latitude),
        lng: toNumber(assignedSubBranch?.longitude),
        popup: formatLocation(assignedSubBranch),
      },
    ].filter(hasPoint);
  }, [merchant]);

  const fallbackCenter = points.length
    ? [points[0].lat, points[0].lng]
    : [27.7172, 85.324];

  const merchantPoint = points.find((point) => point.key === "merchant_pickup");

  const activeSubBranch =
    points.find((point) => point.key === "assigned_sub_branch") ||
    points.find((point) => point.key === "suggested_sub_branch");

  const activeBranch =
    points.find((point) => point.key === "assigned_branch") ||
    points.find((point) => point.key === "suggested_branch");

  const linePoints = [
    merchantPoint ? [merchantPoint.lat, merchantPoint.lng] : null,
    activeSubBranch ? [activeSubBranch.lat, activeSubBranch.lng] : null,
    activeBranch ? [activeBranch.lat, activeBranch.lng] : null,
  ].filter(Boolean);

  const mapKey = [
    merchant?.id || "merchant",
    merchantPoint?.lat || "no-merchant-lat",
    merchantPoint?.lng || "no-merchant-lng",
    activeSubBranch?.lat || "no-sub-lat",
    activeSubBranch?.lng || "no-sub-lng",
    activeBranch?.lat || "no-branch-lat",
    activeBranch?.lng || "no-branch-lng",
  ].join("-");

  if (!mounted) {
    return (
      <div
        style={{
          height: 380,
          width: "100%",
          borderRadius: 12,
          background: "#f5f5f5",
        }}
      />
    );
  }

  return (
    <div
      style={{
        height: 380,
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <MapContainer
        key={mapKey}
        center={fallbackCenter}
        zoom={13}
        scrollWheelZoom={false}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds points={points} />

        {points.map((point) => (
          <Marker
            key={point.key}
            position={[point.lat, point.lng]}
            icon={ICONS[point.type] || ICONS.branch}
          >
            <Popup>
              <strong>{point.title}</strong>
              <br />
              {point.popup || "-"}
              <br />
              <small>
                {point.lat}, {point.lng}
              </small>
            </Popup>
          </Marker>
        ))}

        {linePoints.length >= 2 && (
          <Polyline positions={linePoints} pathOptions={LINE_OPTIONS} />
        )}
      </MapContainer>

      <MapLegend />
    </div>
  );
}