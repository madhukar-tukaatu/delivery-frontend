"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import { EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import WorkflowStatusTag from "@/features/workflow/components/WorkflowStatusTag";
import { formatDateTime, formatMoney } from "@/config/workflowStatus";

const { Text } = Typography;

const STATUS_OPTIONS = [
  { label: "Booked", value: "booked" },
  { label: "Pickup Assigned", value: "pickup_assigned" },
  { label: "Picked Up", value: "picked_up" },
  { label: "In Transit", value: "in_transit" },
  { label: "Out For Delivery", value: "out_for_delivery" },
  { label: "Delivered", value: "delivered" },
  { label: "Delivery Failed", value: "delivery_failed" },
  { label: "Returned", value: "returned" },
];

export default function ShipmentsPage() {
  const router = useRouter();
  const { can, branchId } = usePermissions();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ search: "", status: "", service_type: "", payment_type: "" });

  const load = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, ...filters };
      // Branch-scoped users only see their branch shipments
      if (branchId) params.branch_id = branchId;

      const res = await api.get("/admin/shipments", { params });
      const payload = res.data?.data || res.data;
      const list = payload?.data || payload?.shipments?.data || payload?.shipments || [];
      const meta = payload?.data || payload?.shipments || {};

      setRows(Array.isArray(list) ? list : []);
      setPagination({ current: meta.current_page || page, pageSize: meta.per_page || pageSize, total: meta.total || list.length });
    } catch {
      message.error("Could not load shipments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const columns = [
    {
      title: "Tracking",
      dataIndex: "tracking_number",
      fixed: "left",
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Button type="link" style={{ padding: 0, fontWeight: 700 }} onClick={() => router.push(`/admin/shipments/${r.id}`)}>
            {v || "—"}
          </Button>
          <Text type="secondary" style={{ fontSize: 11 }}>Order: {r.merchant_order_id || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Customer",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.receiver_name || r.customer_name || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.receiver_phone || r.customer_phone || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Route",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{r.origin_branch?.name || r.sender_city || "—"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>→ {r.destination_branch?.name || r.receiver_city || "—"}</Text>
        </Space>
      ),
    },
    { title: "Service", dataIndex: "service_type", render: v => v ? <Tag color="blue">{v}</Tag> : "—" },
    { title: "Payment", dataIndex: "payment_type", render: v => <Tag color={v === "pod" ? "orange" : "green"}>{v || "—"}</Tag> },
    { title: "Fee", align: "right", render: (_, r) => formatMoney(Number(r.delivery_charge || r.delivery_fee || 0)) },
    { title: "POD", align: "right", render: (_, r) => formatMoney(Number(r.pod_amount || 0)) },
    { title: "Status", dataIndex: "status", render: v => <WorkflowStatusTag status={v} /> },
    { title: "Created", dataIndex: "created_at", render: v => formatDateTime(v) },
    {
      title: "Action",
      fixed: "right",
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/admin/shipments/${r.id}`)}>View</Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
            <div>
              <Text style={{ fontSize: 18, fontWeight: 700 }}>Shipments</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>Track and manage all courier shipments.</Text>
            </div>
            <Space>
              {can("shipments.create") && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push("/admin/shipments/create")}>
                  New Shipment
                </Button>
              )}
              <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize)}>Refresh</Button>
            </Space>
          </Space>

          <Space wrap>
            <Input allowClear style={{ width: 240 }} placeholder="Search tracking / customer"
              prefix={<SearchOutlined />} value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              onPressEnter={() => load(1, pagination.pageSize)}
            />
            <Select allowClear style={{ width: 180 }} placeholder="Status"
              value={filters.status || undefined}
              onChange={v => setFilters(f => ({ ...f, status: v || "" }))}
              options={STATUS_OPTIONS}
            />
            <Select allowClear style={{ width: 150 }} placeholder="Payment"
              value={filters.payment_type || undefined}
              onChange={v => setFilters(f => ({ ...f, payment_type: v || "" }))}
              options={[{ label: "POD", value: "pod" }, { label: "Prepaid", value: "prepaid" }]}
            />
            <Button type="primary" onClick={() => load(1, pagination.pageSize)}>Search</Button>
            <Button onClick={() => { setFilters({ search: "", status: "", service_type: "", payment_type: "" }); setTimeout(() => load(1, pagination.pageSize), 0); }}>Reset</Button>
          </Space>
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1200 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: t => `${t} shipments`,
            onChange: (p, ps) => load(p, ps),
          }}
        />
      </Card>
    </Space>
  );
}
