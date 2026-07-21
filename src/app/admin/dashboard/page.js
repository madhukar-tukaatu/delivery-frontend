"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ApartmentOutlined,
  ArrowRightOutlined,
  BankOutlined,
  BoxPlotOutlined,
  DollarOutlined,
  ReloadOutlined,
  RiseOutlined,
  ShopOutlined,
  TeamOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";

const { Text } = Typography;

const STATUS_COLOR = {
  delivered: "success",
  delivery_failed: "error",
  returned: "warning",
  cancelled: "default",
  pending: "processing",
  active: "success",
  suspended: "warning",
  settled: "success",
  collected: "blue",
  deposited: "cyan",
};

function formatCurrency(val) {
  if (!val && val !== 0) return "—";
  return `Rs. ${Number(val).toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({ title, value, prefix, color, link, loading }) {
  return (
    <Card size="small" loading={loading}>
      <Statistic
        title={
          <Space style={{ justifyContent: "space-between", width: "100%" }}>
            <Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>
            {link && (
              <Link href={link}>
                <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} icon={<ArrowRightOutlined />} />
              </Link>
            )}
          </Space>
        }
        value={value ?? 0}
        prefix={prefix}
        valueStyle={{ color, fontSize: 24, fontWeight: 600 }}
      />
    </Card>
  );
}

export default function DashboardPage() {
  const [shipments, setShipments] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [pod, setPod] = useState(null);
  const [merchants, setMerchants] = useState(null);
  const [branches, setBranches] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, rRes, pRes, mRes, bRes] = await Promise.allSettled([
        api.get("/admin/reports/shipments"),
        api.get("/admin/reports/revenue"),
        api.get("/admin/reports/pod"),
        api.get("/admin/reports/merchants"),
        api.get("/admin/reports/branches"),
      ]);

      if (sRes.status === "fulfilled") setShipments(sRes.value.data?.data);
      if (rRes.status === "fulfilled") setRevenue(rRes.value.data?.data);
      if (pRes.status === "fulfilled") setPod(pRes.value.data?.data);
      if (mRes.status === "fulfilled") setMerchants(mRes.value.data?.data);
      if (bRes.status === "fulfilled") setBranches(bRes.value.data?.data);

      const allFailed = [sRes, rRes, pRes, mRes, bRes].every((r) => r.status === "rejected");
      if (allFailed) setError("Could not load dashboard data.");
    } catch {
      setError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, []);

  // Derived
  const byStatus = shipments?.by_status || [];
  const byMerchant = shipments?.by_merchant || [];
  const byBranchOrigin = branches?.shipments_by_origin || [];
  const branchByType = branches?.by_type || [];
  const podByStatus = pod?.by_status || [];
  const merchantSettlements = merchants?.settlements || [];
  const monthlyRevenue = revenue?.monthly || [];

  const shipmentStatusColumns = [
    { title: "Status", dataIndex: "status", render: (v) => <Badge status={STATUS_COLOR[v] || "default"} text={v} /> },
    { title: "Count", dataIndex: "total", align: "right", render: (v) => <Text strong>{v}</Text> },
  ];

  const merchantShipmentColumns = [
    {
      title: "Merchant",
      render: (_, r) => r.merchant?.name || <Text type="secondary">#{r.merchant_id}</Text>,
    },
    { title: "Shipments", dataIndex: "total", align: "right", render: (v) => <Text strong>{v}</Text> },
    {
      title: "POD Total",
      dataIndex: "pod_total",
      align: "right",
      render: (v) => <Text type="secondary">{formatCurrency(v)}</Text>,
    },
  ];

  const branchOriginColumns = [
    {
      title: "Branch",
      render: (_, r) => r.origin_branch?.name || <Text type="secondary">#{r.origin_branch_id}</Text>,
    },
    { title: "Shipments", dataIndex: "total", align: "right", render: (v) => <Text strong>{v}</Text> },
  ];

  const settlementColumns = [
    { title: "Status", dataIndex: "status", render: (v) => <Tag color={STATUS_COLOR[v] || "default"}>{v}</Tag> },
    { title: "Count", dataIndex: "total", align: "right" },
    { title: "Amount", dataIndex: "amount", align: "right", render: (v) => formatCurrency(v) },
  ];

  const revenueColumns = [
    { title: "Month", dataIndex: "month" },
    { title: "Revenue", dataIndex: "total", align: "right", render: (v) => <Text strong>{formatCurrency(v)}</Text> },
  ];

  const podStatusColumns = [
    { title: "Status", dataIndex: "status", render: (v) => <Badge status={STATUS_COLOR[v] || "default"} text={v} /> },
    { title: "Count", dataIndex: "total", align: "right" },
    { title: "Amount", dataIndex: "amount", align: "right", render: (v) => formatCurrency(v) },
  ];

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button size="small" onClick={loadAll}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%", padding: 20 }}>

      {/* ── Header ── */}
      <Row justify="space-between" align="middle">
        <Col>
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: 20, fontWeight: 600 }}>Admin Dashboard</Text>
            <Text type="secondary">Overview of shipments, revenue, branches and merchants.</Text>
          </Space>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading}>
            Refresh
          </Button>
        </Col>
      </Row>

      {/* ── Shipment stats ── */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={4}>
          <StatCard title="Total Shipments" value={shipments?.total} prefix={<BoxPlotOutlined />} color="#6366f1" link="/admin/shipments" loading={loading} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title="Delivered" value={shipments?.delivered} prefix={<TruckOutlined />} color="#22c55e" loading={loading} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title="Failed" value={shipments?.failed} prefix={<BoxPlotOutlined />} color="#ef4444" loading={loading} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title="Returned" value={shipments?.returned} prefix={<BoxPlotOutlined />} color="#f59e0b" loading={loading} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title="Cancelled" value={shipments?.cancelled} prefix={<BoxPlotOutlined />} color="#6b7280" loading={loading} />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <StatCard title="Branches" value={branches?.total} prefix={<ApartmentOutlined />} color="#3b82f6" link="/admin/branch-offices" loading={loading} />
        </Col>
      </Row>

      {/* ── Revenue + POD stats ── */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <StatCard title="Delivery Charges" value={revenue?.delivery_charges} prefix={<DollarOutlined />} color="#6366f1" loading={loading} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="POD Charges" value={revenue?.pod_charges} prefix={<DollarOutlined />} color="#3b82f6" loading={loading} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="Return Charges" value={revenue?.return_charges} prefix={<DollarOutlined />} color="#f59e0b" loading={loading} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="Total Revenue" value={revenue?.total_charges} prefix={<RiseOutlined />} color="#22c55e" loading={loading} />
        </Col>
      </Row>

      {/* ── Merchant + POD stats ── */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <StatCard title="Total Merchants" value={merchants?.total} prefix={<ShopOutlined />} color="#6366f1" link="/admin/merchants" loading={loading} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="Active Merchants" value={merchants?.active} prefix={<ShopOutlined />} color="#22c55e" loading={loading} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="Total COD" value={pod?.total_cod} prefix={<BankOutlined />} color="#3b82f6" loading={loading} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="COD Pending" value={pod?.pending} prefix={<BankOutlined />} color="#f59e0b" loading={loading} />
        </Col>
      </Row>

      {/* ── Tables row 1: Shipments by status + by merchant ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            size="small"
            title={<Space size={6}><BoxPlotOutlined />Shipments by Status</Space>}
            extra={<Link href="/admin/shipments"><Button type="link" size="small">View all</Button></Link>}
          >
            <Table
              rowKey="status"
              size="small"
              loading={loading}
              dataSource={byStatus}
              columns={shipmentStatusColumns}
              pagination={false}
              locale={{ emptyText: "No data" }}
            />
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card
            size="small"
            title={<Space size={6}><ShopOutlined />Shipments by Merchant</Space>}
            extra={<Link href="/admin/merchants"><Button type="link" size="small">View all</Button></Link>}
          >
            <Table
              rowKey="merchant_id"
              size="small"
              loading={loading}
              dataSource={byMerchant}
              columns={merchantShipmentColumns}
              pagination={{ pageSize: 5, showSizeChanger: false }}
              locale={{ emptyText: "No data" }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Tables row 2: Revenue by month + POD by status ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            size="small"
            title={<Space size={6}><RiseOutlined />Monthly Revenue</Space>}
          >
            <Table
              rowKey="month"
              size="small"
              loading={loading}
              dataSource={[...monthlyRevenue].reverse()}
              columns={revenueColumns}
              pagination={{ pageSize: 6, showSizeChanger: false }}
              locale={{ emptyText: "No data" }}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            size="small"
            title={<Space size={6}><BankOutlined />COD / POD by Status</Space>}
          >
            <Table
              rowKey="status"
              size="small"
              loading={loading}
              dataSource={podByStatus}
              columns={podStatusColumns}
              pagination={false}
              locale={{ emptyText: "No data" }}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Tables row 3: Branches by type + shipments by origin + merchant settlements ── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            size="small"
            title={<Space size={6}><ApartmentOutlined />Branches by Type</Space>}
            extra={<Link href="/admin/branch-offices"><Button type="link" size="small">View all</Button></Link>}
          >
            <Table
              rowKey="type"
              size="small"
              loading={loading}
              dataSource={branchByType}
              columns={[
                { title: "Type", dataIndex: "type", render: (v) => <Tag>{v}</Tag> },
                { title: "Count", dataIndex: "total", align: "right", render: (v) => <Text strong>{v}</Text> },
              ]}
              pagination={false}
              locale={{ emptyText: "No data" }}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            size="small"
            title={<Space size={6}><TruckOutlined />Shipments by Origin Branch</Space>}
          >
            <Table
              rowKey="origin_branch_id"
              size="small"
              loading={loading}
              dataSource={byBranchOrigin}
              columns={branchOriginColumns}
              pagination={{ pageSize: 5, showSizeChanger: false }}
              locale={{ emptyText: "No data" }}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            size="small"
            title={<Space size={6}><TeamOutlined />Merchant Settlements</Space>}
            extra={<Link href="/admin/settlements"><Button type="link" size="small">View all</Button></Link>}
          >
            <Table
              rowKey="status"
              size="small"
              loading={loading}
              dataSource={merchantSettlements}
              columns={settlementColumns}
              pagination={false}
              locale={{ emptyText: "No data" }}
            />
          </Card>
        </Col>
      </Row>

    </Space>
  );
}
