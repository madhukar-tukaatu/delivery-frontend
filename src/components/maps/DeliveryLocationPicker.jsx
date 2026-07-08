"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Input, Space, Typography, message } from "antd";
import { EnvironmentOutlined, SearchOutlined } from "@ant-design/icons";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

const { Text } = Typography;

const deliveryIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const pickupIcon = new L.Icon({
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

function extractLocation(place) {
  const address = place?.address || {};

  return {
    address: place?.display_name || "",
    city: address.city || address.town || address.municipality || address.village || address.county || "",
    area: address.suburb || address.neighbourhood || address.quarter || address.city_district || address.road || "",
  };
}

async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
    if (!response.ok) return {};
    return extractLocation(await response.json());
  } catch {
    return {};
  }
}

async function searchAddress(query) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Address search failed.");

  const rows = await response.json();
  if (!rows?.length) throw new Error("No location found.");

  const first = rows[0];

  return {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    ...extractLocation(first),
  };
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    async click(event) {
      const latitude = Number(event.latlng.lat.toFixed(6));
      const longitude = Number(event.latlng.lng.toFixed(6));
      const address = await reverseGeocode(latitude, longitude);
      onPick({ latitude, longitude, ...address });
    },
  });

  return null;
}

function MapUpdater({ latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.setView([latitude, longitude], 15);
    }

    setTimeout(() => map.invalidateSize(), 150);
  }, [latitude, longitude, map]);

  return null;
}

export default function DeliveryLocationPicker({ value, pickupLocation, onChange }) {
  const [mounted, setMounted] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => setMounted(true), []);

  const latitude = toNumber(value?.latitude);
  const longitude = toNumber(value?.longitude);
  const pickupLatitude = toNumber(pickupLocation?.latitude);
  const pickupLongitude = toNumber(pickupLocation?.longitude);

  const center = useMemo(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return [latitude, longitude];
    if (Number.isFinite(pickupLatitude) && Number.isFinite(pickupLongitude)) return [pickupLatitude, pickupLongitude];
    return [27.7172, 85.324];
  }, [latitude, longitude, pickupLatitude, pickupLongitude]);

  async function handleSearch() {
    if (!searchText.trim()) {
      message.warning("Enter address or place name to search.");
      return;
    }

    try {
      setSearching(true);
      const location = await searchAddress(searchText.trim());
      onChange?.(location);
      message.success("Delivery location selected.");
    } catch (error) {
      message.error(error?.message || "Could not search location.");
    } finally {
      setSearching(false);
    }
  }

  if (!mounted) {
    return <div style={{ height: 360, borderRadius: 12, background: "#f5f5f5" }} />;
  }

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Select delivery location"
        description="The map is centered around the selected merchant pickup location. Search an address or click on the map to choose the customer delivery coordinates."
      />

      <Space.Compact style={{ width: "100%" }}>
        <Input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search address, area, landmark, city..."
          onPressEnter={handleSearch}
        />
        <Button icon={<SearchOutlined />} loading={searching} onClick={handleSearch}>Search</Button>
      </Space.Compact>

      <div style={{ height: 360, width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <MapContainer
          key={`delivery-location-picker-map-${pickupLocation?.id || "default"}`}
          center={center}
          zoom={14}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onPick={(location) => {
            onChange?.(location);
            message.success("Delivery location selected from map.");
          }} />
          <MapUpdater latitude={latitude} longitude={longitude} />

          {Number.isFinite(pickupLatitude) && Number.isFinite(pickupLongitude) && (
            <Marker position={[pickupLatitude, pickupLongitude]} icon={pickupIcon}>
              <Popup>
                <strong>Merchant Pickup Location</strong><br />
                {pickupLocation?.name || "Merchant pickup"}<br />
                {pickupLocation?.address || "-"}<br />
                {pickupLatitude}, {pickupLongitude}
              </Popup>
            </Marker>
          )}

          {Number.isFinite(latitude) && Number.isFinite(longitude) && (
            <Marker position={[latitude, longitude]} icon={deliveryIcon}>
              <Popup>
                <strong>Customer Delivery Location</strong><br />
                {value?.address || "Selected location"}<br />
                {latitude}, {longitude}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <Space wrap>
        <Text><EnvironmentOutlined /> Selected delivery:</Text>
        {Number.isFinite(latitude) && Number.isFinite(longitude) ? (
          <Text strong>{latitude}, {longitude}</Text>
        ) : (
          <Text type="secondary">No delivery location selected yet</Text>
        )}
      </Space>
    </Space>
  );
}
