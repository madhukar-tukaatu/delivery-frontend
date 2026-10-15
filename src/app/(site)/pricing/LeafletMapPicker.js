"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

/* Sync map view when coords change from search */
function MapSync({ coords }) {
  const map = useMap();
  useEffect(() => {
    map.setView([coords.lat, coords.lng], map.getZoom());
  }, [coords.lat, coords.lng]); // eslint-disable-line
  return null;
}

/* Click handler */
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/* Map resize & invalidation handler */
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 260);
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);
  return null;
}

export default function LeafletMapPicker({ coords, onMapClick }) {
  return (
    <MapContainer
      center={[coords.lat, coords.lng]}
      zoom={13}
      className="map-container"
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      <MapSync coords={coords} />
      <MapResizeHandler />
      <ClickHandler onMapClick={onMapClick} />
      <Marker
        position={[coords.lat, coords.lng]}
        draggable
        eventHandlers={{
          dragend(e) {
            const { lat, lng } = e.target.getLatLng();
            onMapClick(lat, lng);
          },
        }}
      />
    </MapContainer>
  );
}
