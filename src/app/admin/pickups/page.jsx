"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import dayjs from "dayjs";

import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  ReloadOutlined,
  SearchOutlined,
  UserAddOutlined,
  SwapOutlined,
  CloseCircleOutlined,
  SendOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ShopOutlined,
  InboxOutlined,
  ClockCircleOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  RightOutlined,
} from "@ant-design/icons";

import {
  getPickups,
  getPickupSummary,
  getPickup,
  getPickupAssignableStaff,
  assignPickup,
  transferPickup,
  failPickup,
  resendPickupCallback,
  receivePickupShipment,
  rejectPickupShipment,
  reconcilePickup,
} from "@/services/admin/pickupService";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import AreaAssignmentMap from "@/features/routing/AreaAssignmentMap";
import { formatMerchantLabel } from "@/lib/merchantLabel";
import { getMerchants } from "@/services/merchant/merchantService";

const { Title, Text } = Typography;

const BRAND = "#0891B2";

/*
|--------------------------------------------------------------------------
| Status configuration
|--------------------------------------------------------------------------
*/

const STATUS_META = {
  requested: {
    label: "Requested",
    color: "blue",
    hex: "#1677ff",
    icon: <InboxOutlined />,
    hint: "Waiting for a rider to be assigned",
  },
  assigned: {
    label: "Assigned",
    color: "purple",
    hex: "#722ed1",
    icon: <UserAddOutlined />,
    hint: "Rider assigned, awaiting acceptance",
  },
  accepted: {
    label: "Accepted",
    color: "geekblue",
    hex: "#2f54eb",
    icon: <CheckCircleOutlined />,
    hint: "Rider accepted the pickup",
  },
  started: {
    label: "En Route",
    color: "cyan",
    hex: "#13c2c2",
    icon: <CarOutlined />,
    hint: "Rider is travelling to the merchant",
  },
  arrived: {
    label: "Arrived",
    color: "gold",
    hex: "#faad14",
    icon: <EnvironmentOutlined />,
    hint: "Rider has reached the pickup location",
  },
  collected: {
    label: "Collected",
    color: "green",
    hex: "#52c41a",
    icon: <CheckCircleOutlined />,
    hint: "All shipments collected from merchant",
  },
  on_way_to_branch: {
    label: "On Way to Branch",
    color: "orange",
    hex: "#fa8c16",
    icon: <CarOutlined />,
    hint: "Rider in transit to origin branch",
  },
  completed: {
    label: "Completed",
    color: "success",
    hex: "#389e0d",
    icon: <CheckCircleOutlined />,
    hint: "Branch verified all shipments",
  },
  failed: {
    label: "Failed",
    color: "error",
    hex: "#cf1322",
    icon: <ExclamationCircleOutlined />,
    hint: "Pickup could not be completed",
  },
  cancelled: {
    label: "Cancelled",
    color: "default",
    hex: "#8c8c8c",
    icon: <CloseCircleOutlined />,
    hint: "Pickup was cancelled",
  },

  // Shipment-level statuses (used by the per-shipment status tag).
  picked_up: {
    label: "Picked Up",
    color: "geekblue",
    hex: "#2f54eb",
    icon: <InboxOutlined />,
    hint: "Collected by rider",
  },
  received_at_origin_branch: {
    label: "Received at Branch",
    color: "purple",
    hex: "#722ed1",
    icon: <CheckCircleOutlined />,
    hint: "Received at origin branch",
  },
  sorted_for_delivery: {
    label: "Sorted | Delivery",
    color: "green",
    hex: "#52c41a",
    icon: <EnvironmentOutlined />,
    hint: "Last mile at this branch",
  },
  sorted_for_transfer: {
    label: "Sorted | Transfer",
    color: "orange",
    hex: "#fa8c16",
    icon: <SwapOutlined />,
    hint: "Transfer - next hop on Transfers Outbound",
  },
  pickup_failed: {
    label: "Rejected",
    color: "error",
    hex: "#cf1322",
    icon: <CloseCircleOutlined />,
    hint: "Rejected at branch verification",
  },
};

/*
|--------------------------------------------------------------------------
| Tabs
|--------------------------------------------------------------------------
|
| Each tab maps to one status (or the "All" tab, no filter). The backend
| status filter also accepts a comma-separated group if ever needed. Every
| pickup status has its own tab so nothing falls through the cracks.
|
*/

const TABS = [
  {
    key: "requested",
    label: "Requested",
    hex: "#1677ff",
    icon: <InboxOutlined />,
    statuses: ["requested"],
    hint: "Waiting for a rider to be assigned",
  },
  {
    key: "assigned",
    label: "Assigned",
    hex: "#722ed1",
    icon: <UserAddOutlined />,
    statuses: ["assigned"],
    hint: "Rider assigned, awaiting acceptance",
  },
  {
    key: "accepted",
    label: "Accepted",
    hex: "#2f54eb",
    icon: <CheckCircleOutlined />,
    statuses: ["accepted"],
    hint: "Rider accepted the pickup",
  },
  {
    key: "started",
    label: "En Route",
    hex: "#13c2c2",
    icon: <CarOutlined />,
    statuses: ["started"],
    hint: "Rider is travelling to the merchant",
  },
  {
    key: "arrived",
    label: "Arrived",
    hex: "#faad14",
    icon: <EnvironmentOutlined />,
    statuses: ["arrived"],
    hint: "Rider is at the pickup location collecting",
  },
  {
    key: "collected",
    label: "Collected",
    hex: "#52c41a",
    icon: <CheckCircleOutlined />,
    statuses: ["collected"],
    hint: "All shipments collected, ready for transit",
  },
  {
    key: "on_way_to_branch",
    label: "On Way",
    hex: "#fa8c16",
    icon: <CarOutlined />,
    statuses: ["on_way_to_branch"],
    hint: "In transit to origin branch - awaiting branch validation",
  },
  {
    key: "completed",
    label: "Completed",
    hex: "#389e0d",
    icon: <CheckCircleOutlined />,
    statuses: ["completed"],
    hint: "Branch verified all shipments",
  },
  {
    key: "failed",
    label: "Failed",
    hex: "#cf1322",
    icon: <ExclamationCircleOutlined />,
    statuses: ["failed"],
    hint: "Pickup could not be completed",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    hex: "#8c8c8c",
    icon: <CloseCircleOutlined />,
    statuses: ["cancelled"],
    hint: "Pickup was cancelled",
  },
  {
    key: "all",
    label: "All",
    hex: BRAND,
    icon: <InboxOutlined />,
    statuses: [],
    hint: "Every pickup across all branches",
  },
];

// Open on the first actionable status; other statuses load when chosen.
const DEFAULT_TAB = "requested";

function tabByKey(key) {
  return TABS.find((t) => t.key === key) ?? TABS[0];
}

function statusParam(tabKey) {
  const tab = tabByKey(tabKey);
  return tab.statuses.length ? tab.statuses.join(",") : undefined;
}

