"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Key Kathmandu Valley Delivery Corridors & Real Road Waypoints
const ROUTE_WAYPOINTS = {
  "Bhaktapur-Lalitpur": [
    [27.6710, 85.4298], // Bhaktapur Hub
    [27.6735, 85.3980], // Thimi Junction
    [27.6755, 85.3520], // Koteshwor Highway
    [27.6685, 85.3360], // Gwarko Ring Road
    [27.6710, 85.3240]  // Lalitpur Destination
  ],
  "Kathmandu-Pokhara": [
    [27.7172, 85.3240], // Kathmandu Hub
    [27.7800, 85.2000], // Naubise Pass
    [27.8700, 84.8000], // Mugling Highway
    [28.1000, 84.4000], // Damauli
    [28.2096, 83.9856]  // Pokhara Hub
  ]
};

// Calculate bearing angle (rotation degree) between two LatLng coordinates
function getBearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const lat1Rad = lat1 * (Math.PI / 180);
  const lat2Rad = lat2 * (Math.PI / 180);

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  let brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}

// Create realistic Hub / Destination pin icon
function createHubPinIcon(label, color, isOrigin = false) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 900;
          color: #071722;
          background: #FFFFFF;
          border: 2px solid ${color};
          padding: 3px 8px;
          border-radius: 8px;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 3px;
        ">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${color};"></span>
          <span>${label} ${isOrigin ? '(Hub)' : '(Delivery)'}</span>
        </div>
        <div style="
          width: 12px;
          height: 12px;
          background: ${color};
          border: 2.5px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 10px ${color};
        "></div>
      </div>
    `,
    iconSize: [110, 36],
    iconAnchor: [55, 36]
  });
}

// Create Realistic Top-Down Delivery Rider Marker (Uber Eats / Deliveroo Style)
function createBikeRiderIcon() {
  return L.divIcon({
    className: "bike-rider-marker",
    html: `
      <div style="
        position: relative; 
        width: 52px; 
        height: 52px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
      ">
        <!-- Live GPS Pulse Radar Ring -->
        <div style="
          position: absolute;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(2, 113, 150, 0.18);
          border: 2px solid #027196;
          animation: realBikePulse 2s infinite ease-out;
        "></div>

        <!-- Inner Rotating Realistic Delivery Motorcycle Container -->
        <div id="bike-icon-inner" style="
          position: relative;
          z-index: 5;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 6px 12px rgba(7, 23, 34, 0.45));
          transform: rotate(0deg);
          transition: transform 0.25s ease-out;
        ">
          <!-- Forward Headlight Beam Cone Glow -->
          <div style="
            position: absolute;
            top: -12px;
            width: 0;
            height: 0;
            border-left: 12px solid transparent;
            border-right: 12px solid transparent;
            border-bottom: 22px solid rgba(255, 208, 38, 0.65);
            filter: blur(2px);
            pointer-events: none;
          "></div>

          <!-- Realistic Top-Down Delivery Scooter SVG Graphic -->
          <svg width="44" height="44" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Front Wheel & Mudguard -->
            <rect x="29" y="4" width="6" height="12" rx="3" fill="#1E293B" stroke="#FFD026" stroke-width="1.5"/>
            <rect x="26" y="10" width="12" height="3" rx="1.5" fill="#027196"/>
            
            <!-- Side Mirrors & Handlebars -->
            <path d="M17 17L27 13M47 17L37 13" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="16" cy="17" r="2.5" fill="#FFD026"/>
            <circle cx="48" cy="17" r="2.5" fill="#FFD026"/>

            <!-- Motorcycle Main Chassis Body -->
            <path d="M25 14C25 14 23 24 23 32C23 40 25 48 25 48H39C39 48 41 40 41 32C41 24 39 14 39 14H25Z" fill="#027196" stroke="#071722" stroke-width="2"/>
            
            <!-- Rider Helmet (Top-Down View) -->
            <circle cx="32" cy="24" r="7.5" fill="#071722" stroke="#FFD026" stroke-width="2"/>
            <!-- Helmet Blue Tint Visor -->
            <path d="M27 22C27 22 30 20 32 20C34 20 37 22 37 22" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>

            <!-- Tukaatu Express Courier Cargo Box -->
            <rect x="21" y="34" width="22" height="16" rx="4" fill="#FFD026" stroke="#071722" stroke-width="2"/>
            <rect x="24" y="37" width="16" height="10" rx="2" fill="#027196"/>
            <path d="M29 42L32 39L35 42" stroke="#FFD026" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- Rear Wheel -->
            <rect x="29" y="48" width="6" height="12" rx="3" fill="#1E293B" stroke="#FFD026" stroke-width="1.5"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26]
  });
}

