"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Row,
  Skeleton,
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
  CheckCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { formatRs, formatDate, unwrap } from "@/components/admin/billing/financeKit";
import { RoutePath } from "@/components/admin/billing/interBranchKit";

const { Text, Paragraph, Title } = Typography;

export default function CounterpartyBreakdownDrawer({
  open,
  onClose,
  viewBranchId,
  viewBranchName,
  counterpartyId,
  counterpartyName,
  onOpenShipment,
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  async function loadData() {
    if (!counterpartyId) return;
    setLoading(true);
    try {
      const res = unwrap(
        await api.get("/admin/inter-branch-settlements/shipments", {
          params: {
            counterparty_id: counterpartyId,
            branch_id: viewBranchId,
            page,
            per_page: 50,
          },
        })
      );
      setData(res);
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load counterparty shipment details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && counterpartyId) {
      loadData();
    }
  }, [open, counterpartyId, page]);

  const summary = data?.summary || {};
  const shipments = data?.shipments?.data || [];
  const totalCount = data?.shipments?.total || 0;

  const columns = [
    {
      title: "Tracking #",
      dataIndex: "tracking_number",
      key: "tracking_number",
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => onOpenShipment?.(r.id)} style={{ fontWeight: "bold" }}>
            {v}
          </a>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {formatDate(r.delivered_at)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Your Role",
      dataIndex: "shares",
      key: "role",
      render: (_, r) => {
        const myShare = (r.shares || []).find((s) => Number(s.branch_id) === Number(viewBranchId));
        const role = myShare?.role || "other";
        const color = role === "delivery" ? "cyan" : role === "origin" ? "blue" : "purple";
        return <Tag color={color}>{role?.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Total Fare",
      dataIndex: "fare",
      key: "fare",
      align: "right",
      render: (v) => formatRs(v),
    },
    {
      title: "Your Net Share",
      key: "your_net",
      align: "right",
      render: (_, r) => {
        const myShare = (r.shares || []).find((s) => Number(s.branch_id) === Number(viewBranchId));
        return (
          <Text strong style={{ color: "#389e0d" }}>
            {formatRs(myShare?.net_amount || 0)}
          </Text>
        );
      },
    },
    {
      title: "Counterparty Net Share",
      key: "cp_net",
      align: "right",
      render: (_, r) => {
        const cpShare = (r.shares || []).find((s) => Number(s.branch_id) === Number(counterpartyId));
        return (
          <Text strong style={{ color: "#cf1322" }}>
            {formatRs(cpShare?.net_amount || 0)}
          </Text>
        );
      },
    },
    {
      title: "Share Status",
      key: "status",
      align: "center",
      render: (_, r) => {
        const myShare = (r.shares || []).find((s) => Number(s.branch_id) === Number(viewBranchId));
        const st = myShare?.status || "pending";
        const color = st === "settled" ? "green" : st === "on_statement" ? "blue" : "orange";
        return <Tag color={color}>{st === "on_statement" ? "On Statement" : st?.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Inspect",
      key: "action",
      align: "center",
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => onOpenShipment?.(r.id)}>
          Split
        </Button>
      ),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={900}
      title={
        <Space>
          <FileTextOutlined style={{ color: "#1677ff", fontSize: 18 }} />
          <span>
            Settlement Breakdown: <strong>{viewBranchName || "Your Branch"}</strong> ↔ <strong>{counterpartyName}</strong>
          </span>
        </Space>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          Refresh
        </Button>
      }
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {/* Explainer Banner */}
        <Alert
          type="info"
          showIcon
          message={`Inter-Branch Relationship: ${viewBranchName || "Your Branch"} & ${counterpartyName}`}
          description={
            <span>
              This breakdown displays all transfer parcels moving between your branch and <b>{counterpartyName}</b>.
              The branch that collected the delivery fare invoice from the customer/merchant holds the funds and pays the other branch their earned delivery share (70% Base + 100% Distance + 35% Weight &minus; 5% HQ Commission).
            </span>
          }
        />

        {/* Summary Statistics */}
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="Total Shipments" value={totalCount} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="Total Fare Invoiced" prefix="Rs" value={summary.fare || 0} precision={2} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}>
              <Statistic
                title="Your Total Net Earned"
                prefix="Rs"
                value={summary.your_net || 0}
                precision={2}
                valueStyle={{ color: "#389e0d", fontWeight: "bold" }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ background: "#f0f5ff", borderColor: "#adc6ff" }}>
              <Statistic
                title="5% HQ Commissions"
                prefix="Rs"
                value={summary.your_hq_commission || 0}
                precision={2}
                valueStyle={{ color: "#0958d9" }}
              />
            </Card>
          </Col>
        </Row>

        {/* Individual Shipments Table */}
        <Card
          size="small"
          title={`Itemized Delivered Shipments (${totalCount})`}
          extra={<Text type="secondary">Click any tracking # for the full multi-party calculator split</Text>}
        >
          <Table
            size="small"
            loading={loading}
            dataSource={shipments}
            rowKey="id"
            columns={columns}
            pagination={{
              current: page,
              pageSize: 50,
              total: totalCount,
              onChange: setPage,
            }}
          />
        </Card>
      </Space>
    </Drawer>
  );
}
