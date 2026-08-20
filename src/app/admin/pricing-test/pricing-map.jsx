"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
} from "react";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

const DEFAULT_CENTER = [28.3949, 84.124];
const DEFAULT_ZOOM = 7;

/* ==========================================================================
   HELPERS
   ========================================================================== */

function isValidCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function normalizePoint(point) {
  if (!point) {
    return null;
  }

  if (Array.isArray(point)) {
    const latitude = Number(point[0]);
    const longitude = Number(point[1]);

    if (
      isValidCoordinate(
        latitude,
        longitude
      )
    ) {
      return {
        latitude,
        longitude,
      };
    }

    return null;
  }

  if (
    typeof point !== "object"
  ) {
    return null;
  }

  const latitude =
    point.latitude ??
    point.lat ??
    point.y;

  const longitude =
    point.longitude ??
    point.lng ??
    point.lon ??
    point.x;

  if (
    !isValidCoordinate(
      latitude,
      longitude
    )
  ) {
    return null;
  }

  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
}

function getPointKey(point) {
  return `${point.latitude.toFixed(
    6
  )},${point.longitude.toFixed(6)}`;
}

/* ==========================================================================
   MARKERS
   ========================================================================== */

function createMarkerIcon(type) {
  let className =
    "pricing-map-marker";

  let label = "P";

  if (type === "delivery") {
    className +=
      " pricing-map-marker-delivery";

    label = "D";
  } else if (
    type === "transfer"
  ) {
    className +=
      " pricing-map-marker-transfer";

    label = "T";
  } else {
    className +=
      " pricing-map-marker-pickup";

    label = "P";
  }

  return L.divIcon({
    className:
      "pricing-map-marker-wrapper",

    html: `
      <div class="${className}">
        <span>${label}</span>
      </div>
    `,

    iconSize: [42, 42],

    iconAnchor: [21, 36],

    popupAnchor: [0, -36],
  });
}

/* ==========================================================================
   COORDINATE EXTRACTION
   ========================================================================== */

function isCoordinatePair(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(
      Number(value[0])
    ) &&
    Number.isFinite(
      Number(value[1])
    )
  );
}

function normalizeCoordinateArray(
  coordinates,
  format = "latlng"
) {
  if (
    !Array.isArray(coordinates)
  ) {
    return [];
  }

  return coordinates
    .map((coordinate) => {
      if (
        !isCoordinatePair(
          coordinate
        )
      ) {
        return null;
      }

      let latitude;
      let longitude;

      if (
        format === "geojson"
      ) {
        longitude =
          Number(coordinate[0]);

        latitude =
          Number(coordinate[1]);
      } else {
        latitude =
          Number(coordinate[0]);

        longitude =
          Number(coordinate[1]);
      }

      if (
        !isValidCoordinate(
          latitude,
          longitude
        )
      ) {
        return null;
      }

      return {
        latitude,
        longitude,
      };
    })
    .filter(Boolean);
}

