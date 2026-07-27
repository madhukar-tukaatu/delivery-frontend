"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function FitRouteBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (!positions.length) return;

    if (positions.length === 1) {
      map.setView(positions[0], 11, { animate: true });
      return;
    }

    map.fitBounds(L.latLngBounds(positions), {
      padding: [38, 38],
      maxZoom: 11,
      animate: true,
    });
  }, [map, positions]);

  return null;
}

function markerIcon(index, total) {
  const isStart = index === 0;
  const isEnd = index === total - 1;
  const label = isStart ? "S" : isEnd ? "D" : String(index);
  const className = isStart ? "route-marker route-marker-start" : isEnd ? "route-marker route-marker-end" : "route-marker";

  return L.divIcon({
    className: "route-marker-shell",
    html: `<div class="${className}">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

export default function RouteMapClient({ nodes = [], height = 420, selectedLabel }) {
  const positions = useMemo(
    () => nodes.map((node) => [Number(node.latitude), Number(node.longitude)]),
    [nodes],
  );

  return (
    <>
      <style jsx global>{`
        .route-marker-shell { background: transparent; border: 0; }
        .route-marker {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border: 3px solid #ffffff;
          border-radius: 999px;
          background: #4f46e5;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 6px 18px rgba(16, 24, 40, 0.28);
        }
        .route-marker-start { background: #039855; }
        .route-marker-end { background: #d92d20; }
        .leaflet-container { font-family: inherit; }
      `}</style>

      <MapContainer
        center={positions[0] ?? [28.3949, 84.124]}
        zoom={7}
        scrollWheelZoom
        style={{ height, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitRouteBounds positions={positions} />

        {positions.length > 1 ? (
          <Polyline
            positions={positions}
            pathOptions={{ color: "#4f46e5", weight: 5, opacity: 0.85, dashArray: "10 8" }}
          />
        ) : null}

        {nodes.map((node, index) => (
          <Marker
            key={`${node.id ?? node.name ?? index}-${index}`}
            position={positions[index]}
            icon={markerIcon(index, nodes.length)}
          >
            <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
              {index + 1}. {node.name ?? `Branch ${node.id}`}
            </Tooltip>
            <Popup>
              <strong>{node.name ?? `Branch ${node.id}`}</strong>
              <br />
              {node.code ? `Code: ${node.code}` : null}
              {node.code ? <br /> : null}
              {selectedLabel ? selectedLabel : "Configured branch route"}
              <br />
              {Number(node.latitude).toFixed(5)}, {Number(node.longitude).toFixed(5)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
