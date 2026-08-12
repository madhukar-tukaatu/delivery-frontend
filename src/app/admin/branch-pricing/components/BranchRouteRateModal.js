"use client";

import { useEffect } from "react";
import { Form, InputNumber, Modal, Select, Switch, Typography } from "antd";

const { Text } = Typography;

function fmt(value) {
  return `NPR ${Number(value || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function EffectiveRates({ baseRate, pricingSettings, isSameBranch }) {
  if (!baseRate || baseRate <= 0 || !pricingSettings) return null;

  const expressMultiplier = isSameBranch
    ? Number(pricingSettings.local_express_multiplier ?? 1.2)
    : Number(pricingSettings.transfer_express_multiplier ?? 1.3);

  const sameDayMultiplier = isSameBranch
    ? Number(pricingSettings.local_same_day_multiplier ?? 1.5)
    : Number(pricingSettings.transfer_same_day_multiplier ?? 2);

  const rates = [
    { label: "Standard", value: baseRate, color: "#1677ff", multiplier: null },
    {
      label: "Express",
      value: baseRate * expressMultiplier,
      color: "#fa8c16",
      multiplier: expressMultiplier,
      enabled: pricingSettings.express_enabled !== false,
    },
    {
      label: "Same Day",
      value: baseRate * sameDayMultiplier,
      color: "#eb2f96",
      multiplier: sameDayMultiplier,
      enabled: pricingSettings.same_day_enabled !== false,
    },
  ];

  return (
    <div
      style={{
        marginTop: -8,
        marginBottom: 16,
        padding: "10px 12px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
      }}
    >
      <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
        Effective rates from this base rate (from active Pricing Settings)
      </Text>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {rates.map(({ label, value, color, multiplier, enabled }) => (
          <div
            key={label}
            style={{
              flex: 1,
              minWidth: 110,
              padding: "8px 10px",
              background: "#fff",
              border: `1px solid ${color}22`,
              borderRadius: 7,
              opacity: enabled === false ? 0.45 : 1,
            }}
          >
            <Text style={{ fontSize: 10, color, fontWeight: 700, display: "block" }}>
              {label}
              {multiplier ? ` ×${multiplier}` : ""}
              {enabled === false ? " (off)" : ""}
            </Text>
            <Text strong style={{ fontSize: 13, color }}>
              {fmt(value)}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BranchRouteRateModal({
  open,
  record,
  branches,
  saving,
  defaults,
  pricingSettings,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const editing = Boolean(record?.id);
  const pickupId = Form.useWatch("pickup_branch_id", form);
  const deliveryId = Form.useWatch("delivery_branch_id", form);
  const baseRate = Form.useWatch("base_rate", form);
  const createReverse = Form.useWatch("create_reverse_route", form);
  const sameBranch = pickupId && deliveryId && Number(pickupId) === Number(deliveryId);

  useEffect(() => {
    if (!open) return;
    if (record) {
      form.setFieldsValue({
        pickup_branch_id: Number(record.pickup_branch_id),
        delivery_branch_id: Number(record.delivery_branch_id),
        base_rate: Number(record.base_rate),
        is_active: Boolean(record.is_active),
        create_reverse_route: false,
        reverse_base_rate: Number(record.base_rate),
      });
    } else {
      form.setFieldsValue({
        pickup_branch_id: defaults?.pickup_branch_id,
        delivery_branch_id: defaults?.delivery_branch_id,
        base_rate: defaults?.base_rate ?? 0,
        is_active: true,
        create_reverse_route: false,
        reverse_base_rate: defaults?.base_rate ?? 0,
      });
    }
  }, [defaults, form, open, record]);

  useEffect(() => {
    if (sameBranch) form.setFieldsValue({ create_reverse_route: false });
  }, [form, sameBranch]);

  const branchOptions = branches.map((branch) => ({
    value: Number(branch.id),
    label: `${branch.name} (${branch.code})`,
  }));

  return (
    <Modal
      title={editing ? "Edit Branch Route Rate" : "Add Branch Route Rate"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnClose
      width={640}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          label="Pickup branch"
          name="pickup_branch_id"
          rules={[{ required: true, message: "Pickup branch is required." }]}
        >
          <Select showSearch optionFilterProp="label" options={branchOptions} disabled={editing} />
        </Form.Item>

        <Form.Item
          label="Delivery branch"
          name="delivery_branch_id"
          rules={[{ required: true, message: "Delivery branch is required." }]}
        >
          <Select showSearch optionFilterProp="label" options={branchOptions} disabled={editing} />
        </Form.Item>

        <Form.Item
          label="Standard base rate (used directly for Standard, multiplied for Express and Same Day)"
          name="base_rate"
          rules={[{ required: true, message: "Base rate is required." }]}
        >
          <InputNumber min={0} step={1} addonBefore="NPR" style={{ width: "100%" }} />
        </Form.Item>

        <EffectiveRates
          baseRate={baseRate}
          pricingSettings={pricingSettings}
          isSameBranch={sameBranch}
        />

        <Form.Item label="Active" name="is_active" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        {!editing && (
          <>
            <Form.Item
              label="Create reverse route"
              name="create_reverse_route"
              valuePropName="checked"
              extra={
                sameBranch
                  ? "A same-branch rate does not need a reverse route."
                  : "Create the delivery-to-pickup rate at the same time."
              }
            >
              <Switch disabled={sameBranch} />
            </Form.Item>

            {createReverse && !sameBranch && (
              <Form.Item
                label="Reverse base rate"
                name="reverse_base_rate"
                rules={[{ required: true, message: "Reverse rate is required." }]}
              >
                <InputNumber min={0} step={1} addonBefore="NPR" style={{ width: "100%" }} />
              </Form.Item>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
