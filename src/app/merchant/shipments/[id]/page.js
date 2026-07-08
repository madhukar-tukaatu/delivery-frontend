"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Row,
  Space,
  Spin,
  Steps,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  CarOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  InboxOutlined,
  PrinterOutlined,
  ReloadOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { merchantGetShipment } from "@/services/deliveryOperationsApi";

const { Title, Text } = Typography;

function valueOrDash(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function money(value) {
  const number = Number(value || 0);
  return `Rs. ${number.toLocaleString()}`;
}

function statusColor(status) {
  const value = String(status || "").toLowerCase();

  if (["delivered", "paid", "settled", "completed", "deposited"].includes(value)) {
    return "green";
  }

  if (
    [
      "failed",
      "cancelled",
      "rejected",
      "returned",
      "failed_delivery",
      "return_pending",
    ].includes(value)
  ) {
    return "red";
  }

  if (
    [
      "out_for_delivery",
      "picked_up",
      "in_transit",
      "dispatched",
      "at_destination_hub",
      "received_at_destination",
    ].includes(value)
  ) {
    return "blue";
  }

  if (["pending", "pending_pickup", "booked"].includes(value)) {
    return "orange";
  }

  return "default";
}

function routeCurrentStep(status) {
  const value = String(status || "").toLowerCase();

  if (["booked", "pending_pickup"].includes(value)) return 0;
  if (["picked_up", "pickup_completed"].includes(value)) return 1;
  if (["at_origin", "received_at_origin", "at_origin_hub"].includes(value)) return 2;
  if (["in_transit", "transfer_out", "dispatched"].includes(value)) return 3;
  if (["received_at_destination", "at_destination", "at_destination_hub"].includes(value)) return 4;
  if (["out_for_delivery"].includes(value)) return 5;
  if (["delivered", "completed"].includes(value)) return 6;
  if (["failed", "failed_delivery", "returned", "return_pending"].includes(value)) return 5;

  return 0;
}

function normalizeShipmentResponse(data) {
  return {
    shipment: data?.shipment || data || null,
    pickup: data?.pickup || data?.pickup_request || null,
    delivery: data?.delivery || data?.delivery_assignment || null,
    cod: data?.cod || data?.payment || null,
    charge: data?.charge || data?.fare || null,
    route: data?.route || null,
    tracking: data?.tracking || data?.history || data?.tracking_history || [],
    pickup_location: data?.pickup_location || data?.merchant_pickup_location || null,
  };
}

export default function MerchantShipmentViewPage() {
  const params = useParams();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);

      const response = await merchantGetShipment(params.id);
      setData(normalizeShipmentResponse(response));
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load shipment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  const shipment = data?.shipment;
  const pickup = data?.pickup;
  const delivery = data?.delivery;
  const cod = data?.cod;
  const charge = data?.charge;
  const route = data?.route;
  const tracking = data?.tracking || [];
  const pickupLocation = data?.pickup_location;

  const chargeBreakdown = useMemo(() => {
    if (!charge?.breakdown) return null;

    try {
      return typeof charge.breakdown === "string"
        ? JSON.parse(charge.breakdown)
        : charge.breakdown;
    } catch {
      return null;
    }
  }, [charge]);

  if (loading) {
    return (
      <Card style={{ minHeight: 260 }}>
        <Space>
          <Spin />
          <Text>Loading shipment...</Text>
        </Space>
      </Card>
    );
  }

  if (!shipment) {
    return (
      <Card>
        <Alert type="error" showIcon message="Shipment not found." />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space direction="vertical" size={8}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                Back
              </Button>

              <div>
                <Title level={3} style={{ margin: 0 }}>
                  Shipment {shipment.tracking_number}
                </Title>

                <Text type="secondary">
                  Order Reference: {shipment.order_reference || shipment.merchant_order_id || "-"}
                </Text>
              </div>

              <Space wrap>
                <Tag color={statusColor(shipment.status)}>
                  {shipment.status || "pending"}
                </Tag>

                <Tag color="blue">
                  Source: {shipment.source || "merchant_panel"}
                </Tag>

                {shipment.requires_transfer || route?.requires_transfer ? (
                  <Tag color="orange">Transfer Required</Tag>
                ) : (
                  <Tag color="green">Local Delivery</Tag>
                )}
              </Space>
            </Space>
          </Col>

          <Col>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={load}>
                Refresh
              </Button>

              <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                Print
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title="Shipment Progress">
        <Steps
          current={routeCurrentStep(shipment.status)}
          items={[
            { title: "Booked", icon: <FileTextOutlined /> },
            { title: "Picked Up", icon: <InboxOutlined /> },
            { title: "Origin Scan", icon: <ShopOutlined /> },
            { title: "In Transit", icon: <CarOutlined /> },
            { title: "Destination", icon: <ShopOutlined /> },
            { title: "Out Delivery", icon: <EnvironmentOutlined /> },
            { title: "Delivered", icon: <CheckCircleOutlined /> },
          ]}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Customer & Delivery Details">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Customer Name">
                {valueOrDash(shipment.customer_name || shipment.receiver_name)}
              </Descriptions.Item>

              <Descriptions.Item label="Phone">
                {valueOrDash(shipment.customer_phone || shipment.receiver_phone)}
              </Descriptions.Item>

              <Descriptions.Item label="Email">
                {valueOrDash(shipment.customer_email)}
              </Descriptions.Item>

              <Descriptions.Item label="Delivery Address">
                {valueOrDash(shipment.delivery_address || shipment.receiver_address)}
              </Descriptions.Item>

              <Descriptions.Item label="City / Area">
                {[shipment.delivery_city || shipment.destination_city, shipment.delivery_area || shipment.destination_area]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Delivery Coordinates">
                {shipment.delivery_latitude || shipment.receiver_latitude
                  ? `${shipment.delivery_latitude || shipment.receiver_latitude}, ${
                      shipment.delivery_longitude || shipment.receiver_longitude
                    }`
                  : "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Special Instruction">
                {valueOrDash(shipment.special_instruction)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Package Details">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Package Type">
                {shipment.package_type || "parcel"}
              </Descriptions.Item>

              <Descriptions.Item label="Description">
                {valueOrDash(shipment.package_description)}
              </Descriptions.Item>

              <Descriptions.Item label="Actual Weight">
                {shipment.weight || shipment.actual_weight || 0} KG
              </Descriptions.Item>

              <Descriptions.Item label="Dimensions">
                {`${shipment.length_cm || 0} cm × ${shipment.width_cm || 0} cm × ${
                  shipment.height_cm || 0
                } cm`}
              </Descriptions.Item>

              <Descriptions.Item label="Pieces">
                {shipment.pieces || 1}
              </Descriptions.Item>

              <Descriptions.Item label="Declared Value">
                {money(shipment.declared_value)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="Pickup">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Pickup Status">
                <Tag color={statusColor(pickup?.status)}>
                  {pickup?.status || "pending"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Location">
                {pickupLocation?.name ||
                  pickup?.pickup_location_name ||
                  "Merchant pickup location"}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Address">
                {pickupLocation?.address ||
                  pickup?.pickup_address ||
                  shipment.pickup_address ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup City / Area">
                {[pickupLocation?.city, pickupLocation?.area]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Pickup Coordinates">
                {pickupLocation?.latitude
                  ? `${pickupLocation.latitude}, ${pickupLocation.longitude}`
                  : "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Assigned Pickup Staff">
                {pickup?.assigned_staff?.name ||
                  pickup?.assigned_to_name ||
                  pickup?.assigned_to ||
                  "Not assigned yet"}
              </Descriptions.Item>

              <Descriptions.Item label="Picked Up At">
                {valueOrDash(pickup?.picked_up_at)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Route / Branch">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Origin Branch">
                {route?.origin_branch?.name || shipment.origin_branch_name || shipment.origin_branch_id || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Origin Sub-Branch">
                {route?.origin_sub_branch?.name ||
                  shipment.origin_sub_branch_name ||
                  shipment.origin_sub_branch_id ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Destination Branch">
                {route?.destination_branch?.name ||
                  shipment.destination_branch_name ||
                  shipment.destination_branch_id ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Destination Sub-Branch">
                {route?.destination_sub_branch?.name ||
                  shipment.destination_sub_branch_name ||
                  shipment.destination_sub_branch_id ||
                  "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Current Branch">
                {shipment.current_branch_name || shipment.current_branch_id || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Current Sub-Branch">
                {shipment.current_sub_branch_name || shipment.current_sub_branch_id || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Transfer">
                {shipment.requires_transfer || route?.requires_transfer ? (
                  <Tag color="orange">Required</Tag>
                ) : (
                  <Tag color="green">Not Required</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<Space><CreditCardOutlined /> Payment / COD</Space>}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Payment Type">
                <Tag color={shipment.payment_type === "cod" ? "orange" : "green"}>
                  {shipment.payment_type || "prepaid"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Delivery Charge Paid By">
                {shipment.delivery_charge_paid_by || "-"}
              </Descriptions.Item>

              <Descriptions.Item label="Delivery Charge">
                {money(charge?.delivery_charge ?? shipment.delivery_charge)}
              </Descriptions.Item>

              <Descriptions.Item label="COD Amount">
                {money(cod?.cod_amount ?? shipment.cod_amount)}
              </Descriptions.Item>

              <Descriptions.Item label="Total Collectable">
                <Text strong>
                  {money(charge?.total_collectable ?? shipment.total_collectable)}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="COD Status">
                <Tag color={statusColor(cod?.status)}>
                  {cod?.status || "-"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Fare Breakdown">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Base Fee">
                {money(chargeBreakdown?.base_fee ?? charge?.base_fee)}
              </Descriptions.Item>

              <Descriptions.Item label="Distance KM">
                {chargeBreakdown?.distance_km ?? charge?.distance_km ?? 0}
              </Descriptions.Item>

              <Descriptions.Item label="Distance Fee">
                {money(chargeBreakdown?.distance_fee ?? charge?.distance_fee)}
              </Descriptions.Item>

              <Descriptions.Item label="Actual Weight">
                {chargeBreakdown?.actual_weight ?? charge?.actual_weight ?? shipment.weight ?? 0} KG
              </Descriptions.Item>

              <Descriptions.Item label="Volumetric Weight">
                {chargeBreakdown?.volumetric_weight ?? charge?.volumetric_weight ?? 0} KG
              </Descriptions.Item>

              <Descriptions.Item label="Chargeable Weight">
                {chargeBreakdown?.chargeable_weight ?? charge?.chargeable_weight ?? 0} KG
              </Descriptions.Item>

              <Descriptions.Item label="Weight Fee">
                {money(chargeBreakdown?.weight_fee ?? charge?.weight_fee)}
              </Descriptions.Item>

              <Descriptions.Item label="COD Fee">
                {money(chargeBreakdown?.cod_fee ?? charge?.cod_fee)}
              </Descriptions.Item>

              <Descriptions.Item label="Final Delivery Charge">
                <Text strong>
                  {money(chargeBreakdown?.delivery_charge ?? charge?.delivery_charge ?? shipment.delivery_charge)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Delivery Assignment">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Delivery Status">
                <Tag color={statusColor(delivery?.status)}>
                  {delivery?.status || "Not assigned yet"}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Delivery Rider">
                {delivery?.rider?.name ||
                  delivery?.rider_name ||
                  delivery?.assigned_to_name ||
                  delivery?.rider_id ||
                  "Not assigned yet"}
              </Descriptions.Item>

              <Descriptions.Item label="Assigned At">
                {valueOrDash(delivery?.assigned_at)}
              </Descriptions.Item>

              <Descriptions.Item label="Out For Delivery At">
                {valueOrDash(delivery?.out_for_delivery_at)}
              </Descriptions.Item>

              <Descriptions.Item label="Delivered At">
                {valueOrDash(delivery?.delivered_at || shipment.delivered_at)}
              </Descriptions.Item>

              <Descriptions.Item label="Failed Reason">
                {valueOrDash(delivery?.failed_reason || shipment.failed_reason)}
              </Descriptions.Item>

              <Descriptions.Item label="Proof">
                {delivery?.proof_photo || delivery?.signature ? "Uploaded" : "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title="Tracking Timeline">
        {tracking.length ? (
          <Timeline
            items={tracking.map((item, index) => ({
              key: item.id || index,
              color: statusColor(item.status),
              children: (
                <Space direction="vertical" size={1}>
                  <Text strong>{item.title || item.status || "Updated"}</Text>
                  <Text>{item.description || item.remarks || item.note || "-"}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.created_at || item.updated_at || "-"}
                  </Text>
                </Space>
              ),
            }))}
          />
        ) : (
          <Alert type="info" showIcon message="No tracking history yet." />
        )}
      </Card>
    </Space>
  );
}