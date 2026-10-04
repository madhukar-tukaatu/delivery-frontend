"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Pagination,
  Radio,
  Row,
  Segmented,
  Space,
  Spin,
  Statistic,
  Steps,
  Tag,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  MenuOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  staffAcceptDelivery,
  staffArriveAtDelivery,
  staffCreatePodPayment,
  staffGetDeliveries,
  staffGetPodPayment,
  staffMarkDelivered,
  staffMarkFailed,
  staffOutForDelivery,
} from "@/services/deliveryOperationsApi";
import { QRCodeSVG } from "qrcode.react";
import styles from "./deliveries.module.css";

const STATUS_COLORS = {
  assigned: "gold",
  accepted: "blue",
  out_for_delivery: "cyan",
  delivered: "green",
  failed: "red",
  pending: "default",
};

const STATUS_DISPLAY = {
  assigned: "Assigned",
  accepted: "Accepted",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  failed: "Failed",
  pending: "Pending",
};

function paymentTypeOf(delivery) {
  return String(delivery?.shipment?.payment_type || "").toLowerCase();
}


function apiErrorMessage(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;
  if (!data) {
    return error?.message || fallback;
  }

  const bag = data.errors;
  if (bag && typeof bag === "object") {
    const first = Object.values(bag)
      .flat()
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .find(Boolean);
    if (first) return first;
  }

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  return error?.message || fallback;
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

const CHECKOUT_PARAM_KEYS = [
  "merchant_id",
  "session_id",
  "token",
  "merchant_transaction_id",
  "remarks",
  "success_url",
  "failure_url",
];

// HamroPay checkout: payment_url plus params. qr_string is often null.
function paymentCheckoutLink(session) {
  const base = firstNonEmptyString(
    session?.payment_url,
    session?.payment?.checkout_url
  );
  if (!base) return "";

  const params = session?.params;
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    return base;
  }

  let url;
  try {
    url = new URL(base);
  } catch {
    return base;
  }

  for (const key of CHECKOUT_PARAM_KEYS) {
    const value = params[key];
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}


function firstCoordinateValue(values) {
  return values.find(
    (value) =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
  );
}

function destinationCoordinates(delivery) {
  const shipment = delivery?.shipment || {};
  const latitude = Number(
    firstCoordinateValue([
      shipment.delivery_lat,
      shipment.delivery_latitude,
      shipment.receiver_latitude,
      shipment.latitude,
    ])
  );
  const longitude = Number(
    firstCoordinateValue([
      shipment.delivery_lng,
      shipment.delivery_longitude,
      shipment.receiver_longitude,
      shipment.longitude,
    ])
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const destination = `${latitude.toFixed(7)},${longitude.toFixed(7)}`;
  const encodedDestination = encodeURIComponent(destination);

  return {
    latitude,
    longitude,
    label: `${latitude.toFixed(7)}, ${longitude.toFixed(7)}`,
    googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`,
    appleMapsUrl: `https://maps.apple.com/?daddr=${encodedDestination}`,
    openStreetMapUrl: `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
      latitude
    )}&mlon=${encodeURIComponent(longitude)}#map=18/${latitude}/${longitude}`,
  };
}

function isPodDelivery(delivery) {
  return ["pod", "cod", "to_pay"].includes(paymentTypeOf(delivery));
}

function collectableAmount(delivery) {
  const shipment = delivery?.shipment || {};

  return Number(
    shipment.total_collectable_amount ||
      shipment.total_collectable ||
      delivery?.total_collectable ||
      shipment.pod_amount ||
      0
  );
}

function isCollectable(delivery) {
  return isPodDelivery(delivery) && collectableAmount(delivery) > 0;
}

function isPrepaidDelivery(delivery) {
  return !isCollectable(delivery);
}

function completionTypeOf(delivery, paymentMethod = "cash") {
  if (!isCollectable(delivery)) return "prepaid";
  return paymentMethod === "online" ? "pod_online" : "pod_cash";
}

function canCompleteDelivery(delivery) {
  return (
    delivery?.status === "out_for_delivery" &&
    !!delivery?.arrived_at
  );
}

function paymentTypeLabel(delivery) {
  const type = paymentTypeOf(delivery);
  if (["pod", "cod", "to_pay"].includes(type)) {
    return collectableAmount(delivery) > 0 ? "POD (collect at door)" : "POD (nothing due)";
  }
  if (["prepaid", "paid", "online"].includes(type) || type === "") {
    return "Prepaid";
  }
  return type || "Prepaid";
}

function deliveryProgressStep(delivery) {
  if (delivery?.status === "delivered") return 4;
  if (delivery?.arrived_at) return 3;
  if (delivery?.status === "out_for_delivery") return 2;
  if (delivery?.status === "accepted") return 1;
  return 0;
}

function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.clientWidth || 360;
    const height = canvas.clientHeight || 160;
    const ratio = window.devicePixelRatio || 1;
    const context = canvas.getContext("2d");

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#111827";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";

    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, width, height);
      image.src = value;
    }
  }, [value]);

  function pointFromEvent(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event) {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = pointFromEvent(event);

    canvas.setPointerCapture?.(event.pointerId);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event) {
    if (!drawingRef.current) return;

    const context = canvasRef.current.getContext("2d");
    const point = pointFromEvent(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function finishDrawing() {
    if (!drawingRef.current) return;

    drawingRef.current = false;
    onChange?.(canvasRef.current.toDataURL("image/png"));
  }

  function clear() {
    onChange?.("");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        aria-label="Customer signature"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={finishDrawing}
        onPointerCancel={finishDrawing}
        style={{
          display: "block",
          width: "100%",
          height: 160,
          border: "1px dashed #9ca3af",
          borderRadius: 6,
          background: "#ffffff",
          touchAction: "none",
        }}
      />
      <Button type="link" size="small" onClick={clear} style={{ paddingLeft: 0 }}>
        Clear signature
      </Button>
    </div>
  );
}

function CustomerReceiptFields() {
  return (
    <Card size="small" title="Receiver confirmation" style={{ marginBottom: 0 }}>
      <Form.Item
        name="customer_confirmed"
        valuePropName="checked"
        rules={[
          {
            validator: (_, value) =>
              value
                ? Promise.resolve()
                : Promise.reject(
                    new Error("Receiver confirmation is required.")
                  ),
          },
        ]}
      >
        <Checkbox>
          The receiver confirms that the parcel was received in good condition.
        </Checkbox>
      </Form.Item>

      <Form.Item
        name="customer_name"
        label="Received by"
        rules={[
          { required: true, message: "Enter the receiving customer name." },
          { max: 191, message: "The name is too long." },
        ]}
      >
        <Input placeholder="Name of the person receiving the parcel" />
      </Form.Item>

      <Form.Item
        name="customer_signature"
        label="Receiver signature"
        rules={[
          {
            required: true,
            message: "Ask the receiver to sign before completing delivery.",
          },
        ]}
        extra="The signature is stored privately as delivery proof."
      >
        <SignaturePad />
      </Form.Item>
    </Card>
  );
}

export default function StaffDeliveriesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failedRow, setFailedRow] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [paymentDelivery, setPaymentDelivery] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentSessionLoading, setPaymentSessionLoading] = useState(false);
  const [paymentSessionError, setPaymentSessionError] = useState("");
  const [paymentSessionRetry, setPaymentSessionRetry] = useState(0);
  const [busyAction, setBusyAction] = useState("");
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const paymentMethod = Form.useWatch("payment_method", paymentForm) || "cash";
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    setLoading(true);
    try {
      const nextRows = await staffGetDeliveries({ per_page: 100 });
      setRows(nextRows);
      setSelectedDelivery((current) => {
        if (!current) return current;

        return nextRows.find((row) => row.id === current.id) || current;
      });

      return nextRows;
    } catch {
      message.error("Could not load deliveries.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (
      !paymentDelivery ||
      !isCollectable(paymentDelivery) ||
      paymentMethod !== "online"
    ) {
      setPaymentSession(null);
      setPaymentSessionError("");
      setPaymentSessionLoading(false);
      return undefined;
    }

    let cancelled = false;
    setPaymentSession(null);
    setPaymentSessionError("");
    setPaymentSessionLoading(true);

    staffCreatePodPayment(paymentDelivery.id)
      .then((session) => {
        if (!cancelled) {
          setPaymentSession(session || null);
          // Setup / provider failures on create are returned as HTTP 422 (catch).
          // If a session still comes back failed, show it once via the failed Alert below.
          setPaymentSessionError("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPaymentSession(null);
          setPaymentSessionError(
            apiErrorMessage(
              error,
              "Could not create the online POD payment session."
            )
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPaymentSessionLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [paymentDelivery, paymentMethod, paymentSessionRetry]);

  useEffect(() => {
    if (
      !paymentDelivery ||
      !isCollectable(paymentDelivery) ||
      paymentMethod !== "online" ||
      !(paymentSession?.payment_session_id || paymentSession?.session_id) ||
      !["pending", "ready"].includes(paymentSession.status)
    ) {
      return undefined;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const session = await staffGetPodPayment(
          paymentDelivery.id,
          false
        );

        if (!cancelled && session) {
          setPaymentSession(session);
          // Failed status is shown once by the status Alert (avoid duplicating last_error).
          setPaymentSessionError("");
        }
      } catch (error) {
        if (!cancelled) {
          setPaymentSessionError(
            apiErrorMessage(
              error,
              "Could not refresh the payment status."
            )
          );
        }
      }
    };

    // Poll immediately, then every 4s, so paid status is not delayed one interval.
    poll();
    const interval = setInterval(poll, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    paymentDelivery,
    paymentMethod,
    paymentSession?.payment_session_id,
    paymentSession?.session_id,
    paymentSession?.status,
  ]);

  async function run(action, actionKey = "") {
    if (actionKey && busyAction) return false;

    if (actionKey) setBusyAction(actionKey);

    try {
      const result = await action();
      message.success("Updated.");
      setFailedRow(null);
      form.resetFields();
      await load();
      return result ?? true;
    } catch (e) {
      message.error(e?.response?.data?.message || "Action failed.");
      return false;
    } finally {
      if (actionKey) setBusyAction("");
    }
  }

  async function arriveAtLocation(delivery) {
    const result = await run(
      () => staffArriveAtDelivery(delivery.id),
      `arrive:${delivery.id}`
    );

    if (!result) return;

    const arrivedDelivery = {
      ...delivery,
      ...(typeof result === "object" ? result : {}),
      arrived_at:
        result?.arrived_at || delivery.arrived_at || new Date().toISOString(),
    };

    setSelectedDelivery(arrivedDelivery);
    openDeliveryConfirmation(arrivedDelivery);
  }

  function openDeliveryConfirmation(delivery) {
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      ...(isCollectable(delivery) ? { payment_method: "cash" } : {}),
      customer_confirmed: false,
      customer_name: "",
      customer_signature: "",
    });
    setPaymentSession(null);
    setPaymentSessionError("");
    setPaymentSessionLoading(false);
    setPaymentDelivery(delivery);
  }

  function closePaymentConfirmation() {
    setPaymentDelivery(null);
    setPaymentSession(null);
    setPaymentSessionError("");
    setPaymentSessionLoading(false);
    paymentForm.resetFields();
  }

  async function retryPaymentSession() {
    if (!paymentDelivery) {
      setPaymentSessionRetry((value) => value + 1);
      return;
    }

    setPaymentSessionError("");
    setPaymentSessionLoading(true);
    try {
      const session = await staffGetPodPayment(paymentDelivery.id, true);
      if (session) {
        setPaymentSession(session);
        setPaymentSessionError("");
        return;
      }
    } catch (error) {
      setPaymentSessionError(
        apiErrorMessage(error, "Could not retry the payment session.")
      );
    } finally {
      setPaymentSessionLoading(false);
    }

    setPaymentSession(null);
    setPaymentSessionRetry((value) => value + 1);
  }

  async function submitDeliveryPayment() {
    if (!paymentDelivery) return;

    let values;
    try {
      values = await paymentForm.validateFields();
    } catch {
      return;
    }

    const collectable = isCollectable(paymentDelivery);

    if (
      collectable &&
      values.payment_method === "online" &&
      paymentSession?.status !== "paid"
    ) {
      message.warning(
        "Wait until the online payment is confirmed as paid."
      );
      return;
    }

    if (!canCompleteDelivery(paymentDelivery)) {
      message.warning("Arrive at the delivery location before completing.");
      return;
    }

    const receiptProof = {
      customer_confirmed: true,
      customer_name: String(values.customer_name || "").trim(),
      customer_signature: values.customer_signature,
    };

    if (!values.customer_confirmed) {
      message.warning("Customer confirmation is required.");
      return;
    }

    const payload = collectable
      ? {
          ...receiptProof,
          payment_method: values.payment_method,
          pod_collected_amount: collectableAmount(paymentDelivery),
          ...(values.payment_method === "online" || values.payment_method === "qr"
            ? {
                merchant_txn_id:
                  paymentSession?.merchant_txn_id ||
                  paymentSession?.session_id ||
                  paymentSession?.payment_session_id,
                payment_session_id:
                  paymentSession?.session_id ||
                  paymentSession?.payment_session_id ||
                  paymentSession?.merchant_txn_id,
                payment_reference:
                  paymentSession?.payment_reference ||
                  paymentSession?.transaction_id ||
                  paymentSession?.merchant_txn_id ||
                  paymentSession?.session_id ||
                  paymentSession?.payment_session_id,
                paid: paymentSession?.status === "paid" || paymentSession?.paid === true,
              }
            : {}),
        }
      : receiptProof;

    const success = await run(
      () => staffMarkDelivered(paymentDelivery.id, payload),
      `deliver:${paymentDelivery.id}`
    );

    if (success) {
      closePaymentConfirmation();
      setSelectedDelivery(null);
    }
  }

  const filteredRows = useMemo(() => {
    let result =
      filterStatus === "all"
        ? rows
        : rows.filter((row) => row.status === filterStatus);

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(
        (row) =>
          row.shipment?.tracking_number?.toLowerCase().includes(search) ||
          row.shipment?.receiver_name?.toLowerCase().includes(search) ||
          row.shipment?.receiver_phone?.includes(search) ||
          row.shipment?.delivery_address?.toLowerCase().includes(search)
      );
    }

    return result;
  }, [rows, filterStatus, searchText]);

  const paginatedRows =
    viewMode === "list"
      ? filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : filteredRows;

  const statusCounts = useMemo(
    () =>
      rows.reduce(
        (counts, row) => {
          const status = row.status || "unknown";
          counts[status] = (counts[status] || 0) + 1;
          counts.all += 1;
          return counts;
        },
        { all: 0, assigned: 0, accepted: 0, out_for_delivery: 0, delivered: 0, failed: 0 }
      ),
    [rows]
  );

  const statusTabs = [
    { label: `All (${statusCounts.all})`, value: "all" },
    {
      label: `Assigned (${statusCounts.assigned})`,
      value: "assigned",
    },
    {
      label: `Accepted (${statusCounts.accepted})`,
      value: "accepted",
    },
    {
      label: `Out for Delivery (${statusCounts.out_for_delivery})`,
      value: "out_for_delivery",
    },
    {
      label: `Delivered (${statusCounts.delivered})`,
      value: "delivered",
    },
    {
      label: `Failed (${statusCounts.failed})`,
      value: "failed",
    },
  ];

  const renderListItem = (delivery) => {
    const shipment = delivery.shipment || {};
    const deliveryIsCollectable = isCollectable(delivery);
    const amount = collectableAmount(delivery);

    return (
      <List.Item
        key={delivery.id}
        className={styles.listItem}
        onClick={() => setSelectedDelivery(delivery)}
        style={{ cursor: "pointer" }}
        extra={
          <Tag color={STATUS_COLORS[delivery.status]}>
            {STATUS_DISPLAY[delivery.status]}
          </Tag>
        }
      >
        <List.Item.Meta
          avatar={
            <Badge
              count={deliveryIsCollectable ? `Rs.${amount.toFixed(2)}` : null}
              style={{ backgroundColor: "#faad14" }}
            >
              <Avatar style={{ backgroundColor: "#1890ff" }} size={48}>
                {shipment.receiver_name?.charAt(0) || "?"}
              </Avatar>
            </Badge>
          }
          title={
            <div>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>
                {shipment.tracking_number || "N/A"}
              </div>
              <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                {shipment.receiver_name || "N/A"}
              </div>
            </div>
          }
          description={
            <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
              <div>
                {(shipment.delivery_address || shipment.receiver_address || "N/A").substring(
                  0,
                  60
                )}
                ...
              </div>
              <div style={{ marginTop: "4px" }}>
                <PhoneOutlined style={{ marginRight: "4px" }} />
                {shipment.receiver_phone || "N/A"}
              </div>
            </div>
          }
        />
      </List.Item>
    );
  };

  const renderDetailedCard = (delivery) => {
    const shipment = delivery.shipment || {};
    const deliveryIsCollectable = isCollectable(delivery);
    const amount = collectableAmount(delivery);

    return (
      <Card
        key={delivery.id}
        className={styles.deliveryCard}
        style={{ marginBottom: "16px" }}
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "14px", color: "#666" }}>Tracking: </span>
              <span style={{ fontSize: "16px", fontWeight: "bold" }}>
                {shipment.tracking_number || "N/A"}
              </span>
            </div>
            <Tag color={STATUS_COLORS[delivery.status]}>
              {STATUS_DISPLAY[delivery.status]}
            </Tag>
          </div>
        }
        extra={
          <Button
            size="small"
            type="text"
            icon={<FileTextOutlined />}
            onClick={() => setSelectedDelivery(delivery)}
          >
            Details
          </Button>
        }
      >
        <div className={styles.cardContent}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Customer"
                value={shipment.receiver_name || "N/A"}
                valueStyle={{ fontSize: "12px" }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Phone"
                value={
                  <a href={`tel:${shipment.receiver_phone}`} style={{ color: "#0066cc" }}>
                    {shipment.receiver_phone || "N/A"}
                  </a>
                }
                valueStyle={{ fontSize: "12px" }}
              />
            </Col>
            {deliveryIsCollectable && (
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="POD collection"
                  value={amount}
                  prefix="Rs."
                  precision={2}
                  valueStyle={{ fontSize: "14px", color: "#faad14", fontWeight: "bold" }}
                />
              </Col>
            )}
            <Col xs={24} sm={12} md={6}>
              <Statistic
                title="Items"
                value={shipment.packet_products?.length || 0}
                valueStyle={{ fontSize: "12px" }}
              />
            </Col>
          </Row>

          <div
            style={{
              marginTop: "16px",
              backgroundColor: "#f5f5f5",
              padding: "12px",
              borderRadius: "4px",
              lineHeight: "1.6",
              fontSize: "12px",
            }}
          >
            <EnvironmentOutlined style={{ marginRight: "6px", color: "#ff6b35" }} />
            {shipment.delivery_address || shipment.receiver_address || "N/A"}
          </div>

          <div className={styles.actionSection} style={{ marginTop: "16px" }}>
            <Space wrap size="small">
              <Button
                size="small"
                type="primary"
                disabled={delivery.status !== "assigned" || !!busyAction}
                loading={busyAction === `accept:${delivery.id}`}
                onClick={() => run(() => staffAcceptDelivery(delivery.id), `accept:${delivery.id}`)}
              >
                Accept
              </Button>
              <Button
                size="small"
                disabled={
                  !!busyAction ||
                  !["accepted", "assigned"].includes(delivery.status)
                }
                loading={busyAction === `out:${delivery.id}`}
                onClick={() => run(() => staffOutForDelivery(delivery.id), `out:${delivery.id}`)}
              >
                Out For Delivery
              </Button>
              <Button
                size="small"
                type={delivery.arrived_at ? "default" : "primary"}
                disabled={
                  !!busyAction ||
                  delivery.status !== "out_for_delivery" ||
                  !!delivery.arrived_at
                }
                loading={busyAction === `arrive:${delivery.id}`}
                onClick={() => arriveAtLocation(delivery)}
              >
                {delivery.arrived_at ? "At Location" : "Arrived at Location"}
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                disabled={
                  !!busyAction ||
                  delivery.status !== "out_for_delivery" ||
                  !canCompleteDelivery(delivery)
                }
                loading={busyAction === `deliver:${delivery.id}`}
                onClick={() => openDeliveryConfirmation(delivery)}
              >
                {canCompleteDelivery(delivery) ? (isCollectable(delivery) ? "Collect & complete" : "Confirm receipt & complete") : "Complete after arrival"}
              </Button>
              <Button
                size="small"
                danger
                disabled={delivery.status !== "out_for_delivery" || !!busyAction}
                onClick={() => setFailedRow(delivery)}
              >
                Failed
              </Button>
            </Space>
          </div>
        </div>
      </Card>
    );
  };

  const renderDetailedDrawer = (delivery) => {
    if (!delivery) return null;

    const shipment = delivery.shipment || {};
    const deliveryIsCollectable = isCollectable(delivery);
    const amount = collectableAmount(delivery);
    const coordinates = destinationCoordinates(delivery);

    return (
      <Drawer
        title={`Delivery Details - ${shipment.tracking_number || "N/A"}`}
        placement="right"
        width={500}
        onClose={() => setSelectedDelivery(null)}
        open={!!selectedDelivery}
      >
        <div className={styles.drawerContent}>
          <Card size="small" style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 10,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Delivery progress
            </div>
            <Steps
              size="small"
              current={deliveryProgressStep(delivery)}
              status={delivery.status === "failed" ? "error" : undefined}
              items={[
                { title: "Assigned" },
                { title: "Accepted" },
                { title: "On the way" },
                { title: "At location" },
                { title: "Completed" },
              ]}
            />
          </Card>

          {delivery.arrived_at && delivery.status === "out_for_delivery" && (
            <Alert
              type="success"
              showIcon
              message="You are at the delivery location"
              description={
                deliveryIsCollectable
                  ? "Collect the exact amount directly for the merchant, or verify the online QR payment before completing delivery."
                  : "Prepaid: confirm receiver name and signature only - no cash or QR collection."
              }
              style={{ marginBottom: 16 }}
            />
          )}

          <div className={styles.section}>
            <h4 style={{ marginBottom: "12px", color: "#333", fontWeight: "600" }}>
              Customer Information
            </h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <div className={styles.label}>Name</div>
                <div className={styles.value}>{shipment.receiver_name || "N/A"}</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.label}>Phone</div>
                <div className={styles.value}>
                  <a href={`tel:${shipment.receiver_phone}`}>
                    {shipment.receiver_phone || "N/A"}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h4 style={{ marginBottom: "12px", color: "#333", fontWeight: "600" }}>
              <EnvironmentOutlined style={{ marginRight: "6px", color: "#ff6b35" }} />
              Delivery Address
            </h4>
            <div
              style={{
                backgroundColor: "#f5f5f5",
                padding: "12px",
                borderRadius: "4px",
                lineHeight: "1.6",
              }}
            >
              {shipment.delivery_address || shipment.receiver_address || "N/A"}
            </div>
          </div>

          {coordinates ? (
            <Card size="small" style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Delivery coordinates
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 13,
                  marginBottom: 10,
                }}
              >
                {coordinates.label}
              </div>
              <Space wrap size="small">
                <Button
                  size="small"
                  type="primary"
                  href={coordinates.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Navigate with Google Maps
                </Button>
                <Button
                  size="small"
                  href={coordinates.appleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Apple Maps
                </Button>
                <Button
                  size="small"
                  type="link"
                  href={coordinates.openStreetMapUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenStreetMap
                </Button>
              </Space>
            </Card>
          ) : (
            <Alert
              type="warning"
              showIcon
              message="No delivery coordinates saved"
              description="Use the address as a fallback. Ask the branch or merchant to save a map pin for this shipment."
              style={{ marginBottom: 16 }}
            />
          )}

          <div className={styles.section}>
            <h4 style={{ marginBottom: "12px", color: "#333", fontWeight: "600" }}>
              Shipment Details
            </h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <div className={styles.label}>Items</div>
                <div className={styles.value}>{shipment.packet_products?.length || 0}</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.label}>Type</div>
                <div className={styles.value}>{delivery.delivery_type || "Standard"}</div>
              </div>
            </div>

            {shipment.packet_products && shipment.packet_products.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginBottom: "8px",
                    color: "#666",
                  }}
                >
                  Items:
                </div>
                <ul style={{ margin: "0", paddingLeft: "20px" }}>
                  {shipment.packet_products.map((product, idx) => (
                    <li key={idx} style={{ fontSize: "12px", marginBottom: "4px" }}>
                      {product.name || "Item"} {product.quantity ? `x${product.quantity}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {deliveryIsCollectable && (
            <div
              style={{
                backgroundColor: "#fffacd",
                padding: "12px",
                borderRadius: "4px",
                marginBottom: "16px",
              }}
            >
              <h4 style={{ marginBottom: "8px", color: "#333", fontWeight: "600" }}>
                <DollarOutlined style={{ marginRight: "6px", color: "#faad14" }} />
                POD collection
              </h4>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#faad14" }}>
                Rs. {amount.toFixed(2)}
              </div>
              <div style={{ marginTop: "6px", color: "#666" }}>
                The rider collects this amount from the customer for the merchant. Cash
                is collected by the rider on the merchant&apos;s behalf; online payment is
                verified through HamroPay (marketplace HQ credentials + store sub-merchant).
              </div>
            </div>
          )}

          {!deliveryIsCollectable && (
            <Alert
              type="success"
              showIcon
              message="Prepaid - no collection at the door"
              description="Do not collect cash or open online QR. Confirm the receiver, take their name and signature, then complete."
              style={{ marginBottom: 16 }}
            />
          )}

          <div style={{ marginTop: "24px" }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                block
                size="large"
                type="primary"
                disabled={delivery.status !== "assigned" || !!busyAction}
                loading={busyAction === `accept:${delivery.id}`}
                onClick={() => run(() => staffAcceptDelivery(delivery.id), `accept:${delivery.id}`)}
              >
                Accept Delivery
              </Button>
              <Button
                block
                size="large"
                disabled={
                  !!busyAction ||
                  !["accepted", "assigned"].includes(delivery.status)
                }
                loading={busyAction === `out:${delivery.id}`}
                onClick={() => run(() => staffOutForDelivery(delivery.id), `out:${delivery.id}`)}
              >
                Out For Delivery
              </Button>
              <Button
                block
                size="large"
                type={delivery.arrived_at ? "default" : "primary"}
                disabled={
                  !!busyAction ||
                  delivery.status !== "out_for_delivery" ||
                  !!delivery.arrived_at
                }
                loading={busyAction === `arrive:${delivery.id}`}
                onClick={() => arriveAtLocation(delivery)}
              >
                {delivery.arrived_at ? "At Location" : "Arrived at Location"}
              </Button>
              <Button
                block
                size="large"
                type="primary"
                icon={<CheckCircleOutlined />}
                disabled={
                  !!busyAction ||
                  delivery.status !== "out_for_delivery" ||
                  !canCompleteDelivery(delivery)
                }
                loading={busyAction === `deliver:${delivery.id}`}
                onClick={() => openDeliveryConfirmation(delivery)}
              >
                {canCompleteDelivery(delivery) ? (isCollectable(delivery) ? "Collect & complete" : "Confirm receipt & complete") : "Complete after arrival"}
              </Button>
              <Button
                block
                size="large"
                danger
                disabled={delivery.status !== "out_for_delivery" || !!busyAction}
                onClick={() => setFailedRow(delivery)}
              >
                Mark Failed
              </Button>
            </Space>
          </div>
        </div>
      </Drawer>
    );
  };

  const completionIsCollectable = isCollectable(paymentDelivery);

  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: "16px" }}>
        {[
          {
            title: "Assigned",
            value: statusCounts.assigned,
            hint: "Awaiting acceptance",
            color: "#722ed1",
          },
          {
            title: "Out for Delivery",
            value: statusCounts.out_for_delivery,
            hint: "On the road",
            color: "#1677ff",
          },
          {
            title: "Delivered",
            value: statusCounts.delivered,
            hint: "Completed",
            color: "#389e0d",
          },
          {
            title: "Failed",
            value: statusCounts.failed,
            hint: "Needs attention",
            color: "#cf1322",
          },
        ].map((summary) => (
          <Col xs={12} md={6} key={summary.title}>
            <Card
              size="small"
              style={{
                borderRadius: 12,
                borderTop: `3px solid ${summary.color}`,
              }}
            >
              <Statistic
                title={summary.title}
                value={summary.value}
                valueStyle={{ color: summary.color, fontWeight: 700 }}
              />
              <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 4 }}>
                {summary.hint}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        style={{ marginBottom: "24px", borderRadius: 12 }}
        title={
          <div>
            <h2 style={{ margin: 0 }}>Deliveries</h2>
            <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: "12px" }}>
              {statusCounts.all} {statusCounts.all === 1 ? "delivery" : "deliveries"} in your assigned history
            </p>
          </div>
        }
        extra={
          <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>
            Refresh
          </Button>
        }
      >
        <div style={{ marginBottom: "16px" }}>
          <Segmented
            options={statusTabs}
            value={filterStatus}
            onChange={(value) => {
              setFilterStatus(value);
              setCurrentPage(1);
            }}
            block
            style={{ width: "100%" }}
          />
        </div>

        <Row gutter={16} style={{ marginBottom: "16px" }}>
          <Col xs={24} sm={16}>
            <Input
              placeholder="Search by tracking #, name, phone, or address..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setCurrentPage(1);
              }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8}>
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: <UnorderedListOutlined title="List View" />, value: "list" },
                { label: <MenuOutlined title="Detailed View" />, value: "detailed" },
              ]}
              block
            />
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        {filteredRows.length === 0 ? (
          <Empty
            description={filterStatus === "all" ? "No deliveries assigned" : "No deliveries with this status"}
            style={{ marginTop: "50px" }}
          />
        ) : viewMode === "list" ? (
          <>
            <List dataSource={paginatedRows} renderItem={renderListItem} split bordered />
            {filteredRows.length > pageSize && (
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={filteredRows.length}
                  onChange={setCurrentPage}
                  pageSizeOptions={[5, 10, 20, 50]}
                  onShowSizeChange={(_, size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  showSizeChanger
                  showTotal={(total) => `Total ${total} deliveries`}
                />
              </div>
            )}
          </>
        ) : (
          <div>{paginatedRows.map(renderDetailedCard)}</div>
        )}
      </Spin>

      {renderDetailedDrawer(selectedDelivery)}

      <Modal
        title={
          completionIsCollectable
            ? paymentMethod === "online"
              ? "Verify payment & receiver proof"
              : "Confirm cash collection & receiver proof"
            : "Confirm customer receipt"
        }
        open={!!paymentDelivery}
        onCancel={closePaymentConfirmation}
        onOk={submitDeliveryPayment}
        okText={
          completionIsCollectable
            ? paymentMethod === "online"
              ? "Verify payment & deliver"
              : "Confirm cash collected & deliver"
            : "Confirm receipt & deliver"
        }
        okButtonProps={{
          disabled:
            completionIsCollectable &&
            paymentMethod === "online" &&
            (paymentSessionLoading || paymentSession?.status !== "paid"),
        }}
        width={540}
        destroyOnClose
      >
        {completionIsCollectable ? (
          <>
            <Alert
              type="info"
              showIcon
              message={`${paymentTypeLabel(paymentDelivery)} - collect Rs. ${collectableAmount(paymentDelivery).toFixed(2)} for ${
                paymentDelivery?.shipment?.merchant?.name || "the merchant"
              }.`}
              description={
                paymentMethod === "online"
                  ? "Customer pays via the Tukaatu / HamroPay QR (merchant doorstep). After payment is verified, take receiver name and signature, then complete."
                  : "Collect exact cash for the merchant. After delivery, that cash must be deposited at the branch before merchant settlement."
              }
              style={{ marginBottom: 16 }}
            />

              <Form form={paymentForm} layout="vertical">
              <Form.Item
                name="payment_method"
                label="How was the POD amount collected?"
                rules={[{ required: true, message: "Select a payment method." }]}
              >
                <Radio.Group>
                  <Space direction="vertical">
                    <Radio value="cash">Cash collected by rider for the merchant</Radio>
                    <Radio value="online">
                      Online / QR payment (merchant doorstep)
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              {paymentMethod === "online" && (
                <Card
                  size="small"
                  title="POD online payment"
                  style={{ marginBottom: 16 }}
                >
                  {(paymentSessionLoading || (paymentMethod === "online" && paymentSession && ["pending", "ready"].includes(paymentSession.status) && !paymentCheckoutLink(paymentSession) && !paymentSessionError)) && (
                    <div style={{ textAlign: "center", padding: "16px 0" }}>
                      <Spin />
                      <div style={{ marginTop: 8 }}>
                        Creating online POD payment session...
                      </div>
                    </div>
                  )}

                  {paymentSessionError && (
                    <Alert
                      type="error"
                      showIcon
                      message={paymentSessionError}
                      description={
                        <Button size="small" onClick={retryPaymentSession}>
                          Retry payment session
                        </Button>
                      }
                      style={{ marginBottom: 12 }}
                    />
                  )}

                  {["pending", "ready"].includes(paymentSession?.status) && (
                    <Alert
                      type="warning"
                      showIcon
                      message={paymentCheckoutLink(paymentSession) ? "Waiting for payment confirmation" : "Requesting payment QR from Tukaatu"}
                      description={paymentCheckoutLink(paymentSession) ? "Ask the customer to scan this QR and complete the exact amount. This screen polls until the payment is confirmed." : "Creating the doorstep QR via Tukaatu. This screen polls until the QR appears, then until payment is confirmed."}
                      style={{ marginBottom: 12 }}
                    />
                  )}

                  {paymentSession?.status === "paid" && (
                    <Alert
                      type="success"
                      showIcon
                      message="Payment verified"
                      description="Online payment confirmed — the merchant received the payment."
                      style={{ marginBottom: 12 }}
                    />
                  )}

                  {paymentSession &&
                    ["failed", "expired", "cancelled", "refunded"].includes(
                      paymentSession.status
                    ) &&
                    !paymentSessionError && (
                      <Alert
                        type="error"
                        showIcon
                        message={
                          paymentSession.last_error ||
                          (paymentSession.status === "failed"
                            ? "Online payment failed. Retry or collect cash."
                            : `Payment session ${paymentSession.status}`)
                        }
                        description={
                          <Button size="small" onClick={retryPaymentSession}>
                            Retry payment
                          </Button>
                        }
                        style={{ marginBottom: 12 }}
                      />
                    )}

                  {paymentCheckoutLink(paymentSession) && (
                    <div style={{ textAlign: "center", marginBottom: 12 }}>
                      <img
                        src={paymentCheckoutLink(paymentSession)}
                        alt={`Online payment QR for ${
                          paymentDelivery?.shipment?.merchant?.name || "merchant"
                        }`}
                        style={{
                          maxWidth: "260px",
                          maxHeight: "260px",
                          width: "100%",
                          objectFit: "contain",
                          background: "#fff",
                          border: "1px solid #f0f0f0",
                          borderRadius: 8,
                          padding: 8,
                        }}
                      />
                      <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                        Amount: Rs.{" "}
                        {Number(
                          paymentSession?.amount ||
                            collectableAmount(paymentDelivery)
                        ).toFixed(2)}{" "}
                        {paymentSession?.currency || "NPR"}
                      </div>
                    </div>
                  )}

                  {paymentCheckoutLink(paymentSession) && (
                    <div style={{ textAlign: "center" }}>
                      <a
                        href={paymentCheckoutLink(paymentSession)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open payment checkout
                      </a>
                    </div>
                  )}

                  {(paymentSession?.merchant_txn_id ||
                    paymentSession?.payment_session_id) && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "#666",
                        wordBreak: "break-all",
                      }}
                    >
                      Txn:{" "}
                      {paymentSession?.merchant_txn_id ||
                        paymentSession?.payment_session_id}
                    </div>
                  )}
                </Card>
              )}

              <CustomerReceiptFields />
            </Form>
          </>
        ) : (
          <>
            <Alert
              type="success"
              showIcon
              message="Prepaid - no collection at the door"
              description="Do not collect cash or open online QR. Confirm the receiver, take their name and signature, then complete."
              style={{ marginBottom: 16 }}
            />

            <Form form={paymentForm} layout="vertical">
              <Form.Item
                name="customer_confirmed"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value) =>
                      value
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error("Customer confirmation is required.")
                          ),
                  },
                ]}
              >
                <Checkbox>
                  Customer confirms that the parcel was received in good condition.
                </Checkbox>
              </Form.Item>

              <Form.Item
                name="customer_name"
                label="Received by"
                rules={[
                  { required: true, message: "Enter the receiving customer name." },
                  { max: 191, message: "The name is too long." },
                ]}
              >
                <Input placeholder="Name of the person receiving the parcel" />
              </Form.Item>

              <Form.Item
                name="customer_signature"
                label="Customer signature"
                rules={[
                  {
                    required: true,
                    message: "Ask the customer to sign before completing delivery.",
                  },
                ]}
                extra="The signature is stored privately as delivery proof."
              >
                <SignaturePad />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      <Modal
        title="Report Failed Delivery"
        open={!!failedRow}
        onCancel={() => setFailedRow(null)}
        onOk={() => form.validateFields().then((values) => run(() => staffMarkFailed(failedRow.id, values.reason)))}
        width={600}
      >
        <div style={{ marginBottom: "16px" }}>
          <strong>Tracking:</strong> {failedRow?.shipment?.tracking_number}
          <br />
          <strong>Customer:</strong> {failedRow?.shipment?.receiver_name}
          <br />
          <strong>Address:</strong>{" "}
          {failedRow?.shipment?.delivery_address || failedRow?.shipment?.receiver_address}
        </div>
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="Reason for Failure"
            rules={[
              { required: true, message: "Please provide a reason" },
              { min: 10, message: "Please provide a detailed reason (minimum 10 characters)" },
            ]}
          >
            <Input.TextArea rows={4} placeholder="e.g., Customer not available, address not found, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
