"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NEPAL_CENTER = [27.7172, 85.324];
const DEFAULT_ZOOM = 12;
const OSRM = "https://router.project-osrm.org/route/v1/driving";

function makePin(color, label) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid #fff;
      box-shadow:0 3px 10px rgba(0,0,0,.35);
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
    ">
      <span style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:13px">${label}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

const PICKUP_ICON = makePin("#52c41a", "P");
const DELIVERY_ICON = makePin("#ff4d4f", "D");

function ClickHandler({ activePin, onPick }) {
  useMapEvents({
    click(e) {
      if (!activePin) return;
      onPick(activePin, e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBounds({ coords }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (coords.length < 2) return;
    const key = JSON.stringify(coords);
    if (key === prev.current) return;
    prev.current = key;
    const bounds = L.latLngBounds(coords);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });
  }, [coords, map]);
  return null;
}

export default function PricingPinMap({
  pickup,
  delivery,
  activePin,
  onPick,
  roadLine,
  height = 420,
}) {
  const pickupPos = pickup?.lat && pickup?.lng ? [pickup.lat, pickup.lng] : null;
  const deliveryPos = delivery?.lat && delivery?.lng ? [delivery.lat, delivery.lng] : null;

  const fitCoords = [pickupPos, deliveryPos].filter(Boolean);

  const cursor = activePin ? "crosshair" : "grab";

  return (
    <div style={{ position: "relative", height, borderRadius: 12, overflow: "hidden" }}>
      <MapContainer
        center={pickupPos || deliveryPos || NEPAL_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: "100%", height: "100%", cursor }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler activePin={activePin} onPick={onPick} />
        <FitBounds coords={fitCoords} />

        {/* Road polyline */}
        {roadLine?.length >= 2 && (
          <>
            <Polyline positions={roadLine} pathOptions={{ color: "#fff", weight: 8, opacity: 0.6 }} />
            <Polyline positions={roadLine} pathOptions={{ color: "#1677ff", weight: 4, opacity: 0.95 }} />
          </>
        )}

        {/* Straight fallback line */}
        {!roadLine?.length && pickupPos && deliveryPos && (
          <Polyline
            positions={[pickupPos, deliveryPos]}
            pathOptions={{ color: "#1677ff", weight: 3, opacity: 0.5, dashArray: "8 6" }}
          />
        )}

        {pickupPos && (
          <Marker position={pickupPos} icon={PICKUP_ICON}>
            <Popup>
              <strong>Pickup</strong>
              <br />
              {pickup.address || "Pinned location"}
              <br />
              <span style={{ fontSize: 11, color: "#666" }}>
                {pickup.lat.toFixed(6)}, {pickup.lng.toFixed(6)}
              </span>
            </Popup>
          </Marker>
        )}

        {deliveryPos && (
          <Marker position={deliveryPos} icon={DELIVERY_ICON}>
            <Popup>
              <strong>Delivery</strong>
              <br />
              {delivery.address || "Pinned location"}
              <br />
              <span style={{ fontSize: 11, color: "#666" }}>
                {delivery.lat.toFixed(6)}, {delivery.lng.toFixed(6)}
              </span>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Active pin hint */}
      {activePin && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: activePin === "pickup" ? "#52c41a" : "#ff4d4f",
            color: "#fff",
            padding: "6px 16px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 2px 10px rgba(0,0,0,.25)",
            pointerEvents: "none",
          }}
        >
          Click map to pin {activePin === "pickup" ? "Pickup" : "Delivery"} location
        </div>
      )}
    </div>
  );
}
