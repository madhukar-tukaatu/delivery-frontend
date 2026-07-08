'use client';

import { useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { merchantIcon, branchIcon, subBranchIcon, hubIcon } from './mapIcons';

function parseLatLng(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [latitude, longitude];
}

function FitToMarkers({ points }) {
  const map = require('react-leaflet').useMap();

  useMemo(() => {
    const validPoints = points.filter(Boolean);
    if (!validPoints.length) return;

    if (validPoints.length === 1) {
      map.setView(validPoints[0], 14);
      return;
    }

    const bounds = L.latLngBounds(validPoints);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

export default function MerchantBranchAllocationMap({
  merchant,
  branch,
  subBranch,
  hub,
}) {
  const merchantPoint = parseLatLng(
    merchant?.pickup_lat || merchant?.latitude,
    merchant?.pickup_lng || merchant?.longitude
  );

  const branchPoint = parseLatLng(branch?.latitude, branch?.longitude);
  const subBranchPoint = parseLatLng(subBranch?.latitude, subBranch?.longitude);
  const hubPoint = parseLatLng(hub?.latitude, hub?.longitude);

  const allPoints = [merchantPoint, branchPoint, subBranchPoint, hubPoint].filter(Boolean);

  const routeLine = [
    merchantPoint,
    subBranchPoint || branchPoint,
    branchPoint,
  ].filter(Boolean);

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer
        center={merchantPoint || [27.7172, 85.3240]}
        zoom={13}
        style={{ height: 380, width: '100%', borderRadius: 12 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitToMarkers points={allPoints} />

        {merchantPoint && (
          <Marker position={merchantPoint} icon={merchantIcon}>
            <Popup>
              <div>
                <strong>Merchant / Pickup</strong><br />
                {merchant?.name || merchant?.business_name || 'Merchant'}<br />
                {merchant?.pickup_address || merchant?.address || '-'}
              </div>
            </Popup>
          </Marker>
        )}

        {branchPoint && (
          <Marker position={branchPoint} icon={branchIcon}>
            <Popup>
              <div>
                <strong>Branch</strong><br />
                {branch?.name}<br />
                {branch?.city || ''}
              </div>
            </Popup>
          </Marker>
        )}

        {subBranchPoint && (
          <Marker position={subBranchPoint} icon={subBranchIcon}>
            <Popup>
              <div>
                <strong>Sub-Branch</strong><br />
                {subBranch?.name}<br />
                {subBranch?.area || subBranch?.city || ''}
              </div>
            </Popup>
          </Marker>
        )}

        {hubPoint && (
          <Marker position={hubPoint} icon={hubIcon}>
            <Popup>
              <div>
                <strong>Main Hub</strong><br />
                {hub?.name}<br />
                {hub?.city || ''}
              </div>
            </Popup>
          </Marker>
        )}

        {routeLine.length >= 2 && (
          <Polyline
            positions={routeLine}
            pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.75 }}
          />
        )}
      </MapContainer>

      <div
        className="map-legend"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1000,
          minWidth: 150,
        }}
      >
        <div className="map-legend-item">
          <span className="map-legend-dot merchant" />
          <span>Merchant</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot branch" />
          <span>Branch</span>
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot subbranch" />
          <span>Sub-Branch</span>
        </div>
        {hub && (
          <div className="map-legend-item">
            <span className="map-legend-dot hub" />
            <span>Main Hub</span>
          </div>
        )}
      </div>
    </div>
  );
}