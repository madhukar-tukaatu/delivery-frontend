"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  InputNumber,
  List,
  message,
  Pagination,
  Row,
  Space,
  Spin,
  Statistic,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from "antd";

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import {
  createBranchRouteRate,
  createReverseBranchRouteRate,
  deleteBranchRouteRate,
  getBranchRouteRateMatrix,
  updateBranchRouteRate,
  updateBranchRouteRateStatus,
} from "@/services/adminRateManagementService";

import { getPricingSettings } from "@/services/adminPricingConfigurationService";

import {
  apiErrorMessage,
  branchLabel,
  formatDate,
  formatMoney,
  normalizeBranch,
  normalizeBranchRate,
} from "@/utils/rate-management-page-utils";

const { Text, Title } = Typography;

/*
|--------------------------------------------------------------------------
| Map
|--------------------------------------------------------------------------
*/

const RouteMapS = dynamic(() => import("@/components/admin/rates/RouteMapS"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Spin />
    </div>
  ),
});

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
| API may return:
|
|   true
|   false
|   1
|   0
|   "1"
|   "0"
|   "true"
|   "false"
|
|--------------------------------------------------------------------------
*/

function toStatusBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }

  return Boolean(value);
}

/*
|--------------------------------------------------------------------------
| Number helper
|--------------------------------------------------------------------------
*/

function toSafeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

/*
|--------------------------------------------------------------------------
| Response helpers
|--------------------------------------------------------------------------
*/

function unwrapResponseData(response) {
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }

  if (response?.data !== undefined) {
    return response.data;
  }

  return response ?? null;
}

function extractRateFromResponse(response) {
  const payload = unwrapResponseData(response);

  if (payload?.rate && typeof payload.rate === "object") {
    return payload.rate;
  }

  if (
    payload?.branch_route_rate &&
    typeof payload.branch_route_rate === "object"
  ) {
    return payload.branch_route_rate;
  }

  if (
    payload?.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
  ) {
    return payload.data;
  }

  return payload;
}

/*
|--------------------------------------------------------------------------
| Rate normalization
|--------------------------------------------------------------------------
|
| This is intentionally separate from normalizeBranchRate().
|
| normalizeBranchRate() is useful for the general page, but the edit
| response must preserve the exact server values for:
|
|   express_enabled
|   same_day_enabled
|
|--------------------------------------------------------------------------
*/

function normalizePageRate(response, fallback = {}) {
  const raw = extractRateFromResponse(response) ?? {};

  const merged = {
    ...fallback,
    ...raw,
  };

  let normalized = {};

  try {
    normalized = normalizeBranchRate(merged) ?? {};
  } catch {
    normalized = {};
  }

  return {
    ...fallback,
    ...raw,
    ...normalized,

    id: raw.id ?? fallback.id ?? normalized.id,

    pickup_coverage_location_id:
      raw.pickup_coverage_location_id ??
      fallback.pickup_coverage_location_id ??
      normalized.pickup_coverage_location_id,

    delivery_coverage_location_id:
      raw.delivery_coverage_location_id ??
      fallback.delivery_coverage_location_id ??
      normalized.delivery_coverage_location_id,

    pickup_branch_id:
      raw.pickup_branch_id ??
      fallback.pickup_branch_id ??
      normalized.pickup_branch_id,

    delivery_branch_id:
      raw.delivery_branch_id ??
      fallback.delivery_branch_id ??
      normalized.delivery_branch_id,

    base_rate: raw.base_rate ?? fallback.base_rate ?? normalized.base_rate ?? 0,

    /*
     * Server response always wins.
     *
     * 0 must remain false.
     */
    is_active: toStatusBoolean(
      raw.is_active,
      toStatusBoolean(fallback.is_active, true),
    ),

    express_enabled: toStatusBoolean(
      raw.express_enabled,
      toStatusBoolean(fallback.express_enabled, true),
    ),

    same_day_enabled: toStatusBoolean(
      raw.same_day_enabled,
      toStatusBoolean(fallback.same_day_enabled, true),
    ),
  };
}

/*
|--------------------------------------------------------------------------
| Rate key
|--------------------------------------------------------------------------
*/

function getRateKey(rate) {
  if (!rate) {
    return null;
  }

  const pickup = rate.pickup_coverage_location_id ?? rate.pickup_branch_id;

  const delivery =
    rate.delivery_coverage_location_id ?? rate.delivery_branch_id;

  if (
    pickup === undefined ||
    pickup === null ||
    delivery === undefined ||
    delivery === null
  ) {
    return null;
  }

  return `${Number(pickup)}:${Number(delivery)}`;
}

/*
|--------------------------------------------------------------------------
| Branch ID
|--------------------------------------------------------------------------
*/

function getBranchId(branch) {
  if (branch === null || branch === undefined) {
    return null;
  }

  if (typeof branch === "number" || typeof branch === "string") {
    const id = Number(branch);

    return Number.isFinite(id) ? id : null;
  }

  const id = Number(
    branch.id ?? branch.branch_id ?? branch.coverage_location_id,
  );

  return Number.isFinite(id) ? id : null;
}

/*
|--------------------------------------------------------------------------
| Inline form defaults
|--------------------------------------------------------------------------
*/

const DEFAULT_INLINE_FORM = {
  base_rate: 0,
  is_active: true,
  express_enabled: true,
  same_day_enabled: true,
};

/*
|--------------------------------------------------------------------------
| Main page
|--------------------------------------------------------------------------
*/

