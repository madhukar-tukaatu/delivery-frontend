"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Button, Input, Space, Typography, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Text } = Typography;

/*
|--------------------------------------------------------------------------
| Nepal map configuration
|--------------------------------------------------------------------------
*/

const NEPAL_CENTER = [28.3949, 84.124];

const NEPAL_BOUNDS = [
  [26.347, 80.058],
  [30.447, 88.201],
];

/*
|--------------------------------------------------------------------------
| Coordinate helpers
|--------------------------------------------------------------------------
*/

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function isValidCoordinate(latitude, longitude) {
  return (
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isValidNepalCoordinate(latitude, longitude) {
  return (
    isValidCoordinate(latitude, longitude) &&
    latitude >= 26 &&
    latitude <= 31 &&
    longitude >= 80 &&
    longitude <= 89
  );
}

function coordinatesAreDifferent(
  firstLatitude,
  firstLongitude,
  secondLatitude,
  secondLongitude,
) {
  if (
    firstLatitude === null ||
    firstLongitude === null ||
    secondLatitude === null ||
    secondLongitude === null
  ) {
    return false;
  }

  const tolerance = 0.000001;

  return (
    Math.abs(firstLatitude - secondLatitude) > tolerance ||
    Math.abs(firstLongitude - secondLongitude) > tolerance
  );
}

/*
|--------------------------------------------------------------------------
| Branch coordinate resolution
|--------------------------------------------------------------------------
|
| Office coordinates are preferred for the branch marker.
| Allocation coordinates are preferred for the allocation-to-office line.
|
*/

function getBranchOfficeCoordinates(branch) {
  const officeLatitude = toNumber(branch?.office_latitude);
  const officeLongitude = toNumber(branch?.office_longitude);

  if (isValidNepalCoordinate(officeLatitude, officeLongitude)) {
    return {
      latitude: officeLatitude,
      longitude: officeLongitude,
      source: "office",
    };
  }

  const branchLatitude = toNumber(branch?.latitude);
  const branchLongitude = toNumber(branch?.longitude);

  if (isValidNepalCoordinate(branchLatitude, branchLongitude)) {
    return {
      latitude: branchLatitude,
      longitude: branchLongitude,
      source: "branch",
    };
  }

  const allocationLatitude = toNumber(
    branch?.coverage_location?.latitude ??
      branch?.coverageLocation?.latitude,
  );

  const allocationLongitude = toNumber(
    branch?.coverage_location?.longitude ??
      branch?.coverageLocation?.longitude,
  );

  if (isValidNepalCoordinate(allocationLatitude, allocationLongitude)) {
    return {
      latitude: allocationLatitude,
      longitude: allocationLongitude,
      source: "allocation",
    };
  }

  return null;
}

function getBranchAllocationCoordinates(branch) {
  const allocationLatitude = toNumber(
    branch?.coverage_location?.latitude ??
      branch?.coverageLocation?.latitude,
  );

  const allocationLongitude = toNumber(
    branch?.coverage_location?.longitude ??
      branch?.coverageLocation?.longitude,
  );

  if (isValidNepalCoordinate(allocationLatitude, allocationLongitude)) {
    return {
      latitude: allocationLatitude,
      longitude: allocationLongitude,
    };
  }

  const branchLatitude = toNumber(branch?.latitude);
  const branchLongitude = toNumber(branch?.longitude);

  if (isValidNepalCoordinate(branchLatitude, branchLongitude)) {
    return {
      latitude: branchLatitude,
      longitude: branchLongitude,
    };
  }

  return null;
}

function getBranchOfficeAddress(branch) {
  return (
    branch?.office_address ||
    branch?.address ||
    branch?.coverage_location?.address ||
    branch?.coverageLocation?.address ||
    "-"
  );
}

/*
|--------------------------------------------------------------------------
| Address helpers
|--------------------------------------------------------------------------
*/

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
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return {};
    }

    const result = await response.json();

    return extractLocation(result);
  } catch {
    return {};
  }
}

async function searchAddress(query) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=np&q=${encodeURIComponent(
      query,
    )}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Address search failed.");
  }

  const rows = await response.json();

  if (!rows?.length) {
    throw new Error("No location found.");
  }

  const first = rows[0];

  const latitude = Number(Number(first.lat).toFixed(7));
  const longitude = Number(Number(first.lon).toFixed(7));

  if (!isValidNepalCoordinate(latitude, longitude)) {
    throw new Error("The selected location is outside Nepal.");
  }

  return {
    latitude,
    longitude,
    ...extractLocation(first),
  };
}

