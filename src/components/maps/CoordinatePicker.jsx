"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function MapClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      onChange?.({
        latitude: Number(event.latlng.lat.toFixed(7)),
        longitude: Number(event.latlng.lng.toFixed(7)),
      });
    },
  });

  return null;
}

function MapRecenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 14);
      setTimeout(() => map.invalidateSize(), 150);
    }
  }, [map, position]);

  return null;
}

export default function BranchCoordinatePicker({ latitude, longitude, onChange, height = 340 }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const position = useMemo(() => {
    const lat = toNumber(latitude);
    const lng = toNumber(longitude);

    if (lat === null || lng === null) return null;
    return [lat, lng];
  }, [latitude, longitude]);

  const center = position || [27.7172, 85.324];
  const mapKey = position ? `${position[0]}-${position[1]}` : "branch-picker-default";

  if (!mounted) {
    return <div style={{ height, width: "100%", borderRadius: 12, background: "#f5f5f5" }} />;
  }

  return (
    <div style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }}>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={position ? 14 : 12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onChange={onChange} />
        <MapRecenter position={position} />

        {position && (
          <Marker position={position} icon={markerIcon}>
            <Popup>
              Branch location<br />
              {position[0]}, {position[1]}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
