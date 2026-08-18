"use client";

import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, Modal, Row, Space, Table, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";

const { Text } = Typography;

export default function CustomersPage() {
  const { can, branchId } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, search };
      if (branchId) params.branch_id = branchId;
      const res = await api.get("/admin/customers", { params });
      const payload = res.data?.data || res.data;
      const list = payload?.data || payload || [];
      setRows(Array.isArray(list) ? list : []);
      setPagination({ current: payload?.current_page || page, pageSize: payload?.per_page || pageSize, total: payload?.total || list.length });
    } catch {
      message.error("Could not load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await api.post("/admin/customers", values);
      message.success("Customer created.");
      setOpen(false);
      form.resetFields();
      load(1, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Name",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.name || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.email || "—"}</Text>
        </Space>
      ),
    },
    { title: "Phone", dataIndex: "phone", render: v => v || "—" },
    { title: "City", dataIndex: "city", render: v => v || "—" },
    { title: "Area", dataIndex: "area", render: v => v || "—" },
    { title: "Merchant", render: (_, r) => r.merchant?.name || "—" },
    { title: "Shipments", dataIndex: "shipments_count", render: v => v ?? "—" },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card>
        <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
          <div>
            <Text style={{ fontSize: 18, fontWeight: 700 }}>Customers</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>Manage customer records.</Text>
          </div>
          <Space>
            {can("customers.create") && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Add Customer</Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize)}>Refresh</Button>
          </Space>
        </Space>
        <Space wrap style={{ marginTop: 12 }}>
          <Input allowClear style={{ width: 240 }} placeholder="Search name / phone / email"
            prefix={<SearchOutlined />} value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => load(1, pagination.pageSize)}
          />
          <Button type="primary" onClick={() => load(1, pagination.pageSize)}>Search</Button>
          <Button onClick={() => { setSearch(""); setTimeout(() => load(1, pagination.pageSize), 0); }}>Reset</Button>
        </Space>
      </Card>

      <Card>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 800 }}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `${t} customers`, onChange: (p, ps) => load(p, ps) }}
        />
      </Card>

      <Modal open={open} title="Add Customer" onCancel={() => { setOpen(false); form.resetFields(); }}
        onOk={() => form.submit()} confirmLoading={submitting} width={520}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="city" label="City"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="area" label="Area"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="merchant_id" label="Merchant ID"><Input /></Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}
