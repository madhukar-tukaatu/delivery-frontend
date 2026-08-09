"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [27.7172, 85.324];

const DEFAULT_ZOOM = 7;

/*
 * OSRM public demo server.
 *
 * IMPORTANT:
 * This is good for development/testing.
 * For production, use your own OSRM instance
 * or proxy this request through your backend.
 */
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

function createNumberedIcon(number, isFirst, isLast) {
  let background = "#1677ff";

  if (isFirst) {
    background = "#52c41a";
  }

  if (isLast) {
    background = "#ff4d4f";
  }

  return L.divIcon({
    className: "route-map-marker",
    html: `
      <div
        style="
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: ${background};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 14px;
        "
      >
        ${number}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

function normalizeNode(node) {
  if (!node) {
    return null;
  }

  const latitude = Number(
    node.latitude ??
      node.lat ??
      node.location?.latitude ??
      node.location?.lat,
  );

  const longitude = Number(
    node.longitude ??
      node.lng ??
      node.lon ??
      node.location?.longitude ??
      node.location?.lng ??
      node.location?.lon,
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    ...node,
    latitude,
    longitude,
  };
}

/**
 * Fit map to the complete road route.
 */
function FitBounds({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (!coordinates?.length) {
      return;
    }

    const bounds = L.latLngBounds(
      coordinates.map(([lat, lng]) => [lat, lng]),
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [30, 30],
      });
    }
  }, [coordinates, map]);

  return null;
}

export default function RouteMapS({
  nodes = [],
  height = 300,
  selectedLabel = "Route",
}) {
  const [roadGeometry, setRoadGeometry] = useState([]);
  const [routingLoading, setRoutingLoading] =
    useState(false);
  const [routingError, setRoutingError] =
    useState(null);

  const normalizedNodes = useMemo(() => {
    return nodes
      .map(normalizeNode)
      .filter(Boolean);
  }, [nodes]);

  const markerCoordinates = useMemo(() => {
    return normalizedNodes.map((node) => [
      node.latitude,
      node.longitude,
    ]);
  }, [normalizedNodes]);

  const center = useMemo(() => {
    if (markerCoordinates.length) {
      return markerCoordinates[0];
    }

    return DEFAULT_CENTER;
  }, [markerCoordinates]);

  /*
   * Fetch ACTUAL ROAD ROUTE from OSRM.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadRoadRoute() {
      setRoutingError(null);
      setRoadGeometry([]);

      /*
       * A single branch cannot create a road route.
       */
      if (normalizedNodes.length < 2) {
        return;
      }

      try {
        setRoutingLoading(true);

        /*
         * OSRM expects:
         *
         * longitude,latitude
         *
         * not:
         *
         * latitude,longitude
         */
        const coordinates = normalizedNodes
          .map(
            (node) =>
              `${node.longitude},${node.latitude}`,
          )
          .join(";");

        const url =
          `${OSRM_URL}/${coordinates}` +
          `?overview=full` +
          `&geometries=geojson` +
          `&steps=false`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Routing server returned ${response.status}`,
          );
        }

        const result = await response.json();

        if (
          result.code !== "Ok" ||
          !result.routes?.length
        ) {
          throw new Error(
            "No road route was found.",
          );
        }

        const geometry =
          result.routes[0]?.geometry?.coordinates ||
          [];

        /*
         * GeoJSON coordinates are:
         *
         * [longitude, latitude]
         *
         * Leaflet expects:
         *
         * [latitude, longitude]
         */
        const leafletCoordinates =
          geometry
            .map(([lng, lat]) => [
              Number(lat),
              Number(lng),
            ])
            .filter(
              ([lat, lng]) =>
                Number.isFinite(lat) &&
                Number.isFinite(lng),
            );

        if (!leafletCoordinates.length) {
          throw new Error(
            "Routing server returned an empty road geometry.",
          );
        }

        if (!cancelled) {
          setRoadGeometry(
            leafletCoordinates,
          );
        }
      } catch (error) {
        console.error(
          "Could not calculate road route:",
          error,
        );

        if (!cancelled) {
          setRoutingError(
            error?.message ||
              "Could not calculate road route.",
          );

          /*
           * Do NOT leave the map empty.
           *
           * Fall back to the branch-to-branch
           * coordinates so the user can still
           * see the route points.
           */
          setRoadGeometry(
            markerCoordinates,
          );
        }
      } finally {
        if (!cancelled) {
          setRoutingLoading(false);
        }
      }
    }

    loadRoadRoute();

    return () => {
      cancelled = true;
    };
  }, [
    normalizedNodes,
    markerCoordinates,
  ]);

  const displayGeometry =
    roadGeometry.length >= 2
      ? roadGeometry
      : markerCoordinates;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        overflow: "hidden",
        borderRadius: 12,
      }}
    >
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{
          width: "100%",
          height: "100%",
        }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {displayGeometry.length >= 2 ? (
          <>
            <Polyline
              positions={displayGeometry}
              pathOptions={{
                color: "#1677ff",
                weight: 6,
                opacity: 0.9,
              }}
            />

            {/* White border underneath the blue route */}
            <Polyline
              positions={displayGeometry}
              pathOptions={{
                color: "#ffffff",
                weight: 10,
                opacity: 0.75,
              }}
            />

            {/* Blue route on top */}
            <Polyline
              positions={displayGeometry}
              pathOptions={{
                color: "#1677ff",
                weight: 5,
                opacity: 0.95,
              }}
            />
          </>
        ) : null}

        {normalizedNodes.map(
          (node, index) => {
            const isFirst =
              index === 0;

            const isLast =
              index ===
              normalizedNodes.length - 1;

            return (
              <Marker
                key={
                  node.id ??
                  `${node.latitude}-${node.longitude}-${index}`
                }
                position={[
                  node.latitude,
                  node.longitude,
                ]}
                icon={createNumberedIcon(
                  index + 1,
                  isFirst,
                  isLast,
                )}
              >
                <Popup>
                  <div>
                    <strong>
                      {node.name ||
                        `Branch ${
                          index + 1
                        }`}
                    </strong>

                    <br />

                    <span
                      style={{
                        color:
                          "#666",
                      }}
                    >
                      Stop{" "}
                      {index + 1}
                    </span>

                    <br />

                    <span
                      style={{
                        fontSize: 12,
                      }}
                    >
                      {node.latitude.toFixed(
                        6,
                      )}
                      ,{" "}
                      {node.longitude.toFixed(
                        6,
                      )}
                    </span>
                  </div>
                </Popup>
              </Marker>
            );
          },
        )}

        <FitBounds
          coordinates={
            displayGeometry
          }
        />
      </MapContainer>

      {/* Routing status */}
      {routingLoading ? (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 1000,
            background:
              "rgba(255,255,255,.95)",
            padding:
              "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            boxShadow:
              "0 2px 8px rgba(0,0,0,.15)",
          }}
        >
          Calculating road route...
        </div>
      ) : null}

      {routingError ? (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            right: 10,
            zIndex: 1000,
            background:
              "rgba(255,255,255,.95)",
            padding:
              "7px 10px",
            borderRadius: 6,
            fontSize: 11,
            color: "#d4380d",
            boxShadow:
              "0 2px 8px rgba(0,0,0,.12)",
          }}
        >
          Road routing unavailable.
          Showing branch coordinates.
        </div>
      ) : null}

      {/* Empty state */}
      {!normalizedNodes.length ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "rgba(255,255,255,.8)",
            color: "#666",
            textAlign: "center",
            padding: 20,
          }}
        >
          <div>
            <strong>
              Branch coordinates unavailable
            </strong>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
              }}
            >
              Add latitude and longitude
              to the branches to display
              the route.
            </div>
          </div>
        </div>
      ) : null}

      {normalizedNodes.length === 1 ? (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            right: 10,
            zIndex: 1000,
            background:
              "rgba(255,255,255,.95)",
            padding:
              "7px 10px",
            borderRadius: 6,
            fontSize: 11,
          }}
        >
          {selectedLabel}: only one mapped
          branch is available.
        </div>
      ) : null}
    </div>
  );
}