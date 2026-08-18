"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Col, Row, Space, Spin, Statistic, Table, Tag, Tabs, Typography } from "antd";
import {
  BankOutlined, BranchesOutlined, CarOutlined, DollarOutlined,
  ReloadOutlined, ShopOutlined, TeamOutlined, WalletOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import { StatusTag } from "@/components/PageTools";

const { Text } = Typography;

function fmt(v) {
  return `Rs. ${Number(v || 0).toLocaleString("en-NP", { minimumFractionDigits: 2 })}`;
}

export default function ReportsPage() {
  const { can, branchId, branchName, isSuperAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState(null);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);

  // Build tabs based on permissions
  const allTabs = [
    { key: "shipments", label: "Shipments", icon: <CarOutlined />, permission: "reports.view" },
    { key: "revenue", label: "Revenue", icon: <DollarOutlined />, permission: "reports.revenue" },
    { key: "pod", label: "POD", icon: <WalletOutlined />, permission: "reports.pod" },
    { key: "merchants", label: "Merchants", icon: <ShopOutlined />, permission: "reports.merchants" },
    { key: "branches", label: "Branches", icon: <BranchesOutlined />, permission: "reports.branches" },
    { key: "staff", label: "Staff", icon: <TeamOutlined />, permission: "reports.staff" },
  ];

  const tabs = allTabs.filter(t => can(t.permission));

  useEffect(() => {
    if (tabs.length && !activeTab) setActiveTab(tabs[0].key);
  }, [tabs.length]);

  const loadTab = async (key) => {
    if (cache[key]) return;
    setLoading(true);
    try {
      const params = branchId ? { branch_id: branchId } : {};
      const res = await api.get(`/admin/reports/${key}`, { params });
      setCache(prev => ({ ...prev, [key]: res.data?.data }));
    } catch {
      setCache(prev => ({ ...prev, [key]: null }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab) loadTab(activeTab);
  }, [activeTab]);

  const reload = () => {
    setCache(prev => { const n = { ...prev }; delete n[activeTab]; return n; });
    setTimeout(() => loadTab(activeTab), 0);
  };

  // ── Tab renderers ──────────────────────────────────────────────────────────

  const renderShipments = (d) => !d ? null : (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        {[
          { label: "Total", value: d.total, color: "#6366f1" },
          { label: "Delivered", value: d.delivered, color: "#22c55e" },
          { label: "Failed", value: d.failed, color: "#ef4444" },
          { label: "Returned", value: d.returned, color: "#f59e0b" },
          { label: "Cancelled", value: d.cancelled, color: "#6b7280" },
        ].map(s => (
          <Col xs={12} sm={8} md={4} key={s.label}>
            <Card size="small"><Statistic title={s.label} value={s.value ?? 0} valueStyle={{ color: s.color, fontWeight: 700 }} /></Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card size="small" title="By Status">
            <Table rowKey="status" size="small" dataSource={d.by_status || []} pagination={false}
              columns={[
                { title: "Status", dataIndex: "status", render: v => <StatusTag value={v} /> },
                { title: "Count", dataIndex: "total", align: "right", render: v => <Text strong>{v}</Text> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card size="small" title="By Merchant">
            <Table rowKey="merchant_id" size="small" dataSource={d.by_merchant || []}
              pagination={{ pageSize: 5, showSizeChanger: false }}
              columns={[
                { title: "Merchant", render: (_, r) => r.merchant?.name || `#${r.merchant_id}` },
                { title: "Shipments", dataIndex: "total", align: "right" },
                { title: "POD", dataIndex: "pod_total", align: "right", render: v => fmt(v) },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );

  const renderRevenue = (d) => !d ? null : (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        {[
          { label: "Delivery Charges", value: d.delivery_charges },
          { label: "POD Charges", value: d.pod_charges },
          { label: "Return Charges", value: d.return_charges },
          { label: "Total Revenue", value: d.total_charges },
        ].map(s => (
          <Col xs={12} sm={6} key={s.label}>
            <Card size="small"><Statistic title={s.label} formatter={() => fmt(s.value)} /></Card>
          </Col>
        ))}
      </Row>
      <Card size="small" title="Monthly Revenue">
        <Table rowKey="month" size="small" dataSource={[...(d.monthly || [])].reverse()}
          pagination={{ pageSize: 6, showSizeChanger: false }}
          columns={[
            { title: "Month", dataIndex: "month" },
            { title: "Revenue", dataIndex: "total", align: "right", render: v => <Text strong>{fmt(v)}</Text> },
          ]}
        />
      </Card>
    </Space>
  );

  const renderPod = (d) => !d ? null : (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        {[
          { label: "Total POD", value: d.total_cod },
          { label: "Collected", value: d.collected },
          { label: "Pending", value: d.pending },
          { label: "Settled", value: d.settled },
        ].map(s => (
          <Col xs={12} sm={6} key={s.label}>
            <Card size="small"><Statistic title={s.label} formatter={() => fmt(s.value)} /></Card>
          </Col>
        ))}
      </Row>
      <Card size="small" title="POD by Status">
        <Table rowKey="status" size="small" dataSource={d.by_status || []} pagination={false}
          columns={[
            { title: "Status", dataIndex: "status", render: v => <Tag color={v === "settled" ? "green" : v === "pending" ? "orange" : "blue"}>{v}</Tag> },
            { title: "Count", dataIndex: "total", align: "right" },
            { title: "Amount", dataIndex: "amount", align: "right", render: v => fmt(v) },
          ]}
        />
      </Card>
    </Space>
  );

  const renderMerchants = (d) => !d ? null : (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Merchants" value={d.total ?? 0} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Active" value={d.active ?? 0} valueStyle={{ color: "#22c55e" }} /></Card></Col>
      </Row>
      <Row gutter={[12, 12]}>
        <Col xs={24} md={14}>
          <Card size="small" title="Shipments by Merchant">
            <Table rowKey="merchant_id" size="small" dataSource={d.shipment_counts || []}
              pagination={{ pageSize: 5, showSizeChanger: false }}
              columns={[
                { title: "Merchant", render: (_, r) => r.merchant?.name || `#${r.merchant_id}` },
                { title: "Shipments", dataIndex: "total", align: "right" },
                { title: "POD", dataIndex: "pod_total", align: "right", render: v => fmt(v) },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card size="small" title="Settlements">
            <Table rowKey="status" size="small" dataSource={d.settlements || []} pagination={false}
              columns={[
                { title: "Status", dataIndex: "status", render: v => <StatusTag value={v} /> },
                { title: "Count", dataIndex: "total", align: "right" },
                { title: "Amount", dataIndex: "amount", align: "right", render: v => fmt(v) },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );

  const renderBranches = (d) => !d ? null : (
    <Row gutter={[12, 12]}>
      <Col xs={24} md={8}>
        <Card size="small" title="By Type">
          <Table rowKey="type" size="small" dataSource={d.by_type || []} pagination={false}
            columns={[
              { title: "Type", dataIndex: "type", render: v => <Tag>{v}</Tag> },
              { title: "Count", dataIndex: "total", align: "right" },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card size="small" title="Shipments by Origin">
          <Table rowKey="origin_branch_id" size="small" dataSource={d.shipments_by_origin || []}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            columns={[
              { title: "Branch", render: (_, r) => r.origin_branch?.name || `#${r.origin_branch_id}` },
              { title: "Shipments", dataIndex: "total", align: "right" },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card size="small" title="Shipments by Destination">
          <Table rowKey="destination_branch_id" size="small" dataSource={d.shipments_by_destination || []}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            columns={[
              { title: "Branch", render: (_, r) => r.destination_branch?.name || `#${r.destination_branch_id}` },
              { title: "Shipments", dataIndex: "total", align: "right" },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderStaff = (d) => !d ? null : (
    <Row gutter={[12, 12]}>
      <Col xs={24} md={10}>
        <Card size="small" title="Users by Role">
          <Table rowKey="role" size="small" dataSource={d.users_by_role || []} pagination={false}
            columns={[
              { title: "Role", dataIndex: "role", render: v => <Tag>{v}</Tag> },
              { title: "Count", dataIndex: "total", align: "right" },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} md={14}>
        <Card size="small" title="Delivery Performance">
          <Table rowKey="delivery_staff_id" size="small" dataSource={d.delivery_assignments || []}
            pagination={{ pageSize: 5, showSizeChanger: false }}
            columns={[
              { title: "Staff", render: (_, r) => r.staff?.name || `#${r.delivery_staff_id}` },
              { title: "Deliveries", dataIndex: "total", align: "right", render: v => <Text strong>{v}</Text> },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );

  const renderContent = (key) => {
    const d = cache[key];
    if (loading && !d) return <div style={{ textAlign: "center", padding: 60 }}><Spin size="large" /></div>;
    if (!d) return <div style={{ textAlign: "center", padding: 40 }}><Text type="secondary">No data available.</Text></div>;
    switch (key) {
      case "shipments": return renderShipments(d);
      case "revenue": return renderRevenue(d);
      case "pod": return renderPod(d);
      case "merchants": return renderMerchants(d);
      case "branches": return renderBranches(d);
      case "staff": return renderStaff(d);
      default: return null;
    }
  };

  if (!tabs.length) {
    return <Card><Text type="secondary">You do not have permission to view reports.</Text></Card>;
  }

  return (
    <Card>
      <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 16 }} wrap>
        <div>
          <Text style={{ fontSize: 18, fontWeight: 700 }}>Reports</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {branchName ? `Scoped to: ${branchName}` : "Global — all branches"}
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={reload}>Refresh</Button>
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={key => { setActiveTab(key); }}
        items={tabs.map(t => ({
          key: t.key,
          label: <Space size={4}>{t.icon}{t.label}</Space>,
          children: <div style={{ paddingTop: 12 }}>{activeTab === t.key && renderContent(t.key)}</div>,
        }))}
      />
    </Card>
  );
}
