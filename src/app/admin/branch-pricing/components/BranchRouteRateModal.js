"use client";

import { useEffect } from "react";
import { Form, InputNumber, Modal, Select, Switch } from "antd";

export default function BranchRouteRateModal({
  open,
  record,
  branches,
  saving,
  defaults,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const editing = Boolean(record?.id);
  const pickupId = Form.useWatch("pickup_branch_id", form);
  const deliveryId = Form.useWatch("delivery_branch_id", form);
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
    if (sameBranch) {
      form.setFieldsValue({ create_reverse_route: false });
    }
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
          label="Base rate"
          name="base_rate"
          rules={[{ required: true, message: "Base rate is required." }]}
        >
          <InputNumber min={0} step={1} addonBefore="NPR" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Active" name="is_active" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        {!editing && (
          <>
            <Form.Item
              label="Create reverse route"
              name="create_reverse_route"
              valuePropName="checked"
              extra={sameBranch ? "A same-branch rate does not need a reverse route." : "Create the delivery-to-pickup rate at the same time."}
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
