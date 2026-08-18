"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, Tooltip, Typography, message } from "antd";
import { ReloadOutlined, SearchOutlined, UserAddOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import { StatusTag } from "@/components/PageTools";

const { Text } = Typography;

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Assigned", value: "assigned" },
  { label: "Accepted", value: "accepted" },
  { label: "Picked Up", value: "picked_up" },
  { label: "Failed", value: "failed" },
];

export default function PickupsPage() {
  const { can, branchId } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, search, status };
      if (branchId) params.branch_id = branchId;
      const res = await api.get("/admin/pickups", { params });
      const payload = res.data?.data || res.data;
      const list = payload?.data || payload || [];
      const meta = payload;
      setRows(Array.isArray(list) ? list : []);
      setPagination({ current: meta?.current_page || page, pageSize: meta?.per_page || pageSize, total: meta?.total || list.length });
    } catch {
      message.error("Could not load pickups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, action) => {
    try {
      await api.post(`/admin/pickups/${id}/${action}`);
      message.success("Status updated.");
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed.");
    }
  };

  const columns = [
    {
      title: "Pickup",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.pickup_name || r.customer_name || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.pickup_phone || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Address",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{r.pickup_address || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.pickup_city || "—"}{r.pickup_area ? ` — ${r.pickup_area}` : ""}</Text>
        </Space>
      ),
    },
    {
      title: "Merchant",
      render: (_, r) => r.merchant?.name || <Text type="secondary">—</Text>,
    },
    {
      title: "Assigned To",
      render: (_, r) => r.assigned_staff?.name
        ? <Text>{r.assigned_staff.name}</Text>
        : <Text type="danger" italic style={{ fontSize: 12 }}>Unassigned</Text>,
    },
    { title: "Scheduled", dataIndex: "scheduled_date", render: v => v || "—" },
    { title: "Status", dataIndex: "status", render: v => <StatusTag value={v} /> },
    {
      title: "Actions",
      render: (_, r) => (
        <Space size={4}>
          {can("pickups.assign") && !r.assigned_staff && (
            <Tooltip title="Assign rider">
              <Button size="small" icon={<UserAddOutlined />}
                onClick={() => message.info("Assign rider — open assign modal")}>
                Assign
              </Button>
            </Tooltip>
          )}
          {can("pickups.status") && r.status === "assigned" && (
            <Button size="small" type="primary" ghost
              onClick={() => updateStatus(r.id, "accept")}>Accept</Button>
          )}
          {can("pickups.picked_up") && r.status === "accepted" && (
            <Button size="small" type="primary"
              onClick={() => updateStatus(r.id, "picked-up")}>Picked Up</Button>
          )}
          {can("pickups.failed") && ["assigned", "accepted"].includes(r.status) && (
            <Button size="small" danger
              onClick={() => updateStatus(r.id, "failed")}>Failed</Button>
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
            <Text style={{ fontSize: 18, fontWeight: 700 }}>Pickups</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>Manage pickup assignments and status.</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize)}>Refresh</Button>
        </Space>
        <Space wrap style={{ marginTop: 12 }}>
          <Input allowClear style={{ width: 220 }} placeholder="Search name / phone"
            prefix={<SearchOutlined />} value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => load(1, pagination.pageSize)}
          />
          <Select allowClear style={{ width: 160 }} placeholder="Status"
            value={status || undefined} onChange={v => setStatus(v || "")}
            options={STATUS_OPTIONS}
          />
          <Button type="primary" onClick={() => load(1, pagination.pageSize)}>Search</Button>
          <Button onClick={() => { setSearch(""); setStatus(""); setTimeout(() => load(1, pagination.pageSize), 0); }}>Reset</Button>
        </Space>
      </Card>
      <Card>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 900 }}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `${t} pickups`, onChange: (p, ps) => load(p, ps) }}
        />
      </Card>
    </Space>
  );
}
