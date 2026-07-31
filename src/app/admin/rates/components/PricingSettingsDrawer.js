"use client";

import { useEffect } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Switch,
  Tabs,
  TimePicker,
} from "antd";

const DEFAULT_VALUES = {
  included_weight_kg: 1.5,
  same_branch_weight_rate: 20,
  other_branch_weight_rate: 30,
  volumetric_divisor: 5000,
  fragile_multiplier: 1.05,
  included_delivery_distance_km: 5,
  extra_distance_rate_per_km: 6,
  same_branch_sdd_multiplier: 1.5,
  other_branch_sdd_multiplier: 2,
  same_day_cutoff_time: dayjs().hour(12).minute(0).second(0),
  minimum_pickup_packets: 3,
  low_packet_pickup_charge: 50,
  vat_inclusive: true,
  vat_percentage: 13,
  quote_validity_minutes: 30,
  change_reason: "",
  activate: true,
};

function parseTime(value) {
  const [hour = 12, minute = 0, second = 0] = String(value || "12:00:00")
    .split(":")
    .map((part) => Number(part));

  return dayjs().hour(hour).minute(minute).second(second);
}

function formValues(record) {
  if (!record) {
    return DEFAULT_VALUES;
  }

  return {
    included_weight_kg: Number(record.included_weight_kg ?? 1.5),
    same_branch_weight_rate: Number(record.same_branch_weight_rate ?? 20),
    other_branch_weight_rate: Number(record.other_branch_weight_rate ?? 30),
    volumetric_divisor: Number(record.volumetric_divisor ?? 5000),
    fragile_multiplier: Number(record.fragile_multiplier ?? 1.05),
    included_delivery_distance_km: Number(
      record.included_delivery_distance_km ?? 5,
    ),
    extra_distance_rate_per_km: Number(
      record.extra_distance_rate_per_km ?? 6,
    ),
    same_branch_sdd_multiplier: Number(
      record.same_branch_sdd_multiplier ?? 1.5,
    ),
    other_branch_sdd_multiplier: Number(
      record.other_branch_sdd_multiplier ?? 2,
    ),
    same_day_cutoff_time: parseTime(record.same_day_cutoff_time),
    minimum_pickup_packets: Number(record.minimum_pickup_packets ?? 3),
    low_packet_pickup_charge: Number(
      record.low_packet_pickup_charge ?? 50,
    ),
    vat_inclusive: Boolean(record.vat_inclusive),
    vat_percentage: Number(record.vat_percentage ?? 13),
    quote_validity_minutes: Number(record.quote_validity_minutes ?? 30),
    change_reason: "",
    activate: true,
  };
}

function NumberField({
  label,
  name,
  min = 0,
  step = 0.01,
  addonAfter,
  required = true,
}) {
  return (
    <Form.Item
      label={label}
      name={name}
      rules={
        required
          ? [{ required: true, message: `${label} is required.` }]
          : []
      }
    >
      <InputNumber
        min={min}
        step={step}
        addonAfter={addonAfter}
        style={{ width: "100%" }}
      />
    </Form.Item>
  );
}

export default function PricingSettingsDrawer({
  open,
  record,
  mode,
  saving,
  onClose,
  onSubmit,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(formValues(record));
    }
  }, [form, open, record]);

  async function handleFinish(values) {
    await onSubmit({
      ...values,
      same_day_cutoff_time: values.same_day_cutoff_time.format("HH:mm:ss"),
    });
  }

  const tabs = [
    {
      key: "weight",
      label: "Weight",
      children: (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <NumberField
              label="Included weight"
              name="included_weight_kg"
              min={0.001}
              step={0.1}
              addonAfter="KG"
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField
              label="Volumetric divisor"
              name="volumetric_divisor"
              min={1}
              step={1}
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField
              label="Same-branch weight rate"
              name="same_branch_weight_rate"
              addonAfter="NPR/KG"
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField
              label="Other-branch weight rate"
              name="other_branch_weight_rate"
              addonAfter="NPR/KG"
            />
          </Col>
        </Row>
      ),
    },
    {
      key: "handling",
      label: "Handling & Distance",
      children: (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <NumberField
              label="Fragile multiplier"
              name="fragile_multiplier"
              min={1}
              step={0.01}
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField
              label="Included delivery distance"
              name="included_delivery_distance_km"
              step={0.1}
              addonAfter="KM"
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField
              label="Extra distance rate"
              name="extra_distance_rate_per_km"
              addonAfter="NPR/KM"
            />
          </Col>
        </Row>
      ),
    },
    {
      key: "same-day",
      label: "Same Day",
      children: (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <NumberField
              label="Same-branch SDD multiplier"
              name="same_branch_sdd_multiplier"
              min={1}
              step={0.01}
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField
              label="Other-branch SDD multiplier"
              name="other_branch_sdd_multiplier"
              min={1}
              step={0.01}
            />
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Same-day cutoff"
              name="same_day_cutoff_time"
              rules={[{ required: true, message: "Cutoff time is required." }]}
            >
              <TimePicker format="HH:mm:ss" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: "pickup-vat",
      label: "Pickup, VAT & Quote",
      children: (
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <NumberField
              label="Minimum pickup packets"
              name="minimum_pickup_packets"
              min={1}
              step={1}
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField
              label="Low-packet pickup charge"
              name="low_packet_pickup_charge"
              addonAfter="NPR"
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField
              label="VAT percentage"
              name="vat_percentage"
              min={0}
              step={0.01}
              addonAfter="%"
            />
          </Col>
          <Col xs={24} md={12}>
            <NumberField
              label="Quote validity"
              name="quote_validity_minutes"
              min={1}
              step={1}
              addonAfter="Minutes"
            />
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="VAT included in official rates"
              name="vat_inclusive"
              valuePropName="checked"
            >
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <Drawer
      title={mode === "edit" ? "Create Version from Existing" : "New Pricing Version"}
      open={open}
      onClose={onClose}
      destroyOnClose
      width={760}
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={() => form.submit()}>
            Save Version
          </Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        message="Pricing versions are immutable"
        description="Saving creates a new settings row. Existing quote snapshots and old pricing history are not changed."
        style={{ marginBottom: 20 }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_VALUES}
        onFinish={handleFinish}
      >
        <Tabs items={tabs} />

        <Form.Item
          label="Change reason"
          name="change_reason"
          rules={[
            { required: true, message: "Explain why this pricing version is being created." },
            { max: 500 },
          ]}
        >
          <Input.TextArea rows={4} placeholder="Example: Updated official weight and distance charges." />
        </Form.Item>

        <Form.Item
          label="Activate immediately"
          name="activate"
          valuePropName="checked"
        >
          <Switch checkedChildren="Active" unCheckedChildren="Save inactive" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
