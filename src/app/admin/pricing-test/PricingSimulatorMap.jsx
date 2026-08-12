"use client";

import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

const DEFAULT_CENTER = [
  28.3949,
  84.124,
];

const DEFAULT_ZOOM = 7;

/* -------------------------------------------------------------------------- */
/* Fix Leaflet marker icons                                                   */
/* -------------------------------------------------------------------------- */

delete L.Icon.Default.prototype
  ._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/* -------------------------------------------------------------------------- */
/* Map fitting                                                                */
/* -------------------------------------------------------------------------- */

function FitRoute({
  nodes,
  branches,
}) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    nodes.forEach(
      (node) => {
        const lat =
          Number(
            node.latitude,
          );

        const lng =
          Number(
            node.longitude,
          );

        if (
          Number.isFinite(
            lat,
          ) &&
          Number.isFinite(
            lng,
          )
        ) {
          points.push([
            lat,
            lng,
          ]);
        }
      },
    );

    if (!points.length) {
      const branchPoints =
        branches
          .map(
            (branch) => [
              Number(
                branch.latitude,
              ),
              Number(
                branch.longitude,
              ),
            ],
          )
          .filter(
            ([lat, lng]) =>
              Number.isFinite(
                lat,
              ) &&
              Number.isFinite(
                lng,
              ),
          );

      if (
        branchPoints.length
      ) {
        const bounds =
          L.latLngBounds(
            branchPoints,
          );

        map.fitBounds(
          bounds,
          {
            padding: [
              40,
              40,
            ],
            maxZoom: 10,
          },
        );
      }

      return;
    }

    if (points.length === 1) {
      map.setView(
        points[0],
        11,
      );

      return;
    }

    const bounds =
      L.latLngBounds(
        points,
      );

    map.fitBounds(
      bounds,
      {
        padding: [
          60,
          60,
        ],
        maxZoom: 12,
      },
    );
  }, [
    nodes,
    branches,
    map,
  ]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Custom marker                                                             */
/* -------------------------------------------------------------------------- */

function createRoleIcon(
  role,
  sequence,
) {
  const background =
    role === "pickup"
      ? "#52c41a"
      : role === "delivery"
      ? "#1677ff"
      : "#722ed1";

  const label =
    role === "pickup"
      ? "P"
      : role === "delivery"
      ? "D"
      : sequence;

  return L.divIcon({
    className:
      "pricing-simulator-marker",

    html: `
      <div
        style="
          width:34px;
          height:34px;
          border-radius:50%;
          background:${background};
          color:white;
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,.35);
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:700;
          font-size:12px;
        "
      >
        ${label}
      </div>
    `,

    iconSize: [
      34,
      34,
    ],

    iconAnchor: [
      17,
      17,
    ],
  });
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function PricingSimulatorMap({
  branches = [],
  nodes = [],
  activeLocation,
  onSelectBranch,
  loading = false,
}) {
  const mapRef =
    useRef(null);

  const routeCoordinates =
    useMemo(
      () =>
        nodes
          .map(
            (node) => {
              const lat =
                Number(
                  node.latitude,
                );

              const lng =
                Number(
                  node.longitude,
                );

              if (
                !Number.isFinite(
                  lat,
                ) ||
                !Number.isFinite(
                  lng,
                )
              ) {
                return null;
              }

              return [
                lat,
                lng,
              ];
            },
          )
          .filter(Boolean),
      [nodes],
    );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position:
          "relative",
      }}
    >
      <MapContainer
        center={
          DEFAULT_CENTER
        }
        zoom={
          DEFAULT_ZOOM
        }
        style={{
          width: "100%",
          height: "100%",
        }}
        scrollWheelZoom
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitRoute
          nodes={nodes}
          branches={
            branches
          }
        />

        {/* -------------------------------------------------------------- */}
        {/* All branch pins                                                */}
        {/* -------------------------------------------------------------- */}

        {branches.map(
          (branch) => {
            const lat =
              Number(
                branch.latitude,
              );

            const lng =
              Number(
                branch.longitude,
              );

            if (
              !Number.isFinite(
                lat,
              ) ||
              !Number.isFinite(
                lng,
              )
            ) {
              return null;
            }

            const routeNode =
              nodes.find(
                (node) =>
                  Number(
                    node.id,
                  ) ===
                  Number(
                    branch.id,
                  ),
              );

            const icon =
              routeNode
                ? createRoleIcon(
                    routeNode.role,
                    routeNode.sequence,
                  )
                : undefined;

            return (
              <Marker
                key={
                  branch.id
                }
                position={[
                  lat,
                  lng,
                ]}
                icon={
                  icon ||
                  L.Icon.Default.prototype
                }
                eventHandlers={{
                  click: () =>
                    onSelectBranch(
                      branch,
                    ),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[
                    0,
                    -12,
                  ]}
                >
                  <div>
                    <strong>
                      {
                        branch.name
                      }
                    </strong>

                    {branch.code ? (
                      <>
                        <br />
                        <span>
                          {
                            branch.code
                          }
                        </span>
                      </>
                    ) : null}

                    <br />

                    <small>
                      Click to set{" "}
                      {
                        activeLocation
                      }
                    </small>
                  </div>
                </Tooltip>
              </Marker>
            );
          },
        )}

        {/* -------------------------------------------------------------- */}
        {/* Route line                                                     */}
        {/* -------------------------------------------------------------- */}

        {routeCoordinates.length >
        1 ? (
          <Polyline
            positions={
              routeCoordinates
            }
            pathOptions={{
              color:
                "#1677ff",
              weight: 5,
              opacity: 0.85,
            }}
          />
        ) : null}
      </MapContainer>

      {loading ? (
        <div
          style={{
            position:
              "absolute",
            inset: 0,
            zIndex: 900,
            background:
              "rgba(255,255,255,.55)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
          }}
        >
          Loading branches...
        </div>
      ) : null}
    </div>
  );
}