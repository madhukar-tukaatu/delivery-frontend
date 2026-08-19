"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function firstNumber(values = []) {
  for (const value of values) {
    const number = toNumber(value);

    if (number !== null) {
      return number;
    }
  }

  return null;
}

function getLatitude(item) {
  if (!item) {
    return null;
  }

  return firstNumber([
    item.latitude,
    item.lat,

    item.location?.latitude,
    item.location?.lat,

    item.coordinates?.latitude,
    item.coordinates?.lat,

    item.geo?.latitude,
    item.geo?.lat,
  ]);
}

function getLongitude(item) {
  if (!item) {
    return null;
  }

  return firstNumber([
    item.longitude,
    item.lng,
    item.lon,

    item.location?.longitude,
    item.location?.lng,
    item.location?.lon,

    item.coordinates?.longitude,
    item.coordinates?.lng,
    item.coordinates?.lon,

    item.geo?.longitude,
    item.geo?.lng,
    item.geo?.lon,
  ]);
}

function getPoint(item) {
  if (!item) {
    return null;
  }

  const lat = getLatitude(item);
  const lng = getLongitude(item);

  if (lat === null || lng === null) {
    return null;
  }

  return {
    lat,
    lng,
  };
}

function hasPoint(point) {
  return (
    Number.isFinite(point?.lat) &&
    Number.isFinite(point?.lng)
  );
}

function formatLocation(item) {
  if (!item) {
    return "-";
  }

  return (
    [
      item.name,
      item.area,
      item.city,
    ]
      .filter(Boolean)
      .join(", ") || "-"
  );
}

function getBranchLabel(branch) {
  if (!branch) {
    return "-";
  }

  return (
    branch.name ||
    branch.branch_name ||
    branch.title ||
    branch.code ||
    `Branch #${branch.id ?? "-"}`
  );
}

/*
|--------------------------------------------------------------------------
| Pin icons
|--------------------------------------------------------------------------
*/

