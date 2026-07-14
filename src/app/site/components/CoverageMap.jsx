"use client";

import { useMemo, useEffect, useRef } from "react";
import { MapContainer, Marker, TileLayer, Polyline, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

const HUB_ROUTES = [
  ["Kathmandu", "Lalitpur"],
  ["Kathmandu", "Bhaktapur"],
  ["Kathmandu", "Pokhara"],
  ["Kathmandu", "Chitwan"],
  ["Kathmandu", "Biratnagar"],
  ["Pokhara", "Butwal"],
  ["Chitwan", "Butwal"],
  ["Butwal", "Nepalgunj"]
];

function createHubIcon(name) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 10px;
        height: 10px;
        background: #F4B740;
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 0 8px #F4B740;
      "></div>
      <div style="
        font-family: Inter, sans-serif;
        font-size: 9px;
        font-weight: 800;
        color: #FFFFFF;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 1px 4px;
        border-radius: 3px;
        white-space: nowrap;
        margin-top: 3px;
        transform: translateX(-40%);
        backdrop-filter: blur(4px);
      ">${name}</div>
    `,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });
}

// Map click handler to zoom in on click and reset after 2 seconds
function MapClickHandler() {
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

      // Reset the map view after 2 seconds (2000 ms)
      timeoutRef.current = setTimeout(() => {
        map.setView([28.0, 84.2], 7, { animate: true });
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

export default function CoverageMap() {
  const routeLines = useMemo(() => {
    return HUB_ROUTES.map(([from, to]) => {
      const fromLatLng = CITY_COORDS[from];
      const toLatLng = CITY_COORDS[to];
      return [fromLatLng, toLatLng];
    });
  }, []);

  return (
    <div style={{ width: "100%", height: "380px", borderRadius: "24px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.08)", position: "relative" }}>
      <MapContainer
        center={[28.0, 84.2]}
        zoom={7}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "#0C1420" }}
      >
        <TileLayer
          url="https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {routeLines.map((line, i) => (
          <Polyline
            key={i}
            positions={line}
            pathOptions={{
              color: "#2A6FDB",
              weight: 2,
              dashArray: "4, 6",
              opacity: 0.6
            }}
          />
        ))}

        {Object.entries(CITY_COORDS).map(([name, latlng]) => (
          <Marker key={name} position={latlng} icon={createHubIcon(name)}>
            <Popup>
              <strong>{name} Hub</strong>
              <br />
              Tukaatu Express courier operations active.
            </Popup>
          </Marker>
        ))}

        <MapClickHandler />
      </MapContainer>
    </div>
  );
}
