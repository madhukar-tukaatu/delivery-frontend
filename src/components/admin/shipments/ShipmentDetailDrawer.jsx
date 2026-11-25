"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Image,
  Input,
  Modal,
  Row,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ReloadOutlined,
  PrinterOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  UserOutlined,
  CarOutlined,
  DollarOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  FileTextOutlined,
  AimOutlined,
  StopOutlined,
  RollbackOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  PhoneOutlined,
  ExpandAltOutlined,
  CloseOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

import ShipmentWorkflowActions from "@/features/workflow/components/ShipmentWorkflowActions";
import WorkflowStatusTag from "@/features/workflow/components/WorkflowStatusTag";
import ShipmentTransferHops from "@/components/admin/shipments/ShipmentTransferHops";
import BranchShareBreakdown from "@/components/admin/shipments/BranchShareBreakdown";
import EditDeliveryLocationModal from "@/components/admin/shipments/EditDeliveryLocationModal";
import {
  cancelShipment,
  initiateShipmentReturn,
  markShipmentReturnedToOrigin,
  markShipmentReturnedToMerchant,
} from "@/services/merchant/merchantShipmentService";
import {
  dispatchNextRouteStep,
  getAdminShipment,
  receiveCurrentRouteStep,
  receiveOriginSubBranch,
} from "@/services/workflowService";
import { normalizeShipmentDetailResponse } from "@/services/merchantShipmentService";
import { collectAmount } from "@/lib/collectAmount";
import {
  formatDateTime,
  formatMoney,
  labelForStatus,
} from "@/config/workflowStatus";
import styles from "./ShipmentDetailDrawer.module.css";

const { Text, Paragraph } = Typography;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function firstValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return null;
}

function hasText(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "object") return true;
  return String(value).trim() !== "";
}

function formatKm(value) {
  const km = Number(value);
  if (!Number.isFinite(km) || km <= 0) return null;
  const digits = km < 1 ? 2 : km < 10 ? 1 : 0;
  return `${Number(km.toFixed(digits))} km`;
}

function formatKathmandu(value, withDate = true) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Kathmandu",
    ...(withDate ? { day: "2-digit", month: "short", year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function BranchRibbonTag({ name, id, color = "geekblue" }) {
  if (!name && !id) return null;

  const ribbonColor =
    color === "blue"
      ? "#1677ff"
      : color === "geekblue"
        ? "#2f54eb"
        : color === "cyan"
          ? "#13c2c2"
          : color === "green"
            ? "#52c41a"
            : color === "orange"
              ? "#fa8c16"
              : color === "purple"
                ? "#722ed1"
                : "#2f54eb";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 4,
        border: `1px solid ${ribbonColor}40`,
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
        fontSize: 12,
        lineHeight: "22px",
        verticalAlign: "middle",
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          background: ribbonColor,
          color: "#ffffff",
          fontWeight: 600,
          padding: "1px 9px",
          display: "inline-block",
          letterSpacing: 0.2,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
      >
        {name || `Branch #${id}`}
      </span>
      {id && name && (
        <span
          style={{
            padding: "1px 7px",
            color: "#475569",
            fontWeight: 600,
            fontSize: 11,
            background: "#f8fafc",
            borderLeft: `1px solid ${ribbonColor}30`,
            whiteSpace: "nowrap",
          }}
        >
          #{id}
        </span>
      )}
    </span>
  );
}

function coordinateLabel(latitude, longitude) {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined ||
    latitude === "" ||
    longitude === ""
  ) {
    return null;
  }
  return `${latitude}, ${longitude}`;
}

function moneyValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function parseJsonField(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (
    Number.isNaN(nLat1) ||
    Number.isNaN(nLon1) ||
    Number.isNaN(nLat2) ||
    Number.isNaN(nLon2)
  )
    return null;

  const R = 6371; // Earth radius in km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function resolveBranchCoords(branch) {
  if (!branch || typeof branch !== "object") return null;
  const lat = branch.latitude ?? branch.office_latitude ?? branch.lat ?? null;
  const lng = branch.longitude ?? branch.office_longitude ?? branch.lng ?? null;
  if (
    lat != null &&
    lng != null &&
    !Number.isNaN(Number(lat)) &&
    !Number.isNaN(Number(lng))
  ) {
    return { lat: Number(lat), lng: Number(lng) };
  }
  return null;
}

const STATUS_COLOR_MAP = {
  booked: "#64748B",
  pending: "#94A3B8",
  confirmed: "#3B82F6",
  awaiting_pickup: "#F59E0B",
  pickup_requested: "#F59E0B",
  pickup_assigned: "#8B5CF6",
  picked_up: "#6366F1",
  pickup_failed: "#F43F5E",
  received_at_origin_sub_branch: "#7C3AED",
  received_at_origin_branch: "#7C3AED",
  received_at_origin: "#7C3AED",
  sorted_for_delivery: "#14B8A6",
  sorted_for_transfer: "#F97316",
  in_transit: "#0891B2",
  received_at_transit_hub: "#0E7490",
  dispatched_to_destination_branch: "#0369A1",
  received_at_destination_branch: "#CA8A04",
  received_at_destination_sub_branch: "#CA8A04",
  received_at_destination: "#CA8A04",
  assigned_to_rider: "#DB2777",
  out_for_delivery: "#2563EB",
  delivered: "#10B981",
  delivery_failed: "#EF4444",
  failed: "#EF4444",
  return_initiated: "#D97706",
  returned_to_origin: "#B45309",
  returned_to_merchant: "#059669",
  cancelled: "#9CA3AF",
};

function statusColor(status) {
  return STATUS_COLOR_MAP[status] || "#64748B";
}

function StatusChip({ status }) {
  if (!status) return null;
  return (
    <span
      className={styles.statusChip}
      style={{ "--status-color": statusColor(status) }}
    >
      <span
        className={styles.dot}
        style={{ background: statusColor(status) }}
      />
      {labelForStatus(status)}
    </span>
  );
}

function InfoRow({ label, children, wrap = false }) {
  if (children === null || children === undefined || children === "")
    return null;
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={wrap ? styles.infoValueWrap : styles.infoValue}>
        {children}
      </span>
    </div>
  );
}

function PhoneLink({ phone }) {
  if (!phone) return null;
  return (
    <a className={styles.phone} href={`tel:${phone}`}>
      {phone}
    </a>
  );
}

function eventTimestamp(event) {
  return (
    event?.created_at ||
    event?.event_time ||
    event?.timestamp ||
    event?.logged_at ||
    null
  );
}

function eventStatus(event) {
  return String(
    event?.status ??
      event?.to_status ??
      event?.new_status ??
      event?.event ??
      "",
  ).toLowerCase();
}

function firstEventTime(events, statuses) {
  const wanted = new Set(statuses);
  for (const event of events || []) {
    if (wanted.has(eventStatus(event))) return eventTimestamp(event);
  }
  return null;
}

const LIFECYCLE_STAGES = [
  {
    key: "created",
    label: "Created",
    statuses: ["booked", "pending", "confirmed"],
    times: (s, events) =>
      s.created_at ||
      firstEventTime(events, ["booked", "pending", "confirmed"]),
  },
  {
    key: "pickup",
    label: "Pickup",
    statuses: [
      "awaiting_pickup",
      "pickup_requested",
      "pickup_assigned",
      "pickup_failed",
    ],
    times: (s, events) =>
      firstEventTime(events, [
        "awaiting_pickup",
        "pickup_requested",
        "pickup_assigned",
        "picked_up",
      ]) ||
      s.pickup_assigned_at ||
      s.picked_up_at,
  },
  {
    key: "origin",
    label: "At origin",
    statuses: [
      "picked_up",
      "received_at_origin_sub_branch",
      "received_at_origin_branch",
      "received_at_origin",
      "sorted_for_delivery",
      "sorted_for_transfer",
    ],
    times: (s, events) =>
      firstEventTime(events, [
        "picked_up",
        "received_at_origin_sub_branch",
        "received_at_origin_branch",
        "received_at_origin",
        "sorted_for_delivery",
        "sorted_for_transfer",
      ]) || s.picked_up_at,
  },
  {
    key: "transfer",
    label: "Transfer",
    transferOnly: true,
    statuses: [
      "in_transit",
      "received_at_transit_hub",
      "dispatched_to_destination_branch",
    ],
    times: (s, events) =>
      firstEventTime(events, [
        "in_transit",
        "received_at_transit_hub",
        "dispatched_to_destination_branch",
        "sorted_for_transfer",
      ]) || s.dispatched_at,
  },
  {
    key: "destination",
    label: "At destination",
    statuses: [
      "received_at_destination_branch",
      "received_at_destination_sub_branch",
      "received_at_destination",
      "assigned_to_rider",
    ],
    times: (s, events) =>
      firstEventTime(events, [
        "received_at_destination_branch",
        "received_at_destination_sub_branch",
        "received_at_destination",
        "assigned_to_rider",
      ]) ||
      s.received_at_destination_at ||
      s.sorted_for_delivery_at,
  },
  {
    key: "ofd",
    label: "Out for delivery",
    statuses: ["out_for_delivery"],
    times: (s, events) =>
      firstEventTime(events, ["out_for_delivery", "assigned_to_rider"]) ||
      s.dispatched_at,
  },
  {
    key: "end",
    label: "Delivered",
    statuses: [
      "delivered",
      "delivery_failed",
      "failed",
      "cancelled",
      "return_initiated",
      "returned_to_origin",
      "returned_to_merchant",
    ],
    times: (s, events) =>
      s.delivered_at ||
      s.cancelled_at ||
      s.returned_to_merchant_at ||
      s.returned_to_origin_at ||
      s.return_initiated_at ||
      firstEventTime(events, [
        "delivered",
        "delivery_failed",
        "failed",
        "cancelled",
        "return_initiated",
        "returned_to_origin",
        "returned_to_merchant",
      ]),
  },
];

