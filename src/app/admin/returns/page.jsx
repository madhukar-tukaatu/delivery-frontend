"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  RollbackOutlined,
  InboxOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import StatCard, { StatCardGrid } from "@/components/admin/ui/StatCard";
import { useShipmentDrawer } from "@/components/admin/shipments/ShipmentDrawerProvider";
import { getShipments } from "@/services/admin/shipmentService";
import { formatMerchantLabel } from "@/lib/merchantLabel";
import { exportToCsv } from "@/utils/csvHelper";

const { Text } = Typography;

const RETURN_STATUSES = [
  "return_initiated",
  "returned_to_origin",
  "returned_to_merchant",
];

const STATUS_TABS = [
  { key: "all", label: "All Returns", statuses: RETURN_STATUSES },
  { key: "initiated", label: "Return Initiated", statuses: ["return_initiated"] },
  { key: "at_hub", label: "At Branch / Hub", statuses: ["returned_to_origin"] },
  { key: "completed", label: "Returned to Store", statuses: ["returned_to_merchant"] },
];

const STATUS_META = {
  return_initiated: { label: "Return Initiated", color: "orange", hex: "#d97706" },
  returned_to_origin: { label: "At Branch Hub", color: "cyan", hex: "#0891b2" },
  returned_to_merchant: { label: "Returned to Store", color: "green", hex: "#16a34a" },
};

export default function AdminReturnsPage() {
  const { openShipment } = useShipmentDrawer();
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [stats, setStats] = useState({ total: 0, initiated: 0, atHub: 0, completed: 0 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadData = useCallback(
    async (page = 1, pageSize = 15) => {
      setLoading(true);
      try {
        const activeTab = STATUS_TABS.find((t) => t.key === statusTab);
        const statuses = activeTab?.statuses || RETURN_STATUSES;
        const res = await getShipments({
          status: statuses.join(","),
          search: debouncedSearch || undefined,
          page,
          per_page: pageSize,
        });

        const list = res.list || [];
        setRows(list);
        setPagination({
          current: res.currentPage || page,
          pageSize: res.pageSize || pageSize,
          total: res.total || list.length,
        });

        // Compute light stats
        setStats({
          total: res.total || list.length,
          initiated: list.filter((r) => r.status === "return_initiated").length,
          atHub: list.filter((r) => r.status === "returned_to_origin").length,
          completed: list.filter((r) => r.status === "returned_to_merchant").length,
        });
      } catch (e) {
        message.error(e?.response?.data?.message || "Could not load returns.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [statusTab, debouncedSearch]
  );

  useEffect(() => {
    loadData(1, pagination.pageSize);
  }, [loadData]);

  const handleExport = () => {
    exportToCsv({
      filename: `returns_${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { key: "tracking_number", header: "Tracking" },
        { key: "merchant_name", header: "Merchant" },
        { key: "receiver_name", header: "Customer" },
        { key: "receiver_phone", header: "Phone" },
        { key: "status", header: "Status" },
        { key: "return_reason", header: "Reason" },
        { key: "created_at", header: "Date" },
      ],
      data: rows.map((r) => ({
        ...r,
        merchant_name: r.merchant?.name || "",
        return_reason: r.return_reason || r.failure_reason || "",
      })),
    });
  };

  const columns = [
    {
      title: "Tracking",
      key: "tracking",
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <a
            onClick={() => openShipment(r.id)}
            style={{ fontWeight: 700, fontFamily: "monospace", color: "#0891b2" }}
          >
            {r.tracking_number || `#${r.id}`}
          </a>
          <Text type="secondary" style={{ fontSize: 11 }}>
            ID #{r.id} · {r.created_at?.slice(0, 10)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Store / Merchant",
      key: "merchant",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{formatMerchantLabel(r.merchant || r)}</Text>
          {r.merchant?.phone && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              📞 {r.merchant.phone}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Customer & Destination",
      key: "receiver",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{r.receiver_name || "Unknown"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            📍 {r.receiver_area || r.receiver_city || r.delivery_address || "No address"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Return Reason",
      key: "reason",
      render: (_, r) => {
        const reason = r.return_reason || r.failure_reason || r.cancel_reason || "Customer refused / unreachable";
        return (
          <div style={{ maxWidth: 220 }}>
            <Text style={{ fontSize: 12, color: "#991b1b" }}>{reason}</Text>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (st) => {
        const meta = STATUS_META[st] || { label: st || "Return", color: "orange" };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_, r) => (
        <Button size="small" onClick={() => openShipment(r.id)}>
          Open Details
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 16, background: "#f7f8fa", minHeight: "100%" }}>
      <AdminPageHeader
        title="Returns (RTO)"
        subtitle="Manage reverse logistics, return-to-origin shipments, and merchant returns"
        action={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export CSV
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => loadData(pagination.current, pagination.pageSize)}>
              Refresh
            </Button>
          </Space>
        }
      />

      <StatCardGrid columns={4} style={{ marginBottom: 16 }}>
        <StatCard
          label="Total Returns"
          value={stats.total}
          icon={<RollbackOutlined style={{ color: "#d97706" }} />}
          accentColor="#d97706"
        />
        <StatCard
          label="Return Initiated"
          value={stats.initiated}
          icon={<InboxOutlined style={{ color: "#ea580c" }} />}
          accentColor="#ea580c"
        />
        <StatCard
          label="At Branch / Hub"
          value={stats.atHub}
          icon={<ShopOutlined style={{ color: "#0891b2" }} />}
          accentColor="#0891b2"
        />
        <StatCard
          label="Returned to Store"
          value={stats.completed}
          icon={<CheckCircleOutlined style={{ color: "#16a34a" }} />}
          accentColor="#16a34a"
        />
      </StatCardGrid>

      <Card className="admin-card" style={{ marginBottom: 12 }}>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Search tracking, merchant, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
          </Space>
          <Space wrap size={6}>
            {STATUS_TABS.map((tab) => {
              const active = statusTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusTab(tab.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    color: active ? "#fff" : "#4b5563",
                    background: active ? "#0891b2" : "#f5f6f8",
                    border: `1px solid ${active ? "#0891b2" : "#eef0f2"}`,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </Space>
        </Space>
      </Card>

      <Card className="admin-card">
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            onChange: (p, ps) => loadData(p, ps),
          }}
        />
      </Card>
    </div>
  );
}
