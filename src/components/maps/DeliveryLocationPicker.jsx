"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Input, Space, Typography, message } from "antd";
import { EnvironmentOutlined, SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function extractLocation(place) {
  const address = place?.address || {};

  return {
    address: place?.display_name || "",
    city:
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      address.county ||
      "",
    area:
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.road ||
      address.city_district ||
      "",
  };
}

async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
    );

    if (!response.ok) return {};

    return extractLocation(await response.json());
  } catch {
    return {};
  }
}

async function searchAddress(query) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=np&q=${encodeURIComponent(
      query
    )}`
  );

  if (!response.ok) throw new Error("Address search failed.");

  const rows = await response.json();

  if (!rows?.length) throw new Error("No location found.");

  const first = rows[0];

  return {
    latitude: Number(Number(first.lat).toFixed(7)),
    longitude: Number(Number(first.lon).toFixed(7)),
    ...extractLocation(first),
  };
}

function MapClickHandler({ useMapEvents, onPick }) {
  useMapEvents({
    async click(event) {
      const latitude = Number(event.latlng.lat.toFixed(7));
      const longitude = Number(event.latlng.lng.toFixed(7));
      const address = await reverseGeocode(latitude, longitude);

      onPick({
        latitude,
        longitude,
        ...address,
      });
    },
  });

  return null;
}

function MapUpdater({ useMap, latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    const timers = [150, 400, 800].map((delay) =>
      setTimeout(() => {
        map.invalidateSize();

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          map.setView([latitude, longitude], 15);
        }
      }, delay)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [map, latitude, longitude]);

  return null;
}

export default function DeliveryLocationPicker({
  value,
  pickupLocation,
  onChange,
  height = 380,
}) {
  const [mounted, setMounted] = useState(false);
  const [mapTools, setMapTools] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMapLibraries() {
      try {
        const [reactLeaflet, leafletModule] = await Promise.all([
          import("react-leaflet"),
          import("leaflet"),
        ]);

        const L = leafletModule.default || leafletModule;

        if (typeof window !== "undefined" && L?.Icon?.Default) {
          delete L.Icon.Default.prototype._getIconUrl;

          L.Icon.Default.mergeOptions({
            
            iconRetinaUrl:
              "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl:
              "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl:
              "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          });
        }

        if (!active) return;

        setMapTools({
          MapContainer: reactLeaflet.MapContainer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          TileLayer: reactLeaflet.TileLayer,
          useMap: reactLeaflet.useMap,
          useMapEvents: reactLeaflet.useMapEvents,
        });
      } catch (error) {
        console.error(error);
        message.error("Could not load map.");
      }
    }

    if (mounted) {
      loadMapLibraries();
    }

    return () => {
      active = false;
    };
  }, [mounted]);

  const latitude = toNumber(value?.latitude);
  const longitude = toNumber(value?.longitude);
  const pickupLat = toNumber(pickupLocation?.latitude);
  const pickupLng = toNumber(pickupLocation?.longitude);

  const center = useMemo(() => {
    if (latitude !== null && longitude !== null) {
      return [latitude, longitude];
    }

    if (pickupLat !== null && pickupLng !== null) {
      return [pickupLat, pickupLng];
    }

    return [27.7172, 85.324];
  }, [latitude, longitude, pickupLat, pickupLng]);

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

  if (!mounted || !mapTools) {
    return (
      <div
        style={{
          height,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading map...
      </div>
    );
  }

  const { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } =
    mapTools;

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Select delivery location"
        description="Search an address or click on the map to choose exact delivery location."
      />

      <Space.Compact style={{ width: "100%" }}>
        <Input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search address, area, landmark..."
          onPressEnter={handleSearch}
        />

        <Button
          icon={<SearchOutlined />}
          loading={searching}
          onClick={handleSearch}
        >
          Search
        </Button>
      </Space.Compact>

      <div
        style={{
          height,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler
            useMapEvents={useMapEvents}
            onPick={(location) => {
              onChange?.(location);
              message.success("Location selected from map.");
            }}
          />

          <MapUpdater
            useMap={useMap}
            latitude={latitude}
            longitude={longitude}
          />

          {pickupLat !== null && pickupLng !== null && (
            <Marker position={[pickupLat, pickupLng]}>
              <Popup>Pickup Location</Popup>
            </Marker>
          )}

          {latitude !== null && longitude !== null && (
            <Marker position={[latitude, longitude]}>
              <Popup>
                Delivery Location
                <br />
                {latitude}, {longitude}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <Space>
        <Text>
          <EnvironmentOutlined /> Selected:
        </Text>

        {latitude !== null && longitude !== null ? (
          <Text strong>
            {latitude}, {longitude}
          </Text>
        ) : (
          <Text type="secondary">No location selected</Text>
        )}
      </Space>
    </Space>
  );
}