function buildLifecycle(shipment, events, isTransfer) {
  const status = String(shipment?.status || "").toLowerCase();
  const stages = LIFECYCLE_STAGES.filter(
    (stage) => !stage.transferOnly || isTransfer,
  );
  const indexOfStatus = (value) =>
    stages.findIndex((stage) => stage.statuses.includes(value));
  let current = indexOfStatus(status);
  if (current < 0) {
    if (status === "delivered") current = stages.length - 1;
    else current = 0;
  }

  const isTerminalFailed = ["failed", "delivery_failed", "cancelled"].includes(
    status,
  );

  return stages.map((stage, index) => {
    const isDone =
      index < current || (index === current && status === "delivered");
    const isCurrent = index === current && status !== "delivered";
    const isFailed = isCurrent && isTerminalFailed;
    const timeRaw = stage.times(shipment, events);
    const timeFormatted = timeRaw
      ? formatKathmandu(timeRaw, stage.key === "created" || stage.key === "end")
      : null;

    let dynamicLabel = stage.label;
    if (stage.key === "end") {
      if (status === "cancelled") dynamicLabel = "Cancelled";
      else if (
        [
          "return_initiated",
          "returned_to_origin",
          "returned_to_merchant",
        ].includes(status)
      ) {
        dynamicLabel = "Returned";
      } else if (status === "delivery_failed" || status === "failed") {
        dynamicLabel = "Failed";
      }
    }

    return {
      key: stage.key,
      label: dynamicLabel,
      done: isDone,
      current: isCurrent,
      failed: isFailed,
      time: timeFormatted,
    };
  });
}

function collectProofs(shipment) {
  if (!shipment) return [];
  const list = [];
  const add = (url, label) => {
    if (url && typeof url === "string" && url.trim()) {
      list.push({ url: url.trim(), label });
    }
  };
  add(shipment.delivery_proof_url, "Delivery proof");
  add(shipment.pod_image_url, "POD photo");
  add(shipment.signature_url, "Signature");
  add(shipment.pickup_proof_url, "Pickup proof");
  add(shipment.receiver_signature_url, "Receiver signature");
  return list;
}

function SectionCard({ title, icon, children, extra, style }) {
  return (
    <Card
      size="small"
      title={
        <Space size={8}>
          {icon}
          <span style={{ fontWeight: 600 }}>{title}</span>
        </Space>
      }
      extra={extra}
      styles={{ body: { paddingTop: 12 } }}
      style={{ marginBottom: 0, ...style }}
    >
      {children}
    </Card>
  );
}

