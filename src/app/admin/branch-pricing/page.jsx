"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Pagination,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  CheckCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SwapOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import {
  createBranchRouteRate,
  deleteBranchRouteRate,
  getBranchRouteRateMatrix,
  updateBranchRouteRate,
  updateBranchRouteRateStatus,
} from "@/services/adminRateManagementService";

import { getPricingSettings } from "@/services/adminPricingConfigurationService";

import {
  apiErrorMessage,
  formatDate,
  formatMoney,
  normalizeBranch,
  normalizeBranchRate,
} from "@/lib/rate-management-page-utils";

const { Title, Text } = Typography;

/*
|--------------------------------------------------------------------------
| Route Map
|--------------------------------------------------------------------------
*/

const RouteMapS = dynamic(
  () => import("@/components/rate-admin/RouteMapS"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fa",
          borderRadius: 8,
          color: "#8c8c8c",
        }}
      >
        Loading map...
      </div>
    ),
  },
);

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const BRANCH_PAGE_SIZE = 10;

/*
|--------------------------------------------------------------------------
| Boolean helpers
|--------------------------------------------------------------------------
|
| API can return:
|
| true
| false
| 1
| 0
| "1"
| "0"
| "true"
| "false"
|
| Always normalize these before rendering.
|--------------------------------------------------------------------------
*/

function toBoolean(value, fallback = false) {
  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  ) {
    return true;
  }

  if (
    value === false ||
    value === 0 ||
    value === "0" ||
    value === "false" ||
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  return Boolean(value);
}

/*
|--------------------------------------------------------------------------
| Extract API payload
|--------------------------------------------------------------------------
|
| Supports:
|
| { data: {...} }
| { data: { data: {...} } }
| {...}
|--------------------------------------------------------------------------
*/

function unwrapResponsePayload(response) {
  if (!response) {
    return null;
  }

  if (
    response?.data?.data !== undefined &&
    response?.data?.data !== null
  ) {
    return response.data.data;
  }

  if (
    response?.data !== undefined &&
    response?.data !== null
  ) {
    return response.data;
  }

  return response;
}

/*
|--------------------------------------------------------------------------
| Normalize rate for UI
|--------------------------------------------------------------------------
|
| IMPORTANT:
| normalizeBranchRate() is not trusted to normalize the API's
| numeric boolean values.
|
| The API returns:
|
| express_enabled: 0
| same_day_enabled: 1
| is_active: 1
|
| We explicitly convert all of them here.
|--------------------------------------------------------------------------
*/

function normalizeRateForUI(rate, fallback = {}) {
  const raw = unwrapResponsePayload(rate) || {};

  const merged = {
    ...fallback,
    ...raw,
  };

  const normalized = normalizeBranchRate(merged);

  return {
    ...merged,
    ...normalized,

    id:
      raw.id ??
      fallback.id ??
      normalized?.id ??
      null,

    pickup_coverage_location_id: Number(
      raw.pickup_coverage_location_id ??
        fallback.pickup_coverage_location_id ??
        normalized?.pickup_coverage_location_id ??
        0,
    ),

    delivery_coverage_location_id: Number(
      raw.delivery_coverage_location_id ??
        fallback.delivery_coverage_location_id ??
        normalized?.delivery_coverage_location_id ??
        0,
    ),

    pickup_branch_id: Number(
      raw.pickup_branch_id ??
        fallback.pickup_branch_id ??
        normalized?.pickup_branch_id ??
        raw.pickup_coverage_location_id ??
        fallback.pickup_coverage_location_id ??
        0,
    ),

    delivery_branch_id: Number(
      raw.delivery_branch_id ??
        fallback.delivery_branch_id ??
        normalized?.delivery_branch_id ??
        raw.delivery_coverage_location_id ??
        fallback.delivery_coverage_location_id ??
        0,
    ),

    base_rate: Number(
      raw.base_rate ??
        fallback.base_rate ??
        normalized?.base_rate ??
        0,
    ),

    is_active: toBoolean(
      raw.is_active ??
        fallback.is_active ??
        normalized?.is_active,
      true,
    ),

    express_enabled: toBoolean(
      raw.express_enabled ??
        fallback.express_enabled ??
        normalized?.express_enabled,
      false,
    ),

    same_day_enabled: toBoolean(
      raw.same_day_enabled ??
        fallback.same_day_enabled ??
        normalized?.same_day_enabled,
      false,
    ),
  };
}

/*
|--------------------------------------------------------------------------
| Empty inline form
|--------------------------------------------------------------------------
*/

function emptyForm() {
  return {
    base_rate: 0,
    is_active: true,
    express_enabled: true,
    same_day_enabled: true,
  };
}

/*
|--------------------------------------------------------------------------
| Status Tag
|--------------------------------------------------------------------------
*/

function StatusTag({ active }) {
  const isActive = toBoolean(active);

  return (
    <Tag
      icon={isActive ? <CheckCircleOutlined /> : null}
      color={isActive ? "success" : "default"}
      style={{
        marginInlineEnd: 0,
        borderRadius: 6,
      }}
    >
      {isActive ? "Active" : "Inactive"}
    </Tag>
  );
}

/*
|--------------------------------------------------------------------------
| Feature Tag
|--------------------------------------------------------------------------
|
| Only render when enabled.
|
| Disabled Express / Same Day is intentionally NOT displayed.
|--------------------------------------------------------------------------
*/

function ExpressTag({ enabled }) {
  if (!toBoolean(enabled)) {
    return null;
  }

  return (
    <Tag
      color="orange"
      style={{
        margin: 0,
        fontSize: 10,
      }}
    >
      Express
    </Tag>
  );
}

function SameDayTag({ enabled }) {
  if (!toBoolean(enabled)) {
    return null;
  }

  return (
    <Tag
      color="magenta"
      style={{
        margin: 0,
        fontSize: 10,
      }}
    >
      Same Day
    </Tag>
  );
}

/*
|--------------------------------------------------------------------------
| Main Page
|--------------------------------------------------------------------------
*/

