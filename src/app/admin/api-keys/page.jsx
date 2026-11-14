"use client";

import { useState } from "react";
import api from "@/lib/api";
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  SimpleTablePage,
  StatusTag,
  message,
  JsonBlock,
} from "@/components/PageTools";

export default function AdminApiKeysPage() {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [form] = Form.useForm();

  const columns = [
    {
      title: "Merchant",
      dataIndex: ["merchant", "name"],
      render: (v, r) => v || r.merchant_id || "System",
    },
    { title: "Name", dataIndex: "name" },
    { title: "API Key", dataIndex: "api_key" },
    { title: "Environment", dataIndex: "environment" },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <StatusTag value={v} />,
    },
  ];

  async function submit(values) {
    try {
      const res = await api.post("/admin/api-keys", values);
      setCreated(res.data.data);
      message.success("API key created");
      setOpen(false);
      setRefresh(Date.now());
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to create API key");
    }
  }

  return (
    <>
      <SimpleTablePage
        title="API Keys"
        endpoint="/admin/api-keys"
        columns={columns}
        reloadKey={refresh}
        extra={
          <Button type="primary" onClick={() => setOpen(true)}>
            Create API Key
          </Button>
        }
      />
      {created && (
        <Modal
          open={!!created}
          onCancel={() => setCreated(null)}
          footer={null}
          title="Copy Secret Now"
        >
          <JsonBlock data={created} />
        </Modal>
      )}
      <Modal
        open={open}
        title="Create API Key"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="environment"
            label="Environment"
            initialValue="sandbox"
          >
            <Select
              options={[
                { value: "sandbox", label: "Sandbox" },
                { value: "live", label: "Live" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