const RESEND_EVENTS = [
  { value: "pickup.rider_assigned", label: "Rider assigned", scope: "pickup" },
  { value: "pickup.rider_started", label: "Rider started", scope: "pickup" },
  { value: "pickup.rider_arrived", label: "Rider arrived", scope: "pickup" },
  { value: "pickup.collected", label: "All shipments collected", scope: "pickup" },
  { value: "pickup.on_way_to_branch", label: "On way to branch", scope: "pickup" },
  { value: "pickup.completed", label: "Pickup completed", scope: "pickup" },
  {
    value: "shipment.collected",
    label: "Shipment collected",
    scope: "shipment",
  },
  {
    value: "shipment.received_at_origin",
    label: "Shipment received at origin",
    scope: "shipment",
  },
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function metaFor(status) {
  return (
    STATUS_META[String(status ?? "").toLowerCase()] ?? {
      label: String(status ?? "Unknown"),
      color: "default",
      hex: "#8c8c8c",
      icon: <InboxOutlined />,
      hint: "",
    }
  );
}

function StatusTag({ status, withIcon = true }) {
  const meta = metaFor(status);
  return (
    <Tag
      color={meta.color}
      style={{ borderRadius: 999, paddingInline: 10, margin: 0 }}
    >
      <Space size={4}>
        {withIcon ? meta.icon : null}
        {meta.label}
      </Space>
    </Tag>
  );
}

function getPickupId(p) {
  return p?.id ?? p?.pickup_request_id ?? null;
}
function getRequestNumber(p) {
  return p?.request_number ?? `#${getPickupId(p) ?? "-"}`;
}
function getMerchantName(p) {
  return formatMerchantLabel(p, "Unknown merchant");
}
function getLocation(p) {
  return p?.pickup_location ?? p?.pickupLocation ?? null;
}
function getLocationName(p) {
  const loc = getLocation(p);
  return loc?.name ?? p?.pickup_name ?? "Pickup location";
}
function getRider(p) {
  return p?.assigned_staff ?? p?.assignedStaff ?? null;
}

function getShipments(p) {
  if (!Array.isArray(p?.shipments)) return [];
  return p.shipments
    .map((item) => {
      if (!item) return null;
      const s = item.shipment ?? item;
      return {
        id: s.id ?? item.id ?? null,
        tracking_number: s.tracking_number ?? item.tracking_number ?? null,
        merchant_order_id:
          s.merchant_order_id ?? item.merchant_order_id ?? null,
        status: s.status ?? item.status ?? "unknown",
      };
    })
    .filter((s) => s && (s.id || s.tracking_number));
}

function fmtDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-NP", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initialsOf(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/*
|--------------------------------------------------------------------------
| Small building blocks
|--------------------------------------------------------------------------
*/

function SectionCard({ icon, title, extra, children }) {
  return (
    <div
      style={{
        border: "1px solid #eef0f2",
        borderRadius: 14,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #f4f5f6",
          background: "#fafbfc",
        }}
      >
        <Space
          size={8}
          style={{ color: "#4b5563", fontWeight: 600, fontSize: 13 }}
        >
          <span style={{ color: BRAND }}>{icon}</span>
          {title}
        </Space>
        {extra}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "#1f2937" }}>{children}</div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function AdminPickupsPage() {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
  const [urlReady, setUrlReady] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [mapOpen, setMapOpen] = useState(true);
  const [mapRows, setMapRows] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapSelected, setMapSelected] = useState([]);
  const [mapRiders, setMapRiders] = useState([]);
  const [mapRidersLoading, setMapRidersLoading] = useState(false);
  const [mapTick, setMapTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Date range (ISO strings) + merchant filter
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [merchantFilter, setMerchantFilter] = useState(null);
  const [merchantOptions, setMerchantOptions] = useState([]);

  // Summary report data
  const [summary, setSummary] = useState({
    total: 0,
    byStatus: {},
    byMerchant: [],
  });
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [counts, setCounts] = useState({});

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState(null);
  const [fixOpen, setFixOpen] = useState(false);
  const [fixPreview, setFixPreview] = useState(null);
  const [fixLoading, setFixLoading] = useState(false);
  const [fixReceive, setFixReceive] = useState(false);

  const [assignForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const [resendForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [receiveForm] = Form.useForm();

  const [formWeights, setFormWeights] = useState({
    actual: 1.5,
    l: 0,
    w: 0,
    h: 0,
  });

  const volumetricCalculated = useMemo(() => {
    if (formWeights.l > 0 && formWeights.w > 0 && formWeights.h > 0) {
      return Number(((formWeights.l * formWeights.w * formWeights.h) / 5000).toFixed(2));
    }
    return 0;
  }, [formWeights.l, formWeights.w, formWeights.h]);

  const chargeableCalculated = useMemo(() => {
    const act = Number(formWeights.actual) || 0;
    return Number(Math.max(act, volumetricCalculated).toFixed(2));
  }, [formWeights.actual, volumetricCalculated]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (page = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const result = await getPickups({
          page,
          per_page: pageSize,
          search: debouncedSearch || undefined,
          status: statusParam(activeTab),
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          merchant_id: merchantFilter || undefined,
        });
        setRows(result.list ?? []);
        setPagination({
          current: result.currentPage ?? page,
          pageSize: result.pageSize ?? pageSize,
          total: result.total ?? 0,
        });
      } catch (error) {
        message.error(
          error?.response?.data?.message || "Could not load pickups.",
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, debouncedSearch, dateFrom, dateTo, merchantFilter],
  );

  // Deep link ?status=assigned; default Requested. Lists wait for this so the
  // first request is already the right status.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("status");
    if (fromUrl && TABS.some((t) => t.key === fromUrl)) setActiveTab(fromUrl);
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const url = new URL(window.location.href);
    if (activeTab === DEFAULT_TAB) url.searchParams.delete("status");
    else url.searchParams.set("status", activeTab);
    window.history.replaceState(null, "", url.toString());
  }, [urlReady, activeTab]);

  useEffect(() => {
    if (!urlReady) return;
    load(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, activeTab, debouncedSearch, dateFrom, dateTo, merchantFilter]);

  /*
  |--------------------------------------------------------------------------
  | Summary / reports - one call, respects date + merchant filters.
  |--------------------------------------------------------------------------
  */
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await getPickupSummary({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        merchant_id: merchantFilter || undefined,
      });
      setSummary(data);

      // Derive per-tab counts from the by_status map.
      const tabCounts = {};
      TABS.forEach((tab) => {
        if (!tab.statuses.length) {
          tabCounts[tab.key] = data.total ?? 0;
        } else {
          tabCounts[tab.key] = tab.statuses.reduce(
            (sum, s) => sum + (Number(data.byStatus?.[s]) || 0),
            0,
          );
        }
      });
      setCounts(tabCounts);
    } catch {
      /* silent */
    } finally {
      setSummaryLoading(false);
    }
  }, [dateFrom, dateTo, merchantFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMerchants({ per_page: 200 });
        if (!cancelled) setMerchantOptions(Array.isArray(res?.list) ? res.list : []);
      } catch {
        if (!cancelled) setMerchantOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!mapOpen || !urlReady) return undefined;
    let cancelled = false;
    (async () => {
      setMapLoading(true);
      try {
        const params = {
          page: 1,
          per_page: 100,
          search: debouncedSearch || undefined,
          status: statusParam(activeTab),
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          merchant_id: merchantFilter || undefined,
        };
        const first = await getPickups(params);
        let list = first.list ?? [];
        const pageSize = first.pageSize || 100;
        const pages = Math.min(Math.ceil((first.total || list.length) / pageSize), 5);
        for (let page = 2; page <= pages; page += 1) {
          const next = await getPickups({ ...params, page });
          list = list.concat(next.list ?? []);
        }
        if (!cancelled) setMapRows(list);
      } catch (error) {
        if (!cancelled) {
          message.error(error?.response?.data?.message || "Could not load pickups for the map.");
          setMapRows([]);
        }
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlReady, mapOpen, mapTick, activeTab, debouncedSearch, dateFrom, dateTo, merchantFilter]);

  const openDetail = useCallback(async (pickup) => {
    const id = getPickupId(pickup);
    if (!id) return;
    setDrawerOpen(true);
    setDetail(pickup);
    setDetailLoading(true);
    try {
      const fresh = await getPickup(id);
      if (fresh) setDetail(fresh);
    } catch (error) {
      message.error("Could not load pickup details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!detail) return;
    const id = getPickupId(detail);
    setDetailLoading(true);
    try {
      const fresh = await getPickup(id);
      if (fresh) setDetail(fresh);
    } finally {
      setDetailLoading(false);
    }
  }, [detail]);

  const loadStaff = useCallback(async () => {
    if (!detail) return;
    setStaffLoading(true);
    try {
      const list = await getPickupAssignableStaff(getPickupId(detail));
      setStaff(Array.isArray(list) ? list : []);
    } catch {
      setStaff([]);
    } finally {
      setStaffLoading(false);
    }
  }, [detail]);

  const afterMutation = useCallback(async () => {
    await Promise.all([
      refreshDetail(),
      load(pagination.current, pagination.pageSize),
      loadSummary(),
    ]);
  }, [refreshDetail, load, loadSummary, pagination]);

  const submitAssign = async () => {
    const values = await assignForm.validateFields();
    setSubmitting(true);
    try {
      await assignPickup(getPickupId(detail), values.staff_id);
      message.success("Rider assigned.");
      setAssignOpen(false);
      assignForm.resetFields();
      await afterMutation();
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to assign.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitTransfer = async () => {
    const values = await transferForm.validateFields();
    setSubmitting(true);
    try {
      await transferPickup(getPickupId(detail), values.staff_id, values.reason);
      message.success("Pickup transferred.");
      setTransferOpen(false);
      transferForm.resetFields();
      await afterMutation();
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to transfer.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCancel = async () => {
    const values = await cancelForm.validateFields();
    setSubmitting(true);
    try {
      await failPickup(getPickupId(detail), values.reason);
      message.success("Pickup cancelled.");
      setCancelOpen(false);
      cancelForm.resetFields();
      await afterMutation();
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to cancel.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitResend = async () => {
    const values = await resendForm.validateFields();
    setSubmitting(true);
    try {
      await resendPickupCallback(
        getPickupId(detail),
        values.event,
        values.shipment_id || null,
      );
      message.success("Callback re-sent.");
      setResendOpen(false);
      resendForm.resetFields();
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Failed to resend callback.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = (value) => {
    if (!value) return;
    navigator.clipboard?.writeText(String(value));
    message.success("Copied to clipboard.");
  };

  const executeReceive = async (shipmentId, payload = {}) => {
    if (!detail || !shipmentId) return;
    setReceivingId(shipmentId);
    setSubmitting(true);
    try {
      await receivePickupShipment(getPickupId(detail), shipmentId, {
        note: "Verified and received at origin branch.",
        ...payload,
      });
      message.success("Shipment received at origin branch.");
      setReceiveOpen(false);
      setReceiveTarget(null);
      receiveForm.resetFields();
      await afterMutation();
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Failed to receive shipment.",
      );
    } finally {
      setReceivingId(null);
      setSubmitting(false);
    }
  };

  const openReceive = (shipment) => {
    setReceiveTarget(shipment);
    const act = Number(shipment.actual_weight || shipment.weight || 1.5);
    const l = Number(shipment.length_cm || 0);
    const w = Number(shipment.width_cm || 0);
    const h = Number(shipment.height_cm || 0);
    setFormWeights({ actual: act, l, w, h });
    receiveForm.setFieldsValue({
      actual_weight: act,
      length_cm: l > 0 ? l : undefined,
      width_cm: w > 0 ? w : undefined,
      height_cm: h > 0 ? h : undefined,
      note: "Verified and received at origin branch.",
    });
    setReceiveOpen(true);
  };

  const submitVerifiedReceive = async () => {
    const values = await receiveForm.validateFields();
    if (!receiveTarget) return;
    await executeReceive(receiveTarget.id, {
      actual_weight: values.actual_weight,
      length_cm: values.length_cm || 0,
      width_cm: values.width_cm || 0,
      height_cm: values.height_cm || 0,
      note: values.note,
    });
  };

  const submitSkipReceive = async () => {
    if (!receiveTarget) return;
    await executeReceive(receiveTarget.id, {
      note: "Received at origin branch (weight check skipped).",
    });
  };

  const handleReceive = async (shipmentId) => {
    // Kept as backward compatibility if called directly
    await executeReceive(shipmentId);
  };

  // "Fix pickup status": preview first, then apply (audited on the server).
  const openFix = async () => {
    if (!detail) return;
    setFixOpen(true);
    setFixPreview(null);
    setFixReceive(false);
    setFixLoading(true);
    try {
      setFixPreview(await reconcilePickup(getPickupId(detail)));
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not check this pickup.",
      );
      setFixOpen(false);
    } finally {
      setFixLoading(false);
    }
  };

  const applyFix = async () => {
    if (!detail) return;
    setFixLoading(true);
    try {
      const res = await reconcilePickup(getPickupId(detail), {
        apply: true,
        receiveCorrected: fixReceive,
      });
      const errs = Array.isArray(res?.errors) ? res.errors : [];
      if (errs.length) {
        message.warning(
          `Fixed with ${errs.length} problem(s): ${errs.map((e) => e.error).join("; ")}`,
        );
      } else {
        message.success(
          res?.status_after === "completed"
            ? "Pickup status fixed. Pickup completed."
            : "Pickup status fixed.",
        );
      }
      setFixOpen(false);
      setFixPreview(null);
      await afterMutation();
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not fix this pickup.",
      );
    } finally {
      setFixLoading(false);
    }
  };

  const openReject = (shipment) => {
    setRejectTarget(shipment);
    rejectForm.resetFields();
    setRejectOpen(true);
  };

  const submitReject = async () => {
    const values = await rejectForm.validateFields();
    if (!detail || !rejectTarget?.id) return;
    setSubmitting(true);
    try {
      await rejectPickupShipment(getPickupId(detail), rejectTarget.id, {
        reason: values.reason,
        type: values.type,
      });
      message.success("Shipment rejected at origin branch.");
      setRejectOpen(false);
      setRejectTarget(null);
      rejectForm.resetFields();
      await afterMutation();
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Failed to reject shipment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Request",
        key: "request",
        render: (_, r) => (
          <Space direction="vertical" size={0}>
            <Button
              type="link"
              style={{ padding: 0, height: "auto", fontWeight: 600 }}
              onClick={() => openDetail(r)}
            >
              {getRequestNumber(r)}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {getShipments(r).length} shipment
              {getShipments(r).length === 1 ? "" : "s"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Merchant",
        key: "merchant",
        render: (_, r) => (
          <Space>
            <Avatar
              size="small"
              style={{ background: "#e6f4ff", color: "#1677ff" }}
              icon={<ShopOutlined />}
            />
            <Space direction="vertical" size={0}>
              <Text strong>{getMerchantName(r)}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {getLocationName(r)}
              </Text>
            </Space>
          </Space>
        ),
      },
      {
        title: "Rider",
        key: "rider",
        render: (_, r) => {
          const rider = getRider(r);
          if (!rider) return <Text type="secondary">Unassigned</Text>;
          return (
            <Space>
              <Avatar
                size="small"
                style={{ background: "#f6ffed", color: "#52c41a" }}
              >
                {initialsOf(rider.name)}
              </Avatar>
              <Space direction="vertical" size={0}>
                <Text>{rider.name}</Text>
                {rider.phone ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {rider.phone}
                  </Text>
                ) : null}
              </Space>
            </Space>
          );
        },
      },
      {
        title: "Status",
        key: "status",
        render: (_, r) => <StatusTag status={r.status} />,
      },
      {
        title: "Created",
        key: "created",
        render: (_, r) => (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {fmtDate(r.created_at) ?? "-"}
          </Text>
        ),
      },
      {
        title: "",
        key: "action",
        width: 48,
        render: (_, r) => (
          <Button
            type="text"
            icon={<RightOutlined />}
            onClick={() => openDetail(r)}
          />
        ),
      },
    ],
    [openDetail],
  );

  const detailShipments = getShipments(detail);
  const detailLocation = getLocation(detail);
  const detailRider = getRider(detail);
  const detailStatus = String(detail?.status ?? "").toLowerCase();

  const canAssign = ["requested", "assigned"].includes(detailStatus);
  const canTransfer = [
    "requested",
    "assigned",
    "accepted",
    "started",
    "arrived",
  ].includes(detailStatus);
  const canCancel = [
    "requested",
    "assigned",
    "accepted",
    "started",
    "arrived",
  ].includes(detailStatus);

  // Branch validation phase: the rider has collected the parcels (on the way /
  // at the branch). Staff verifies each shipment. "collected" is included so
  // the branch is never stuck when the rider forgot to press "start transit".
  const inValidation = ["on_way_to_branch", "collected"].includes(detailStatus);
  // A shipment is "received" once the branch has accepted it - including after it
  // has been auto-sorted for delivery or transfer.
  const RECEIVED_STATUSES = [
    "received_at_origin_branch",
    "received_at_origin",
    "sorted_for_delivery",
    "sorted_for_transfer",
  ];
  const REJECTED_STATUSES = ["pickup_failed", "cancelled"];
  // pickup_state comes from the server (PickupCustody::describe): where the
  // parcel really is, so a parcel that already left on a TR is never offered
  // for Receive again.
  const stateOf = (s) => s?.pickup_state ?? null;
  const isReceived = (s) => {
    const st = stateOf(s);
    if (st) return ["received", "left_on_tr", "moved_on"].includes(st.state);
    return RECEIVED_STATUSES.includes(String(s?.status ?? "").toLowerCase());
  };
  const isRejected = (s) => {
    const st = stateOf(s);
    if (st) return st.state === "rejected";
    return REJECTED_STATUSES.includes(String(s?.status ?? "").toLowerCase());
  };
  const isResolved = (s) => isReceived(s) || isRejected(s);

  // Shipment statuses that indicate the parcel has moved past pickup verification
  // and should not be offered for "Receive" at the pickup level.
  const POST_PICKUP_STATUSES = [
    "in_transit",
    "sorted_for_delivery",
    "sorted_for_transfer",
    "received_at_origin_branch",
    "received_at_origin",
    "out_for_delivery",
    "delivered",
    "failed",
  ];

  const isPostPickup = (s) => POST_PICKUP_STATUSES.includes(String(s?.status ?? "").toLowerCase());

  const canReceive = (s) => {
    // If shipment is already past pickup stage, don't allow receive
    if (isPostPickup(s)) return false;
    const st = stateOf(s);
    if (st) return Boolean(st.can_receive);
    return !isResolved(s);
  };
  const canReject = (s) => {
    // If shipment is already past pickup stage, don't allow reject
    if (isPostPickup(s)) return false;
    const st = stateOf(s);
    if (st) return Boolean(st.can_reject);
    return !isResolved(s);
  };
  // Lines that need "Fix pickup status": parcel already left / moved on but
  // the pickup line was never verified, or a wrong "in transit" status.
  const needsFix = detailShipments.filter((s) => {
    const st = stateOf(s);
    return Boolean(st && (st.needs_sync || st.state === "wrong_in_transit"));
  });
  const canFix =
    needsFix.length > 0 &&
    !["completed", "cancelled", "failed"].includes(detailStatus);
  const sortModeOf = (s) => {
    const st = String(s?.status ?? "").toLowerCase();
    if (st === "sorted_for_delivery") return "delivery";
    if (st === "sorted_for_transfer") return "transfer";
    return null;
  };
  const receivedCount = detailShipments.filter(isReceived).length;
  const rejectedCount = detailShipments.filter(isRejected).length;
  // A line that still needs "Fix pickup status" is not resolved on the pickup yet.
  const pendingCount = detailShipments.filter(
    (s) => !isResolved(s) || needsFix.includes(s),
  ).length;
  const resolvedCount = detailShipments.length - pendingCount;

  const lat =
    detailLocation?.latitude ??
    detailLocation?.lat ??
    detail?.pickup_lat ??
    null;
  const lng =
    detailLocation?.longitude ??
    detailLocation?.lng ??
    detail?.pickup_lng ??
    null;
  const hasCoords = lat != null && lng != null;

  const timeline = [
    { label: "Requested", value: detail?.created_at, dot: <InboxOutlined /> },
    {
      label: "Rider assigned",
      value: detail?.assigned_at,
      dot: <UserAddOutlined />,
    },
    {
      label: "Accepted",
      value: detail?.accepted_at,
      dot: <CheckCircleOutlined />,
    },
    { label: "En route", value: detail?.started_at, dot: <CarOutlined /> },
    {
      label: "Arrived",
      value: detail?.arrived_at,
      dot: <EnvironmentOutlined />,
    },
    {
      label: "Collected",
      value: detail?.collected_at ?? detail?.picked_up_at,
      dot: <CheckCircleOutlined />,
    },
    {
      label: "On way to branch",
      value: detail?.in_transit_at ?? detail?.on_way_at,
      dot: <CarOutlined />,
    },
    {
      label: "Completed at branch",
      value: detail?.completed_at,
      dot: <CheckCircleOutlined />,
    },
  ].filter((t) => t.value);

  return (
    <div style={{ padding: 24, background: "#f7f8fa", minHeight: "100%" }}>
      {/* Header */}
      <AdminPageHeader
        title="Pickups"
        subtitle="Monitor the pickup lifecycle across every branch"
        actions={
          <Space>
            <Button
              icon={<EnvironmentOutlined />}
              type={mapOpen ? "primary" : "default"}
              onClick={() => setMapOpen((open) => !open)}
            >
              Map
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                load(pagination.current, pagination.pageSize);
                loadSummary();
              }}
            >
              Refresh
            </Button>
          </Space>
        }
      />

      {mapOpen && (
        <AreaAssignmentMap
          mode="pickup"
          loading={mapLoading}
          statusOptions={TABS.map((tab) => ({ key: tab.key, label: tab.label, color: tab.hex, count: counts[tab.key] ?? 0 }))}
          statusValue={activeTab}
          onStatusChange={(key) => {
            setActiveTab(TABS.some((t) => t.key === key) ? key : "all");
            setPagination((p) => ({ ...p, current: 1 }));
          }}
          selectedIds={mapSelected}
          onSelectedIdsChange={setMapSelected}
          onOpen={(id) => {
            const row = mapRows.find((pickup) => getPickupId(pickup) === id);
            if (row) openDetail(row);
          }}
          riders={mapRiders}
          ridersLoading={mapRidersLoading}
          onLoadRiders={async (ids) => {
            const id = ids?.[0];
            if (!id) return;
            setMapRidersLoading(true);
            try {
              setMapRiders(await getPickupAssignableStaff(id));
            } catch {
              setMapRiders([]);
            } finally {
              setMapRidersLoading(false);
            }
          }}
          onAssign={async (riderId, ids) => {
            const results = await Promise.allSettled(
              ids.map((id) => assignPickup(id, riderId)),
            );
            const failed = results.filter((result) => result.status === "rejected").length;
            if (failed) {
              message.warning(`${ids.length - failed} assigned, ${failed} could not be assigned.`);
            } else {
              message.success("Rider assigned.");
            }
            setMapSelected([]);
            setMapTick((n) => n + 1);
            load(pagination.current, pagination.pageSize);
            loadSummary();
          }}
          stops={mapRows.map((pickup) => ({
            id: getPickupId(pickup),
            title: getRequestNumber(pickup),
            subtitle: `${getMerchantName(pickup)} · ${pickup.parcel_quantity ?? 0} packets`,
            area: pickup.pickup_area || pickup.pickup_city || "Unknown area",
            address: pickup.pickup_address || "",
            lat: pickup.pickup_lat,
            lng: pickup.pickup_lng,
            status: pickup.status,
            statusLabel: (STATUS_META[String(pickup.status || "").toLowerCase()] || {}).label || pickup.status,
            color: (STATUS_META[String(pickup.status || "").toLowerCase()] || {}).hex || "#6B7280",
            riderName: pickup.assigned_staff?.name || pickup.assignedStaff?.name || "",
            riderRole: pickup.assigned_staff?.role || pickup.assignedStaff?.role || "",
          }))}
        />
      )}

      <Card className="admin-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="Search request, merchant, tracking"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <DatePicker.RangePicker
            allowEmpty={[true, true]}
            value={[
              dateFrom ? dayjs(dateFrom) : null,
              dateTo ? dayjs(dateTo) : null,
            ]}
            onChange={(range) => {
              setDateFrom(range?.[0] ? range[0].format("YYYY-MM-DD") : null);
              setDateTo(range?.[1] ? range[1].format("YYYY-MM-DD") : null);
            }}
          />
          <Select
            allowClear
            showSearch
            placeholder="Merchant / store"
            style={{ minWidth: 240 }}
            value={merchantFilter}
            optionFilterProp="label"
            onChange={(v) => setMerchantFilter(v ?? null)}
            options={(merchantOptions.length ? merchantOptions : (summary?.byMerchant || [])).map((m) => ({
              value: m.id ?? m.merchant_id,
              label: formatMerchantLabel(m.id ? m : { merchant_id: m.merchant_id, merchant_name: m.merchant_name }),
            }))}
          />
          {(dateFrom || dateTo || merchantFilter || activeTab !== DEFAULT_TAB) && (
            <Button
              onClick={() => {
                setDateFrom(null);
                setDateTo(null);
                setMerchantFilter(null);
                setActiveTab(DEFAULT_TAB);
              }}
            >
              Clear
            </Button>
          )}
        </Space>
      </Card>

      {/* Diagrammatic status summary */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #eef0f2",
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
          }}
        >
          <Text strong style={{ fontSize: 14 }}>
            Status overview
            {dateFrom || dateTo ? (
              <Text
                type="secondary"
                style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}
              >
                {dateFrom ?? "..."}{" -> "}{dateTo ?? "..."}
              </Text>
            ) : null}
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {summary.total} total
          </Text>
        </div>

        {/* Stacked proportion bar */}
        <div
          style={{
            display: "flex",
            height: 10,
            borderRadius: 999,
            overflow: "hidden",
            background: "#f0f2f5",
            marginBottom: 14,
          }}
        >
          {TABS.filter((t) => t.key !== "all").map((tab) => {
            const value = counts[tab.key] ?? 0;
            const pct = summary.total ? (value / summary.total) * 100 : 0;
            if (!pct) return null;
            return (
              <Tooltip key={tab.key} title={`${tab.label}: ${value}`}>
                <div style={{ width: `${pct}%`, background: tab.hex }} />
              </Tooltip>
            );
          })}
        </div>

        {/* Clickable status chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const value = counts[tab.key] ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: active ? "#fff" : "#4b5563",
                  background: active ? tab.hex : "#f5f6f8",
                  border: `1px solid ${active ? tab.hex : "#eef0f2"}`,
                  transition: "all .15s",
                }}
              >
                <span
                  style={{
                    color: active ? "#fff" : tab.hex,
                    display: "inline-flex",
                  }}
                >
                  {tab.icon}
                </span>
                {tab.label}
                <span
                  style={{
                    background: active ? "rgba(255,255,255,0.25)" : "#fff",
                    color: active ? "#fff" : "#111827",
                    borderRadius: 999,
                    padding: "0 7px",
                    fontSize: 11,
                  }}
                >
                  {value}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #eef0f2",
          overflow: "visible",
          width: "100%",
        }}
        className="admin-card"
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #f4f5f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Space size={8}>
            <span style={{ color: tabByKey(activeTab).hex }}>
              {tabByKey(activeTab).icon}
            </span>
            <Text strong style={{ fontSize: 15 }}>
              {tabByKey(activeTab).label}
            </Text>
            <Badge
              count={counts[activeTab] ?? 0}
              showZero
              overflowCount={9999}
              style={{ background: tabByKey(activeTab).hex }}
            />
          </Space>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {tabByKey(activeTab).hint ?? ""}
          </Text>
        </div>

        <Table
          className="compact"
          size="small"
          rowKey={(r) => getPickupId(r)}
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1200 }}
          onRow={(r) => ({
            onClick: () => openDetail(r),
            style: { cursor: "pointer" },
          })}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={`No ${tabByKey(activeTab).label.toLowerCase()} pickups`}
              />
            ),
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (t) => `${t} pickup${t === 1 ? "" : "s"}`,
            onChange: (page, pageSize) => load(page, pageSize),
          }}
        />
      </div>

      {/* Detail Drawer */}
      <Drawer
        open={drawerOpen}
        width={Math.min(
          520,
          typeof window !== "undefined" ? window.innerWidth - 40 : 520,
        )}
        onClose={() => setDrawerOpen(false)}
        maskClosable
        destroyOnClose
        styles={{
          header: { borderBottom: "1px solid #f0f0f0" },
          body: { padding: 20, background: "#f7f8fa" },
        }}
        title={
          detail ? (
            <Space direction="vertical" size={2}>
              <Space size={8}>
                <Text strong style={{ fontSize: 16 }}>
                  {getRequestNumber(detail)}
                </Text>
                <StatusTag status={detail.status} />
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {metaFor(detail.status).hint}
              </Text>
            </Space>
          ) : (
            "Pickup"
          )
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            loading={detailLoading}
            onClick={refreshDetail}
          >
            Refresh
          </Button>
        }
      >
        {detail ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {/* Action bar */}
            <Space wrap>
              {canAssign && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => {
                    assignForm.resetFields();
                    loadStaff();
                    setAssignOpen(true);
                  }}
                  style={{ background: "#0891B2", borderColor: "#0891B2" }}
                >
                  Assign rider
                </Button>
              )}
              {canTransfer && (
                <Button
                  icon={<SwapOutlined />}
                  onClick={() => {
                    transferForm.resetFields();
                    loadStaff();
                    setTransferOpen(true);
                  }}
                >
                  Transfer
                </Button>
              )}
              <Button
                icon={<SendOutlined />}
                onClick={() => {
                  resendForm.resetFields();
                  setResendOpen(true);
                }}
              >
                Resend callback
              </Button>
              {canCancel && (
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    cancelForm.resetFields();
                    setCancelOpen(true);
                  }}
                >
                  Cancel
                </Button>
              )}
            </Space>

            {/* Merchant + location */}
            <SectionCard icon={<ShopOutlined />} title="Merchant & Location">
              <Field label="Merchant">
                <Text strong>{getMerchantName(detail)}</Text>
              </Field>
              <Field label="Location">{getLocationName(detail)}</Field>
              {detailLocation?.address ? (
                <Field label="Address">{detailLocation.address}</Field>
              ) : null}
              {(detailLocation?.phone ?? detail?.pickup_phone) ? (
                <Field label="Phone">
                  <Space size={6}>
                    <PhoneOutlined style={{ color: BRAND }} />
                    {detailLocation?.phone ?? detail?.pickup_phone}
                  </Space>
                </Field>
              ) : null}

              {hasCoords ? (
                <>
                  <Divider style={{ margin: "8px 0 12px" }} />
                  <Space size={6} style={{ marginBottom: 8 }}>
                    <EnvironmentOutlined style={{ color: BRAND }} />
                    <Text
                      copyable={{ text: `${lat}, ${lng}` }}
                      style={{ fontSize: 13 }}
                    >
                      {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                    </Text>
                  </Space>
                  <div
                    style={{
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid #eef0f2",
                    }}
                  >
                    <iframe
                      title="Pickup location"
                      width="100%"
                      height="160"
                      style={{ border: 0, display: "block" }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
                    />
                  </div>
                  <Button
                    block
                    style={{ marginTop: 8 }}
                    icon={<EnvironmentOutlined />}
                    href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                    target="_blank"
                  >
                    Open in Google Maps
                  </Button>
                </>
              ) : null}
            </SectionCard>

            {/* Rider */}
            <SectionCard icon={<CarOutlined />} title="Assigned Rider">
              {detailRider ? (
                <Space>
                  <Avatar style={{ background: "#f6ffed", color: "#52c41a" }}>
                    {initialsOf(detailRider.name)}
                  </Avatar>
                  <Space direction="vertical" size={0}>
                    <Text strong>{detailRider.name}</Text>
                    {detailRider.phone ? (
                      <Text type="secondary">
                        <PhoneOutlined /> {detailRider.phone}
                      </Text>
                    ) : null}
                  </Space>
                </Space>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No rider assigned yet"
                  style={{ margin: "8px 0" }}
                />
              )}
            </SectionCard>

            {/* Timeline */}
            {timeline.length ? (
              <SectionCard icon={<ClockCircleOutlined />} title="Timeline">
                <Timeline
                  style={{ marginTop: 4 }}
                  items={timeline.map((t) => ({
                    dot: <span style={{ color: BRAND }}>{t.dot}</span>,
                    children: (
                      <Space direction="vertical" size={0}>
                        <Text strong style={{ fontSize: 13 }}>
                          {t.label}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {fmtDate(t.value)}
                        </Text>
                      </Space>
                    ),
                  }))}
                />
              </SectionCard>
            ) : null}

            {/* Branch validation banner */}
            {inValidation && (
              <Alert
                type={pendingCount === 0 ? "success" : "warning"}
                showIcon
                message={
                  pendingCount === 0
                    ? "All shipments verified."
                    : "Verify collected shipments"
                }
                description={
                  pendingCount === 0
                    ? `Every shipment has been resolved (${receivedCount} received${rejectedCount ? `, ${rejectedCount} rejected` : ""}). The pickup will complete automatically.`
                    : `When the rider hands over the parcels, receive each one or reject a discrepancy. ${resolvedCount}/${detailShipments.length} resolved, ${pendingCount} pending.`
                }
              />
            )}

            {/* Parcels whose real state does not match the pickup */}
            {canFix ? (
              <Alert
                type="error"
                showIcon
                message={`${needsFix.length} parcel(s) do not match this pickup`}
                description={
                  <Space direction="vertical" size={6}>
                    <Text style={{ fontSize: 12 }}>
                      {needsFix
                        .map(
                          (s) =>
                            `${s.tracking_number ?? `#${s.id}`}: ${stateOf(s)?.label}`,
                        )
                        .join(" | ")}
                    </Text>
                    <Button
                      size="small"
                      type="primary"
                      danger
                      onClick={openFix}
                    >
                      Fix pickup status
                    </Button>
                  </Space>
                }
              />
            ) : null}

            {/* Shipments */}
            <SectionCard
              icon={<InboxOutlined />}
              title="Shipments"
              extra={
                <Space size={6}>
                  {inValidation ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {resolvedCount}/{detailShipments.length} resolved
                    </Text>
                  ) : null}
                  <Badge
                    count={detailShipments.length}
                    showZero
                    style={{ background: BRAND }}
                  />
                </Space>
              }
            >
              {detailShipments.length ? (
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  {detailShipments.map((s) => {
                    const received = isReceived(s);
                    const rejected = isRejected(s);
                    const sortMode = sortModeOf(s);
                    const custody = stateOf(s);
                    const stateNote =
                      custody &&
                      ["left_on_tr", "moved_on", "wrong_in_transit"].includes(
                        custody.state,
                      )
                        ? custody
                        : null;
                    return (
                      <div
                        key={s.id ?? s.tracking_number}
                        style={{
                          border: "1px solid #eef0f2",
                          borderRadius: 10,
                          padding: "10px 12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Space direction="vertical" size={2}>
                          <Space size={6}>
                            <Text strong style={{ fontSize: 13 }}>
                              {s.tracking_number ?? "-"}
                            </Text>
                            {s.tracking_number ? (
                              <Tooltip title="Copy tracking">
                                <CopyOutlined
                                  style={{
                                    color: "#bfbfbf",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => copyText(s.tracking_number)}
                                />
                              </Tooltip>
                            ) : null}
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Order: {s.merchant_order_id ?? "N/A"}
                          </Text>
                          {sortMode ? (
                            <Tag
                              color={
                                sortMode === "delivery" ? "green" : "orange"
                              }
                              style={{ margin: 0, marginTop: 2 }}
                            >
                              {sortMode === "delivery" ? (
                                <>
                                  <EnvironmentOutlined /> Last-mile delivery
                                </>
                              ) : (
                                <>
                                  <SwapOutlined /> Transfer
                                </>
                              )}
                            </Tag>
                          ) : null}
                          {stateNote ? (
                            <Tag
                              color={
                                stateNote.state === "wrong_in_transit"
                                  ? "red"
                                  : "gold"
                              }
                              style={{ margin: 0, marginTop: 2, whiteSpace: "normal" }}
                            >
                              <ExclamationCircleOutlined /> {stateNote.label}
                            </Tag>
                          ) : null}
                        </Space>

                        <Space size={8}>
                          <StatusTag status={s.status} withIcon={false} />
                          {inValidation && s.id ? (
                            received ? (
                              <Tag
                                color={stateNote ? "gold" : "success"}
                                style={{ margin: 0 }}
                              >
                                <CheckCircleOutlined />{" "}
                                {custody?.state === "left_on_tr" && custody?.tr
                                  ? `On ${custody.tr.number}`
                                  : stateNote
                                    ? "Moved on"
                                    : "Received"}
                              </Tag>
                            ) : rejected ? (
                              <Tag color="error" style={{ margin: 0 }}>
                                <CloseCircleOutlined /> Rejected
                              </Tag>
                            ) : canReceive(s) || canReject(s) ? (
                              <Space size={6}>
                                {canReceive(s) ? (
                                  <Button
                                    type="primary"
                                    size="small"
                                    icon={<CheckCircleOutlined />}
                                    loading={receivingId === s.id}
                                    onClick={() => openReceive(s)}
                                    style={{ background: "#10B981", borderColor: "#10B981" }}
                                  >
                                    Receive
                                  </Button>
                                ) : null}
                                {canReject(s) ? (
                                  <Button
                                    danger
                                    size="small"
                                    icon={<CloseCircleOutlined />}
                                    onClick={() => openReject(s)}
                                  >
                                    Reject
                                  </Button>
                                ) : null}
                              </Space>
                            ) : (
                              <Tag style={{ margin: 0 }}>
                                {custody?.label ?? "Waiting"}
                              </Tag>
                            )
                          ) : null}
                        </Space>
                      </div>
                    );
                  })}
                </Space>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No shipments"
                  style={{ margin: "8px 0" }}
                />
              )}
            </SectionCard>
          </Space>
        ) : (
          <Empty description="Select a pickup" />
        )}
      </Drawer>

      {/* Assign modal */}
      <Modal
        title="Assign rider"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={submitAssign}
        confirmLoading={submitting}
        okText="Assign"
      >
        <Form form={assignForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="staff_id"
            label="Rider"
            rules={[{ required: true, message: "Select a rider" }]}
          >
            <Select
              loading={staffLoading}
              placeholder="Select a rider"
              options={staff.map((s) => ({
                value: s.id,
                label: `${s.name}${s.phone ? ` | ${s.phone}` : ""}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Transfer modal */}
      <Modal
        title="Transfer to another rider"
        open={transferOpen}
        onCancel={() => setTransferOpen(false)}
        onOk={submitTransfer}
        confirmLoading={submitting}
        okText="Transfer"
      >
        <Form form={transferForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="staff_id"
            label="New rider"
            rules={[{ required: true, message: "Select a rider" }]}
          >
            <Select
              loading={staffLoading}
              placeholder="Select a rider"
              options={staff
                .filter((s) => Number(s.id) !== Number(detailRider?.id))
                .map((s) => ({
                  value: s.id,
                  label: `${s.name}${s.phone ? ` | ${s.phone}` : ""}`,
                }))}
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: "Enter a reason" }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Why is this pickup being transferred?"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Cancel modal */}
      <Modal
        title="Cancel pickup"
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onOk={submitCancel}
        confirmLoading={submitting}
        okText="Cancel pickup"
        okButtonProps={{ danger: true }}
        cancelText="Keep"
      >
        <Form form={cancelForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: "Enter a reason" }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Shipment missing, cutoff passed, service not fulfillable..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Resend modal */}
      <Modal
        title="Resend callback"
        open={resendOpen}
        onCancel={() => setResendOpen(false)}
        onOk={submitResend}
        confirmLoading={submitting}
        okText="Resend"
      >
        <Form form={resendForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="event"
            label="Event"
            rules={[{ required: true, message: "Select an event" }]}
          >
            <Select
              placeholder="Select an event"
              onChange={() =>
                resendForm.setFieldValue("shipment_id", undefined)
              }
              options={RESEND_EVENTS.map((e) => ({
                value: e.value,
                label: e.label,
              }))}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.event !== cur.event}
          >
            {({ getFieldValue }) => {
              const ev = RESEND_EVENTS.find(
                (e) => e.value === getFieldValue("event"),
              );
              if (ev?.scope !== "shipment") return null;
              return (
                <Form.Item
                  name="shipment_id"
                  label="Shipment"
                  rules={[{ required: true, message: "Select a shipment" }]}
                >
                  <Select
                    placeholder="Select a shipment"
                    options={detailShipments.map((s) => ({
                      value: s.id,
                      label: s.tracking_number ?? `#${s.id}`,
                    }))}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Fix pickup status: preview, then apply */}
      <Modal
        title={`Fix pickup status${fixPreview?.request_number ? ` · ${fixPreview.request_number}` : ""}`}
        open={fixOpen}
        width={760}
        onCancel={() => {
          setFixOpen(false);
          setFixPreview(null);
        }}
        onOk={applyFix}
        okText="Apply fix"
        okButtonProps={{
          disabled: !fixPreview || !(fixPreview?.changes > 0),
          danger: true,
        }}
        confirmLoading={fixLoading}
        cancelText="Close"
      >
        {fixLoading && !fixPreview ? (
          <Text type="secondary">Checking where each parcel is…</Text>
        ) : fixPreview ? (
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Alert
              type={fixPreview.changes > 0 ? "warning" : "success"}
              showIcon
              message={
                fixPreview.changes > 0
                  ? `${fixPreview.changes} change(s) will be made. Nothing has changed yet.`
                  : "Nothing to fix. This pickup matches its parcels."
              }
              description="Parcels that already left on a TR are only closed on this pickup; they stay on their TR. Parcels marked in transit with no TR go back to picked up so you can receive them."
            />
            <Table
              size="small"
              rowKey="shipment_id"
              pagination={false}
              dataSource={Array.isArray(fixPreview.items) ? fixPreview.items : []}
              columns={[
                { title: "Tracking", dataIndex: "tracking_number" },
                {
                  title: "Status",
                  dataIndex: "shipment_status",
                  render: (v) => String(v ?? "").replaceAll("_", " "),
                },
                { title: "Where it is", dataIndex: "label" },
                {
                  title: "Fix",
                  dataIndex: "action_label",
                  render: (v) =>
                    v ? <Text strong>{v}</Text> : <Text type="secondary">-</Text>,
                },
              ]}
            />
            {(fixPreview.items ?? []).some((r) => r.action === "reset_status") ? (
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={fixReceive}
                  onChange={(e) => setFixReceive(e.target.checked)}
                />
                <Text>
                  These parcels are here at the branch: receive them now too
                </Text>
              </label>
            ) : null}
          </Space>
        ) : null}
      </Modal>

      {/* Reject shipment modal */}
      <Modal
        title="Reject shipment"
        open={rejectOpen}
        onCancel={() => {
          setRejectOpen(false);
          setRejectTarget(null);
        }}
        onOk={submitReject}
        confirmLoading={submitting}
        okText="Reject shipment"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
      >
        {rejectTarget ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={`Rejecting ${rejectTarget.tracking_number ?? `#${rejectTarget.id}`}`}
            description="This parcel will be pulled out of the forward flow and flagged for follow-up. The rest of the pickup can still be received."
          />
        ) : null}
        <Form form={rejectForm} layout="vertical" initialValues={{ type: "missing" }}>
          <Form.Item
            name="type"
            label="Reason type"
            rules={[{ required: true, message: "Select a reason type" }]}
          >
            <Select
              options={[
                { value: "missing", label: "Missing / not handed over" },
                { value: "damaged", label: "Damaged" },
                { value: "mismatch", label: "Mismatch with manifest" },
                { value: "other", label: "Other" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Details"
            rules={[{ required: true, message: "Enter a reason" }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Describe the discrepancy (what was expected vs. what arrived)..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Receive & Weight Verification Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: "#10B981" }} />
            <span>
              Receive & Verify Weight · {receiveTarget?.tracking_number || `#${receiveTarget?.id}`}
            </span>
          </Space>
        }
        open={receiveOpen}
        onCancel={() => {
          if (!submitting) {
            setReceiveOpen(false);
            setReceiveTarget(null);
            receiveForm.resetFields();
          }
        }}
        width={560}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setReceiveOpen(false);
              setReceiveTarget(null);
              receiveForm.resetFields();
            }}
            disabled={submitting}
          >
            Cancel
          </Button>,
          <Button
            key="skip"
            onClick={submitSkipReceive}
            loading={submitting}
            title="Receive without re-weighing or updating dimensions"
          >
            Skip & Receive
          </Button>,
          <Button
            key="verify"
            type="primary"
            onClick={submitVerifiedReceive}
            loading={submitting}
            style={{ background: "#10B981", borderColor: "#10B981" }}
          >
            Verify & Receive
          </Button>,
        ]}
      >
        {receiveTarget ? (
          <Space direction="vertical" size={14} style={{ width: "100%", marginTop: 8 }}>
            <Alert
              type="info"
              showIcon
              message="Intake Weight & Dimensions Check"
              description={
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  <div>
                    Declared at checkout: <b>{receiveTarget.weight ?? 1.5} kg</b> |
                    Current Delivery Charge: <b>NPR {receiveTarget.delivery_charge ?? 0}</b>
                  </div>
                  <div style={{ marginTop: 2, color: "#475569" }}>
                    The system compares the <b>actual scale weight</b> with the <b>volumetric weight</b> (L×W×H / 5000). Whichever is higher becomes the billable chargeable weight. If changed, the delivery charge will be recalculated and the store will be notified via webhook.
                  </div>
                </div>
              }
            />

            <Form
              form={receiveForm}
              layout="vertical"
              onValuesChange={(_, all) => {
                setFormWeights({
                  actual: Number(all.actual_weight) || 0,
                  l: Number(all.length_cm) || 0,
                  w: Number(all.width_cm) || 0,
                  h: Number(all.height_cm) || 0,
                });
              }}
            >
              <Form.Item
                name="actual_weight"
                label={<b>Actual Scale Weight (kg)</b>}
                rules={[{ required: true, message: "Enter actual scale weight" }]}
                extra="Physical weight measured on the scale at branch intake."
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0.01}
                  step={0.1}
                  precision={2}
                  placeholder="e.g. 1.50"
                  addonAfter="kg"
                />
              </Form.Item>

              <div style={{ marginBottom: 8 }}>
                <Text strong>Dimensions (optional for volumetric weight):</Text>
              </div>

              <Row gutter={8}>
                <Col span={8}>
                  <Form.Item name="length_cm" label="Length (cm)">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={1}
                      placeholder="L (cm)"
                      addonAfter="cm"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="width_cm" label="Width (cm)">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={1}
                      placeholder="W (cm)"
                      addonAfter="cm"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="height_cm" label="Height (cm)">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={1}
                      placeholder="H (cm)"
                      addonAfter="cm"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Card
                size="small"
                style={{
                  background: "#F8FAFC",
                  borderColor: "#E2E8F0",
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <Row align="middle" justify="space-between">
                  <Col>
                    <div style={{ fontSize: 12, color: "#64748B" }}>Volumetric Weight:</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {volumetricCalculated > 0 ? `${volumetricCalculated} kg` : "—"}
                    </div>
                  </Col>
                  <Col>
                    <div style={{ fontSize: 12, color: "#64748B" }}>Actual Weight:</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {Number(formWeights.actual || 0).toFixed(2)} kg
                    </div>
                  </Col>
                  <Col>
                    <div style={{ fontSize: 12, color: "#0F172A", fontWeight: 600 }}>
                      Chargeable Billable Weight:
                    </div>
                    <Tag
                      color={
                        volumetricCalculated > (Number(formWeights.actual) || 0)
                          ? "purple"
                          : "blue"
                      }
                      style={{ fontSize: 14, padding: "2px 8px", fontWeight: 700 }}
                    >
                      {chargeableCalculated} kg
                    </Tag>
                  </Col>
                </Row>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>
                  {volumetricCalculated > (Number(formWeights.actual) || 0)
                    ? "⚡ Volumetric weight is higher and will be used as final billable weight."
                    : "⚖️ Actual scale weight is higher or equal and will be used as final billable weight."}
                </div>
              </Card>

              <Form.Item name="note" label="Intake Remarks / Note">
                <Input.TextArea
                  rows={2}
                  placeholder="Optional branch verification note..."
                />
              </Form.Item>
            </Form>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}
