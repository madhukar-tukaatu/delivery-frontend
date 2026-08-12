"use client";

import React, {
  useEffect,
  useMemo,
} from "react";

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";

/* -------------------------------------------------------------------------- */
/* Leaflet icons                                                              */
/* -------------------------------------------------------------------------- */

const pickupIcon = new L.DivIcon({
  className: "custom-map-marker",
  html: `
    <div class="marker-pin marker-pickup">
      <span>●</span>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

const deliveryIcon = new L.DivIcon({
  className: "custom-map-marker",
  html: `
    <div class="marker-pin marker-delivery">
      <span>●</span>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

const transferIcon = new L.DivIcon({
  className: "custom-map-marker",
  html: `
    <div class="marker-pin marker-transfer">
      <span>●</span>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function extractCoordinates(value) {
  if (!value) return null;

  if (
    Array.isArray(value) &&
    value.length >= 2
  ) {
    const first = Number(value[0]);
    const second = Number(value[1]);

    if (
      Number.isFinite(first) &&
      Number.isFinite(second)
    ) {
      /*
       * GeoJSON is [longitude, latitude].
       */
      if (
        Math.abs(first) > 90 &&
        Math.abs(second) <= 90
      ) {
        return [second, first];
      }

      /*
       * Leaflet style [latitude, longitude].
       */
      return [first, second];
    }
  }

  if (
    typeof value === "object"
  ) {
    const latitude = Number(
      value.latitude ??
        value.lat ??
        value.y
    );

    const longitude = Number(
      value.longitude ??
        value.lng ??
        value.lon ??
        value.x
    );

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      return [latitude, longitude];
    }
  }

  return null;
}

function geometryToLatLngs(
  geometry
) {
  if (!geometry) {
    return [];
  }

  /*
   * GeoJSON Feature
   */
  if (
    geometry.type === "Feature" &&
    geometry.geometry
  ) {
    return geometryToLatLngs(
      geometry.geometry
    );
  }

  /*
   * GeoJSON LineString
   */
  if (
    geometry.type === "LineString" &&
    Array.isArray(
      geometry.coordinates
    )
  ) {
    return geometry.coordinates
      .map(extractCoordinates)
      .filter(Boolean);
  }

  /*
   * GeoJSON MultiLineString
   */
  if (
    geometry.type ===
      "MultiLineString" &&
    Array.isArray(
      geometry.coordinates
    )
  ) {
    return geometry.coordinates
      .flatMap((line) =>
        line
          .map(extractCoordinates)
          .filter(Boolean)
      );
  }

  /*
   * Direct coordinate array
   */
  if (Array.isArray(geometry)) {
    return geometry
      .map(extractCoordinates)
      .filter(Boolean);
  }

  return [];
}

function pointsToLatLngs(
  points
) {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .map(extractCoordinates)
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Fit map to locations                                                       */
/* -------------------------------------------------------------------------- */

function FitBounds({
  markers,
  route,
}) {
  const map = useMap();

  useEffect(() => {
    const coordinates = [
      ...(markers || []).map(
        (marker) => [
          marker.latitude,
          marker.longitude,
        ]
      ),
      ...(route || []),
    ].filter(
      (point) =>
        Array.isArray(point) &&
        Number.isFinite(
          Number(point[0])
        ) &&
        Number.isFinite(
          Number(point[1])
        )
    );

    if (!coordinates.length) {
      return;
    }

    if (coordinates.length === 1) {
      map.setView(
        coordinates[0],
        12
      );

      return;
    }

    const bounds =
      L.latLngBounds(
        coordinates
      );

    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 10,
    });
  }, [map, markers, route]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Click selector                                                             */
/* -------------------------------------------------------------------------- */

function MapClickHandler({
  enabled,
  onSelect,
}) {
  useMapEvents({
    click(event) {
      if (!enabled) {
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
       * We deliberately do not use the Leaflet map
       * object as a React child.
       */
      onSelect({
        latitude,
        longitude,
        address: `${latitude.toFixed(
          6
        )}, ${longitude.toFixed(6)}`,
      });
    },
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Main map                                                                  */
/* -------------------------------------------------------------------------- */

export default function ShipmentMap({
  center = [28.3949, 84.124],
  markers = [],
  mode = null,
  geometry = null,
  routePoints = [],
  onSelect,
  height = "100%",
}) {
  const route = useMemo(() => {
    const fromGeometry =
      geometryToLatLngs(
        geometry
      );

    if (fromGeometry.length >= 2) {
      return fromGeometry;
    }

    return pointsToLatLngs(
      routePoints
    );
  }, [geometry, routePoints]);

  return (
    <div
      className={`shipment-leaflet-map ${
        mode
          ? "map-select-mode"
          : ""
      }`}
      style={{
        height,
        width: "100%",
      }}
    >
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler
          enabled={Boolean(mode)}
          onSelect={onSelect}
        />

        <FitBounds
          markers={markers}
          route={route}
        />

        {/* ================================================================ */}
        {/* Backend calculated route                                         */}
        {/* ================================================================ */}

        {route.length >= 2 && (
          <>
            <Polyline
              positions={route}
              pathOptions={{
                color: "#1677ff",
                weight: 5,
                opacity: 0.85,
              }}
            />

            <Polyline
              positions={route}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {/* ================================================================ */}
        {/* Selected pickup / delivery points                                 */}
        {/* ================================================================ */}

        {markers.map(
          (marker) => {
            const position = [
              Number(
                marker.latitude
              ),
              Number(
                marker.longitude
              ),
            ];

            const icon =
              marker.type ===
              "delivery"
                ? deliveryIcon
                : marker.type ===
                  "transfer"
                ? transferIcon
                : pickupIcon;

            return (
              <Marker
                key={marker.id}
                position={position}
                icon={icon}
              >
                <Popup>
                  <div
                    style={{
                      minWidth: 180,
                    }}
                  >
                    <strong>
                      {marker.label}
                    </strong>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color:
                          "#64748b",
                      }}
                    >
                      {marker.address ||
                        "Selected location"}
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontFamily:
                          "monospace",
                        fontSize: 10,
                      }}
                    >
                      {Number(
                        marker.latitude
                      ).toFixed(6)}
                      ,{" "}
                      {Number(
                        marker.longitude
                      ).toFixed(6)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          }
        )}
      </MapContainer>

      {mode && (
        <div className="map-crosshair">
          <div className="crosshair-ring">
            +
          </div>
          <span>
            Click to select location
          </span>
        </div>
      )}

      <style jsx global>{`
        .shipment-leaflet-map {
          position: relative;
          overflow: hidden;
          background: #e2e8f0;
        }

        .shipment-leaflet-map
          .leaflet-container {
          width: 100%;
          height: 100%;
          font-family: inherit;
        }

        .custom-map-marker {
          background: transparent !important;
          border: none !important;
        }

        .marker-pin {
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          box-shadow:
            0 2px 8px
              rgba(
                15,
                23,
                42,
                0.28
              );
        }

        .marker-pin span {
          transform: rotate(45deg);
          color: #ffffff;
          font-size: 13px;
        }

        .marker-pickup {
          background: #16a34a;
        }

        .marker-delivery {
          background: #1677ff;
        }

        .marker-transfer {
          background: #7c3aed;
        }

        .map-select-mode
          .leaflet-container {
          cursor: crosshair;
        }

        .map-crosshair {
          position: absolute;
          z-index: 1000;
          left: 50%;
          top: 50%;
          transform: translate(
            -50%,
            -50%
          );
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .crosshair-ring {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(
            255,
            255,
            255,
            0.9
          );
          border: 2px solid #1677ff;
          color: #1677ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 300;
          box-shadow:
            0 2px 12px
              rgba(
                15,
                23,
                42,
                0.18
              );
        }

        .map-crosshair span {
          background: #ffffff;
          border: 1px solid #dbe5f1;
          border-radius: 5px;
          padding: 3px 7px;
          font-size: 9px;
          color: #475569;
          box-shadow:
            0 2px 6px
              rgba(
                15,
                23,
                42,
                0.1
              );
        }

        .leaflet-popup-content {
          margin: 10px 12px;
        }

        .leaflet-control-zoom {
          border: 0 !important;
          box-shadow:
            0 2px 8px
              rgba(
                15,
                23,
                42,
                0.15
              ) !important;
        }
      `}</style>
    </div>
  );
}