"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  SendOutlined,
  CarOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  CompassOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { createTransferRequest } from "@/services/admin/transferService";

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const VEHICLE_OPTIONS = [
  { value: "bike", label: "Bike / Motorcycle", icon: "ðŸ  ï¸ ", limit: "â‰¤ 10 pkgs / 25 kg", desc: "Local light courier" },
  { value: "van", label: "Delivery Van / HiAce", icon: "ðŸš ", limit: "â‰¤ 50 pkgs / 250 kg", desc: "Standard paved road courier" },
  { value: "pickup", label: "4x4 Cargo Pickup / Bolero", icon: "ðŸ›»", limit: "â‰¤ 150 pkgs / 600 kg", desc: "Hill & mountain feeder routes (Arghakhanchi, Mustang, Palpa)" },
  { value: "truck", label: "Line-Haul Freight Truck", icon: "ðŸš›", limit: "â‰¤ 800 pkgs / 8,000 kg", desc: "Heavy freight for arterial highways (Prithvi / Mahendra)" },
  { value: "bus_cargo", label: "Scheduled Bus Cargo", icon: "ðŸšŒ", limit: "â‰¤ 40 pkgs / 150 kg", desc: "Public intercity bus connection" },
  { value: "flight", label: "Domestic Flight Cargo", icon: "âœˆï¸ ", limit: "â‰¤ 60 pkgs / 200 kg", desc: "Mountain hubs (Jomsom/Mustang) & Same Day SLA" },
];

export default function BranchTransferRequestModal({
  open,
  onClose,
  onSuccess,
  branches = [],
  initialBranch = null,
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const parcelCount = Form.useWatch("parcel_count", form) || 0;
  const weightKg = Form.useWatch("total_weight_kg", form) || 0;

  const isThresholdExceeded = weightKg >= 80 || parcelCount >= 50;

  // Auto-recommend vehicle based on parcels, weight, and terrain
  const recommendedVehicle = useMemo(() => {
    if (parcelCount <= 10 && weightKg <= 25) return "bike";
    if (parcelCount <= 50 && weightKg <= 250) return "van";
    if (parcelCount <= 150 && weightKg <= 600) return "pickup";
    return "truck";
  }, [parcelCount, weightKg]);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (initialBranch) {
      form.setFieldsValue({
        origin_branch_id: initialBranch.id,
        parcel_count: initialBranch.pending_parcels || 15,
        total_weight_kg: initialBranch.pending_weight_kg || 35.0,
      });
    } else {
      form.setFieldsValue({
        parcel_count: 20,
        total_weight_kg: 45.0,
      });
    }
  }, [open, initialBranch, form]);

  useEffect(() => {
    if (recommendedVehicle && !form.isFieldTouched("requested_vehicle_type")) {
      form.setFieldValue("requested_vehicle_type", recommendedVehicle);
    }
  }, [recommendedVehicle, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        ...values,
        urgency: isThresholdExceeded ? "critical_capacity_exceeded" : (values.urgency || "normal"),
      };

      await createTransferRequest(payload);
      message.success("Transfer vehicle request submitted to Transport Manager!");
      onSuccess?.();
      onClose();
    } catch (err) {
      message.error(err?.response?.data?.message || err?.message || "Failed to submit transfer request");
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
          <span style={{ fontWeight: 700 }}>Request Transfer Vehicle / TR</span>
        </Space>
      }
      onOk={handleSubmit}
      okText="Submit Vehicle Request"
      confirmLoading={submitting}
      width={560}
      destroyOnClose
    >
      <div style={{ marginBottom: 14 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Branches can request a line-haul vehicle at any time before or after cargo accumulation.
          When freight exceeds <strong>80 kg or 50 parcels</strong>, the system flags priority transport.
        </Text>
      </div>

      {isThresholdExceeded ? (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message="Capacity Threshold Exceeded (â‰¥80 kg or â‰¥50 parcels)"
          description="This request will be highlighted in red on the Transport Manager's Nepal Map as high priority."
          style={{ marginBottom: 14 }}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          message="Standard Vehicle Request"
          description="Transport Manager will allocate the nearest corridor vehicle or scheduled route pickup."
          style={{ marginBottom: 14 }}
        />
      )}

      <Form form={form} layout="vertical" initialValues={{ urgency: "normal", requested_vehicle_type: "van" }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="origin_branch_id"
              label="Requesting Branch (Origin)"
              rules={[{ required: true, message: "Select requesting branch" }]}
            >
              <Select
                showSearch
                placeholder="Select branch"
                filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.city})` }))}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="destination_hub_id"
              label="Target Transit Hub / Next Hop"
              rules={[{ required: true, message: "Select target hub" }]}
            >
              <Select
                showSearch
                placeholder="Select destination hub"
                filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.city})` }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="parcel_count"
              label="Ready Parcel Count"
              rules={[{ required: true, message: "Enter parcel count" }]}
            >
              <InputNumber min={1} max={5000} style={{ width: "100%" }} placeholder="e.g. 38" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="total_weight_kg"
              label="Estimated Total Weight (KG)"
              rules={[{ required: true, message: "Enter weight in kg" }]}
            >
              <InputNumber min={0.5} max={15000} step={0.5} style={{ width: "100%" }} placeholder="e.g. 86.5" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="requested_vehicle_type"
          label={
            <Space>
              <span>Recommended Vehicle Type</span>
              <Tag color="blue">Auto-Calculated</Tag>
            </Space>
          }
          rules={[{ required: true, message: "Select vehicle type" }]}
        >
          <Select>
            {VEHICLE_OPTIONS.map((v) => (
              <Option key={v.value} value={v.value}>
                <Space>
                  <span>{v.icon}</span>
                  <span style={{ fontWeight: 600 }}>{v.label}</span>
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>({v.limit})</span>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="notes" label="Special Road Context & Freight Notes">
          <TextArea
            rows={2}
            placeholder="e.g. Mountain road conditions, urgent perishable cargo, specific arrival time requirement..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
