"use client";

import { Card, Tabs, Typography, Row, Col, Statistic, Table, Spin, Space, Alert } from "antd";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { 
  CarOutlined, 
  DollarOutlined, 
  ShopOutlined, 
  BranchesOutlined, 
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  WalletOutlined,
  TeamOutlined,
  EnvironmentOutlined
} from "@ant-design/icons";
import { StatusTag } from "@/components/PageTools";

const reportTypes = [
  { key: "shipments", label: "Shipments", icon: <CarOutlined /> },
  { key: "revenue", label: "Revenue", icon: <DollarOutlined /> },
  { key: "pod", label: "POD Settlements", icon: <WalletOutlined /> },
  { key: "merchants", label: "Merchants", icon: <ShopOutlined /> },
  { key: "branches", label: "Branches", icon: <BranchesOutlined /> },
  { key: "staff", label: "Staff Performance", icon: <UserOutlined /> },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("shipments");
  const [reportsData, setReportsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [userScope, setUserScope] = useState({ name: "Loading authority scope...", isAdmin: true });

  // Load active tab parameters
  const loadTabReport = async (tabKey) => {
    if (reportsData[tabKey]) return;

    setLoading(true);
    try {
      const res = await api.get(`/admin/reports/${tabKey}`);
      setReportsData((prev) => ({ ...prev, [tabKey]: res.data.data }));
      
      // Contextually infer scope identity from payload structural footprints
      if (res.data.data?.by_branch && userScope.name === "Loading authority scope...") {
        const structuralData = res.data.data.by_branch;
        if (structuralData.length === 1) {
          setUserScope({ 
            name: structuralData[0]?.origin_branch?.name || "Local Branch Scope", 
            isAdmin: false 
          });
        } else {
          setUserScope({ name: "All Global Branches (Main/Super Admin System Mode)", isAdmin: true });
        }
      }
    } catch (err) {
      console.error(`Failed to load ${tabKey} hierarchical data:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabReport(activeTab);
  }, [activeTab]);

  // ================= 1. SHIPMENTS TAB RENDER =================
  const renderShipmentsReport = (data) => {
    if (!data) return null;
    return (
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card bordered={false} style={{ background: "#f0f5ff" }}>
              <Statistic title="Total Scoped Volume" value={data.total || 0} prefix={<CarOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card bordered={false} style={{ background: "#f6ffed" }}>
              <Statistic title="Delivered" value={data.delivered || 0} valueStyle={{ color: '#3f8600' }} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card bordered={false} style={{ background: "#fff1f0" }}>
              <Statistic title="Failed" value={data.failed || 0} valueStyle={{ color: '#cf1322' }} prefix={<CloseCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card bordered={false} style={{ background: "#fff7e6" }}>
              <Statistic title="Returned" value={data.returned || 0} valueStyle={{ color: '#d46b08' }} prefix={<RollbackOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card bordered={false} style={{ background: "#fafafa" }}>
              <Statistic title="Cancelled" value={data.cancelled || 0} valueStyle={{ color: '#8c8c8c' }} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card title="Status Aggregates" size="small">
              <Table dataSource={data.by_status || []} rowKey="status" pagination={false} size="small"
                columns={[
                  { title: "Status", dataIndex: "status", render: (v) => <StatusTag value={v} /> },
                  { title: "Total", dataIndex: "total", align: "right" }
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Merchant Volume Distribution" size="small">
              <Table dataSource={data.by_merchant || []} rowKey="merchant_id" pagination={{ pageSize: 5 }} size="small"
                columns={[
                  { title: "Merchant", dataIndex: ["merchant", "name"], render: (v, r) => v || `ID: ${r.merchant_id}` },
                  { title: "Total", dataIndex: "total", align: "right" }
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card title="Branch Nodes Present" size="small">
              <Table dataSource={data.by_branch || []} rowKey="origin_branch_id" pagination={{ pageSize: 5 }} size="small"
                columns={[
                  { title: "Origin Branch", dataIndex: ["origin_branch", "name"], render: (v, r) => v || `ID: ${r.origin_branch_id}` },
                  { title: "Total Packets", dataIndex: "total", align: "right" }
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    );
  };

  // ================= 2. REVENUE TAB RENDER =================
  const renderRevenueReport = (data) => {
    if (!data) return null;
    return (
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: "#f6ffed" }}>
              <Statistic title="Delivery Yield" value={data.delivery_charges || 0} precision={2} prefix="Rs. " />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: "#e6f7ff" }}>
              <Statistic title="POD Share Earnings" value={data.pod_charges || 0} precision={2} prefix="Rs. " />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: "#fff7e6" }}>
              <Statistic title="Return Fee Totals" value={data.return_charges || 0} precision={2} prefix="Rs. " />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: "#f9f0ff" }}>
              <Statistic title="Total Collective Revenue" value={data.total_charges || 0} precision={2} valueStyle={{ color: '#722ed1' }} prefix="Rs. " />
            </Card>
          </Col>
        </Row>

        <Card title="Historical Stream Trends" size="small">
          <Table dataSource={data.monthly || []} rowKey="month" pagination={{ pageSize: 5 }}
            columns={[
              { title: "Month Grouping", dataIndex: "month" },
              { title: "Earned Yield", dataIndex: "total", align: "right", render: (v) => `Rs. ${Number(v).toFixed(2)}` }
            ]}
          />
        </Card>
      </Space>
    );
  };

  // ================= 3. POD SETTLEMENTS TAB RENDER =================
  const renderCodReport = (data) => {
    if (!data) return null;
    return (
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: "#f5f5f5" }}>
              <Statistic title="Total POD Scope" value={data.total_cod || 0} precision={2} prefix="Rs. " />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: "#e6f7ff" }}>
              <Statistic title="Collected Vaulted" value={data.collected || 0} precision={2} prefix="Rs. " />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: "#fff1f0" }}>
              <Statistic title="Pending Pipeline" value={data.pending || 0} precision={2} valueStyle={{ color: '#cf1322' }} prefix="Rs. " />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ background: "#f6ffed" }}>
              <Statistic title="Settled to Shops" value={data.settled || 0} precision={2} valueStyle={{ color: '#3f8600' }} prefix="Rs. " />
            </Card>
          </Col>
        </Row>

        <Card title="POD Flow Status Breakdown" size="small">
          <Table dataSource={data.by_status || []} rowKey="status" pagination={false}
            columns={[
              { title: "Status Layer", dataIndex: "status", render: (v) => <StatusTag value={v} /> },
              { title: "Records", dataIndex: "total" },
              { title: "Total Value Amount", dataIndex: "amount", align: "right", render: (v) => `Rs. ${Number(v || 0).toFixed(2)}` }
            ]}
          />
        </Card>
      </Space>
    );
  };

  // ================= 4. MERCHANTS TAB RENDER =================
  const renderMerchantsReport = (data) => {
    if (!data) return null;
    return (
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Card bordered={false} style={{ background: "#f0f5ff" }}><Statistic title="Total Shops Registered" value={data.total || 0} /></Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card bordered={false} style={{ background: "#f6ffed" }}><Statistic title="Active" value={data.active || 0} valueStyle={{ color: '#3f8600' }} /></Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title="Merchant Scoped Actions" size="small">
              <Table dataSource={data.shipment_counts || []} rowKey="merchant_id" pagination={{ pageSize: 5 }} size="small"
                columns={[
                  { title: "Merchant Profile", dataIndex: ["merchant", "name"], render: (v, r) => v || `ID: ${r.merchant_id}` },
                  { title: "Scoped Shipments", dataIndex: "total" },
                  { title: "Accumulated POD", dataIndex: "pod_total", align: "right", render: (v) => `Rs. ${Number(v || 0).toFixed(2)}` }
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Payout Settled Logs" size="small">
              <Table dataSource={data.settlements || []} rowKey="status" pagination={false} size="small"
                columns={[
                  { title: "Status", dataIndex: "status", render: (v) => <StatusTag value={v} /> },
                  { title: "Count", dataIndex: "total" },
                  { title: "Final Payable", dataIndex: "amount", align: "right", render: (v) => `Rs. ${Number(v || 0).toFixed(2)}` }
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    );
  };

  // ================= 5. BRANCHES TAB RENDER =================
  const renderBranchesReport = (data) => {
    if (!data) return null;
    return (
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card title="Active Scoped Hub Networks" size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Table dataSource={data.by_type || []} rowKey="type" pagination={false} size="small"
                columns={[
                  { title: "Hub Type Node", dataIndex: "type", render: (v) => String(v).toUpperCase() },
                  { title: "Total Present", dataIndex: "total", align: "right" }
                ]}
              />
            </Col>
            <Col xs={24} md={8}>
              <Table dataSource={data.shipments_by_origin || []} rowKey="origin_branch_id" pagination={{ pageSize: 5 }} size="small"
                columns={[
                  { title: "Outbound Branch Node", dataIndex: ["origin_branch", "name"], render: (v, r) => v || `ID: ${r.origin_branch_id}` },
                  { title: "Total Handled", dataIndex: "total", align: "right" }
                ]}
              />
            </Col>
            <Col xs={24} md={8}>
              <Table dataSource={data.shipments_by_destination || []} rowKey="destination_branch_id" pagination={{ pageSize: 5 }} size="small"
                columns={[
                  { title: "Inbound Branch Node", dataIndex: ["destination_branch", "name"], render: (v, r) => v || `ID: ${r.destination_branch_id}` },
                  { title: "Total Delivered", dataIndex: "total", align: "right" }
                ]}
              />
            </Col>
          </Row>
        </Card>
      </Space>
    );
  };

  // ================= 6. STAFF TAB RENDER =================
  const renderStaffReport = (data) => {
    if (!data) return null;
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} md={10} >
          <Card title="User Permissions Breakdown" size="small">
            <Table dataSource={data.users_by_role || []} rowKey="role" pagination={false} size="small"
              columns={[
                { title: "Role", dataIndex: "role", render: (v) => String(v).toUpperCase() },
                { title: "Count", dataIndex: "total", align: "right" }
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card title="Scoped Delivery Performance Assignment Volume" size="small">
            <Table dataSource={data.delivery_assignments || []} rowKey="delivery_staff_id" pagination={{ pageSize: 5 }} size="small"
              columns={[
                { title: "Staff Rider Name", dataIndex: ["staff", "name"], render: (v, r) => v || `Staff Node Ref ID: ${r.delivery_staff_id}` },
                { title: "Assigned Delivery Volume Tasks", dataIndex: "total", align: "right", render: (v) => <b>{v} Runs</b> }
              ]}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  const getTabContent = (key) => {
    if (loading && activeTab === key && !reportsData[key]) {
      return (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Spin size="large" tip="Recalculating authority scope metrics..." />
        </div>
      );
    }

    const currentTabDataset = reportsData[key];
    switch (key) {
      case "shipments": return renderShipmentsReport(currentTabDataset);
      case "revenue": return renderRevenueReport(currentTabDataset);
      case "pod": return renderCodReport(currentTabDataset);
      case "merchants": return renderMerchantsReport(currentTabDataset);
      case "branches": return renderBranchesReport(currentTabDataset);
      case "staff": return renderStaffReport(currentTabDataset);
      default: return null;
    }
  };

  return (
    <Card>
      <div style={{ marginBottom: 20 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Hierarchical System Reports
        </Typography.Title>
        <Typography.Text type="secondary">
          Data streams are restricted securely relative to structural authorization contexts.
        </Typography.Text>
      </div>

      <Alert
        message={`Data Context Scope: ${userScope.name}`}
        description={userScope.isAdmin 
          ? "You possess global administrative authority views over all operational hubs." 
          : "Your account credentials limit analytics reporting data context cleanly down to your regional district node only."
        }
        type={userScope.isAdmin ? "info" : "success"}
        showIcon
        icon={<EnvironmentOutlined />}
        style={{ marginBottom: 20 }}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        items={reportTypes.map((t) => ({
          key: t.key,
          label: (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {t.icon}
              {t.label.toUpperCase()}
            </span>
          ),
          children: <div style={{ paddingTop: 12 }}>{getTabContent(t.key)}</div>,
        }))}
      />
    </Card>
  );
}