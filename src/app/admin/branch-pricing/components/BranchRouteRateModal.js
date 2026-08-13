"use client";

import { useEffect } from "react";
import { Form, InputNumber, Modal, Select, Switch, Typography } from "antd";

const { Text } = Typography;

function EffectiveRates({ pricingSettings, isSameBranch, expressEnabled, sameDayEnabled }) {
  if (!pricingSettings) return null;

  const expressMultiplier = isSameBranch
    ? Number(pricingSettings.local_express_multiplier ?? 1.2)
    : Number(pricingSettings.transfer_express_multiplier ?? 1.3);

  const sameDayMultiplier = isSameBranch
    ? Number(pricingSettings.local_same_day_multiplier ?? 1.5)
    : Number(pricingSettings.transfer_same_day_multiplier ?? 2);

  const services = [
    { label: "Express", multiplier: expressMultiplier, enabled: expressEnabled !== false, color: "#fa8c16" },
    { label: "Same Day", multiplier: sameDayMultiplier, enabled: sameDayEnabled !== false, color: "#eb2f96" },
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
        Multipliers applied to the full calculated subtotal (base + weight + distance + fragile)
      </Text>
      <div style={{ display: "flex", gap: 8 }}>
        {services.map(({ label, multiplier, enabled, color }) => (
          <div
            key={label}
            style={{
              flex: 1,
              padding: "8px 10px",
              background: "#fff",
              border: `1px solid ${enabled ? color + "33" : "#e2e8f0"}`,
              borderRadius: 7,
              opacity: enabled ? 1 : 0.45,
            }}
          >
            <Text style={{ fontSize: 10, color: enabled ? color : "#8c8c8c", fontWeight: 700, display: "block" }}>
              {label} {enabled ? `×${multiplier}` : "(disabled for this route)"}
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
  const expressEnabled = Form.useWatch("express_enabled", form);
  const sameDayEnabled = Form.useWatch("same_day_enabled", form);
  const sameBranch = pickupId && deliveryId && Number(pickupId) === Number(deliveryId);

  useEffect(() => {
    if (!open) return;
    if (record) {
      form.setFieldsValue({
        pickup_branch_id: Number(record.pickup_branch_id),
        delivery_branch_id: Number(record.delivery_branch_id),
        base_rate: Number(record.base_rate),
        is_active: Boolean(record.is_active),
        express_enabled: record.express_enabled !== false,
        same_day_enabled: record.same_day_enabled !== false,
        create_reverse_route: false,
        reverse_base_rate: Number(record.base_rate),
      });
    } else {
      form.setFieldsValue({
        pickup_branch_id: defaults?.pickup_branch_id,
        delivery_branch_id: defaults?.delivery_branch_id,
        base_rate: defaults?.base_rate ?? 0,
        is_active: true,
        express_enabled: true,
        same_day_enabled: true,
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
          pricingSettings={pricingSettings}
          isSameBranch={sameBranch}
          expressEnabled={expressEnabled}
          sameDayEnabled={sameDayEnabled}
        />

        <Form.Item label="Active" name="is_active" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <Form.Item label="Express delivery" name="express_enabled" valuePropName="checked" style={{ margin: 0, flex: 1 }}>
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </Form.Item>
          <Form.Item label="Same-day delivery" name="same_day_enabled" valuePropName="checked" style={{ margin: 0, flex: 1 }}>
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </Form.Item>
        </div>

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
