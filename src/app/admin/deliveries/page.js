"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Select, Space, Table, Tooltip, Typography, message } from "antd";
import { ReloadOutlined, SearchOutlined, UserAddOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import { StatusTag } from "@/components/PageTools";

const { Text } = Typography;

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Assigned", value: "assigned" },
  { label: "Accepted", value: "accepted" },
  { label: "Out for Delivery", value: "out_for_delivery" },
  { label: "Delivered", value: "delivered" },
  { label: "Failed", value: "failed" },
];

export default function DeliveriesPage() {
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
      const res = await api.get("/admin/deliveries", { params });
      const payload = res.data?.data || res.data;
      const list = payload?.data || payload || [];
      setRows(Array.isArray(list) ? list : []);
      setPagination({ current: payload?.current_page || page, pageSize: payload?.per_page || pageSize, total: payload?.total || list.length });
    } catch {
      message.error("Could not load deliveries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, action) => {
    try {
      await api.post(`/admin/deliveries/${id}/${action}`);
      message.success("Status updated.");
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed.");
    }
  };

  const columns = [
    {
      title: "Shipment",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.shipment?.tracking_number || r.shipment_id || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.shipment?.receiver_name || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Delivery Address",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{r.delivery_address || r.shipment?.receiver_address || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.delivery_city || r.shipment?.receiver_city || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Assigned Rider",
      render: (_, r) => r.assigned_staff?.name || r.delivery_staff?.name
        ? <Text>{r.assigned_staff?.name || r.delivery_staff?.name}</Text>
        : <Text type="danger" italic style={{ fontSize: 12 }}>Unassigned</Text>,
    },
    { title: "Scheduled", dataIndex: "scheduled_date", render: v => v || "—" },
    { title: "Status", dataIndex: "status", render: v => <StatusTag value={v} /> },
    {
      title: "Actions",
      render: (_, r) => (
        <Space size={4}>
          {can("deliveries.assign") && !r.assigned_staff && (
            <Tooltip title="Assign rider">
              <Button size="small" icon={<UserAddOutlined />}
                onClick={() => message.info("Open assign rider modal")}>Assign</Button>
            </Tooltip>
          )}
          {can("deliveries.accept") && r.status === "assigned" && (
            <Button size="small" type="primary" ghost onClick={() => updateStatus(r.id, "accept")}>Accept</Button>
          )}
          {can("deliveries.out_for_delivery") && r.status === "accepted" && (
            <Button size="small" type="primary" onClick={() => updateStatus(r.id, "out-for-delivery")}>Out for Delivery</Button>
          )}
          {can("deliveries.delivered") && r.status === "out_for_delivery" && (
            <Button size="small" style={{ background: "#22c55e", color: "#fff", border: "none" }}
              onClick={() => updateStatus(r.id, "delivered")}>Delivered</Button>
          )}
          {can("deliveries.failed") && ["assigned", "accepted", "out_for_delivery"].includes(r.status) && (
            <Button size="small" danger onClick={() => updateStatus(r.id, "failed")}>Failed</Button>
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
            <Text style={{ fontSize: 18, fontWeight: 700 }}>Deliveries</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>Manage delivery assignments and status updates.</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize)}>Refresh</Button>
        </Space>
        <Space wrap style={{ marginTop: 12 }}>
          <Input allowClear style={{ width: 220 }} placeholder="Search tracking / customer"
            prefix={<SearchOutlined />} value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => load(1, pagination.pageSize)}
          />
          <Select allowClear style={{ width: 180 }} placeholder="Status"
            value={status || undefined} onChange={v => setStatus(v || "")}
            options={STATUS_OPTIONS}
          />
          <Button type="primary" onClick={() => load(1, pagination.pageSize)}>Search</Button>
          <Button onClick={() => { setSearch(""); setStatus(""); setTimeout(() => load(1, pagination.pageSize), 0); }}>Reset</Button>
        </Space>
      </Card>
      <Card>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 900 }}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `${t} deliveries`, onChange: (p, ps) => load(p, ps) }}
        />
      </Card>
    </Space>
  );
}
