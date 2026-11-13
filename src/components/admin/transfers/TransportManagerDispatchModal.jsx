"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CarOutlined,
  SendOutlined,
  UserOutlined,
  PhoneOutlined,
  LockOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { dispatchTransferRequest } from "@/services/admin/transferService";

const { Text, Title } = Typography;
const { Option } = Select;

const VEHICLE_CONFIGS = {
  bike: { label: "Bike / Motorcycle", maxParcels: 10, maxKg: 25, defaultHours: 1.5 },
  van: { label: "Delivery Van / HiAce", maxParcels: 50, maxKg: 250, defaultHours: 3.0 },
  pickup: { label: "4x4 Cargo Pickup / Bolero", maxParcels: 150, maxKg: 600, defaultHours: 4.0 },
  truck: { label: "Line-Haul Freight Truck", maxParcels: 800, maxKg: 8000, defaultHours: 5.5 },
  bus_cargo: { label: "Scheduled Bus Cargo", maxParcels: 40, maxKg: 150, defaultHours: 4.5 },
  flight: { label: "Domestic Flight Cargo", maxParcels: 60, maxKg: 200, defaultHours: 0.8 },
  other: { label: "Custom Carrier", maxParcels: 9999, maxKg: 99999, defaultHours: 4.0 },
};

export default function TransportManagerDispatchModal({
  open,
  onClose,
  onSuccess,
  request = null,
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const selectedVehicle = Form.useWatch("vehicle_type", form) || request?.requested_vehicle_type || "van";
  const vehicleConfig = VEHICLE_CONFIGS[selectedVehicle] || VEHICLE_CONFIGS.van;

  const currentParcels = request?.parcel_count || 0;
  const currentWeight = Number(request?.total_weight_kg || 0);

  const parcelPercent = Math.min(100, Math.round((currentParcels / vehicleConfig.maxParcels) * 100));
  const weightPercent = Math.min(100, Math.round((currentWeight / vehicleConfig.maxKg) * 100));
  const isOverCapacity = currentParcels > vehicleConfig.maxParcels || currentWeight > vehicleConfig.maxKg;

  // Calculate dynamic ETA
  const estHours = vehicleConfig.defaultHours;
  const now = new Date();
  const etaDate = new Date(now.getTime() + estHours * 3600 * 1000);
  const etaFormatted = etaDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    if (!open || !request) return;
    form.resetFields();
    form.setFieldsValue({
      vehicle_type: request.requested_vehicle_type || "van",
      vehicle_number: "Ba 2 Kha " + Math.floor(1000 + Math.random() * 9000),
      driver_name: "Ram Bahadur Shrestha",
      driver_phone: "98510" + Math.floor(10000 + Math.random() * 90000),
      seal_number: "SEAL-NP-" + Math.floor(1000 + Math.random() * 9000),
      max_parcels: vehicleConfig.maxParcels,
      max_weight_kg: vehicleConfig.maxKg,
    });
  }, [open, request, form]);

  useEffect(() => {
    form.setFieldsValue({
      max_parcels: vehicleConfig.maxParcels,
      max_weight_kg: vehicleConfig.maxKg,
    });
  }, [selectedVehicle, vehicleConfig, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await dispatchTransferRequest(request.id, values);
      message.success("Vehicle dispatched! TR container created and tracked live on Nepal map.");
      onSuccess?.();
      onClose();
    } catch (err) {
      message.error(err?.response?.data?.message || err?.message || "Failed to dispatch vehicle");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <CarOutlined style={{ color: "#2563eb", fontSize: 18 }} />
          <span style={{ fontWeight: 700 }}>Dispatch Vehicle: {request?.request_number}</span>
        </Space>
      }
      onOk={handleSubmit}
      okText="Dispatch Line-Haul Vehicle"
      confirmLoading={submitting}
      width={620}
      destroyOnClose
    >
      {/* Route & Freight Overview */}
      <Card size="small" style={{ borderRadius: 8, background: "#f8fafc", marginBottom: 14 }}>
        <Row justify="space-between" align="middle">
          <Col span={14}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
              {request?.origin_branch?.name || "Origin"} â†’ {request?.destination_hub?.name || "Next Hop"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              Freight: <strong>{currentParcels} parcels ({currentWeight} kg)</strong>
            </div>
          </Col>
          <Col span={10} style={{ textAlign: "right" }}>
            <Space direction="vertical" size={2} align="end">
              <Tag color={request?.urgency === "critical_capacity_exceeded" ? "error" : "blue"}>
                {request?.urgency === "critical_capacity_exceeded" ? "Critical (â‰¥80kg)" : "Standard Demand"}
              </Tag>
              <div style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>
                <ClockCircleOutlined /> Est. Arrival: ~{etaFormatted} ({estHours}h)
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Vehicle Capacity & Addition Limits Meter */}
      <Card size="small" style={{ borderRadius: 8, marginBottom: 14, borderLeft: `4px solid ${isOverCapacity ? "#dc2626" : "#2563eb"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <Text strong style={{ fontSize: 12 }}>Vehicle Capacity & Additionals Limit</Text>
          <Text style={{ fontSize: 11, color: isOverCapacity ? "#dc2626" : "#059669", fontWeight: 600 }}>
            {isOverCapacity ? "Exceeds Capacity!" : "Capacity OK âœ“"}
          </Text>
        </div>

        <Row gutter={[12, 6]}>
          <Col span={12}>
            <div style={{ fontSize: 11, color: "#64748b" }}>Parcel Count Limit: {currentParcels} / {vehicleConfig.maxParcels} pkgs</div>
            <Progress percent={parcelPercent} size="small" status={isOverCapacity ? "exception" : "active"} strokeColor={parcelPercent > 80 ? "#ea580c" : "#2563eb"} />
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 11, color: "#64748b" }}>Weight Capacity Limit: {currentWeight} / {vehicleConfig.maxKg} kg</div>
            <Progress percent={weightPercent} size="small" status={isOverCapacity ? "exception" : "active"} strokeColor={weightPercent > 80 ? "#ea580c" : "#059669"} />
          </Col>
        </Row>

        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
          <LockOutlined style={{ marginRight: 4 }} /> <em>Limits to additionals:</em> Once this container reaches {vehicleConfig.maxParcels} parcels, further auto-appending and parcel additions are locked.
        </div>
      </Card>

      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="vehicle_type"
              label="Assigned Vehicle Mode"
              rules={[{ required: true }]}
            >
              <Select>
                {Object.entries(VEHICLE_CONFIGS).map(([key, cfg]) => (
                  <Option key={key} value={key}>
                    {cfg.label} (Max {cfg.maxParcels} pkgs)
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="vehicle_number"
              label="Vehicle License Plate / ID"
              rules={[{ required: true, message: "Enter vehicle number" }]}
            >
              <Input placeholder="e.g. Ba 3 Kha 9821" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="driver_name"
              label="Assigned Driver / Line-Haul Rider"
              rules={[{ required: true, message: "Enter driver name" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Full Name" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="driver_phone"
              label="Driver Contact Phone"
              rules={[{ required: true, message: "Enter driver phone" }]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="98XXXXXXXX" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="seal_number"
              label="Tamper-Evident Security Seal Number"
              rules={[{ required: true, message: "Enter security seal number" }]}
            >
              <Input prefix={<LockOutlined />} placeholder="SEAL-NP-XXXX" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="max_parcels"
              label="Hard Cap on Additions (Parcels)"
            >
              <InputNumber min={1} max={9999} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
