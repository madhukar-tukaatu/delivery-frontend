"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { formatRs } from "@/components/admin/billing/financeKit";

const { Text, Title } = Typography;

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

export default function BranchWiseReports({ branches = [] }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ summary: {}, branches: [] });
  const [dateRange, setDateRange] = useState(null);
  const [branchFilter, setBranchFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  async function loadReports() {
    setLoading(true);
    try {
      const params = {};
      if (dateRange?.[0]) params.from = dateRange[0].format("YYYY-MM-DD");
      if (dateRange?.[1]) params.to = dateRange[1].format("YYYY-MM-DD");
      if (branchFilter) params.branch_id = branchFilter;

      const d = unwrap(await api.get("/admin/branch-shares/reports", { params }));
      setData(d || { summary: {}, branches: [] });
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load branch-wise reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, branchFilter]);

  const summary = data?.summary || {};
  const branchList = (data?.branches || []).filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (b.branch_name || "").toLowerCase().includes(term) ||
      (b.branch_code || "").toLowerCase().includes(term)
    );
  });

  const columns = [
    {
      title: "Branch",
      dataIndex: "branch_name",
      key: "branch_name",
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>Code: {r.branch_code || `#${r.branch_id}`}</Text>
        </Space>
      ),
    },
    {
      title: "Shipments Handled",
      dataIndex: "total_shipments",
      key: "total_shipments",
      align: "center",
      render: (v, r) => (
        <Space direction="vertical" size={0} align="center">
          <Text strong style={{ fontSize: 14 }}>{v}</Text>
          <Space size={4}>
            <TooltipWrapper title="Origin Handled"><Tag color="blue" style={{ fontSize: 10 }}>O:{r.origin_shipments || 0}</Tag></TooltipWrapper>
            <TooltipWrapper title="Transit Handled"><Tag color="purple" style={{ fontSize: 10 }}>T:{r.transit_shipments || 0}</Tag></TooltipWrapper>
            <TooltipWrapper title="Delivery Handled"><Tag color="cyan" style={{ fontSize: 10 }}>D:{r.delivery_shipments || 0}</Tag></TooltipWrapper>
          </Space>
        </Space>
      ),
    },
    {
      title: "Base & Extra Share",
      dataIndex: "total_share_amount",
      key: "total_share_amount",
      align: "right",
      render: (v) => formatRs(v),
    },
    {
      title: "Extra Distance",
      dataIndex: "total_extra_distance",
      key: "total_extra_distance",
      align: "right",
      render: (v) => formatRs(v),
    },
    {
      title: "Gross Operational Allocation",
      dataIndex: "total_gross_allocation",
      key: "total_gross_allocation",
      align: "right",
      render: (v) => <Text strong>{formatRs(v)}</Text>,
    },
    {
      title: "5% HQ Commission",
      dataIndex: "total_hq_commission",
      key: "total_hq_commission",
      align: "right",
      render: (v) => <Text type="danger">-{formatRs(v)}</Text>,
    },
    {
      title: "Net Payout Earned",
      dataIndex: "total_net_payout",
      key: "total_net_payout",
      align: "right",
      render: (v) => (
        <Text strong style={{ color: "#389e0d", fontSize: 14 }}>
          {formatRs(v)}
        </Text>
      ),
    },
    {
      title: "Settlement Status",
      key: "settlement_split",
      align: "right",
      render: (_, r) => (
        <Space direction="vertical" size={2} align="end">
          <Text style={{ fontSize: 11, color: "#389e0d" }}>
            Settled: {formatRs(r.settled_net)}
          </Text>
          <Text style={{ fontSize: 11, color: "#fa8c16" }}>
            Pending: {formatRs(r.pending_net)}
          </Text>
        </Space>
      ),
    },
  ];

  function TooltipWrapper({ title, children }) {
    return <span title={title}>{children}</span>;
  }

  function exportCsv() {
    if (!branchList.length) return;
    const headers = [
      "Branch ID",
      "Branch Name",
      "Branch Code",
      "Total Shipments",
      "Origin Count",
      "Transit Count",
      "Delivery Count",
      "Gross Allocation",
      "HQ Commission",
      "Net Payout",
      "Settled Net",
      "Pending Net",
    ];

    const rows = branchList.map((b) => [
      b.branch_id,
      `"${b.branch_name}"`,
      b.branch_code || "",
      b.total_shipments,
      b.origin_shipments,
      b.transit_shipments,
      b.delivery_shipments,
      b.total_gross_allocation,
      b.total_hq_commission,
      b.total_net_payout,
      b.settled_net,
      b.pending_net,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `branch_shares_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic title="Participating Branches" value={summary.total_branches || 0} prefix={<BankOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic title="Delivered Shipments" value={summary.total_shipments || 0} />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic title="Gross Allocation" prefix="Rs" value={summary.total_gross_allocation || 0} precision={2} />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small">
            <Statistic title="HQ Commission" prefix="Rs" value={summary.total_hq_commission || 0} precision={2} valueStyle={{ color: "#cf1322" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}>
            <Statistic title="Total Net to Branches" prefix="Rs" value={summary.total_net_payout || 0} precision={2} valueStyle={{ color: "#389e0d", fontWeight: "bold" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card size="small" style={{ background: "#fffbe6", borderColor: "#ffe58f" }}>
            <Statistic title="Pending Disbursal" prefix="Rs" value={summary.pending_net || 0} precision={2} valueStyle={{ color: "#d48806" }} />
          </Card>
        </Col>
      </Row>

      {/* Filter and Table Card */}
      <Card
        title="Branch-Wise Share & Revenue History"
        extra={
          <Space wrap>
            <Input
              placeholder="Search branch name or code"
              prefix={<SearchOutlined />}
              style={{ width: 220 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
            <Select
              allowClear
              placeholder="Filter by branch"
              style={{ width: 200 }}
              value={branchFilter}
              onChange={setBranchFilter}
              options={(branches || []).map((b) => ({ label: `${b.name} (${b.code || b.id})`, value: b.id }))}
            />
            <DatePicker.RangePicker value={dateRange} onChange={setDateRange} />
            <Button icon={<ReloadOutlined />} onClick={loadReports} loading={loading}>
              Refresh
            </Button>
            <Button icon={<DownloadOutlined />} onClick={exportCsv} disabled={!branchList.length}>
              Export CSV
            </Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          size="middle"
          dataSource={branchList}
          rowKey="branch_id"
          columns={columns}
          pagination={{ pageSize: 15, showSizeChanger: true }}
        />
      </Card>
    </Space>
  );
}