export default function BranchPricingPage() {
  /*
   * Matrix data.
   */
  const [locations, setLocations] = useState([]);

  const [rateMap, setRateMap] = useState({});

  /*
   * Selected branch.
   */
  const [selectedPickupId, setSelectedPickupId] = useState(null);

  const [selectedRoute, setSelectedRoute] = useState(null);

  /*
   * Pricing configuration.
   */
  const [activePricingSettings, setActivePricingSettings] = useState(null);

  /*
   * Loading.
   */
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  /*
   * Search.
   */
  const [search, setSearch] = useState("");

  const [branchSearch, setBranchSearch] = useState("");

  /*
   * Destination tab.
   */
  const [destTab, setDestTab] = useState("all");

  /*
   * Branch tab.
   */
  const [branchTab, setBranchTab] = useState("all");

  const [branchPage, setBranchPage] = useState(1);

  /*
   * Inline add/edit.
   */
  const [inlineAdd, setInlineAdd] = useState(false);

  const [inlineEdit, setInlineEdit] = useState(null);

  const [inlineForm, setInlineForm] = useState({
    ...DEFAULT_INLINE_FORM,
  });

  const [inlineSaving, setInlineSaving] = useState(false);

  /*
   * Deleting.
   */
  const [deletingId, setDeletingId] = useState(null);

  /*
   * Active toggle.
   */
  const [statusSavingId, setStatusSavingId] = useState(null);

  /*
   * Reverse creation.
   */
  const [reverseSavingId, setReverseSavingId] = useState(null);

  /*
   * Message instance.
   */
  const [messageApi, contextHolder] = message.useMessage();

  /*
   |--------------------------------------------------------------------------
   | Load matrix
   |--------------------------------------------------------------------------
   */

  const loadMatrix = useCallback(
    async ({ preserveSelection = true } = {}) => {
      try {
        setLoading(true);

        const response = await getBranchRouteRateMatrix();

        const payload = unwrapResponseData(response) ?? {};

        /*
         * Matrix may be returned in several Laravel formats.
         */
        const rawLocations = Array.isArray(payload?.locations)
          ? payload.locations
          : Array.isArray(payload?.branches)
            ? payload.branches
            : [];

        const rawRates = Array.isArray(payload?.rates)
          ? payload.rates
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

        /*
         * Normalize locations.
         */
        const normalizedLocations = rawLocations
          .map((location) => {
            try {
              return normalizeBranch(location);
            } catch {
              return location;
            }
          })
          .filter(Boolean);

        /*
         * Normalize rates.
         */
        const nextRateMap = {};

        rawRates.forEach((rawRate) => {
          const rate = normalizePageRate(rawRate);

          const key = getRateKey(rate);

          if (key) {
            nextRateMap[key] = rate;
          }
        });

        setLocations(normalizedLocations);

        setRateMap(nextRateMap);

        /*
         * Preserve current pickup selection when possible.
         */
        setSelectedPickupId((previous) => {
          if (
            preserveSelection &&
            previous !== null &&
            previous !== undefined
          ) {
            const exists = normalizedLocations.some(
              (branch) => Number(getBranchId(branch)) === Number(previous),
            );

            if (exists) {
              return previous;
            }
          }

          return getBranchId(normalizedLocations[0]) ?? null;
        });

        /*
         * Refresh currently selected route from the newly loaded map.
         */
        setSelectedRoute((previous) => {
          if (!previous) {
            return null;
          }

          const key = getRateKey(previous);

          return key && nextRateMap[key] ? nextRateMap[key] : previous;
        });
      } catch (error) {
        console.error("Failed to load branch pricing matrix:", error);

        messageApi.error(
          apiErrorMessage(error, "Failed to load branch pricing."),
        );
      } finally {
        setLoading(false);
      }
    },
    [messageApi],
  );

  /*
   |--------------------------------------------------------------------------
   | Load pricing settings
   |--------------------------------------------------------------------------
   */

  const loadPricingSettings = useCallback(async () => {
    try {
      const response = await getPricingSettings({
        status: "active",
        per_page: 100,
      });

      const payload = unwrapResponseData(response);

      /*
       * API may return:
       *
       * []
       * { data: [] }
       * { active: {...} }
       * {...}
       */
      if (Array.isArray(payload)) {
        const active =
          payload.find((item) => toStatusBoolean(item?.is_active, false)) ??
          payload[0] ??
          null;

        setActivePricingSettings(active);

        return;
      }

      if (payload?.active && typeof payload.active === "object") {
        setActivePricingSettings(payload.active);

        return;
      }

      if (Array.isArray(payload?.data)) {
        const active =
          payload.data.find((item) =>
            toStatusBoolean(item?.is_active, false),
          ) ??
          payload.data[0] ??
          null;

        setActivePricingSettings(active);

        return;
      }

      setActivePricingSettings(payload ?? null);
    } catch (error) {
      console.error("Failed to load pricing settings:", error);
    }
  }, []);

  /*
   |--------------------------------------------------------------------------
   | Initial load
   |--------------------------------------------------------------------------
   */

  useEffect(() => {
    loadMatrix();
    loadPricingSettings();
  }, [loadMatrix, loadPricingSettings]);

  /*
   |--------------------------------------------------------------------------
   | Current pickup branch
   |--------------------------------------------------------------------------
   */

  const selectedPickup = useMemo(() => {
    if (selectedPickupId === null || selectedPickupId === undefined) {
      return null;
    }

    return (
      locations.find(
        (branch) => Number(getBranchId(branch)) === Number(selectedPickupId),
      ) ?? null
    );
  }, [locations, selectedPickupId]);

  /*
   |--------------------------------------------------------------------------
   | Destination rates
   |--------------------------------------------------------------------------
   */

  const destinationRates = useMemo(() => {
    if (selectedPickupId === null || selectedPickupId === undefined) {
      return [];
    }

    return locations
      .filter(
        (destination) =>
          Number(getBranchId(destination)) !== Number(selectedPickupId),
      )
      .map((destination) => {
        const destinationId = getBranchId(destination);

        const key = `${Number(selectedPickupId)}:${Number(destinationId)}`;

        const rate = rateMap[key] ?? null;

        return {
          destination,
          rate,
        };
      });
  }, [locations, rateMap, selectedPickupId]);

  /*
   |--------------------------------------------------------------------------
   | Filter destinations
   |--------------------------------------------------------------------------
   */

  const filteredDestinationRates = useMemo(() => {
    let rows = destinationRates;

    /*
     * Status tab.
     */
    if (destTab === "active") {
      rows = rows.filter(({ rate }) => rate && rate.is_active === true);
    }

    if (destTab === "inactive") {
      rows = rows.filter(({ rate }) => rate && rate.is_active === false);
    }

    /*
     * Search.
     */
    const query = String(search ?? "")
      .trim()
      .toLowerCase();

    if (query) {
      rows = rows.filter(({ destination, rate }) => {
        const text = [destination?.name, destination?.code, rate?.id]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase();

        return text.includes(query);
      });
    }

    return rows;
  }, [destinationRates, destTab, search]);

  /*
   |--------------------------------------------------------------------------
   | Branch list
   |--------------------------------------------------------------------------
   */

  const filteredBranches = useMemo(() => {
    let rows = [...locations];

    if (branchTab === "configured") {
      rows = rows.filter((branch) => {
        const branchId = getBranchId(branch);

        return Object.keys(rateMap).some(
          (key) => Number(key.split(":")[0]) === Number(branchId),
        );
      });
    }

    if (branchTab === "unconfigured") {
      rows = rows.filter((branch) => {
        const branchId = getBranchId(branch);

        return !Object.keys(rateMap).some(
          (key) => Number(key.split(":")[0]) === Number(branchId),
        );
      });
    }

    const query = String(branchSearch ?? "")
      .trim()
      .toLowerCase();

    if (query) {
      rows = rows.filter((branch) => {
        const text = [branch?.name, branch?.code, branch?.id]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
          .toLowerCase();

        return text.includes(query);
      });
    }

    return rows;
  }, [locations, rateMap, branchSearch, branchTab]);

  /*
   |--------------------------------------------------------------------------
   | Branch pagination
   |--------------------------------------------------------------------------
   */

  const paginatedBranches = useMemo(() => {
    const start = (branchPage - 1) * BRANCH_PAGE_SIZE;

    return filteredBranches.slice(start, start + BRANCH_PAGE_SIZE);
  }, [filteredBranches, branchPage]);

  /*
   |--------------------------------------------------------------------------
   | Stats
   |--------------------------------------------------------------------------
   */

  const stats = useMemo(() => {
    const rates = Object.values(rateMap);

    const active = rates.filter((rate) => rate?.is_active === true).length;

    const inactive = rates.filter((rate) => rate?.is_active === false).length;

    const express = rates.filter(
      (rate) => rate?.express_enabled === true,
    ).length;

    const sameDay = rates.filter(
      (rate) => rate?.same_day_enabled === true,
    ).length;

    return {
      total: rates.length,
      active,
      inactive,
      express,
      sameDay,
    };
  }, [rateMap]);

  /*
   |--------------------------------------------------------------------------
   | Selected route nodes
   |--------------------------------------------------------------------------
   */

  const selectedRouteNodes = useMemo(() => {
    if (!selectedRoute) {
      return [];
    }

    const pickupId =
      selectedRoute.pickup_coverage_location_id ??
      selectedRoute.pickup_branch_id;

    const deliveryId =
      selectedRoute.delivery_coverage_location_id ??
      selectedRoute.delivery_branch_id;

    const pickup = locations.find(
      (branch) => Number(getBranchId(branch)) === Number(pickupId),
    );

    const delivery = locations.find(
      (branch) => Number(getBranchId(branch)) === Number(deliveryId),
    );

    return [pickup, delivery].filter(Boolean);
  }, [locations, selectedRoute]);

  /*
   |--------------------------------------------------------------------------
   | Select pickup branch
   |--------------------------------------------------------------------------
   */

  const handleSelectPickup = useCallback((branch) => {
    const id = getBranchId(branch);

    if (id === null || id === undefined) {
      return;
    }

    setSelectedPickupId(id);
    setSelectedRoute(null);
    setInlineEdit(null);
    setInlineAdd(false);
    setBranchPage(1);
  }, []);

  /*
   |--------------------------------------------------------------------------
   | Select route
   |--------------------------------------------------------------------------
   */

  const handleSelectRoute = useCallback((rate) => {
    if (!rate) {
      return;
    }

    const normalized = normalizePageRate(rate);

    setSelectedRoute(normalized);
  }, []);

  /*
   |--------------------------------------------------------------------------
   | Start inline edit
   |--------------------------------------------------------------------------
   */

  const startEdit = useCallback(
    (rate) => {
      if (!rate?.id) {
        messageApi.error("Invalid pricing record.");
        return;
      }

      const normalized = normalizePageRate(rate);

      setInlineAdd(false);
      setInlineEdit(normalized.id);

      setInlineForm({
        base_rate: toSafeNumber(normalized.base_rate, 0),

        is_active: toStatusBoolean(normalized.is_active, true),

        /*
         * IMPORTANT:
         *
         * 0 => false
         * 1 => true
         *
         * Do NOT use:
         *
         * Boolean(value)
         *
         * when value might be a string.
         */
        express_enabled: toStatusBoolean(normalized.express_enabled, true),

        same_day_enabled: toStatusBoolean(normalized.same_day_enabled, true),
      });
    },
    [messageApi],
  );

  /*
   |--------------------------------------------------------------------------
   | Cancel inline edit
   |--------------------------------------------------------------------------
   */

  const cancelInlineEdit = useCallback(() => {
    setInlineEdit(null);

    setInlineForm({
      ...DEFAULT_INLINE_FORM,
    });
  }, []);

  /*
   |--------------------------------------------------------------------------
   | Start inline add
   |--------------------------------------------------------------------------
   */

  const startInlineAdd = useCallback(() => {
    if (selectedPickupId === null || selectedPickupId === undefined) {
      messageApi.warning("Select a pickup branch first.");
      return;
    }

    setInlineEdit(null);

    setInlineAdd(true);

    setInlineForm({
      ...DEFAULT_INLINE_FORM,
    });
  }, [selectedPickupId, messageApi]);

  /*
   |--------------------------------------------------------------------------
   | Save inline edit
   |--------------------------------------------------------------------------
   |
   | THIS IS THE IMPORTANT FIX.
   |
   | The API response:
   |
   |   express_enabled: 0
   |   same_day_enabled: 1
   |
   | is converted to:
   |
   |   express_enabled: false
   |   same_day_enabled: true
   |
   | and stored in React state.
   |--------------------------------------------------------------------------
   */

  const handleInlineSave = useCallback(
    async (rate) => {
      if (!rate?.id) {
        messageApi.error("Invalid rate selected.");
        return;
      }

      try {
        setInlineSaving(true);

        const pickupCoverageId =
          rate.pickup_coverage_location_id ?? rate.pickup_branch_id;

        const deliveryCoverageId =
          rate.delivery_coverage_location_id ?? rate.delivery_branch_id;

        const payload = {
          pickup_coverage_location_id: Number(pickupCoverageId),

          delivery_coverage_location_id: Number(deliveryCoverageId),

          base_rate: toSafeNumber(
            inlineForm.base_rate,
            toSafeNumber(rate.base_rate, 0),
          ),

          is_active: toStatusBoolean(
            inlineForm.is_active,
            toStatusBoolean(rate.is_active, true),
          ),

          express_enabled: toStatusBoolean(
            inlineForm.express_enabled,
            toStatusBoolean(rate.express_enabled, true),
          ),

          same_day_enabled: toStatusBoolean(
            inlineForm.same_day_enabled,
            toStatusBoolean(rate.same_day_enabled, true),
          ),
        };

        /*
         * Send to Laravel.
         */
        const response = await updateBranchRouteRate(rate.id, payload);

        /*
         * Extract actual server object.
         */
        const serverRate = extractRateFromResponse(response) ?? {};

        /*
         * Server response is authoritative.
         *
         * Example:
         *
         * express_enabled: 0
         * same_day_enabled: 1
         */
        const updatedRate = normalizePageRate(
          {
            ...rate,
            ...serverRate,
          },
          {
            ...rate,

            /*
             * Fallback only if backend does not return a field.
             */
            ...payload,
          },
        );

        /*
         * Force the three values from the actual response
         * when present.
         *
         * This prevents normalizeBranchRate() from accidentally
         * replacing them.
         */
        updatedRate.base_rate = serverRate.base_rate ?? payload.base_rate;

        updatedRate.is_active =
          serverRate.is_active !== undefined && serverRate.is_active !== null
            ? toStatusBoolean(serverRate.is_active)
            : payload.is_active;

        updatedRate.express_enabled =
          serverRate.express_enabled !== undefined &&
          serverRate.express_enabled !== null
            ? toStatusBoolean(serverRate.express_enabled)
            : payload.express_enabled;

        updatedRate.same_day_enabled =
          serverRate.same_day_enabled !== undefined &&
          serverRate.same_day_enabled !== null
            ? toStatusBoolean(serverRate.same_day_enabled)
            : payload.same_day_enabled;

        /*
         * Keep IDs stable.
         */
        updatedRate.pickup_coverage_location_id =
          serverRate.pickup_coverage_location_id ??
          rate.pickup_coverage_location_id ??
          pickupCoverageId;

        updatedRate.delivery_coverage_location_id =
          serverRate.delivery_coverage_location_id ??
          rate.delivery_coverage_location_id ??
          deliveryCoverageId;

        updatedRate.id = serverRate.id ?? rate.id;

        /*
         * Update rate map.
         */
        const key = getRateKey(updatedRate);

        setRateMap((previous) => {
          const next = {
            ...previous,
          };

          if (key) {
            next[key] = updatedRate;
          }

          return next;
        });

        /*
         * IMPORTANT:
         *
         * Update selectedRoute too.
         *
         * Otherwise the detail panel can still display
         * stale Express / Same Day values.
         */
        setSelectedRoute((previous) => {
          if (!previous || Number(previous.id) !== Number(updatedRate.id)) {
            return previous;
          }

          return {
            ...previous,
            ...updatedRate,
          };
        });

        /*
         * IMPORTANT:
         *
         * Keep inlineForm synchronized with the server response.
         */
        setInlineForm({
          base_rate: toSafeNumber(updatedRate.base_rate, 0),

          is_active: toStatusBoolean(updatedRate.is_active, true),

          express_enabled: toStatusBoolean(updatedRate.express_enabled, true),

          same_day_enabled: toStatusBoolean(updatedRate.same_day_enabled, true),
        });

        setInlineEdit(null);

        messageApi.success("Branch pricing updated successfully.");
      } catch (error) {
        console.error("Failed to update branch pricing:", error);

        messageApi.error(
          apiErrorMessage(error, "Failed to update branch pricing."),
        );
      } finally {
        setInlineSaving(false);
      }
    },
    [inlineForm, messageApi],
  );

  /*
   |--------------------------------------------------------------------------
   | Save inline add
   |--------------------------------------------------------------------------
   */

  const handleInlineAdd = useCallback(async () => {
    if (selectedPickupId === null || selectedPickupId === undefined) {
      messageApi.error("Select a pickup branch first.");
      return;
    }

    const destinationId =
      inlineForm.delivery_coverage_location_id ?? inlineForm.delivery_branch_id;

    if (!destinationId) {
      messageApi.error("Select a destination branch.");
      return;
    }

    try {
      setInlineSaving(true);

      const payload = {
        pickup_coverage_location_id: Number(selectedPickupId),

        delivery_coverage_location_id: Number(destinationId),

        base_rate: toSafeNumber(inlineForm.base_rate, 0),

        is_active: toStatusBoolean(inlineForm.is_active, true),

        express_enabled: toStatusBoolean(inlineForm.express_enabled, true),

        same_day_enabled: toStatusBoolean(inlineForm.same_day_enabled, true),
      };

      const response = await createBranchRouteRate(payload);

      const serverRate = extractRateFromResponse(response) ?? {};

      const createdRate = normalizePageRate(
        {
          ...payload,
          ...serverRate,
        },
        payload,
      );

      /*
       * Server values win.
       */
      if (serverRate.base_rate !== undefined) {
        createdRate.base_rate = serverRate.base_rate;
      }

      if (serverRate.is_active !== undefined) {
        createdRate.is_active = toStatusBoolean(serverRate.is_active);
      }

      if (serverRate.express_enabled !== undefined) {
        createdRate.express_enabled = toStatusBoolean(
          serverRate.express_enabled,
        );
      }

      if (serverRate.same_day_enabled !== undefined) {
        createdRate.same_day_enabled = toStatusBoolean(
          serverRate.same_day_enabled,
        );
      }

      const key = getRateKey(createdRate);

      if (key) {
        setRateMap((previous) => ({
          ...previous,
          [key]: createdRate,
        }));
      }

      setSelectedRoute(createdRate);

      setInlineAdd(false);

      messageApi.success("Branch pricing created successfully.");
    } catch (error) {
      console.error("Failed to create branch pricing:", error);

      messageApi.error(
        apiErrorMessage(error, "Failed to create branch pricing."),
      );
    } finally {
      setInlineSaving(false);
    }
  }, [inlineForm, selectedPickupId, messageApi]);

  /*
   |--------------------------------------------------------------------------
   | Toggle active status
   |--------------------------------------------------------------------------
   */

  const toggleStatus = useCallback(
    async (rate) => {
      if (!rate?.id) {
        return;
      }

      const current = toStatusBoolean(rate.is_active, false);

      const nextStatus = !current;

      try {
        setStatusSavingId(rate.id);

        const response = await updateBranchRouteRateStatus(rate.id, nextStatus);

        const serverRate = extractRateFromResponse(response);

        const updatedRate = normalizePageRate(
          serverRate ?? {
            ...rate,
            is_active: nextStatus,
          },
          {
            ...rate,
            is_active: nextStatus,
          },
        );

        /*
         * The status endpoint may return only:
         *
         * { is_active: 1 }
         *
         * so explicitly preserve the toggled state.
         */
        if (serverRate?.is_active === undefined) {
          updatedRate.is_active = nextStatus;
        }

        const key = getRateKey(updatedRate);

        setRateMap((previous) => {
          const next = {
            ...previous,
          };

          if (key) {
            next[key] = updatedRate;
          }

          return next;
        });

        setSelectedRoute((previous) => {
          if (!previous || Number(previous.id) !== Number(updatedRate.id)) {
            return previous;
          }

          return {
            ...previous,
            ...updatedRate,
            is_active: updatedRate.is_active,
          };
        });

        messageApi.success(
          nextStatus
            ? "Branch pricing activated."
            : "Branch pricing deactivated.",
        );
      } catch (error) {
        console.error("Failed to update pricing status:", error);

        messageApi.error(
          apiErrorMessage(error, "Failed to update pricing status."),
        );
      } finally {
        setStatusSavingId(null);
      }
    },
    [messageApi],
  );

  /*
   |--------------------------------------------------------------------------
   | Delete rate
   |--------------------------------------------------------------------------
   */

  const handleDelete = useCallback(
    async (rate) => {
      if (!rate?.id) {
        return;
      }

      const confirmed = window.confirm("Delete this branch pricing?");

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(rate.id);

        await deleteBranchRouteRate(rate.id);

        const key = getRateKey(rate);

        setRateMap((previous) => {
          const next = {
            ...previous,
          };

          if (key) {
            delete next[key];
          }

          return next;
        });

        setSelectedRoute((previous) =>
          previous && Number(previous.id) === Number(rate.id) ? null : previous,
        );

        messageApi.success("Branch pricing deleted successfully.");
      } catch (error) {
        console.error("Failed to delete branch pricing:", error);

        messageApi.error(
          apiErrorMessage(error, "Failed to delete branch pricing."),
        );
      } finally {
        setDeletingId(null);
      }
    },
    [messageApi],
  );

  /*
   |--------------------------------------------------------------------------
   | Create reverse rate
   |--------------------------------------------------------------------------
   |
   | Example:
   |
   | KTM -> Kavre
   |
   | becomes:
   |
   | Kavre -> KTM
   |
   | Original price is preserved.
   |--------------------------------------------------------------------------
   */

  const createReverse = useCallback(
    async (rate) => {
      if (!rate) {
        return;
      }

      if (!rate.id) {
        messageApi.error("Invalid pricing record.");
        return;
      }

      try {
        setReverseSavingId(rate.id);

        /*
         * Explicitly preserve all commercial values.
         */
        const originalBaseRate = toSafeNumber(rate.base_rate, 0);

        const originalActive = toStatusBoolean(rate.is_active, true);

        const originalExpress = toStatusBoolean(rate.express_enabled, true);

        const originalSameDay = toStatusBoolean(rate.same_day_enabled, true);

        const response = await createReverseBranchRouteRate(
          {
            ...rate,

            /*
             * Make sure the reverse helper sees
             * the actual pricing IDs.
             */
            pickup_coverage_location_id:
              rate.pickup_coverage_location_id ?? rate.pickup_branch_id,

            delivery_coverage_location_id:
              rate.delivery_coverage_location_id ?? rate.delivery_branch_id,

            base_rate: originalBaseRate,

            is_active: originalActive,

            express_enabled: originalExpress,

            same_day_enabled: originalSameDay,
          },
          {
            base_rate: originalBaseRate,

            is_active: originalActive,

            express_enabled: originalExpress,

            same_day_enabled: originalSameDay,
          },
        );

        const serverRate = extractRateFromResponse(response) ?? {};

        /*
         * IMPORTANT:
         *
         * API response may not contain every field.
         *
         * Therefore we explicitly preserve the original
         * commercial values.
         */
        const reversePickupId =
          rate.delivery_coverage_location_id ?? rate.delivery_branch_id;

        const reverseDeliveryId =
          rate.pickup_coverage_location_id ?? rate.pickup_branch_id;

        const reverseRate = normalizePageRate({
          ...serverRate,

          /*
           * Fallback values.
           */
          pickup_coverage_location_id:
            serverRate.pickup_coverage_location_id ?? reversePickupId,

          delivery_coverage_location_id:
            serverRate.delivery_coverage_location_id ?? reverseDeliveryId,

          pickup_branch_id: serverRate.pickup_branch_id ?? reversePickupId,

          delivery_branch_id:
            serverRate.delivery_branch_id ?? reverseDeliveryId,

          /*
           * DO NOT let an incomplete API response
           * remove the price.
           */
          base_rate: serverRate.base_rate ?? originalBaseRate,

          is_active: serverRate.is_active ?? originalActive,

          express_enabled: serverRate.express_enabled ?? originalExpress,

          same_day_enabled: serverRate.same_day_enabled ?? originalSameDay,
        });

        /*
         * Explicitly reassert values.
         */
        reverseRate.base_rate = serverRate.base_rate ?? originalBaseRate;

        reverseRate.is_active =
          serverRate.is_active !== undefined && serverRate.is_active !== null
            ? toStatusBoolean(serverRate.is_active)
            : originalActive;

        reverseRate.express_enabled =
          serverRate.express_enabled !== undefined &&
          serverRate.express_enabled !== null
            ? toStatusBoolean(serverRate.express_enabled)
            : originalExpress;

        reverseRate.same_day_enabled =
          serverRate.same_day_enabled !== undefined &&
          serverRate.same_day_enabled !== null
            ? toStatusBoolean(serverRate.same_day_enabled)
            : originalSameDay;

        reverseRate.pickup_coverage_location_id =
          serverRate.pickup_coverage_location_id ?? reversePickupId;

        reverseRate.delivery_coverage_location_id =
          serverRate.delivery_coverage_location_id ?? reverseDeliveryId;

        /*
         * If backend returns the new ID, use it.
         */
        reverseRate.id =
          serverRate.id ??
          serverRate.forward_id ??
          serverRate.branch_route_rate_id ??
          reverseRate.id;

        const key = getRateKey(reverseRate);

        if (key) {
          setRateMap((previous) => ({
            ...previous,
            [key]: reverseRate,
          }));
        }

        setSelectedRoute(reverseRate);

        messageApi.success("Reverse branch pricing created successfully.");
      } catch (error) {
        console.error("Failed to create reverse branch pricing:", error);

        messageApi.error(
          apiErrorMessage(error, "Failed to create reverse branch pricing."),
        );
      } finally {
        setReverseSavingId(null);
      }
    },
    [messageApi],
  );

  /*
   |--------------------------------------------------------------------------
   | Render inline fields
   |--------------------------------------------------------------------------
   */

  const renderInlineForm = useCallback(
    ({ rate = null, isNew = false } = {}) => {
      return (
        <Card
          size="small"
          style={{
            marginTop: 8,
            background: "#fafafa",
          }}
        >
          <Space
            direction="vertical"
            size={12}
            style={{
              width: "100%",
            }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12} md={8}>
                <Text type="secondary">Base Rate</Text>

                <InputNumber
                  style={{
                    width: "100%",
                    marginTop: 4,
                  }}
                  min={0}
                  precision={2}
                  value={inlineForm.base_rate}
                  onChange={(value) =>
                    setInlineForm((previous) => ({
                      ...previous,
                      base_rate: value ?? 0,
                    }))
                  }
                />
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Text type="secondary">Active</Text>

                <div
                  style={{
                    marginTop: 8,
                  }}
                >
                  <Switch
                    checked={inlineForm.is_active === true}
                    onChange={(checked) =>
                      setInlineForm((previous) => ({
                        ...previous,
                        is_active: checked,
                      }))
                    }
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                  />
                </div>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Text type="secondary">Express</Text>

                <div
                  style={{
                    marginTop: 8,
                  }}
                >
                  <Switch
                    /*
                     * IMPORTANT:
                     *
                     * Controlled by inlineForm.
                     *
                     * API:
                     *   0 => false => OFF
                     *   1 => true  => ON
                     */
                    checked={inlineForm.express_enabled === true}
                    onChange={(checked) =>
                      setInlineForm((previous) => ({
                        ...previous,
                        express_enabled: checked,
                      }))
                    }
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                  />
                </div>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Text type="secondary">Same Day</Text>

                <div
                  style={{
                    marginTop: 8,
                  }}
                >
                  <Switch
                    /*
                     * IMPORTANT:
                     *
                     * Controlled by inlineForm.
                     */
                    checked={inlineForm.same_day_enabled === true}
                    onChange={(checked) =>
                      setInlineForm((previous) => ({
                        ...previous,
                        same_day_enabled: checked,
                      }))
                    }
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                  />
                </div>
              </Col>
            </Row>

            <Space>
              <Button
                type="primary"
                size="small"
                loading={inlineSaving}
                onClick={() => {
                  if (isNew) {
                    handleInlineAdd();
                  } else {
                    handleInlineSave(rate);
                  }
                }}
              >
                Save
              </Button>

              <Button
                size="small"
                disabled={inlineSaving}
                onClick={() => {
                  if (isNew) {
                    setInlineAdd(false);
                  } else {
                    cancelInlineEdit();
                  }
                }}
              >
                Cancel
              </Button>
            </Space>
          </Space>
        </Card>
      );
    },
    [
      inlineForm,
      inlineSaving,
      handleInlineAdd,
      handleInlineSave,
      cancelInlineEdit,
    ],
  );

  /*
   |--------------------------------------------------------------------------
   | Destination row
   |--------------------------------------------------------------------------
   */

  const renderDestinationRow = useCallback(
    ({ destination, rate }) => {
      const destinationId = getBranchId(destination);

      const isEditing = rate && Number(inlineEdit) === Number(rate.id);

      const rateExists = Boolean(rate);

      const isActive = rateExists && rate.is_active === true;

      const expressEnabled = rateExists && rate.express_enabled === true;

      const sameDayEnabled = rateExists && rate.same_day_enabled === true;

      return (
        <List.Item
          key={destinationId}
          style={{
            cursor: rateExists ? "pointer" : "default",
          }}
          onClick={() => {
            if (rate && !isEditing) {
              handleSelectRoute(rate);
            }
          }}
          actions={
            !isEditing && rate
              ? [
                  <Tooltip title="Edit pricing" key="edit">
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={(event) => {
                        event.stopPropagation();
                        startEdit(rate);
                      }}
                    />
                  </Tooltip>,

                  <Tooltip title="Create reverse pricing" key="reverse">
                    <Button
                      type="text"
                      icon={<SwapOutlined />}
                      loading={reverseSavingId === rate.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        createReverse(rate);
                      }}
                    />
                  </Tooltip>,

                  <Tooltip
                    title={isActive ? "Deactivate" : "Activate"}
                    key="status"
                  >
                    <Switch
                      size="small"
                      checked={isActive}
                      loading={statusSavingId === rate.id}
                      onChange={() => toggleStatus(rate)}
                    />
                  </Tooltip>,

                  <Tooltip title="Delete pricing" key="delete">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      loading={deletingId === rate.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(rate);
                      }}
                    />
                  </Tooltip>,
                ]
              : []
          }
        >
          <List.Item.Meta
            avatar={
              <EnvironmentOutlined
                style={{
                  fontSize: 20,
                }}
              />
            }
            title={
              <Space wrap>
                <span>{branchLabel(destination)}</span>

                {destination?.code && <Tag>{destination.code}</Tag>}
              </Space>
            }
            description={
              rate ? (
                <Space wrap size={[6, 6]}>
                  <Tag>{formatMoney(rate.base_rate)}</Tag>

                  <Tag
                    icon={
                      expressEnabled ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )
                    }
                  >
                    Express {expressEnabled ? "ON" : "OFF"}
                  </Tag>

                  <Tag
                    icon={
                      sameDayEnabled ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )
                    }
                  >
                    Same Day {sameDayEnabled ? "ON" : "OFF"}
                  </Tag>

                  <Tag color={isActive ? "success" : "default"}>
                    {isActive ? "Active" : "Inactive"}
                  </Tag>
                </Space>
              ) : (
                <Text type="secondary">No branch pricing configured</Text>
              )
            }
          />

          {isEditing &&
            renderInlineForm({
              rate,
              isNew: false,
            })}
        </List.Item>
      );
    },
    [
      inlineEdit,
      reverseSavingId,
      statusSavingId,
      deletingId,
      handleSelectRoute,
      startEdit,
      createReverse,
      toggleStatus,
      handleDelete,
      renderInlineForm,
    ],
  );

  /*
   |--------------------------------------------------------------------------
   | Loading state
   |--------------------------------------------------------------------------
   */

  if (loading) {
    return (
      <div
        style={{
          minHeight: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">Loading branch pricing...</Text>
        </Space>
      </div>
    );
  }

  /*
   |--------------------------------------------------------------------------
   | Page
   |--------------------------------------------------------------------------
   */

  return (
    <>
      {contextHolder}

      <div
        style={{
          padding: 24,
        }}
      >
        <Space
          direction="vertical"
          size={24}
          style={{
            width: "100%",
          }}
        >
          {/* ------------------------------------------------------------ */}
          {/* Header                                                        */}
          {/* ------------------------------------------------------------ */}

          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col>
              <Space direction="vertical" size={4}>
                <Title
                  level={2}
                  style={{
                    margin: 0,
                  }}
                >
                  Branch Pricing
                </Title>

                <Text type="secondary">
                  Configure commercial pricing between branch coverage
                  locations.
                </Text>
              </Space>
            </Col>

            <Col>
              <Space wrap>
                <Button icon={<ReloadOutlined />} onClick={() => loadMatrix()}>
                  Refresh
                </Button>

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={startInlineAdd}
                >
                  Add Pricing
                </Button>
              </Space>
            </Col>
          </Row>

          {/* ------------------------------------------------------------ */}
          {/* Pricing settings                                              */}
          {/* ------------------------------------------------------------ */}

          {activePricingSettings && (
            <Alert
              type="info"
              showIcon
              message={
                <Space wrap>
                  <Text strong>Active Pricing Configuration</Text>

                  {activePricingSettings?.version && (
                    <Tag>Version {activePricingSettings.version}</Tag>
                  )}

                  {activePricingSettings?.name && (
                    <Tag>{activePricingSettings.name}</Tag>
                  )}
                </Space>
              }
              description={
                activePricingSettings?.updated_at
                  ? `Updated ${formatDate(activePricingSettings.updated_at)}`
                  : undefined
              }
            />
          )}

          {/* ------------------------------------------------------------ */}
          {/* Statistics                                                    */}
          {/* ------------------------------------------------------------ */}

          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic title="Total Rates" value={stats.total} />
              </Card>
            </Col>

            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic title="Active" value={stats.active} />
              </Card>
            </Col>

            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic title="Inactive" value={stats.inactive} />
              </Card>
            </Col>

            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic title="Express" value={stats.express} />
              </Card>
            </Col>

            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic title="Same Day" value={stats.sameDay} />
              </Card>
            </Col>
          </Row>

          {/* ------------------------------------------------------------ */}
          {/* Main content                                                  */}
          {/* ------------------------------------------------------------ */}

          <Row gutter={[16, 16]}>
            {/* ---------------------------------------------------------- */}
            {/* Branch selector                                             */}
            {/* ---------------------------------------------------------- */}

            <Col xs={24} lg={7}>
              <Card
                title="Pickup Branch"
                extra={<Tag>{filteredBranches.length}</Tag>}
              >
                <Space
                  direction="vertical"
                  size={12}
                  style={{
                    width: "100%",
                  }}
                >
                  <Input
                    allowClear
                    prefix={<EnvironmentOutlined />}
                    placeholder="Search branch..."
                    value={branchSearch}
                    onChange={(event) => {
                      setBranchSearch(event.target.value);
                      setBranchPage(1);
                    }}
                  />

                  <Space wrap>
                    <Button
                      size="small"
                      type={branchTab === "all" ? "primary" : "default"}
                      onClick={() => {
                        setBranchTab("all");
                        setBranchPage(1);
                      }}
                    >
                      All
                    </Button>

                    <Button
                      size="small"
                      type={branchTab === "configured" ? "primary" : "default"}
                      onClick={() => {
                        setBranchTab("configured");
                        setBranchPage(1);
                      }}
                    >
                      Configured
                    </Button>

                    <Button
                      size="small"
                      type={
                        branchTab === "unconfigured" ? "primary" : "default"
                      }
                      onClick={() => {
                        setBranchTab("unconfigured");
                        setBranchPage(1);
                      }}
                    >
                      Unconfigured
                    </Button>
                  </Space>

                  <List
                    size="small"
                    dataSource={paginatedBranches}
                    locale={{
                      emptyText: "No branches found.",
                    }}
                    renderItem={(branch) => {
                      const id = getBranchId(branch);

                      const selected = Number(id) === Number(selectedPickupId);

                      return (
                        <List.Item
                          key={id}
                          style={{
                            cursor: "pointer",
                            borderRadius: 8,
                            padding: "10px 12px",
                            background: selected ? "#f0f5ff" : undefined,
                          }}
                          onClick={() => handleSelectPickup(branch)}
                        >
                          <List.Item.Meta
                            avatar={
                              <EnvironmentOutlined
                                style={{
                                  color: selected ? "#1677ff" : undefined,
                                }}
                              />
                            }
                            title={
                              <Text strong={selected}>
                                {branchLabel(branch)}
                              </Text>
                            }
                            description={branch?.code ?? `Branch #${id}`}
                          />
                        </List.Item>
                      );
                    }}
                  />

                  <Pagination
                    size="small"
                    current={branchPage}
                    pageSize={BRANCH_PAGE_SIZE}
                    total={filteredBranches.length}
                    showSizeChanger={false}
                    onChange={(page) => setBranchPage(page)}
                  />
                </Space>
              </Card>
            </Col>

            {/* ---------------------------------------------------------- */}
            {/* Destination pricing                                        */}
            {/* ---------------------------------------------------------- */}

            <Col xs={24} lg={10}>
              <Card
                title={
                  <Space wrap>
                    <span>Destination Pricing</span>

                    {selectedPickup && (
                      <Tag color="blue">From {branchLabel(selectedPickup)}</Tag>
                    )}
                  </Space>
                }
                extra={
                  <Button size="small" type="link" onClick={() => loadMatrix()}>
                    Refresh
                  </Button>
                }
              >
                {!selectedPickup ? (
                  <Empty description="Select a pickup branch." />
                ) : (
                  <Space
                    direction="vertical"
                    size={12}
                    style={{
                      width: "100%",
                    }}
                  >
                    {/* Destination filters */}
                    <Row justify="space-between" gutter={[8, 8]}>
                      <Col>
                        <Space wrap>
                          <Button
                            size="small"
                            type={destTab === "all" ? "primary" : "default"}
                            onClick={() => setDestTab("all")}
                          >
                            All
                          </Button>

                          <Button
                            size="small"
                            type={destTab === "active" ? "primary" : "default"}
                            onClick={() => setDestTab("active")}
                          >
                            Active
                          </Button>

                          <Button
                            size="small"
                            type={
                              destTab === "inactive" ? "primary" : "default"
                            }
                            onClick={() => setDestTab("inactive")}
                          >
                            Inactive
                          </Button>
                        </Space>
                      </Col>

                      <Col xs={24} sm={10}>
                        <Input
                          allowClear
                          placeholder="Search destination..."
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                        />
                      </Col>
                    </Row>

                    {/* Inline add */}
                    {inlineAdd && (
                      <Card size="small" title="Add Branch Pricing">
                        <Space
                          direction="vertical"
                          size={12}
                          style={{
                            width: "100%",
                          }}
                        >
                          <Text type="secondary">
                            Select the destination branch from the list below,
                            then enter the price.
                          </Text>

                          <InputNumber
                            style={{
                              width: "100%",
                            }}
                            min={0}
                            precision={2}
                            placeholder="Base rate"
                            value={inlineForm.base_rate}
                            onChange={(value) =>
                              setInlineForm((previous) => ({
                                ...previous,
                                base_rate: value ?? 0,
                              }))
                            }
                          />

                          <Space wrap>
                            <Space>
                              <Text>Active</Text>

                              <Switch
                                checked={inlineForm.is_active === true}
                                onChange={(checked) =>
                                  setInlineForm((previous) => ({
                                    ...previous,
                                    is_active: checked,
                                  }))
                                }
                              />
                            </Space>

                            <Space>
                              <Text>Express</Text>

                              <Switch
                                checked={inlineForm.express_enabled === true}
                                onChange={(checked) =>
                                  setInlineForm((previous) => ({
                                    ...previous,
                                    express_enabled: checked,
                                  }))
                                }
                              />
                            </Space>

                            <Space>
                              <Text>Same Day</Text>

                              <Switch
                                checked={inlineForm.same_day_enabled === true}
                                onChange={(checked) =>
                                  setInlineForm((previous) => ({
                                    ...previous,
                                    same_day_enabled: checked,
                                  }))
                                }
                              />
                            </Space>
                          </Space>

                          <Space>
                            <Button
                              type="primary"
                              loading={inlineSaving}
                              onClick={() =>
                                messageApi.info(
                                  "To add a new rate, select an unconfigured destination below and use the Add Pricing action.",
                                )
                              }
                            >
                              Save
                            </Button>

                            <Button
                              disabled={inlineSaving}
                              onClick={() => setInlineAdd(false)}
                            >
                              Cancel
                            </Button>
                          </Space>
                        </Space>
                      </Card>
                    )}

                    {/* Destination list */}
                    {filteredDestinationRates.length === 0 ? (
                      <Empty
                        description={
                          destTab === "active" || destTab === "inactive"
                            ? "No pricing records match this filter."
                            : "No destinations found."
                        }
                      />
                    ) : (
                      <List
                        itemLayout="horizontal"
                        dataSource={filteredDestinationRates}
                        renderItem={renderDestinationRow}
                      />
                    )}
                  </Space>
                )}
              </Card>
            </Col>

            {/* ---------------------------------------------------------- */}
            {/* Details / map                                               */}
            {/* ---------------------------------------------------------- */}

            <Col xs={24} lg={7}>
              <Space
                direction="vertical"
                size={16}
                style={{
                  width: "100%",
                }}
              >
                <Card title="Pricing Details">
                  {!selectedRoute ? (
                    <Empty description="Select a pricing route to view details." />
                  ) : (
                    <Space
                      direction="vertical"
                      size={14}
                      style={{
                        width: "100%",
                      }}
                    >
                      <div>
                        <Text type="secondary">Route</Text>

                        <div
                          style={{
                            marginTop: 4,
                          }}
                        >
                          <Text strong>
                            {branchLabel(
                              selectedRoute.pickup_branch ??
                                locations.find(
                                  (branch) =>
                                    Number(getBranchId(branch)) ===
                                    Number(
                                      selectedRoute.pickup_coverage_location_id ??
                                        selectedRoute.pickup_branch_id,
                                    ),
                                ),
                            )}{" "}
                            →{" "}
                            {branchLabel(
                              selectedRoute.delivery_branch ??
                                locations.find(
                                  (branch) =>
                                    Number(getBranchId(branch)) ===
                                    Number(
                                      selectedRoute.delivery_coverage_location_id ??
                                        selectedRoute.delivery_branch_id,
                                    ),
                                ),
                            )}
                          </Text>
                        </div>
                      </div>

                      <Row gutter={[8, 8]}>
                        <Col span={12}>
                          <Card size="small">
                            <Statistic
                              title="Base Rate"
                              value={toSafeNumber(selectedRoute.base_rate, 0)}
                              prefix="NPR "
                              precision={2}
                            />
                          </Card>
                        </Col>

                        <Col span={12}>
                          <Card size="small">
                            <Statistic
                              title="Status"
                              value={
                                selectedRoute.is_active === true
                                  ? "Active"
                                  : "Inactive"
                              }
                            />
                          </Card>
                        </Col>
                      </Row>

                      <Space wrap>
                        <Tag
                          color={
                            selectedRoute.express_enabled === true
                              ? "green"
                              : "default"
                          }
                        >
                          Express{" "}
                          {selectedRoute.express_enabled === true
                            ? "ON"
                            : "OFF"}
                        </Tag>

                        <Tag
                          color={
                            selectedRoute.same_day_enabled === true
                              ? "green"
                              : "default"
                          }
                        >
                          Same Day{" "}
                          {selectedRoute.same_day_enabled === true
                            ? "ON"
                            : "OFF"}
                        </Tag>

                        <Tag
                          color={
                            selectedRoute.is_active === true
                              ? "blue"
                              : "default"
                          }
                        >
                          {selectedRoute.is_active === true
                            ? "Active"
                            : "Inactive"}
                        </Tag>
                      </Space>

                      {selectedRoute.updated_at && (
                        <Text type="secondary">
                          Updated {formatDate(selectedRoute.updated_at)}
                        </Text>
                      )}

                      <Space wrap>
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => startEdit(selectedRoute)}
                        >
                          Edit
                        </Button>

                        <Button
                          icon={<SwapOutlined />}
                          loading={reverseSavingId === selectedRoute.id}
                          onClick={() => createReverse(selectedRoute)}
                        >
                          Reverse
                        </Button>

                        <Button
                          icon={
                            selectedRoute.is_active === true ? (
                              <CloseCircleOutlined />
                            ) : (
                              <CheckCircleOutlined />
                            )
                          }
                          loading={statusSavingId === selectedRoute.id}
                          onClick={() => toggleStatus(selectedRoute)}
                        >
                          {selectedRoute.is_active === true
                            ? "Deactivate"
                            : "Activate"}
                        </Button>
                      </Space>
                    </Space>
                  )}
                </Card>

                <Card
                  title="Route Map"
                  bodyStyle={{
                    padding: 0,
                  }}
                >
                  {selectedRouteNodes.length >= 2 ? (
                    <div
                      style={{
                        height: 420,
                        overflow: "hidden",
                        borderRadius: 8,
                      }}
                    >
                      <RouteMapS
                        nodes={selectedRouteNodes}
                        route={selectedRoute}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        minHeight: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Empty description="Select a configured route to view the map." />
                    </div>
                  )}
                </Card>
              </Space>
            </Col>
          </Row>
        </Space>
      </div>
    </>
  );
}