function FieldDescriptions({ items, column = 1 }) {
  const visible = items.filter(
    (item) => item.show !== false && hasText(item.value),
  );
  if (!visible.length) return null;
  return (
    <Descriptions bordered size="small" column={column}>
      {visible.map((item) => (
        <Descriptions.Item key={item.label} label={item.label}>
          {item.value}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export default function ShipmentDetailDrawer({ open, shipmentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = viewportWidth < 768;

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [merchantReturnModalOpen, setMerchantReturnModalOpen] = useState(false);
  const [merchantReturnRecipient, setMerchantReturnRecipient] = useState("");
  const [merchantReturnRemarks, setMerchantReturnRemarks] = useState("");
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const printLabel = () => {
    const id = shipment?.id ?? shipmentId;
    if (id && typeof window !== "undefined") {
      window.open(`/admin/shipments/${id}/print`, "_blank", "noopener");
    }
  };

  const load = useCallback(async () => {
    if (!shipmentId) return;
    try {
      setLoading(true);
      const response = await getAdminShipment(shipmentId);
      setData(normalizeShipmentDetailResponse(response));
    } catch (error) {
      console.error("Could not load shipment:", error);
      message.error(
        error?.response?.data?.message ?? "Could not load shipment.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    if (!open || !shipmentId) return;
    load();
  }, [open, shipmentId, load]);

  const runAction = async (fn, successMessage) => {
    try {
      setActionLoading(true);
      await fn();
      message.success(successMessage);
      await load();
    } catch (error) {
      console.error("Workflow action failed:", error);
      message.error(
        error?.response?.data?.message ?? "Workflow action failed.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      message.error("Please enter a cancellation reason.");
      return;
    }
    await runAction(
      () =>
        cancelShipment(shipment.id, {
          remarks: cancelReason.trim(),
          reason: cancelReason.trim(),
        }),
      "Shipment cancelled successfully.",
    );
    setCancelModalOpen(false);
    setCancelReason("");
  };

  const handleReturnSubmit = async () => {
    if (!returnReason.trim()) {
      message.error("Please enter a reason for initiating return.");
      return;
    }
    await runAction(
      () =>
        initiateShipmentReturn(shipment.id, { reason: returnReason.trim() }),
      "Return initiated successfully.",
    );
    setReturnModalOpen(false);
    setReturnReason("");
  };

  const handleMerchantReturnSubmit = async () => {
    await runAction(
      () =>
        markShipmentReturnedToMerchant(shipment.id, {
          receiver_name: merchantReturnRecipient.trim(),
          remarks: merchantReturnRemarks.trim(),
        }),
      "Shipment marked as returned to merchant.",
    );
    setMerchantReturnModalOpen(false);
    setMerchantReturnRecipient("");
    setMerchantReturnRemarks("");
  };

  // Support { data: {...} }, { shipment: {...} }, or flat model
  const shipment = data?.shipment ?? data?.data ?? (data?.id ? data : null);
  const status = shipment?.status;
  const isTerminal = [
    "delivered",
    "cancelled",
    "returned_to_merchant",
  ].includes(status);
  const isReturning = ["return_initiated", "returned_to_origin"].includes(
    status,
  );
  const canInitiateReturn =
    shipment &&
    !isTerminal &&
    !isReturning &&
    [
      "picked_up",
      "received_at_origin_branch",
      "received_at_origin_sub_branch",
      "received_at_origin",
      "sorted_for_transfer",
      "sorted_for_delivery",
      "in_transit",
      "dispatched_to_destination_branch",
      "received_at_transit_hub",
      "received_at_destination_branch",
      "received_at_destination_sub_branch",
      "received_at_destination",
      "out_for_delivery",
      "assigned_to_rider",
      "delivery_failed",
      "failed",
    ].includes(status);
  const canCancel = shipment && !isTerminal && status !== "delivered";

  const copyTracking = async () => {
    const value = shipment?.tracking_number;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      message.success(`Copied ${value}`);
    } catch {
      message.info(value);
    }
  };

  const view = useMemo(() => {
    if (!shipment) return null;

    const pickupLocation =
      shipment.pickup_location ?? shipment.pickupLocation ?? null;
    const merchant = shipment.merchant ?? null;
    const hop = shipment.hop_meta ?? shipment.hopMeta ?? data?.hop_meta ?? null;

    const originBranch =
      shipment.origin_branch ?? shipment.originBranch ?? null;
    const destinationBranch =
      shipment.destination_branch ?? shipment.destinationBranch ?? null;
    const currentBranch =
      shipment.current_branch ?? shipment.currentBranch ?? null;
    const originSub =
      shipment.origin_sub_branch ?? shipment.originSubBranch ?? null;
    const destinationSub =
      shipment.destination_sub_branch ?? shipment.destinationSubBranch ?? null;
    const currentSub =
      shipment.current_sub_branch ?? shipment.currentSubBranch ?? null;
    const nextHopBranch =
      shipment.next_hop_branch ?? shipment.nextHopBranch ?? null;

    const pathText = firstValue(hop?.path_text, shipment.path_text);
    let pathOrigin = null;
    let pathDestination = null;
    const viaNames = [];
    if (pathText && typeof pathText === "string") {
      const parts = pathText
        .split("→")
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 1) pathOrigin = parts[0];
      if (parts.length >= 2) pathDestination = parts[parts.length - 1];
      if (parts.length > 2) viaNames.push(...parts.slice(1, -1));
    }

    const breakdown = parseJsonField(
      shipment.delivery_charge_breakdown ?? shipment.deliveryChargeBreakdown,
    );
    const breakdownOrigin = breakdown?.pickup_branch?.name ?? null;
    const breakdownDest = breakdown?.delivery_branch?.name ?? null;

    const originName = firstValue(
      originBranch?.name,
      originBranch?.legal_name,
      originBranch?.branch_name,
      shipment.origin_branch_name,
      hop?.origin_name,
      pathOrigin,
      breakdownOrigin,
    );
    const originId = shipment.origin_branch_id ?? originBranch?.id ?? null;
    const originLabel = originName
      ? originBranch?.area
        ? `${originName}, ${originBranch.area}`
        : originName
      : originId
        ? `Branch #${originId}`
        : null;
    const originRibbon =
      originName || originId ? (
        <BranchRibbonTag name={originName} id={originId} color="blue" />
      ) : null;

    const destinationId =
      shipment.destination_branch_id ?? destinationBranch?.id ?? null;
    const isSameBranchShipment = Boolean(
      originId && destinationId && String(originId) === String(destinationId),
    );

    const destinationName = isSameBranchShipment
      ? firstValue(
          destinationBranch?.name,
          destinationBranch?.legal_name,
          destinationBranch?.branch_name,
          shipment.destination_branch_name,
          originName,
        )
      : firstValue(
          destinationBranch?.name,
          destinationBranch?.legal_name,
          destinationBranch?.branch_name,
          shipment.destination_branch_name,
          hop?.destination_name,
          pathDestination,
          breakdownDest,
        );
    const destinationLabel = destinationName
      ? destinationBranch?.area
        ? `${destinationName}, ${destinationBranch.area}`
        : destinationName
      : destinationId
        ? `Branch #${destinationId}`
        : null;
    const destinationRibbon =
      destinationName || destinationId ? (
        <BranchRibbonTag
          name={destinationName}
          id={destinationId}
          color="geekblue"
        />
      ) : null;

    const currentName = firstValue(
      currentBranch?.name,
      currentBranch?.legal_name,
      currentBranch?.branch_name,
      shipment.current_branch_name,
      hop?.current_name,
      hop?.current_branch_name,
      isSameBranchShipment ? originName : null,
    );
    const currentId =
      shipment.current_branch_id ??
      currentBranch?.id ??
      (isSameBranchShipment ? originId : null);
    const currentLabel = currentName
      ? currentBranch?.area
        ? `${currentName}, ${currentBranch.area}`
        : currentName
      : currentId
        ? `Branch #${currentId}`
        : null;
    const currentRibbon =
      currentName || currentId ? (
        <BranchRibbonTag name={currentName} id={currentId} color="cyan" />
      ) : null;

    const nextHopName = firstValue(
      nextHopBranch?.name,
      nextHopBranch?.legal_name,
      shipment.next_hop_branch_name,
      hop?.next_hop_name,
    );
    const nextHopId = shipment.next_hop_branch_id ?? nextHopBranch?.id ?? null;
    const nextHopLabel = nextHopName
      ? nextHopBranch?.area
        ? `${nextHopName}, ${nextHopBranch.area}`
        : nextHopName
      : nextHopId
        ? `Branch #${nextHopId}`
        : null;
    const nextHopRibbon =
      nextHopName || nextHopId ? (
        <BranchRibbonTag name={nextHopName} id={nextHopId} color="orange" />
      ) : null;

    const originSubName = firstValue(
      originSub?.name,
      originSub?.legal_name,
      shipment.origin_sub_branch_name,
    );
    const originSubId = shipment.origin_sub_branch_id ?? originSub?.id ?? null;
    const originSubLabel =
      originSubName || (originSubId ? `Branch #${originSubId}` : null);
    const originSubRibbon =
      originSubName || originSubId ? (
        <BranchRibbonTag name={originSubName} id={originSubId} color="purple" />
      ) : null;

    const destinationSubName = firstValue(
      destinationSub?.name,
      destinationSub?.legal_name,
      shipment.destination_sub_branch_name,
    );
    const destinationSubId =
      shipment.destination_sub_branch_id ?? destinationSub?.id ?? null;
    const destinationSubLabel =
      destinationSubName ||
      (destinationSubId ? `Branch #${destinationSubId}` : null);
    const destinationSubRibbon =
      destinationSubName || destinationSubId ? (
        <BranchRibbonTag
          name={destinationSubName}
          id={destinationSubId}
          color="purple"
        />
      ) : null;

    const currentSubName = firstValue(
      currentSub?.name,
      currentSub?.legal_name,
      shipment.current_sub_branch_name,
    );
    const currentSubId =
      shipment.current_sub_branch_id ?? currentSub?.id ?? null;
    const currentSubLabel =
      currentSubName || (currentSubId ? `Branch #${currentSubId}` : null);
    const currentSubRibbon =
      currentSubName || currentSubId ? (
        <BranchRibbonTag
          name={currentSubName}
          id={currentSubId}
          color="purple"
        />
      ) : null;

    // Parties resolution
    const merchantName = firstValue(
      merchant?.name,
      merchant?.business_name,
      merchant?.store_name,
      shipment.merchant_name,
    );
    const pickupLocationName = firstValue(
      pickupLocation?.name,
      shipment.pickup_location_name,
    );
    const senderName = firstValue(
      pickupLocation?.contact_person,
      merchant?.contact_person,
      merchant?.owner_name,
      merchant?.name,
      shipment.sender_name,
    );
    const senderPhone = firstValue(
      pickupLocation?.phone,
      merchant?.phone,
      shipment.sender_phone,
    );
    const senderEmail = firstValue(
      pickupLocation?.email,
      merchant?.email,
      shipment.sender_email,
    );
    const senderAddress = firstValue(
      pickupLocation?.address,
      merchant?.pickup_address,
      merchant?.address,
      shipment.sender_address,
    );
    const senderCity = firstValue(
      pickupLocation?.city,
      merchant?.pickup_city,
      merchant?.city,
      shipment.sender_city,
    );
    const senderArea = firstValue(
      pickupLocation?.area,
      merchant?.pickup_area,
      merchant?.area,
      shipment.sender_area,
    );

    const hasSenderBlock = [
      senderName,
      senderPhone,
      senderEmail,
      senderAddress,
      senderCity,
      senderArea,
      merchantName,
      pickupLocationName,
    ].some(hasText);

    const pickupLat = firstValue(
      shipment.pickup_lat,
      shipment.pickup_latitude,
      pickupLocation?.latitude,
      pickupLocation?.lat,
    );
    const pickupLng = firstValue(
      shipment.pickup_lng,
      shipment.pickup_longitude,
      pickupLocation?.longitude,
      pickupLocation?.lng,
    );
    const deliveryLat = firstValue(
      shipment.delivery_lat,
      shipment.delivery_latitude,
      shipment.receiver_latitude,
    );
    const deliveryLng = firstValue(
      shipment.delivery_lng,
      shipment.delivery_longitude,
      shipment.receiver_longitude,
    );

    const trackingEvents = Array.isArray(
      data?.tracking_events ??
        shipment.tracking_events ??
        shipment.trackingEvents,
    )
      ? (data?.tracking_events ??
        shipment.tracking_events ??
        shipment.trackingEvents)
      : [];
    const tasks = Array.isArray(data?.tasks ?? shipment.tasks)
      ? (data?.tasks ?? shipment.tasks)
      : [];
    const statusLogs = Array.isArray(data?.status_logs ?? shipment.status_logs)
      ? (data?.status_logs ?? shipment.status_logs)
      : [];
    const notifications = Array.isArray(
      data?.notifications ?? shipment.notifications,
    )
      ? (data?.notifications ?? shipment.notifications)
      : [];
    const routeSteps = Array.isArray(
      shipment.route_steps ?? shipment.routeSteps,
    )
      ? (shipment.route_steps ?? shipment.routeSteps)
      : [];

    const rawBreakdown = parseJsonField(
      data?.price_breakdown ??
        shipment.price_breakdown ??
        shipment.priceBreakdown ??
        data?.delivery_charge_breakdown ??
        shipment.delivery_charge_breakdown ??
        shipment.deliveryChargeBreakdown ??
        null,
    );

    let priceBreakdown = null;
    if (rawBreakdown && typeof rawBreakdown === "object") {
      const b = rawBreakdown.breakdown ?? rawBreakdown;
      const routeBase =
        rawBreakdown.route_base_rate ??
        rawBreakdown.base_delivery_fee ??
        b?.route_base_rate?.total ??
        b?.route_base_rate?.amount ??
        rawBreakdown.route?.base_rate ??
        shipment.route_fee ??
        0;
      const extraDist =
        rawBreakdown.delivery_extra_charge ??
        b?.extra_delivery_distance?.total ??
        rawBreakdown.distance?.charge ??
        rawBreakdown.distance_fee ??
        shipment.last_mile_fee ??
        0;
      const extraKm =
        rawBreakdown.extra_distance_km ??
        b?.extra_delivery_distance?.extra_distance_km ??
        rawBreakdown.distance?.extra_distance_km ??
        0;
      let weightChg =
        rawBreakdown.weight_charge ??
        b?.additional_weight?.total ??
        rawBreakdown.weight_summary?.total_weight_charge ??
        rawBreakdown.weight?.charge ??
        rawBreakdown.weight_fee ??
        shipment.weight_fee ??
        0;
      const finalPrice =
        rawBreakdown.final_price ??
        b?.final_price ??
        shipment.delivery_charge ??
        shipment.delivery_fee ??
        0;

      if (
        Number(weightChg) <= 0 &&
        Number(finalPrice) > Number(routeBase) + Number(extraDist)
      ) {
        weightChg =
          Math.round(
            (Number(finalPrice) - (Number(routeBase) + Number(extraDist))) *
              100,
          ) / 100;
      }

      priceBreakdown = {
        ...rawBreakdown,
        route_base_rate: Number(routeBase),
        delivery_extra_charge: Number(extraDist),
        extra_distance_km: Number(extraKm),
        weight_charge: Number(weightChg),
        final_price: Number(finalPrice),
      };
    }

    const deliveryTotal = Number(
      shipment.delivery_charge ?? shipment.delivery_fee ?? 0,
    );
    const routeFeeVal = Number(
      shipment.route_fee ?? priceBreakdown?.route_base_rate ?? 0,
    );
    const lastMileVal = Number(
      shipment.last_mile_fee ?? priceBreakdown?.delivery_extra_charge ?? 0,
    );
    let resolvedWeightFee = Number(
      shipment.weight_fee ?? priceBreakdown?.weight_charge ?? 0,
    );
    if (
      (!resolvedWeightFee || resolvedWeightFee === 0) &&
      deliveryTotal > routeFeeVal + lastMileVal
    ) {
      resolvedWeightFee =
        Math.round((deliveryTotal - (routeFeeVal + lastMileVal)) * 100) / 100;
    }

    const feeFromShipment = {
      pickup_fee: moneyValue(shipment.pickup_fee),
      route_fee: moneyValue(
        shipment.route_fee ?? (routeFeeVal > 0 ? routeFeeVal : null),
      ),
      last_mile_fee: moneyValue(
        shipment.last_mile_fee ?? (lastMileVal > 0 ? lastMileVal : null),
      ),
      weight_fee: moneyValue(
        resolvedWeightFee > 0 ? resolvedWeightFee : shipment.weight_fee,
      ),
      pod_charge: moneyValue(shipment.pod_charge),
      delivery_charge: moneyValue(
        shipment.delivery_charge,
        shipment.delivery_fee,
      ),
    };
    const hasFeeColumns = Object.values(feeFromShipment).some(
      (v) => v !== null && v !== 0,
    );

    let packetProducts = shipment.packet_products ?? shipment.packetProducts;
    packetProducts = parseJsonField(packetProducts);
    if (!Array.isArray(packetProducts)) packetProducts = [];

    const isTransfer =
      shipment.is_transfer === true ||
      hop != null ||
      (shipment.origin_branch_id &&
        shipment.destination_branch_id &&
        Number(shipment.origin_branch_id) !==
          Number(shipment.destination_branch_id));

    // Distance metrics calculation
    const distanceData = (() => {
      const serverDist = data?.distance_data ?? shipment.distance_data ?? null;
      const customerCoords =
        hasText(deliveryLat) && hasText(deliveryLng)
          ? { lat: Number(deliveryLat), lng: Number(deliveryLng) }
          : null;
      const originBranchCoords =
        resolveBranchCoords(originSub) ??
        resolveBranchCoords(originBranch) ??
        (hasText(pickupLat) && hasText(pickupLng)
          ? { lat: Number(pickupLat), lng: Number(pickupLng) }
          : null);
      const destBranchCoords =
        resolveBranchCoords(destinationSub) ??
        resolveBranchCoords(destinationBranch);
      const currentCoords =
        resolveBranchCoords(currentSub) ??
        resolveBranchCoords(currentBranch) ??
        originBranchCoords;

      let originToCustomerDistance = null;
      if (
        shipment.route_distance_km &&
        Number(shipment.route_distance_km) > 0
      ) {
        originToCustomerDistance =
          Math.round(Number(shipment.route_distance_km) * 100) / 100;
      } else if (originBranchCoords && customerCoords) {
        originToCustomerDistance = haversineDistanceKm(
          originBranchCoords.lat,
          originBranchCoords.lng,
          customerCoords.lat,
          customerCoords.lng,
        );
      }

      const extraDistObj =
        priceBreakdown?.extra_delivery_distance ||
        priceBreakdown?.raw?.breakdown?.extra_delivery_distance ||
        priceBreakdown?.breakdown?.extra_delivery_distance ||
        priceBreakdown?.extra_distance;

      let destToCustomerDistance = null;
      if (
        serverDist?.destination_to_customer_km != null &&
        Number(serverDist.destination_to_customer_km) > 0
      ) {
        destToCustomerDistance =
          Math.round(Number(serverDist.destination_to_customer_km) * 100) / 100;
      } else if (
        extraDistObj?.delivery_distance_km != null &&
        Number(extraDistObj.delivery_distance_km) > 0
      ) {
        destToCustomerDistance =
          Math.round(Number(extraDistObj.delivery_distance_km) * 100) / 100;
      } else if (destBranchCoords && customerCoords) {
        destToCustomerDistance = haversineDistanceKm(
          destBranchCoords.lat,
          destBranchCoords.lng,
          customerCoords.lat,
          customerCoords.lng,
        );
      }

      const baseDistanceKm = Number(
        serverDist?.base_distance_km ??
          extraDistObj?.included_distance_km ??
          10.0,
      );

      let extraMileKm = 0;
      if (serverDist?.extra_mile_km != null) {
        extraMileKm = Math.round(Number(serverDist.extra_mile_km) * 100) / 100;
      } else if (
        extraDistObj?.extra_distance_km != null &&
        Number(extraDistObj.extra_distance_km) > 0
      ) {
        extraMileKm =
          Math.round(Number(extraDistObj.extra_distance_km) * 100) / 100;
      } else if (destToCustomerDistance != null) {
        extraMileKm = Math.max(
          0,
          Math.round((destToCustomerDistance - baseDistanceKm) * 100) / 100,
        );
      }

      let totalDist =
        originToCustomerDistance ?? moneyValue(shipment.route_distance_km);
      if (
        isSameBranchShipment &&
        (totalDist == null || totalDist > 20 || totalDist <= 0) &&
        originBranchCoords &&
        customerCoords
      ) {
        totalDist = haversineDistanceKm(
          originBranchCoords.lat,
          originBranchCoords.lng,
          customerCoords.lat,
          customerCoords.lng,
        );
      }
      totalDist = totalDist != null ? Math.round(totalDist * 100) / 100 : 0;

      const statusStr = String(shipment.status || "").toLowerCase();
      const isDelivered = statusStr === "delivered";
      const isAtDestBranch =
        [
          "received_at_destination",
          "received_at_destination_branch",
          "received_at_destination_sub_branch",
          "assigned_to_rider",
          "out_for_delivery",
          "delivered",
        ].includes(statusStr) ||
        (shipment.current_branch_id &&
          shipment.destination_branch_id &&
          Number(shipment.current_branch_id) ===
            Number(shipment.destination_branch_id));

      let coveredDist = 0;
      let distFromDest = totalDist;
      let progressPct = 0;

      if (serverDist) {
        totalDist = Number(serverDist.total_distance_km ?? totalDist);
        coveredDist = Number(serverDist.covered_distance_km ?? 0);
        distFromDest = Number(
          serverDist.distance_from_destination_branch_km ?? 0,
        );
        progressPct = Number(serverDist.progress_percent ?? 0);
      } else if (isDelivered) {
        coveredDist = totalDist;
        distFromDest = 0;
        progressPct = 100;
      } else if (isAtDestBranch) {
        distFromDest = 0;
        coveredDist = totalDist * 0.9;
        progressPct = 90;
      } else {
        coveredDist = totalDist * 0.4;
        distFromDest = totalDist * 0.6;
        progressPct = 40;
      }

      return {
        totalDistanceKm: Math.round(totalDist * 100) / 100,
        originToCustomerKm: originToCustomerDistance,
        destinationToCustomerKm: destToCustomerDistance,
        baseDistanceKm,
        extraMileKm,
        coveredDistanceKm: Math.round(coveredDist * 100) / 100,
        distanceFromDestinationBranchKm: Math.round(distFromDest * 100) / 100,
        progressPercent: progressPct,
        isAtDestinationBranch: isAtDestBranch,
        isDelivered,
      };
    })();

    return {
      pickupLocation,
      merchant,
      hop,
      senderName,
      senderPhone,
      senderEmail,
      senderAddress,
      senderCity,
      senderArea,
      hasSenderBlock,
      merchantName,
      pickupLocationName,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      trackingEvents,
      tasks,
      statusLogs,
      notifications,
      routeSteps,
      priceBreakdown,
      feeFromShipment,
      hasFeeColumns,
      packetProducts,
      originLabel,
      destinationLabel,
      currentLabel,
      nextHopLabel,
      originSubLabel,
      destinationSubLabel,
      currentSubLabel,
      originRibbon,
      destinationRibbon,
      currentRibbon,
      nextHopRibbon,
      originSubRibbon,
      destinationSubRibbon,
      currentSubRibbon,
      isTransfer,
      pathText,
      viaNames,
      transferStageLabel:
        shipment.transfer_stage_label || shipment.transferStageLabel,
      distanceData,
    };
  }, [shipment, data]);

  // Financial & Pricing rules
  const rawDeliveryCharge = moneyValue(
    shipment?.delivery_charge,
    shipment?.delivery_fee,
  );
  const isPodShipment =
    String(
      shipment?.payment_type ?? shipment?.payment_method ?? "",
    ).toLowerCase() === "pod";
  const podAmount = moneyValue(shipment?.pod_amount);
  const totalCollectable = moneyValue(
    shipment?.total_collectable_amount,
    shipment?.total_collectable,
  );

  const paidBy = String(shipment?.delivery_charge_paid_by ?? "customer")
    .toLowerCase()
    .trim();
  const freeBy = String(shipment?.delivery_free_by ?? "none")
    .toLowerCase()
    .trim();

  const isFreeDeliveryByAdmin = freeBy === "marketplace" || freeBy === "admin";
  const isFreeDeliveryByStore = freeBy === "store" || freeBy === "merchant";
  const hasFreeDeliveryCoupon = isFreeDeliveryByAdmin || isFreeDeliveryByStore;

  const isPaidByMerchant =
    !isFreeDeliveryByAdmin &&
    (isFreeDeliveryByStore || ["merchant", "store", "seller"].includes(paidBy));
  const isPaidByAdmin =
    isFreeDeliveryByAdmin || paidBy === "admin" || paidBy === "marketplace";
  const isPaidByCustomer = !isPaidByMerchant && !isPaidByAdmin;

  const packetProductsTotal = useMemo(() => {
    const list = view?.packetProducts || [];
    if (!list.length) return null;
    let sum = 0;
    let hasValid = false;
    for (const item of list) {
      const qty = Number(item.quantity ?? 1) || 1;
      const unitPrice = moneyValue(item.unit_price, item.price);
      if (unitPrice != null && unitPrice > 0) {
        sum += qty * unitPrice;
        hasValid = true;
      }
    }
    return hasValid ? Math.round(sum * 100) / 100 : null;
  }, [view?.packetProducts]);

  const totalProductsWeight = useMemo(() => {
    const list = view?.packetProducts || [];
    if (!list.length) return null;
    let sum = 0;
    for (const item of list) {
      const qty = Number(item.quantity ?? 1) || 1;
      const unitWeight = Number(item.unit_weight ?? item.weight ?? 1.0) || 1.0;
      sum += qty * unitWeight;
    }
    return sum > 0 ? Math.round(sum * 100) / 100 : null;
  }, [view?.packetProducts]);

  const effectiveWeight = useMemo(() => {
    const stored = Number(shipment?.weight || 0);
    if (totalProductsWeight != null && totalProductsWeight > 0) {
      return stored > 0
        ? Math.max(stored, totalProductsWeight)
        : totalProductsWeight;
    }
    return stored > 0 ? stored : null;
  }, [shipment?.weight, totalProductsWeight]);

  const rawDeclaredValue = moneyValue(
    shipment?.declared_value,
    shipment?.merchandise_value,
    shipment?.items_subtotal,
  );

  const isDeclaredGrossTotal = Boolean(
    isPaidByCustomer &&
    (rawDeliveryCharge ?? 0) > 0 &&
    rawDeclaredValue != null &&
    ((totalCollectable != null &&
      Math.abs(rawDeclaredValue - totalCollectable) < 0.01) ||
      (podAmount != null && Math.abs(rawDeclaredValue - podAmount) < 0.01)),
  );

  const netDeclaredValue = isDeclaredGrossTotal
    ? Math.max(
        0,
        Math.round((rawDeclaredValue - (rawDeliveryCharge ?? 0)) * 100) / 100,
      )
    : rawDeclaredValue;

  const goodsValue =
    packetProductsTotal != null && packetProductsTotal > 0
      ? packetProductsTotal
      : netDeclaredValue != null
        ? netDeclaredValue
        : isPodShipment
          ? isPaidByCustomer &&
            (rawDeliveryCharge ?? 0) > 0 &&
            podAmount != null &&
            Math.abs(podAmount - (totalCollectable ?? podAmount)) < 0.01
            ? Math.max(
                0,
                Math.round((podAmount - rawDeliveryCharge) * 100) / 100,
              )
            : podAmount
          : null;

  const ruleCollectAmount = collectAmount(shipment);
  const collectableAmount =
    ruleCollectAmount > 0 ||
    !isPodShipment ||
    podAmount != null ||
    totalCollectable != null
      ? ruleCollectAmount
      : (goodsValue ?? 0) + (isPaidByCustomer ? (rawDeliveryCharge ?? 0) : 0);

  const deliveryCharge = useMemo(() => {
    if (
      isPaidByCustomer &&
      collectableAmount > 0 &&
      goodsValue != null &&
      goodsValue > 0
    ) {
      const impliedFee =
        Math.round((collectableAmount - goodsValue) * 100) / 100;
      if (impliedFee > 0) {
        return rawDeliveryCharge != null
          ? Math.max(rawDeliveryCharge, impliedFee)
          : impliedFee;
      }
    }
    return rawDeliveryCharge;
  }, [isPaidByCustomer, collectableAmount, goodsValue, rawDeliveryCharge]);

  const receiverPhone = firstValue(
    shipment?.receiver_phone,
    shipment?.customer_phone,
  );
  const receiverName = firstValue(
    shipment?.receiver_name,
    shipment?.customer_name,
  );
  const receiverAddress = firstValue(
    shipment?.receiver_address,
    shipment?.delivery_address,
  );
  const orderRef =
    shipment?.merchant_order_id ||
    shipment?.order_reference ||
    shipment?.external_order_id ||
    null;
  const lifecycle = view
    ? buildLifecycle(shipment, view.trackingEvents, view.isTransfer)
    : [];
  const proofs = view ? collectProofs(shipment) : [];

  const routeKm = formatKm(
    shipment?.route_distance_km ?? view?.distanceData?.totalDistanceKm,
  );
  const serviceType = shipment?.service_type
    ? String(shipment.service_type).replaceAll("_", " ")
    : null;
  const drawerTitle = shipment?.tracking_number || "Shipment details";
  const shipmentHref =
    shipment?.id || shipmentId
      ? `/admin/shipments/${shipment?.id ?? shipmentId}`
      : null;

  const paymentType = String(
    shipment?.payment_type ?? shipment?.payment_method ?? "",
  ).toLowerCase();
  const isPodChip = paymentType === "pod";

  const sessionStatus = firstValue(
    shipment?.payment_session_status,
    shipment?.pod_payment_status,
    shipment?.online_payment_status,
    shipment?.payment_status,
    isPodShipment ? shipment?.pod_status : null,
  );

  const paidByLabel = isPaidByMerchant
    ? isFreeDeliveryByStore
      ? "Merchant / Store (Free Delivery Coupon)"
      : "Merchant / Store"
    : isPaidByAdmin
      ? isFreeDeliveryByAdmin
        ? "Admin / Marketplace (Free Delivery Coupon)"
        : "Admin / Marketplace"
      : "Customer";

  const paidByTag = isFreeDeliveryByAdmin ? (
    <span
      className={styles.chip}
      style={{ background: "#f3e8ff", color: "#6b21a8" }}
    >
      Free · Marketplace
    </span>
  ) : isFreeDeliveryByStore ? (
    <span
      className={styles.chip}
      style={{ background: "#cffafe", color: "#0e7490" }}
    >
      Free · Store
    </span>
  ) : isPaidByMerchant ? (
    <span
      className={styles.chip}
      style={{ background: "#cffafe", color: "#0e7490" }}
    >
      Paid by merchant
    </span>
  ) : isPaidByAdmin ? (
    <span
      className={styles.chip}
      style={{ background: "#f3e8ff", color: "#6b21a8" }}
    >
      Paid by admin
    </span>
  ) : (
    <span className={`${styles.chip} ${styles.chipPod}`}>Paid by customer</span>
  );

  const collectTag = !isPodShipment ? (
    <span className={`${styles.chip} ${styles.chipPrepaid}`}>Prepaid</span>
  ) : isPaidByCustomer ? (
    <span className={`${styles.chip} ${styles.chipPod}`}>
      Products + Delivery
    </span>
  ) : (
    <span className={`${styles.chip} ${styles.chipPod}`}>Products only</span>
  );

  const goodsLabel =
    packetProductsTotal != null && packetProductsTotal > 0
      ? "Packet total"
      : isDeclaredGrossTotal
        ? "Excl. delivery"
        : netDeclaredValue != null
          ? "Declared value"
          : "Products";

  const activityItems = view
    ? [
        ...view.trackingEvents.map((event, index) => ({
          key: `evt-${event.id ?? index}`,
          time: eventTimestamp(event),
          status: eventStatus(event) || event.type,
          text:
            event.description ??
            event.note ??
            event.message ??
            labelForStatus(eventStatus(event) || event.type) ??
            "Update",
        })),
        ...view.statusLogs.map((log, index) => ({
          key: `log-${log.id ?? index}`,
          time: log.created_at || log.logged_at,
          status: log.status || log.to_status || log.new_status,
          text:
            log.remarks ||
            log.note ||
            log.message ||
            (log.status
              ? `Status: ${labelForStatus(log.status)}`
              : "Status update"),
        })),
      ]
        .filter((item) => item.text)
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
    : [];

  const statusAlerts = view && (
    <>
      {status === "cancelled" && (
        <Alert
          type="error"
          showIcon
          message="Shipment cancelled"
          description={
            <Space direction="vertical" size={2}>
              <Text>
                {shipment.cancellation_reason ||
                  "This shipment has been cancelled."}
              </Text>
              {shipment.cancelled_at && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Cancelled at: {formatKathmandu(shipment.cancelled_at)}
                </Text>
              )}
            </Space>
          }
        />
      )}

      {status === "return_initiated" && (
        <Alert
          type="warning"
          showIcon
          message="Return to origin in progress"
          description={
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Text>
                {shipment.return_reason
                  ? `Return reason: ${shipment.return_reason}`
                  : "This shipment is being returned to the origin hub."}
              </Text>
              {shipment.return_initiated_at && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Initiated at: {formatKathmandu(shipment.return_initiated_at)}
                </Text>
              )}
              <div>
                <Button
                  type="primary"
                  size="small"
                  icon={<RollbackOutlined />}
                  loading={actionLoading}
                  onClick={() =>
                    runAction(
                      () => markShipmentReturnedToOrigin(shipment.id),
                      "Shipment marked as received at origin hub.",
                    )
                  }
                >
                  Mark received at origin hub
                </Button>
              </div>
            </Space>
          }
        />
      )}

      {status === "returned_to_origin" && (
        <Alert
          type="info"
          showIcon
          message="Received at origin hub"
          description={
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              <Text>
                The parcel has arrived back at the origin hub and is ready for
                merchant handover.
              </Text>
              {shipment.returned_to_origin_at && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Received at: {formatKathmandu(shipment.returned_to_origin_at)}
                </Text>
              )}
              <div>
                <Button
                  type="primary"
                  size="small"
                  style={{ background: "#059669", borderColor: "#059669" }}
                  icon={<CheckCircleOutlined />}
                  onClick={() => setMerchantReturnModalOpen(true)}
                >
                  Hand over to merchant
                </Button>
              </div>
            </Space>
          }
        />
      )}

      {status === "returned_to_merchant" && (
        <Alert
          type="success"
          showIcon
          message="Returned to merchant"
          description={
            <Space direction="vertical" size={2}>
              <Text>
                Successfully returned to merchant
                {shipment.merchant_return_receiver
                  ? ` (Received by: ${shipment.merchant_return_receiver})`
                  : ""}
                .
              </Text>
              {shipment.returned_to_merchant_at && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Returned at:{" "}
                  {formatKathmandu(shipment.returned_to_merchant_at)}
                </Text>
              )}
            </Space>
          }
        />
      )}
    </>
  );

  /* -------------------------------------------------------------------------- */
  /* Header                                                                     */
  /* -------------------------------------------------------------------------- */

  const header = (
    <div className={styles.header}>
      <div className={styles.headerMain}>
        <div className={styles.trackingRow}>
          <span
            className={styles.tracking}
            title={shipment?.tracking_number || drawerTitle}
          >
            {shipment?.tracking_number || drawerTitle}
          </span>
          {shipment?.tracking_number ? (
            <Tooltip title="Copy tracking number">
              <button
                type="button"
                className={styles.copyBtn}
                onClick={copyTracking}
                aria-label="Copy tracking number"
              >
                <CopyOutlined />
              </button>
            </Tooltip>
          ) : null}
        </div>
        <div className={styles.chipRow}>
          <StatusChip status={shipment?.status} />
          {serviceType ? (
            <span
              className={`${styles.chip} ${shipment?.service_type === "express" ? styles.chipExpress : ""}`}
            >
              {serviceType}
            </span>
          ) : null}
          {view ? (
            <span
              className={`${styles.chip} ${view.isTransfer ? styles.chipTransfer : styles.chipLastMile}`}
            >
              {view.isTransfer
                ? `Transfer${view.transferStageLabel ? ` · ${view.transferStageLabel}` : ""}`
                : "Last-mile"}
            </span>
          ) : null}
          {orderRef ? (
            <span className={styles.orderRef} title={orderRef}>
              {orderRef}
            </span>
          ) : null}
        </div>
      </div>
      <div className={styles.headerActions}>
        {!isTerminal && !isReturning && shipment ? (
          <Tooltip title="Update location">
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setLocationModalOpen(true)}
              aria-label="Update location"
            >
              <AimOutlined />
            </button>
          </Tooltip>
        ) : null}
        {canInitiateReturn ? (
          <Tooltip title="Initiate return">
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              onClick={() => setReturnModalOpen(true)}
              aria-label="Initiate return"
            >
              <RollbackOutlined />
            </button>
          </Tooltip>
        ) : null}
        {status === "return_initiated" ? (
          <Tooltip title="Receive at origin">
            <Button
              type="primary"
              size="small"
              icon={<RollbackOutlined />}
              loading={actionLoading}
              onClick={() =>
                runAction(
                  () => markShipmentReturnedToOrigin(shipment.id),
                  "Shipment marked as received at origin hub.",
                )
              }
            />
          </Tooltip>
        ) : null}
        {status === "returned_to_origin" ? (
          <Tooltip title="Hand over to merchant">
            <Button
              type="primary"
              size="small"
              style={{ background: "#059669", borderColor: "#059669" }}
              icon={<CheckCircleOutlined />}
              loading={actionLoading}
              onClick={() => setMerchantReturnModalOpen(true)}
            />
          </Tooltip>
        ) : null}
        {canCancel ? (
          <Tooltip title="Cancel shipment">
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
              onClick={() => setCancelModalOpen(true)}
              aria-label="Cancel shipment"
            >
              <StopOutlined />
            </button>
          </Tooltip>
        ) : null}
        <Tooltip title="Print label">
          <button
            type="button"
            className={styles.iconBtn}
            onClick={printLabel}
            disabled={!shipment}
            aria-label="Print label"
          >
            <PrinterOutlined />
          </button>
        </Tooltip>
        {shipmentHref ? (
          <Tooltip title="Open full page">
            <a
              className={styles.iconBtn}
              href={shipmentHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open full page"
            >
              <ExpandAltOutlined />
            </a>
          </Tooltip>
        ) : null}
        {receiverPhone ? (
          <Tooltip title={`Call ${receiverName || "receiver"}`}>
            <a
              className={styles.iconBtn}
              href={`tel:${receiverPhone}`}
              aria-label="Call receiver"
            >
              <PhoneOutlined />
            </a>
          </Tooltip>
        ) : null}
        <Tooltip title="Refresh">
          <button
            type="button"
            className={styles.iconBtn}
            onClick={load}
            aria-label="Refresh"
          >
            <ReloadOutlined spin={loading} />
          </button>
        </Tooltip>
        <Tooltip title="Close">
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <CloseOutlined />
          </button>
        </Tooltip>
      </div>
    </div>
  );

  /* -------------------------------------------------------------------------- */
  /* Main Drawer View                                                           */
  /* -------------------------------------------------------------------------- */

  return (
    <Drawer
      open={!!open}
      onClose={onClose}
      placement="right"
      width={
        isMobile ? "100%" : Math.min(880, Math.max(viewportWidth - 24, 320))
      }
      style={{ maxWidth: "100vw" }}
      destroyOnClose
      maskClosable
      keyboard
      closable={false}
      title={null}
      rootClassName={styles.drawerRoot}
    >
      {header}

      {loading ? (
        <div className={styles.skeleton} style={{ padding: 12 }}>
          <Skeleton active title={{ width: "40%" }} paragraph={{ rows: 1 }} />
          <Skeleton active title={false} paragraph={{ rows: 2 }} />
          <div className={styles.grid}>
            <Skeleton active paragraph={{ rows: 5 }} />
            <Skeleton active paragraph={{ rows: 5 }} />
            <Skeleton active paragraph={{ rows: 5 }} />
            <Skeleton active paragraph={{ rows: 5 }} />
          </div>
        </div>
      ) : !shipment || !view ? (
        <div className={styles.empty}>
          <Empty description="Shipment not found" />
        </div>
      ) : (
        <div className={styles.body}>
          {statusAlerts}

          {/* Stepper Card */}
          {lifecycle.length > 0 && (
            <div
              className={styles.stepper}
              role="list"
              aria-label="Shipment lifecycle"
            >
              {lifecycle.map((step, index) => (
                <div
                  key={step.key}
                  role="listitem"
                  className={`${styles.step} ${step.done ? styles.stepDone : ""} ${step.current ? styles.stepCurrent : ""} ${step.failed ? styles.stepFailed : ""}`}
                >
                  <div className={styles.stepTrack}>
                    <span
                      className={
                        index > 0 && lifecycle[index - 1].done
                          ? styles.stepLineDone
                          : styles.stepLine
                      }
                    />
                    <span className={styles.stepDot} />
                    <span
                      className={
                        step.done ? styles.stepLineDone : styles.stepLine
                      }
                    />
                  </div>
                  <div className={styles.stepLabel}>{step.label}</div>
                  {step.time ? (
                    <div className={styles.stepTime}>{step.time}</div>
                  ) : (
                    <div className={styles.stepTime}>&nbsp;</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3-Column Combined Financial Card */}
          <div className={styles.moneyCard}>
            <div className={styles.moneyCell}>
              <div className={styles.moneyLabel}>
                PRODUCTS
                <span className={`${styles.chip} ${styles.chipLastMile}`}>
                  {goodsLabel}
                </span>
              </div>
              <div className={styles.moneyValue}>
                {goodsValue != null ? formatMoney(goodsValue) : "—"}
              </div>
              {sessionStatus ? (
                <div className={styles.moneySub}>
                  {isPodShipment ? "POD" : "Payment"} status:{" "}
                  {labelForStatus(sessionStatus)}
                </div>
              ) : (
                <div className={styles.moneySub}>
                  {shipment.merchant_status
                    ? `Merchant: ${labelForStatus(shipment.merchant_status)}`
                    : "\u00a0"}
                </div>
              )}
            </div>
            <div className={styles.moneyCell}>
              <div className={styles.moneyLabel}>
                DELIVERY CHARGE
                {paidByTag}
              </div>
              <div className={styles.moneyValue}>
                {deliveryCharge != null ? formatMoney(deliveryCharge) : "—"}
              </div>
              <div className={styles.moneySub}>{paidByLabel}</div>
            </div>
            <div className={styles.moneyMain}>
              <div className={styles.moneyLabel}>
                COLLECT FROM CUSTOMER
                {collectTag}
              </div>
              <div
                className={
                  collectableAmount > 0
                    ? styles.moneyValue
                    : `${styles.moneyValue} ${styles.moneyValueMuted}`
                }
              >
                {formatMoney(collectableAmount ?? 0)}
              </div>
              <div className={styles.moneySub}>
                {isPodChip
                  ? "POD total — same rule as the shipments list"
                  : "Nothing to collect at the door"}
                {paymentType &&
                paymentType !== "pod" &&
                paymentType !== "prepaid"
                  ? ` · ${paymentType.replaceAll("_", " ")}`
                  : ""}
              </div>
            </div>
          </div>

          {/* 2-Column Grid Row 1: Sender / Merchant & Receiver */}
          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <span>
                  <ShopOutlined /> SENDER / MERCHANT
                </span>
              </div>
              <InfoRow label="Merchant">
                {view.merchantName ? (
                  <span className={styles.name}>{view.merchantName}</span>
                ) : null}
              </InfoRow>
              <InfoRow label="Pickup">{view.pickupLocationName}</InfoRow>
              <InfoRow label="Contact">{view.senderName}</InfoRow>
              <InfoRow label="Phone">
                {view.senderPhone ? (
                  <PhoneLink phone={view.senderPhone} />
                ) : null}
              </InfoRow>
              <InfoRow label="Email">{view.senderEmail}</InfoRow>
              <InfoRow label="Address" wrap>
                {view.senderAddress}
              </InfoRow>
              <InfoRow label="Area">
                {[view.senderArea, view.senderCity]
                  .filter(Boolean)
                  .join(", ") || null}
              </InfoRow>
              <InfoRow label="Coords">
                {coordinateLabel(view.pickupLat, view.pickupLng)}
              </InfoRow>
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <span>
                  <UserOutlined /> RECEIVER
                </span>
                {receiverPhone ? (
                  <a className={styles.phone} href={`tel:${receiverPhone}`}>
                    CALL
                  </a>
                ) : null}
              </div>
              <InfoRow label="Name">
                {receiverName ? (
                  <span className={styles.name}>{receiverName}</span>
                ) : null}
              </InfoRow>
              <InfoRow label="Phone">
                {receiverPhone ? <PhoneLink phone={receiverPhone} /> : null}
              </InfoRow>
              <InfoRow label="Address" wrap>
                {receiverAddress}
              </InfoRow>
              <InfoRow label="Coords">
                {coordinateLabel(view.deliveryLat, view.deliveryLng)}
              </InfoRow>
              {!isTerminal && !isReturning ? (
                <div style={{ marginTop: 8 }}>
                  <Button
                    size="small"
                    icon={<AimOutlined />}
                    onClick={() => setLocationModalOpen(true)}
                  >
                    Update location
                  </Button>
                </div>
              ) : null}
            </section>
          </div>

          {/* 2-Column Grid Row 2: Route & Parcel */}
          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <span>
                  <EnvironmentOutlined /> ROUTE
                </span>
                {routeKm ? (
                  <span className={styles.muted}>{routeKm.toUpperCase()}</span>
                ) : null}
              </div>
              <div className={styles.routeFlow}>
                <span
                  className={styles.routeNode}
                  title={view.originLabel || "Origin"}
                >
                  {view.originLabel || "Origin"}
                </span>
                <ArrowRightOutlined className={styles.routeArrow} />
                {view.currentLabel ? (
                  <>
                    <span
                      className={`${styles.routeNode} ${styles.routeNodeCurrent}`}
                      title={`At ${view.currentLabel}`}
                    >
                      At {view.currentLabel}
                    </span>
                    <ArrowRightOutlined className={styles.routeArrow} />
                  </>
                ) : null}
                {view.nextHopLabel ? (
                  <>
                    <span
                      className={styles.routeNode}
                      title={`Next ${view.nextHopLabel}`}
                    >
                      Next {view.nextHopLabel}
                    </span>
                    <ArrowRightOutlined className={styles.routeArrow} />
                  </>
                ) : null}
                <span
                  className={styles.routeNode}
                  title={view.destinationLabel || "Destination"}
                >
                  {view.destinationLabel || "Destination"}
                </span>
              </div>
              <InfoRow label="Origin">
                {view.originRibbon || view.originLabel}
              </InfoRow>
              <InfoRow label="Current">
                {view.currentRibbon || view.currentLabel}
              </InfoRow>
              <InfoRow label="Destination">
                {view.destinationRibbon || view.destinationLabel}
              </InfoRow>
              <InfoRow label="Distance">{routeKm}</InfoRow>
              <InfoRow label="Path" wrap>
                {view.pathText}
              </InfoRow>
              {view.nextHopLabel && (
                <InfoRow label="Next hop">
                  {view.nextHopRibbon || view.nextHopLabel}
                </InfoRow>
              )}
              {view.originSubLabel ||
              view.destinationSubLabel ||
              view.currentSubLabel ? (
                <InfoRow label="Sub-branch">
                  {[
                    view.originSubLabel && `Origin: ${view.originSubLabel}`,
                    view.currentSubLabel && `At: ${view.currentSubLabel}`,
                    view.destinationSubLabel &&
                      `Dest: ${view.destinationSubLabel}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || null}
                </InfoRow>
              ) : null}
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <span>
                  <FileTextOutlined /> PARCEL
                </span>
                {shipment.fragile ? (
                  <span className={`${styles.chip} ${styles.chipTransfer}`}>
                    Fragile
                  </span>
                ) : null}
              </div>
              <InfoRow label="Service">{serviceType}</InfoRow>
              <InfoRow label="Type">
                {shipment.parcel_type || shipment.package_type}
              </InfoRow>
              <InfoRow label="Weight">
                {effectiveWeight != null
                  ? `${effectiveWeight} kg`
                  : shipment.weight != null
                    ? `${shipment.weight} kg`
                    : null}
              </InfoRow>
              <InfoRow label="Actual">
                {shipment.actual_weight != null &&
                Number(shipment.actual_weight) > 0
                  ? `${shipment.actual_weight} kg`
                  : null}
              </InfoRow>
              <InfoRow label="Chargeable">
                {shipment.chargeable_weight != null &&
                Number(shipment.chargeable_weight) > 0
                  ? `${shipment.chargeable_weight} kg`
                  : null}
              </InfoRow>
              <InfoRow label="Qty">
                {shipment.quantity != null ? String(shipment.quantity) : null}
              </InfoRow>
              <InfoRow label="Value">
                {goodsValue != null ? formatMoney(goodsValue) : null}
              </InfoRow>
              <InfoRow label="Details" wrap>
                {shipment.description || shipment.package_description}
              </InfoRow>
              <InfoRow label="Remarks" wrap>
                {shipment.remarks}
              </InfoRow>
              <InfoRow label="Instructions" wrap>
                {shipment.special_instructions}
              </InfoRow>
            </section>
          </div>

          {/* Full Width Transfer Hops */}
          <ShipmentTransferHops
            shipmentId={shipment.id ?? shipmentId}
            compact
          />

          {/* Workflow Action Buttons for Branch Staff */}
          <ShipmentWorkflowActions
            shipment={shipment}
            loading={actionLoading}
            onReceiveOrigin={() =>
              runAction(
                () => receiveOriginSubBranch(shipment.id),
                "Received at origin sub-branch.",
              )
            }
            onDispatchNext={() =>
              runAction(
                () => dispatchNextRouteStep(shipment.id),
                "Next route step dispatched.",
              )
            }
            onReceiveCurrent={() =>
              runAction(
                () => receiveCurrentRouteStep(shipment.id),
                "Current route step received.",
              )
            }
          />

          {/* Packet Products (if available) */}
          {view.packetProducts.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <span>
                  <ShopOutlined /> Packet products
                </span>
                {packetProductsTotal != null ? (
                  <span className={styles.muted}>
                    {formatMoney(packetProductsTotal)}
                  </span>
                ) : null}
              </div>
              <Table
                size="small"
                pagination={false}
                rowKey={(row, index) =>
                  row.id ?? row.product_tracking_number ?? index
                }
                dataSource={view.packetProducts}
                scroll={{ x: 560 }}
                columns={[
                  {
                    title: "Name",
                    dataIndex: "name",
                    render: (v, row) => v || row.product_name || "—",
                  },
                  {
                    title: "Qty",
                    dataIndex: "quantity",
                    width: 64,
                    render: (v) => v ?? 1,
                  },
                  {
                    title: "Unit price",
                    key: "unit_price",
                    width: 110,
                    render: (_, row) => {
                      const p = moneyValue(row.unit_price, row.price);
                      return p != null ? formatMoney(p) : "—";
                    },
                  },
                  {
                    title: "Total",
                    key: "total_price",
                    width: 110,
                    render: (_, row) => {
                      const q = Number(row.quantity ?? 1) || 1;
                      const p = moneyValue(row.unit_price, row.price);
                      return p != null ? formatMoney(q * p) : "—";
                    },
                  },
                  {
                    title: "Tracking",
                    dataIndex: "product_tracking_number",
                    render: (v) => v || "—",
                  },
                ]}
                summary={() => {
                  if (packetProductsTotal == null) return null;
                  return (
                    <Table.Summary.Row
                      style={{ background: "#FAFAFA", fontWeight: 600 }}
                    >
                      <Table.Summary.Cell
                        index={0}
                        colSpan={3}
                        style={{ textAlign: "right" }}
                      >
                        Packet products total:
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <Text strong style={{ color: "#059669" }}>
                          {formatMoney(packetProductsTotal)}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} />
                    </Table.Summary.Row>
                  );
                }}
              />
            </section>
          )}

          {/* Proofs (if available) */}
          {proofs.length > 0 && (
            <section className={styles.card}>
              <div className={styles.cardTitle}>
                <span>
                  <FileTextOutlined /> Proofs
                </span>
              </div>
              <div className={styles.proofs}>
                <Image.PreviewGroup>
                  {proofs.map((proof) => (
                    <Image
                      key={proof.url}
                      src={proof.url}
                      alt={proof.label}
                      width={72}
                      height={72}
                      className={styles.proof}
                      style={{ objectFit: "cover", borderRadius: 8 }}
                    />
                  ))}
                </Image.PreviewGroup>
              </div>
            </section>
          )}

          {/* Collapsible Details */}
          <div className={styles.details}>
            <Collapse
              bordered={false}
              defaultActiveKey={[]}
              items={[
                {
                  key: "activity",
                  label: `Activity${activityItems.length ? ` · ${activityItems.length}` : ""}`,
                  children: activityItems.length ? (
                    <div className={styles.activityList}>
                      {activityItems.map((item) => (
                        <div key={item.key} className={styles.activityItem}>
                          <span
                            className={styles.dot}
                            style={{
                              background: statusColor(item.status),
                              marginTop: 5,
                            }}
                          />
                          <div className={styles.activityText}>
                            <div>{item.text}</div>
                            {item.status ? (
                              <div className={styles.muted}>
                                {labelForStatus(item.status)}
                              </div>
                            ) : null}
                          </div>
                          <div className={styles.activityTime}>
                            {formatKathmandu(item.time) || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No activity recorded yet"
                    />
                  ),
                },
                view.tasks.length
                  ? {
                      key: "tasks",
                      label: `Tasks · ${view.tasks.length}`,
                      children: (
                        <Table
                          size="small"
                          rowKey="id"
                          dataSource={view.tasks}
                          pagination={false}
                          scroll={{ x: 600 }}
                          columns={[
                            {
                              title: "Task",
                              dataIndex: "task_number",
                              render: (v) => v || "—",
                            },
                            {
                              title: "Type",
                              dataIndex: "type",
                              render: (v) => v || "—",
                            },
                            {
                              title: "Status",
                              dataIndex: "status",
                              render: (v) => <WorkflowStatusTag status={v} />,
                            },
                            {
                              title: "Priority",
                              dataIndex: "priority",
                              render: (v) => v || "—",
                            },
                            {
                              title: "Due",
                              dataIndex: "due_at",
                              render: (v) => formatKathmandu(v) || "—",
                            },
                          ]}
                        />
                      ),
                    }
                  : null,
                view.notifications.length
                  ? {
                      key: "notifications",
                      label: `Notifications · ${view.notifications.length}`,
                      children: (
                        <Table
                          size="small"
                          rowKey={(row, index) => row.id ?? index}
                          dataSource={view.notifications}
                          pagination={false}
                          scroll={{ x: 560 }}
                          columns={[
                            {
                              title: "Title",
                              dataIndex: "title",
                              render: (v) => v || "—",
                            },
                            {
                              title: "Message",
                              dataIndex: "message",
                              render: (v) => v || "—",
                            },
                            {
                              title: "Type",
                              dataIndex: "type",
                              render: (v) => v || "—",
                            },
                            {
                              title: "Created",
                              dataIndex: "created_at",
                              render: (v) => formatKathmandu(v) || "—",
                            },
                          ]}
                        />
                      ),
                    }
                  : null,
                {
                  key: "pricing",
                  label: "Pricing breakdown",
                  children: (
                    <FieldDescriptions
                      column={2}
                      items={
                        view.priceBreakdown
                          ? [
                              {
                                label: "Route base rate",
                                value: formatMoney(
                                  view.priceBreakdown.route_base_rate ?? 0,
                                ),
                              },
                              {
                                label: "Extra distance charge",
                                show:
                                  Number(
                                    view.priceBreakdown.delivery_extra_charge ??
                                      0,
                                  ) > 0 ||
                                  Boolean(
                                    view.priceBreakdown.extra_distance_km,
                                  ),
                                value: `${formatMoney(view.priceBreakdown.delivery_extra_charge ?? 0)}${view.priceBreakdown.extra_distance_km ? ` (+${view.priceBreakdown.extra_distance_km} km)` : ""}`,
                              },
                              {
                                label: "Weight charge",
                                show:
                                  Number(
                                    view.priceBreakdown.weight_charge ?? 0,
                                  ) > 0,
                                value: formatMoney(
                                  view.priceBreakdown.weight_charge ?? 0,
                                ),
                              },
                              {
                                label: "Final price",
                                value: formatMoney(
                                  deliveryCharge ??
                                    view.priceBreakdown.final_price ??
                                    0,
                                ),
                              },
                              {
                                label: "Fee covered by",
                                value: paidByLabel,
                              },
                            ]
                          : [
                              {
                                label: "Route fee",
                                value:
                                  view.feeFromShipment.route_fee != null
                                    ? formatMoney(
                                        view.feeFromShipment.route_fee,
                                      )
                                    : null,
                              },
                              {
                                label: "Delivery charge",
                                value:
                                  deliveryCharge != null
                                    ? formatMoney(deliveryCharge)
                                    : null,
                              },
                              {
                                label: "Fee covered by",
                                value: paidByLabel,
                              },
                            ]
                      }
                    />
                  ),
                },
                {
                  key: "distances",
                  label: "Branch assignments & distances",
                  children: (
                    <FieldDescriptions
                      column={{ xs: 1, sm: 2 }}
                      items={[
                        {
                          label: "Origin",
                          value: view.originRibbon || view.originLabel,
                        },
                        {
                          label: "Destination",
                          value:
                            view.destinationRibbon || view.destinationLabel,
                        },
                        {
                          label: "Current branch",
                          value: view.currentRibbon || view.currentLabel,
                        },
                        {
                          label: "Next hop",
                          value: view.nextHopRibbon || view.nextHopLabel,
                        },
                        {
                          label: "Origin sub-branch",
                          value: view.originSubRibbon || view.originSubLabel,
                        },
                        {
                          label: "Destination sub-branch",
                          value:
                            view.destinationSubRibbon ||
                            view.destinationSubLabel,
                        },
                        {
                          label: "Current sub-branch",
                          value: view.currentSubRibbon || view.currentSubLabel,
                        },
                        {
                          label: "Route distance",
                          value:
                            routeKm ||
                            ((view.distanceData.originToCustomerKm ??
                            view.distanceData.totalDistanceKm)
                              ? `${view.distanceData.originToCustomerKm ?? view.distanceData.totalDistanceKm} km`
                              : "—"),
                        },
                        {
                          label: "Base covered distance",
                          value: `${view.distanceData.baseDistanceKm ?? 10} km`,
                        },
                        {
                          label: "Extra mile",
                          value:
                            view.distanceData.extraMileKm != null
                              ? view.distanceData.extraMileKm > 0
                                ? `+${view.distanceData.extraMileKm} km extra`
                                : "0 km (Within base)"
                              : "—",
                        },
                        {
                          label: "Distance covered",
                          value: `${view.distanceData.coveredDistanceKm} km (${view.distanceData.progressPercent}%)`,
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "shares",
                  label: "Branch shares",
                  children: (
                    <BranchShareBreakdown
                      shipmentId={shipment.id ?? shipmentId}
                    />
                  ),
                },
              ].filter(Boolean)}
            />
          </div>
        </div>
      )}

      {/* Edit Delivery Location Modal */}
      <EditDeliveryLocationModal
        open={locationModalOpen}
        shipment={shipment}
        onClose={() => setLocationModalOpen(false)}
        onSuccess={() => {
          setLocationModalOpen(false);
          load();
        }}
      />

      {/* Cancel Shipment Modal */}
      <Modal
        title="Cancel Shipment"
        open={cancelModalOpen}
        onCancel={() => {
          setCancelModalOpen(false);
          setCancelReason("");
        }}
        onOk={handleCancelSubmit}
        okText="Confirm Cancellation"
        okButtonProps={{ danger: true, loading: actionLoading }}
        destroyOnClose
      >
        <Space
          direction="vertical"
          style={{ width: "100%", marginTop: 12 }}
          size={12}
        >
          <Text>
            Are you sure you want to cancel shipment{" "}
            <strong>#{shipment?.tracking_number || shipment?.id}</strong>?
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            This will detach the parcel from any active pickup/delivery
            assignments and notify the merchant.
          </Text>
          <div>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Cancellation Reason <span style={{ color: "#ff4d4f" }}>*</span>
            </Text>
            <Input.TextArea
              rows={3}
              placeholder="Enter reason (e.g. Customer cancelled order, duplicate booking...)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        </Space>
      </Modal>

      {/* Initiate Return Modal */}
      <Modal
        title="Initiate Return to Origin (RTO)"
        open={returnModalOpen}
        onCancel={() => {
          setReturnModalOpen(false);
          setReturnReason("");
        }}
        onOk={handleReturnSubmit}
        okText="Initiate Return"
        okButtonProps={{ danger: true, loading: actionLoading }}
        destroyOnClose
      >
        <Space
          direction="vertical"
          style={{ width: "100%", marginTop: 12 }}
          size={12}
        >
          <Text>
            Initiate return for shipment{" "}
            <strong>#{shipment?.tracking_number || shipment?.id}</strong> back
            to origin hub and merchant.
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Active delivery tasks will be stopped, and the parcel will be marked
            for return processing.
          </Text>
          <div>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Reason for Return <span style={{ color: "#ff4d4f" }}>*</span>
            </Text>
            <Input.TextArea
              rows={3}
              placeholder="Enter reason (e.g. Customer refused delivery, customer unreachable, incorrect address...)"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
          </div>
        </Space>
      </Modal>

      {/* Hand Over Returned Parcel to Merchant Modal */}
      <Modal
        title="Hand Over Returned Parcel to Merchant"
        open={merchantReturnModalOpen}
        onCancel={() => {
          setMerchantReturnModalOpen(false);
          setMerchantReturnRecipient("");
          setMerchantReturnRemarks("");
        }}
        onOk={handleMerchantReturnSubmit}
        okText="Confirm Handover to Merchant"
        okButtonProps={{
          type: "primary",
          loading: actionLoading,
          style: { background: "#059669", borderColor: "#059669" },
        }}
        destroyOnClose
      >
        <Space
          direction="vertical"
          style={{ width: "100%", marginTop: 12 }}
          size={12}
        >
          <Text>
            Confirm handover of returned parcel{" "}
            <strong>#{shipment?.tracking_number || shipment?.id}</strong> to
            merchant{" "}
            <strong>
              {shipment?.merchant?.name || view?.merchantName || "Store"}
            </strong>
            .
          </Text>
          <div>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Received by (Store Staff / Contact Name)
            </Text>
            <Input
              placeholder="e.g. Ram Shrestha (Store Manager)"
              value={merchantReturnRecipient}
              onChange={(e) => setMerchantReturnRecipient(e.target.value)}
            />
          </div>
          <div>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Handover Notes / Condition
            </Text>
            <Input.TextArea
              rows={3}
              placeholder="Optional notes regarding condition of package upon return"
              value={merchantReturnRemarks}
              onChange={(e) => setMerchantReturnRemarks(e.target.value)}
            />
          </div>
        </Space>
      </Modal>
    </Drawer>
  );
}
