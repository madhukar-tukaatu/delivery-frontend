"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, Modal, Row, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import { StatusTag } from "@/components/PageTools";

const { Text } = Typography;

export default function MerchantsPage() {
  const { can } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [form] = Form.useForm();

  const load = useCallback(async (page = 1, pageSize = 15) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, ...(search && { search }) };
      const res = await api.get("/admin/merchants", { params });
      const payload = res.data?.data || res.data;
      const list = payload?.data || payload || [];
      setRows(Array.isArray(list) ? list : []);
      setPagination({ current: payload?.current_page || page, pageSize: payload?.per_page || pageSize, total: payload?.total || list.length });
    } catch {
      message.error("Could not load merchants.");
    } finally {
      setLoading(false);
    }
  }, [search, refresh]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    try {
      await api.post(`/admin/merchants/${id}/approve`);
      message.success("Approved.");
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed.");
    }
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await api.post("/admin/merchants", { ...values, create_login: true });
      message.success("Merchant created.");
      setOpen(false);
      form.resetFields();
      setRefresh(Date.now());
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: "Name", dataIndex: "name", render: v => <Text strong>{v || "—"}</Text> },
    { title: "Code", dataIndex: "code", render: v => v ? <Tag>{v}</Tag> : "—" },
    { title: "Phone", dataIndex: "phone", render: v => v || "—" },
    { title: "Email", dataIndex: "email", render: v => v || "—" },
    { title: "Status", dataIndex: "status", render: v => <StatusTag value={v} /> },
    {
      title: "Action", width: 100,
      render: (_, r) => (
        <Space size={4}>
          {can("merchants.approve") && r.status === "pending" && (
            <Button size="small" type="primary" onClick={() => handleApprove(r.id)}>Approve</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card>
        <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
          <div>
            <Text style={{ fontSize: 18, fontWeight: 700 }}>Merchants / Stores</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>Manage merchant accounts.</Text>
          </div>
          <Space>
            {can("merchants.create") && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Add Merchant</Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => load(1, pagination.pageSize)}>Refresh</Button>
          </Space>
        </Space>
        <Space wrap style={{ marginTop: 12 }}>
          <Input allowClear style={{ width: 240 }} placeholder="Search name / email"
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
          pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `${t} merchants`, onChange: (p, ps) => load(p, ps) }}
        />
      </Card>

      <Modal open={open} title="Add Merchant" onCancel={() => { setOpen(false); form.resetFields(); }}
        onOk={() => form.submit()} confirmLoading={submitting} width={520} destroyOnClose>
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Store Name" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Phone"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="contact_person" label="Contact Person"><Input /></Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="password" label="Login Password" initialValue="password">
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}
