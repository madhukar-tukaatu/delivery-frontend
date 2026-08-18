"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Badge, Button, Card, Col, Row, Space, Spin, Statistic, Table, Tag, Typography } from "antd";
import {
  ApartmentOutlined, BankOutlined, BoxPlotOutlined, DollarOutlined,
  ReloadOutlined, RiseOutlined, ShopOutlined, TeamOutlined, TruckOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";

const { Text } = Typography;

function fmt(v) {
  if (!v && v !== 0) return "—";
  return `Rs. ${Number(v).toLocaleString("en-NP", { minimumFractionDigits: 2 })}`;
}

function StatCard({ title, value, prefix, color, link, loading, isMoney }) {
  return (
    <Card size="small" loading={loading} style={{ height: "100%" }}>
      <Statistic
        title={
          <Space style={{ justifyContent: "space-between", width: "100%" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>
            {link && <Link href={link}><Button type="link" size="small" style={{ padding: 0, fontSize: 11 }}>View →</Button></Link>}
          </Space>
        }
        value={isMoney ? undefined : (value ?? 0)}
        formatter={isMoney ? () => fmt(value) : undefined}
        prefix={prefix}
        valueStyle={{ color, fontSize: 22, fontWeight: 700 }}
      />
    </Card>
  );
}

export default function DashboardPage() {
  const { can, isSuperAdmin, isBranchManager, branchId, branchName, primaryRole } = usePermissions();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Build requests based on what this role can see
      const requests = [];
      if (can("reports.view") || can("shipments.view")) requests.push(["shipments", api.get("/admin/reports/shipments")]);
      if (can("reports.revenue")) requests.push(["revenue", api.get("/admin/reports/revenue")]);
      if (can("pod.view") || can("reports.pod")) requests.push(["pod", api.get("/admin/reports/pod")]);
      if (can("merchants.view") || can("reports.merchants")) requests.push(["merchants", api.get("/admin/reports/merchants")]);
      if (can("branches.view") || can("reports.branches")) requests.push(["branches", api.get("/admin/reports/branches")]);

      const results = await Promise.allSettled(requests.map(([, req]) => req));
      const next = {};
      requests.forEach(([key], i) => {
        if (results[i].status === "fulfilled") next[key] = results[i].value.data?.data;
      });
      setData(next);
    } catch {
      setError("Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [can]);

  useEffect(() => { load(); }, [load]);

  const { shipments, revenue, pod, merchants, branches } = data;

  const scopeLabel = isSuperAdmin
    ? "All Branches — Global View"
    : branchName
    ? `Branch: ${branchName}`
    : primaryRole?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  if (error) {
    return (
      <Alert type="error" showIcon message={error}
        action={<Button size="small" onClick={load}>Retry</Button>}
        style={{ margin: 20 }}
      />
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%", padding: 4 }}>

      <Row justify="space-between" align="middle">
        <Col>
          <Text style={{ fontSize: 18, fontWeight: 700 }}>Dashboard</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{scopeLabel}</Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
        </Col>
      </Row>

      {loading && !Object.keys(data).length ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* Shipment stats */}
          {shipments && (
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={8} md={4}>
                <StatCard title="Total Shipments" value={shipments.total} prefix={<BoxPlotOutlined />} color="#6366f1" link="/admin/shipments" loading={loading} />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <StatCard title="Delivered" value={shipments.delivered} prefix={<TruckOutlined />} color="#22c55e" loading={loading} />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <StatCard title="Failed" value={shipments.failed} prefix={<BoxPlotOutlined />} color="#ef4444" loading={loading} />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <StatCard title="Returned" value={shipments.returned} prefix={<BoxPlotOutlined />} color="#f59e0b" loading={loading} />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <StatCard title="Cancelled" value={shipments.cancelled} prefix={<BoxPlotOutlined />} color="#6b7280" loading={loading} />
              </Col>
              {branches && (
                <Col xs={12} sm={8} md={4}>
                  <StatCard title="Branches" value={branches.total} prefix={<ApartmentOutlined />} color="#3b82f6" link={isSuperAdmin ? "/admin/branches" : undefined} loading={loading} />
                </Col>
              )}
            </Row>
          )}

          {/* Revenue + POD */}
          {(revenue || pod) && (
            <Row gutter={[12, 12]}>
              {revenue && <>
                <Col xs={12} sm={6}><StatCard title="Delivery Charges" value={revenue.delivery_charges} prefix={<DollarOutlined />} color="#6366f1" loading={loading} isMoney /></Col>
                <Col xs={12} sm={6}><StatCard title="POD Charges" value={revenue.pod_charges} prefix={<DollarOutlined />} color="#3b82f6" loading={loading} isMoney /></Col>
                <Col xs={12} sm={6}><StatCard title="Return Charges" value={revenue.return_charges} prefix={<DollarOutlined />} color="#f59e0b" loading={loading} isMoney /></Col>
                <Col xs={12} sm={6}><StatCard title="Total Revenue" value={revenue.total_charges} prefix={<RiseOutlined />} color="#22c55e" loading={loading} isMoney /></Col>
              </>}
              {pod && !revenue && <>
                <Col xs={12} sm={6}><StatCard title="Total POD" value={pod.total_cod} prefix={<BankOutlined />} color="#3b82f6" loading={loading} isMoney /></Col>
                <Col xs={12} sm={6}><StatCard title="POD Pending" value={pod.pending} prefix={<BankOutlined />} color="#f59e0b" loading={loading} isMoney /></Col>
                <Col xs={12} sm={6}><StatCard title="POD Collected" value={pod.collected} prefix={<BankOutlined />} color="#22c55e" loading={loading} isMoney /></Col>
                <Col xs={12} sm={6}><StatCard title="POD Settled" value={pod.settled} prefix={<BankOutlined />} color="#6366f1" loading={loading} isMoney /></Col>
              </>}
            </Row>
          )}

          {/* Merchants */}
          {merchants && (
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={6}><StatCard title="Total Merchants" value={merchants.total} prefix={<ShopOutlined />} color="#6366f1" link="/admin/merchants" loading={loading} /></Col>
              <Col xs={12} sm={6}><StatCard title="Active Merchants" value={merchants.active} prefix={<ShopOutlined />} color="#22c55e" loading={loading} /></Col>
              {pod && <>
                <Col xs={12} sm={6}><StatCard title="Total POD" value={pod.total_cod} prefix={<BankOutlined />} color="#3b82f6" loading={loading} isMoney /></Col>
                <Col xs={12} sm={6}><StatCard title="POD Pending" value={pod.pending} prefix={<BankOutlined />} color="#f59e0b" loading={loading} isMoney /></Col>
              </>}
            </Row>
          )}

          {/* Tables */}
          <Row gutter={[12, 12]}>
            {shipments?.by_status?.length > 0 && (
              <Col xs={24} md={8}>
                <Card size="small" title={<Space><BoxPlotOutlined />Shipments by Status</Space>}
                  extra={<Link href="/admin/shipments"><Button type="link" size="small">View all</Button></Link>}>
                  <Table rowKey="status" size="small" dataSource={shipments.by_status} pagination={false}
                    columns={[
                      { title: "Status", dataIndex: "status", render: v => <Badge status={v === "delivered" ? "success" : v === "delivery_failed" ? "error" : "processing"} text={v} /> },
                      { title: "Count", dataIndex: "total", align: "right", render: v => <Text strong>{v}</Text> },
                    ]}
                  />
                </Card>
              </Col>
            )}
            {shipments?.by_merchant?.length > 0 && (
              <Col xs={24} md={16}>
                <Card size="small" title={<Space><ShopOutlined />Shipments by Merchant</Space>}>
                  <Table rowKey="merchant_id" size="small" dataSource={shipments.by_merchant}
                    pagination={{ pageSize: 5, showSizeChanger: false }}
                    columns={[
                      { title: "Merchant", render: (_, r) => r.merchant?.name || `#${r.merchant_id}` },
                      { title: "Shipments", dataIndex: "total", align: "right", render: v => <Text strong>{v}</Text> },
                      { title: "POD", dataIndex: "pod_total", align: "right", render: v => <Text type="secondary">{fmt(v)}</Text> },
                    ]}
                  />
                </Card>
              </Col>
            )}
            {revenue?.monthly?.length > 0 && (
              <Col xs={24} md={12}>
                <Card size="small" title={<Space><RiseOutlined />Monthly Revenue</Space>}>
                  <Table rowKey="month" size="small" dataSource={[...revenue.monthly].reverse()}
                    pagination={{ pageSize: 6, showSizeChanger: false }}
                    columns={[
                      { title: "Month", dataIndex: "month" },
                      { title: "Revenue", dataIndex: "total", align: "right", render: v => <Text strong>{fmt(v)}</Text> },
                    ]}
                  />
                </Card>
              </Col>
            )}
            {pod?.by_status?.length > 0 && (
              <Col xs={24} md={12}>
                <Card size="small" title={<Space><BankOutlined />POD by Status</Space>}>
                  <Table rowKey="status" size="small" dataSource={pod.by_status} pagination={false}
                    columns={[
                      { title: "Status", dataIndex: "status", render: v => <Tag color={v === "settled" ? "green" : v === "pending" ? "orange" : "blue"}>{v}</Tag> },
                      { title: "Count", dataIndex: "total", align: "right" },
                      { title: "Amount", dataIndex: "amount", align: "right", render: v => fmt(v) },
                    ]}
                  />
                </Card>
              </Col>
            )}
          </Row>
        </>
      )}
    </Space>
  );
}