export default function BranchPricingPage() {
  const [locations, setLocations] = useState([]);
  const [rateMap, setRateMap] = useState({});

  const [selectedPickupId, setSelectedPickupId] =
    useState(null);

  const [selectedRoute, setSelectedRoute] =
    useState(null);

  const [activePricingSettings, setActivePricingSettings] =
    useState(null);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [destTab, setDestTab] = useState("all");

  const [branchSearch, setBranchSearch] =
    useState("");

  const [branchTab, setBranchTab] =
    useState("all");

  const [branchPage, setBranchPage] =
    useState(1);

  /*
  |--------------------------------------------------------------------------
  | Inline editing
  |--------------------------------------------------------------------------
  */

  const [inlineAdd, setInlineAdd] =
    useState(null);

  const [inlineEdit, setInlineEdit] =
    useState(null);

  const [inlineForm, setInlineForm] =
    useState(emptyForm());

  const [inlineSaving, setInlineSaving] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | LOAD MATRIX
  |--------------------------------------------------------------------------
  */

  const loadMatrix = useCallback(
    async (keepSelection = true) => {
      try {
        setLoading(true);

        const payload =
          await getBranchRouteRateMatrix();

        const data =
          unwrapResponsePayload(payload) || {};

        const rawLocations = Array.isArray(
          data?.branches,
        )
          ? data.branches
          : [];

        const rawRates =
          data?.rates &&
          typeof data.rates === "object"
            ? data.rates
            : {};

        /*
         * Normalize branches.
         */
        const normalizedLocations =
          rawLocations
            .map((branch) =>
              normalizeBranch(branch),
            )
            .filter(Boolean);

        /*
         * Normalize every rate.
         *
         * This is where API values such as:
         *
         * express_enabled: 0
         *
         * become:
         *
         * express_enabled: false
         */
        const normalizedMap = {};

        for (const [key, rate] of Object.entries(
          rawRates,
        )) {
          normalizedMap[key] =
            normalizeRateForUI(rate);
        }

        setLocations(normalizedLocations);
        setRateMap(normalizedMap);

        /*
         * Preserve selected branch whenever possible.
         */
        setSelectedPickupId((current) => {
          if (
            keepSelection &&
            current !== null &&
            normalizedLocations.some(
              (branch) =>
                Number(branch.id) ===
                Number(current),
            )
          ) {
            return Number(current);
          }

          return normalizedLocations.length > 0
            ? Number(normalizedLocations[0].id)
            : null;
        });

        /*
         * Refresh selected route from the new matrix.
         */
        setSelectedRoute((current) => {
          if (!current?.id) {
            return null;
          }

          const currentId = Number(current.id);

          const freshRoute =
            Object.values(normalizedMap).find(
              (rate) =>
                Number(rate?.id) === currentId,
            );

          return freshRoute || null;
        });
      } catch (error) {
        message.error(
          apiErrorMessage(
            error,
            "Could not load branch pricing matrix.",
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadMatrix();

    getPricingSettings()
      .then((response) => {
        const data =
          unwrapResponsePayload(response);

        setActivePricingSettings(
          data?.active ?? null,
        );
      })
      .catch(() => {});
  }, [loadMatrix]);

  /*
  |--------------------------------------------------------------------------
  | STATS
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    const rates = Object.values(rateMap);

    const total = rates.length;

    const active = rates.filter((rate) =>
      toBoolean(rate?.is_active),
    ).length;

    const n = locations.length;

    const coverage =
      n > 0
        ? Math.round(
            (total / (n * n)) * 100,
          )
        : 0;

    return {
      total,
      active,
      coverage,
      locationCount: n,
    };
  }, [rateMap, locations]);

  /*
  |--------------------------------------------------------------------------
  | DESTINATION ROWS
  |--------------------------------------------------------------------------
  */

  const destinationRows = useMemo(() => {
    if (!selectedPickupId) {
      return [];
    }

    return locations.map((location) => ({
      location,

      rate:
        rateMap[
          `${Number(selectedPickupId)}:${Number(
            location.id,
          )}`
        ] ?? null,
    }));
  }, [
    selectedPickupId,
    locations,
    rateMap,
  ]);

  /*
  |--------------------------------------------------------------------------
  | FILTERED DESTINATIONS
  |--------------------------------------------------------------------------
  */

  const filteredDestinations = useMemo(() => {
    let rows = destinationRows;

    const query = search
      .trim()
      .toLowerCase();

    if (query) {
      rows = rows.filter(
        ({ location }) =>
          location.name
            ?.toLowerCase()
            .includes(query) ||
          location.code
            ?.toLowerCase()
            .includes(query),
      );
    }

    if (destTab === "active") {
      rows = rows.filter(({ rate }) =>
        toBoolean(rate?.is_active),
      );
    }

    if (destTab === "missing") {
      rows = rows.filter(
        ({ rate }) => !rate,
      );
    }

    return rows;
  }, [
    destinationRows,
    search,
    destTab,
  ]);

  /*
  |--------------------------------------------------------------------------
  | BRANCH RATE COUNTS
  |--------------------------------------------------------------------------
  |
  | Instead of repeatedly running Object.keys(rateMap).filter(...)
  | for every branch, calculate counts once.
  |--------------------------------------------------------------------------
  */

  const branchRateCounts = useMemo(() => {
    const counts = {};

    for (const rate of Object.values(
      rateMap,
    )) {
      const pickupId = Number(
        rate?.pickup_coverage_location_id ??
          rate?.pickup_branch_id,
      );

      if (!pickupId) {
        continue;
      }

      counts[pickupId] =
        (counts[pickupId] || 0) + 1;
    }

    return counts;
  }, [rateMap]);

  /*
  |--------------------------------------------------------------------------
  | FILTERED BRANCHES
  |--------------------------------------------------------------------------
  */

  const filteredBranches = useMemo(() => {
    let list = locations;

    const query = branchSearch
      .trim()
      .toLowerCase();

    if (query) {
      list = list.filter(
        (location) =>
          location.name
            ?.toLowerCase()
            .includes(query) ||
          location.code
            ?.toLowerCase()
            .includes(query),
      );
    }

    if (branchTab === "complete") {
      list = list.filter((location) => {
        const count =
          branchRateCounts[
            Number(location.id)
          ] || 0;

        return count >= locations.length;
      });
    }

    if (branchTab === "missing") {
      list = list.filter((location) => {
        const count =
          branchRateCounts[
            Number(location.id)
          ] || 0;

        return count < locations.length;
      });
    }

    return list;
  }, [
    locations,
    branchRateCounts,
    branchSearch,
    branchTab,
  ]);

  /*
  |--------------------------------------------------------------------------
  | PAGED BRANCHES
  |--------------------------------------------------------------------------
  */

  const pagedBranches = useMemo(() => {
    const start =
      (branchPage - 1) *
      BRANCH_PAGE_SIZE;

    return filteredBranches.slice(
      start,
      start + BRANCH_PAGE_SIZE,
    );
  }, [
    filteredBranches,
    branchPage,
  ]);

  /*
  |--------------------------------------------------------------------------
  | SELECTED PICKUP LOCATION
  |--------------------------------------------------------------------------
  */

  const selectedPickupLocation =
    useMemo(
      () =>
        locations.find(
          (location) =>
            Number(location.id) ===
            Number(selectedPickupId),
        ) ?? null,
      [
        locations,
        selectedPickupId,
      ],
    );

  /*
  |--------------------------------------------------------------------------
  | MISSING COUNT
  |--------------------------------------------------------------------------
  */

  const missingCount =
    destinationRows.filter(
      ({ rate }) => !rate,
    ).length;

  /*
  |--------------------------------------------------------------------------
  | INLINE HELPERS
  |--------------------------------------------------------------------------
  */

  const cancelInline = useCallback(() => {
    setInlineAdd(null);
    setInlineEdit(null);
    setInlineForm(emptyForm());
  }, []);

  const startAdd = useCallback(
    (locationId) => {
      setInlineEdit(null);
      setInlineAdd(Number(locationId));

      setInlineForm(emptyForm());
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | PATCH RATE MAP
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | Always normalize the response before putting it into React state.
  |--------------------------------------------------------------------------
  */

  const patchRateMap = useCallback(
    (
      pickupId,
      deliveryId,
      rate,
      fallback = {},
    ) => {
      const normalizedPickupId =
        Number(pickupId);

      const normalizedDeliveryId =
        Number(deliveryId);

      const key = `${normalizedPickupId}:${normalizedDeliveryId}`;

      const normalized =
        normalizeRateForUI(
          rate,
          {
            ...fallback,

            pickup_coverage_location_id:
              normalizedPickupId,

            delivery_coverage_location_id:
              normalizedDeliveryId,
          },
        );

      setRateMap((previous) => ({
        ...previous,
        [key]: normalized,
      }));

      setSelectedRoute((previous) => {
        if (
          previous &&
          Number(previous.id) ===
            Number(normalized.id)
        ) {
          return normalized;
        }

        return previous;
      });
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | REMOVE RATE FROM MAP
  |--------------------------------------------------------------------------
  */

  const dropFromRateMap =
    useCallback(
      (
        pickupId,
        deliveryId,
        rateId,
      ) => {
        const key = `${Number(
          pickupId,
        )}:${Number(deliveryId)}`;

        setRateMap((previous) => {
          const next = {
            ...previous,
          };

          delete next[key];

          return next;
        });

        setSelectedRoute((previous) =>
          previous &&
          Number(previous.id) ===
            Number(rateId)
            ? null
            : previous,
        );
      },
      [],
    );

  /*
  |--------------------------------------------------------------------------
  | SAVE NEW RATE
  |--------------------------------------------------------------------------
  */

  const saveAdd = async (
    deliveryLocationId,
  ) => {
    if (
      inlineForm.base_rate ===
        null ||
      inlineForm.base_rate ===
        undefined ||
      Number.isNaN(
        Number(inlineForm.base_rate),
      )
    ) {
      message.warning(
        "Enter a base rate.",
      );

      return;
    }

    try {
      setInlineSaving(true);

      const pickupId =
        Number(selectedPickupId);

      const deliveryId =
        Number(deliveryLocationId);

      const payload = {
        pickup_coverage_location_id:
          pickupId,

        delivery_coverage_location_id:
          deliveryId,

        base_rate: Number(
          inlineForm.base_rate,
        ),

        is_active: toBoolean(
          inlineForm.is_active,
          true,
        ),

        express_enabled: toBoolean(
          inlineForm.express_enabled,
          true,
        ),

        same_day_enabled: toBoolean(
          inlineForm.same_day_enabled,
          true,
        ),
      };

      const result =
        await createBranchRouteRate(
          payload,
        );

      const apiData =
        unwrapResponsePayload(
          result,
        ) || {};

      const newRate =
        normalizeRateForUI(
          {
            ...apiData,

            /*
             * If backend response does not include
             * these fields, keep the values submitted.
             */
            id:
              apiData?.id ??
              apiData?.forward_id ??
              null,

            pickup_coverage_location_id:
              pickupId,

            delivery_coverage_location_id:
              deliveryId,

            base_rate:
              apiData?.base_rate ??
              payload.base_rate,

            is_active:
              apiData?.is_active ??
              payload.is_active,

            express_enabled:
              apiData?.express_enabled ??
              payload.express_enabled,

            same_day_enabled:
              apiData?.same_day_enabled ??
              payload.same_day_enabled,
          },
          payload,
        );

      patchRateMap(
        pickupId,
        deliveryId,
        newRate,
        payload,
      );

      message.success(
        "Rate added successfully.",
      );

      cancelInline();
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not save rate.",
        ),
      );
    } finally {
      setInlineSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | START EDIT
  |--------------------------------------------------------------------------
  |
  | THIS FIXES THE MAIN SWITCH BUG.
  |
  | API:
  |
  | express_enabled: 0
  |
  | becomes:
  |
  | express_enabled: false
  |--------------------------------------------------------------------------
  */

  const startEdit = useCallback(
    (rate) => {
      const normalized =
        normalizeRateForUI(rate);

      setInlineAdd(null);
      setInlineEdit(
        Number(normalized.id),
      );

      setInlineForm({
        base_rate: Number(
          normalized.base_rate ?? 0,
        ),

        is_active: toBoolean(
          normalized.is_active,
          true,
        ),

        express_enabled: toBoolean(
          normalized.express_enabled,
          false,
        ),

        same_day_enabled: toBoolean(
          normalized.same_day_enabled,
          false,
        ),
      });
    },
    [],
  );

  /*
  |--------------------------------------------------------------------------
  | SAVE EDIT
  |--------------------------------------------------------------------------
  */

  const saveEdit = async (rate) => {
    if (!rate?.id) {
      message.error(
        "Invalid rate selected.",
      );

      return;
    }

    try {
      setInlineSaving(true);

      const pickupId =
        Number(
          rate.pickup_coverage_location_id ??
            rate.pickup_branch_id,
        );

      const deliveryId =
        Number(
          rate.delivery_coverage_location_id ??
            rate.delivery_branch_id,
        );

      /*
       * Always send explicit boolean values.
       */
      const payload = {
        pickup_coverage_location_id:
          pickupId,

        delivery_coverage_location_id:
          deliveryId,

        base_rate: Number(
          inlineForm.base_rate ?? 0,
        ),

        is_active: toBoolean(
          inlineForm.is_active,
          true,
        ),

        express_enabled: toBoolean(
          inlineForm.express_enabled,
          false,
        ),

        same_day_enabled: toBoolean(
          inlineForm.same_day_enabled,
          false,
        ),
      };

      const response =
        await updateBranchRouteRate(
          rate.id,
          payload,
        );

      const apiData =
        unwrapResponsePayload(
          response,
        ) || {};

      /*
       * IMPORTANT:
       *
       * API response is the source of truth when
       * the property exists.
       *
       * But if backend returns a partial response,
       * use the submitted value as fallback.
       */
      const updatedRate =
        normalizeRateForUI(
          {
            ...rate,
            ...apiData,

            id:
              apiData?.id ??
              rate.id,

            pickup_coverage_location_id:
              apiData
                ?.pickup_coverage_location_id ??
              pickupId,

            delivery_coverage_location_id:
              apiData
                ?.delivery_coverage_location_id ??
              deliveryId,

            base_rate:
              apiData?.base_rate ??
              payload.base_rate,

            is_active:
              apiData?.is_active ??
              payload.is_active,

            express_enabled:
              apiData?.express_enabled ??
              payload.express_enabled,

            same_day_enabled:
              apiData?.same_day_enabled ??
              payload.same_day_enabled,
          },
          {
            ...rate,
            ...payload,
          },
        );

      /*
       * Update ONLY this route.
       * No full matrix reload required.
       */
      patchRateMap(
        pickupId,
        deliveryId,
        updatedRate,
        {
          ...rate,
          ...payload,
        },
      );

      /*
       * Explicitly update selected route too.
       */
      setSelectedRoute((current) => {
        if (
          current &&
          Number(current.id) ===
            Number(rate.id)
        ) {
          return updatedRate;
        }

        return current;
      });

      message.success(
        "Rate updated successfully.",
      );

      cancelInline();
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not update rate.",
        ),
      );
    } finally {
      setInlineSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | TOGGLE ACTIVE STATUS
  |--------------------------------------------------------------------------
  */

  const toggleStatus = async (rate) => {
    if (!rate?.id) {
      return;
    }

    const currentStatus = toBoolean(
      rate.is_active,
      false,
    );

    const nextStatus =
      !currentStatus;

    try {
      const response =
        await updateBranchRouteRateStatus(
          rate.id,
          nextStatus,
        );

      const apiData =
        unwrapResponsePayload(
          response,
        ) || {};

      const updatedRate =
        normalizeRateForUI(
          {
            ...rate,
            ...apiData,

            id:
              apiData?.id ??
              rate.id,

            pickup_coverage_location_id:
              apiData
                ?.pickup_coverage_location_id ??
              rate.pickup_coverage_location_id,

            delivery_coverage_location_id:
              apiData
                ?.delivery_coverage_location_id ??
              rate.delivery_coverage_location_id,

            is_active:
              apiData?.is_active ??
              nextStatus,
          },
          {
            ...rate,
            is_active: nextStatus,
          },
        );

      patchRateMap(
        Number(
          rate.pickup_coverage_location_id,
        ),
        Number(
          rate.delivery_coverage_location_id,
        ),
        updatedRate,
        {
          ...rate,
          is_active: nextStatus,
        },
      );

      setSelectedRoute((current) => {
        if (
          current &&
          Number(current.id) ===
            Number(rate.id)
        ) {
          return updatedRate;
        }

        return current;
      });

      message.success(
        `Rate ${
          nextStatus
            ? "enabled"
            : "disabled"
        }.`,
      );
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not update status.",
        ),
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE REVERSE RATE
  |--------------------------------------------------------------------------
  |
  | Reverse route gets the SAME pricing configuration
  | as the original route.
  |--------------------------------------------------------------------------
  */

  const createReverse = async (
    rate,
  ) => {
    if (!rate) {
      return;
    }

    try {
      const pickupId =
        Number(
          rate.delivery_coverage_location_id ??
            rate.delivery_branch_id,
        );

      const deliveryId =
        Number(
          rate.pickup_coverage_location_id ??
            rate.pickup_branch_id,
        );

      const payload = {
        pickup_coverage_location_id:
          pickupId,

        delivery_coverage_location_id:
          deliveryId,

        base_rate: Number(
          rate.base_rate ?? 0,
        ),

        is_active: toBoolean(
          rate.is_active,
          true,
        ),

        express_enabled: toBoolean(
          rate.express_enabled,
          false,
        ),

        same_day_enabled: toBoolean(
          rate.same_day_enabled,
          false,
        ),
      };

      const result =
        await createBranchRouteRate(
          payload,
        );

      const apiData =
        unwrapResponsePayload(
          result,
        ) || {};

      /*
       * IMPORTANT:
       *
       * Do NOT spread API response after our
       * fallback values.
       *
       * The API may return incomplete data.
       */
      const reverseRate =
        normalizeRateForUI(
          {
            ...apiData,

            id:
              apiData?.id ??
              apiData?.forward_id ??
              null,

            pickup_coverage_location_id:
              pickupId,

            delivery_coverage_location_id:
              deliveryId,

            base_rate:
              apiData?.base_rate ??
              payload.base_rate,

            is_active:
              apiData?.is_active ??
              payload.is_active,

            express_enabled:
              apiData?.express_enabled ??
              payload.express_enabled,

            same_day_enabled:
              apiData?.same_day_enabled ??
              payload.same_day_enabled,
          },
          payload,
        );

      patchRateMap(
        pickupId,
        deliveryId,
        reverseRate,
        payload,
      );

      message.success(
        "Reverse rate created successfully.",
      );
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not create reverse rate.",
        ),
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  const removeRate = async (rate) => {
    try {
      await deleteBranchRouteRate(
        rate.id,
      );

      dropFromRateMap(
        Number(
          rate.pickup_coverage_location_id,
        ),
        Number(
          rate.delivery_coverage_location_id,
        ),
        rate.id,
      );

      message.success(
        "Rate deleted successfully.",
      );
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not delete rate.",
        ),
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | INLINE FORM
  |--------------------------------------------------------------------------
  */

  const InlineFormFields = ({
    onSave,
    onCancel,
    saving,
  }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      {/* BASE RATE */}
      <div>
        <Text
          type="secondary"
          style={{
            fontSize: 10,
            display: "block",
            marginBottom: 3,
          }}
        >
          Base Rate (NPR)
        </Text>

        <InputNumber
          min={0}
          step={10}
          value={inlineForm.base_rate}
          onChange={(value) =>
            setInlineForm((form) => ({
              ...form,
              base_rate:
                value ?? 0,
            }))
          }
          style={{
            width: 120,
          }}
          size="small"
          autoFocus
        />
      </div>

      {/* EXPRESS */}
      <div>
        <Text
          type="secondary"
          style={{
            fontSize: 10,
            display: "block",
            marginBottom: 3,
          }}
        >
          Express
        </Text>

        <Switch
          size="small"
          checked={toBoolean(
            inlineForm.express_enabled,
            false,
          )}
          onChange={(checked) =>
            setInlineForm((form) => ({
              ...form,
              express_enabled:
                Boolean(checked),
            }))
          }
          checkedChildren="On"
          unCheckedChildren="Off"
        />
      </div>

      {/* SAME DAY */}
      <div>
        <Text
          type="secondary"
          style={{
            fontSize: 10,
            display: "block",
            marginBottom: 3,
          }}
        >
          Same Day
        </Text>

        <Switch
          size="small"
          checked={toBoolean(
            inlineForm.same_day_enabled,
            false,
          )}
          onChange={(checked) =>
            setInlineForm((form) => ({
              ...form,
              same_day_enabled:
                Boolean(checked),
            }))
          }
          checkedChildren="On"
          unCheckedChildren="Off"
        />
      </div>

      {/* ACTIVE */}
      <div>
        <Text
          type="secondary"
          style={{
            fontSize: 10,
            display: "block",
            marginBottom: 3,
          }}
        >
          Active
        </Text>

        <Switch
          size="small"
          checked={toBoolean(
            inlineForm.is_active,
            false,
          )}
          onChange={(checked) =>
            setInlineForm((form) => ({
              ...form,
              is_active:
                Boolean(checked),
            }))
          }
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
      </div>

      {/* SAVE/CANCEL */}
      <Space
        size={4}
        style={{
          marginTop: 14,
        }}
      >
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={onSave}
        >
          Save
        </Button>

        <Button
          size="small"
          icon={<CloseOutlined />}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </Space>
    </div>
  );

  /*
  |--------------------------------------------------------------------------
  | DESTINATION ROW
  |--------------------------------------------------------------------------
  */

  const DestinationRow = ({
    location,
    rate,
  }) => {
    const locationId =
      Number(location.id);

    const pickupId =
      Number(selectedPickupId);

    const isSelf =
      locationId === pickupId;

    const hasRate =
      Boolean(rate);

    const normalizedRate =
      hasRate
        ? normalizeRateForUI(rate)
        : null;

    const isSelected =
      hasRate &&
      selectedRoute &&
      Number(selectedRoute.id) ===
        Number(normalizedRate?.id);

    const isEditing =
      hasRate &&
      Number(inlineEdit) ===
        Number(normalizedRate?.id);

    const isAdding =
      !hasRate &&
      Number(inlineAdd) ===
        locationId;

    const hasReverseRate =
      hasRate &&
      Boolean(
        rateMap[
          `${locationId}:${pickupId}`
        ],
      );

    const active =
      normalizedRate
        ? toBoolean(
            normalizedRate.is_active,
            false,
          )
        : false;

    return (
      <div
        style={{
          marginBottom: 6,
          borderRadius: 8,

          border: isSelected
            ? "1px solid #91caff"
            : isAdding || isEditing
              ? "1px solid #b7eb8f"
              : hasRate
                ? "1px solid #edf0f3"
                : "1px dashed #ffd666",

          borderLeft: isSelected
            ? "3px solid #1677ff"
            : isAdding || isEditing
              ? "3px solid #52c41a"
              : hasRate
                ? "1px solid #edf0f3"
                : "3px solid #faad14",

          background: isSelected
            ? "#f0f7ff"
            : isAdding || isEditing
              ? "#f6ffed"
              : hasRate
                ? "#fff"
                : "#fffbe6",

          overflow: "hidden",

          transition:
            "all .15s ease",
        }}
      >
        {/* MAIN ROW */}
        <div
          onClick={() => {
            if (
              hasRate &&
              !isEditing
            ) {
              setSelectedRoute(
                normalizedRate,
              );
            }
          }}
          style={{
            display: "grid",

            gridTemplateColumns:
              "minmax(140px, 1.2fr) 1fr 80px 80px 80px 170px",

            gap: 10,

            alignItems: "center",

            minHeight: 58,

            padding: "8px 14px",

            cursor:
              hasRate &&
              !isEditing
                ? "pointer"
                : "default",
          }}
        >
          {/* DESTINATION */}
          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexWrap: "wrap",
              }}
            >
              <Text
                strong
                style={{
                  fontSize: 13,
                }}
              >
                {location.name}
              </Text>

              {isSelf && (
                <Tag
                  color="blue"
                  style={{
                    margin: 0,
                    fontSize: 10,
                  }}
                >
                  Local
                </Tag>
              )}
            </div>

            <Text
              type="secondary"
              style={{
                fontSize: 11,
              }}
            >
              {location.code}
            </Text>
          </div>

          {/* BASE RATE */}
          <div>
            {hasRate ? (
              <>
                <Text
                  type="secondary"
                  style={{
                    fontSize: 10,
                  }}
                >
                  Standard
                </Text>

                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    marginTop: 1,
                  }}
                >
                  {formatMoney(
                    normalizedRate.base_rate,
                  )}
                </div>
              </>
            ) : (
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                }}
              >
                —
              </Text>
            )}
          </div>

          {/* EXPRESS */}
          <div>
            {hasRate &&
              toBoolean(
                normalizedRate.express_enabled,
                false,
              ) && (
                <ExpressTag
                  enabled={
                    normalizedRate.express_enabled
                  }
                />
              )}
          </div>

          {/* SAME DAY */}
          <div>
            {hasRate &&
              toBoolean(
                normalizedRate.same_day_enabled,
                false,
              ) && (
                <SameDayTag
                  enabled={
                    normalizedRate.same_day_enabled
                  }
                />
              )}
          </div>

          {/* STATUS */}
          <div>
            {hasRate ? (
              <StatusTag
                active={active}
              />
            ) : (
              <Tag
                icon={
                  <WarningOutlined />
                }
                color="warning"
                style={{
                  margin: 0,
                }}
              >
                Missing
              </Tag>
            )}
          </div>

          {/* ACTIONS */}
          <Space
            size={4}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {hasRate ? (
              isEditing ? null : (
                <>
                  {/* EDIT */}
                  <Tooltip title="Edit inline">
                    <Button
                      size="small"
                      icon={
                        <EditOutlined />
                      }
                      onClick={() =>
                        startEdit(
                          normalizedRate,
                        )
                      }
                    />
                  </Tooltip>

                  {/* REVERSE */}
                  <Tooltip
                    title={
                      isSelf
                        ? "Local route"
                        : hasReverseRate
                          ? "Reverse rate already exists"
                          : "Create reverse rate"
                    }
                  >
                    <Button
                      size="small"
                      disabled={
                        isSelf ||
                        hasReverseRate
                      }
                      icon={
                        <SwapOutlined />
                      }
                      onClick={() =>
                        createReverse(
                          normalizedRate,
                        )
                      }
                    />
                  </Tooltip>

                  {/* ENABLE/DISABLE */}
                  <Button
                    size="small"
                    onClick={() =>
                      toggleStatus(
                        normalizedRate,
                      )
                    }
                  >
                    {active
                      ? "Disable"
                      : "Enable"}
                  </Button>

                  {/* DELETE */}
                  <Popconfirm
                    title="Delete this rate?"
                    description="This cannot be undone."
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{
                      danger: true,
                    }}
                    onConfirm={() =>
                      removeRate(
                        normalizedRate,
                      )
                    }
                  >
                    <Button
                      danger
                      size="small"
                      icon={
                        <DeleteOutlined />
                      }
                    />
                  </Popconfirm>
                </>
              )
            ) : isAdding ? null : (
              <Button
                type="primary"
                size="small"
                icon={
                  <PlusOutlined />
                }
                onClick={() =>
                  startAdd(locationId)
                }
              >
                Add Rate
              </Button>
            )}
          </Space>
        </div>

        {/* INLINE EDIT */}
        {isEditing && (
          <div
            style={{
              padding:
                "10px 14px 12px",
              borderTop:
                "1px solid #d9f7be",
              background:
                "#f6ffed",
            }}
          >
            <InlineFormFields
              onSave={() =>
                saveEdit(
                  normalizedRate,
                )
              }
              onCancel={
                cancelInline
              }
              saving={inlineSaving}
            />
          </div>
        )}

        {/* INLINE ADD */}
        {isAdding && (
          <div
            style={{
              padding:
                "10px 14px 12px",
              borderTop:
                "1px solid #d9f7be",
              background:
                "#f6ffed",
            }}
          >
            <InlineFormFields
              onSave={() =>
                saveAdd(
                  locationId,
                )
              }
              onCancel={
                cancelInline
              }
              saving={inlineSaving}
            />
          </div>
        )}
      </div>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | SELECTED ROUTE NODES
  |--------------------------------------------------------------------------
  */

  const selectedRouteNodes =
    selectedRoute
      ? [
          locations.find(
            (location) =>
              Number(location.id) ===
              Number(
                selectedRoute.pickup_coverage_location_id,
              ),
          ),

          locations.find(
            (location) =>
              Number(location.id) ===
              Number(
                selectedRoute.delivery_coverage_location_id,
              ),
          ),
        ].filter(Boolean)
      : [];

  /*
  |--------------------------------------------------------------------------
  | SELECTED ROUTE FLAGS
  |--------------------------------------------------------------------------
  */

  const selectedRouteNormalized =
    selectedRoute
      ? normalizeRateForUI(
          selectedRoute,
        )
      : null;

  const selectedRouteActive =
    toBoolean(
      selectedRouteNormalized?.is_active,
      false,
    );

  const selectedRouteExpress =
    toBoolean(
      selectedRouteNormalized?.express_enabled,
      false,
    );

  const selectedRouteSameDay =
    toBoolean(
      selectedRouteNormalized?.same_day_enabled,
      false,
    );

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div
      style={{
        width: "100%",
        padding:
          "20px 22px 32px",
        background:
          "#f5f7fa",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 16,
        }}
        styles={{
          body: {
            padding:
              "18px 20px",
          },
        }}
      >
        <Row
          justify="space-between"
          align="middle"
        >
          <Col>
            <Title
              level={3}
              style={{
                margin: 0,
              }}
            >
              Branch Pricing
            </Title>

            <Text type="secondary">
              Select a branch to view
              and manage its delivery
              rates.
            </Text>
          </Col>

          <Col>
            <Button
              icon={
                <ReloadOutlined />
              }
              loading={loading}
              onClick={() =>
                loadMatrix(true)
              }
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {/* STATS */}
      <Row
        gutter={[12, 12]}
        style={{
          marginBottom: 16,
        }}
      >
        {[
          {
            title: "Branches",
            value:
              stats.locationCount,
            prefix: (
              <EnvironmentOutlined />
            ),
          },

          {
            title: "Total Routes",
            value: stats.total,
          },

          {
            title: "Active Routes",
            value: stats.active,
            suffix: `/ ${stats.total}`,
            valueStyle: {
              color: "#52c41a",
            },
          },

          {
            title:
              "Matrix Coverage",
            value:
              stats.coverage,
            suffix: "%",
            valueStyle: {
              color:
                stats.coverage ===
                100
                  ? "#52c41a"
                  : "#faad14",
            },
          },
        ].map((stat) => (
          <Col
            key={stat.title}
            xs={24}
            sm={12}
            lg={6}
          >
            <Card
              bordered={false}
              style={{
                borderRadius: 10,
              }}
            >
              <Statistic
                {...stat}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* MAIN */}
      <Row
        gutter={[16, 16]}
        align="top"
      >
        {/* LEFT — BRANCH LIST */}
        <Col
          xs={24}
          xl={5}
        >
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
            }}
            styles={{
              body: {
                padding: 0,
              },
            }}
            title={
              <Space>
                <EnvironmentOutlined />

                <Text strong>
                  Branches
                </Text>

                <Tag color="blue">
                  {locations.length}
                </Tag>
              </Space>
            }
          >
            {/* SEARCH */}
            <div
              style={{
                padding:
                  "10px 12px 0",
              }}
            >
              <Input
                allowClear
                size="small"
                placeholder="Search branch..."
                value={
                  branchSearch
                }
                onChange={(event) => {
                  setBranchSearch(
                    event.target
                      .value,
                  );
                  setBranchPage(1);
                }}
              />
            </div>

            {/* TABS */}
            <Tabs
              size="small"
              activeKey={
                branchTab
              }
              onChange={(key) => {
                setBranchTab(key);
                setBranchPage(1);
              }}
              style={{
                padding:
                  "0 12px",
              }}
              items={[
                {
                  key: "all",
                  label: `All (${locations.length})`,
                },

                {
                  key: "missing",
                  label: (
                    <span
                      style={{
                        color:
                          "#faad14",
                      }}
                    >
                      Missing
                    </span>
                  ),
                },

                {
                  key: "complete",
                  label: (
                    <span
                      style={{
                        color:
                          "#52c41a",
                      }}
                    >
                      Complete
                    </span>
                  ),
                },
              ]}
            />

            {loading ? (
              <div
                style={{
                  padding: 40,
                  textAlign:
                    "center",
                }}
              >
                Loading...
              </div>
            ) : !filteredBranches.length ? (
              <div
                style={{
                  padding: 40,
                }}
              >
                <Empty
                  description="No branches"
                />
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding:
                      "0 0 6px",
                  }}
                >
                  {pagedBranches.map(
                    (location) => {
                      const locationId =
                        Number(
                          location.id,
                        );

                      const isActive =
                        locationId ===
                        Number(
                          selectedPickupId,
                        );

                      const ratesCount =
                        branchRateCounts[
                          locationId
                        ] || 0;

                      const missing =
                        locations.length -
                        ratesCount;

                      return (
                        <div
                          key={
                            location.id
                          }
                          onClick={() => {
                            setSelectedPickupId(
                              locationId,
                            );

                            setSelectedRoute(
                              null,
                            );

                            setSearch(
                              "",
                            );

                            cancelInline();
                          }}
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            padding:
                              "10px 16px",
                            cursor:
                              "pointer",
                            background:
                              isActive
                                ? "#e6f4ff"
                                : "transparent",
                            borderLeft:
                              isActive
                                ? "3px solid #1677ff"
                                : "3px solid transparent",
                            transition:
                              "all .15s",
                          }}
                        >
                          <div>
                            <Text
                              strong
                              style={{
                                fontSize: 13,
                              }}
                            >
                              {
                                location.name
                              }
                            </Text>

                            <Text
                              type="secondary"
                              style={{
                                display:
                                  "block",
                                fontSize: 11,
                              }}
                            >
                              {
                                location.code
                              }
                            </Text>
                          </div>

                          <div
                            style={{
                              textAlign:
                                "right",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color:
                                  "#52c41a",
                              }}
                            >
                              {
                                ratesCount
                              }{" "}
                              routes
                            </div>

                            {missing >
                              0 && (
                              <Badge
                                count={
                                  missing
                                }
                                size="small"
                                color="#faad14"
                              />
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                {filteredBranches.length >
                  BRANCH_PAGE_SIZE && (
                  <div
                    style={{
                      padding:
                        "8px 12px 12px",
                      textAlign:
                        "center",
                      borderTop:
                        "1px solid #f0f0f0",
                    }}
                  >
                    <Pagination
                      simple
                      size="small"
                      current={
                        branchPage
                      }
                      pageSize={
                        BRANCH_PAGE_SIZE
                      }
                      total={
                        filteredBranches.length
                      }
                      onChange={(page) =>
                        setBranchPage(
                          page,
                        )
                      }
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        </Col>

        {/* MIDDLE — DESTINATION RATES */}
        <Col
          xs={24}
          xl={12}
        >
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
            }}
            styles={{
              body: {
                padding: 0,
              },
            }}
            title={
              selectedPickupLocation ? (
                <Space wrap>
                  <Text strong>
                    From:{" "}
                    {
                      selectedPickupLocation.name
                    }
                  </Text>

                  <Tag color="blue">
                    {
                      selectedPickupLocation.code
                    }
                  </Tag>

                  {missingCount >
                    0 && (
                    <Tag
                      color="warning"
                      icon={
                        <WarningOutlined />
                      }
                    >
                      {missingCount}{" "}
                      missing
                    </Tag>
                  )}
                </Space>
              ) : (
                <Text type="secondary">
                  Select a branch
                </Text>
              )
            }
          >
            {!selectedPickupId ? (
              <div
                style={{
                  padding: 60,
                }}
              >
                <Empty description="Select a branch on the left" />
              </div>
            ) : (
              <>
                {/* DESTINATION SEARCH */}
                <div
                  style={{
                    padding:
                      "10px 14px 0",
                  }}
                >
                  <Input
                    allowClear
                    placeholder="Search destination..."
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target
                          .value,
                      )
                    }
                    size="small"
                  />
                </div>

                {/* DESTINATION TABS */}
                <Tabs
                  size="small"
                  activeKey={
                    destTab
                  }
                  onChange={
                    setDestTab
                  }
                  style={{
                    padding:
                      "0 14px",
                  }}
                  items={[
                    {
                      key: "all",
                      label: `All (${destinationRows.length})`,
                    },

                    {
                      key: "active",
                      label: (
                        <span
                          style={{
                            color:
                              "#52c41a",
                          }}
                        >
                          Active (
                          {
                            destinationRows.filter(
                              ({
                                rate,
                              }) =>
                                toBoolean(
                                  rate?.is_active,
                                  false,
                                ),
                            ).length
                          }
                          )
                        </span>
                      ),
                    },

                    {
                      key: "missing",
                      label: (
                        <span
                          style={{
                            color:
                              "#faad14",
                          }}
                        >
                          Missing (
                          {
                            destinationRows.filter(
                              ({
                                rate,
                              }) =>
                                !rate,
                            ).length
                          }
                          )
                        </span>
                      ),
                    },
                  ]}
                />

                {/* ROUTES */}
                <div
                  style={{
                    padding:
                      "4px 14px 14px",
                  }}
                >
                  {filteredDestinations.map(
                    ({
                      location,
                      rate,
                    }) => (
                      <DestinationRow
                        key={
                          location.id
                        }
                        location={
                          location
                        }
                        rate={rate}
                      />
                    ),
                  )}
                </div>
              </>
            )}
          </Card>
        </Col>

        {/* RIGHT — ROUTE DETAIL */}
        <Col
          xs={24}
          xl={7}
          style={{
            alignSelf:
              "flex-start",
          }}
        >
          <div
            style={{
              position:
                "sticky",
              top: 16,
            }}
          >
            <Card
              bordered={false}
              style={{
                borderRadius: 12,
                overflow:
                  "hidden",
              }}
              styles={{
                body: {
                  padding: 0,
                },
              }}
              title={
                <Space>
                  <EnvironmentOutlined
                    style={{
                      color:
                        "#1677ff",
                    }}
                  />

                  <Text strong>
                    Route Detail
                  </Text>
                </Space>
              }
            >
              {selectedRouteNormalized ? (
                <>
                  {/* ROUTE HEADER */}
                  <div
                    style={{
                      padding:
                        "12px 16px",
                      background:
                        "#f7fbff",
                      borderBottom:
                        "1px solid #e6f4ff",
                    }}
                  >
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 10,
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          ".08em",
                      }}
                    >
                      Delivery Route
                    </Text>

                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 8,
                        flexWrap:
                          "wrap",
                        marginTop: 6,
                      }}
                    >
                      <Text strong>
                        {
                          locations.find(
                            (location) =>
                              Number(
                                location.id,
                              ) ===
                              Number(
                                selectedRouteNormalized.pickup_coverage_location_id,
                              ),
                          )?.name
                        }
                      </Text>

                      <span
                        style={{
                          color:
                            "#1677ff",
                          fontSize: 18,
                        }}
                      >
                        →
                      </span>

                      <Text strong>
                        {
                          locations.find(
                            (location) =>
                              Number(
                                location.id,
                              ) ===
                              Number(
                                selectedRouteNormalized.delivery_coverage_location_id,
                              ),
                          )?.name
                        }
                      </Text>
                    </div>
                  </div>

                  {/* MAP */}
                  <div
                    style={{
                      padding: 12,
                    }}
                  >
                    <RouteMapS
                      nodes={
                        selectedRouteNodes
                      }
                      height={260}
                      selectedLabel="Route"
                    />
                  </div>

                  {/* DETAILS */}
                  <div
                    style={{
                      padding:
                        "0 12px 14px",
                    }}
                  >
                    <Row
                      gutter={8}
                      style={{
                        marginBottom: 10,
                      }}
                    >
                      {/* BASE RATE */}
                      <Col span={12}>
                        <div
                          style={{
                            padding: 10,
                            border:
                              "1px solid #f0f0f0",
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 10,
                              textTransform:
                                "uppercase",
                            }}
                          >
                            Base Rate
                          </Text>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 15,
                              fontWeight: 700,
                            }}
                          >
                            {formatMoney(
                              selectedRouteNormalized.base_rate,
                            )}
                          </div>
                        </div>
                      </Col>

                      {/* STATUS */}
                      <Col span={12}>
                        <div
                          style={{
                            padding: 10,
                            border:
                              "1px solid #f0f0f0",
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 10,
                              textTransform:
                                "uppercase",
                            }}
                          >
                            Status
                          </Text>

                          <div
                            style={{
                              marginTop: 6,
                            }}
                          >
                            <StatusTag
                              active={
                                selectedRouteActive
                              }
                            />
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <Descriptions
                      column={1}
                      size="small"
                    >
                      {/* EXPRESS */}
                      <Descriptions.Item label="Express">
                        {selectedRouteExpress ? (
                          <Tag color="orange">
                            Enabled
                          </Tag>
                        ) : (
                          <Tag color="default">
                            Disabled
                          </Tag>
                        )}
                      </Descriptions.Item>

                      {/* SAME DAY */}
                      <Descriptions.Item label="Same Day">
                        {selectedRouteSameDay ? (
                          <Tag color="magenta">
                            Enabled
                          </Tag>
                        ) : (
                          <Tag color="default">
                            Disabled
                          </Tag>
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Updated">
                        {formatDate(
                          selectedRouteNormalized.updated_at,
                        )}
                      </Descriptions.Item>
                    </Descriptions>

                    {/* ACTIONS */}
                    <Space
                      style={{
                        marginTop: 10,
                      }}
                    >
                      <Button
                        icon={
                          <SwapOutlined />
                        }
                        disabled={
                          Number(
                            selectedRouteNormalized.pickup_coverage_location_id,
                          ) ===
                            Number(
                              selectedRouteNormalized.delivery_coverage_location_id,
                            ) ||
                          Boolean(
                            rateMap[
                              `${selectedRouteNormalized.delivery_coverage_location_id}:${selectedRouteNormalized.pickup_coverage_location_id}`
                            ],
                          )
                        }
                        onClick={() =>
                          createReverse(
                            selectedRouteNormalized,
                          )
                        }
                      >
                        Reverse
                      </Button>

                      <Button
                        onClick={() =>
                          toggleStatus(
                            selectedRouteNormalized,
                          )
                        }
                      >
                        {selectedRouteActive
                          ? "Disable"
                          : "Enable"}
                      </Button>
                    </Space>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: 60,
                  }}
                >
                  <Empty description="Click a route to view details" />
                </div>
              )}
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}