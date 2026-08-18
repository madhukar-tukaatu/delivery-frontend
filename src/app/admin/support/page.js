"use client";

import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Table, Tag, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import { StatusTag } from "@/components/PageTools";

const { Text } = Typography;

const PRIORITY_COLOR = { low: "default", normal: "blue", high: "orange", urgent: "red" };

export default function SupportPage() {
  const { can, branchId } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, search, status };
      if (branchId) params.branch_id = branchId;
      const res = await api.get("/admin/support-tickets", { params });
      const payload = res.data?.data || res.data;
      const list = payload?.data || payload || [];
      setRows(Array.isArray(list) ? list : []);
      setPagination({ current: payload?.current_page || page, pageSize: payload?.per_page || pageSize, total: payload?.total || list.length });
    } catch {
      message.error("Could not load support tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await api.post("/admin/support-tickets", values);
      message.success("Ticket created.");
      setOpen(false);
      form.resetFields();
      load(1, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.post(`/admin/support-tickets/${id}/resolve`);
      message.success("Ticket resolved.");
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed.");
    }
  };

  const columns = [
    {
      title: "Subject",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.subject || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.merchant?.name || r.merchant_id ? `Merchant: ${r.merchant?.name || r.merchant_id}` : ""}</Text>
        </Space>
      ),
    },
    { title: "Priority", dataIndex: "priority", render: v => <Tag color={PRIORITY_COLOR[v] || "default"}>{v || "—"}</Tag> },
    { title: "Assigned To", render: (_, r) => r.assigned_to?.name || <Text type="secondary">Unassigned</Text> },
    { title: "Status", dataIndex: "status", render: v => <StatusTag value={v} /> },
    { title: "Created", dataIndex: "created_at", render: v => v ? new Date(v).toLocaleDateString() : "—" },
    {
      title: "Actions",
      render: (_, r) => (
        <Space size={4}>
          {can("support.manage") && r.status !== "resolved" && (
            <Button size="small" type="primary" ghost onClick={() => handleResolve(r.id)}>Resolve</Button>
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
            <Text style={{ fontSize: 18, fontWeight: 700 }}>Support Tickets</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>View and manage customer support tickets.</Text>
          </div>
          <Space>
            {can("support.manage") && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>New Ticket</Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize)}>Refresh</Button>
          </Space>
        </Space>
        <Space wrap style={{ marginTop: 12 }}>
          <Input allowClear style={{ width: 240 }} placeholder="Search subject"
            prefix={<SearchOutlined />} value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => load(1, pagination.pageSize)}
          />
          <Select allowClear style={{ width: 160 }} placeholder="Status"
            value={status || undefined} onChange={v => setStatus(v || "")}
            options={[
              { label: "Open", value: "open" },
              { label: "In Progress", value: "in_progress" },
              { label: "Resolved", value: "resolved" },
              { label: "Closed", value: "closed" },
            ]}
          />
          <Button type="primary" onClick={() => load(1, pagination.pageSize)}>Search</Button>
          <Button onClick={() => { setSearch(""); setStatus(""); setTimeout(() => load(1, pagination.pageSize), 0); }}>Reset</Button>
        </Space>
      </Card>

      <Card>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 800 }}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `${t} tickets`, onChange: (p, ps) => load(p, ps) }}
        />
      </Card>

      <Modal open={open} title="New Support Ticket" onCancel={() => { setOpen(false); form.resetFields(); }}
        onOk={() => form.submit()} confirmLoading={submitting} width={520}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ priority: "normal" }}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="merchant_id" label="Merchant ID"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="priority" label="Priority">
                <Select options={["low", "normal", "high", "urgent"].map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="subject" label="Subject" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="message" label="Message" rules={[{ required: true }]}>
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}
