"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";

import {
  Button,
  Input,
  Spin,
  Tag,
  Typography,
} from "antd";

import {
  SearchOutlined,
} from "@ant-design/icons";

import "leaflet/dist/leaflet.css";

const { Text } = Typography;

/* -------------------------------------------------------------------------- */
/* Leaflet marker icons                                                       */
/* -------------------------------------------------------------------------- */

const createColoredIcon = (color) => {
  const svg = `
    <svg
      width="42"
      height="54"
      viewBox="0 0 42 54"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 1C10 1 1 10 1 21C1 36 21 53 21 53C21 53 41 36 41 21C41 10 32 1 21 1Z"
        fill="${color}"
        stroke="#ffffff"
        stroke-width="3"
      />

      <circle
        cx="21"
        cy="21"
        r="7"
        fill="#ffffff"
      />
    </svg>
  `;

  return L.divIcon({
    className: "coverage-map-marker",
    html: svg,
    iconSize: [42, 54],
    iconAnchor: [21, 53],
    popupAnchor: [0, -50],
  });
};

const newLocationIcon = createColoredIcon("#1677ff");
const destinationIcon = createColoredIcon("#722ed1");
const branchIcon = createColoredIcon("#13c2c2");
const coverageIcon = createColoredIcon("#7c3aed");

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function numberOrNull(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function getName(location) {
  return (
    location?.name ||
    location?.branch_name ||
    location?.title ||
    "Unnamed"
  );
}

function getCode(location) {
  return (
    location?.code ||
    location?.branch_code ||
    ""
  );
}

function getLatitude(item) {
  return numberOrNull(
    item?.latitude ??
      item?.lat ??
      item?.coordinates?.latitude
  );
}

function getLongitude(item) {
  return numberOrNull(
    item?.longitude ??
      item?.lng ??
      item?.coordinates?.longitude
  );
}

function getRadius(item) {
  return (
    numberOrNull(
      item?.coverage_radius_km ??
        item?.radius_km ??
        item?.coverage_radius
    ) ?? 0
  );
}

/* -------------------------------------------------------------------------- */
/* Map size fixer                                                             */
/* -------------------------------------------------------------------------- */

function MapSizeFixer() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => {
      try {
        map.invalidateSize({
          animate: false,
        });
      } catch {
        // Ignore if map is already being destroyed.
      }
    };

    // Initial render.
    const timers = [
      setTimeout(refresh, 50),
      setTimeout(refresh, 150),
      setTimeout(refresh, 400),
      setTimeout(refresh, 800),
    ];

    // Also observe container resizing.
    let observer = null;

    if (
      typeof ResizeObserver !== "undefined" &&
      map.getContainer()
    ) {
      observer = new ResizeObserver(() => {
        refresh();
      });

      observer.observe(map.getContainer());
    }

    return () => {
      timers.forEach(clearTimeout);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Map controller                                                             */
/* -------------------------------------------------------------------------- */

function MapController({
  value,
  highlightedLocation,
  hasSelectedLocation,
}) {
  const map = useMap();

  const didInitialCenter = useRef(false);

  useEffect(() => {
    if (highlightedLocation) {
      const lat = getLatitude(highlightedLocation);
      const lng = getLongitude(highlightedLocation);

      if (lat === null || lng === null) {
        return;
      }

      const radiusKm =
        getRadius(highlightedLocation);

      const radiusMeters =
        Math.max(radiusKm * 1000, 3000);

      const bounds =
        L.latLng(lat, lng).toBounds(
          radiusMeters * 2
        );

      map.flyToBounds(bounds, {
        padding: [40, 40],
        duration: 0.8,
        easeLinearity: 0.25,
      });

      return;
    }

    const lat = numberOrNull(
      value?.latitude
    );

    const lng = numberOrNull(
      value?.longitude
    );

    if (lat === null || lng === null) {
      return;
    }

    /*
     * Only automatically center the first time.
     *
     * This is important:
     * dragging the marker should NOT cause the map
     * to fight the user's drag by constantly flying.
     */
    if (!didInitialCenter.current) {
      didInitialCenter.current = true;

      map.flyTo(
        [lat, lng],
        Math.max(map.getZoom(), 12),
        {
          duration: 0.7,
          easeLinearity: 0.25,
        }
      );
    }
  }, [
    map,
    value,
    highlightedLocation,
  ]);

  useEffect(() => {
    if (hasSelectedLocation) {
      didInitialCenter.current = true;
    }
  }, [hasSelectedLocation]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Click handler                                                              */
/* -------------------------------------------------------------------------- */

function MapClickHandler({
  clickable,
  onMapPositionChange,
}) {
  useMapEvents({
    click(event) {
      if (!clickable) {
        return;
      }

      onMapPositionChange?.({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Reverse geocoding                                                          */
/* -------------------------------------------------------------------------- */

async function reverseGeocode(latitude, longitude) {
  try {
    const url =
      "https://nominatim.openstreetmap.org/reverse?" +
      new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        format: "json",
        addressdetails: "1",
        zoom: "18",
      }).toString();

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    const address = result?.address || {};

    const province =
      address.state ||
      address.province ||
      address.region ||
      "";

    const district =
      address.state_district ||
      address.county ||
      "";

    const city =
      address.city ||
      address.town ||
      address.municipality ||
      address.village ||
      address.city_district ||
      "";

    const area =
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.hamlet ||
      "";

    const street =
      address.road ||
      address.pedestrian ||
      address.street ||
      "";

    const landmark =
      address.shop ||
      address.building ||
      address.amenity ||
      "";

    return {
      latitude,
      longitude,

      address:
        result?.display_name || "",

      province,
      district,
      city,
      area,
      street,
      landmark,
    };
  } catch (error) {
    console.error(
      "Reverse geocoding failed:",
      error
    );

    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Search controller                                                          */
/* -------------------------------------------------------------------------- */

function SearchController({
  searchText,
  setSearchText,
  onSearchResult,
}) {
  const map = useMap();

  const [
    searching,
    setSearching,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const search = useCallback(
    async () => {
      const query =
        searchText.trim();

      if (!query) {
        return;
      }

      try {
        setSearching(true);
        setError("");

        const url =
          "https://nominatim.openstreetmap.org/search?" +
          new URLSearchParams({
            q: query,
            format: "json",
            limit: "5",
            countrycodes: "np",
            addressdetails: "1",
          }).toString();

        const response =
          await fetch(url, {
            headers: {
              Accept:
                "application/json",
            },
          });

        if (!response.ok) {
          throw new Error(
            "Search service unavailable."
          );
        }

        const results =
          await response.json();

        if (
          !Array.isArray(results) ||
          results.length === 0
        ) {
          setError(
            "No location found."
          );

          return;
        }

        const first =
          results[0];

        const lat =
          Number(first.lat);

        const lng =
          Number(first.lon);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          throw new Error(
            "Invalid location returned."
          );
        }

        map.flyTo(
          [lat, lng],
          14,
          {
            duration: 0.8,
            easeLinearity: 0.25,
          }
        );

        const address =
          first?.address || {};

        onSearchResult?.({
          latitude: lat,
          longitude: lng,

          address:
            first?.display_name || "",

          province:
            address.state ||
            address.province ||
            "",

          district:
            address.state_district ||
            address.county ||
            "",

          city:
            address.city ||
            address.town ||
            address.municipality ||
            address.village ||
            "",

          area:
            address.suburb ||
            address.neighbourhood ||
            "",

          street:
            address.road ||
            address.pedestrian ||
            "",

          landmark:
            address.shop ||
            address.building ||
            address.amenity ||
            "",

          displayName:
            first.display_name,
        });
      } catch (err) {
        console.error(
          "Map search:",
          err
        );

        setError(
          err?.message ||
            "Unable to search location."
        );
      } finally {
        setSearching(false);
      }
    },
    [
      map,
      onSearchResult,
      searchText,
    ]
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 50,
        right: 50,
        zIndex: 1000,

        display: "flex",
        gap: 6,

        maxWidth: 700,
        margin: "0 auto",

        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          flex: 1,
          position: "relative",
        }}
      >
        <Input
          value={searchText}
          onChange={(event) => {
            setSearchText(
              event.target.value
            );

            setError("");
          }}
          onPressEnter={search}
          placeholder="Search coverage location, city, district..."
          prefix={
            <SearchOutlined />
          }
          allowClear
          size="large"
          style={{
            background:
              "#ffffff",
            borderRadius: 8,

            boxShadow:
              "0 2px 10px rgba(0,0,0,0.12)",
          }}
        />

        {error && (
          <div
            style={{
              position:
                "absolute",

              top: 48,
              left: 0,
              right: 0,

              background:
                "#fff1f0",

              border:
                "1px solid #ffccc7",

              padding:
                "6px 10px",

              borderRadius: 6,

              fontSize: 11,

              color:
                "#cf1322",

              boxShadow:
                "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <Button
        type="primary"
        size="large"
        onClick={search}
        loading={searching}
        icon={
          <SearchOutlined />
        }
        style={{
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.12)",
        }}
      >
        Search
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Coverage circle                                                            */
/* -------------------------------------------------------------------------- */

function ExistingCoverageCircle({
  location,
  selected,
}) {
  const lat =
    getLatitude(location);

  const lng =
    getLongitude(location);

  const radiusKm =
    getRadius(location);

  if (
    lat === null ||
    lng === null ||
    radiusKm <= 0
  ) {
    return null;
  }

  return (
    <Circle
      center={[
        lat,
        lng,
      ]}
      radius={
        radiusKm * 1000
      }
      pathOptions={{
        color: selected
          ? "#722ed1"
          : "#7c3aed",

        weight: selected
          ? 4
          : 2,

        opacity: selected
          ? 0.95
          : 0.55,

        fillColor: selected
          ? "#722ed1"
          : "#7c3aed",

        fillOpacity: selected
          ? 0.12
          : 0.06,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function CoverageRadiusMap({
  value,

  radiusKm = 5,

  existingLocations = [],
  existingBranches = [],

  selectedLocationId = null,
  highlightedLocationId = null,

  showExisting = true,
  showBranches = true,
  showSearch = true,

  clickable = true,

  height = 560,

  onChange,
}) {
  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    searchResult,
    setSearchResult,
  ] = useState(null);

  const [
    resolving,
    setResolving,
  ] = useState(false);

  const selectedLat =
    numberOrNull(
      value?.latitude
    );

  const selectedLng =
    numberOrNull(
      value?.longitude
    );

  const hasSelectedLocation =
    selectedLat !== null &&
    selectedLng !== null;

  /* ---------------------------------------------------------------------- */
  /* Highlighted existing location                                          */
  /* ---------------------------------------------------------------------- */

  const highlightedLocation =
    useMemo(() => {
      if (
        highlightedLocationId ===
          null ||
        highlightedLocationId ===
          undefined
      ) {
        return null;
      }

      return existingLocations.find(
        (location) =>
          Number(
            location?.id
          ) ===
          Number(
            highlightedLocationId
          )
      );
    }, [
      existingLocations,
      highlightedLocationId,
    ]);

  /* ---------------------------------------------------------------------- */
  /* Initial center                                                         */
  /* ---------------------------------------------------------------------- */

  const center =
    useMemo(() => {
      if (
        selectedLat !== null &&
        selectedLng !== null
      ) {
        return [
          selectedLat,
          selectedLng,
        ];
      }

      const destinationLat =
        getLatitude(
          highlightedLocation
        );

      const destinationLng =
        getLongitude(
          highlightedLocation
        );

      if (
        destinationLat !==
          null &&
        destinationLng !==
          null
      ) {
        return [
          destinationLat,
          destinationLng,
        ];
      }

      const first =
        existingLocations[0];

      const lat =
        getLatitude(first);

      const lng =
        getLongitude(first);

      if (
        lat !== null &&
        lng !== null
      ) {
        return [
          lat,
          lng,
        ];
      }

      // Kathmandu default.
      return [
        27.7172,
        85.3240,
      ];
    }, [
      selectedLat,
      selectedLng,
      highlightedLocation,
      existingLocations,
    ]);

  /* ---------------------------------------------------------------------- */
  /* Clean existing coverage locations                                     */
  /* ---------------------------------------------------------------------- */

  const locations =
    useMemo(() => {
      return (
        Array.isArray(
          existingLocations
        )
          ? existingLocations
          : []
      ).filter(
        (location) =>
          getLatitude(
            location
          ) !== null &&
          getLongitude(
            location
          ) !== null
      );
    }, [
      existingLocations,
    ]);

  /* ---------------------------------------------------------------------- */
  /* Clean branches                                                         */
  /* ---------------------------------------------------------------------- */

  const branches =
    useMemo(() => {
      return (
        Array.isArray(
          existingBranches
        )
          ? existingBranches
          : []
      ).filter(
        (branch) =>
          getLatitude(
            branch
          ) !== null &&
          getLongitude(
            branch
          ) !== null
      );
    }, [
      existingBranches,
    ]);

  /* ---------------------------------------------------------------------- */
  /* Resolve selected location                                              */
  /* ---------------------------------------------------------------------- */

  const resolveLocation =
    useCallback(
      async (
        latitude,
        longitude
      ) => {
        if (
          !Number.isFinite(
            latitude
          ) ||
          !Number.isFinite(
            longitude
          )
        ) {
          return;
        }

        /*
         * Immediately update coordinates.
         *
         * This makes dragging feel instant.
         */
        onChange?.({
          latitude,
          longitude,
        });

        /*
         * Resolve address separately.
         *
         * This prevents the marker from feeling
         * slow while waiting for Nominatim.
         */
        setResolving(true);

        try {
          const location =
            await reverseGeocode(
              latitude,
              longitude
            );

          if (location) {
            onChange?.(
              location
            );
          }
        } finally {
          setResolving(false);
        }
      },
      [
        onChange,
      ]
    );

  /* ---------------------------------------------------------------------- */
  /* Map click                                                              */
  /* ---------------------------------------------------------------------- */

  const handleMapPositionChange =
    useCallback(
      ({
        latitude,
        longitude,
      }) => {
        setSearchResult(
          null
        );

        resolveLocation(
          latitude,
          longitude
        );
      },
      [
        resolveLocation,
      ]
    );

  /* ---------------------------------------------------------------------- */
  /* Search result                                                          */
  /* ---------------------------------------------------------------------- */

  const handleSearchResult =
    useCallback(
      (result) => {
        setSearchResult(
          result
        );

        /*
         * Search should also become
         * the selected location.
         */
        resolveLocation(
          result.latitude,
          result.longitude
        );
      },
      [
        resolveLocation,
      ]
    );

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <div
      className="coverage-radius-map"
      style={{
        position:
          "relative",

        width:
          "100%",

        height:
          typeof height ===
          "number"
            ? `${height}px`
            : height,

        minHeight:
          520,

        overflow:
          "hidden",

        borderRadius:
          10,

        border:
          "1px solid #e5e7eb",

        background:
          "#e5e7eb",
      }}
    >
      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom
        doubleClickZoom
        dragging
        zoomControl
        style={{
          width:
            "100%",

          height:
            "100%",

          minHeight:
            520,

          zIndex: 1,
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapSizeFixer />

        <MapController
          value={value}
          highlightedLocation={
            highlightedLocation
          }
          hasSelectedLocation={
            hasSelectedLocation
          }
        />

        <MapClickHandler
          clickable={
            clickable
          }
          onMapPositionChange={
            handleMapPositionChange
          }
        />

        {/* -------------------------------------------------------------- */}
        {/* Search                                                          */}
        {/* -------------------------------------------------------------- */}

        {showSearch && (
          <SearchController
            searchText={
              searchText
            }
            setSearchText={
              setSearchText
            }
            onSearchResult={
              handleSearchResult
            }
          />
        )}

        {/* -------------------------------------------------------------- */}
        {/* Existing coverage locations                                    */}
        {/* -------------------------------------------------------------- */}

        {showExisting &&
          locations.map(
            (location) => {
              const lat =
                getLatitude(
                  location
                );

              const lng =
                getLongitude(
                  location
                );

              const selected =
                Number(
                  location?.id
                ) ===
                Number(
                  highlightedLocationId
                );

              const isCurrent =
                Number(
                  location?.id
                ) ===
                Number(
                  selectedLocationId
                );

              return (
                <div
                  key={`coverage-${location.id}`}
                >
                  <ExistingCoverageCircle
                    location={
                      location
                    }
                    selected={
                      selected
                    }
                  />

                  <CircleMarker
                    center={[
                      lat,
                      lng,
                    ]}
                    radius={
                      selected
                        ? 9
                        : 6
                    }
                    pathOptions={{
                      color:
                        selected
                          ? "#722ed1"
                          : "#7c3aed",

                      fillColor:
                        selected
                          ? "#722ed1"
                          : "#7c3aed",

                      fillOpacity:
                        selected
                          ? 1
                          : 0.75,

                      weight:
                        selected
                          ? 3
                          : 2,
                    }}
                  >
                    <Popup>
                      <div
                        style={{
                          minWidth:
                            190,
                        }}
                      >
                        <Text strong>
                          {getName(
                            location
                          )}
                        </Text>

                        {getCode(
                          location
                        ) && (
                          <div>
                            <Tag
                              color="purple"
                            >
                              {getCode(
                                location
                              )}
                            </Tag>
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 6,
                          }}
                        >
                          Radius:{" "}
                          {getRadius(
                            location
                          )}{" "}
                          km
                        </div>

                        {selected && (
                          <Tag
                            color="purple"
                            style={{
                              marginTop:
                                6,
                            }}
                          >
                            Selected
                            destination
                          </Tag>
                        )}

                        {isCurrent && (
                          <Tag
                            color="blue"
                            style={{
                              marginTop:
                                6,
                            }}
                          >
                            Current
                            location
                          </Tag>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                </div>
              );
            }
          )}

        {/* -------------------------------------------------------------- */}
        {/* Existing branches                                               */}
        {/* -------------------------------------------------------------- */}

        {showBranches &&
          branches.map(
            (branch, index) => {
              const lat =
                getLatitude(
                  branch
                );

              const lng =
                getLongitude(
                  branch
                );

              const id =
                branch?.id ??
                branch?.branch_id ??
                index;

              return (
                <Marker
                  key={`branch-${id}`}
                  position={[
                    lat,
                    lng,
                  ]}
                  icon={
                    branchIcon
                  }
                >
                  <Popup>
                    <div
                      style={{
                        minWidth:
                          180,
                      }}
                    >
                      <Text strong>
                        {getName(
                          branch
                        )}
                      </Text>

                      {getCode(
                        branch
                      ) && (
                        <div>
                          <Tag
                            color="cyan"
                          >
                            {getCode(
                              branch
                            )}
                          </Tag>
                        </div>
                      )}

                      <div
                        style={{
                          marginTop:
                            5,
                        }}
                      >
                        Branch
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }
          )}

        {/* -------------------------------------------------------------- */}
        {/* Search result                                                    */}
        {/* -------------------------------------------------------------- */}

        {searchResult && (
          <Marker
            position={[
              searchResult.latitude,
              searchResult.longitude,
            ]}
            icon={
              destinationIcon
            }
          >
            <Popup>
              <Text strong>
                Search result
              </Text>

              <div
                style={{
                  marginTop:
                    5,
                  maxWidth:
                    280,
                }}
              >
                {
                  searchResult.displayName ||
                  searchResult.address
                }
              </div>
            </Popup>
          </Marker>
        )}

        {/* -------------------------------------------------------------- */}
        {/* Selected / new coverage location                                */}
        {/* -------------------------------------------------------------- */}

        {hasSelectedLocation && (
          <>
            <Circle
              center={[
                selectedLat,
                selectedLng,
              ]}
              radius={
                Math.max(
                  Number(
                    radiusKm
                  ) || 0,
                  0.1
                ) * 1000
              }
              pathOptions={{
                color:
                  "#1677ff",

                weight:
                  4,

                opacity:
                  0.9,

                fillColor:
                  "#1677ff",

                fillOpacity:
                  0.10,

                dashArray:
                  "8 7",
              }}
            />

            <Marker
              position={[
                selectedLat,
                selectedLng,
              ]}
              icon={
                newLocationIcon
              }
              draggable={
                clickable
              }
              autoPan
              autoPanPadding={[
                80,
                80,
              ]}
              eventHandlers={{
                dragstart() {
                  setSearchResult(
                    null
                  );
                },

                dragend(event) {
                  const marker =
                    event.target;

                  const position =
                    marker.getLatLng();

                  resolveLocation(
                    position.lat,
                    position.lng
                  );
                },
              }}
            >
              <Popup>
                <div
                  style={{
                    minWidth:
                      200,
                  }}
                >
                  <Text strong>
                    New Coverage Location
                  </Text>

                  <div
                    style={{
                      marginTop:
                        6,
                    }}
                  >
                    Latitude:{" "}
                    {selectedLat.toFixed(
                      6
                    )}
                  </div>

                  <div>
                    Longitude:{" "}
                    {selectedLng.toFixed(
                      6
                    )}
                  </div>

                  <div
                    style={{
                      marginTop:
                        5,
                    }}
                  >
                    Coverage:{" "}
                    {radiusKm} km
                  </div>

                  <Tag
                    color="blue"
                    style={{
                      marginTop:
                        8,
                    }}
                  >
                    Drag to move
                  </Tag>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* ---------------------------------------------------------------- */}
      {/* Resolving indicator                                              */}
      {/* ---------------------------------------------------------------- */}

      {resolving && (
        <div
          style={{
            position:
              "absolute",

            top: 72,
            right: 14,

            zIndex: 1000,

            background:
              "rgba(255,255,255,0.96)",

            border:
              "1px solid #e5e7eb",

            borderRadius:
              8,

            padding:
              "7px 10px",

            display:
              "flex",

            alignItems:
              "center",

            gap: 7,

            fontSize:
              12,

            boxShadow:
              "0 2px 8px rgba(0,0,0,0.10)",
          }}
        >
          <Spin size="small" />
          Resolving location...
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Map instructions                                                 */}
      {/* ---------------------------------------------------------------- */}

      <div
        style={{
          position:
            "absolute",

          bottom:
            12,

          right:
            12,

          zIndex:
            1000,

          background:
            "rgba(255,255,255,0.96)",

          border:
            "1px solid #e5e7eb",

          borderRadius:
            8,

          padding:
            "8px 11px",

          boxShadow:
            "0 2px 8px rgba(0,0,0,0.12)",

          fontSize:
            11,

          color:
            "#475569",
        }}
      >
        <div
          style={{
            fontWeight:
              600,

            color:
              "#0f172a",

            marginBottom:
              3,
          }}
        >
          Set coverage location
        </div>

        <div>
          Click the map or drag the blue marker.
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Legend                                                           */}
      {/* ---------------------------------------------------------------- */}

      <div
        style={{
          position:
            "absolute",

          bottom:
            12,

          left:
            12,

          zIndex:
            1000,

          background:
            "rgba(255,255,255,0.96)",

          border:
            "1px solid #e5e7eb",

          borderRadius:
            8,

          padding:
            "8px 10px",

          boxShadow:
            "0 2px 8px rgba(0,0,0,0.12)",

          fontSize:
            11,
        }}
      >
        <Text
          strong
          style={{
            display:
              "block",

            marginBottom:
              6,
          }}
        >
          Map Legend
        </Text>

        <div>
          <span
            style={{
              display:
                "inline-block",

              width:
                10,

              height:
                10,

              borderRadius:
                "50%",

              background:
                "#1677ff",

              marginRight:
                6,
            }}
          />

          New Coverage
        </div>

        <div>
          <span
            style={{
              display:
                "inline-block",

              width:
                10,

              height:
                10,

              borderRadius:
                "50%",

              background:
                "#722ed1",

              marginRight:
                6,
            }}
          />

          Selected Main Zone
        </div>

        <div>
          <span
            style={{
              display:
                "inline-block",

              width:
                10,

              height:
                10,

              borderRadius:
                "50%",

              background:
                "#13c2c2",

              marginRight:
                6,
            }}
          />

          Branch
        </div>

        <div>
          <span
            style={{
              display:
                "inline-block",

              width:
                10,

              height:
                10,

              borderRadius:
                "50%",

              background:
                "#7c3aed",

              marginRight:
                6,
            }}
          />

          Coverage Zone
        </div>
      </div>
    </div>
  );
}