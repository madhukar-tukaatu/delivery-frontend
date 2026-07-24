"use client";

import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Switch } from "antd";

const DEFAULT_VALUES = {
  name: "",
  code: "",
  description: "",
  estimated_hours: 24,
  sort_order: 0,
  is_active: true,
};

export default function ServiceTypeModal({
  open,
  record,
  saving,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm();
  const editing = Boolean(record?.id);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        ...DEFAULT_VALUES,
        ...(record || {}),
        is_active: record ? Boolean(record.is_active) : true,
      });
    }
  }, [form, open, record]);

  return (
    <Modal
      title={editing ? "Edit Service Type" : "Create Service Type"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={saving}
      destroyOnClose
      width={620}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={DEFAULT_VALUES}>
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Service name is required." }]}
        >
          <Input placeholder="Standard" />
        </Form.Item>

        <Form.Item
          label="Code"
          name="code"
          extra={editing ? "Code is locked after creation to protect pricing logic." : "Use lowercase letters, numbers and underscores."}
          rules={[
            { required: true, message: "Service code is required." },
            { pattern: /^[a-z0-9_]+$/, message: "Use lowercase letters, numbers and underscores only." },
          ]}
        >
          <Input placeholder="standard" disabled={editing} />
        </Form.Item>

        <Form.Item label="Description" name="description" rules={[{ max: 500 }]}>
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item
          label="Estimated delivery hours"
          name="estimated_hours"
          rules={[{ required: true, message: "Estimated hours are required." }]}
        >
          <InputNumber min={1} max={8760} style={{ width: "100%" }} addonAfter="Hours" />
        </Form.Item>

        <Form.Item label="Sort order" name="sort_order">
          <InputNumber min={0} max={9999} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Active" name="is_active" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
