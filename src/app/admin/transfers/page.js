"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
  Tabs,
  Select,
  Modal,
  Spin,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  SwapOutlined,
  SendOutlined,
  InboxOutlined,
  ArrowRightOutlined,
  PhoneOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
  HomeOutlined,
  HistoryOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { usePermissions } from "@/hooks/usePermission";
import {
  getTransfers,
  getTransferStats,
  getReceivedTransfers,
  getCompletedTransfers,
  getTransferHistory,
  dispatchTransfers,
  receiveTransfer,
} from "@/services/transferService";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const BRAND = "#027196";

function money(v) {
  const n = Number(v || 0);
  return `NPR ${n.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-NP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function routeLabel(branch, subBranch) {
  const branchName = branch?.name || branch?.code || "Unknown";
  const subBranchName = subBranch?.name || subBranch?.code;

  if (subBranchName && branchName && Number(branch?.id) !== Number(subBranch?.id)) {
    return `${subBranchName}`;
  }

  return subBranchName || branchName;
}

export default function TransfersPage() {
  const { can } = usePermissions();

  // State
  const [activeTab, setActiveTab] = useState("outbound");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Data
  const [stats, setStats] = useState({ outbound: 0, in_transit: 0, received: 0, completed: 0 });
  const [data, setData] = useState({
    outbound: [],
    inbound: [],
    received: [],
    completed: [],
    history: [],
  });

  // UI States
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [timelineModal, setTimelineModal] = useState({ open: false, shipment: null });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const statsData = await getTransferStats();
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  // Load data for active tab
  const loadData = useCallback(async () => {
    if (!activeTab) return;

    setLoading(true);
    setSelectedRowKeys([]);

    try {
      const params = {
        page: pagination.current,
        per_page: pagination.pageSize,
        search: debouncedSearch || undefined,
      };

      if (dateRange?.length === 2) {
        params.date_from = dateRange[0].format("YYYY-MM-DD");
        params.date_to = dateRange[1].format("YYYY-MM-DD");
      }

      if (statusFilter !== "all" && activeTab === "history") {
        params.status = statusFilter;
      }

      let result;

      switch (activeTab) {
        case "outbound":
          result = await getTransfers({ ...params, direction: "outbound" });
          setData((d) => ({ ...d, outbound: result.list }));
          setPagination((p) => ({ ...p, current: result.currentPage, total: result.total }));
          break;

        case "inbound":
          result = await getTransfers({ ...params, direction: "inbound" });
          setData((d) => ({ ...d, inbound: result.list }));
          break;

        case "received":
          result = await getReceivedTransfers(params);
          setData((d) => ({ ...d, received: result.list }));
          break;

        case "completed":
          result = await getCompletedTransfers(params);
          setData((d) => ({ ...d, completed: result.list }));
          setPagination((p) => ({ ...p, current: result.currentPage, total: result.total }));
          break;

        case "history":
          result = await getTransferHistory(params);
          setData((d) => ({ ...d, history: result.list }));
          setPagination((p) => ({ ...p, current: result.currentPage, total: result.total }));
          break;
      }
    } catch (err) {
      message.error(err?.response?.data?.message || `Failed to load ${activeTab} transfers`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.current, pagination.pageSize, debouncedSearch, dateRange, statusFilter]);

  // Load all data on mount and when tab changes
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setPagination((p) => ({ ...p, current: 1 }));
    loadData();
  }, [activeTab, debouncedSearch]);

  // Refresh
  const refresh = useCallback(async () => {
    await Promise.all([loadStats(), loadData()]);
  }, [loadStats, loadData]);

  // Bulk dispatch
  const handleDispatch = async () => {
    if (!selectedRowKeys.length) return;

    setSubmitting(true);
    try {
      const res = await dispatchTransfers(selectedRowKeys);
      const ok = res?.dispatched?.length || 0;
      const skip = Object.keys(res?.skipped || {}).length;

      if (ok > 0) {
        message.success(skip === 0 ? `${ok} dispatched.` : `${ok} dispatched, ${skip} skipped.`);
        setSelectedRowKeys([]);
        await refresh();
      } else {
        message.error(res?.message || "No transfers could be dispatched.");
      }
    } catch (err) {
      message.error(err?.response?.data?.message || "Dispatch failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Receive transfer
  const handleReceive = async (shipmentId) => {
    setReceivingId(shipmentId);
    try {
      await receiveTransfer(shipmentId);
      message.success("Transfer received. Queued for last-mile delivery.");
      await refresh();
    } catch (err) {
      message.error(err?.response?.data?.message || "Receive failed");
    } finally {
      setReceivingId(null);
    }
  };

  // Get current rows
  const getCurrentRows = () => {
    switch (activeTab) {
      case "outbound":
        return data.outbound;
      case "inbound":
        return data.inbound;
      case "received":
        return data.received;
      case "completed":
        return data.completed;
      case "history":
        return data.history;
      default:
        return [];
    }
  };

  // Common columns
  const shipmentColumn = {
    title: "Shipment",
    key: "shipment",
    width: 150,
    render: (_, s) => (
      <Space direction="vertical" size={1}>
        <Text strong>{s.tracking_number || `#${s.id}`}</Text>
        <Tag color="orange"><SwapOutlined /> Transfer</Tag>
      </Space>
    ),
  };

  const routeColumn = {
    title: "Route",
    key: "route",
    width: 200,
    render: (_, s) => {
      const origin = routeLabel(s.origin_branch, s.origin_sub_branch);
      const destination = routeLabel(s.destination_branch, s.destination_sub_branch);
      return (
        <Space direction="vertical" size={1}>
          <Space size={4} style={{ fontSize: 12 }}>
            <Tag>{origin}</Tag>
            <ArrowRightOutlined />
            <Tag color="blue">{destination}</Tag>
          </Space>
        </Space>
      );
    },
  };

  const receiverColumn = {
    title: "Receiver",
    key: "receiver",
    width: 200,
    render: (_, s) => (
      <Space direction="vertical" size={1}>
        <Text style={{ fontSize: 13 }}>{s.receiver_name || "—"}</Text>
        {s.receiver_phone && <Text type="secondary" style={{ fontSize: 11 }}>{s.receiver_phone}</Text>}
      </Space>
    ),
  };

  const paymentColumn = {
    title: "Payment",
    key: "payment",
    width: 120,
    render: (_, s) => {
      const isPod = ["pod", "cod", "to_pay"].includes(String(s.payment_type || "").toLowerCase());
      return isPod ? (
        <Space direction="vertical" size={0}>
          <Tag color="volcano"><DollarOutlined /> POD</Tag>
          <Text strong>{money(s.total_collectable_amount || s.pod_amount)}</Text>
        </Space>
      ) : (
        <Tag color="green">Prepaid</Tag>
      );
    },
  };

  // Outbound columns
  const outboundColumns = [
    shipmentColumn,
    routeColumn,
    receiverColumn,
    paymentColumn,
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_, s) => (
        <Button type="link" size="small" onClick={() => showTimeline(s)}>
          Timeline
        </Button>
      ),
    },
  ];

  // Inbound columns
  const inboundColumns = [
    shipmentColumn,
    routeColumn,
    receiverColumn,
    paymentColumn,
    {
      title: "Action",
      key: "action",
      width: 120,
      render: (_, s) =>
        can?.("transfers.receive") ? (
          <Button
            type="primary"
            size="small"
            icon={<InboxOutlined />}
            loading={receivingId === s.id}
            onClick={() => handleReceive(s.id)}
          >
            Receive
          </Button>
        ) : null,
    },
  ];

  // Received columns
  const receivedColumns = [
    shipmentColumn,
    routeColumn,
    {
      title: "Received At",
      key: "received_at",
      width: 150,
      render: (_, s) => (
        <Space direction="vertical" size={1}>
          <Text>{formatDate(s.received_at_destination_at)}</Text>
          <Tag color="blue" icon={<CheckCircleOutlined />}>Ready</Tag>
        </Space>
      ),
    },
    receiverColumn,
    paymentColumn,
  ];

  // Completed columns
  const completedColumns = [
    shipmentColumn,
    routeColumn,
    {
      title: "Delivered",
      key: "delivered",
      width: 150,
      render: (_, s) => formatDate(s.delivered_at),
    },
    receiverColumn,
    {
      title: "Duration",
      key: "duration",
      width: 100,
      render: (_, s) => {
        const duration = s.transfer_details?.transfer_duration;
        return duration ? <Tag color="green">{duration}</Tag> : "—";
      },
    },
  ];

  // History columns
  const historyColumns = [
    shipmentColumn,
    routeColumn,
    {
      title: "Status",
      key: "status",
      width: 150,
      render: (_, s) => {
        const statusColors = {
          sorted_for_transfer: { color: "orange", icon: <SendOutlined />, text: "Outbound" },
          in_transit: { color: "blue", icon: <CarOutlined />, text: "In Transit" },
          received_at_destination_branch: { color: "cyan", icon: <InboxOutlined />, text: "Received" },
          sorted_for_delivery: { color: "purple", icon: <HomeOutlined />, text: "Pending" },
          delivered: { color: "green", icon: <CheckCircleOutlined />, text: "Delivered" },
        };
        const config = statusColors[s.status] || { color: "default", text: s.status };
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      },
    },
    {
      title: "Updated",
      key: "updated",
      width: 150,
      render: (_, s) => formatDate(s.updated_at),
    },
  ];

  // Get columns for current tab
  const getColumns = () => {
    switch (activeTab) {
      case "outbound":
        return outboundColumns;
      case "inbound":
        return inboundColumns;
      case "received":
        return receivedColumns;
      case "completed":
        return completedColumns;
      case "history":
        return historyColumns;
      default:
        return [];
    }
  };

  const showTimeline = (shipment) => {
    setTimelineModal({ open: true, shipment });
  };

  // Row selection for outbound
  const rowSelection = activeTab === "outbound" && can?.("transfers.dispatch")
    ? { selectedRowKeys, onChange: setSelectedRowKeys }
    : undefined;

  return (
    <div style={{ padding: 24, background: "#f7f8fa", minHeight: "100vh" }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[12, 12]}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Transfers</Title>
          <Text type="secondary">Cross-branch transfer management (Multi-hop support: 1, 2, or 3 transits)</Text>
        </Col>
        <Col>
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search tracking, receiver…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 250 }}
            />
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title={<Space><SendOutlined /> Outbound</Space>}
              value={stats.outbound}
              valueStyle={{ color: BRAND }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title={<Space><CarOutlined /> In Transit</Space>}
              value={stats.in_transit}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title={<Space><InboxOutlined /> Received</Space>}
              value={stats.received}
              valueStyle={{ color: "#13c2c2" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title={<Space><CheckCircleOutlined /> Completed</Space>}
              value={stats.completed}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Row justify="space-between" style={{ marginBottom: 12 }} gutter={[12, 12]}>
        <Col>
          {(activeTab === "completed" || activeTab === "history") && (
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={["From", "To"]}
            />
          )}
        </Col>
        <Col>
          {activeTab === "history" && (
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 180 }}>
              <Option value="all">All Statuses</Option>
              <Option value="sorted_for_transfer">Outbound</Option>
              <Option value="in_transit">In Transit</Option>
              <Option value="received_at_destination_branch">Received</Option>
              <Option value="delivered">Completed</Option>
            </Select>
          )}
        </Col>
      </Row>

      {/* Bulk Action Bar */}
      {activeTab === "outbound" && can?.("transfers.dispatch") && selectedRowKeys.length > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fff7e6",
          border: "1px solid #ffd591",
          borderRadius: 12,
          padding: "10px 16px",
          marginBottom: 12,
        }}>
          <Space>
            <Badge count={selectedRowKeys.length} style={{ background: "#fa8c16" }} />
            <Text strong>{selectedRowKeys.length} selected</Text>
          </Space>
          <Space>
            <Button onClick={() => setSelectedRowKeys([])}>Clear</Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleDispatch}
            >
              Dispatch
            </Button>
          </Space>
        </div>
      )}

      {/* Tabs */}
      <Card style={{ borderRadius: 14 }}>
        <Spin spinning={loading}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: "outbound", label: `Outbound (${stats.outbound})`, children: null },
              { key: "inbound", label: `In Transit (${stats.in_transit})`, children: null },
              { key: "received", label: `Received (${stats.received})`, children: null },
              { key: "completed", label: `Completed (${stats.completed})`, children: null },
              { key: "history", label: "History", children: null },
            ]}
          />

          <Table
            rowKey="id"
            size="middle"
            loading={loading}
            rowSelection={rowSelection}
            columns={getColumns()}
            dataSource={getCurrentRows()}
            scroll={{ x: 1200 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${activeTab} transfers`} />,
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              onChange: (page, pageSize) => {
                setPagination({ current: page, pageSize });
                loadData();
              },
            }}
          />
        </Spin>
      </Card>

      {/* Timeline Modal */}
      <TimelineModal
        open={timelineModal.open}
        shipment={timelineModal.shipment}
        onClose={() => setTimelineModal({ open: false, shipment: null })}
      />
    </div>
  );
}

// Timeline Modal
function TimelineModal({ open, shipment, onClose }) {
  if (!shipment) return null;

  const timeline = shipment.timeline || [];

  const statusIcons = {
    sorted_for_transfer: <SendOutlined style={{ color: "#fa8c16" }} />,
    in_transit: <CarOutlined style={{ color: "#1677ff" }} />,
    received_at_destination_branch: <InboxOutlined style={{ color: "#13c2c2" }} />,
    sorted_for_delivery: <HomeOutlined style={{ color: "#722ed1" }} />,
    delivered: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
  };

  const statusColors = {
    sorted_for_transfer: "orange",
    in_transit: "blue",
    received_at_destination_branch: "cyan",
    sorted_for_delivery: "purple",
    delivered: "green",
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <SwapOutlined />
          Transfer Timeline - {shipment.tracking_number || `#${shipment.id}`}
        </Space>
      }
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
      width={700}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card size="small">
            <Space size={24}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Origin</Text>
                <br />
                <Text strong>{shipment.transfer_route?.origin}</Text>
              </div>
              <ArrowRightOutlined style={{ fontSize: 20, color: "#ccc" }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Destination</Text>
                <br />
                <Text strong>{shipment.transfer_route?.destination}</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={24}>
          {timeline.length > 0 ? (
            <Timeline
              items={timeline.map((event, i) => ({
                key: i,
                color: statusColors[event.status] || "gray",
                dot: statusIcons[event.status] || <ClockCircleOutlined />,
                children: (
                  <div>
                    <Text strong>{event.description}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(event.at)}
                    </Text>
                  </div>
                ),
              }))}
            />
          ) : (
            <Empty description="No timeline events" />
          )}
        </Col>
      </Row>
    </Modal>
  );
}