"use client";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography, message } from "antd";
import {
  EyeOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import ManifestTransportCostModal from "@/components/admin/transfers/ManifestTransportCostModal";
import { TrStatusTag, TR_STATUS_META } from "@/components/admin/transfers/TransferReceiveScanner";
import { VEHICLE_TYPES, vehicleLabel } from "@/components/admin/transfers/TransferDispatchModal";

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
  const [costManifestId, setCostManifestId] = useState(null);

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

  // Receiving a TR happens in the Transfers check-in (scan / tick, missing, extra, auto-sort).
  const receiveHref = (r) => `/admin/transfers?tab=inbound&tr=${r.id}`;

  const handleCreate = async (values) => {
    setSubmitting(true);
    try {
      const shipment_ids = String(values.shipment_ids || "")
        .split(",").map(x => Number(x.trim())).filter(Boolean);
      const payload = { ...values, shipment_ids };
      if (branchId) payload.from_branch_id = payload.from_branch_id || branchId;
      const res = await api.post("/admin/dispatches", payload);
      const created = res?.data?.data;
      message.success(res?.data?.message || `${created?.display_number || created?.transfer_number || "TR"} dispatched.`);
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
      title: "TR",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.display_number || r.transfer_number || r.manifest_number || `#${r.id}`}</Text>
          {r.transfer_number && r.manifest_number ? (
            <Text type="secondary" style={{ fontSize: 10 }}>{r.manifest_number}</Text>
          ) : null}
          <Text type="secondary" style={{ fontSize: 11 }}>
            {[vehicleLabel(r.vehicle_type), r.vehicle_number].filter(Boolean).join(" · ") || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Route",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{r.from_branch?.name || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{"-> "}{r.to_branch?.name || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Carried by",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{r.rider?.name || r.driver_name || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.rider?.phone || r.driver_phone || ""}</Text>
        </Space>
      ),
    },
    {
      title: "Parcels",
      render: (_, r) => (
        <Space size={2} wrap>
          <Tag style={{ margin: 0 }}>{r.expected_count || r.shipment_count || 0} exp</Tag>
          {r.received_count ? <Tag color="green" style={{ margin: 0 }}>{r.received_count} in</Tag> : null}
          {r.missing_count ? <Tag color="orange" style={{ margin: 0 }}>{r.missing_count} missing</Tag> : null}
          {r.extra_count ? <Tag color="gold" style={{ margin: 0 }}>{r.extra_count} extra</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Transport",
      dataIndex: "transport_cost",
      render: (v, r) => (
        <Button size="small" type="link" style={{ padding: 0 }} onClick={() => setCostManifestId(r.id)}>
          Rs {Number(v || 0).toFixed(2)}
        </Button>
      ),
    },
    { title: "Status", dataIndex: "status", render: v => <TrStatusTag status={v} /> },
    { title: "Created", dataIndex: "created_at", render: v => v ? new Date(v).toLocaleDateString() : "-" },
    {
      title: "Actions",
      render: (_, r) => (
        <Space size={4}>
          {(can("dispatches.receive") || can("transfers.receive")) && ["dispatched", "in_transit", "partially_received"].includes(r.status) ? (
            <Link href={receiveHref(r)}>
              <Button size="small" type="primary" ghost icon={<InboxOutlined />}>
                {r.status === "partially_received" ? "Resolve" : "Receive"}
              </Button>
            </Link>
          ) : (
            <Link href={receiveHref(r)}>
              <Button size="small" icon={<EyeOutlined />}>View</Button>
            </Link>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Dispatches"
        subtitle="TRs (transfer containers): one per trip between branches. Receive them in Transfers → In Transit."
        icon={<SendOutlined />}
        actions={
          <>
            {can("dispatches.create") && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                Create TR
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize)}>Refresh</Button>
          </>
        }
      />

      <Card>
        <Space wrap style={{ marginTop: 12 }}>
          <Input allowClear style={{ width: 240 }} placeholder="Search TR no. / vehicle / driver"
            prefix={<SearchOutlined />} value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => load(1, pagination.pageSize)}
          />
          <Select allowClear style={{ width: 190 }} placeholder="Status"
            value={status || undefined} onChange={v => setStatus(v || "")}
            options={Object.entries(TR_STATUS_META).map(([value, m]) => ({ value, label: m.label }))}
          />
          <Button type="primary" onClick={() => load(1, pagination.pageSize)}>Search</Button>
          <Button onClick={() => { setSearch(""); setStatus(""); setTimeout(() => load(1, pagination.pageSize), 0); }}>Reset</Button>
        </Space>
      </Card>

      <Card>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 900 }}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `${t} TRs`, onChange: (p, ps) => load(p, ps) }}
        />
      </Card>

      <Modal
        open={createOpen}
        title="Create TR (dispatch now)"
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
              <Form.Item name="vehicle_type" label="Vehicle type" initialValue="bike">
                <Select options={VEHICLE_TYPES} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="vehicle_number" label="Vehicle Number">
                <Input placeholder="BA 1 CHA 1234" maxLength={50} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="driver_name" label="Driver Name">
                <Input placeholder="Driver name" maxLength={100} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="driver_phone" label="Driver Phone">
                <Input placeholder="98XXXXXXXX" maxLength={20} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="transport_cost" label="Trip transport cost (Rs)" extra="Split over the parcels and paid back to the dispatching branch.">
                <InputNumber min={0} step={50} style={{ width: "100%" }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="transport_cost_split_mode" label="Split" initialValue="equal">
                <Select options={[{ label: "Equal per parcel", value: "equal" }, { label: "By weight", value: "weight" }]} />
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

      <ManifestTransportCostModal
        manifestId={costManifestId}
        open={!!costManifestId}
        onClose={() => setCostManifestId(null)}
        onSaved={() => load(pagination.current, pagination.pageSize)}
      />
    </Space>
  );
}
