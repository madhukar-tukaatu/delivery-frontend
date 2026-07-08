"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Button, Input, Space, Typography } from "antd";

const { Text } = Typography;

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function MapCenterUpdater({ latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    const lat = toNumber(latitude);
    const lng = toNumber(longitude);

    if (lat !== null && lng !== null) {
      map.setView([lat, lng], Math.max(map.getZoom(), 14));
      setTimeout(() => map.invalidateSize(), 150);
    }
  }, [latitude, longitude, map]);

  return null;
}

function ClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      const lat = Number(event.latlng.lat.toFixed(7));
      const lng = Number(event.latlng.lng.toFixed(7));

      onChange?.({
        latitude: lat,
        longitude: lng,
      });
    },
  });

  return null;
}

export default function BranchCoordinatePicker({
  latitude,
  longitude,
  onChange,
  height = 360,
}) {
  const [mounted, setMounted] = useState(false);

  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  const center = useMemo(() => {
    if (lat !== null && lng !== null) {
      return [lat, lng];
    }

    return [27.7172, 85.324];
  }, [lat, lng]);

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  const handleManualChange = (field, value) => {
    const nextLatitude = field === "latitude" ? value : latitude;
    const nextLongitude = field === "longitude" ? value : longitude;

    onChange?.({
      latitude: nextLatitude,
      longitude: nextLongitude,
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      onChange?.({
        latitude: Number(position.coords.latitude.toFixed(7)),
        longitude: Number(position.coords.longitude.toFixed(7)),
      });
    });
  };

  if (!mounted) {
    return (
      <div
        style={{
          height,
          width: "100%",
          borderRadius: 12,
          background: "#f5f5f5",
        }}
      />
    );
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space wrap style={{ width: "100%" }}>
        <Input
          style={{ width: 180 }}
          placeholder="Latitude"
          value={latitude ?? ""}
          onChange={(event) =>
            handleManualChange("latitude", event.target.value)
          }
        />

        <Input
          style={{ width: 180 }}
          placeholder="Longitude"
          value={longitude ?? ""}
          onChange={(event) =>
            handleManualChange("longitude", event.target.value)
          }
        />

        <Button onClick={useCurrentLocation}>Use Current Location</Button>

        <Text type="secondary">
          Click on the map to set branch coordinates.
        </Text>
      </Space>

      <div
        style={{
          height,
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #f0f0f0",
        }}
      >
        <MapContainer
          center={center}
          zoom={lat !== null && lng !== null ? 14 : 12}
          scrollWheelZoom
          style={{
            height: "100%",
            width: "100%",
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapCenterUpdater latitude={latitude} longitude={longitude} />
          <ClickHandler onChange={onChange} />

          {lat !== null && lng !== null && (
            <Marker position={[lat, lng]} icon={markerIcon}>
              <Popup>
                <strong>Branch Location</strong>
                <br />
                {lat}, {lng}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </Space>
  );
}