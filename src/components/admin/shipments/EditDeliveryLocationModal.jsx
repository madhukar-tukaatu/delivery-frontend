"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import {
  EnvironmentOutlined,
  DollarOutlined,
  ArrowRightOutlined,
  CompassOutlined,
  AimOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import {
  previewDeliveryLocation,
  updateDeliveryLocation,
} from "@/services/merchant/merchantShipmentService";

const { Text, Title, Paragraph } = Typography;

const BranchCoordinatePicker = dynamic(
  () => import("@/components/maps/BranchCoordinatePicker"),
  { ssr: false }
);

function formatNpr(val) {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return "—";
  return `NPR ${Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function EditDeliveryLocationModal({
  open,
  shipment,
  onClose,
  onSuccess,
}) {
  const [form] = Form.useForm();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Initialize form when shipment changes or modal opens
  useEffect(() => {
    if (!open || !shipment) {
      setPreviewData(null);
      setErrorMsg(null);
      return;
    }

    const initialLat =
      shipment.delivery_lat ??
      shipment.delivery_latitude ??
      shipment.receiver_latitude ??
      null;
    const initialLng =
      shipment.delivery_lng ??
      shipment.delivery_longitude ??
      shipment.receiver_longitude ??
      null;

    form.setFieldsValue({
      delivery_address:
        shipment.receiver_address || shipment.delivery_address || "",
      delivery_city: shipment.receiver_city || shipment.delivery_city || "",
      delivery_area: shipment.receiver_area || shipment.delivery_area || "",
      receiver_name: shipment.receiver_name || shipment.customer_name || "",
      receiver_phone: shipment.receiver_phone || shipment.customer_phone || "",
      delivery_lat: initialLat,
      delivery_lng: initialLng,
    });

    setPreviewData(null);
    setErrorMsg(null);
  }, [open, shipment, form]);

  const handleCoordinateChange = ({ latitude, longitude }) => {
    form.setFieldsValue({
      delivery_lat: latitude,
      delivery_lng: longitude,
    });
    // Reset preview when coordinates change
    setPreviewData(null);
    setErrorMsg(null);
  };

  const handlePreview = async () => {
    try {
      const values = await form.validateFields([
        "delivery_lat",
        "delivery_lng",
        "delivery_address",
        "delivery_city",
        "delivery_area",
      ]);

      setPreviewLoading(true);
      setErrorMsg(null);

      const preview = await previewDeliveryLocation(shipment.id, {
        delivery_lat: Number(values.delivery_lat),
        delivery_lng: Number(values.delivery_lng),
        delivery_address: values.delivery_address,
        delivery_city: values.delivery_city,
        delivery_area: values.delivery_area,
      });

      setPreviewData(preview);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not calculate new delivery charge.";
      setErrorMsg(msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      setSaving(true);
      setErrorMsg(null);

      const updated = await updateDeliveryLocation(shipment.id, {
        delivery_lat: Number(values.delivery_lat),
        delivery_lng: Number(values.delivery_lng),
        delivery_address: values.delivery_address,
        delivery_city: values.delivery_city,
        delivery_area: values.delivery_area,
        receiver_name: values.receiver_name,
        receiver_phone: values.receiver_phone,
      });

      message.success(
        "Delivery location updated and delivery charge recalculated successfully!"
      );

      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update delivery location.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const curLat = Form.useWatch("delivery_lat", form);
  const curLng = Form.useWatch("delivery_lng", form);

  const currentCharge = Number(
    shipment?.delivery_charge ?? shipment?.delivery_fee ?? 0
  );
  const currentDestBranchName =
    shipment?.destinationBranch?.name ??
    shipment?.destinationSubBranch?.name ??
    (shipment?.destination_branch_id
      ? `Branch #${shipment.destination_branch_id}`
      : "Not assigned");

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={780}
      title={
        <Space size={8}>
          <EnvironmentOutlined style={{ color: "#0891B2" }} />
          <span>Update Customer Delivery Location & Recalculate Charge</span>
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>
          Cancel
        </Button>,
        <Button
          key="preview"
          icon={<ReloadOutlined />}
          onClick={handlePreview}
          loading={previewLoading}
          disabled={saving || !curLat || !curLng}
        >
          Recalculate Delivery Charge
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={saving}
          disabled={previewLoading || !curLat || !curLng}
          style={{ background: "#0891B2", borderColor: "#0891B2" }}
        >
          Save & Apply Recalculated Charge
        </Button>,
      ]}
      destroyOnClose
    >
      <Space direction="vertical" size={16} style={{ width: "100%", marginTop: 8 }}>
        <Alert
          type="info"
          showIcon
          message="Customer Location & Distance Correction"
          description="If the customer mistakenly chose the wrong location/distance or requested a new delivery destination, enter the corrected coordinates and address below. The Pricing Engine will recalculate the route distance, destination branch, and delivery charge."
        />

        {errorMsg && (
          <Alert type="error" showIcon message={errorMsg} closable />
        )}

        {/* Current State Summary */}
        <Card size="small" style={{ background: "#f8fafc" }}>
          <Row gutter={[16, 8]}>
            <Col xs={24} sm={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Current Delivery Charge
              </Text>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0891B2" }}>
                {formatNpr(currentCharge)}
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Destination Branch
              </Text>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {currentDestBranchName}
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Payer
              </Text>
              <div>
                <Tag color="blue">
                  {String(
                    shipment?.delivery_charge_paid_by || "merchant"
                  ).toUpperCase()}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Form Inputs */}
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="receiver_name"
                label="Receiver Name"
              >
                <Input placeholder="Recipient name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="receiver_phone"
                label="Receiver Phone"
              >
                <Input placeholder="Recipient contact number" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="delivery_address"
                label="Delivery Address"
                rules={[{ required: true, message: "Delivery address is required" }]}
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Street address, building, landmark..."
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="delivery_city" label="City">
                <Input placeholder="City (e.g. Kathmandu, Pokhara)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="delivery_area" label="Area / Zone">
                <Input placeholder="Area (e.g. Baneshwor, Lakeside)" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "12px 0" }}>
            <Space size={4}>
              <AimOutlined style={{ color: "#0891B2" }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Delivery Coordinates (Latitude & Longitude)
              </span>
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col xs={12}>
              <Form.Item
                name="delivery_lat"
                label="Latitude"
                rules={[{ required: true, message: "Latitude is required" }]}
              >
                <Input placeholder="e.g. 27.7172" />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item
                name="delivery_lng"
                label="Longitude"
                rules={[{ required: true, message: "Longitude is required" }]}
              >
                <Input placeholder="e.g. 85.3240" />
              </Form.Item>
            </Col>
          </Row>

          {/* Map Coordinate Picker */}
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
              Click on the map or drag the pin to pinpoint the exact delivery location:
            </Text>
            <BranchCoordinatePicker
              latitude={curLat}
              longitude={curLng}
              onChange={handleCoordinateChange}
              height={280}
            />
          </div>
        </Form>

        {/* Recalculation Preview Card */}
        {previewData && (
          <Card
            size="small"
            style={{
              borderColor: "#0891B2",
              background: "#F0FDFA",
            }}
            title={
              <Space size={8}>
                <CheckCircleOutlined style={{ color: "#0D9488" }} />
                <span style={{ fontWeight: 600, color: "#0F766E" }}>
                  Recalculated Price & Route Preview
                </span>
              </Space>
            }
          >
            <Row gutter={[16, 12]} align="middle">
              <Col xs={12} sm={6}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 12 }}>Previous Charge</Text>}
                  value={previewData.old_delivery_charge}
                  precision={2}
                  prefix="NPR "
                  valueStyle={{ fontSize: 16, color: "#64748B" }}
                />
              </Col>

              <Col xs={12} sm={6}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 12 }}>New Delivery Charge</Text>}
                  value={previewData.new_delivery_charge}
                  precision={2}
                  prefix="NPR "
                  valueStyle={{ fontSize: 18, fontWeight: 700, color: "#0891B2" }}
                />
              </Col>

              <Col xs={12} sm={6}>
                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                  Fare Difference
                </Text>
                <div style={{ marginTop: 4 }}>
                  {previewData.charge_difference === 0 ? (
                    <Tag color="default">No difference</Tag>
                  ) : previewData.charge_difference > 0 ? (
                    <Tag color="orange">
                      + NPR {previewData.charge_difference.toFixed(2)}
                    </Tag>
                  ) : (
                    <Tag color="green">
                      - NPR {Math.abs(previewData.charge_difference).toFixed(2)}
                    </Tag>
                  )}
                </div>
              </Col>

              <Col xs={12} sm={6}>
                <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                  New Destination Branch
                </Text>
                <div style={{ fontWeight: 600, marginTop: 4 }}>
                  {previewData.destination_branch?.name ||
                    previewData.destination_branch?.branch_name ||
                    "—"}
                </div>
              </Col>

              {String(shipment?.payment_type).toLowerCase() === "pod" &&
                String(shipment?.delivery_charge_paid_by).toLowerCase() ===
                  "customer" && (
                  <Col xs={24}>
                    <Alert
                      type="warning"
                      showIcon
                      message="Customer POD Total Updated"
                      description={`Because delivery charge is paid by the customer, the rider collectable POD total is adjusted from ${formatNpr(
                        previewData.old_total_collectable_amount
                      )} to ${formatNpr(previewData.new_total_collectable_amount)}.`}
                      style={{ marginTop: 8 }}
                    />
                  </Col>
                )}
            </Row>
          </Card>
        )}
      </Space>
    </Modal>
  );
}