// Native Leaflet High-Performance 60FPS Rider Component (Zero React Re-renders / Zero Shaking)
function NativeBikeRider({ waypoints }) {
  const map = useMap();
  const markerRef = useRef(null);
  const trailPolylineRef = useRef(null);

  useEffect(() => {
    if (!map || !waypoints || waypoints.length < 2) return;

    // Create persistent native Leaflet bike marker
    const bikeIcon = createBikeRiderIcon();
    const bikeMarker = L.marker(waypoints[0], { icon: bikeIcon, zIndexOffset: 2000 }).addTo(map);
    markerRef.current = bikeMarker;

    // Create persistent native Leaflet completed trail line
    const trailLine = L.polyline([waypoints[0]], {
      color: "#10B981",
      weight: 4.5,
      opacity: 0.95
    }).addTo(map);
    trailPolylineRef.current = trailLine;

    let segmentIndex = 0;
    let progress = 0;
    const speed = 0.003; // Smooth step size
    let animationFrameId;

    const animate = () => {
      const p1 = waypoints[segmentIndex];
      const p2 = waypoints[segmentIndex + 1];

      if (p1 && p2) {
        progress += speed;
        if (progress >= 1) {
          progress = 0;
          segmentIndex = segmentIndex + 1;
          if (segmentIndex >= waypoints.length - 1) {
            segmentIndex = 0;
          }
        }

        // Smooth linear interpolation of coordinates
        const lat = p1[0] + (p2[0] - p1[0]) * progress;
        const lng = p1[1] + (p2[1] - p1[1]) * progress;
        const currentPos = [lat, lng];

        // 1. Move native Leaflet marker cleanly
        bikeMarker.setLatLng(currentPos);

        // 2. Smoothly rotate inner icon DOM element without re-creating DOM
        const markerElement = bikeMarker.getElement();
        if (markerElement) {
          const innerEl = markerElement.querySelector("#bike-icon-inner");
          if (innerEl) {
            const bearing = getBearing(p1[0], p1[1], p2[0], p2[1]);
            innerEl.style.transform = `rotate(${bearing}deg)`;
          }
        }

        // 3. Update completed green trail line along the exact route path
        const currentTrail = [...waypoints.slice(0, segmentIndex + 1), currentPos];
        trailLine.setLatLngs(currentTrail);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (bikeMarker) map.removeLayer(bikeMarker);
      if (trailLine) map.removeLayer(trailLine);
    };
  }, [map, waypoints]);

  return null;
}

// Map bounds updater
function MapBoundsUpdater({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points && points.length > 0) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [45, 45] });
        setTimeout(() => map.invalidateSize(), 150);
      } catch (err) {
        console.error("Map fitBounds failed:", err);
      }
    }
  }, [points, map]);

  return null;
}

export default function TrackingMap({ fromCity = "Bhaktapur", toCity = "Lalitpur" }) {
  const routeKey = `${fromCity}-${toCity}`;
  const waypoints = ROUTE_WAYPOINTS[routeKey] || [
    [27.6710, 85.4298],
    [27.6735, 85.3980],
    [27.6755, 85.3520],
    [27.6710, 85.3240]
  ];

  const fromLatLng = waypoints[0];
  const toLatLng = waypoints[waypoints.length - 1];

  const fromIcon = useMemo(() => createHubPinIcon(fromCity, "#027196", true), [fromCity]);
  const toIcon = useMemo(() => createHubPinIcon(toCity, "#FFD026", false), [toCity]);

  const bounds = useMemo(() => L.latLngBounds(waypoints), [waypoints]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", isolation: "isolate", borderRadius: "18px", overflow: "hidden" }}>
      <style>{`
        @keyframes realBikePulse {
          0% { transform: scale(0.8); opacity: 0.9; }
          70% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [45, 45] }}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%", background: "#F1F5F9" }}
      >
        <TileLayer
          url="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        {/* Full Planned Route (Dashed Guide Line) */}
        <Polyline
          positions={waypoints}
          pathOptions={{
            color: "#64748B",
            weight: 3.5,
            dashArray: "6, 8",
            opacity: 0.5
          }}
        />

        <Marker position={fromLatLng} icon={fromIcon} />
        <Marker position={toLatLng} icon={toIcon} />

        {/* Native 60FPS Butter Smooth Bike Rider (Zero React Re-renders / Zero Shaking) */}
        <NativeBikeRider waypoints={waypoints} />

        <MapBoundsUpdater points={waypoints} />
      </MapContainer>
    </div>
  );
}
