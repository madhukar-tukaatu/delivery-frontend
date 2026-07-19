"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Button, Input, Space, Typography, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";

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
    street: address.road || "",
    landmark:
      address.attraction ||
      address.building ||
      address.amenity ||
      address.neighbourhood ||
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

  if (!response.ok) {
    throw new Error("Address search failed.");
  }

  const rows = await response.json();

  if (!rows?.length) {
    throw new Error("No location found.");
  }

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
    const timers = [150, 400, 800, 1200].map((delay) =>
      setTimeout(() => {
        map.invalidateSize();

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          map.setView([latitude, longitude], 14);
        }
      }, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [map, latitude, longitude]);

  return null;
}

export default function CoverageRadiusMap({
  value,
  radiusKm = 5,
  onChange,
  existingLocations = [],
  existingBranches = [],
  showExisting = true,
  showBranches = true,
  height = 420,
  showSearch = true,
  clickable = true,
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

    async function loadMap() {
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
          Circle: reactLeaflet.Circle,
          Polyline: reactLeaflet.Polyline,
          useMap: reactLeaflet.useMap,
          useMapEvents: reactLeaflet.useMapEvents,
        });
      } catch (error) {
        console.error(error);
        message.error("Could not load map.");
      }
    }

    if (mounted) loadMap();

    return () => {
      active = false;
    };
  }, [mounted]);

  const latitude = toNumber(value?.latitude);
  const longitude = toNumber(value?.longitude);

  const center = useMemo(() => {
    if (latitude !== null && longitude !== null) {
      return [latitude, longitude];
    }

    const firstLocation = existingLocations.find(
      (item) =>
        toNumber(item.latitude) !== null && toNumber(item.longitude) !== null
    );

    if (firstLocation) {
      return [Number(firstLocation.latitude), Number(firstLocation.longitude)];
    }

    return [27.7172, 85.324];
  }, [latitude, longitude, existingLocations]);

  async function handleSearch() {
    if (!searchText.trim()) {
      message.warning("Enter address or place name.");
      return;
    }

    try {
      setSearching(true);
      const location = await searchAddress(searchText.trim());
      onChange?.(location);
      message.success("Location selected.");
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
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading map...
      </div>
    );
  }

  const {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    Circle,
    Polyline,
    useMap,
    useMapEvents,
  } = mapTools;

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {showSearch && (
        <Space.Compact style={{ width: "100%" }}>
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onPressEnter={handleSearch}
            placeholder="Search city, area, landmark..."
          />

          <Button
            icon={<SearchOutlined />}
            loading={searching}
            onClick={handleSearch}
          >
            Search
          </Button>
        </Space.Compact>
      )}

      <div
        style={{
          height,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom
          style={{ height: "100%", width: "100%", background: "#ffffff" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {clickable && (
            <MapClickHandler
              useMapEvents={useMapEvents}
              onPick={(location) => {
                onChange?.(location);
                message.success("Map location selected.");
              }}
            />
          )}

          <MapUpdater useMap={useMap} latitude={latitude} longitude={longitude} />

          {showExisting &&
            existingLocations.map((item) => {
              const lat = toNumber(item.latitude);
              const lng = toNumber(item.longitude);
              const radius = Number(item.coverage_radius_km || 5) * 1000;

              if (lat === null || lng === null) return null;

              const isMain = item.type === "main_branch_zone";

              return (
                <Fragment key={`coverage-${item.id}`}>
                  <Marker position={[lat, lng]}>
                    <Popup>
                      <strong>{item.name}</strong>
                      <br />
                      {item.code}
                      <br />
                      {isMain ? "Main Branch Zone" : "Sub-Branch Zone"}
                      <br />
                      Radius: {item.coverage_radius_km} km
                      <br />
                      Status: {item.status}
                    </Popup>
                  </Marker>

                  <Circle
                    center={[lat, lng]}
                    radius={radius}
                    pathOptions={{
                      color: isMain ? "#1677ff" : "#52c41a",
                      fillColor: isMain ? "#1677ff" : "#52c41a",
                      fillOpacity: 0.12,
                      weight: 2,
                    }}
                  />
                </Fragment>
              );
            })}

          {showBranches &&
            existingBranches.map((branch) => {
              const officeLat = toNumber(branch.office_latitude);
              const officeLng = toNumber(branch.office_longitude);
              const coverageLat = toNumber(branch.latitude);
              const coverageLng = toNumber(branch.longitude);

              if (officeLat === null || officeLng === null) return null;

              return (
                <Fragment key={`branch-${branch.id}`}>
                  <Marker position={[officeLat, officeLng]}>
                    <Popup>
                      <strong>{branch.name}</strong>
                      <br />
                      {branch.code}
                      <br />
                      Type: {branch.type}
                      <br />
                      Office: {branch.office_address || "-"}
                      <br />
                      Status: {branch.status}
                    </Popup>
                  </Marker>

                  {coverageLat !== null && coverageLng !== null && (
                    <Polyline
                      positions={[
                        [coverageLat, coverageLng],
                        [officeLat, officeLng],
                      ]}
                      pathOptions={{
                        color: "#722ed1",
                        weight: 2,
                        dashArray: "6 6",
                      }}
                    />
                  )}
                </Fragment>
              );
            })}

          {latitude !== null && longitude !== null && (
            <Fragment>
              <Marker position={[latitude, longitude]}>
                <Popup>
                  Selected Location
                  <br />
                  {latitude}, {longitude}
                </Popup>
              </Marker>

              <Circle
                center={[latitude, longitude]}
                radius={Number(radiusKm || 0.5) * 1000}
                pathOptions={{
                  color: "#fa8c16",
                  fillColor: "#fa8c16",
                  fillOpacity: 0.14,
                  weight: 2,
                }}
              />
            </Fragment>
          )}
        </MapContainer>
      </div>

      <Space wrap>
        <Text type="secondary">Selected:</Text>

        {latitude !== null && longitude !== null ? (
          <Text strong>
            {latitude}, {longitude}
          </Text>
        ) : (
          <Text type="secondary">No location selected</Text>
        )}

        <Text type="secondary">Radius: {radiusKm || 0.5} km</Text>
      </Space>
    </Space>
  );
}