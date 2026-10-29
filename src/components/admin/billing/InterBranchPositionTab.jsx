"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
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
  ArrowRightOutlined,
  BankOutlined,
  LinkOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import api from "@/lib/api";
import { formatRs } from "@/components/admin/billing/financeKit";

const { Text, Title, Paragraph } = Typography;

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

export default function InterBranchPositionTab({ branches = [] }) {
  const [loading, setLoading] = useState(false);
  const [positionData, setPositionData] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [branchFilter, setBranchFilter] = useState(null);

  async function loadPosition() {
    setLoading(true);
    try {
      const params = {};
      if (dateRange?.[0]) params.from = dateRange[0].format("YYYY-MM-DD");
      if (dateRange?.[1]) params.to = dateRange[1].format("YYYY-MM-DD");
      if (branchFilter) params.branch_id = branchFilter;

      const d = unwrap(await api.get("/admin/inter-branch-settlements/position", { params }));
      setPositionData(d || null);
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load inter-branch settlement positions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, branchFilter]);

  const totals = positionData?.totals || {};
  const pairs = positionData?.pairs || [];
  const branchRows = positionData?.branches || [];

  const pairColumns = [
    {
      title: "Payer Branch (Holds Collected Fare)",
      dataIndex: "payer_branch_name",
      key: "payer_branch_name",
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Recipient Branch (Delivery / Transit)",
      dataIndex: "payee_branch_name",
      key: "payee_branch_name",
      render: (v) => <Text strong style={{ color: "#1677ff" }}>{v}</Text>,
    },
    {
      title: "Shipments",
      dataIndex: "shipments",
      key: "shipments",
      align: "center",
      render: (v) => <Tag color="blue">{v} pkts</Tag>,
    },
    {
      title: "Unsettled",
      dataIndex: "unsettled",
      key: "unsettled",
      align: "right",
      render: (v) => (Number(v) > 0 ? <Text style={{ color: "#fa8c16" }}>{formatRs(v)}</Text> : "-"),
    },
    {
      title: "On Statement",
      dataIndex: "on_statement",
      key: "on_statement",
      align: "right",
      render: (v) => (Number(v) > 0 ? <Tag color="cyan">{formatRs(v)}</Tag> : "-"),
    },
    {
      title: "Settled / Received",
      dataIndex: "received",
      key: "received",
      align: "right",
      render: (v) => (Number(v) > 0 ? <Text style={{ color: "#389e0d" }}>{formatRs(v)}</Text> : "-"),
    },
    {
      title: "Total Due Now",
      dataIndex: "due",
      key: "due",
      align: "right",
      render: (v) => (
        <Text strong style={{ color: Number(v) > 0 ? "#cf1322" : "#595959", fontSize: 14 }}>
          {formatRs(v)}
        </Text>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {/* Top Banner & Link to full Settlements Page */}
      <Card size="small" style={{ background: "#f0f5ff", borderColor: "#adc6ff" }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <SwapOutlined style={{ fontSize: 20, color: "#1677ff" }} />
              <div>
                <Text strong style={{ fontSize: 15, color: "#0958d9" }}>
                  Inter-Branch Clearinghouse & Settlement Position
                </Text>
                <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                  Tracks cross-branch delivery fare liabilities: Origin collecting branches settling with last-mile destination and transit hubs.
                </Paragraph>
              </div>
            </Space>
          </Col>
          <Col>
            <Link href="/admin/inter-branch-settlements" target="_blank">
              <Button type="primary" icon={<LinkOutlined />}>
                Open Full Statements Manager
              </Button>
            </Link>
          </Col>
        </Row>
      </Card>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6} md={6}>
          <Card size="small">
            <Statistic title="Total Active Pairs" value={pairs.length} prefix={<SwapOutlined />} />
            <Text type="secondary" style={{ fontSize: 11 }}>Inter-branch routes with activity</Text>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card size="small">
            <Statistic title="Total Unsettled Dues" prefix="Rs" value={totals.due || 0} precision={2} valueStyle={{ color: "#cf1322", fontWeight: "bold" }} />
            <Text type="secondary" style={{ fontSize: 11 }}>Payable across branches</Text>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card size="small">
            <Statistic title="On Active Statement" prefix="Rs" value={totals.on_statement || 0} precision={2} valueStyle={{ color: "#0958d9" }} />
            <Text type="secondary" style={{ fontSize: 11 }}>Statement generated, pending pay</Text>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Card size="small" style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}>
            <Statistic title="Settled & Reconciled" prefix="Rs" value={totals.received || 0} precision={2} valueStyle={{ color: "#389e0d" }} />
            <Text type="secondary" style={{ fontSize: 11 }}>Successfully cleared transfers</Text>
          </Card>
        </Col>
      </Row>

      {/* Pairwise Transfers Table */}
      <Card
        title="Pairwise Branch Settlement Balances (Who Owes Whom)"
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder="Filter by branch"
              style={{ width: 220 }}
              value={branchFilter}
              onChange={setBranchFilter}
              options={(branches || []).map((b) => ({ label: `${b.name} (${b.code || b.id})`, value: b.id }))}
            />
            <DatePicker.RangePicker value={dateRange} onChange={setDateRange} />
            <Button icon={<ReloadOutlined />} onClick={loadPosition} loading={loading}>
              Refresh
            </Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          size="middle"
          dataSource={pairs}
          rowKey={(r) => `${r.payer_branch_id}_${r.payee_branch_id}`}
          columns={pairColumns}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </Space>
  );
}
