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
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import {
  ReloadOutlined,
  EnvironmentOutlined,
  ShopOutlined,
  UserOutlined,
  CarOutlined,
  DollarOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import ShipmentWorkflowActions from "@/features/workflow/components/ShipmentWorkflowActions";
import WorkflowStatusTag from "@/features/workflow/components/WorkflowStatusTag";
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
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function branchLabel(branch, fallbackId) {
  if (branch && typeof branch === "object") {
    const name = firstValue(
      branch.name,
      branch.legal_name,
      branch.branch_name
    );
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
    (item) => item.show !== false && hasText(item.value)
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

function MoneyStat({ title, value, color }) {
  return (
    <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
      <Statistic
        title={
          <Text type="secondary" style={{ fontSize: 12 }}>
            {title}
          </Text>
        }
        value={value ?? 0}
        precision={2}
        prefix="NPR "
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
  const [activeTab, setActiveTab] = useState("overview");

  const load = async () => {
    if (!shipmentId) return;
    try {
      setLoading(true);
      const response = await getAdminShipment(shipmentId);
      setData(normalizeShipmentDetailResponse(response));
    } catch (error) {
      console.error("Could not load shipment:", error);
      message.error(
        error?.response?.data?.message ?? "Could not load shipment."
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !shipmentId) return;
    setActiveTab("overview");
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
        error?.response?.data?.message ?? "Workflow action failed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Support { data: {...} }, { shipment: {...} }, or flat model
  const shipment =
    data?.shipment ?? data?.data ?? (data?.id ? data : null);

  const view = useMemo(() => {
    if (!shipment) return null;

    const pickupLocation =
      shipment.pickup_location ?? shipment.pickupLocation ?? null;
    const merchant = shipment.merchant ?? null;
    const hop =
      shipment.hop_meta ?? shipment.hopMeta ?? data?.hop_meta ?? null;

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
      shipment.delivery_charge_breakdown ?? shipment.deliveryChargeBreakdown
    );
    const breakdownOrigin = breakdown?.pickup_branch?.name ?? null;
    const breakdownDest = breakdown?.delivery_branch?.name ?? null;

    const originLabel =
      firstValue(
        hop?.origin_name,
        branchLabel(originBranch, null),
        pathOrigin,
        breakdownOrigin
      ) || branchLabel(null, shipment.origin_branch_id);

    const destinationLabel =
      firstValue(
        hop?.destination_name,
        branchLabel(destinationBranch, null),
        pathDestination,
        breakdownDest
      ) || branchLabel(null, shipment.destination_branch_id);

    const currentLabel =
      firstValue(
        hop?.current_name,
        hop?.current_branch_name,
        branchLabel(currentBranch, null),
        Number(shipment.current_branch_id) ===
          Number(shipment.destination_branch_id)
          ? destinationLabel
          : null
      ) || branchLabel(null, shipment.current_branch_id);

    const nextHopLabel =
      firstValue(hop?.next_hop_name, branchLabel(nextHopBranch, null)) ||
      (shipment.next_hop_branch_id
        ? branchLabel(null, shipment.next_hop_branch_id)
        : null);

    // Sender: shipment → pickup location → merchant
    const senderName = firstValue(
      shipment.sender_name,
      pickupLocation?.contact_person,
      pickupLocation?.name,
      merchant?.owner_name,
      merchant?.contact_person,
      merchant?.name
    );
    const senderPhone = firstValue(
      shipment.sender_phone,
      pickupLocation?.phone,
      merchant?.phone
    );
    const senderEmail = firstValue(
      shipment.sender_email,
      pickupLocation?.email,
      merchant?.email
    );
    const senderAddress = firstValue(
      shipment.sender_address,
      pickupLocation?.address,
      merchant?.pickup_address,
      merchant?.address
    );
    const senderCity = firstValue(
      shipment.sender_city,
      pickupLocation?.city,
      merchant?.pickup_city,
      merchant?.city
    );
    const senderArea = firstValue(
      shipment.sender_area,
      pickupLocation?.area,
      merchant?.pickup_area,
      merchant?.area
    );

    const hasSenderBlock = [
      senderName,
      senderPhone,
      senderEmail,
      senderAddress,
      senderCity,
      senderArea,
      merchant?.name,
      pickupLocation?.name,
    ].some(hasText);

    const pickupLat = firstValue(
      shipment.pickup_lat,
      shipment.pickup_latitude,
      pickupLocation?.latitude,
      pickupLocation?.lat
    );
    const pickupLng = firstValue(
      shipment.pickup_lng,
      shipment.pickup_longitude,
      pickupLocation?.longitude,
      pickupLocation?.lng
    );
    const deliveryLat = firstValue(
      shipment.delivery_lat,
      shipment.delivery_latitude,
      shipment.receiver_latitude
    );
    const deliveryLng = firstValue(
      shipment.delivery_lng,
      shipment.delivery_longitude,
      shipment.receiver_longitude
    );

    const trackingEvents = Array.isArray(
      data?.tracking_events ??
        shipment.tracking_events ??
        shipment.trackingEvents
    )
      ? data?.tracking_events ??
        shipment.tracking_events ??
        shipment.trackingEvents
      : [];

    const tasks = Array.isArray(data?.tasks ?? shipment.tasks)
      ? data?.tasks ?? shipment.tasks
      : [];
    const statusLogs = Array.isArray(
      data?.status_logs ?? shipment.status_logs
    )
      ? data?.status_logs ?? shipment.status_logs
      : [];
    const notifications = Array.isArray(
      data?.notifications ?? shipment.notifications
    )
      ? data?.notifications ?? shipment.notifications
      : [];
    const routeSteps = Array.isArray(
      shipment.route_steps ?? shipment.routeSteps
    )
      ? shipment.route_steps ?? shipment.routeSteps
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
        shipment.delivery_fee
      ),
    };
    const hasFeeColumns = Object.values(feeFromShipment).some(
      (v) => v !== null && v !== 0
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
      merchantName: merchant?.name ?? null,
      pickupLocationName: pickupLocation?.name ?? null,
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
      originSubLabel: branchLabel(originSub, shipment.origin_sub_branch_id),
      destinationSubLabel: branchLabel(
        destinationSub,
        shipment.destination_sub_branch_id
      ),
      currentSubLabel: branchLabel(
        currentSub,
        shipment.current_sub_branch_id
      ),
      isTransfer,
      pathText,
      viaNames,
      transferStageLabel:
        shipment.transfer_stage_label || shipment.transferStageLabel,
    };
  }, [shipment, data]);

  const drawerTitle = shipment?.tracking_number || "Shipment details";

  /* ---- tabs ---- */

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
        <Col xs={12} sm={6}>
          <MoneyStat
            title="Delivery charge"
            value={moneyValue(shipment.delivery_charge, shipment.delivery_fee)}
            color="#0891B2"
          />
        </Col>
        <Col xs={12} sm={6}>
          <MoneyStat
            title="POD amount"
            value={moneyValue(shipment.pod_amount)}
            color="#D97706"
          />
        </Col>
        <Col xs={12} sm={6}>
          <MoneyStat
            title="Collectable"
            value={moneyValue(
              shipment.total_collectable_amount,
              shipment.total_collectable,
              shipment.pod_amount
            )}
            color="#059669"
          />
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
            <Statistic
              title={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Distance
                </Text>
              }
              value={moneyValue(shipment.route_distance_km) ?? 0}
              precision={2}
              suffix=" km"
              valueStyle={{ fontSize: 18, fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <SectionCard title="Current location" icon={<EnvironmentOutlined />}>
        <FieldDescriptions
          column={{ xs: 1, sm: 2 }}
          items={[
            { label: "Origin", value: view.originLabel },
            { label: "Destination", value: view.destinationLabel },
            { label: "Current branch", value: view.currentLabel },
            { label: "Next hop", value: view.nextHopLabel },
            { label: "Origin sub-branch", value: view.originSubLabel },
            {
              label: "Destination sub-branch",
              value: view.destinationSubLabel,
            },
            { label: "Current sub-branch", value: view.currentSubLabel },
          ]}
        />
        {!view.originLabel &&
          !view.destinationLabel &&
          !view.currentLabel && (
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
              value: shipment.delivery_charge_paid_by,
            },
            {
              label: "Parcel type",
              value: shipment.parcel_type || shipment.package_type,
            },
            {
              label: "Weight (kg)",
              value: shipment.weight != null ? String(shipment.weight) : null,
            },
            {
              label: "Quantity",
              value:
                shipment.quantity != null ? String(shipment.quantity) : null,
            },
            {
              label: "Declared value",
              value:
                moneyValue(shipment.declared_value) != null
                  ? formatMoney(Number(shipment.declared_value))
                  : null,
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

      <SectionCard title="Branch assignments" icon={<EnvironmentOutlined />}>
        <FieldDescriptions
          column={{ xs: 1, sm: 2 }}
          items={[
            { label: "Origin", value: view.originLabel },
            { label: "Destination", value: view.destinationLabel },
            { label: "Current branch", value: view.currentLabel },
            { label: "Next hop", value: view.nextHopLabel },
            { label: "Origin sub-branch", value: view.originSubLabel },
            {
              label: "Destination sub-branch",
              value: view.destinationSubLabel,
            },
            { label: "Current sub-branch", value: view.currentSubLabel },
          ]}
        />
      </SectionCard>

      <ShipmentWorkflowActions
        shipment={shipment}
        loading={actionLoading}
        onReceiveOrigin={() =>
          runAction(
            () => receiveOriginSubBranch(shipment.id),
            "Received at origin sub-branch."
          )
        }
        onDispatchNext={() =>
          runAction(
            () => dispatchNextRouteStep(shipment.id),
            "Next route step dispatched."
          )
        }
        onReceiveCurrent={() =>
          runAction(
            () => receiveCurrentRouteStep(shipment.id),
            "Current route step received."
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
          <SectionCard title="Sender / Pickup" icon={<ShopOutlined />}>
            <FieldDescriptions
              items={[
                { label: "Merchant", value: view.merchantName },
                {
                  label: "Pickup location",
                  value: view.pickupLocationName,
                },
                { label: "Contact name", value: view.senderName },
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
          view.hasSenderBlock ||
          coordinateLabel(view.pickupLat, view.pickupLng)
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
                  shipment.customer_name
                ),
              },
              {
                label: "Phone",
                value: firstValue(
                  shipment.receiver_phone,
                  shipment.customer_phone
                ),
              },
              {
                label: "Email",
                value: firstValue(
                  shipment.receiver_email,
                  shipment.customer_email
                ),
              },
              {
                label: "Address",
                value: firstValue(
                  shipment.receiver_address,
                  shipment.delivery_address
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
                  render: (v) =>
                    v != null ? formatMoney(Number(v)) : "—",
                },
                {
                  title: "Tracking",
                  dataIndex: "product_tracking_number",
                  render: (v) => v || "—",
                },
              ]}
            />
          </SectionCard>
        </Col>
      )}
    </Row>
  );

  const pricingTab =
    view &&
    (view.priceBreakdown || view.hasFeeColumns) && (
      <SectionCard title="Pricing breakdown" icon={<DollarOutlined />}>
        {view.priceBreakdown ? (
          <FieldDescriptions
            column={2}
            items={[
              {
                label: "Base pickup fee",
                value: formatMoney(
                  Number(view.priceBreakdown.base_pickup_fee ?? 0)
                ),
              },
              {
                label: "Base delivery fee",
                value: formatMoney(
                  Number(view.priceBreakdown.base_delivery_fee ?? 0)
                ),
              },
              {
                label: "Transfer fee",
                value: formatMoney(
                  Number(view.priceBreakdown.base_transfer_fee ?? 0)
                ),
              },
              {
                label: "Pickup extra",
                value: formatMoney(
                  Number(view.priceBreakdown.pickup_extra_charge ?? 0)
                ),
              },
              {
                label: "Delivery extra",
                value: formatMoney(
                  Number(view.priceBreakdown.delivery_extra_charge ?? 0)
                ),
              },
              {
                label: "Weight charge",
                value: formatMoney(
                  Number(view.priceBreakdown.weight_charge ?? 0)
                ),
              },
              {
                label: "POD fee",
                value: formatMoney(
                  Number(view.priceBreakdown.pod_fee ?? 0)
                ),
              },
              {
                label: "Final price",
                value: (
                  <Text strong>
                    {formatMoney(
                      Number(
                        view.priceBreakdown.final_price ??
                          shipment.delivery_charge ??
                          0
                      )
                    )}
                  </Text>
                ),
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
      width={Math.min(
        920,
        typeof window !== "undefined" ? window.innerWidth - 24 : 920
      )}
      destroyOnClose
      maskClosable
      title={
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Space align="center" wrap>
            <Text strong style={{ fontSize: 17 }}>
              {drawerTitle}
            </Text>
            {shipment?.status && (
              <WorkflowStatusTag status={shipment.status} />
            )}
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
        <Button
          icon={<ReloadOutlined />}
          onClick={load}
          loading={loading}
          size="small"
        >
          Refresh
        </Button>
      }
      styles={{
        body: {
          background: "#f5f7fa",
          padding: "12px 16px 24px",
          display: "flex",
          flexDirection: "column",
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
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="small"
          style={{ flex: 1 }}
          items={[
            {
              key: "overview",
              label: (
                <Space size={6}>
                  <CheckCircleOutlined />
                  Overview
                </Space>
              ),
              children: overviewTab,
            },
            {
              key: "route",
              label: (
                <Space size={6}>
                  <SwapOutlined />
                  Route & Actions
                </Space>
              ),
              children: routeTab,
            },
            {
              key: "parties",
              label: (
                <Space size={6}>
                  <UserOutlined />
                  Parties & Items
                </Space>
              ),
              children: partiesTab,
            },
            ...(view.priceBreakdown || view.hasFeeColumns
              ? [
                  {
                    key: "pricing",
                    label: (
                      <Space size={6}>
                        <DollarOutlined />
                        Pricing
                      </Space>
                    ),
                    children: pricingTab,
                  },
                ]
              : []),
            {
              key: "activity",
              label: (
                <Space size={6}>
                  <HistoryOutlined />
                  Activity
                  {(view.trackingEvents.length > 0 ||
                    view.tasks.length > 0) && (
                    <Badge
                      count={
                        view.trackingEvents.length + view.tasks.length
                      }
                      size="small"
                      style={{ backgroundColor: "#0891B2" }}
                    />
                  )}
                </Space>
              ),
              children: activityTab,
            },
          ]}
        />
      )}
    </Drawer>
  );
}