function createPinIcon({
  color,
  label,
  size = 34,
  borderColor = "#ffffff",
}) {
  return L.divIcon({
    className: "",

    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        background: ${color};
        transform: rotate(-45deg);
        border: 3px solid ${borderColor};
        box-shadow: 0 4px 12px rgba(0,0,0,0.28);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: #ffffff;
          font-size: ${
            size >= 40 ? "10px" : "12px"
          };
          font-weight: 800;
          font-family: Arial, sans-serif;
          line-height: 1;
          white-space: nowrap;
        ">
          ${label}
        </span>
      </div>
    `,

    iconSize: [size, size],

    iconAnchor: [
      size / 2,
      size,
    ],

    popupAnchor: [
      0,
      -size,
    ],
  });
}

const ICONS = {
  merchant: createPinIcon({
    color: "#16a34a",
    label: "M",
  }),

  branch: createPinIcon({
    color: "#2563eb",
    label: "B",
  }),

  sub_branch: createPinIcon({
    color: "#f59e0b",
    label: "S",
  }),

  assigned_branch: createPinIcon({
    color: "#1d4ed8",
    label: "AB",
  }),

  assigned_sub_branch: createPinIcon({
    color: "#d97706",
    label: "AS",
  }),

  /*
   * This is only for the branch currently selected
   * by the admin in the form.
   */
  selected_branch: createPinIcon({
    color: "#7c3aed",
    label: "SB",
    size: 42,
  }),

  selected_sub_branch: createPinIcon({
    color: "#ea580c",
    label: "SS",
    size: 42,
  }),
};

/*
|--------------------------------------------------------------------------
| Lines
|--------------------------------------------------------------------------
*/

const LINE_OPTIONS = {
  color: "#2563eb",
  weight: 4,
  opacity: 0.75,
};

const SELECTED_LINE_OPTIONS = {
  color: "#7c3aed",
  weight: 4,
  opacity: 0.8,
};

/*
|--------------------------------------------------------------------------
| Move map to selected branch
|--------------------------------------------------------------------------
*/

function FocusSelectedLocation({
  point,
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !hasPoint(point)) {
      return;
    }

    map.flyTo(
      [
        point.lat,
        point.lng,
      ],
      14,
      {
        animate: true,
        duration: 0.65,
      },
    );
  }, [
    map,
    point?.lat,
    point?.lng,
  ]);

  return null;
}

/*
|--------------------------------------------------------------------------
| Existing fit-bounds behavior
|--------------------------------------------------------------------------
|
| This preserves your old behavior:
|
| - merchant + suggested branch
| - merchant + suggested sub branch
| - assigned locations
|
| When admin explicitly selects a branch, we don't
| immediately fit all points again because that would
| fight against flyTo().
|--------------------------------------------------------------------------
*/

function FitBounds({
  points,
  enabled,
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const validPoints =
      points.filter(hasPoint);

    if (!validPoints.length) {
      return;
    }

    if (validPoints.length === 1) {
      map.setView(
        [
          validPoints[0].lat,
          validPoints[0].lng,
        ],
        14,
      );
    }

    if (validPoints.length > 1) {
      const bounds =
        L.latLngBounds(
          validPoints.map(
            (point) => [
              point.lat,
              point.lng,
            ],
          ),
        );

      map.fitBounds(
        bounds,
        {
          padding: [45, 45],
          maxZoom: 15,
        },
      );
    }

    const timer =
      setTimeout(() => {
        map.invalidateSize();
      }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [
    map,
    points,
    enabled,
  ]);

  return null;
}

/*
|--------------------------------------------------------------------------
| Legend
|--------------------------------------------------------------------------
*/

function MapLegend() {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 1000,
        background: "#ffffff",
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow:
          "0 6px 18px rgba(0,0,0,0.16)",
        fontSize: 12,
        minWidth: 185,
      }}
    >
      <LegendItem
        color="#16a34a"
        label="Merchant / Pickup"
      />

      <LegendItem
        color="#2563eb"
        label="Suggested Branch"
      />

      <LegendItem
        color="#f59e0b"
        label="Suggested Sub-Branch"
      />

      <LegendItem
        color="#1d4ed8"
        label="Assigned Branch"
      />

      <LegendItem
        color="#d97706"
        label="Assigned Sub-Branch"
      />

      <LegendItem
        color="#7c3aed"
        label="Selected Branch"
      />

      <LegendItem
        color="#ea580c"
        label="Selected Sub-Branch"
      />
    </div>
  );
}

function LegendItem({
  color,
  label,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 5,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />

      <span>
        {label}
      </span>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Main Map
|--------------------------------------------------------------------------
*/

export default function MerchantApplicationMap({
  merchant,

  /*
   * NEW PROPS
   */
  branches = [],

  selectedBranchId = null,
  selectedSubBranchId = null,

  selectedBranch = null,
  selectedSubBranch = null,

  showMerchantPin = true,
  showBranchPins = true,
}) {
  const [mounted, setMounted] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Mounted
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Resolve selected branch
  |--------------------------------------------------------------------------
  */

  const resolvedSelectedBranch =
    useMemo(() => {
      /*
       * Parent page can explicitly provide object.
       */
      if (selectedBranch) {
        return selectedBranch;
      }

      /*
       * Otherwise find it from branches.
       */
      if (
        selectedBranchId !== null &&
        selectedBranchId !== undefined
      ) {
        const found =
          branches.find(
            (branch) =>
              Number(branch.id) ===
              Number(selectedBranchId),
          );

        if (found) {
          return found;
        }
      }

      return null;
    }, [
      selectedBranch,
      selectedBranchId,
      branches,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Resolve selected sub branch
  |--------------------------------------------------------------------------
  */

  const resolvedSelectedSubBranch =
    useMemo(() => {
      if (selectedSubBranch) {
        return selectedSubBranch;
      }

      if (
        selectedSubBranchId !== null &&
        selectedSubBranchId !== undefined
      ) {
        const found =
          branches.find(
            (branch) =>
              Number(branch.id) ===
              Number(selectedSubBranchId),
          );

        if (found) {
          return found;
        }
      }

      return null;
    }, [
      selectedSubBranch,
      selectedSubBranchId,
      branches,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Selected points
  |--------------------------------------------------------------------------
  */

  const selectedBranchPoint =
    useMemo(
      () =>
        getPoint(
          resolvedSelectedBranch,
        ),
      [resolvedSelectedBranch],
    );

  const selectedSubBranchPoint =
    useMemo(
      () =>
        getPoint(
          resolvedSelectedSubBranch,
        ),
      [
        resolvedSelectedSubBranch,
      ],
    );

  /*
  |--------------------------------------------------------------------------
  | Original application points
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | These are preserved from your original component.
  |
  */

  const points = useMemo(() => {
    const pickupPoint =
      getPoint({
        latitude:
          merchant?.pickup_location
            ?.latitude,

        longitude:
          merchant?.pickup_location
            ?.longitude,
      }) ||
      getPoint({
        latitude:
          merchant?.pickup_lat,

        longitude:
          merchant?.pickup_lng,
      });

    const suggestedBranch =
      merchant?.suggested_branch;

    const suggestedSubBranch =
      merchant?.suggested_sub_branch;

    const assignedBranch =
      merchant?.default_branch;

    const assignedSubBranch =
      merchant?.default_sub_branch;

    return [
      {
        key: "merchant_pickup",

        type: "merchant",

        title:
          "Merchant / Pickup Location",

        lat:
          pickupPoint?.lat,

        lng:
          pickupPoint?.lng,

        popup:
          merchant
            ?.pickup_location
            ?.address ||
          merchant?.pickup_address ||
          merchant?.address ||
          merchant?.name ||
          "Merchant pickup location",
      },

      {
        key: "suggested_branch",

        type: "branch",

        title: `Suggested Branch: ${
          suggestedBranch?.name ||
          "-"
        }`,

        lat:
          getLatitude(
            suggestedBranch,
          ),

        lng:
          getLongitude(
            suggestedBranch,
          ),

        popup:
          formatLocation(
            suggestedBranch,
          ),
      },

      {
        key:
          "suggested_sub_branch",

        type: "sub_branch",

        title: `Suggested Sub-Branch: ${
          suggestedSubBranch?.name ||
          "-"
        }`,

        lat:
          getLatitude(
            suggestedSubBranch,
          ),

        lng:
          getLongitude(
            suggestedSubBranch,
          ),

        popup:
          formatLocation(
            suggestedSubBranch,
          ),
      },

      {
        key: "assigned_branch",

        type:
          "assigned_branch",

        title: `Assigned Branch: ${
          assignedBranch?.name ||
          "-"
        }`,

        lat:
          getLatitude(
            assignedBranch,
          ),

        lng:
          getLongitude(
            assignedBranch,
          ),

        popup:
          formatLocation(
            assignedBranch,
          ),
      },

      {
        key:
          "assigned_sub_branch",

        type:
          "assigned_sub_branch",

        title: `Assigned Sub-Branch: ${
          assignedSubBranch?.name ||
          "-"
        }`,

        lat:
          getLatitude(
            assignedSubBranch,
          ),

        lng:
          getLongitude(
            assignedSubBranch,
          ),

        popup:
          formatLocation(
            assignedSubBranch,
          ),
      },
    ].filter(hasPoint);
  }, [merchant]);

  /*
  |--------------------------------------------------------------------------
  | Original fallback center
  |--------------------------------------------------------------------------
  */

  const fallbackCenter =
    points.length
      ? [
          points[0].lat,
          points[0].lng,
        ]
      : [
          27.7172,
          85.324,
        ];

  /*
  |--------------------------------------------------------------------------
  | Original merchant point
  |--------------------------------------------------------------------------
  */

  const merchantPoint =
    points.find(
      (point) =>
        point.key ===
        "merchant_pickup",
    );

  /*
  |--------------------------------------------------------------------------
  | ORIGINAL active branch logic
  |--------------------------------------------------------------------------
  |
  | When no admin selection exists:
  |
  | assigned → suggested
  |
  | So your previous map behavior remains.
  |
  */

  const originalActiveSubBranch =
    points.find(
      (point) =>
        point.key ===
        "assigned_sub_branch",
    ) ||
    points.find(
      (point) =>
        point.key ===
        "suggested_sub_branch",
    );

  const originalActiveBranch =
    points.find(
      (point) =>
        point.key ===
        "assigned_branch",
    ) ||
    points.find(
      (point) =>
        point.key ===
        "suggested_branch",
    );

  /*
  |--------------------------------------------------------------------------
  | Selected branch has priority ONLY when admin has selected one
  |--------------------------------------------------------------------------
  */

  const activeSubBranch =
    selectedSubBranchPoint ||
    originalActiveSubBranch;

  const activeBranch =
    selectedBranchPoint ||
    originalActiveBranch;

  /*
  |--------------------------------------------------------------------------
  | Route line
  |--------------------------------------------------------------------------
  */

  const linePoints = [
    merchantPoint
      ? [
          merchantPoint.lat,
          merchantPoint.lng,
        ]
      : null,

    activeSubBranch
      ? [
          activeSubBranch.lat,
          activeSubBranch.lng,
        ]
      : null,

    activeBranch
      ? [
          activeBranch.lat,
          activeBranch.lng,
        ]
      : null,
  ].filter(Boolean);

  /*
  |--------------------------------------------------------------------------
  | Is admin currently selecting something?
  |--------------------------------------------------------------------------
  */

  const hasExplicitSelection =
    selectedBranchId !== null &&
    selectedBranchId !==
      undefined;

  /*
  |--------------------------------------------------------------------------
  | Focus location
  |--------------------------------------------------------------------------
  |
  | Sub branch gets priority if selected.
  | Otherwise primary branch.
  |
  */

  const focusPoint =
    selectedSubBranchPoint ||
    selectedBranchPoint;

  /*
  |--------------------------------------------------------------------------
  | Loading placeholder
  |--------------------------------------------------------------------------
  */

  if (!mounted) {
    return (
      <div
        style={{
          height: 380,
          width: "100%",
          borderRadius: 12,
          background: "#f5f5f5",
        }}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Map
  |--------------------------------------------------------------------------
  */

  return (
    <div
      style={{
        height: 380,
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <MapContainer
        center={fallbackCenter}
        zoom={13}
        scrollWheelZoom={false}
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/*
         * Keep the ORIGINAL map behavior when
         * there is no admin selection.
         */}
        <FitBounds
          points={points}
          enabled={!hasExplicitSelection}
        />

        {/*
         * When admin selects a branch, move map there.
         */}
        {focusPoint && (
          <FocusSelectedLocation
            point={focusPoint}
          />
        )}

        {/*
         |--------------------------------------------------------------------------
         | Existing application markers
         |--------------------------------------------------------------------------
         */}

        {showBranchPins &&
          points.map(
            (point) => (
              <Marker
                key={point.key}
                position={[
                  point.lat,
                  point.lng,
                ]}
                icon={
                  ICONS[
                    point.type
                  ] ||
                  ICONS.branch
                }
              >
                <Popup>
                  <strong>
                    {point.title}
                  </strong>

                  <br />

                  {point.popup ||
                    "-"}

                  <br />

                  <small>
                    {point.lat},{" "}
                    {point.lng}
                  </small>
                </Popup>
              </Marker>
            ),
          )}

        {/*
         |--------------------------------------------------------------------------
         | Merchant marker
         |--------------------------------------------------------------------------
         |
         | Because merchant is part of points above,
         | hide it from the branch-pin condition and
         | render it separately when requested.
         |
         */}

        {!showBranchPins &&
          showMerchantPin &&
          merchantPoint && (
            <Marker
              position={[
                merchantPoint.lat,
                merchantPoint.lng,
              ]}
              icon={ICONS.merchant}
            >
              <Popup>
                <strong>
                  Merchant / Pickup
                </strong>

                <br />

                {merchantPoint.popup ||
                  "-"}
              </Popup>
            </Marker>
          )}

        {/*
         |--------------------------------------------------------------------------
         | Selected primary branch
         |--------------------------------------------------------------------------
         */}

        {selectedBranchPoint && (
          <Marker
            position={[
              selectedBranchPoint.lat,
              selectedBranchPoint.lng,
            ]}
            icon={
              ICONS.selected_branch
            }
          >
            <Popup>
              <strong>
                Selected Branch
              </strong>

              <br />

              {getBranchLabel(
                resolvedSelectedBranch,
              )}

              <br />

              <small>
                {formatLocation(
                  resolvedSelectedBranch,
                )}
              </small>

              <br />

              <small>
                {selectedBranchPoint.lat},{" "}
                {
                  selectedBranchPoint.lng
                }
              </small>
            </Popup>
          </Marker>
        )}

        {/*
         |--------------------------------------------------------------------------
         | Selected sub branch
         |--------------------------------------------------------------------------
         */}

        {selectedSubBranchPoint && (
          <Marker
            position={[
              selectedSubBranchPoint.lat,
              selectedSubBranchPoint.lng,
            ]}
            icon={
              ICONS.selected_sub_branch
            }
          >
            <Popup>
              <strong>
                Selected Sub-Branch
              </strong>

              <br />

              {getBranchLabel(
                resolvedSelectedSubBranch,
              )}

              <br />

              <small>
                {formatLocation(
                  resolvedSelectedSubBranch,
                )}
              </small>

              <br />

              <small>
                {
                  selectedSubBranchPoint.lat
                }
                ,{" "}
                {
                  selectedSubBranchPoint.lng
                }
              </small>
            </Popup>
          </Marker>
        )}

        {/*
         |--------------------------------------------------------------------------
         | Route
         |--------------------------------------------------------------------------
         */}

        {linePoints.length >= 2 && (
          <Polyline
            positions={linePoints}
            pathOptions={
              hasExplicitSelection
                ? SELECTED_LINE_OPTIONS
                : LINE_OPTIONS
            }
          />
        )}
      </MapContainer>

      <MapLegend />

      {/*
       |--------------------------------------------------------------------------
       | Selected branch information
       |--------------------------------------------------------------------------
       */}

      {focusPoint && (
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            zIndex: 1000,
            background: "#ffffff",
            borderRadius: 10,
            padding: "8px 12px",
            boxShadow:
              "0 6px 18px rgba(0,0,0,0.16)",
            fontSize: 12,
            maxWidth: 300,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color:
                selectedSubBranchPoint
                  ? "#ea580c"
                  : "#7c3aed",
              marginBottom: 2,
            }}
          >
            Admin Selected Location
          </div>

          <div>
            {selectedSubBranchPoint
              ? getBranchLabel(
                  resolvedSelectedSubBranch,
                )
              : getBranchLabel(
                  resolvedSelectedBranch,
                )}
          </div>
        </div>
      )}
    </div>
  );
}