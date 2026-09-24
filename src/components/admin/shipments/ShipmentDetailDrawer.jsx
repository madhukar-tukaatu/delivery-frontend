"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
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
  EnvironmentOutlined,
  ShopOutlined,
  UserOutlined,
  CarOutlined,
  DollarOutlined,
  SwapOutlined,
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

const { Title, Text } = Typography;

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
    const name = firstValue(branch.name, branch.legal_name);
    if (!name) return fallbackId ? `Branch #${fallbackId}` : null;
    return branch.area ? `${name}, ${branch.area}` : name;
  }
  if (fallbackId) return `Branch #${fallbackId}`;
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

function SectionCard({ title, icon, children, extra }) {
  return (
    <Card
      size="small"
      title={
        <Space>
          {icon}
          <span>{title}</span>
        </Space>
      }
      extra={extra}
      styles={{ body: { paddingTop: 12 } }}
    >
      {children}
    </Card>
  );
}

function FieldDescriptions({ items, column = 1 }) {
  const visible = items.filter((item) => item.show !== false && hasText(item.value));
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

export default function ShipmentDetailDrawer({ open, shipmentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!shipmentId) return;
    try {
      setLoading(true);
      const response = await getAdminShipment(shipmentId);
      // getAdminShipment already normalizes; normalize again is idempotent
      setData(normalizeShipmentDetailResponse(response));
    } catch (error) {
      console.error("Could not load shipment:", error);
      message.error(error?.response?.data?.message ?? "Could not load shipment.");
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
      message.error(error?.response?.data?.message ?? "Workflow action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const shipment = data?.shipment ?? null;

  const view = useMemo(() => {
    if (!shipment) return null;

    const pickupLocation =
      shipment.pickup_location ?? shipment.pickupLocation ?? null;
    const merchant = shipment.merchant ?? null;
    const hop =
      shipment.hop_meta ??
      shipment.hopMeta ??
      data?.hop_meta ??
      null;
    const transferSummary =
      shipment.transfer_summary ??
      shipment.transferSummary ??
      data?.transfer_summary ??
      null;

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

    const hasSenderBlock = [senderName, senderPhone, senderAddress, senderCity, senderArea].some(
      hasText
    );

    const pickupLat = firstValue(
      shipment.pickup_lat,
      shipment.pickup_latitude,
      pickupLocation?.latitude
    );
    const pickupLng = firstValue(
      shipment.pickup_lng,
      shipment.pickup_longitude,
      pickupLocation?.longitude
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

    const trackingEvents =
      data?.tracking_events ??
      shipment.tracking_events ??
      shipment.trackingEvents ??
      [];
    const tasks = data?.tasks ?? shipment.tasks ?? [];
    const statusLogs = data?.status_logs ?? shipment.status_logs ?? [];
    const notifications = data?.notifications ?? shipment.notifications ?? [];
    const routeSteps = shipment.route_steps ?? shipment.routeSteps ?? [];

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
      delivery_charge: moneyValue(shipment.delivery_charge, shipment.delivery_fee),
    };
    const hasFeeColumns = Object.values(feeFromShipment).some(
      (v) => v !== null && v !== 0
    );

    const packetProducts = Array.isArray(shipment.packet_products)
      ? shipment.packet_products
      : typeof shipment.packet_products === "string"
        ? (() => {
            try {
              return JSON.parse(shipment.packet_products);
            } catch {
              return [];
            }
          })()
        : [];

    const originLabel =
      branchLabel(originBranch, shipment.origin_branch_id) ||
      hop?.origin_name ||
      transferSummary?.origin;
    const destinationLabel =
      branchLabel(destinationBranch, shipment.destination_branch_id) ||
      hop?.destination_name ||
      transferSummary?.destination;
    const currentLabel =
      branchLabel(currentBranch, shipment.current_branch_id) ||
      hop?.current_branch_name;
    const nextHopLabel =
      hop?.next_hop_name ||
      transferSummary?.next_hop ||
      branchLabel(nextHopBranch, shipment.next_hop_branch_id);

    const isTransfer =
      shipment.is_transfer === true ||
      (shipment.origin_branch_id &&
        shipment.destination_branch_id &&
        Number(shipment.origin_branch_id) !== Number(shipment.destination_branch_id));

    return {
      pickupLocation,
      merchant,
      hop,
      transferSummary,
      senderName,
      senderPhone,
      senderAddress,
      senderCity,
      senderArea,
      hasSenderBlock,
      pickupLat,
      pickupLng,
      deliveryLat,
      deliveryLng,
      trackingEvents: Array.isArray(trackingEvents) ? trackingEvents : [],
      tasks: Array.isArray(tasks) ? tasks : [],
      statusLogs: Array.isArray(statusLogs) ? statusLogs : [],
      notifications: Array.isArray(notifications) ? notifications : [],
      routeSteps: Array.isArray(routeSteps) ? routeSteps : [],
      priceBreakdown,
      feeFromShipment,
      hasFeeColumns,
      packetProducts,
      originLabel,
      destinationLabel,
      currentLabel,
      nextHopLabel,
      originSubLabel: branchLabel(originSub, shipment.origin_sub_branch_id),
      destinationSubLabel: branchLabel(destinationSub, shipment.destination_sub_branch_id),
      currentSubLabel: branchLabel(currentSub, shipment.current_sub_branch_id),
      isTransfer,
    };
  }, [shipment, data]);

  const drawerTitle = shipment?.tracking_number || "Shipment details";

  return (
    <Drawer
      open={!!open}
      onClose={onClose}
      width={Math.min(860, typeof window !== "undefined" ? window.innerWidth - 24 : 860)}
      destroyOnClose
      maskClosable
      title={
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 16 }}>
            {drawerTitle}
          </Text>
          {shipment?.merchant_order_id ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Merchant order: {shipment.merchant_order_id}
            </Text>
          ) : null}
        </Space>
      }
      extra={
        <Space wrap>
          {shipment?.status ? <WorkflowStatusTag status={shipment.status} /> : null}
          {shipment?.payment_type ? (
            <Tag color={String(shipment.payment_type).toLowerCase() === "pod" ? "gold" : "blue"}>
              {String(shipment.payment_type).toUpperCase()}
            </Tag>
          ) : null}
          {shipment?.service_type ? (
            <Tag color="purple">{String(shipment.service_type).replaceAll("_", " ")}</Tag>
          ) : null}
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Refresh
          </Button>
        </Space>
      }
      styles={{ body: { background: "#f7f8fa", padding: 16 } }}
    >
      {loading ? (
        <Card>
          <Space>
            <Spin />
            <Text>Loading shipment...</Text>
          </Space>
        </Card>
      ) : !shipment || !view ? (
        <Card>
          <Empty description="Shipment not found" />
        </Card>
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {/* Header summary */}
          <Card>
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
              <Col flex="auto">
                <Space direction="vertical" size={4}>
                  <Title level={4} style={{ margin: 0 }}>
                    {shipment.tracking_number}
                  </Title>
                  <Space wrap size={[8, 4]}>
                    <WorkflowStatusTag status={shipment.status} />
                    {shipment.merchant_status ? (
                      <Tag>Merchant: {labelForStatus(shipment.merchant_status)}</Tag>
                    ) : null}
                    {shipment.payment_type ? (
                      <Tag color={String(shipment.payment_type).toLowerCase() === "pod" ? "gold" : "blue"}>
                        {String(shipment.payment_type).toUpperCase()}
                      </Tag>
                    ) : null}
                    {shipment.service_type ? (
                      <Tag color="purple">{String(shipment.service_type).replaceAll("_", " ")}</Tag>
                    ) : null}
                    {shipment.pod_status && String(shipment.payment_type).toLowerCase() === "pod" ? (
                      <Tag>POD: {labelForStatus(shipment.pod_status)}</Tag>
                    ) : null}
                    {view.isTransfer ? <Tag icon={<SwapOutlined />} color="orange">Transfer</Tag> : null}
                  </Space>
                  <Text type="secondary">
                    {[
                      shipment.merchant_order_id
                        ? `Order ${shipment.merchant_order_id}`
                        : null,
                      view.merchant?.name ? `Merchant ${view.merchant.name}` : null,
                      shipment.source ? `Source ${shipment.source}` : null,
                      shipment.order_source ? `via ${shipment.order_source}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Money stats */}
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Delivery charge"
                  value={moneyValue(shipment.delivery_charge, shipment.delivery_fee) ?? 0}
                  precision={2}
                  prefix="NPR "
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="POD amount"
                  value={moneyValue(shipment.pod_amount) ?? 0}
                  precision={2}
                  prefix="NPR "
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Collectable"
                  value={
                    moneyValue(
                      shipment.total_collectable_amount,
                      shipment.total_collectable,
                      shipment.pod_amount
                    ) ?? 0
                  }
                  precision={2}
                  prefix="NPR "
                />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title="Distance"
                  value={moneyValue(shipment.route_distance_km) ?? 0}
                  precision={2}
                  suffix=" km"
                />
              </Card>
            </Col>
          </Row>

          {/* Transfer / hop strip */}
          {view.isTransfer || view.hop?.path_text || view.nextHopLabel ? (
            <SectionCard title="Transfer route" icon={<SwapOutlined />}>
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Space wrap>
                  <Tag>{displayOrDash(view.originLabel)}</Tag>
                  <Text type="secondary">→</Text>
                  {view.hop?.via?.length
                    ? view.hop.via.map((name) => (
                        <Tag key={name} color="cyan">
                          via {name}
                        </Tag>
                      ))
                    : null}
                  <Tag color="blue">{displayOrDash(view.destinationLabel)}</Tag>
                </Space>
                {view.hop?.path_text || view.transferSummary?.path_text ? (
                  <Text type="secondary">
                    Path: {view.hop?.path_text || view.transferSummary?.path_text}
                  </Text>
                ) : null}
                {(view.hop?.route_code || view.transferSummary?.route_code) && (
                  <Text type="secondary">
                    Route{" "}
                    {view.hop?.route_code || view.transferSummary?.route_code}
                    {view.hop?.route_name || view.transferSummary?.route_name
                      ? ` · ${view.hop?.route_name || view.transferSummary?.route_name}`
                      : ""}
                  </Text>
                )}
                {view.nextHopLabel ? (
                  <Text>
                    <Badge status="processing" /> Next hop:{" "}
                    <Text strong>{view.nextHopLabel}</Text>
                    {view.hop?.in_transit_label ? (
                      <Text type="secondary"> · {view.hop.in_transit_label}</Text>
                    ) : null}
                  </Text>
                ) : view.hop?.in_transit_label ? (
                  <Text type="secondary">{view.hop.in_transit_label}</Text>
                ) : null}
              </Space>
            </SectionCard>
          ) : null}

          {/* Branches */}
          <SectionCard title="Shipment location" icon={<EnvironmentOutlined />}>
            <FieldDescriptions
              column={{ xs: 1, sm: 2, md: 3 }}
              items={[
                { label: "Origin", value: view.originLabel },
                { label: "Destination", value: view.destinationLabel },
                { label: "Current branch", value: view.currentLabel },
                { label: "Next hop", value: view.nextHopLabel },
                { label: "Origin sub-branch", value: view.originSubLabel },
                { label: "Destination sub-branch", value: view.destinationSubLabel },
                { label: "Current sub-branch", value: view.currentSubLabel },
              ]}
            />
            {!view.originLabel && !view.destinationLabel && !view.currentLabel ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No branch assignments yet" />
            ) : null}
          </SectionCard>

          {/* Parcel / payment meta */}
          <SectionCard title="Parcel & payment" icon={<DollarOutlined />}>
            <FieldDescriptions
              column={{ xs: 1, sm: 2, md: 3 }}
              items={[
                { label: "Service", value: shipment.service_type },
                { label: "Payment", value: shipment.payment_type ? String(shipment.payment_type).toUpperCase() : null },
                {
                  label: "Charge paid by",
                  value: shipment.delivery_charge_paid_by,
                },
                { label: "Parcel type", value: shipment.parcel_type || shipment.package_type },
                { label: "Weight (kg)", value: shipment.weight != null ? String(shipment.weight) : null },
                { label: "Quantity", value: shipment.quantity != null ? String(shipment.quantity) : null },
                {
                  label: "Declared value",
                  value:
                    moneyValue(shipment.declared_value) != null
                      ? formatMoney(Number(shipment.declared_value))
                      : null,
                },
                { label: "Fragile", value: shipment.fragile != null ? (shipment.fragile ? "Yes" : "No") : null },
                { label: "Description", value: shipment.description || shipment.package_description },
                { label: "Remarks", value: shipment.remarks },
                { label: "Special instructions", value: shipment.special_instructions },
              ]}
            />
          </SectionCard>

          {/* Sender / Receiver */}
          <Row gutter={[12, 12]}>
            {view.hasSenderBlock || coordinateLabel(view.pickupLat, view.pickupLng) ? (
              <Col xs={24} lg={12}>
                <SectionCard title="Sender / Pickup" icon={<ShopOutlined />}>
                  <FieldDescriptions
                    items={[
                      { label: "Name", value: view.senderName },
                      { label: "Phone", value: view.senderPhone },
                      { label: "Address", value: view.senderAddress },
                      { label: "City", value: view.senderCity },
                      { label: "Area", value: view.senderArea },
                      {
                        label: "Coordinates",
                        value: coordinateLabel(view.pickupLat, view.pickupLng),
                      },
                      {
                        label: "Pickup location",
                        value: view.pickupLocation?.name,
                      },
                    ]}
                  />
                </SectionCard>
              </Col>
            ) : null}
            <Col xs={24} lg={view.hasSenderBlock || coordinateLabel(view.pickupLat, view.pickupLng) ? 12 : 24}>
              <SectionCard title="Receiver / Delivery" icon={<UserOutlined />}>
                <FieldDescriptions
                  items={[
                    {
                      label: "Name",
                      value: firstValue(shipment.receiver_name, shipment.customer_name),
                    },
                    {
                      label: "Phone",
                      value: firstValue(shipment.receiver_phone, shipment.customer_phone),
                    },
                    {
                      label: "Email",
                      value: firstValue(shipment.receiver_email, shipment.customer_email),
                    },
                    {
                      label: "Address",
                      value: firstValue(shipment.receiver_address, shipment.delivery_address),
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
          </Row>

          {/* Packet products */}
          {view.packetProducts.length > 0 ? (
            <SectionCard title="Packet products" icon={<ShopOutlined />}>
              <Table
                size="small"
                rowKey={(_, i) => `pp-${i}`}
                pagination={false}
                dataSource={view.packetProducts}
                columns={[
                  { title: "Name", dataIndex: "name", render: (v) => v || "—" },
                  { title: "Qty", dataIndex: "quantity", width: 70 },
                  {
                    title: "Unit price",
                    dataIndex: "unit_price",
                    render: (v) => (v != null ? formatMoney(Number(v)) : "—"),
                  },
                  {
                    title: "Tracking",
                    dataIndex: "product_tracking_number",
                    render: (v) => v || "—",
                  },
                ]}
              />
            </SectionCard>
          ) : null}

          {/* Workflow + route steps */}
          <ShipmentWorkflowActions
            shipment={shipment}
            loading={actionLoading}
            onReceiveOrigin={() =>
              runAction(() => receiveOriginSubBranch(shipment.id), "Received at origin sub-branch.")
            }
            onDispatchNext={() =>
              runAction(() => dispatchNextRouteStep(shipment.id), "Next route step dispatched.")
            }
            onReceiveCurrent={() =>
              runAction(() => receiveCurrentRouteStep(shipment.id), "Current route step received.")
            }
          />

          {/* Pricing */}
          {(view.priceBreakdown || view.hasFeeColumns) && (
            <SectionCard title="Pricing breakdown" icon={<DollarOutlined />}>
              {view.priceBreakdown ? (
                <FieldDescriptions
                  column={2}
                  items={[
                    {
                      label: "Base pickup fee",
                      value: formatMoney(Number(view.priceBreakdown.base_pickup_fee ?? 0)),
                    },
                    {
                      label: "Base delivery fee",
                      value: formatMoney(Number(view.priceBreakdown.base_delivery_fee ?? 0)),
                    },
                    {
                      label: "Transfer fee",
                      value: formatMoney(Number(view.priceBreakdown.base_transfer_fee ?? 0)),
                    },
                    {
                      label: "Pickup extra",
                      value: formatMoney(Number(view.priceBreakdown.pickup_extra_charge ?? 0)),
                    },
                    {
                      label: "Delivery extra",
                      value: formatMoney(Number(view.priceBreakdown.delivery_extra_charge ?? 0)),
                    },
                    {
                      label: "Weight charge",
                      value: formatMoney(Number(view.priceBreakdown.weight_charge ?? 0)),
                    },
                    {
                      label: "POD fee",
                      value: formatMoney(Number(view.priceBreakdown.pod_fee ?? 0)),
                    },
                    {
                      label: "Final price",
                      value: (
                        <strong>
                          {formatMoney(
                            Number(
                              view.priceBreakdown.final_price ??
                                shipment.delivery_charge ??
                                0
                            )
                          )}
                        </strong>
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
          )}

          {/* Tasks — only if data */}
          {view.tasks.length > 0 ? (
            <SectionCard title="Shipment tasks" icon={<CarOutlined />}>
              <Table
                size="small"
                rowKey="id"
                dataSource={view.tasks}
                pagination={false}
                scroll={{ x: 800 }}
                columns={[
                  { title: "Task", dataIndex: "task_number", render: (v) => v || "—" },
                  { title: "Type", dataIndex: "type", render: (v) => v || "—" },
                  {
                    title: "Status",
                    dataIndex: "status",
                    render: (v) => <WorkflowStatusTag status={v} />,
                  },
                  { title: "Priority", dataIndex: "priority", render: (v) => v || "—" },
                  {
                    title: "Due",
                    dataIndex: "due_at",
                    render: (v) => formatDateTime(v),
                  },
                ]}
              />
            </SectionCard>
          ) : null}

          {/* Tracking */}
          {view.trackingEvents.length > 0 ? (
            <SectionCard title="Tracking timeline" icon={<CarOutlined />}>
              <Timeline
                items={view.trackingEvents.map((event) => ({
                  color: event.status === "delivered" ? "green" : "blue",
                  children: (
                    <div>
                      <strong>{labelForStatus(event.status)}</strong>
                      <div>{event.description ?? event.note ?? "—"}</div>
                      <Text type="secondary">
                        {event.location_text ? `${event.location_text} · ` : ""}
                        {formatDateTime(event.created_at)}
                      </Text>
                    </div>
                  ),
                }))}
              />
            </SectionCard>
          ) : null}

          {/* Status logs */}
          {view.statusLogs.length > 0 ? (
            <SectionCard title="Status logs">
              <Table
                size="small"
                rowKey="id"
                dataSource={view.statusLogs}
                pagination={false}
                columns={[
                  { title: "Old", dataIndex: "old_status", render: (v) => v || "—" },
                  {
                    title: "New",
                    dataIndex: "new_status",
                    render: (v) => <WorkflowStatusTag status={v} />,
                  },
                  { title: "Note", dataIndex: "note", render: (v) => v || "—" },
                  {
                    title: "At",
                    dataIndex: "created_at",
                    render: (v) => formatDateTime(v),
                  },
                ]}
              />
            </SectionCard>
          ) : null}

          {/* Notifications */}
          {view.notifications.length > 0 ? (
            <SectionCard title="Notifications">
              <Table
                size="small"
                rowKey="id"
                dataSource={view.notifications}
                pagination={false}
                columns={[
                  { title: "Title", dataIndex: "title", render: (v) => v || "—" },
                  { title: "Message", dataIndex: "message", render: (v) => v || "—" },
                  { title: "Type", dataIndex: "type", render: (v) => v || "—" },
                  {
                    title: "Created",
                    dataIndex: "created_at",
                    render: (v) => formatDateTime(v),
                  },
                ]}
              />
            </SectionCard>
          ) : null}
        </Space>
      )}
    </Drawer>
  );
}