/*
|--------------------------------------------------------------------------
| Map event handlers
|--------------------------------------------------------------------------
*/

function MapClickHandler({ useMapEvents, onPick }) {
  useMapEvents({
    async click(event) {
      const latitude = Number(event.latlng.lat.toFixed(7));
      const longitude = Number(event.latlng.lng.toFixed(7));

      if (!isValidNepalCoordinate(latitude, longitude)) {
        message.warning("Please select a location inside Nepal.");
        return;
      }

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

/*
|--------------------------------------------------------------------------
| Map updater
|--------------------------------------------------------------------------
*/

function MapUpdater({
  useMap,
  latitude,
  longitude,
  isNepalOverview,
  existingLocations,
  existingBranches,
}) {
  const map = useMap();

  useEffect(() => {
    const updateMap = () => {
      map.invalidateSize();

      /*
       * Nepal overview must never use invalid database points
       * to determine the map boundaries.
       */
      if (isNepalOverview) {
        map.fitBounds(NEPAL_BOUNDS, {
          padding: [20, 20],
          animate: false,
        });

        return;
      }

      /*
       * Selected form location gets priority in normal mode.
       */
      if (isValidNepalCoordinate(latitude, longitude)) {
        map.setView([latitude, longitude], 14, {
          animate: false,
        });

        return;
      }

      const points = [];

      /*
       * Add valid allocation coordinates.
       */
      existingLocations.forEach((item) => {
        const locationLatitude = toNumber(item?.latitude);
        const locationLongitude = toNumber(item?.longitude);

        if (
          isValidNepalCoordinate(
            locationLatitude,
            locationLongitude,
          )
        ) {
          points.push([
            locationLatitude,
            locationLongitude,
          ]);
        }
      });

      /*
       * Add valid branch office coordinates.
       */
      existingBranches.forEach((branch) => {
        const officeCoordinates =
          getBranchOfficeCoordinates(branch);

        if (officeCoordinates) {
          points.push([
            officeCoordinates.latitude,
            officeCoordinates.longitude,
          ]);
        }
      });

      if (points.length > 1) {
        map.fitBounds(points, {
          padding: [40, 40],
          maxZoom: 12,
          animate: false,
        });

        return;
      }

      if (points.length === 1) {
        map.setView(points[0], 11, {
          animate: false,
        });

        return;
      }

      map.setView(NEPAL_CENTER, 7, {
        animate: false,
      });
    };

    const timers = [100, 300, 700].map((delay) =>
      setTimeout(updateMap, delay),
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [
    map,
    latitude,
    longitude,
    isNepalOverview,
    existingLocations,
    existingBranches,
  ]);

  return null;
}

/*
|--------------------------------------------------------------------------
| Main component
|--------------------------------------------------------------------------
*/

export default function CoverageRadiusMapFull({
  value = {},
  radiusKm = 5,
  onChange,
  existingLocations = [],
  existingBranches = [],
  showExisting = true,
  showBranches = true,
  showCoverageRadius = true,
  height = 420,
  showSearch = true,
  clickable = true,
  viewMode = "normal",
  loading = false,
}) {
  const [mounted, setMounted] = useState(false);
  const [mapTools, setMapTools] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);

  const isNepalOverview = viewMode === "nepal";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadMap() {
      try {
        const [reactLeaflet, leafletModule] =
          await Promise.all([
            import("react-leaflet"),
            import("leaflet"),
          ]);

        const L = leafletModule.default || leafletModule;

        if (
          typeof window !== "undefined" &&
          L?.Icon?.Default
        ) {
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

        if (!active) {
          return;
        }

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
        console.error("Map loading error:", error);
        message.error("Could not load map.");
      }
    }

    if (mounted) {
      loadMap();
    }

    return () => {
      active = false;
    };
  }, [mounted]);

  const rawLatitude = toNumber(value?.latitude);
  const rawLongitude = toNumber(value?.longitude);

  const latitude = isValidNepalCoordinate(
    rawLatitude,
    rawLongitude,
  )
    ? rawLatitude
    : null;

  const longitude = isValidNepalCoordinate(
    rawLatitude,
    rawLongitude,
  )
    ? rawLongitude
    : null;

  /*
   * Remove invalid allocation coordinates before rendering.
   */
  const validExistingLocations = useMemo(() => {
    return existingLocations.filter((item) => {
      const itemLatitude = toNumber(item?.latitude);
      const itemLongitude = toNumber(item?.longitude);

      return isValidNepalCoordinate(
        itemLatitude,
        itemLongitude,
      );
    });
  }, [existingLocations]);

  /*
   * Remove branches without any usable Nepal coordinate.
   */
  const validExistingBranches = useMemo(() => {
    return existingBranches.filter((branch) => {
      return Boolean(getBranchOfficeCoordinates(branch));
    });
  }, [existingBranches]);

  const center = useMemo(() => {
    if (isNepalOverview) {
      return NEPAL_CENTER;
    }

    if (
      latitude !== null &&
      longitude !== null
    ) {
      return [latitude, longitude];
    }

    const firstLocation = validExistingLocations[0];

    if (firstLocation) {
      return [
        Number(firstLocation.latitude),
        Number(firstLocation.longitude),
      ];
    }

    const firstBranch = validExistingBranches[0];

    if (firstBranch) {
      const coordinates =
        getBranchOfficeCoordinates(firstBranch);

      if (coordinates) {
        return [
          coordinates.latitude,
          coordinates.longitude,
        ];
      }
    }

    return [27.7172, 85.324];
  }, [
    isNepalOverview,
    latitude,
    longitude,
    validExistingLocations,
    validExistingBranches,
  ]);

  async function handleSearch() {
    if (!searchText.trim()) {
      message.warning("Enter an address or place name.");
      return;
    }

    try {
      setSearching(true);

      const location = await searchAddress(
        searchText.trim(),
      );

      onChange?.(location);

      message.success("Location selected.");
    } catch (error) {
      message.error(
        error?.message || "Could not search location.",
      );
    } finally {
      setSearching(false);
    }
  }

  if (!mounted || !mapTools || loading) {
    return (
      <div
        style={{
          height,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
        }}
      >
        {loading ? "Loading locations..." : "Loading map..."}
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
    <Space
      direction="vertical"
      size={12}
      style={{ width: "100%" }}
    >
      {showSearch && (
        <Space.Compact style={{ width: "100%" }}>
          <Input
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
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
          zoom={isNepalOverview ? 7 : 13}
          minZoom={isNepalOverview ? 6 : 3}
          maxBounds={
            isNepalOverview ? NEPAL_BOUNDS : undefined
          }
          maxBoundsViscosity={
            isNepalOverview ? 0.85 : undefined
          }
          scrollWheelZoom
          style={{
            height: "100%",
            width: "100%",
            background: "#ffffff",
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {clickable && !isNepalOverview && (
            <MapClickHandler
              useMapEvents={useMapEvents}
              onPick={(location) => {
                onChange?.(location);
                message.success(
                  "Map location selected.",
                );
              }}
            />
          )}

          <MapUpdater
            useMap={useMap}
            latitude={latitude}
            longitude={longitude}
            isNepalOverview={isNepalOverview}
            existingLocations={validExistingLocations}
            existingBranches={validExistingBranches}
          />

          {/*
          |--------------------------------------------------------------------------
          | Coverage allocation markers
          |--------------------------------------------------------------------------
          */}

          {showExisting &&
            validExistingLocations.map((item) => {
              const itemLatitude = toNumber(
                item.latitude,
              );

              const itemLongitude = toNumber(
                item.longitude,
              );

              if (
                !isValidNepalCoordinate(
                  itemLatitude,
                  itemLongitude,
                )
              ) {
                return null;
              }

              const coverageRadius = Math.max(
                Number(item.coverage_radius_km || 5),
                0,
              );

              const radiusInMeters =
                coverageRadius * 1000;

              const isMain =
                item.type === "main_branch_zone";

              return (
                <Fragment
                  key={`coverage-${item.id}`}
                >
                  <Marker
                    position={[
                      itemLatitude,
                      itemLongitude,
                    ]}
                  >
                    <Popup>
                      <strong>
                        {item.name || "Coverage Zone"}
                      </strong>

                      <br />

                      {item.code || "-"}

                      <br />

                      {isMain
                        ? "Main Branch Zone"
                        : "Sub-Branch Zone"}

                      <br />

                      Radius: {coverageRadius} km

                      <br />

                      Status: {item.status || "-"}
                    </Popup>
                  </Marker>

                  {showCoverageRadius &&
                    radiusInMeters > 0 && (
                      <Circle
                        center={[
                          itemLatitude,
                          itemLongitude,
                        ]}
                        radius={radiusInMeters}
                        pathOptions={{
                          color: isMain
                            ? "#1677ff"
                            : "#52c41a",

                          fillColor: isMain
                            ? "#1677ff"
                            : "#52c41a",

                          fillOpacity: 0.12,
                          weight: 2,
                        }}
                      />
                    )}
                </Fragment>
              );
            })}

          {/*
          |--------------------------------------------------------------------------
          | Branch office markers
          |--------------------------------------------------------------------------
          */}

          {showBranches &&
            validExistingBranches.map((branch) => {
              const officeCoordinates =
                getBranchOfficeCoordinates(branch);

              if (!officeCoordinates) {
                return null;
              }

              const allocationCoordinates =
                getBranchAllocationCoordinates(branch);

              const shouldDrawConnection =
                allocationCoordinates &&
                coordinatesAreDifferent(
                  allocationCoordinates.latitude,
                  allocationCoordinates.longitude,
                  officeCoordinates.latitude,
                  officeCoordinates.longitude,
                );

              return (
                <Fragment key={`branch-${branch.id}`}>
                  <Marker
                    position={[
                      officeCoordinates.latitude,
                      officeCoordinates.longitude,
                    ]}
                  >
                    <Popup>
                      <strong>
                        {branch.name || "Branch"}
                      </strong>

                      <br />

                      {branch.code || "-"}

                      <br />

                      Type: {branch.type || "-"}

                      <br />

                      Office:{" "}
                      {getBranchOfficeAddress(branch)}

                      <br />

                      Status: {branch.status || "-"}

                      {officeCoordinates.source !==
                        "office" && (
                        <>
                          <br />
                          <Text
                            type="secondary"
                            style={{ fontSize: 11 }}
                          >
                            Office coordinates unavailable;
                            showing allocation location.
                          </Text>
                        </>
                      )}
                    </Popup>
                  </Marker>

                  {shouldDrawConnection && (
                    <Polyline
                      positions={[
                        [
                          allocationCoordinates.latitude,
                          allocationCoordinates.longitude,
                        ],
                        [
                          officeCoordinates.latitude,
                          officeCoordinates.longitude,
                        ],
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

          {/*
          |--------------------------------------------------------------------------
          | Currently selected location
          |--------------------------------------------------------------------------
          */}

          {latitude !== null &&
            longitude !== null &&
            !isNepalOverview && (
              <Fragment>
                <Marker
                  position={[latitude, longitude]}
                >
                  <Popup>
                    Selected Location
                    <br />
                    {latitude}, {longitude}
                  </Popup>
                </Marker>

                {showCoverageRadius && (
                  <Circle
                    center={[latitude, longitude]}
                    radius={
                      Math.max(
                        Number(radiusKm || 0.5),
                        0,
                      ) * 1000
                    }
                    pathOptions={{
                      color: "#fa8c16",
                      fillColor: "#fa8c16",
                      fillOpacity: 0.14,
                      weight: 2,
                    }}
                  />
                )}
              </Fragment>
            )}
        </MapContainer>
      </div>

      <Space wrap>
        {isNepalOverview ? (
          <>
            <Text type="secondary">
              Nepal Overview:
            </Text>

            <Text strong>
              {validExistingLocations.length} allocation
              location(s) and{" "}
              {validExistingBranches.length} branch
              office(s)
            </Text>
          </>
        ) : (
          <>
            <Text type="secondary">
              Selected:
            </Text>

            {latitude !== null &&
            longitude !== null ? (
              <Text strong>
                {latitude}, {longitude}
              </Text>
            ) : (
              <Text type="secondary">
                No location selected
              </Text>
            )}

            <Text type="secondary">
              Radius: {radiusKm || 0.5} km
            </Text>
          </>
        )}
      </Space>
    </Space>
  );
}