"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, Button, message, Space, Spin, Typography } from "antd";

import { useParams, useRouter } from "next/navigation";

import {
  getCoverageLocation,
  getCoverageLocations,
  getCoverageBranches,
  convertCoverageLocationToSubBranch,
  normalizeCoverageLocations,
  normalizeBranches,
} from "@/services/branchAllocationApi";

import ConvertMainToSubBranchForm from "../../components/ConvertMainToSubBranchForm";

const { Text } = Typography;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function unwrap(response) {
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }

  if (response?.data !== undefined) {
    return response.data;
  }

  return response;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/**
 * IMPORTANT:
 *
 * Always return a primitive string.
 *
 * This prevents values such as:
 *
 * null
 * undefined
 * {}
 * []
 *
 * from reaching Laravel's "string" validation.
 */
function stringValue(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  /*
   * Defensive handling for accidental objects.
   */
  if (typeof value === "object") {
    if (typeof value.value === "string") {
      return value.value.trim();
    }

    if (typeof value.label === "string") {
      return value.label.trim();
    }

    if (typeof value.name === "string") {
      return value.name.trim();
    }

    if (typeof value.text === "string") {
      return value.text.trim();
    }

    return fallback;
  }

  return fallback;
}

function getType(location) {
  return (
    location?.type ||
    location?.zone_type ||
    location?.coverage_type ||
    ""
  )
    .toString()
    .toLowerCase();
}

function isMainZone(location) {
  return ["main", "main_branch", "main_branch_zone"].includes(
    getType(location),
  );
}

function getName(location) {
  return (
    location?.name || location?.branch_name || location?.title || "Unnamed"
  );
}

function getCode(location) {
  return location?.code || location?.branch_code || "";
}

function getChildren(location) {
  if (Array.isArray(location?.children)) {
    return location.children;
  }

  if (Array.isArray(location?.child_zones)) {
    return location.child_zones;
  }

  if (Array.isArray(location?.sub_zones)) {
    return location.sub_zones;
  }

  return [];
}

