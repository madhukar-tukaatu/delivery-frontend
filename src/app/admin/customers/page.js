"use client";
import { useState } from "react";
import api from "@/lib/api";
import {
  Button,
  Form,
  Input,
  Modal,
  SimpleTablePage,
  message,
} from "@/components/PageTools";
export default function CustomersPage() {
  const [open, setOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [form] = Form.useForm();
  const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Phone", dataIndex: "phone" },
    { title: "Email", dataIndex: "email" },
    { title: "City", dataIndex: "city" },
    { title: "Area", dataIndex: "area" },
    {
      title: "Merchant",
      render: (_, r) => r.merchant?.name || r.merchant_id || "-",
    },
  ];
  async function submit(values) {
    try {
      await api.post("/admin/customers", values);
      message.success("Customer created");
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
        title="Customers"
        endpoint="/admin/customers"
        columns={columns}
        reloadKey={refresh}
        extra={
          <Button type="primary" onClick={() => setOpen(true)}>
            Add Customer
          </Button>
        }
      />
      <Modal
        open={open}
        title="Add Customer"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form layout="vertical" form={form} onFinish={submit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="merchant_id" label="Merchant ID">
            <Input />
          </Form.Item>
          <Form.Item name="city" label="City">
            <Input />
          </Form.Item>
          <Form.Item name="area" label="Area">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
