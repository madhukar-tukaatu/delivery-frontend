"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";

// import RouteMapS from "@/components/rate-admin/RouteMapS";

import TransferRoutePricingSection from "@/components/rate-admin/TransferRoutePricingSection";

import {
  createBranchTransferRoute,
  createReverseBranchTransferRoute,
  deleteBranchTransferRoute,
  getBranchTransferRoutes,
  getRateBranches,
  previewBranchTransferRoute,
  updateBranchTransferRoute,
  updateBranchTransferRouteStatus,
} from "@/services/adminRateManagementService";

import {
  getActiveGlobalPricingSettings,
  getTransferRoutePricingProfile,
  updateTransferRoutePricingProfile,
} from "@/services/adminTransferRoutePricingService";

import {
  apiErrorMessage,
  branchLabel,
  buildBranchMap,
  extractCollection,
  formatMoney,
  normalizeBranch,
  normalizeTransferRoute,
} from "@/lib/rate-management-page-utils";

import {
  buildRoutePricingProfilePayload,
  toRouteCustomPricingForm,
} from "@/lib/route-pricing-profile-utils";

import { InputNumber } from "@/components/PageTools";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const SERVICE_TYPES = [
  {
    label: "Standard",
    value: "standard",
  },
  {
    label: "Express",
    value: "express",
  },
  {
    label: "Same Day",
    value: "same_day",
  },
];

const RouteMapS = dynamic(() => import("@/components/rate-admin/RouteMapS"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 340,
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
});

/**
 * ---------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------
 */

function statusTag(active) {
  return (
    <Tag color={active ? "green" : "default"}>
      {active ? "Active" : "Inactive"}
    </Tag>
  );
}

function moveItem(items, index, direction) {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(index, 1);

  next.splice(nextIndex, 0, item);

  return next;
}

function extractSavedRouteId(payload, fallbackId = null) {
  const candidates = [
    fallbackId,
    payload?.id,
    payload?.route_id,
    payload?.route?.id,
    payload?.data?.id,
    payload?.data?.route_id,
    payload?.data?.route?.id,
  ];

  const found = candidates.find(
    (value) => Number.isFinite(Number(value)) && Number(value) > 0,
  );

  return found ? Number(found) : null;
}

/**
 * Get calculated base route rate from different
 * possible backend response structures.
 */
function getCalculatedBaseRate(preview) {
  const candidates = [
    preview?.calculated_base_rate,
    preview?.route_base_rate,
    preview?.lane_total,
    preview?.base_rate,
    preview?.pricing?.base_rate,
    preview?.pricing?.calculated_base_rate,
  ];

  const value = candidates.find(
    (item) =>
      item !== undefined && item !== null && Number.isFinite(Number(item)),
  );

  return value !== undefined ? Number(value) : 0;
}

function getPreviewLanes(preview) {
  if (Array.isArray(preview?.lanes)) {
    return preview.lanes;
  }

  if (Array.isArray(preview?.segments)) {
    return preview.segments;
  }

  if (Array.isArray(preview?.route_lanes)) {
    return preview.route_lanes;
  }

  return [];
}

function getLaneFromBranchIds(lane, branchesById) {
  const fromId = lane?.from_branch_id ?? lane?.origin_branch_id;

  const toId = lane?.to_branch_id ?? lane?.destination_branch_id;

  const from =
    lane?.from_branch?.name ??
    lane?.origin_branch?.name ??
    branchesById.get(Number(fromId))?.name ??
    `Branch ${fromId ?? "-"}`;

  const to =
    lane?.to_branch?.name ??
    lane?.destination_branch?.name ??
    branchesById.get(Number(toId))?.name ??
    `Branch ${toId ?? "-"}`;

  return {
    from,
    to,
  };
}

/**
 * ---------------------------------------------------------
 * Coordinate helpers
 * ---------------------------------------------------------
 *
 * Backend responses can differ slightly depending on
 * endpoint/serializer.
 *
 * We support:
 *
 * latitude / longitude
 * lat / lng
 * lat / lon
 * coordinates
 * location.latitude / location.longitude
 * location.lat / location.lng
 * geo.latitude / geo.longitude
 * geo.lat / geo.lng
 */

function getCoordinateValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function getNodeCoordinates(item) {
  if (!item) {
    return null;
  }

  const latitudeCandidates = [
    item.latitude,
    item.lat,
    item.location?.latitude,
    item.location?.lat,
    item.geo?.latitude,
    item.geo?.lat,
    item.coordinates?.latitude,
    item.coordinates?.lat,
  ];

  const longitudeCandidates = [
    item.longitude,
    item.lng,
    item.lon,
    item.location?.longitude,
    item.location?.lng,
    item.location?.lon,
    item.geo?.longitude,
    item.geo?.lng,
    item.geo?.lon,
    item.coordinates?.longitude,
    item.coordinates?.lng,
    item.coordinates?.lon,
  ];

  /**
   * GeoJSON:
   *
   * coordinates = [longitude, latitude]
   */
  if (Array.isArray(item.coordinates) && item.coordinates.length >= 2) {
    const longitude = getCoordinateValue(item.coordinates[0]);

    const latitude = getCoordinateValue(item.coordinates[1]);

    if (latitude !== null && longitude !== null) {
      return {
        latitude,
        longitude,
      };
    }
  }

  const latitude = latitudeCandidates
    .map(getCoordinateValue)
    .find((value) => value !== null);

  const longitude = longitudeCandidates
    .map(getCoordinateValue)
    .find((value) => value !== null);

  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

/**
 * Normalize a branch into a map node.
 */
function branchToMapNode(branch, fallbackName = null) {
  if (!branch) {
    return null;
  }

  const coordinates = getNodeCoordinates(branch);

  if (!coordinates) {
    return null;
  }

  return {
    id: Number(branch.id),
    name: branch.name || fallbackName || `Branch ${branch.id}`,
    code: branch.code || null,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
}

/**
 * Build route nodes in the EXACT route order:
 *
 * Origin
 *   ↓
 * Transit 1
 *   ↓
 * Transit 2
 *   ↓
 * Destination
 *
 * This is the important part for RouteMapS.
 */
function buildRouteMapNodes({ selected, branchesById }) {
  if (!selected) {
    return [];
  }

  /**
   * First preference:
   *
   * Backend already returned complete path.
   */
  const backendPath = Array.isArray(selected.path) ? selected.path : [];

  const backendNodes = backendPath
    .map((item) => {
      const branch = item?.branch || item;

      const coordinates =
        getNodeCoordinates(item) || getNodeCoordinates(branch);

      if (!coordinates) {
        return null;
      }

      return {
        id: Number(item?.id ?? branch?.id) || undefined,

        name: item?.name || branch?.name || "Branch",

        code: item?.code || branch?.code || null,

        latitude: coordinates.latitude,

        longitude: coordinates.longitude,
      };
    })
    .filter(Boolean);

  /**
   * If backend path has at least two usable points,
   * use it.
   */
  if (backendNodes.length >= 2) {
    return backendNodes;
  }

  /**
   * Fallback:
   *
   * Construct route path from IDs and branch data.
   */
  const originId = Number(selected.origin_branch_id);

  const destinationId = Number(selected.destination_branch_id);

  const transitIds = Array.isArray(selected.transit_branch_ids)
    ? selected.transit_branch_ids.map(Number)
    : [];

  const ids = [originId, ...transitIds, destinationId].filter(
    (id, index, array) =>
      Number.isFinite(id) && id > 0 && array.indexOf(id) === index,
  );

  return ids.map((id) => branchToMapNode(branchesById.get(id))).filter(Boolean);
}

/**
 * ---------------------------------------------------------
 * Page
 * ---------------------------------------------------------
 */

export default function BranchTransferRoutesPage() {
  const [form] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);

  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const [routePricingLoading, setRoutePricingLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);

  const [routePricingProfile, setRoutePricingProfile] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    origin_branch_id: undefined,
    destination_branch_id: undefined,
    service_type: undefined,
    is_active: undefined,
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0,
  });

  /**
   * -------------------------------------------------------
   * Branch map
   * -------------------------------------------------------
   */

  const branchesById = useMemo(() => buildBranchMap(branches), [branches]);

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: Number(branch.id),
        label: branchLabel(branch),
      })),
    [branches],
  );

  /**
   * -------------------------------------------------------
   * Load branches
   * -------------------------------------------------------
   */

  const loadBranches = useCallback(async () => {
    try {
      const payload = await getRateBranches({
        status: "active",
        per_page: 500,
      });

      const collection = extractCollection(payload);

      const normalized = collection.rows
        .map(normalizeBranch)
        .filter((branch) => Number.isFinite(Number(branch?.id)));

      setBranches(normalized);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not load branch options."));
    }
  }, []);

  /**
   * -------------------------------------------------------
   * Load routes
   * -------------------------------------------------------
   */

  const loadRows = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      try {
        setLoading(true);

        const payload = await getBranchTransferRoutes({
          page,
          per_page: pageSize,

          search: filters.search || undefined,

          origin_branch_id: filters.origin_branch_id || undefined,

          destination_branch_id: filters.destination_branch_id || undefined,

          service_type: filters.service_type || undefined,

          is_active:
            filters.is_active === undefined ? undefined : filters.is_active,
        });

        const collection = extractCollection(payload);

        const normalized = collection.rows.map((row) =>
          normalizeTransferRoute(row, branchesById),
        );

        setRows(normalized);

        setSelected((current) => {
          if (!normalized.length) {
            return null;
          }

          return (
            normalized.find((row) => Number(row.id) === Number(current?.id)) ||
            normalized[0]
          );
        });

        setPagination({
          current: collection.currentPage || page,

          pageSize: collection.pageSize || pageSize,

          total: collection.total || 0,
        });
      } catch (error) {
        message.error(
          apiErrorMessage(error, "Could not load transfer routes."),
        );
      } finally {
        setLoading(false);
      }
    },
    [branchesById, filters, pagination.current, pagination.pageSize],
  );

  /**
   * Initial branch load.
   */
  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  /**
   * Load routes after branches are available.
   */
  useEffect(() => {
    if (!branches.length) {
      return;
    }

    loadRows(1, pagination.pageSize);
  }, [
    branches.length,
    filters.search,
    filters.origin_branch_id,
    filters.destination_branch_id,
    filters.service_type,
    filters.is_active,
  ]);

  /**
   * -------------------------------------------------------
   * Statistics
   * -------------------------------------------------------
   */

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active).length;

    const averageBase = rows.length
      ? rows.reduce(
          (sum, row) =>
            sum + Number(row.calculated_base_rate ?? row.base_rate ?? 0),
          0,
        ) / rows.length
      : 0;

    const averageTransfers = rows.length
      ? rows.reduce((sum, row) => sum + Number(row.transfer_count || 0), 0) /
        rows.length
      : 0;

    return {
      active,
      averageBase,
      averageTransfers,
    };
  }, [rows]);

  /**
   * -------------------------------------------------------
   * Modal
   * -------------------------------------------------------
   */

  const resetModalState = () => {
    setModalOpen(false);
    setEditing(null);
    setPreview(null);
    setRoutePricingProfile(null);

    form.resetFields();
  };

  const openCreate = async (prefill = {}) => {
    setEditing(null);
    setPreview(null);
    setRoutePricingProfile(null);

    form.setFieldsValue({
      route_code: "",
      name: "",

      origin_branch_id: undefined,

      transit_branch_ids: [],

      destination_branch_id: undefined,

      service_type: "standard",

      priority: 100,

      is_default: true,

      is_active: true,

      notes: "",

      pricing_mode: "global",

      custom_pricing: undefined,

      ...prefill,
    });

    setModalOpen(true);

    setRoutePricingLoading(true);

    try {
      const globalActive = await getActiveGlobalPricingSettings();

      setRoutePricingProfile({
        mode: "global",

        global_active: globalActive,

        custom_active: null,

        effective: globalActive,
      });

      if (globalActive) {
        form.setFieldValue(
          "custom_pricing",
          toRouteCustomPricingForm(globalActive, null),
        );
      } else {
        message.warning("No active global pricing version was found.");
      }
    } catch (error) {
      message.error(
        apiErrorMessage(error, "Could not load global pricing settings."),
      );
    } finally {
      setRoutePricingLoading(false);
    }
  };

  const openEdit = async (row) => {
    setEditing(row);
    setPreview({
      ...row,
      calculated_base_rate: row.calculated_base_rate ?? row.base_rate,
    });

    form.setFieldsValue({
      route_code: row.route_code || "",

      name: row.name || "",

      origin_branch_id: row.origin_branch_id,

      transit_branch_ids: row.transit_branch_ids || [],

      destination_branch_id: row.destination_branch_id,

      service_type: row.service_type || "standard",

      priority: Number(row.priority || 100),

      is_default: Boolean(row.is_default),

      is_active: Boolean(row.is_active),

      notes: row.notes || "",

      pricing_mode: "global",

      custom_pricing: undefined,
    });

    setRoutePricingProfile(null);

    setModalOpen(true);
    setRoutePricingLoading(true);

    try {
      const profile = await getTransferRoutePricingProfile(row.id);

      setRoutePricingProfile(profile);

      const effective =
        profile?.custom_active || profile?.global_active || profile?.effective;

      form.setFieldsValue({
        pricing_mode: profile?.mode || profile?.pricing_mode || "global",

        custom_pricing: toRouteCustomPricingForm(effective, row),
      });
    } catch (error) {
      message.error(
        apiErrorMessage(error, "Could not load route pricing profile."),
      );
    } finally {
      setRoutePricingLoading(false);
    }
  };

  /**
   * -------------------------------------------------------
   * Route definition
   * -------------------------------------------------------
   */

  // const buildRouteDefinition = async () => {
  //   const values = await form.validateFields([
  //     "origin_branch_id",
  //     "transit_branch_ids",
  //     "destination_branch_id",
  //     "service_type",
  //   ]);

  //   const originId = Number(values.origin_branch_id);

  //   const destinationId = Number(values.destination_branch_id);

  //   const transitIds = (values.transit_branch_ids || []).map(Number);

  //   const isSelfTransfer = originId === destinationId;

  //   if (isSelfTransfer && transitIds.length > 0) {
  //     throw new Error("A self-transfer route cannot contain transit branches.");
  //   }

  //   if (!isSelfTransfer) {
  //     const ids = [originId, ...transitIds, destinationId];

  //     const uniqueIds = new Set(ids);

  //     if (uniqueIds.size !== ids.length) {
  //       throw new Error(
  //         "Origin, transit, and destination branches must not repeat.",
  //       );
  //     }
  //   }

  //   return {
  //     origin_branch_id: originId,

  //     transit_branch_ids: transitIds,

  //     destination_branch_id: destinationId,

  //     service_type: values.service_type,

  //     route_type: isSelfTransfer ? "local" : "transfer",
  //   };
  // };

  const buildRouteDefinition = async () => {
    const values = await form.validateFields([
      "origin_branch_id",
      "transit_branch_ids",
      "destination_branch_id",
      "service_type",
    ]);

    const originBranchId = Number(values.origin_branch_id);

    const destinationBranchId = Number(values.destination_branch_id);

    const transitBranchIds = (values.transit_branch_ids || [])
      .map(Number)
      .filter(Number.isFinite);

    if (!Number.isFinite(originBranchId) || originBranchId <= 0) {
      throw new Error("Please select a valid origin branch.");
    }

    if (!Number.isFinite(destinationBranchId) || destinationBranchId <= 0) {
      throw new Error("Please select a valid destination branch.");
    }

    if (originBranchId === destinationBranchId) {
      throw new Error("Origin and destination branches must be different.");
    }

    const allIds = [originBranchId, ...transitBranchIds, destinationBranchId];

    if (new Set(allIds).size !== allIds.length) {
      throw new Error(
        "Origin, transit, and destination branches must not repeat.",
      );
    }

    return {
      route_type: "transfer",

      origin_branch_id: originBranchId,

      transit_branch_ids: transitBranchIds,

      destination_branch_id: destinationBranchId,

      service_type: values.service_type || "standard",
    };
  };
  /**
   * -------------------------------------------------------
   * Preview
   * -------------------------------------------------------
   */

  // const previewRoute = async () => {
  //   try {
  //     setPreviewing(true);

  //     const definition = await buildRouteDefinition();

  //     const result = await previewBranchTransferRoute(definition);

  //     setPreview(result);

  //     message.success("Route validated successfully.");
  //   } catch (error) {
  //     if (error?.errorFields) {
  //       return;
  //     }

  //     message.error(
  //       apiErrorMessage(error, "Could not validate transfer route."),
  //     );
  //   } finally {
  //     setPreviewing(false);
  //   }
  // };

  const previewRoute = async () => {
    try {
      setPreviewing(true);

      const definition = await buildRouteDefinition();

      const result = await previewBranchTransferRoute(definition);

      setPreview(result);

      message.success("Route validated successfully.");
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      console.error("TRANSFER ROUTE PREVIEW ERROR:", error);

      message.error(
        apiErrorMessage(
          error,
          "This route could not be validated. Make sure every direct transfer lane exists and is active.",
        ),
      );
    } finally {
      setPreviewing(false);
    }
  };
  /**
   * -------------------------------------------------------
   * Save route
   * -------------------------------------------------------
   */

  // const saveRoute = async () => {
  //   try {
  //     const values = await form.validateFields();

  //     const definition = await buildRouteDefinition();

  //     /**
  //      * Always validate the route before saving.
  //      */
  //     const routePreview = await previewBranchTransferRoute(definition);

  //     setPreview(routePreview);

  //     const calculatedBaseRate = getCalculatedBaseRate(routePreview);

  //     if (!Number.isFinite(calculatedBaseRate)) {
  //       throw new Error(
  //         "The backend did not return a valid calculated route base rate.",
  //       );
  //     }

  //     const routePayload = {
  //       route_code: values.route_code.trim(),

  //       name: values.name.trim(),

  //       ...definition,

  //       priority: Number(values.priority || 100),

  //       is_default: Boolean(values.is_default),

  //       is_active: Boolean(values.is_active),

  //       notes: values.notes?.trim() || null,
  //     };

  //     const pricingPayload = buildRoutePricingProfilePayload(values);

  //     setSaving(true);

  //     const savedRoute = editing
  //       ? await updateBranchTransferRoute(editing.id, routePayload)
  //       : await createBranchTransferRoute(routePayload);

  //     const savedRouteId = extractSavedRouteId(savedRoute, editing?.id);

  //     /**
  //      * Pricing profile is route-specific.
  //      *
  //      * Branch Pricing is NOT required.
  //      */
  //     const mustSavePricingProfile =
  //       Boolean(editing) || pricingPayload.mode === "custom";

  //     if (mustSavePricingProfile) {
  //       if (!savedRouteId) {
  //         message.warning(
  //           "The route was saved, but its pricing profile could not be updated because the response did not include the route ID.",
  //         );
  //       } else {
  //         try {
  //           await updateTransferRoutePricingProfile(
  //             savedRouteId,
  //             pricingPayload,
  //           );
  //         } catch (pricingError) {
  //           message.warning(
  //             apiErrorMessage(
  //               pricingError,
  //               "The route was saved, but its pricing profile could not be updated.",
  //             ),
  //           );
  //         }
  //       }
  //     }

  //     message.success(
  //       pricingPayload.mode === "custom"
  //         ? "Transfer route and custom pricing saved."
  //         : "Transfer route saved.",
  //     );

  //     resetModalState();

  //     await loadRows();
  //   } catch (error) {
  //     if (error?.errorFields) {
  //       return;
  //     }

  //     message.error(apiErrorMessage(error, "Could not save transfer route."));
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  const saveRoute = async () => {
    try {
      const values = await form.validateFields();

      const definition = await buildRouteDefinition();

      /*
    |--------------------------------------------------------------------------
    | IMPORTANT
    |--------------------------------------------------------------------------
    | Validate the complete route BEFORE creating it.
    |
    | Example:
    |
    | 185 -> 190
    |
    | The backend must have an ACTIVE transfer lane:
    |
    | 185 -> 190
    |
    | If it does not exist, preview should reject the route before
    | we attempt to insert branch_transfer_routes.
    |--------------------------------------------------------------------------
    */

      setSaving(true);

      let routePreview;

      try {
        routePreview = await previewBranchTransferRoute(definition);

        setPreview(routePreview);
      } catch (previewError) {
        message.error(
          apiErrorMessage(
            previewError,
            "This route cannot be created because one or more required transfer lanes are missing or inactive.",
          ),
        );

        return;
      }

      const routePayload = {
        route_type: "transfer",

        route_code: values.route_code.trim(),

        name: values.name.trim(),

        origin_branch_id: definition.origin_branch_id,

        transit_branch_ids: definition.transit_branch_ids,

        destination_branch_id: definition.destination_branch_id,

        service_type: definition.service_type,

        base_rate: calculatedBaseRate,

        currency: values.currency || "NPR",

        priority: Number(values.priority || 100),

        is_default: Boolean(values.is_default),

        is_active: Boolean(values.is_active),

        notes: values.notes?.trim() || null,
      };

      const pricingPayload = buildRoutePricingProfilePayload(values);

      /*
    |--------------------------------------------------------------------------
    | Create / update route
    |--------------------------------------------------------------------------
    */

      const savedRoute = editing
        ? await updateBranchTransferRoute(editing.id, routePayload)
        : await createBranchTransferRoute(routePayload);

      const savedRouteId = extractSavedRouteId(savedRoute, editing?.id);

      /*
    |--------------------------------------------------------------------------
    | Save route pricing profile
    |--------------------------------------------------------------------------
    */

      const mustSavePricingProfile =
        Boolean(editing) || pricingPayload.mode === "custom";

      if (mustSavePricingProfile) {
        if (!savedRouteId) {
          message.warning(
            "The route was saved, but its pricing profile could not be updated because the API did not return the route ID.",
          );
        } else {
          try {
            await updateTransferRoutePricingProfile(
              savedRouteId,
              pricingPayload,
            );
          } catch (pricingError) {
            message.warning(
              apiErrorMessage(
                pricingError,
                "The route was saved, but its pricing profile could not be updated. Reopen the route and save the pricing mode again.",
              ),
            );
          }
        }
      }

      message.success(
        pricingPayload.mode === "custom"
          ? "Transfer route and custom pricing saved."
          : "Transfer route saved with global pricing.",
      );

      resetModalState();

      await loadRows();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      /*
    |--------------------------------------------------------------------------
    | Show the actual backend error when possible
    |--------------------------------------------------------------------------
    */

      console.error("CREATE/UPDATE TRANSFER ROUTE ERROR:", error);

      message.error(apiErrorMessage(error, "Could not save transfer route."));
    } finally {
      setSaving(false);
    }
  };
  /**
   * -------------------------------------------------------
   * Route actions
   * -------------------------------------------------------
   */

  const toggleStatus = async (row) => {
    try {
      await updateBranchTransferRouteStatus(row.id, !row.is_active);

      message.success(
        `Transfer route ${row.is_active ? "disabled" : "enabled"}.`,
      );

      await loadRows();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not update route status."));
    }
  };

  const createReverse = async (row) => {
    try {
      await createReverseBranchTransferRoute(row);

      message.success("Reverse transfer route created.");

      await loadRows();
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not create reverse route. Confirm that every reverse transfer lane exists.",
        ),
      );
    }
  };

  const removeRoute = async (row) => {
    try {
      await deleteBranchTransferRoute(row.id);

      message.success("Transfer route deleted.");

      await loadRows();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not delete transfer route."));
    }
  };

  /**
   * -------------------------------------------------------
   * Transit ordering
   * -------------------------------------------------------
   */

  const moveTransit = (index, direction) => {
    const current = form.getFieldValue("transit_branch_ids") || [];

    const next = moveItem(current, index, direction);

    form.setFieldValue("transit_branch_ids", next);
  };

  /**
   * -------------------------------------------------------
   * Table
   * -------------------------------------------------------
   */

  const columns = [
    {
      title: "Route",
      key: "route",
      width: 330,

      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>{row.name}</Text>

          <Text
            type="secondary"
            style={{
              fontSize: 12,
            }}
          >
            {row.route_code}
          </Text>

          <Text
            style={{
              fontSize: 12,
            }}
          >
            {row.path_text || "No path"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Type",
      key: "route_type",
      width: 120,

      render: (_, row) =>
        row.origin_branch_id === row.destination_branch_id &&
        !row.transit_count ? (
          <Tag color="orange">Local</Tag>
        ) : (
          <Tag color="blue">Transfer</Tag>
        ),
    },

    {
      title: "Service",
      dataIndex: "service_type",
      width: 110,

      render: (value) => <Tag color="blue">{value || "standard"}</Tag>,
    },

    {
      title: "Calculated Base",
      key: "calculated_base_rate",
      width: 170,

      render: (_, row) => (
        <Text strong>
          {formatMoney(
            row.calculated_base_rate ?? row.base_rate ?? 0,
            row.currency || "NPR",
          )}
        </Text>
      ),
    },

    {
      title: "Lanes",
      key: "transfer_count",
      width: 90,
      align: "center",

      render: (_, row) => <Tag color="purple">{row.transfer_count ?? 0}</Tag>,
    },

    {
      title: "Transit",
      dataIndex: "transit_count",
      width: 90,
      align: "center",
    },

    {
      title: "Distance",
      dataIndex: "total_distance_km",
      width: 110,

      render: (value) => `${Number(value || 0).toFixed(2)} km`,
    },

    {
      title: "ETA",
      dataIndex: "total_estimated_hours",
      width: 90,

      render: (value) => `${Number(value || 0)} hrs`,
    },

    {
      title: "Default",
      dataIndex: "is_default",
      width: 90,

      render: (value) => (value ? <Tag color="gold">Default</Tag> : "—"),
    },

    {
      title: "Status",
      dataIndex: "is_active",
      width: 100,

      render: statusTag,
    },

    {
      title: "Actions",
      key: "actions",
      width: 250,
      fixed: "right",

      render: (_, row) => (
        <Space wrap>
          <Tooltip title="Edit route and pricing">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={(event) => {
                event.stopPropagation();

                openEdit(row);
              }}
            />
          </Tooltip>

          <Tooltip title="Create reverse route">
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={(event) => {
                event.stopPropagation();

                createReverse(row);
              }}
            />
          </Tooltip>

          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();

              toggleStatus(row);
            }}
          >
            {row.is_active ? "Disable" : "Enable"}
          </Button>

          <Popconfirm
            title="Delete this transfer route?"
            description="Saved pricing quotes keep their route snapshot."
            okText="Delete"
            okButtonProps={{
              danger: true,
            }}
            onConfirm={() => removeRoute(row)}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(event) => event.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /**
   * -------------------------------------------------------
   * Form watches
   * -------------------------------------------------------
   */

  const watchedTransits = Form.useWatch("transit_branch_ids", form) || [];

  const watchedOrigin = Form.useWatch("origin_branch_id", form);

  const watchedDestination = Form.useWatch("destination_branch_id", form);

  const isSelfTransfer =
    Number(watchedOrigin) === Number(watchedDestination) &&
    watchedOrigin &&
    watchedDestination;

  /**
   * -------------------------------------------------------
   * Preview
   * -------------------------------------------------------
   */

  const previewLanes = getPreviewLanes(preview);

  const calculatedBaseRate = getCalculatedBaseRate(preview);

  /**
   * -------------------------------------------------------
   * MAP NODES
   * -------------------------------------------------------
   *
   * This is the critical fix.
   */
  const selectedMapNodes = useMemo(
    () =>
      buildRouteMapNodes({
        selected,
        branchesById,
      }),
    [selected, branchesById],
  );

  /**
   * -------------------------------------------------------
   * Render
   * -------------------------------------------------------
   */

  return (
    <Space
      direction="vertical"
      size={20}
      style={{
        width: "100%",
      }}
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title
              level={3}
              style={{
                margin: 0,
              }}
            >
              Transfer Routes
            </Title>

            <Text type="secondary">
              Build complete routes from active transfer lanes. Route base rates
              are calculated from the selected lanes.
            </Text>
          </Col>

          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => loadRows()}>
                Refresh
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCreate()}
              >
                Add Transfer Route
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ==================================================
          STATS
      ================================================== */}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic title="Loaded Routes" value={rows.length} />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic title="Active Routes" value={stats.active} />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Average Calculated Base"
              value={stats.averageBase}
              precision={2}
              prefix="NPR "
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Average Lanes"
              value={stats.averageTransfers}
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      {/* ==================================================
          FILTERS
      ================================================== */}

      <Card bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={6}>
            <Input.Search
              allowClear
              placeholder="Search route code, name or branch"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              onSearch={(value) =>
                setFilters((current) => ({
                  ...current,
                  search: value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Origin branch"
              style={{
                width: "100%",
              }}
              options={branchOptions}
              value={filters.origin_branch_id}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  origin_branch_id: value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Destination branch"
              style={{
                width: "100%",
              }}
              options={branchOptions}
              value={filters.destination_branch_id}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  destination_branch_id: value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Service"
              style={{
                width: "100%",
              }}
              options={SERVICE_TYPES}
              value={filters.service_type}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  service_type: value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={3}>
            <Select
              allowClear
              placeholder="Status"
              style={{
                width: "100%",
              }}
              value={filters.is_active}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  is_active: value,
                }))
              }
              options={[
                {
                  label: "Active",
                  value: 1,
                },
                {
                  label: "Inactive",
                  value: 0,
                },
              ]}
            />
          </Col>

          <Col xs={24} lg={3}>
            <Button block type="primary" onClick={() => loadRows(1)}>
              Apply
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ==================================================
          TABLE + SELECTED ROUTE
      ================================================== */}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card bordered={false}>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={rows}
              scroll={{
                x: 1600,
              }}
              rowClassName={(row) =>
                Number(row.id) === Number(selected?.id)
                  ? "ant-table-row-selected"
                  : ""
              }
              onRow={(row) => ({
                onClick: () => setSelected(row),

                style: {
                  cursor: "pointer",
                },
              })}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
              }}
              onChange={(nextPagination) =>
                loadRows(nextPagination.current, nextPagination.pageSize)
              }
            />
          </Card>
        </Col>

        {/* ==================================================
            SELECTED ROUTE MAP
        ================================================== */}

        <Col xs={24} xl={8}>
          <Card bordered={false} title="Selected Route">
            <RouteMapS
              nodes={selectedMapNodes}
              height={340}
              selectedLabel="Complete transfer route"
            />

            {/* Coordinate diagnostic */}
            {selected && selectedMapNodes.length < 2 ? (
              <Alert
                type="warning"
                showIcon
                style={{
                  marginTop: 12,
                }}
                message="Route coordinates are incomplete"
                description={
                  <>
                    The route has{" "}
                    <strong>{selected.path_text || "branch data"}</strong>, but
                    fewer than two branches contain valid latitude/longitude
                    coordinates.
                  </>
                }
              />
            ) : null}

            <Descriptions
              column={1}
              size="small"
              style={{
                marginTop: 18,
              }}
            >
              <Descriptions.Item label="Route">
                {selected?.path_text || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Map Points">
                {selectedMapNodes.length}
              </Descriptions.Item>

              <Descriptions.Item label="Calculated Base">
                {selected
                  ? formatMoney(
                      selected.calculated_base_rate ?? selected.base_rate ?? 0,
                      selected.currency || "NPR",
                    )
                  : "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Transfer Lanes">
                {selected?.transfer_count ?? "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Transit Branches">
                {selected?.transit_count ?? "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Distance">
                {selected
                  ? `${Number(selected.total_distance_km || 0).toFixed(2)} km`
                  : "—"}
              </Descriptions.Item>

              <Descriptions.Item label="ETA">
                {selected
                  ? `${Number(selected.total_estimated_hours || 0)} hrs`
                  : "—"}
              </Descriptions.Item>
            </Descriptions>

            {/* Route sequence */}
            {selectedMapNodes.length > 0 ? (
              <>
                <Divider />

                <Text strong>Route Path</Text>

                <List
                  size="small"
                  style={{
                    marginTop: 10,
                  }}
                  dataSource={selectedMapNodes}
                  renderItem={(node, index) => (
                    <List.Item>
                      <Space>
                        <Tag color="purple">{index + 1}</Tag>

                        <Text>{node.name}</Text>

                        {node.code ? (
                          <Text type="secondary">{node.code}</Text>
                        ) : null}
                      </Space>
                    </List.Item>
                  )}
                />
              </>
            ) : null}
          </Card>
        </Col>
      </Row>

      {/* ==================================================
          CREATE / EDIT MODAL
      ================================================== */}

      <Modal
        open={modalOpen}
        title={
          editing
            ? "Edit Transfer Route & Pricing"
            : "Create Transfer Route & Pricing"
        }
        width={1100}
        confirmLoading={saving}
        okText={editing ? "Update Route" : "Create Route"}
        okButtonProps={{
          disabled: routePricingLoading,
        }}
        onOk={saveRoute}
        onCancel={resetModalState}
        destroyOnClose
        styles={{
          body: {
            maxHeight: "76vh",
            overflowY: "auto",
            paddingRight: 8,
          },
        }}
      >
        <Alert
          type="info"
          showIcon
          message={
            isSelfTransfer ? "Local / Self Transfer" : "Inter-Branch Transfer"
          }
          description={
            isSelfTransfer
              ? "Origin and destination are the same branch. No transit branch is allowed. Example: KTM → KTM."
              : "The backend validates that every direct transfer lane in the selected route exists and is active."
          }
          style={{
            marginBottom: 18,
          }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            service_type: "standard",

            transit_branch_ids: [],

            priority: 100,

            is_default: true,

            is_active: true,

            pricing_mode: "global",
          }}
        >
          {/* ----------------------------------------------
              BASIC INFO
          ---------------------------------------------- */}

          <Row gutter={16}>
            <Col span={9}>
              <Form.Item
                name="route_code"
                label="Route Code"
                rules={[
                  {
                    required: true,
                    message: "Route code is required.",
                  },
                  {
                    max: 100,
                  },
                ]}
              >
                <Input placeholder="KTM-PKR-MUG-STANDARD" />
              </Form.Item>
            </Col>

            <Col span={15}>
              <Form.Item
                name="name"
                label="Route Name"
                rules={[
                  {
                    required: true,
                    message: "Route name is required.",
                  },
                  {
                    max: 255,
                  },
                ]}
              >
                <Input placeholder="Kathmandu to Mustang via Pokhara" />
              </Form.Item>
            </Col>
          </Row>

          {/* ----------------------------------------------
              ORIGIN / DESTINATION
          ---------------------------------------------- */}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="origin_branch_id"
                label="Origin Branch"
                rules={[
                  {
                    required: true,
                    message: "Origin branch is required.",
                  },
                ]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                  placeholder="Select origin"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="destination_branch_id"
                label="Destination Branch"
                rules={[
                  {
                    required: true,
                    message: "Destination branch is required.",
                  },
                ]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                  placeholder="Select destination"
                />
              </Form.Item>
            </Col>
          </Row>

          {isSelfTransfer ? (
            <Alert
              type="warning"
              showIcon
              message="Local / Self Transfer"
              description="Origin and destination are the same branch. No transit branch is allowed. Example: KTM → KTM."
              style={{
                marginBottom: 18,
              }}
            />
          ) : null}

          {/* ----------------------------------------------
              TRANSIT BRANCHES
          ---------------------------------------------- */}

          <Form.Item
            name="transit_branch_ids"
            label="Transit Branches in Route Order"
            help="Choose intermediate branches only. The system validates every resulting transfer lane."
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              options={branchOptions}
              disabled={Boolean(isSelfTransfer)}
              placeholder="Example: Pokhara"
            />
          </Form.Item>

          {watchedTransits.length > 0 ? (
            <Card
              size="small"
              style={{
                marginBottom: 18,
              }}
              title="Route Order"
            >
              <List
                size="small"
                dataSource={watchedTransits}
                renderItem={(branchId, index) => {
                  const branch = branchesById.get(Number(branchId));

                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="up"
                          size="small"
                          icon={<ArrowUpOutlined />}
                          disabled={index === 0}
                          onClick={() => moveTransit(index, -1)}
                        />,

                        <Button
                          key="down"
                          size="small"
                          icon={<ArrowDownOutlined />}
                          disabled={index === watchedTransits.length - 1}
                          onClick={() => moveTransit(index, 1)}
                        />,
                      ]}
                    >
                      <Space>
                        <Tag color="purple">{index + 1}</Tag>

                        <Text>{branch?.name || `Branch ${branchId}`}</Text>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            </Card>
          ) : null}

          {/* ----------------------------------------------
              SERVICE / BASE / PRIORITY
          ---------------------------------------------- */}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="service_type"
                label="Service Type"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select options={SERVICE_TYPES} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item label="Calculated Route Base">
                <Input
                  readOnly
                  value={
                    preview
                      ? formatMoney(calculatedBaseRate, "NPR")
                      : "Validate route to calculate"
                  }
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* ----------------------------------------------
              STATUS
          ---------------------------------------------- */}

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="is_default"
                label="Default Route"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="is_active"
                label="Active"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Space
                style={{
                  marginTop: 30,
                }}
              >
                <Button
                  icon={<EyeOutlined />}
                  loading={previewing}
                  onClick={previewRoute}
                >
                  Validate & Calculate Route
                </Button>
              </Space>
            </Col>
          </Row>

          {/* ----------------------------------------------
              NOTES
          ---------------------------------------------- */}

          <Form.Item name="notes" label="Notes">
            <TextArea
              rows={2}
              maxLength={1000}
              showCount
              placeholder="Optional operations or pricing note"
            />
          </Form.Item>

          {/* ----------------------------------------------
              ROUTE PRICING
          ---------------------------------------------- */}

          <Spin spinning={routePricingLoading}>
            <TransferRoutePricingSection
              form={form}
              route={editing}
              globalPricing={routePricingProfile?.global_active}
            />
          </Spin>
        </Form>

        {/* =================================================
            VALIDATED ROUTE
        ================================================= */}

        {preview ? (
          <>
            <Divider />

            <Card size="small" title="Validated Route">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Path" span={2}>
                  {preview.path_text ||
                    preview.route_text ||
                    preview.path?.map((branch) => branch.name).join(" → ") ||
                    "—"}
                </Descriptions.Item>

                <Descriptions.Item label="Route Type">
                  {isSelfTransfer ? (
                    <Tag color="orange">Local / Self Transfer</Tag>
                  ) : (
                    <Tag color="blue">Inter-Branch Transfer</Tag>
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Calculated Base">
                  <Text strong>{formatMoney(calculatedBaseRate, "NPR")}</Text>
                </Descriptions.Item>

                <Descriptions.Item label="Transfer Lanes">
                  {preview.transfer_count ?? preview.lane_count ?? "—"}
                </Descriptions.Item>

                <Descriptions.Item label="Transit Branches">
                  {preview.transit_count ?? "—"}
                </Descriptions.Item>

                <Descriptions.Item label="Distance">
                  {preview.total_distance_km !== undefined
                    ? `${Number(preview.total_distance_km).toFixed(2)} km`
                    : "—"}
                </Descriptions.Item>

                <Descriptions.Item label="Estimated Hours">
                  {preview.total_estimated_hours ?? "—"}
                </Descriptions.Item>
              </Descriptions>

              {/* --------------------------------------------
                  LANE BREAKDOWN
              -------------------------------------------- */}

              {previewLanes.length > 0 ? (
                <>
                  <Divider />

                  <Text strong>Transfer Lane Breakdown</Text>

                  <List
                    style={{
                      marginTop: 10,
                    }}
                    size="small"
                    bordered
                    dataSource={previewLanes}
                    renderItem={(lane, index) => {
                      const { from, to } = getLaneFromBranchIds(
                        lane,
                        branchesById,
                      );

                      const laneRate = Number(
                        lane.base_rate ??
                          lane.calculated_base_rate ??
                          lane.rate ??
                          0,
                      );

                      return (
                        <List.Item>
                          <Row
                            style={{
                              width: "100%",
                            }}
                            gutter={16}
                            align="middle"
                          >
                            <Col flex="40px">
                              <Tag color="purple">{index + 1}</Tag>
                            </Col>

                            <Col flex="auto">
                              <Text strong>
                                {from} → {to}
                              </Text>

                              <br />

                              <Text
                                type="secondary"
                                style={{
                                  fontSize: 12,
                                }}
                              >
                                {lane.service_type || "standard"}

                                {lane.distance_km !== undefined
                                  ? ` • ${Number(lane.distance_km).toFixed(
                                      2,
                                    )} km`
                                  : ""}
                              </Text>
                            </Col>

                            <Col>
                              <Text strong>{formatMoney(laneRate, "NPR")}</Text>
                            </Col>
                          </Row>
                        </List.Item>
                      );
                    }}
                  />

                  <Divider />

                  <Row justify="end">
                    <Space>
                      <Text>Route Base:</Text>

                      <Text
                        strong
                        style={{
                          fontSize: 18,
                        }}
                      >
                        {formatMoney(calculatedBaseRate, "NPR")}
                      </Text>
                    </Space>
                  </Row>
                </>
              ) : null}

              <Paragraph
                type="secondary"
                style={{
                  marginTop: 16,
                  marginBottom: 0,
                }}
              >
                The route base is derived from the active transfer lanes. Global
                or custom pricing rules are then applied by the pricing engine.
              </Paragraph>
            </Card>
          </>
        ) : null}
      </Modal>
    </Space>
  );
}
