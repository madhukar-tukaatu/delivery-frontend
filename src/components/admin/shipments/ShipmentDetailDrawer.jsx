"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Timeline,
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
  CompassOutlined,
  AimOutlined,
} from "@ant-design/icons";

import ShipmentWorkflowActions from "@/features/workflow/components/ShipmentWorkflowActions";
import WorkflowStatusTag from "@/features/workflow/components/WorkflowStatusTag";
import ShipmentTransferHops from "@/components/admin/shipments/ShipmentTransferHops";
import BranchShareBreakdown from "@/components/admin/shipments/BranchShareBreakdown";
import {
  dispatchNextRouteStep,
  getAdminShipment,
  receiveCurrentRouteStep,
  receiveOriginSubBranch,
} from "@/services/workflowService";
import { normalizeShipmentDetailResponse } from "@/services/merchantShipmentService";
import {
  formatDateTime,
  formatMoney,
  labelForStatus,
} from "@/config/workflowStatus";

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

function branchLabel(branch, fallbackId) {
  if (branch && typeof branch === "object") {
    const name = firstValue(branch.name, branch.legal_name, branch.branch_name);
    if (name) {
      return branch.area ? `${name}, ${branch.area}` : name;
    }
  }
  if (typeof branch === "string" && branch.trim()) return branch;
  if (fallbackId != null && fallbackId !== "") return `Branch #${fallbackId}`;
  return null;
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

function displayOrDash(value) {
  return hasText(value) ? value : "—";
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
  if (Number.isNaN(nLat1) || Number.isNaN(nLon1) || Number.isNaN(nLat2) || Number.isNaN(nLon2)) return null;

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
  if (lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng))) {
    return { lat: Number(lat), lng: Number(lng) };
  }
  return null;
}

const STATUS_STEPS = [
  "pending",
  "confirmed",
  "pickup_requested",
  "pickup_assigned",
  "picked_up",
  "received_at_origin",
  "in_transit",
  "received_at_destination",
  "out_for_delivery",
  "assigned_to_rider",
  "delivered",
];

function getStatusProgress(status) {
  if (!status) return 0;
  if (status === "failed" || status === "cancelled") return 100;
  const idx = STATUS_STEPS.indexOf(status);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / STATUS_STEPS.length) * 100);
}

/* -------------------------------------------------------------------------- */
/* UI pieces                                                                  */
/* -------------------------------------------------------------------------- */

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

