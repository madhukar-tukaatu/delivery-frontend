"use client";

import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Table, Typography, message } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import { StatusTag } from "@/components/PageTools";

const { Text } = Typography;

export default function DispatchesPage() {
  const { can, branchId } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, search, status };
      if (branchId) params.branch_id = branchId;
      const res = await api.get("/admin/dispatches", { params });
      const payload = res.data?.data || res.data;
      const list = payload?.data || payload || [];
      setRows(Array.isArray(list) ? list : []);
      setPagination({ current: payload?.current_page || page, pageSize: payload?.per_page || pageSize, total: payload?.total || list.length });
    } catch {
      message.error("Could not load dispatches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReceive = async (id) => {
    try {
      await api.post(`/admin/dispatches/${id}/receive`);
      message.success("Manifest received.");
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed.");
    }
  };

  const handleDispatch = async (id) => {
    try {
      await api.post(`/admin/dispatches/${id}/dispatch`);
      message.success("Dispatched.");
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed.");
    }
  };

  const handleCreate = async (values) => {
    setSubmitting(true);
    try {
      const shipment_ids = String(values.shipment_ids || "")
        .split(",").map(x => Number(x.trim())).filter(Boolean);
      const payload = { ...values, shipment_ids };
      if (branchId) payload.from_branch_id = payload.from_branch_id || branchId;
      await api.post("/admin/dispatches", payload);
      message.success("Manifest created.");
      setCreateOpen(false);
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
      title: "Manifest",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.manifest_number || `#${r.id}`}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.vehicle_number || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Route",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{r.from_branch?.name || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>→ {r.to_branch?.name || "—"}</Text>
        </Space>
      ),
    },
    { title: "Driver", dataIndex: "driver_name", render: v => v || "—" },
    { title: "Shipments", dataIndex: "shipment_count", render: v => v ?? "—" },
    { title: "Status", dataIndex: "status", render: v => <StatusTag value={v} /> },
    { title: "Created", dataIndex: "created_at", render: v => v ? new Date(v).toLocaleDateString() : "—" },
    {
      title: "Actions",
      render: (_, r) => (
        <Space size={4}>
          {can("dispatches.receive") && r.status === "in_transit" && (
            <Button size="small" type="primary" ghost onClick={() => handleReceive(r.id)}>Receive</Button>
          )}
          {can("dispatches.dispatch") && r.status === "pending" && (
            <Button size="small" type="primary" onClick={() => handleDispatch(r.id)}>Dispatch</Button>
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
            <Text style={{ fontSize: 18, fontWeight: 700 }}>Dispatches</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>Manage dispatch manifests and transfers.</Text>
          </div>
          <Space>
            {can("dispatches.create") && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                Create Manifest
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize)}>Refresh</Button>
          </Space>
        </Space>
        <Space wrap style={{ marginTop: 12 }}>
          <Input allowClear style={{ width: 220 }} placeholder="Search manifest / driver"
            prefix={<SearchOutlined />} value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => load(1, pagination.pageSize)}
          />
          <Select allowClear style={{ width: 160 }} placeholder="Status"
            value={status || undefined} onChange={v => setStatus(v || "")}
            options={[
              { label: "Pending", value: "pending" },
              { label: "In Transit", value: "in_transit" },
              { label: "Received", value: "received" },
              { label: "Dispatched", value: "dispatched" },
            ]}
          />
          <Button type="primary" onClick={() => load(1, pagination.pageSize)}>Search</Button>
          <Button onClick={() => { setSearch(""); setStatus(""); setTimeout(() => load(1, pagination.pageSize), 0); }}>Reset</Button>
        </Space>
      </Card>

      <Card>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 900 }}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `${t} manifests`, onChange: (p, ps) => load(p, ps) }}
        />
      </Card>

      <Modal
        open={createOpen}
        title="Create Dispatch Manifest"
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="from_branch_id" label="From Branch ID"
                initialValue={branchId}
                rules={[{ required: true }]}>
                <Input placeholder="Branch ID" disabled={!!branchId} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="to_branch_id" label="To Branch ID" rules={[{ required: true }]}>
                <Input placeholder="Destination branch ID" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="vehicle_number" label="Vehicle Number">
                <Input placeholder="BA 1 CHA 1234" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="driver_name" label="Driver Name">
                <Input placeholder="Driver name" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="shipment_ids" label="Shipment IDs (comma separated)" rules={[{ required: true }]}>
                <Input.TextArea rows={2} placeholder="1, 2, 3, 4" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}