function extractCoordinatesFromValue(
  value
) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return [];
    }

    if (
      value.every(
        (item) =>
          Array.isArray(item) &&
          item.length >= 2
      )
    ) {
      return normalizeCoordinateArray(
        value,
        "latlng"
      );
    }

    const normalized =
      value
        .map((item) =>
          normalizePoint(item)
        )
        .filter(Boolean);

    return normalized;
  }

  if (
    typeof value !== "object"
  ) {
    return [];
  }

  if (
    value.type ===
      "LineString" &&
    Array.isArray(
      value.coordinates
    )
  ) {
    return normalizeCoordinateArray(
      value.coordinates,
      "geojson"
    );
  }

  const directPoint =
    normalizePoint(value);

  if (directPoint) {
    return [directPoint];
  }

  const possibleArrays = [
    value.coordinates,
    value.path,
    value.points,
    value.route,
    value.polyline,
    value.polyline_points,

    value.geometry?.coordinates,
    value.geometry?.points,
    value.geometry?.path,

    value.route?.coordinates,
    value.route?.path,
    value.route?.points,
    value.route?.polyline,
    value.route?.polyline_points,
    value.route?.geometry,

    value.geometry,
  ];

  for (
    const candidate of possibleArrays
  ) {
    if (!candidate) {
      continue;
    }

    if (
      candidate &&
      typeof candidate ===
        "object" &&
      candidate.type ===
        "LineString" &&
      Array.isArray(
        candidate.coordinates
      )
    ) {
      const points =
        normalizeCoordinateArray(
          candidate.coordinates,
          "geojson"
        );

      if (points.length >= 2) {
        return points;
      }
    }

    if (
      Array.isArray(candidate)
    ) {
      if (
        candidate.length > 0 &&
        Array.isArray(
          candidate[0]
        )
      ) {
        const points =
          normalizeCoordinateArray(
            candidate,
            "latlng"
          );

        if (points.length >= 2) {
          return points;
        }
      }

      const normalized =
        candidate
          .map((item) =>
            normalizePoint(item)
          )
          .filter(Boolean);

      if (
        normalized.length >= 2
      ) {
        return normalized;
      }
    }

    if (
      typeof candidate ===
        "object"
    ) {
      const nested =
        extractCoordinatesFromValue(
          candidate
        );

      if (
        nested.length >= 2
      ) {
        return nested;
      }
    }
  }

  return [];
}

/* ==========================================================================
   BACKEND ROUTE
   ========================================================================== */

function extractRoutePoints(result) {
  if (!result) {
    return [];
  }

  const candidates = [
    result.route_geometry,
    result.routeGeometry,
    result.geometry,

    result.route?.geometry,
    result.route?.coordinates,
    result.route?.path,
    result.route?.points,
    result.route?.polyline,
    result.route?.polyline_points,

    result.path,
    result.points,
    result.polyline,
    result.polyline_points,

    result.data?.route_geometry,
    result.data?.routeGeometry,
    result.data?.geometry,

    result.data?.route?.geometry,
    result.data?.route?.coordinates,
    result.data?.route?.path,
    result.data?.route?.points,
  ];

  for (
    const candidate of candidates
  ) {
    const points =
      extractCoordinatesFromValue(
        candidate
      );

    if (
      points.length >= 2
    ) {
      return points;
    }
  }

  return [];
}

/* ==========================================================================
   TRANSFER POINTS
   ========================================================================== */

function extractTransferPoints(
  result
) {
  if (!result) {
    return [];
  }

  const transfers =
    result?.transfer_lanes ??
    result?.transferLanes ??
    result?.route
      ?.transfer_lanes ??
    result?.route
      ?.transferLanes ??
    result?.transfers ??
    result?.route?.transfers ??
    result?.data
      ?.transfer_lanes ??
    result?.data
      ?.transferLanes ??
    result?.data
      ?.transfers ??
    [];

  if (
    !Array.isArray(transfers)
  ) {
    return [];
  }

  const points = [];

  transfers.forEach(
    (transfer) => {
      if (!transfer) {
        return;
      }

      const label =
        transfer.name ||
        transfer.branch_name ||
        transfer.branch?.name ||
        transfer.code ||
        "Transfer";

      const candidates = [
        transfer.coordinates,
        transfer.coordinate,
        transfer.location,
        transfer.point,
        transfer.geometry,
        transfer.branch_location,
        transfer.transfer_location,
      ];

      for (
        const candidate of candidates
      ) {
        const normalized =
          normalizePoint(
            candidate
          );

        if (normalized) {
          points.push({
            ...normalized,
            type: "transfer",
            label,
          });

          return;
        }

        const nested =
          extractCoordinatesFromValue(
            candidate
          );

        if (
          nested.length > 0
        ) {
          points.push({
            ...nested[0],
            type: "transfer",
            label,
          });

          return;
        }
      }

      const direct =
        normalizePoint({
          latitude:
            transfer.latitude ??
            transfer.lat ??
            transfer.branch
              ?.latitude ??
            transfer.branch?.lat,

          longitude:
            transfer.longitude ??
            transfer.lng ??
            transfer.lon ??
            transfer.branch
              ?.longitude ??
            transfer.branch?.lng,
        });

      if (direct) {
        points.push({
          ...direct,
          type: "transfer",
          label,
        });
      }
    }
  );

  return points;
}