function MoneyStat({ title, value, color, tag }) {
  return (
    <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {title}
        </Text>
        {tag}
      </div>
      <Statistic
        value={
          value === null || value === undefined || !Number.isFinite(Number(value))
            ? "—"
            : Number(value)
        }
        precision={
          value === null || value === undefined || !Number.isFinite(Number(value))
            ? undefined
            : 2
        }
        prefix={
          value === null || value === undefined || !Number.isFinite(Number(value))
            ? ""
            : "NPR "
        }
        valueStyle={{ fontSize: 18, fontWeight: 600, color }}
      />
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export default function ShipmentDetailDrawer({ open, shipmentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  // ~720px on desktop, full width on phones.
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = viewportWidth < 768;

  const printLabel = () => {
    const id = shipment?.id ?? shipmentId;
    if (id && typeof window !== "undefined") {
      window.open(`/admin/shipments/${id}/print`, "_blank", "noopener");
    }
  };

  const load = async () => {
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
  };

  useEffect(() => {
    if (!open || !shipmentId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shipmentId]);

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

  // Support { data: {...} }, { shipment: {...} }, or flat model
  const shipment = data?.shipment ?? data?.data ?? (data?.id ? data : null);

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

    // path_text fallback for branch names
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
      ? (originBranch?.area ? `${originName}, ${originBranch.area}` : originName)
      : (originId ? `Branch #${originId}` : null);
    const originRibbon = (originName || originId) ? (
      <BranchRibbonTag name={originName} id={originId} color="blue" />
    ) : null;

    const destinationId = shipment.destination_branch_id ?? destinationBranch?.id ?? null;

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
      ? (destinationBranch?.area ? `${destinationName}, ${destinationBranch.area}` : destinationName)
      : (destinationId ? `Branch #${destinationId}` : null);
    const destinationRibbon = (destinationName || destinationId) ? (
      <BranchRibbonTag name={destinationName} id={destinationId} color="geekblue" />
    ) : null;

    const currentName = firstValue(
      currentBranch?.name,
      currentBranch?.legal_name,
      currentBranch?.branch_name,
      shipment.current_branch_name,
      hop?.current_name,
      hop?.current_branch_name,
      originId && destinationId && String(originId) === String(destinationId) ? originName : null,
    );
    const currentId =
      shipment.current_branch_id ??
      currentBranch?.id ??
      (originId && destinationId && String(originId) === String(destinationId) ? originId : null);
    const currentLabel = currentName
      ? (currentBranch?.area ? `${currentName}, ${currentBranch.area}` : currentName)
      : (currentId ? `Branch #${currentId}` : null);
    const currentRibbon = (currentName || currentId) ? (
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
      ? (nextHopBranch?.area ? `${nextHopName}, ${nextHopBranch.area}` : nextHopName)
      : (nextHopId ? `Branch #${nextHopId}` : null);
    const nextHopRibbon = (nextHopName || nextHopId) ? (
      <BranchRibbonTag name={nextHopName} id={nextHopId} color="orange" />
    ) : null;

    const originSubName = firstValue(
      originSub?.name,
      originSub?.legal_name,
      shipment.origin_sub_branch_name,
    );
    const originSubId = shipment.origin_sub_branch_id ?? originSub?.id ?? null;
    const originSubLabel = originSubName || (originSubId ? `Branch #${originSubId}` : null);
    const originSubRibbon = (originSubName || originSubId) ? (
      <BranchRibbonTag name={originSubName} id={originSubId} color="purple" />
    ) : null;

    const destinationSubName = firstValue(
      destinationSub?.name,
      destinationSub?.legal_name,
      shipment.destination_sub_branch_name,
    );
    const destinationSubId = shipment.destination_sub_branch_id ?? destinationSub?.id ?? null;
    const destinationSubLabel = destinationSubName || (destinationSubId ? `Branch #${destinationSubId}` : null);
    const destinationSubRibbon = (destinationSubName || destinationSubId) ? (
      <BranchRibbonTag name={destinationSubName} id={destinationSubId} color="purple" />
    ) : null;

    const currentSubName = firstValue(
      currentSub?.name,
      currentSub?.legal_name,
      shipment.current_sub_branch_name,
    );
    const currentSubId = shipment.current_sub_branch_id ?? currentSub?.id ?? null;
    const currentSubLabel = currentSubName || (currentSubId ? `Branch #${currentSubId}` : null);
    const currentSubRibbon = (currentSubName || currentSubId) ? (
      <BranchRibbonTag name={currentSubName} id={currentSubId} color="purple" />
    ) : null;

    // Parties / Pickup resolution:
    // Priority: pickupLocation model -> merchant model -> shipment root fields
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

    const priceBreakdown =
      data?.price_breakdown ??
      shipment.price_breakdown ??
      shipment.priceBreakdown ??
      null;

    const feeFromShipment = {
      pickup_fee: moneyValue(shipment.pickup_fee),
      route_fee: moneyValue(shipment.route_fee),
      last_mile_fee: moneyValue(shipment.last_mile_fee),
      weight_fee: moneyValue(shipment.weight_fee),
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
      distanceData: (() => {
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

        // 1. Maintain distance value from origin branch to destination of customer
        let originToCustomerDistance = null;
        if (shipment.route_distance_km && Number(shipment.route_distance_km) > 0) {
          originToCustomerDistance = Math.round(Number(shipment.route_distance_km) * 100) / 100;
        } else if (originBranchCoords && customerCoords) {
          originToCustomerDistance = haversineDistanceKm(
            originBranchCoords.lat,
            originBranchCoords.lng,
            customerCoords.lat,
            customerCoords.lng
          );
        }

        // 2. Extra mile from destination: Destination branch to customer destination
        const extraDistObj =
          priceBreakdown?.breakdown?.extra_delivery_distance ||
          priceBreakdown?.extra_delivery_distance ||
          priceBreakdown?.extra_distance ||
          (typeof shipment.delivery_charge_breakdown === "object"
            ? shipment.delivery_charge_breakdown?.extra_delivery_distance
            : null);

        let destToCustomerDistance = null;
        if (extraDistObj?.delivery_distance_km != null) {
          destToCustomerDistance = Math.round(Number(extraDistObj.delivery_distance_km) * 100) / 100;
        } else if (destBranchCoords && customerCoords) {
          destToCustomerDistance = haversineDistanceKm(
            destBranchCoords.lat,
            destBranchCoords.lng,
            customerCoords.lat,
            customerCoords.lng
          );
        }

        // 3. Base distance included in base fare (e.g. 5.0 km)
        const baseDistanceKm = Number(
          extraDistObj?.included_distance_km ?? 5.0
        );

        // 4. Extra mile from destination, excluding the base distance
        let extraMileKm = 0;
        if (extraDistObj?.extra_distance_km != null) {
          extraMileKm = Math.round(Number(extraDistObj.extra_distance_km) * 100) / 100;
        } else if (destToCustomerDistance != null) {
          extraMileKm = Math.max(0, Math.round((destToCustomerDistance - baseDistanceKm) * 100) / 100);
        }

        // Sum route steps if defined
        let routeStepsTotal = 0;
        let routeStepsCovered = 0;
        if (routeSteps.length > 0) {
          for (const step of routeSteps) {
            const stepDist = Number(step.distance_km || 0);
            routeStepsTotal += stepDist;
            const sStatus = String(step.status || "").toLowerCase();
            if (
              sStatus === "completed" ||
              sStatus === "received" ||
              step.completed_at
            ) {
              routeStepsCovered += stepDist;
            }
          }
        }

        let totalDist = originToCustomerDistance ?? moneyValue(shipment.route_distance_km);
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
        if ((totalDist == null || totalDist <= 0) && routeStepsTotal > 0) {
          totalDist = routeStepsTotal;
        }
        if ((totalDist == null || totalDist <= 0) && originBranchCoords && customerCoords) {
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
          if (coveredDist > totalDist) coveredDist = totalDist;
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
          coveredDist =
            routeStepsCovered > 0
              ? Math.max(routeStepsCovered, totalDist * 0.9)
              : totalDist * 0.9;
          progressPct =
            totalDist > 0 ? Math.round((coveredDist / totalDist) * 100) : 90;
        } else if (
          statusStr === "in_transit" ||
          statusStr === "received_at_transit_hub"
        ) {
          if (currentCoords && (destBranchCoords || customerCoords)) {
            const target = destBranchCoords || customerCoords;
            distFromDest =
              haversineDistanceKm(
                currentCoords.lat,
                currentCoords.lng,
                target.lat,
                target.lng
              ) ?? Math.max(0, totalDist - routeStepsCovered);
          } else {
            distFromDest = Math.max(0, totalDist - routeStepsCovered);
          }
          coveredDist =
            routeStepsCovered > 0
              ? routeStepsCovered
              : Math.max(0, totalDist - distFromDest);
          progressPct =
            totalDist > 0
              ? Math.min(
                  95,
                  Math.max(15, Math.round((coveredDist / totalDist) * 100))
                )
              : 50;
        } else if (
          [
            "picked_up",
            "received_at_origin",
            "received_at_origin_branch",
            "sorted_for_transfer",
          ].includes(statusStr)
        ) {
          if (originBranchCoords && (destBranchCoords || customerCoords)) {
            const target = destBranchCoords || customerCoords;
            distFromDest =
              haversineDistanceKm(
                originBranchCoords.lat,
                originBranchCoords.lng,
                target.lat,
                target.lng
              ) ?? totalDist;
          } else {
            distFromDest = totalDist;
          }
          coveredDist = Math.min(totalDist * 0.1, 5);
          progressPct = 10;
        } else {
          if (originBranchCoords && (destBranchCoords || customerCoords)) {
            const target = destBranchCoords || customerCoords;
            distFromDest =
              haversineDistanceKm(
                originBranchCoords.lat,
                originBranchCoords.lng,
                target.lat,
                target.lng
              ) ?? totalDist;
          } else {
            distFromDest = totalDist;
          }
          coveredDist = 0;
          progressPct = 0;
        }

        return {
          totalDistanceKm: Math.round(totalDist * 100) / 100,
          originToCustomerKm: originToCustomerDistance,
          destinationToCustomerKm: destToCustomerDistance,
          baseDistanceKm: baseDistanceKm,
          extraMileKm: extraMileKm,
          coveredDistanceKm: Math.round(coveredDist * 100) / 100,
          distanceFromDestinationBranchKm:
            Math.round(distFromDest * 100) / 100,
          progressPercent: progressPct,
          isAtDestinationBranch: isAtDestBranch,
          isDelivered,
        };
      })(),
    };
  }, [shipment, data]);

  const drawerTitle = shipment?.tracking_number || "Shipment details";

  // Financial & Pricing rules:
  // - delivery_charge: the delivery fee amount.
  // - delivery_free_by: indicates if a free delivery coupon/promotion was applied ('marketplace', 'store', or 'none').
  // - delivery_charge_paid_by: who covers the delivery fee ('customer', 'merchant', or 'admin').
  //   * Note: Merchant or Admin covering the delivery charge does NOT mean a free delivery coupon was applied.
  // - Goods value: exact packet products total (or declared goods value) - never deducted.
  // - Collect from customer (POD):
  //   * When customer pays delivery fee: Goods value + delivery charge.
  //   * When delivery is free or paid by merchant/admin: Goods value only.
  const deliveryCharge = moneyValue(
    shipment?.delivery_charge,
    shipment?.delivery_fee,
  );
  const isPodShipment =
    String(shipment?.payment_type ?? shipment?.payment_method ?? "")
      .toLowerCase() === "pod";
  const podAmount = moneyValue(shipment?.pod_amount);
  const totalCollectable = moneyValue(
    shipment?.total_collectable_amount,
    shipment?.total_collectable,
  );

  const paidBy = String(shipment?.delivery_charge_paid_by ?? "customer").toLowerCase().trim();
  const freeBy = String(shipment?.delivery_free_by ?? "none").toLowerCase().trim();

  // Free delivery coupon / promo flags (ONLY true if delivery_free_by is explicitly store/merchant or marketplace/admin)
  const isFreeDeliveryByAdmin = freeBy === "marketplace" || freeBy === "admin";
  const isFreeDeliveryByStore = freeBy === "store" || freeBy === "merchant";
  const hasFreeDeliveryCoupon = isFreeDeliveryByAdmin || isFreeDeliveryByStore;
  const isFreeDelivery = hasFreeDeliveryCoupon;

  // Who actually pays/covers the delivery charge invoice
  const isPaidByMerchant =
    !isFreeDeliveryByAdmin &&
    (isFreeDeliveryByStore || ["merchant", "store", "seller"].includes(paidBy));
  const isPaidByAdmin =
    isFreeDeliveryByAdmin || paidBy === "admin" || paidBy === "marketplace";
  const isPaidByCustomer = !isPaidByMerchant && !isPaidByAdmin;

  // Calculate packet products total (exact sum of all packet products: qty * unit_price)
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

  // Declared goods value
  const rawDeclaredValue = moneyValue(
    shipment?.declared_value,
    shipment?.merchandise_value,
    shipment?.items_subtotal,
  );

  // If customer pays delivery fee and raw declared value equals POD total/collectable amount,
  // it indicates the store sent the gross total (goods + delivery) inside declared_value.
  const isDeclaredGrossTotal = Boolean(
    isPaidByCustomer &&
    (deliveryCharge ?? 0) > 0 &&
    rawDeclaredValue != null &&
    (
      (totalCollectable != null && Math.abs(rawDeclaredValue - totalCollectable) < 0.01) ||
      (podAmount != null && Math.abs(rawDeclaredValue - podAmount) < 0.01)
    )
  );

  const netDeclaredValue = isDeclaredGrossTotal
    ? Math.max(0, Math.round((rawDeclaredValue - (deliveryCharge ?? 0)) * 100) / 100)
    : rawDeclaredValue;

  // Exact Goods Value: prefer packet products total, then net declared value, then fallback
  const goodsValue =
    packetProductsTotal != null && packetProductsTotal > 0
      ? packetProductsTotal
      : netDeclaredValue != null
        ? netDeclaredValue
        : (isPodShipment
            ? (isPaidByCustomer && (deliveryCharge ?? 0) > 0 && podAmount != null && Math.abs(podAmount - (totalCollectable ?? podAmount)) < 0.01
                ? Math.max(0, Math.round((podAmount - deliveryCharge) * 100) / 100)
                : podAmount)
            : null);

  // Amount the rider collects at customer doorstep (actual pod_amount from shipment data)
  const collectableAmount = isPodShipment
    ? (podAmount != null
        ? podAmount
        : totalCollectable != null
          ? totalCollectable
          : (goodsValue ?? 0) + (isPaidByCustomer ? (deliveryCharge ?? 0) : 0))
    : 0;

  /* ---- drawer sections ---- */

  const overviewTab = view && (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card size="small">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Space wrap>
            <WorkflowStatusTag status={shipment.status} />
            {shipment.merchant_status && (
              <Tag>Merchant: {labelForStatus(shipment.merchant_status)}</Tag>
            )}
            {view.isTransfer && (
              <Tag icon={<SwapOutlined />} color="orange">
                {view.transferStageLabel || "Transfer"}
              </Tag>
            )}
            {shipment.pod_status &&
              String(shipment.payment_type).toLowerCase() === "pod" && (
                <Tag>POD: {labelForStatus(shipment.pod_status)}</Tag>
              )}
            {isFreeDeliveryByAdmin && (
              <Tag color="purple">Free Delivery (Marketplace Coupon)</Tag>
            )}
            {isFreeDeliveryByStore && (
              <Tag color="cyan">Free Delivery (Store Coupon)</Tag>
            )}
            {!hasFreeDeliveryCoupon && isPaidByMerchant && (
              <Tag color="cyan">Delivery Paid by Merchant</Tag>
            )}
            {!hasFreeDeliveryCoupon && isPaidByAdmin && (
              <Tag color="purple">Delivery Paid by Admin</Tag>
            )}
          </Space>
          <Progress
            percent={getStatusProgress(shipment.status)}
            status={
              shipment.status === "failed" || shipment.status === "cancelled"
                ? "exception"
                : shipment.status === "delivered"
                  ? "success"
                  : "active"
            }
            size="small"
            showInfo={false}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {labelForStatus(shipment.status)}
            {view.currentLabel ? ` · Currently at ${view.currentLabel}` : ""}
          </Text>
        </Space>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={12} sm={12} lg={8}>
          <MoneyStat
            title="Delivery charge"
            value={deliveryCharge}
            color="#0891B2"
            tag={
              isFreeDeliveryByAdmin ? (
                <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>Free (Marketplace)</Tag>
              ) : isFreeDeliveryByStore ? (
                <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>Free (Store)</Tag>
              ) : isPaidByMerchant ? (
                <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>Paid by Merchant</Tag>
              ) : isPaidByAdmin ? (
                <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>Paid by Admin</Tag>
              ) : (
                <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>Paid by Customer</Tag>
              )
            }
          />
        </Col>
        
        <Col xs={12} sm={12} lg={8}>
          <MoneyStat
            title="Collect from customer (POD total)"
            value={collectableAmount}
            color="#D97706"
            tag={
              !isPodShipment ? (
                <Tag color="green" style={{ margin: 0, fontSize: 10 }}>Prepaid</Tag>
              ) : isPaidByCustomer ? (
                <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>Products + Delivery</Tag>
              ) : (
                <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>Products Only</Tag>
              )
            }
          />
        </Col>
        
        <Col xs={12} sm={12} lg={8}>
          <MoneyStat
            title={
              packetProductsTotal != null && packetProductsTotal > 0
                ? "Products price (Packet total)"
                : isDeclaredGrossTotal
                  ? "Products price (excl. delivery)"
                  : "Products price"
            }
            value={goodsValue}
            color="#059669"
            tag={
              packetProductsTotal != null && packetProductsTotal > 0 ? (
                <Tag color="success" style={{ margin: 0, fontSize: 10 }}>Packet Total</Tag>
              ) : isDeclaredGrossTotal ? (
                <Tag color="success" style={{ margin: 0, fontSize: 10 }}>Excl. Delivery</Tag>
              ) : netDeclaredValue != null ? (
                <Tag color="success" style={{ margin: 0, fontSize: 10 }}>Declared Value</Tag>
              ) : null
            }
          />
        </Col>
        {/* <Col xs={12} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
            <Statistic
              title={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Route distance
                </Text>
              }
              value={view.distanceData.totalDistanceKm || "—"}
              precision={view.distanceData.totalDistanceKm ? 2 : undefined}
              suffix={view.distanceData.totalDistanceKm ? " km" : ""}
              valueStyle={{ fontSize: 18, fontWeight: 600 }}
            />
          </Card>
        </Col> */}
      </Row>

      {/* Distance & Journey Metrics */}
      {/* <Card
        size="small"
        title={
          <Space size={8}>
            <CompassOutlined style={{ color: "#0891B2" }} />
            <span style={{ fontWeight: 600 }}>Distance & Journey Progress</span>
          </Space>
        }
        extra={
          view.distanceData.isAtDestinationBranch ? (
            <Tag color="green" icon={<AimOutlined />}>
              {view.distanceData.isDelivered ? "Delivered" : "At Destination Branch"}
            </Tag>
          ) : view.distanceData.coveredDistanceKm > 0 ? (
            <Tag color="processing">In Transit</Tag>
          ) : (
            <Tag color="default">Pending Dispatch</Tag>
          )
        }
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Total Route Distance</Text>}
              value={view.distanceData.totalDistanceKm}
              precision={2}
              suffix="km"
              valueStyle={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Full planned route path
            </Text>
          </Col>

          <Col xs={24} sm={8}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Total Distance Covered</Text>}
              value={view.distanceData.coveredDistanceKm}
              precision={2}
              suffix="km"
              valueStyle={{ fontSize: 20, fontWeight: 700, color: "#0891B2" }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {view.distanceData.progressPercent}% traveled so far
            </Text>
          </Col>

          <Col xs={24} sm={8}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Distance from Destination Branch</Text>}
              value={view.distanceData.isAtDestinationBranch ? 0 : view.distanceData.distanceFromDestinationBranchKm}
              precision={2}
              suffix={view.distanceData.isAtDestinationBranch ? "km (Arrived)" : "km remaining"}
              valueStyle={{
                fontSize: 20,
                fontWeight: 700,
                color: view.distanceData.isAtDestinationBranch ? "#10B981" : "#D97706",
              }}
            />
            <Text style={{ fontSize: 11, color: view.distanceData.isAtDestinationBranch ? "#10B981" : "#64748B" }}>
              {view.distanceData.isAtDestinationBranch
                ? "Parcel reached destination branch"
                : `${view.distanceData.distanceFromDestinationBranchKm} km to reach destination branch`}
            </Text>
          </Col>
        </Row>

        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Space size={4}>
              <EnvironmentOutlined style={{ color: "#64748B", fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Origin: <Text strong>{view.originLabel || "Origin Branch"}</Text>
              </Text>
            </Space>
            <Space size={4}>
              <AimOutlined style={{ color: "#10B981", fontSize: 12 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Destination: <Text strong>{view.destinationLabel || "Destination Branch"}</Text>
              </Text>
            </Space>
          </div>
          <Progress
            percent={view.distanceData.progressPercent}
            strokeColor={{
              "0%": "#0891B2",
              "100%": "#10B981",
            }}
            status={view.distanceData.isDelivered ? "success" : "active"}
            size="small"
          />
        </div>
      </Card> */}

      <SectionCard title="Current location" icon={<EnvironmentOutlined />}>
        <FieldDescriptions
          column={{ xs: 1, sm: 2 }}
          items={[
            { label: "Origin", value: view.originRibbon || view.originLabel },
            { label: "Destination", value: view.destinationRibbon || view.destinationLabel },
            { label: "Current branch", value: view.currentRibbon || view.currentLabel },
            { label: "Next hop", value: view.nextHopRibbon || view.nextHopLabel },
            { label: "Origin sub-branch", value: view.originSubRibbon || view.originSubLabel },
            {
              label: "Destination sub-branch",
              value: view.destinationSubRibbon || view.destinationSubLabel,
            },
            { label: "Current sub-branch", value: view.currentSubRibbon || view.currentSubLabel },
          ]}
        />
        {!view.originLabel && !view.destinationLabel && !view.currentLabel && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No branch assignments yet"
          />
        )}
      </SectionCard>

      <SectionCard title="Parcel summary" icon={<FileTextOutlined />}>
        <FieldDescriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          items={[
            { label: "Service", value: shipment.service_type },
            {
              label: "Payment",
              value: shipment.payment_type
                ? String(shipment.payment_type).toUpperCase()
                : null,
            },
            {
              label: "Charge paid by",
              value: isPaidByMerchant
                ? isFreeDeliveryByStore
                  ? "Merchant / Store (Free Delivery Coupon)"
                  : "Merchant / Store"
                : isPaidByAdmin
                  ? isFreeDeliveryByAdmin
                    ? "Admin / Marketplace (Free Delivery Coupon)"
                    : "Admin / Marketplace"
                  : "Customer",
            },
            {
              label: "Free delivery",
              value: isFreeDeliveryByAdmin ? (
                <Tag color="purple">Yes (Marketplace Coupon)</Tag>
              ) : isFreeDeliveryByStore ? (
                <Tag color="cyan">Yes (Store Coupon)</Tag>
              ) : (
                <Tag color="default">No</Tag>
              ),
            },
            {
              label: "Parcel type",
              value: shipment.parcel_type || shipment.package_type,
            },
            {
              label: "Weight",
              value: shipment.weight != null ? `${shipment.weight} kg` : null,
            },
            {
              label: "Actual weight",
              show: shipment.actual_weight != null && Number(shipment.actual_weight) > 0,
              value: shipment.actual_weight != null ? `${shipment.actual_weight} kg` : null,
            },
            {
              label: "Volumetric weight",
              show: shipment.volumetric_weight != null && Number(shipment.volumetric_weight) > 0,
              value: shipment.volumetric_weight != null ? `${shipment.volumetric_weight} kg` : null,
            },
            {
              label: "Chargeable weight",
              show: shipment.chargeable_weight != null && Number(shipment.chargeable_weight) > 0,
              value: shipment.chargeable_weight != null ? `${shipment.chargeable_weight} kg` : null,
            },
            {
              label: "Dimensions (L×W×H)",
              show: Boolean(shipment.length_cm && shipment.width_cm && shipment.height_cm),
              value:
                shipment.length_cm && shipment.width_cm && shipment.height_cm
                  ? `${shipment.length_cm} × ${shipment.width_cm} × ${shipment.height_cm} cm`
                  : null,
            },
            {
              label: "Quantity",
              value:
                shipment.quantity != null ? String(shipment.quantity) : null,
            },
            {
              label: "Declared value",
              value: (() => {
                if (packetProductsTotal != null && packetProductsTotal > 0) {
                  return `${formatMoney(packetProductsTotal)} (Packet total)`;
                }
                if (isDeclaredGrossTotal) {
                  return `${formatMoney(netDeclaredValue)} (excl. delivery)`;
                }
                const val = rawDeclaredValue ?? moneyValue(shipment.declared_value);
                return val != null ? formatMoney(Number(val)) : null;
              })(),
            },
            {
              label: "Fragile",
              value:
                shipment.fragile != null
                  ? shipment.fragile
                    ? "Yes"
                    : "No"
                  : null,
            },
            {
              label: "Description",
              value: shipment.description || shipment.package_description,
            },
            { label: "Remarks", value: shipment.remarks },
            {
              label: "Special instructions",
              value: shipment.special_instructions,
            },
          ]}
        />
      </SectionCard>
    </Space>
  );

  const routeTab = view && (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {(view.isTransfer || view.pathText || view.nextHopLabel) && (
        <SectionCard title="Transfer route" icon={<SwapOutlined />}>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Space wrap size={[8, 8]}>
              <Tag>{displayOrDash(view.originLabel)}</Tag>
              <Text type="secondary">→</Text>
              {view.viaNames.map((name) => (
                <Tag key={name} color="cyan">
                  via {name}
                </Tag>
              ))}
              <Tag color="blue">{displayOrDash(view.destinationLabel)}</Tag>
            </Space>

            {view.pathText && (
              <Paragraph type="secondary" style={{ margin: 0 }}>
                Path: {view.pathText}
              </Paragraph>
            )}

            {(view.hop?.route_code || view.hop?.route_name) && (
              <Text type="secondary">
                Route {view.hop?.route_code}
                {view.hop?.route_name ? ` · ${view.hop.route_name}` : ""}
              </Text>
            )}

            {view.nextHopLabel ? (
              <div>
                <Badge status="processing" />{" "}
                <Text>
                  Next hop: <Text strong>{view.nextHopLabel}</Text>
                  {view.hop?.in_transit_label && (
                    <Text type="secondary"> · {view.hop.in_transit_label}</Text>
                  )}
                </Text>
              </div>
            ) : view.hop?.in_transit_label ? (
              <Text type="secondary">{view.hop.in_transit_label}</Text>
            ) : null}

            {view.transferStageLabel && (
              <Tag color="orange">{view.transferStageLabel}</Tag>
            )}
          </Space>
        </SectionCard>
      )}

      <SectionCard title="Branch assignments & Distances" icon={<EnvironmentOutlined />}>
        <FieldDescriptions
          column={{ xs: 1, sm: 2 }}
          items={[
            { label: "Origin", value: view.originRibbon || view.originLabel },
            { label: "Destination", value: view.destinationRibbon || view.destinationLabel },
            { label: "Current branch", value: view.currentRibbon || view.currentLabel },
            { label: "Next hop", value: view.nextHopRibbon || view.nextHopLabel },
            { label: "Origin sub-branch", value: view.originSubRibbon || view.originSubLabel },
            {
              label: "Destination sub-branch",
              value: view.destinationSubRibbon || view.destinationSubLabel,
            },
            { label: "Current sub-branch", value: view.currentSubRibbon || view.currentSubLabel },
            {
              label: "Route distance (Origin → Customer)",
              value: (view.distanceData.originToCustomerKm ?? view.distanceData.totalDistanceKm)
                ? `${view.distanceData.originToCustomerKm ?? view.distanceData.totalDistanceKm} km`
                : "—",
            },
            {
              label: "Destination branch → Customer",
              value: view.distanceData.destinationToCustomerKm != null
                ? `${view.distanceData.destinationToCustomerKm} km`
                : "—",
            },
            {
              label: "Base covered distance",
              value: `${view.distanceData.baseDistanceKm ?? 5} km (Included in base fare)`,
            },
            {
              label: "Extra mile from destination",
              value: view.distanceData.extraMileKm != null
                ? (
                    <Space size={6} wrap>
                      <Text
                        strong
                        style={{
                          color: view.distanceData.extraMileKm > 0 ? "#d97706" : "#059669",
                        }}
                      >
                        {view.distanceData.extraMileKm > 0
                          ? `+${view.distanceData.extraMileKm} km extra`
                          : "0 km (Within base coverage)"}
                      </Text>
                      {view.distanceData.extraMileKm > 0 && (
                        <Tag color="orange">Excludes {view.distanceData.baseDistanceKm ?? 5} km base</Tag>
                      )}
                    </Space>
                  )
                : "—",
            },
            {
              label: "Distance covered",
              value: `${view.distanceData.coveredDistanceKm} km (${view.distanceData.progressPercent}%)`,
            },
            {
              label: "Distance to destination branch",
              value: view.distanceData.isAtDestinationBranch
                ? "0.00 km (At destination branch)"
                : `${view.distanceData.distanceFromDestinationBranchKm} km remaining`,
            },
          ]}
        />
      </SectionCard>

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
    </Space>
  );

  const partiesTab = view && (
    <Row gutter={[16, 16]}>
      {(view.hasSenderBlock ||
        coordinateLabel(view.pickupLat, view.pickupLng)) && (
        <Col xs={24} lg={12}>
          <SectionCard title="Pickup" icon={<ShopOutlined />}>
            <FieldDescriptions
              items={[
                { label: "Merchant / Store", value: view.merchantName },
                {
                  label: "Pickup location",
                  value: view.pickupLocationName,
                },
                { label: "Contact person", value: view.senderName },
                { label: "Phone", value: view.senderPhone },
                { label: "Email", value: view.senderEmail },
                { label: "Address", value: view.senderAddress },
                { label: "City", value: view.senderCity },
                { label: "Area", value: view.senderArea },
                {
                  label: "Coordinates",
                  value: coordinateLabel(view.pickupLat, view.pickupLng),
                },
              ]}
            />
          </SectionCard>
        </Col>
      )}

      <Col
        xs={24}
        lg={
          view.hasSenderBlock || coordinateLabel(view.pickupLat, view.pickupLng)
            ? 12
            : 24
        }
      >
        <SectionCard title="Receiver / Delivery" icon={<UserOutlined />}>
          <FieldDescriptions
            items={[
              {
                label: "Name",
                value: firstValue(
                  shipment.receiver_name,
                  shipment.customer_name,
                ),
              },
              {
                label: "Phone",
                value: firstValue(
                  shipment.receiver_phone,
                  shipment.customer_phone,
                ),
              },
              {
                label: "Email",
                value: firstValue(
                  shipment.receiver_email,
                  shipment.customer_email,
                ),
              },
              {
                label: "Address",
                value: firstValue(
                  shipment.receiver_address,
                  shipment.delivery_address,
                ),
              },
              { label: "City", value: shipment.receiver_city },
              { label: "Area", value: shipment.receiver_area },
              {
                label: "Coordinates",
                value: coordinateLabel(view.deliveryLat, view.deliveryLng),
              },
            ]}
          />
        </SectionCard>
      </Col>

      {view.packetProducts.length > 0 && (
        <Col span={24}>
          <SectionCard title="Packet products" icon={<ShopOutlined />}>
            <Table
              size="small"
              rowKey={(_, i) => `pp-${i}`}
              pagination={false}
              dataSource={view.packetProducts}
              columns={[
                {
                  title: "Name",
                  dataIndex: "name",
                  render: (v) => v || "—",
                },
                { title: "Qty", dataIndex: "quantity", width: 70 },
                {
                  title: "Unit price",
                  dataIndex: "unit_price",
                  render: (v) => (v != null ? formatMoney(Number(v)) : "—"),
                },
                {
                  title: "Total",
                  key: "total_price",
                  width: 120,
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
                  <Table.Summary.Row style={{ background: "#FAFAFA", fontWeight: 600 }}>
                    <Table.Summary.Cell index={0} colSpan={3} style={{ textAlign: "right" }}>
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
          </SectionCard>
        </Col>
      )}
    </Row>
  );

  const pricingTab = view && (view.priceBreakdown || view.hasFeeColumns) && (
    <SectionCard title="Pricing breakdown" icon={<DollarOutlined />}>
      {view.priceBreakdown ? (
        <FieldDescriptions
          column={2}
          items={[
            {
              label: "Pricing route",
              show: Boolean(
                view.priceBreakdown.pickup_branch_name ||
                view.priceBreakdown.delivery_branch_name
              ),
              value: `${view.priceBreakdown.pickup_branch_name || view.originLabel || "Origin"} → ${view.priceBreakdown.delivery_branch_name || view.destinationLabel || "Destination"} (${view.priceBreakdown.same_branch ? "Local / Same Branch" : "Inter-Branch Transfer"})`,
            },
            {
              label: "Route base rate",
              value: formatMoney(
                Number(
                  view.priceBreakdown.route_base_rate ??
                  view.priceBreakdown.base_delivery_fee ??
                  0,
                ),
              ),
            },
            {
              label: "Extra distance charge",
              show:
                Number(view.priceBreakdown.delivery_extra_charge ?? 0) > 0 ||
                Boolean(view.priceBreakdown.extra_distance_km) ||
                (view.distanceData?.extraMileKm != null && view.distanceData.extraMileKm > 0),
              value: (
                <Space direction="vertical" size={2}>
                  <Text strong>
                    {formatMoney(Number(view.priceBreakdown.delivery_extra_charge ?? 0))}
                  </Text>
                  {(view.priceBreakdown.extra_distance_km || view.distanceData?.extraMileKm > 0) && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      +{view.priceBreakdown.extra_distance_km ?? view.distanceData.extraMileKm} km extra mile (Excluding {view.distanceData?.baseDistanceKm ?? 5} km base distance)
                    </Text>
                  )}
                </Space>
              ),
            },
            {
              label: "Weight charge",
              show: Number(view.priceBreakdown.weight_charge ?? 0) > 0,
              value: formatMoney(
                Number(view.priceBreakdown.weight_charge ?? 0),
              ),
            },
            {
              label: "Fragile fee",
              show: Number(view.priceBreakdown.fragile_charge ?? 0) > 0,
              value: formatMoney(
                Number(view.priceBreakdown.fragile_charge ?? 0),
              ),
            },
            {
              label: "Expedited fee",
              show: Number(view.priceBreakdown.same_day_charge || view.priceBreakdown.express_charge || 0) > 0,
              value: formatMoney(
                Number(view.priceBreakdown.same_day_charge || view.priceBreakdown.express_charge || 0),
              ),
            },
            {
              label: "POD fee",
              show: isPodShipment || Number(view.priceBreakdown.pod_fee ?? 0) > 0,
              value: formatMoney(Number(view.priceBreakdown.pod_fee ?? 0)),
            },
            {
              label: "Final price",
              value: (
                <Text strong>
                  {formatMoney(
                    Number(
                      view.priceBreakdown.final_price ??
                        shipment.delivery_charge ??
                        0,
                    ),
                  )}
                </Text>
              ),
            },
            {
              label: "Fee covered by",
              value: isPaidByMerchant ? (
                isFreeDeliveryByStore ? (
                  <Tag color="cyan">Merchant / Store (Free Delivery Coupon)</Tag>
                ) : (
                  <Tag color="cyan">Merchant / Store</Tag>
                )
              ) : isPaidByAdmin ? (
                isFreeDeliveryByAdmin ? (
                  <Tag color="purple">Admin / Marketplace (Free Delivery Coupon)</Tag>
                ) : (
                  <Tag color="purple">Admin / Marketplace</Tag>
                )
              ) : (
                <Tag color="blue">Customer</Tag>
              ),
            },
            {
              label: "Customer delivery fee",
              value: !isPaidByCustomer
                ? `NPR 0.00 (${isFreeDeliveryByAdmin ? "Free - Marketplace Coupon" : isFreeDeliveryByStore ? "Free - Store Coupon" : isPaidByMerchant ? "Paid by Merchant" : "Paid by Admin"})`
                : formatMoney(Number(shipment.delivery_charge ?? 0)),
            },
          ]}
        />
      ) : (
        <FieldDescriptions
          column={2}
          items={[
            {
              label: "Pickup fee",
              value:
                view.feeFromShipment.pickup_fee != null
                  ? formatMoney(view.feeFromShipment.pickup_fee)
                  : null,
            },
            {
              label: "Route fee",
              value:
                view.feeFromShipment.route_fee != null
                  ? formatMoney(view.feeFromShipment.route_fee)
                  : null,
            },
            {
              label: "Last-mile fee",
              value:
                view.feeFromShipment.last_mile_fee != null
                  ? formatMoney(view.feeFromShipment.last_mile_fee)
                  : null,
            },
            {
              label: "Weight fee",
              value:
                view.feeFromShipment.weight_fee != null
                  ? formatMoney(view.feeFromShipment.weight_fee)
                  : null,
            },
            {
              label: "POD charge",
              value:
                view.feeFromShipment.pod_charge != null
                  ? formatMoney(view.feeFromShipment.pod_charge)
                  : null,
            },
            {
              label: "Delivery charge",
              value:
                view.feeFromShipment.delivery_charge != null
                  ? formatMoney(view.feeFromShipment.delivery_charge)
                  : null,
            },
            {
              label: "Fee covered by",
              value: isPaidByMerchant ? (
                isFreeDeliveryByStore ? (
                  <Tag color="cyan">Merchant / Store (Free Delivery Coupon)</Tag>
                ) : (
                  <Tag color="cyan">Merchant / Store</Tag>
                )
              ) : isPaidByAdmin ? (
                isFreeDeliveryByAdmin ? (
                  <Tag color="purple">Admin / Marketplace (Free Delivery Coupon)</Tag>
                ) : (
                  <Tag color="purple">Admin / Marketplace</Tag>
                )
              ) : (
                <Tag color="blue">Customer</Tag>
              ),
            },
            {
              label: "Customer delivery fee",
              value: !isPaidByCustomer
                ? `NPR 0.00 (${isFreeDeliveryByAdmin ? "Free - Marketplace Coupon" : isFreeDeliveryByStore ? "Free - Store Coupon" : isPaidByMerchant ? "Paid by Merchant" : "Paid by Admin"})`
                : formatMoney(Number(shipment.delivery_charge ?? 0)),
            },
          ]}
        />
      )}
    </SectionCard>
  );

  const activityTab = view && (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {view.tasks.length > 0 && (
        <SectionCard title="Shipment tasks" icon={<CarOutlined />}>
          <Table
            size="small"
            rowKey="id"
            dataSource={view.tasks}
            pagination={false}
            scroll={{ x: 700 }}
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
                render: (v) => formatDateTime(v),
              },
            ]}
          />
        </SectionCard>
      )}

      {view.trackingEvents.length > 0 && (
        <SectionCard title="Tracking timeline" icon={<HistoryOutlined />}>
          <Timeline
            items={view.trackingEvents.map((event) => ({
              color: event.status === "delivered" ? "green" : "blue",
              children: (
                <div>
                  <Text strong>{labelForStatus(event.status)}</Text>
                  <div>{event.description ?? event.note ?? "—"}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {event.location_text ? `${event.location_text} · ` : ""}
                    {formatDateTime(event.created_at)}
                  </Text>
                </div>
              ),
            }))}
          />
        </SectionCard>
      )}

      {view.statusLogs.length > 0 && (
        <SectionCard title="Status logs" icon={<InfoCircleOutlined />}>
          <Table
            size="small"
            rowKey="id"
            dataSource={view.statusLogs}
            pagination={false}
            columns={[
              {
                title: "Old",
                dataIndex: "old_status",
                render: (v) => v || "—",
              },
              {
                title: "New",
                dataIndex: "new_status",
                render: (v) => <WorkflowStatusTag status={v} />,
              },
              {
                title: "Note",
                dataIndex: "note",
                render: (v) => v || "—",
              },
              {
                title: "At",
                dataIndex: "created_at",
                render: (v) => formatDateTime(v),
              },
            ]}
          />
        </SectionCard>
      )}

      {view.notifications.length > 0 && (
        <SectionCard title="Notifications">
          <Table
            size="small"
            rowKey="id"
            dataSource={view.notifications}
            pagination={false}
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
                render: (v) => formatDateTime(v),
              },
            ]}
          />
        </SectionCard>
      )}

      {!view.tasks.length &&
        !view.trackingEvents.length &&
        !view.statusLogs.length &&
        !view.notifications.length && (
          <Empty description="No activity recorded yet" />
        )}
    </Space>
  );

  return (
    <Drawer
      open={!!open}
      onClose={onClose}
      placement="right"
      width={isMobile ? "100%" : Math.min(720, viewportWidth - 24)}
      destroyOnClose
      maskClosable
      title={
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Space align="center" wrap>
            <Text strong style={{ fontSize: 17 }}>
              {drawerTitle}
            </Text>
            {shipment?.status && <WorkflowStatusTag status={shipment.status} />}
            {shipment?.payment_type && (
              <Tag
                color={
                  String(shipment.payment_type).toLowerCase() === "pod"
                    ? "gold"
                    : "blue"
                }
              >
                {String(shipment.payment_type).toUpperCase()}
              </Tag>
            )}
            {shipment?.service_type && (
              <Tag color="purple">
                {String(shipment.service_type).replaceAll("_", " ")}
              </Tag>
            )}
          </Space>
          {shipment?.merchant_order_id && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Merchant order: {shipment.merchant_order_id}
              {view?.merchantName ? ` · ${view.merchantName}` : ""}
            </Text>
          )}
        </Space>
      }
      extra={
        <Space size={6} wrap>
          <Button
            icon={<PrinterOutlined />}
            onClick={printLabel}
            disabled={!shipment}
            size="small"
          >
            {isMobile ? null : "Print label"}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={load}
            loading={loading}
            size="small"
          >
            {isMobile ? null : "Refresh"}
          </Button>
        </Space>
      }
      styles={{
        header: {
          position: "sticky",
          top: 0,
          zIndex: 2,
          background: "#fff",
          padding: isMobile ? "10px 12px" : "12px 16px",
        },
        body: {
          background: "#f5f7fa",
          padding: "12px 16px 24px",
          display: "block",
          overflowY: "auto",
        },
      }}
    >
      {loading ? (
        <Card>
          <Space>
            <Spin />
            <Text>Loading shipment…</Text>
          </Space>
        </Card>
      ) : !shipment || !view ? (
        <Card>
          <Empty description="Shipment not found" />
        </Card>
      ) : (
        <Space
          direction="vertical"
          size={16}
          style={{ width: "100%", paddingBottom: 8 }}
        >
          {overviewTab}
          {routeTab}
          <ShipmentTransferHops shipmentId={shipment.id ?? shipmentId} />
          {partiesTab}
          {pricingTab || (
            <SectionCard title="Pricing breakdown" icon={<DollarOutlined />}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Pricing breakdown is not available for this shipment"
              />
            </SectionCard>
          )}
          <BranchShareBreakdown shipmentId={shipment.id ?? shipmentId} />
          {activityTab}
        </Space>
      )}
    </Drawer>
  );
}