function flattenLocations(locations) {
  const result = [];
  const seen = new Set();

  function walk(location) {
    if (!location) {
      return;
    }

    const id = location?.id;

    const key =
      id !== undefined && id !== null
        ? String(id)
        : [location?.latitude, location?.longitude, getName(location)].join(
            "-",
          );

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(location);

    getChildren(location).forEach(walk);
  }

  if (Array.isArray(locations)) {
    locations.forEach(walk);
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ConvertMainToSubBranchPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id;

  const [currentLocation, setCurrentLocation] = useState(null);

  const [locations, setLocations] = useState([]);

  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadingLocations, setLoadingLocations] = useState(true);

  const [loadingBranches, setLoadingBranches] = useState(true);

  const [converting, setConverting] = useState(false);

  const [destinationId, setDestinationId] = useState(null);

  const [name, setName] = useState("");

  const [latitude, setLatitude] = useState(null);

  const [longitude, setLongitude] = useState(null);

  const [radius, setRadius] = useState(10);

  const [keepChildZones, setKeepChildZones] = useState(true);

  /* ------------------------------------------------------------------------ */
  /* Load current location                                                   */
  /* ------------------------------------------------------------------------ */

  const loadCurrentLocation = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);

      const response = await getCoverageLocation(id);

      const location = unwrap(response);

      if (!location) {
        throw new Error("Coverage location not found.");
      }

      setCurrentLocation(location);

      setName(stringValue(location?.name));

      setLatitude(numberOrNull(location?.latitude));

      setLongitude(numberOrNull(location?.longitude));

      setRadius(numberOrNull(location?.coverage_radius_km) ?? 10);
    } catch (error) {
      console.error("LOAD CURRENT LOCATION ERROR:", error);

      message.error(
        error?.response?.data?.message ||
          error?.message ||
          "Could not load coverage location.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  /* ------------------------------------------------------------------------ */
  /* Load coverage locations                                                  */
  /* ------------------------------------------------------------------------ */

  const loadLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);

      const response = await getCoverageLocations({
        per_page: 1000,
      });

      const normalized = normalizeCoverageLocations(response);

      setLocations(Array.isArray(normalized) ? normalized : []);
    } catch (error) {
      console.error("LOAD LOCATIONS ERROR:", error);

      setLocations([]);

      message.warning("Could not load coverage zones.");
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Load branches                                                            */
  /* ------------------------------------------------------------------------ */

  const loadBranches = useCallback(async () => {
    try {
      setLoadingBranches(true);

      const response = await getCoverageBranches({
        per_page: 1000,
      });

      const normalized = normalizeBranches(response);

      setBranches(Array.isArray(normalized) ? normalized : []);
    } catch (error) {
      console.error("LOAD BRANCHES ERROR:", error);

      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Initial load                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    loadCurrentLocation();
    loadLocations();
    loadBranches();
  }, [loadCurrentLocation, loadLocations, loadBranches]);

  /* ------------------------------------------------------------------------ */
  /* Flatten locations                                                        */
  /* ------------------------------------------------------------------------ */

  const allLocations = useMemo(() => flattenLocations(locations), [locations]);

  /* ------------------------------------------------------------------------ */
  /* Destination main zones                                                  */
  /* ------------------------------------------------------------------------ */

  const destinationMainZones = useMemo(() => {
    return allLocations
      .filter((location) => Number(location?.id) !== Number(id))
      .filter(isMainZone)
      .filter(
        (location) =>
          location?.status === undefined ||
          location?.status === null ||
          location?.status === "active",
      )
      .sort((a, b) => getName(a).localeCompare(getName(b)));
  }, [allLocations, id]);

  /* ------------------------------------------------------------------------ */
  /* Child zones                                                              */
  /* ------------------------------------------------------------------------ */

  const childZones = useMemo(() => {
    if (!currentLocation) {
      return [];
    }

    const directChildren = getChildren(currentLocation);

    if (directChildren.length > 0) {
      return directChildren;
    }

    return allLocations.filter(
      (location) => Number(location?.parent_id) === Number(id),
    );
  }, [currentLocation, allLocations, id]);

  /* ------------------------------------------------------------------------ */
  /* Map locations                                                            */
  /* ------------------------------------------------------------------------ */

  const mapLocations = useMemo(
    () =>
      allLocations.filter(
        (location) =>
          numberOrNull(location?.latitude) !== null &&
          numberOrNull(location?.longitude) !== null,
      ),
    [allLocations],
  );

  /* ------------------------------------------------------------------------ */
  /* Map branches                                                             */
  /* ------------------------------------------------------------------------ */

  const mapBranches = useMemo(() => {
    const result = [...branches];

    mapLocations.forEach((location) => {
      const assigned =
        location?.assignedBranches ||
        location?.assigned_branches ||
        location?.branches ||
        [];

      if (Array.isArray(assigned)) {
        result.push(...assigned);
      }
    });

    const seen = new Set();

    return result.filter((branch, index) => {
      const branchId =
        branch?.id ??
        branch?.branch_id ??
        `${branch?.latitude}-${branch?.longitude}-${index}`;

      const key = String(branchId);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });
  }, [branches, mapLocations]);

  /* ------------------------------------------------------------------------ */
  /* Map change                                                               */
  /* ------------------------------------------------------------------------ */

  const handleMapChange = useCallback((value) => {
    if (!value) {
      return;
    }

    const lat = numberOrNull(value.latitude);

    const lng = numberOrNull(value.longitude);

    if (lat === null || lng === null) {
      return;
    }

    setLatitude(lat);
    setLongitude(lng);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* CONVERSION                                                               */
  /* ------------------------------------------------------------------------ */

  const handleConvert = useCallback(
    async (payload) => {
      if (!currentLocation) {
        message.error("Current coverage location is unavailable.");

        return;
      }

      /*
       * ================================================================
       * FINAL BACKEND PAYLOAD
       * ================================================================
       *
       * Every string field is explicitly forced to a primitive string.
       *
       * Particularly:
       *
       * landmark: ""
       *
       * NOT:
       *
       * landmark: null
       * landmark: {}
       * landmark: []
       * landmark: undefined
       *
       * This is the important fix.
       */

      const finalPayload = {
        parent_id: Number(payload?.parent_id),

        name: stringValue(payload?.name),

        latitude: Number(payload?.latitude),

        longitude: Number(payload?.longitude),

        coverage_radius_km: Number(payload?.coverage_radius_km),

        country: stringValue(payload?.country, "Nepal"),

        province: stringValue(payload?.province),

        district: stringValue(payload?.district),

        city: stringValue(payload?.city),

        area: stringValue(payload?.area),

        street: stringValue(payload?.street),

        /*
         * DO NOT USE:
         *
         * payload.landmark || null
         *
         * DO NOT USE:
         *
         * payload.landmark ?? null
         *
         * Always send a string.
         */
        landmark: stringValue(payload?.landmark, ""),

        address: stringValue(payload?.address),

        transfer_child_zones: Boolean(payload?.transfer_child_zones),

        preserve_location_configuration: true,
      };

      /*
       * Deep clone the object.
       *
       * This ensures that Axios receives only a plain JSON object.
       */
      const cleanPayload = JSON.parse(JSON.stringify(finalPayload));

      console.log("================================================");

      console.log("CONVERT MAIN → SUB-BRANCH");

      console.log("URL ID:", currentLocation.id);

      console.log("FINAL JSON PAYLOAD:", JSON.stringify(cleanPayload, null, 2));

      console.log("LANDMARK VALUE:", cleanPayload.landmark);

      console.log("LANDMARK TYPE:", typeof cleanPayload.landmark);

      console.log("================================================");

      /*
       * Last absolute safety check.
       */
      if (typeof cleanPayload.landmark !== "string") {
        cleanPayload.landmark = "";
      }

      try {
        setConverting(true);

        await convertCoverageLocationToSubBranch(
          currentLocation.id,
          cleanPayload,
        );

        message.success(
          `${getName(
            currentLocation,
          )} was converted to "${cleanPayload.name}" successfully.`,
        );

        router.push("/admin/coverage-locations");
      } catch (error) {
        console.error("CONVERSION ERROR:", error);

        const data = error?.response?.data;

        const errors = data?.errors;

        if (errors && typeof errors === "object") {
          const firstError = Object.values(errors)[0];

          message.error(
            Array.isArray(firstError)
              ? String(firstError[0])
              : String(firstError),
          );
        } else {
          message.error(
            data?.message ||
              error?.message ||
              "Could not convert this Main Branch Zone.",
          );
        }
      } finally {
        setConverting(false);
      }
    },
    [currentLocation, router],
  );

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <div
        style={{
          height: "calc(100vh - 70px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Space direction="vertical" align="center">
          <Spin size="large" />

          <Text type="secondary">Loading coverage location...</Text>
        </Space>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Error                                                                    */
  /* ------------------------------------------------------------------------ */

  if (!currentLocation) {
    return (
      <div
        style={{
          padding: 24,
        }}
      >
        <Alert
          type="error"
          showIcon
          message="Coverage location could not be loaded."
          action={
            <Button onClick={() => router.push("/admin/coverage-locations")}>
              Back
            </Button>
          }
        />
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <ConvertMainToSubBranchForm
      currentLocation={currentLocation}
      destinationId={destinationId}
      onDestinationChange={setDestinationId}
      name={name}
      onNameChange={setName}
      latitude={latitude}
      longitude={longitude}
      radius={radius}
      onLatitudeChange={setLatitude}
      onLongitudeChange={setLongitude}
      onRadiusChange={setRadius}
      childZones={childZones}
      keepChildZones={keepChildZones}
      onKeepChildZonesChange={setKeepChildZones}
      mapLocations={mapLocations}
      mapBranches={mapBranches}
      loadingBranches={loadingBranches}
      converting={converting}
      onMapChange={handleMapChange}
      onCancel={handleCancel}
      onConvert={handleConvert}
    />
  );
}