/* ==========================================================================
   OSRM
   ========================================================================== */

async function fetchRoadRoute(
  points
) {
  if (
    !Array.isArray(points) ||
    points.length < 2
  ) {
    return [];
  }

  try {
    const coordinates =
      points
        .map(
          (point) =>
            `${point.longitude},${point.latitude}`
        )
        .join(";");

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${coordinates}` +
      `?overview=full&geometries=geojson`;

    const response =
      await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json();

    const geometry =
      data?.routes?.[0]
        ?.geometry
        ?.coordinates;

    if (
      !Array.isArray(
        geometry
      ) ||
      geometry.length < 2
    ) {
      return [];
    }

    return geometry
      .map((coordinate) => {
        const longitude =
          Number(
            coordinate?.[0]
          );

        const latitude =
          Number(
            coordinate?.[1]
          );

        if (
          !isValidCoordinate(
            latitude,
            longitude
          )
        ) {
          return null;
        }

        return {
          latitude,
          longitude,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error(
      "Unable to load road route:",
      error
    );

    return [];
  }
}

/* ==========================================================================
   COMPONENT
   ========================================================================== */

function PricingMap({
  points = [],
  stores = [],
  delivery = null,
  result = null,

  /*
   * This is now the controlled location
   * coming from the latitude/longitude
   * input fields.
   */
  selectedLocation = null,

  /*
   * Called when user clicks the map.
   */
  onSelect = null,

  height = 480,

  className = "",

  mode = null,

  /*
   * If true, clicking map is enabled.
   */
  selectable = true,
}) {
  const containerRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const markersRef =
    useRef([]);

  const routeLayerRef =
    useRef(null);

  const selectedMarkerRef =
    useRef(null);

  const requestIdRef =
    useRef(0);

  const onSelectRef =
    useRef(onSelect);

  useEffect(() => {
    onSelectRef.current =
      onSelect;
  }, [onSelect]);

  /* ==========================================================================
     SHIPMENT POINTS
     ========================================================================== */

  const shipmentPoints =
    useMemo(() => {
      const resultPoints = [];

      /*
       * Pickup stores.
       */
      if (
        Array.isArray(stores)
      ) {
        stores.forEach(
          (store) => {
            const point =
              normalizePoint({
                latitude:
                  store?.pickup_latitude,
                longitude:
                  store?.pickup_longitude,
              });

            if (point) {
              resultPoints.push({
                ...point,
                type: "pickup",
                label:
                  store?.external_store_id ||
                  store?.name ||
                  "Pickup",
              });
            }
          }
        );
      }

      /*
       * Configured transfer lanes.
       */
      const transfers =
        extractTransferPoints(
          result
        );

      transfers.forEach(
        (point) => {
          resultPoints.push(
            point
          );
        }
      );

      /*
       * Delivery.
       */
      const deliveryPoint =
        normalizePoint(
          delivery
        );

      if (deliveryPoint) {
        resultPoints.push({
          ...deliveryPoint,
          type: "delivery",
          label: "Delivery",
        });
      }

      /*
       * If the map is being used as a
       * picker, show the selected point.
       */
      if (
        resultPoints.length === 0 &&
        selectedLocation
      ) {
        const selected =
          normalizePoint(
            selectedLocation
          );

        if (selected) {
          resultPoints.push({
            ...selected,
            type:
              mode === "delivery"
                ? "delivery"
                : "pickup",
            label:
              mode === "delivery"
                ? "Delivery"
                : "Pickup",
          });
        }
      }

      /*
       * Fallback points.
       */
      if (
        resultPoints.length === 0 &&
        Array.isArray(points)
      ) {
        points.forEach(
          (point, index) => {
            const normalized =
              normalizePoint(
                point
              );

            if (normalized) {
              resultPoints.push({
                ...normalized,

                type:
                  index ===
                  points.length - 1
                    ? "delivery"
                    : "pickup",

                label:
                  index ===
                  points.length - 1
                    ? "Delivery"
                    : `Pickup ${
                        index + 1
                      }`,
              });
            }
          }
        );
      }

      /*
       * Deduplicate.
       */
      const unique =
        new Map();

      resultPoints.forEach(
        (point) => {
          const key =
            `${point.type}:${getPointKey(
              point
            )}`;

          if (
            !unique.has(key)
          ) {
            unique.set(
              key,
              point
            );
          }
        }
      );

      return Array.from(
        unique.values()
      );
    }, [
      stores,
      delivery,
      result,
      selectedLocation,
      points,
      mode,
    ]);

  /* ==========================================================================
     CREATE MAP
     ========================================================================== */

  useEffect(() => {
    if (
      !containerRef.current ||
      mapRef.current
    ) {
      return undefined;
    }

    const map =
      L.map(
        containerRef.current,
        {
          center:
            DEFAULT_CENTER,

          zoom:
            DEFAULT_ZOOM,

          zoomControl: true,

          attributionControl: true,
        }
      );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,

        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }
    ).addTo(map);

    if (selectable) {
      map.on(
        "click",
        (event) => {
          const callback =
            onSelectRef.current;

          if (
            typeof callback !==
            "function"
          ) {
            return;
          }

          const latitude =
            Number(
              event.latlng.lat
            );

          const longitude =
            Number(
              event.latlng.lng
            );

          if (
            !isValidCoordinate(
              latitude,
              longitude
            )
          ) {
            return;
          }

          callback({
            latitude,
            longitude,

            address:
              `${latitude.toFixed(
                6
              )}, ${longitude.toFixed(
                6
              )}`,
          });
        }
      );
    }

    mapRef.current =
      map;

    const timer =
      setTimeout(() => {
        map.invalidateSize();
      }, 150);

    return () => {
      clearTimeout(timer);

      try {
        map.off();
        map.remove();
      } catch {
        // Ignore.
      }

      mapRef.current =
        null;
    };
  }, [selectable]);

  /* ==========================================================================
     INVALIDATE SIZE
     ========================================================================== */

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const timer =
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);

    return () =>
      clearTimeout(timer);
  }, [height]);

  /* ==========================================================================
     DRAW MARKERS
     ========================================================================== */

  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    markersRef.current.forEach(
      (marker) => {
        try {
          marker.remove();
        } catch {
          // Ignore.
        }
      }
    );

    markersRef.current = [];

    shipmentPoints.forEach(
      (point) => {
        const marker =
          L.marker(
            [
              point.latitude,
              point.longitude,
            ],
            {
              icon:
                createMarkerIcon(
                  point.type
                ),
            }
          ).addTo(map);

        marker.bindPopup(`
          <div style="min-width:160px">
            <strong>
              ${point.label}
            </strong>

            <br />

            <span>
              ${point.latitude.toFixed(
                6
              )},
              ${point.longitude.toFixed(
                6
              )}
            </span>
          </div>
        `);

        markersRef.current.push(
          marker
        );
      }
    );

    /*
     * Do not automatically fit the map
     * when a user is manually entering
     * coordinates into the picker.
     */
    if (
      shipmentPoints.length > 0 &&
      !selectedLocation
    ) {
      const bounds =
        L.latLngBounds(
          shipmentPoints.map(
            (point) => [
              point.latitude,
              point.longitude,
            ]
          )
        );

      if (bounds.isValid()) {
        map.fitBounds(
          bounds,
          {
            padding: [
              50,
              50,
            ],

            maxZoom: 15,
          }
        );
      }
    }
  }, [
    shipmentPoints,
    selectedLocation,
  ]);

  /* ==========================================================================
     SELECTED LOCATION MARKER
     ========================================================================== */

  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    if (
      selectedMarkerRef.current
    ) {
      try {
        selectedMarkerRef.current.remove();
      } catch {
        // Ignore.
      }

      selectedMarkerRef.current =
        null;
    }

    const selected =
      normalizePoint(
        selectedLocation
      );

    if (!selected) {
      return;
    }

    const marker =
      L.marker(
        [
          selected.latitude,
          selected.longitude,
        ],
        {
          icon:
            createMarkerIcon(
              mode === "delivery"
                ? "delivery"
                : "pickup"
            ),

          zIndexOffset: 1000,
        }
      ).addTo(map);

    marker.bindPopup(`
      <div style="min-width:150px">
        <strong>
          ${
            mode === "delivery"
              ? "Delivery"
              : "Pickup"
          }
        </strong>

        <br />

        <span>
          ${selected.latitude.toFixed(
            6
          )},
          ${selected.longitude.toFixed(
            6
          )}
        </span>
      </div>
    `);

    selectedMarkerRef.current =
      marker;

    /*
     * Move the map to the manually
     * entered coordinates.
     */
    map.setView(
      [
        selected.latitude,
        selected.longitude,
      ],
      Math.max(
        map.getZoom(),
        15
      ),
      {
        animate: false,
      }
    );
  }, [
    selectedLocation,
    mode,
  ]);

  /* ==========================================================================
     DRAW ROUTE
     ========================================================================== */

  useEffect(() => {
    const map =
      mapRef.current;

    if (!map) {
      return undefined;
    }

    if (
      routeLayerRef.current
    ) {
      try {
        routeLayerRef.current.remove();
      } catch {
        // Ignore.
      }

      routeLayerRef.current =
        null;
    }

    /*
     * Backend route takes priority.
     */
    const backendRoute =
      extractRoutePoints(
        result
      );

    if (
      backendRoute.length >= 2
    ) {
      const polyline =
        L.polyline(
          backendRoute.map(
            (point) => [
              point.latitude,
              point.longitude,
            ]
          ),
          {
            weight: 5,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }
        ).addTo(map);

      routeLayerRef.current =
        polyline;

      return undefined;
    }

    /*
     * OSRM fallback.
     */
    const routingPoints =
      shipmentPoints.map(
        (point) => ({
          latitude:
            point.latitude,

          longitude:
            point.longitude,
        })
      );

    if (
      routingPoints.length < 2
    ) {
      return undefined;
    }

    const requestId =
      ++requestIdRef.current;

    let cancelled = false;

    fetchRoadRoute(
      routingPoints
    ).then(
      (roadPoints) => {
        if (
          cancelled ||
          requestId !==
            requestIdRef.current ||
          !mapRef.current
        ) {
          return;
        }

        if (
          roadPoints.length < 2
        ) {
          return;
        }

        const polyline =
          L.polyline(
            roadPoints.map(
              (point) => [
                point.latitude,
                point.longitude,
              ]
            ),
            {
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }
          ).addTo(
            mapRef.current
          );

        routeLayerRef.current =
          polyline;
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    shipmentPoints,
    result,
  ]);

  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <div
      ref={containerRef}
      className={
        className ||
        "pricing-leaflet-map"
      }
      style={{
        width: "100%",

        height:
          typeof height ===
          "number"
            ? `${height}px`
            : height,

        minHeight:
          typeof height ===
          "number"
            ? `${height}px`
            : "300px",

        position: "relative",

        zIndex: 0,

        cursor:
          selectable
            ? "crosshair"
            : "default",
      }}
    />
  );
}

export default PricingMap;