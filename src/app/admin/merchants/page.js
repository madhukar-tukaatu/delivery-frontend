"use client";
import { useState } from "react";
import api from "@/lib/api";
import {
  Button,
  Form,
  Input,
  Modal,
  SimpleTablePage,
  StatusTag,
  message,
} from "@/components/PageTools";
export default function MerchantsPage() {
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [form] = Form.useForm();
  const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Code", dataIndex: "code" },
    { title: "Phone", dataIndex: "phone" },
    { title: "Email", dataIndex: "email" },
    {
      title: "Status",
      dataIndex: "status",
      render: (v) => <StatusTag value={v} />,
    },
    {
      title: "Action",
      render: (_, row) => (
        <Button
          size="small"
          onClick={() =>
            api.post(`/admin/merchants/${row.id}/approve`).then(() => {
              message.success("Approved");
              setRefresh(Date.now());
            })
          }
        >
          Approve
        </Button>
      ),
    },
  ];
  async function submit(values) {
    try {
      await api.post("/admin/merchants", { ...values, create_login: true });
      message.success("Merchant created");
      setOpen(false);
      form.resetFields();
      setRefresh(Date.now());
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed");
    }
  }
  return (
    <>
      <SimpleTablePage
        title="Merchants / Stores"
        endpoint="/admin/merchants"
        columns={columns}
        reloadKey={refresh}
        extra={
          <Button type="primary" onClick={() => setOpen(true)}>
            Add Merchant
          </Button>
        }
      />
      <Modal
        open={open}
        title="Add Merchant"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form layout="vertical" form={form} onFinish={submit}>
          <Form.Item
            name="name"
            label="Store Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="contact_person" label="Contact Person">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea />
          </Form.Item>
          <Form.Item
            name="password"
            label="Login Password"
            initialValue="password"
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
