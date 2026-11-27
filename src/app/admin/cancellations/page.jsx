"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Input,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  DownloadOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import StatCard, { StatCardGrid } from "@/components/admin/ui/StatCard";
import { useShipmentDrawer } from "@/components/admin/shipments/ShipmentDrawerProvider";
import { getShipments } from "@/services/admin/shipmentService";
import { formatMerchantLabel } from "@/lib/merchantLabel";
import { exportToCsv } from "@/utils/csvHelper";

const { Text } = Typography;

export default function AdminCancellationsPage() {
  const { openShipment } = useShipmentDrawer();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadData = useCallback(
    async (page = 1, pageSize = 15) => {
      setLoading(true);
      try {
        const res = await getShipments({
          status: "cancelled",
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
      } catch (e) {
        message.error(e?.response?.data?.message || "Could not load cancellations.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch]
  );

  useEffect(() => {
    loadData(1, pagination.pageSize);
  }, [loadData]);

  const handleExport = () => {
    exportToCsv({
      filename: `cancellations_${new Date().toISOString().slice(0, 10)}.csv`,
      columns: [
        { key: "tracking_number", header: "Tracking" },
        { key: "merchant_name", header: "Merchant" },
        { key: "receiver_name", header: "Customer" },
        { key: "receiver_phone", header: "Phone" },
        { key: "cancel_reason", header: "Reason" },
        { key: "created_at", header: "Date" },
      ],
      data: rows.map((r) => ({
        ...r,
        merchant_name: r.merchant?.name || "",
        cancel_reason: r.cancel_reason || r.failure_reason || "",
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
            style={{ fontWeight: 700, fontFamily: "monospace", color: "#cf1322" }}
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
      title: "Cancellation Reason",
      key: "reason",
      render: (_, r) => {
        const reason = r.cancel_reason || r.failure_reason || r.notes || "Order cancelled";
        return (
          <div style={{ maxWidth: 260 }}>
            <Text style={{ fontSize: 12, color: "#dc2626" }}>{reason}</Text>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: () => <Tag color="default">CANCELLED</Tag>,
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
        title="Cancellations"
        subtitle="Review cancelled orders, refused deliveries, and order termination logs"
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

      <StatCardGrid columns={3} style={{ marginBottom: 16 }}>
        <StatCard
          label="Total Cancelled"
          value={pagination.total}
          icon={<CloseCircleOutlined style={{ color: "#cf1322" }} />}
          accentColor="#cf1322"
        />
        <StatCard
          label="Door / Refused"
          value={rows.filter((r) => (r.cancel_reason || "").toLowerCase().includes("refus") || (r.cancel_reason || "").toLowerCase().includes("door")).length}
          icon={<StopOutlined style={{ color: "#d97706" }} />}
          accentColor="#d97706"
        />
        <StatCard
          label="Merchant / System"
          value={rows.filter((r) => !(r.cancel_reason || "").toLowerCase().includes("refus") && !(r.cancel_reason || "").toLowerCase().includes("door")).length}
          icon={<StopOutlined style={{ color: "#64748b" }} />}
          accentColor="#64748b"
        />
      </StatCardGrid>

      <Card className="admin-card" style={{ marginBottom: 12 }}>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
          placeholder="Search tracking, merchant, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 320 }}
        />
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
