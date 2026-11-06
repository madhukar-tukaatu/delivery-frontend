"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Col, Row, Space, Spin, Statistic, Table, Tag, Tabs, Typography, Progress } from "antd";
import {
  BankOutlined, BranchesOutlined, CarOutlined, DollarOutlined,
  ReloadOutlined, ShopOutlined, TeamOutlined, WalletOutlined,
  RiseOutlined, FallOutlined, SwapOutlined, FileTextOutlined,
  SafetyCertificateOutlined
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

  // Build comprehensive tabs based on permissions
  const allTabs = [
    { key: "profit-loss", label: "Profit & Loss (P&L)", icon: <RiseOutlined />, permission: "reports.revenue" },
    { key: "revenue", label: "Revenue Ledger", icon: <DollarOutlined />, permission: "reports.revenue" },
    { key: "expenses", label: "Operating Expenses", icon: <FallOutlined />, permission: "reports.revenue" },
    { key: "branch-shares", label: "Branch Shares (40/45/15)", icon: <SwapOutlined />, permission: "reports.revenue" },
    { key: "cash-flow", label: "Cash Flow & Vault", icon: <WalletOutlined />, permission: "reports.pod" },
    { key: "transactions", label: "Transaction Feed", icon: <FileTextOutlined />, permission: "reports.view" },
    { key: "shipments", label: "Shipments", icon: <CarOutlined />, permission: "reports.view" },
    { key: "pod", label: "POD Collections", icon: <BankOutlined />, permission: "reports.pod" },
    { key: "merchants", label: "Merchants", icon: <ShopOutlined />, permission: "reports.merchants" },
    { key: "branches", label: "Branches", icon: <BranchesOutlined />, permission: "reports.branches" },
    { key: "staff", label: "Staff & Riders", icon: <TeamOutlined />, permission: "reports.staff" },
  ];

  const tabs = allTabs.filter(t => can(t.permission) || can("reports.view"));

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

  //  Tab renderers 

  const renderProfitLoss = (d) => !d ? null : (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
            <Statistic title="Gross Revenue" value={fmt(d.gross_revenue)} valueStyle={{ color: "#16a34a", fontWeight: 700 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>Delivery & return fees</Text>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
            <Statistic title="Total Operating Expenses" value={fmt(d.total_expenses)} valueStyle={{ color: "#dc2626", fontWeight: 700 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>Linehaul + returns + royalties</Text>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
            <Statistic title="Net Operating Income" value={fmt(d.net_operating_income)} valueStyle={{ color: "#2563eb", fontWeight: 700 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>Operating profitability</Text>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Operating Margin" value={`${d.operating_margin_pct ?? 0}%`} valueStyle={{ color: "#0f172a", fontWeight: 700 }} />
            <Progress percent={d.operating_margin_pct || 0} size="small" status="active" />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Monthly P&L Comparative Statement">
        <Table rowKey="month" size="small" dataSource={[...(d.monthly_pnl || [])].reverse()}
          pagination={{ pageSize: 6, showSizeChanger: false }}
          columns={[
            { title: "Period (Month)", dataIndex: "month", render: v => <Text strong>{v}</Text> },
            { title: "Gross Revenue", dataIndex: "revenue", align: "right", render: v => <Text style={{ color: "#16a34a" }}>{fmt(v)}</Text> },
            { title: "Operating Expenses", dataIndex: "expenses", align: "right", render: v => <Text style={{ color: "#dc2626" }}>{fmt(v)}</Text> },
            { title: "Net Margin", dataIndex: "net", align: "right", render: v => <Text strong style={{ color: v >= 0 ? "#2563eb" : "#dc2626" }}>{fmt(v)}</Text> },
            { title: "Margin %", dataIndex: "margin", align: "right", render: v => <Tag color={v >= 20 ? "green" : "blue"}>{v}%</Tag> },
          ]}
        />
      </Card>
    </Space>
  );

  const renderExpenses = (d) => !d ? null : (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Total Expenses" value={fmt(d.total_expenses)} valueStyle={{ color: "#dc2626", fontWeight: 700 }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Linehaul Freight Costs" value={fmt(d.freight_expenses)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Reverse RTO Handling" value={fmt(d.return_handling_cost)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="HQ Franchise Royalties" value={fmt(d.hq_royalty_cost)} /></Card>
        </Col>
      </Row>

      <Card size="small" title="Monthly Highway Line-Haul Freight Expense Breakdown">
        <Table rowKey="month" size="small" dataSource={[...(d.monthly_freight || [])].reverse()}
          pagination={{ pageSize: 6, showSizeChanger: false }}
          columns={[
            { title: "Month", dataIndex: "month" },
            { title: "Trips Executed", dataIndex: "trips_count", align: "right" },
            { title: "Contracted Freight Paid", dataIndex: "total", align: "right", render: v => <Text strong>{fmt(v)}</Text> },
          ]}
        />
      </Card>
    </Space>
  );

  const renderBranchShares = (d) => !d ? null : (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="Origin Share (40%)" value={fmt(d.origin_share_total)} valueStyle={{ color: "#2563eb", fontWeight: 700 }} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="Delivery Share (45%)" value={fmt(d.destination_share_total)} valueStyle={{ color: "#16a34a", fontWeight: 700 }} /></Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card size="small"><Statistic title="HQ Share (15%)" value={fmt(d.hq_share_total)} valueStyle={{ color: "#9333ea", fontWeight: 700 }} /></Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small" title="Revenue Sharing Policy">
            <Text type="secondary">Every parcel delivery charge splits automatically into: <strong>40% Booking Origin Branch</strong>, <strong>45% Final Delivery Branch</strong>, and <strong>15% Central Platform HQ</strong>.</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Card size="small" title="Top Origin Branches (By Booking Earnings)">
            <Table rowKey="branch_name" size="small" dataSource={d.top_origin_branches || []} pagination={false}
              columns={[
                { title: "Branch", dataIndex: "branch_name" },
                { title: "Parcels", dataIndex: "total_shipments", align: "right" },
                { title: "40% Share Earned", dataIndex: "total_origin_earned", align: "right", render: v => <Text strong>{fmt(v)}</Text> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title="Top Destination Branches (By Delivery Earnings)">
            <Table rowKey="branch_name" size="small" dataSource={d.top_dest_branches || []} pagination={false}
              columns={[
                { title: "Branch", dataIndex: "branch_name" },
                { title: "Parcels", dataIndex: "total_deliveries", align: "right" },
                { title: "45% Share Earned", dataIndex: "total_dest_earned", align: "right", render: v => <Text strong>{fmt(v)}</Text> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );

  const renderCashFlow = (d) => !d ? null : (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Doorstep Cash Collected" value={fmt(d.doorstep_collected)} valueStyle={{ color: "#16a34a", fontWeight: 700 }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Rider Shift Handover" value={fmt(d.rider_shift_deposits)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Bank Deposits Confirmed" value={fmt(d.branch_bank_deposits)} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Branch Vault Balance" value={fmt(d.vault_cash_in_hand)} valueStyle={{ color: "#2563eb", fontWeight: 700 }} /></Card>
        </Col>
      </Row>
      <Alert
        type="info"
        showIcon
        message="Cash Reconciliation Rule"
        description="Riders handover collected doorstep cash at end-of-shift with verified deposit slips. Branch Cashiers deposit vault funds daily to company central bank accounts."
      />
    </Space>
  );

  const renderTransactions = (d) => !d ? null : (
    <Row gutter={[12, 12]}>
      <Col xs={24} md={12}>
        <Card size="small" title="Recent Merchant Settlement Payouts">
          <Table rowKey="reference" size="small" dataSource={d.recent_settlements || []}
            pagination={{ pageSize: 6 }}
            columns={[
              { title: "Settlement Voucher", dataIndex: "reference", render: v => <Text strong style={{ color: "#0284c7" }}>{v}</Text> },
              { title: "Merchant", dataIndex: "party" },
              { title: "Net Payout", dataIndex: "amount", align: "right", render: v => <Text strong>{fmt(v)}</Text> },
              { title: "Method", dataIndex: "method", render: v => <Tag color="blue">{v?.toUpperCase()}</Tag> },
            ]}
          />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size="small" title="Recent Rider Cash Handovers">
          <Table rowKey="reference" size="small" dataSource={d.recent_deposits || []}
            pagination={{ pageSize: 6 }}
            columns={[
              { title: "Handover Slip", dataIndex: "reference", render: v => <Text strong style={{ color: "#10b981" }}>{v}</Text> },
              { title: "Rider", dataIndex: "party" },
              { title: "Cash Amount", dataIndex: "amount", align: "right", render: v => <Text strong>{fmt(v)}</Text> },
              { title: "Status", dataIndex: "status", render: v => <Tag color="green">{v?.toUpperCase()}</Tag> },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );

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
          <Card size="small" title="Top Merchants by Shipment Volume">
            <Table rowKey="merchant_id" size="small" dataSource={d.by_merchant || []}
              pagination={{ pageSize: 5, showSizeChanger: false }}
              columns={[
                { title: "Merchant", render: (_, r) => r.merchant?.name || `#${r.merchant_id}` },
                { title: "Shipments", dataIndex: "total", align: "right" },
                { title: "POD Collected", dataIndex: "pod_total", align: "right", render: v => fmt(v) },
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
      <Card size="small" title="Monthly Revenue History">
        <Table rowKey="month" size="small" dataSource={[...(d.monthly || [])].reverse()}
          pagination={{ pageSize: 6, showSizeChanger: false }}
          columns={[
            { title: "Month", dataIndex: "month" },
            { title: "Parcels Handled", dataIndex: "parcel_count", align: "right" },
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
              pagination={{ pageSize: 6, showSizeChanger: false }}
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
            pagination={{ pageSize: 6, showSizeChanger: false }}
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
            pagination={{ pageSize: 6, showSizeChanger: false }}
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
            pagination={{ pageSize: 6, showSizeChanger: false }}
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
      case "profit-loss": return renderProfitLoss(d);
      case "revenue": return renderRevenue(d);
      case "expenses": return renderExpenses(d);
      case "branch-shares": return renderBranchShares(d);
      case "cash-flow": return renderCashFlow(d);
      case "transactions": return renderTransactions(d);
      case "shipments": return renderShipments(d);
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
          <Text style={{ fontSize: 18, fontWeight: 700 }}>Logistics & Financial Intelligence Reports</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {branchName ? `Scoped to: ${branchName}` : "Global Network - Nationwide View"}
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