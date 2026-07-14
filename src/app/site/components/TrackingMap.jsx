"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Nepal coordinates dictionary
const CITY_COORDS = {
  "Kathmandu": [27.7172, 85.3240],
  "Lalitpur": [27.6710, 85.3240],
  "Bhaktapur": [27.6710, 85.4298],
  "Pokhara": [28.2096, 83.9856],
  "Chitwan": [27.6833, 84.4333],
  "Butwal": [27.7006, 83.4484],
  "Nepalgunj": [28.0500, 81.6167],
  "Biratnagar": [26.4525, 87.2718]
};

// Custom markup markers using L.divIcon
function createMarkerIcon(label, color) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background: ${color};
        border: 2.5px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 0 10px ${color};
        transform: translate(-1px, -1px);
      "></div>
      <div style="
        font-family: Inter, sans-serif;
        font-size: 10px;
        font-weight: 800;
        color: #1E293B;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(20, 22, 28, 0.12);
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
        margin-top: 4px;
        transform: translateX(-40%);
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      ">${label}</div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

// Map bounds updater to automatically zoom and center to fit the points
function MapBoundsUpdater({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points && points.length > 0) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [50, 50] });
        // Force refresh size to avoid rendering issues inside sliders
        setTimeout(() => map.invalidateSize(), 150);
      } catch (err) {
        console.error("Map fitBounds failed:", err);
      }
    }
  }, [points, map]);

  return null;
}

// Map click handler to zoom in on click and reset after 2 seconds
function MapClickHandler({ points }) {
  const map = useMap();
  const timeoutRef = useRef(null);

  useMapEvents({
    click(e) {
      // Zoom in to the clicked location
      map.setView(e.latlng, map.getZoom() + 2, { animate: true });

      // Clear any existing reset timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Reset the map bounds after 2 seconds (2000 ms)
      timeoutRef.current = setTimeout(() => {
        if (points && points.length > 0) {
          const bounds = L.latLngBounds(points);
          map.fitBounds(bounds, { padding: [50, 50], animate: true });
        }
      }, 2000);
    }
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return null;
}

export default function TrackingMap({ fromCity = "Bhaktapur", toCity = "Lalitpur" }) {
  const fromLatLng = CITY_COORDS[fromCity] || CITY_COORDS["Bhaktapur"];
  const toLatLng = CITY_COORDS[toCity] || CITY_COORDS["Lalitpur"];

  const points = useMemo(() => [fromLatLng, toLatLng], [fromLatLng, toLatLng]);

  const fromIcon = useMemo(() => createMarkerIcon(fromCity, "#2A6FDB"), [fromCity]);
  const toIcon = useMemo(() => createMarkerIcon(toCity, "#F4B740"), [toCity]);

  const bounds = useMemo(() => L.latLngBounds(points), [points]);

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0, zIndex: 1 }}>
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [50, 50] }}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: "#FFFFFF", opacity: 0.75 }}
      >
        {/* Light-themed Map Tiles */}
        <TileLayer
          url="https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Path line between cities */}
        <Polyline
          positions={points}
          pathOptions={{
            color: "#2A6FDB",
            weight: 3.5,
            dashArray: "6, 8",
            opacity: 0.85
          }}
        />

        <Marker position={fromLatLng} icon={fromIcon} />
        <Marker position={toLatLng} icon={toIcon} />

        <MapBoundsUpdater points={points} />
        <MapClickHandler points={points} />
      </MapContainer>
    </div>
  );
}
