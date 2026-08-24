"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  message,
  Spin,
  Space,
  Typography,
  Alert,
  Button,
} from "antd";

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

/* ==========================================================================
   RESPONSE HELPERS
   ========================================================================== */

function unwrap(response) {
  if (response?.data?.data) {
    return response.data.data;
  }

  if (response?.data) {
    return response.data;
  }

  return response;
}

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

function stringOrNull(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const result = String(value).trim();

  return result || null;
}

/* ==========================================================================
   LOCATION HELPERS
   ========================================================================== */

function getType(location) {
  return (
    location?.type ||
    location?.zone_type ||
    location?.coverage_type ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();
}

function isMainZone(location) {
  return [
    "main",
    "main_branch",
    "main_branch_zone",
  ].includes(getType(location));
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

function getChildren(location) {
  if (
    Array.isArray(location?.children)
  ) {
    return location.children;
  }

  if (
    Array.isArray(
      location?.child_zones,
    )
  ) {
    return location.child_zones;
  }

  if (
    Array.isArray(location?.sub_zones)
  ) {
    return location.sub_zones;
  }

  return [];
}

/* ==========================================================================
   FLATTEN LOCATIONS
   ========================================================================== */

function flattenLocations(locations) {
  const result = [];
  const seen = new Set();

  function walk(location) {
    if (!location) {
      return;
    }

    const id = location?.id;

    const key =
      id !== undefined &&
      id !== null
        ? String(id)
        : `${location?.latitude}-${location?.longitude}-${getName(
            location,
          )}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);

    result.push(location);

    getChildren(location).forEach(
      walk,
    );
  }

  if (Array.isArray(locations)) {
    locations.forEach(walk);
  }

  return result;
}

/* ==========================================================================
   PAGINATION HELPERS
   ========================================================================== */

/**
 * Extract pagination information from Laravel pagination response.
 *
 * Laravel:
 *
 * {
 *   data: [...],
 *   current_page: 1,
 *   last_page: 2,
 *   per_page: 100,
 *   total: 126,
 *   next_page_url: "...",
 * }
 */
function getPaginationData(response) {
  const root =
    response?.data ?? response;

  const data =
    root?.data ?? [];

  const currentPage =
    Number(
      root?.current_page ??
        root?.meta?.current_page ??
        1,
    );

  const lastPage =
    Number(
      root?.last_page ??
        root?.meta?.last_page ??
        currentPage,
    );

  const nextPageUrl =
    root?.next_page_url ??
    root?.links?.next ??
    null;

  return {
    data: Array.isArray(data)
      ? data
      : [],
    currentPage,
    lastPage,
    nextPageUrl,
  };
}

/**
 * Fetch ALL coverage-location pages.
 *
 * Important:
 * The backend currently caps per_page at 100.
 * Therefore per_page=1000 does NOT mean 1000 records.
 *
 * This function keeps requesting:
 *
 * page=1
 * page=2
 * page=3
 * ...
 *
 * until Laravel says last_page has been reached.
 */
async function fetchAllCoverageLocations() {
  const all = [];

  let page = 1;
  let lastPage = 1;

  const perPage = 100;

  do {
    const response =
      await getCoverageLocations({
        page,
        per_page: perPage,
      });

    const pagination =
      getPaginationData(response);

    all.push(
      ...pagination.data,
    );

    lastPage =
      pagination.lastPage;

    page =
      pagination.currentPage + 1;

    /*
     * Safety protection.
     *
     * Prevent an infinite loop if the API
     * returns malformed pagination metadata.
     */
    if (page > 1000) {
      console.warn(
        "Stopped coverage-location pagination after 1000 pages.",
      );

      break;
    }
  } while (page <= lastPage);

  return all;
}

/**
 * Fetch ALL branches.
 *
 * This is kept separate because branches may also
 * be paginated independently by the backend.
 */
async function fetchAllCoverageBranches() {
  const all = [];

  let page = 1;
  let lastPage = 1;

  const perPage = 100;

  do {
    const response =
      await getCoverageBranches({
        page,
        per_page: perPage,
      });

    const pagination =
      getPaginationData(response);

    all.push(
      ...pagination.data,
    );

    lastPage =
      pagination.lastPage;

    page =
      pagination.currentPage + 1;

    if (page > 1000) {
      console.warn(
        "Stopped branch pagination after 1000 pages.",
      );

      break;
    }
  } while (page <= lastPage);

  return all;
}

/* ==========================================================================
   PAGE
   ========================================================================== */

export default function ConvertMainToSubBranchPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id;

  const [
    currentLocation,
    setCurrentLocation,
  ] = useState(null);

  const [
    locations,
    setLocations,
  ] = useState([]);

  const [
    branches,
    setBranches,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingLocations,
    setLoadingLocations,
  ] = useState(true);

  const [
    loadingBranches,
    setLoadingBranches,
  ] = useState(true);

  const [
    converting,
    setConverting,
  ] = useState(false);

  const [
    destinationId,
    setDestinationId,
  ] = useState(null);

  const [
    name,
    setName,
  ] = useState("");

  const [
    latitude,
    setLatitude,
  ] = useState(null);

  const [
    longitude,
    setLongitude,
  ] = useState(null);

  const [
    radius,
    setRadius,
  ] = useState(10);

  const [
    keepChildZones,
    setKeepChildZones,
  ] = useState(true);

  /* ==========================================================================
     LOAD CURRENT LOCATION
     ========================================================================== */

  const loadCurrentLocation =
    useCallback(
      async () => {
        if (!id) {
          return;
        }

        try {
          setLoading(true);

          const response =
            await getCoverageLocation(
              id,
            );

          const location =
            unwrap(response);

          if (!location) {
            throw new Error(
              "Coverage location not found.",
            );
          }

          setCurrentLocation(
            location,
          );

          setName(
            String(
              location?.name || "",
            ),
          );

          setLatitude(
            numberOrNull(
              location?.latitude,
            ),
          );

          setLongitude(
            numberOrNull(
              location?.longitude,
            ),
          );

          setRadius(
            numberOrNull(
              location?.coverage_radius_km,
            ) ?? 10,
          );
        } catch (error) {
          console.error(
            "Load current coverage location error:",
            error,
          );

          message.error(
            error?.response?.data
              ?.message ||
              error?.message ||
              "Could not load coverage location.",
          );
        } finally {
          setLoading(false);
        }
      },
      [id],
    );

  /* ==========================================================================
     LOAD ALL COVERAGE LOCATIONS
     ========================================================================== */

  const loadLocations =
    useCallback(
      async () => {
        try {
          setLoadingLocations(true);

          /*
           * IMPORTANT:
           *
           * Do NOT use:
           *
           * getCoverageLocations({
           *   per_page: 1000
           * })
           *
           * because the backend currently caps it at 100.
           *
           * Instead fetch every page.
           */

          const rawLocations =
            await fetchAllCoverageLocations();

          console.log(
            "[ConvertMainToSubBranch] Loaded coverage locations:",
            rawLocations.length,
          );

          const normalized =
            normalizeCoverageLocations(
              {
                data: rawLocations,
              },
            );

          console.log(
            "[ConvertMainToSubBranch] Normalized coverage locations:",
            normalized.length,
          );

          setLocations(
            Array.isArray(normalized)
              ? normalized
              : [],
          );
        } catch (error) {
          console.error(
            "Load all coverage locations error:",
            error,
          );

          setLocations([]);

          message.warning(
            "Could not load all coverage zones.",
          );
        } finally {
          setLoadingLocations(false);
        }
      },
      [],
    );

  /* ==========================================================================
     LOAD ALL BRANCHES
     ========================================================================== */

  const loadBranches =
    useCallback(
      async () => {
        try {
          setLoadingBranches(true);

          const rawBranches =
            await fetchAllCoverageBranches();

          console.log(
            "[ConvertMainToSubBranch] Loaded branches:",
            rawBranches.length,
          );

          const normalized =
            normalizeBranches(
              {
                data: rawBranches,
              },
            );

          setBranches(
            Array.isArray(normalized)
              ? normalized
              : [],
          );
        } catch (error) {
          console.error(
            "Load all branches error:",
            error,
          );

          setBranches([]);
        } finally {
          setLoadingBranches(false);
        }
      },
      [],
    );

  /* ==========================================================================
     INITIAL LOAD
     ========================================================================== */

  useEffect(() => {
    loadCurrentLocation();
    loadLocations();
    loadBranches();
  }, [
    loadCurrentLocation,
    loadLocations,
    loadBranches,
  ]);

  /* ==========================================================================
     ALL LOCATIONS
     ========================================================================== */

  const allLocations =
    useMemo(
      () =>
        flattenLocations(
          locations,
        ),
      [locations],
    );

  /* ==========================================================================
     DESTINATION MAIN ZONES
     ========================================================================== */

  const destinationMainZones =
    useMemo(() => {
      const result =
        allLocations
          .filter(
            (location) =>
              Number(location?.id) !==
              Number(id),
          )
          .filter(isMainZone)
          .filter(
            (location) =>
              location?.status ===
                undefined ||
              location?.status ===
                null ||
              location?.status ===
                "active",
          )
          .sort(
            (a, b) =>
              getName(a).localeCompare(
                getName(b),
                undefined,
                {
                  sensitivity:
                    "base",
                },
              ),
          );

      console.log(
        "[ConvertMainToSubBranch] Destination main zones:",
        result.map((item) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          type: item.type,
          parent_id:
            item.parent_id,
        })),
      );

      return result;
    }, [
      allLocations,
      id,
    ]);

  /* ==========================================================================
     CHILD ZONES
     ========================================================================== */

  const childZones =
    useMemo(() => {
      if (!currentLocation) {
        return [];
      }

      const direct =
        getChildren(
          currentLocation,
        );

      if (direct.length) {
        return direct;
      }

      return allLocations.filter(
        (location) =>
          Number(
            location?.parent_id,
          ) === Number(id),
      );
    }, [
      currentLocation,
      allLocations,
      id,
    ]);

  /* ==========================================================================
     MAP LOCATIONS
     ========================================================================== */

  const mapLocations =
    useMemo(
      () =>
        allLocations.filter(
          (location) =>
            numberOrNull(
              location?.latitude,
            ) !== null &&
            numberOrNull(
              location?.longitude,
            ) !== null,
        ),
      [allLocations],
    );

  /* ==========================================================================
     MAP BRANCHES
     ========================================================================== */

  const mapBranches =
    useMemo(() => {
      const result = [
        ...branches,
      ];

      mapLocations.forEach(
        (location) => {
          const assigned =
            location?.assignedBranches ||
            location?.assigned_branches ||
            location?.branches ||
            [];

          if (
            Array.isArray(
              assigned,
            )
          ) {
            result.push(
              ...assigned,
            );
          }
        },
      );

      const seen = new Set();

      return result.filter(
        (branch, index) => {
          const branchId =
            branch?.id ??
            branch?.branch_id ??
            `${branch?.latitude}-${branch?.longitude}-${index}`;

          const key =
            String(branchId);

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);

          return true;
        },
      );
    }, [
      branches,
      mapLocations,
    ]);

  /* ==========================================================================
     MAP CHANGE
     ========================================================================== */

  const handleMapChange =
    useCallback(
      (value) => {
        if (!value) {
          return;
        }

        const lat =
          numberOrNull(
            value.latitude,
          );

        const lng =
          numberOrNull(
            value.longitude,
          );

        if (
          lat === null ||
          lng === null
        ) {
          return;
        }

        setLatitude(lat);
        setLongitude(lng);
      },
      [],
    );

  /* ==========================================================================
     CONVERSION
     ========================================================================== */

  const handleConvert =
    useCallback(
      async (payload) => {
        if (!currentLocation) {
          message.error(
            "Current coverage location is unavailable.",
          );

          return;
        }

        /*
         * Final defensive normalization.
         *
         * Landmark is intentionally normalized to a STRING.
         */
        const finalPayload = {
          ...payload,

          parent_id:
            Number(
              payload?.parent_id,
            ),

          name:
            String(
              payload?.name ?? "",
            ).trim(),

          latitude:
            Number(
              payload?.latitude,
            ),

          longitude:
            Number(
              payload?.longitude,
            ),

          coverage_radius_km:
            Number(
              payload?.coverage_radius_km,
            ),

          country:
            String(
              payload?.country ?? "",
            ),

          province:
            String(
              payload?.province ?? "",
            ),

          district:
            String(
              payload?.district ?? "",
            ),

          city:
            String(
              payload?.city ?? "",
            ),

          area:
            String(
              payload?.area ?? "",
            ),

          street:
            String(
              payload?.street ?? "",
            ),

          landmark:
            String(
              payload?.landmark ?? "",
            ),

          address:
            String(
              payload?.address ?? "",
            ),

          transfer_child_zones:
            Boolean(
              payload?.transfer_child_zones,
            ),

          preserve_location_configuration:
            true,
        };

        console.log(
          "FINAL CONVERSION PAYLOAD:",
          finalPayload,
        );

        try {
          setConverting(true);

          await convertCoverageLocationToSubBranch(
            currentLocation.id,
            finalPayload,
          );

          message.success(
            `${getName(
              currentLocation,
            )} was converted to "${finalPayload.name}" successfully.`,
          );

          router.push(
            "/admin/coverage-locations",
          );
        } catch (error) {
          console.error(
            "Conversion error:",
            error,
          );

          const data =
            error?.response?.data;

          const errors =
            data?.errors;

          if (
            errors &&
            typeof errors ===
              "object"
          ) {
            const first =
              Object.values(
                errors,
              )[0];

            message.error(
              Array.isArray(first)
                ? first[0]
                : String(first),
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
      [
        currentLocation,
        router,
      ],
    );

  /* ==========================================================================
     LOADING
     ========================================================================== */

  if (loading) {
    return (
      <div
        style={{
          height:
            "calc(100vh - 70px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Space
          direction="vertical"
          align="center"
        >
          <Spin size="large" />

          <Text type="secondary">
            Loading coverage location...
          </Text>
        </Space>
      </div>
    );
  }

  /* ==========================================================================
     NOT FOUND
     ========================================================================== */

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
            <Button
              onClick={() =>
                router.push(
                  "/admin/coverage-locations",
                )
              }
            >
              Back
            </Button>
          }
        />
      </div>
    );
  }

  /* ==========================================================================
     FORM
     ========================================================================== */

  return (
    <ConvertMainToSubBranchForm
      currentLocation={
        currentLocation
      }

      destinationMainZones={
        destinationMainZones
      }

      destinationId={
        destinationId
      }

      onDestinationChange={
        setDestinationId
      }

      name={name}
      onNameChange={setName}

      latitude={latitude}
      longitude={longitude}

      radius={radius}

      onLatitudeChange={
        setLatitude
      }

      onLongitudeChange={
        setLongitude
      }

      onRadiusChange={
        setRadius
      }

      childZones={childZones}

      keepChildZones={
        keepChildZones
      }

      onKeepChildZonesChange={
        setKeepChildZones
      }

      mapLocations={
        mapLocations
      }

      mapBranches={
        mapBranches
      }

      loadingBranches={
        loadingBranches
      }

      converting={converting}

      onMapChange={
        handleMapChange
      }

      onCancel={() =>
        router.push(
          `/admin/coverage-locations/${id}/edit`,
        )
      }

      onConvert={
        handleConvert
      }
    />
  );
}