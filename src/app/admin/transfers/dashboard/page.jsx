"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@ant-design/icons";
import { usePermissions } from "@/hooks/usePermission";
import {
  getTransfers,
  getTransferStats,
  dispatchTransfers,
  receiveTransfer,
  getReceivedTransfers,
  getCompletedTransfers,
  getTransferHistory,
} from "@/services/admin/transferService";

const { Text, Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const BRAND = "#027196";

function money(v) {
  const n = Number(v || 0);
  return `NPR ${n.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "ΓÇö";
  return new Date(dateStr).toLocaleString("en-NP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function routeLabel(branch, subBranch, fallback) {
  const branchName = branch?.name || branch?.code;
  const subBranchName = subBranch?.name || subBranch?.code;

  if (subBranchName && branchName && Number(branch?.id) !== Number(subBranch?.id)) {
    const parentName = subBranch?.parent?.name || branchName;
    return `${parentName} / ${subBranchName}`;
  }

  return subBranchName || branchName || fallback;
}

export default function TransferDashboardPage() {
  const { can } = usePermissions();

  // Tab management
  const [activeTab, setActiveTab] = useState("outbound");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Data states
  const [stats, setStats] = useState({
    outbound: 0,
    in_transit: 0,
    received: 0,
    completed: 0,
    total_value: 0,
    pod_amount: 0,
  });
  const [outboundRows, setOutboundRows] = useState([]);
  const [inboundRows, setInboundRows] = useState([]);
  const [receivedRows, setReceivedRows] = useState([]);
  const [completedRows, setCompletedRows] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState(null);

  // Selection states
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // Pagination
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsData = await getTransferStats();
      setStats(statsData);
    } catch (e) {
      message.error("Failed to load transfer statistics");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load outbound
  const loadOutbound = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await getTransfers({ page, per_page: pageSize, direction: "outbound", search: debouncedSearch || undefined });
      setOutboundRows(res.list);
      setPagination((p) => ({ ...p, current: res.currentPage, total: res.total }));
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load outbound transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  // Load inbound
  const loadInbound = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await getTransfers({ page, per_page: pageSize, direction: "inbound", search: debouncedSearch || undefined });
      setInboundRows(res.list);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load inbound transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  // Load received (cross-branch only)
  const loadReceived = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const res = await getReceivedTransfers({ page, per_page: pageSize, search: debouncedSearch || undefined });
      setReceivedRows(res.list);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load received transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  // Load completed
  const loadCompleted = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, search: debouncedSearch || undefined };
      if (dateRange?.length === 2) {
        params.date_from = dateRange[0].format("YYYY-MM-DD");
        params.date_to = dateRange[1].format("YYYY-MM-DD");
      }
      const res = await getCompletedTransfers(params);
      setCompletedRows(res.list);
      setPagination((p) => ({ ...p, current: res.currentPage, total: res.total }));
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load completed transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateRange]);

  // Load history
  const loadHistory = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, search: debouncedSearch || undefined };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (dateRange?.length === 2) {
        params.date_from = dateRange[0].format("YYYY-MM-DD");
        params.date_to = dateRange[1].format("YYYY-MM-DD");
      }
      const res = await getTransferHistory(params);
      setHistoryRows(res.list);
      setPagination((p) => ({ ...p, current: res.currentPage, total: res.total }));
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load transfer history");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateRange, statusFilter]);

  // Load data based on active tab
  const loadData = useCallback(async () => {
    setSelectedRowKeys([]);
    switch (activeTab) {
      case "outbound":
        await loadOutbound(pagination.current, pagination.pageSize);
        break;
      case "inbound":
        await loadInbound();
        break;
      case "received":
        await loadReceived();
        break;
      case "completed":
        await loadCompleted();
        break;
      case "history":
        await loadHistory();
        break;
    }
  }, [activeTab, pagination.current, pagination.pageSize, loadOutbound, loadInbound, loadReceived, loadCompleted, loadHistory]);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Reload data when tab or search changes
  useEffect(() => {
    setPagination((p) => ({ ...p, current: 1 }));
    loadData();
  }, [activeTab, debouncedSearch]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([loadStats(), loadData()]);
  }, [loadStats, loadData]);

  // Bulk dispatch
  const handleBulkDispatch = async () => {
    if (selectedRowKeys.length === 0) return;
    setSubmitting(true);
    try {
      const res = await dispatchTransfers(selectedRowKeys);
      const ok = res?.dispatched?.length ?? 0;
      const skip = res?.skipped ? Object.keys(res.skipped).length : 0;
      message.success(skip === 0 ? `${ok} dispatched.` : `${ok} dispatched, ${skip} skipped.`);
      setSelectedRowKeys([]);
      await refresh();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to dispatch.");
    } finally {
      setSubmitting(false);
    }
  };

  // Individual receive
  const handleReceive = async (shipmentId) => {
    setReceivingId(shipmentId);
    try {
      await receiveTransfer(shipmentId);
      message.success("Received. Queued for last-mile delivery at destination.");
      await refresh();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to receive.");
    } finally {
      setReceivingId(null);
    }
  };

  // Common columns
  const shipmentColumn = {
    title: "Shipment",
    key: "shipment",
    render: (_, s) => (
      <Space direction="vertical" size={2}>
        <Text strong style={{ fontSize: 13 }}>{s.tracking_number || `#${s.id}`}</Text>
        <Tag color="orange" style={{ margin: 0 }}>
          <SwapOutlined /> Transfer
        </Tag>
      </Space>
    ),
  };

  const routeColumn = {
    title: "Route",
    key: "route",
    render: (_, s) => {
      const origin = routeLabel(s.origin_branch, s.origin_sub_branch, "Origin");
      const destination = routeLabel(s.destination_branch, s.destination_sub_branch, "Destination");
      const current = routeLabel(s.current_branch, s.current_sub_branch, origin);

      const statusLabels = {
        outbound: `Ready at ${current}`,
        inbound: `In transit to ${destination}`,
        received: `Arrived at ${destination}`,
        completed: `Delivered to ${destination}`,
      };

      return (
        <Space direction="vertical" size={2}>
          <Space size={6} style={{ fontSize: 12 }}>
            <Tag style={{ margin: 0, maxWidth: 180 }}>{origin}</Tag>
            <ArrowRightOutlined style={{ color: "#bfbfbf" }} />
            <Tag color="blue" style={{ margin: 0, maxWidth: 180 }}>{destination}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {statusLabels[activeTab] || `Current: ${current}`}
          </Text>
        </Space>
      );
    },
  };

  const receiverColumn = {
    title: "Receiver",
    key: "receiver",
    render: (_, s) => (
      <Space direction="vertical" size={0}>
        <Text style={{ fontSize: 13 }}>{s.receiver_name || "ΓÇö"}</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {s.receiver_phone ? <Space size={4}><PhoneOutlined />{s.receiver_phone}</Space> : "ΓÇö"}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {s.delivery_address || s.receiver_address || s.receiver_city || "ΓÇö"}
        </Text>
      </Space>
    ),
  };

  const paymentColumn = {
    title: "Payment",
    key: "payment",
    render: (_, s) =>
      ["pod", "cod", "to_pay"].includes(String(s.payment_type || "").toLowerCase()) ? (
        <Space direction="vertical" size={0}>
          <Tag color="volcano" style={{ margin: 0 }}><DollarOutlined /> POD</Tag>
          <Text strong style={{ fontSize: 12 }}>{money(s.total_collectable_amount || s.pod_amount)}</Text>
        </Space>
      ) : (
        <Tag color="green" style={{ margin: 0 }}>Prepaid</Tag>
      ),
  };

  // Outbound columns
  const outboundColumns = [shipmentColumn, routeColumn, receiverColumn, paymentColumn];

  // Inbound columns
  const inboundColumns = [
    shipmentColumn,
    routeColumn,
    receiverColumn,
    paymentColumn,
    {
      title: "",
      key: "actions",
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
      render: (_, s) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{formatDate(s.received_at_destination_at)}</Text>
          <Tag color="blue" icon={<CheckCircleOutlined />}>Ready for Delivery</Tag>
        </Space>
      ),
    },
    receiverColumn,
    paymentColumn,
  ];

  // Completed columns
  const completedColumns = [
    {
      title: "Shipment",
      key: "shipment",
      render: (_, s) => {
        const isCrossBranch = (s.transfer_details?.origin_branch_id ?? 0) !== (s.transfer_details?.destination_branch_id ?? 0);
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 13 }}>{s.tracking_number || `#${s.id}`}</Text>
            {!isCrossBranch && (
              <Tag color="red" style={{ margin: 0 }}>
                ΓÜá Same-branch (should not show)
              </Tag>
            )}
            <Tag color="orange" style={{ margin: 0 }}>
              <SwapOutlined /> Transfer
            </Tag>
          </Space>
        );
      },
    },
    routeColumn,
    {
      title: "Delivered At",
      key: "delivered_at",
      render: (_, s) => formatDate(s.delivered_at),
    },
    receiverColumn,
    {
      title: "Transfer Time",
      key: "transfer_time",
      render: (_, s) =>
        s.transfer_details?.transfer_duration ? (
          <Tag color="green">{s.transfer_details.transfer_duration}</Tag>
        ) : (
          "ΓÇö"
        ),
    },
  ];

  // History columns
  const historyColumns = [
    shipmentColumn,
    routeColumn,
    {
      title: "Status",
      key: "status",
      render: (_, s) => {
        const statusConfig = {
          sorted_for_transfer: { color: "orange", icon: <SendOutlined />, text: "Outbound" },
          in_transit: { color: "blue", icon: <CarOutlined />, text: "In Transit" },
          received_at_destination_branch: { color: "cyan", icon: <InboxOutlined />, text: "Received" },
          sorted_for_delivery: { color: "purple", icon: <HomeOutlined />, text: "Pending Delivery" },
          delivered: { color: "green", icon: <CheckCircleOutlined />, text: "Completed" },
        };
        const config = statusConfig[s.status] || { color: "default", text: s.status };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: "Updated",
      key: "updated",
      render: (_, s) => formatDate(s.updated_at),
    },
    {
      title: "Timeline",
      key: "timeline",
      render: (_, s) => (
        <Button
          type="link"
          size="small"
          onClick={() => showTimelineModal(s)}
        >
          View Timeline
        </Button>
      ),
    },
  ];

  // Row selection for outbound
  const rowSelection =
    activeTab === "outbound" && can?.("transfers.dispatch")
      ? { selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }
      : undefined;

  // Get current data and columns based on tab
  const filterCrossBranch = (rows) => {
    return rows.filter(s => {
      const originId = s.origin_branch_id ?? s.transfer_details?.origin_branch_id ?? 0;
      const destId = s.destination_branch_id ?? s.transfer_details?.destination_branch_id ?? 0;
      return originId !== destId;
    });
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case "outbound":
        return { rows: filterCrossBranch(outboundRows), columns: outboundColumns, count: stats.outbound };
      case "inbound":
        return { rows: filterCrossBranch(inboundRows), columns: inboundColumns, count: stats.in_transit };
      case "received":
        return { rows: filterCrossBranch(receivedRows), columns: receivedColumns, count: stats.received };
      case "completed":
        return { rows: filterCrossBranch(completedRows), columns: completedColumns, count: stats.completed };
      case "history":
        return { rows: filterCrossBranch(historyRows), columns: historyColumns, count: pagination.total };
      default:
        return { rows: [], columns: [], count: 0 };
    }
  };

  const { rows: currentRows, columns: currentColumns, count: currentCount } = getCurrentData();

  // Tab items
  const tabItems = [
    {
      key: "outbound",
      label: (
        <span>
          <SendOutlined /> Outbound ({stats.outbound})
        </span>
      ),
      children: (
        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 14 }}>
          <Table
            rowKey="id"
            size="middle"
            loading={loading && activeTab === "outbound"}
            rowSelection={rowSelection}
            columns={currentColumns}
            dataSource={currentRows}
            scroll={{ x: 900 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing to dispatch" />,
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: currentCount,
              showSizeChanger: true,
              showTotal: (t) => `${t} shipment${t === 1 ? "" : "s"}`,
              onChange: (p, ps) => {
                setPagination((prev) => ({ ...prev, current: p, pageSize: ps }));
                loadOutbound(p, ps);
              },
            }}
          />
        </Card>
      ),
    },
    {
      key: "inbound",
      label: (
        <span>
          <CarOutlined /> In Transit ({stats.in_transit})
        </span>
      ),
      children: (
        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 14 }}>
          <Table
            rowKey="id"
            size="middle"
            loading={loading && activeTab === "inbound"}
            columns={currentColumns}
            dataSource={currentRows}
            scroll={{ x: 900 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing arriving" />,
            }}
            pagination={{ pageSize: 20 }}
          />
        </Card>
      ),
    },
    {
      key: "received",
      label: (
        <span>
          <InboxOutlined /> Received ({stats.received})
        </span>
      ),
      children: (
        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 14 }}>
          <Table
            rowKey="id"
            size="middle"
            loading={loading && activeTab === "received"}
            columns={currentColumns}
            dataSource={currentRows}
            scroll={{ x: 900 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No received transfers" />,
            }}
            pagination={{ pageSize: 20 }}
          />
        </Card>
      ),
    },
    {
      key: "completed",
      label: (
        <span>
          <CheckCircleOutlined /> Completed ({stats.completed})
        </span>
      ),
      children: (
        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 14 }}>
          <Table
            rowKey="id"
            size="middle"
            loading={loading && activeTab === "completed"}
            columns={currentColumns}
            dataSource={currentRows}
            scroll={{ x: 900 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No completed transfers" />,
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: currentCount,
              showSizeChanger: true,
              showTotal: (t) => `${t} transfer${t === 1 ? "" : "s"}`,
              onChange: (p, ps) => {
                setPagination((prev) => ({ ...prev, current: p, pageSize: ps }));
                loadCompleted(p, ps);
              },
            }}
          />
        </Card>
      ),
    },
    {
      key: "history",
      label: (
        <span>
          <HistoryOutlined /> History
        </span>
      ),
      children: (
        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 14 }}>
          <Table
            rowKey="id"
            size="middle"
            loading={loading && activeTab === "history"}
            columns={currentColumns}
            dataSource={currentRows}
            scroll={{ x: 1000 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No transfer history" />,
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: currentCount,
              showSizeChanger: true,
              showTotal: (t) => `${t} transfer${t === 1 ? "" : "s"}`,
              onChange: (p, ps) => {
                setPagination((prev) => ({ ...prev, current: p, pageSize: ps }));
                loadHistory(p, ps);
              },
            }}
          />
        </Card>
      ),
    },
  ];

  // Timeline modal state
  const [timelineModal, setTimelineModal] = useState({ open: false, shipment: null });

  const showTimelineModal = (shipment) => {
    setTimelineModal({ open: true, shipment });
  };

  return (
    <div style={{ padding: 24, background: "#f7f8fa", minHeight: "100%" }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[12, 12]}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Transfer Dashboard</Title>
          <Text type="secondary">Branch-to-branch transfer management</Text>
        </Col>
        <Col>
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Search tracking, receiver, phoneΓÇª"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260 }}
            />
            <Button icon={<ReloadOutlined />} onClick={refresh}>Refresh</Button>
          </Space>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title={<Space><SendOutlined /> Outbound (Ready)</Space>}
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

      {/* Filters Row */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }} gutter={[12, 12]}>
        <Col>
          {/* Date Range Filter (for Completed and History) */}
          {(activeTab === "completed" || activeTab === "history") && (
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={["From date", "To date"]}
            />
          )}
        </Col>
        <Col>
          {/* Status Filter (for History) */}
          {activeTab === "history" && (
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 180 }}
            >
              <Option value="all">All Statuses</Option>
              <Option value="sorted_for_transfer">Outbound</Option>
              <Option value="in_transit">In Transit</Option>
              <Option value="received_at_destination_branch">Received</Option>
              <Option value="delivered">Completed</Option>
            </Select>
          )}
        </Col>
      </Row>

      {/* Bulk Action Bar (Outbound) */}
      {activeTab === "outbound" && can?.("transfers.dispatch") && selectedRowKeys.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "#fff7e6",
            border: "1px solid #ffd591",
            borderRadius: 12,
            padding: "10px 16px",
            marginBottom: 12,
          }}
        >
          <Space size={8}>
            <Badge count={selectedRowKeys.length} style={{ background: "#fa8c16" }} />
            <Text strong>{selectedRowKeys.length} selected</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Dispatch these to their destination branch
            </Text>
          </Space>
          <Space>
            <Button onClick={() => setSelectedRowKeys([])}>Clear</Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleBulkDispatch}
            >
              Dispatch selected
            </Button>
          </Space>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      {/* Timeline Modal */}
      <TimelineModal
        open={timelineModal.open}
        shipment={timelineModal.shipment}
        onClose={() => setTimelineModal({ open: false, shipment: null })}
      />
    </div>
  );
}

// Timeline Modal Component
function TimelineModal({ open, shipment, onClose }) {
  if (!shipment) return null;

  const timeline = shipment.timeline || [];

  const getTimelineIcon = (status) => {
    const icons = {
      sorted_for_transfer: <SendOutlined style={{ color: "#fa8c16" }} />,
      in_transit: <CarOutlined style={{ color: "#1677ff" }} />,
      received_at_destination_branch: <InboxOutlined style={{ color: "#13c2c2" }} />,
      sorted_for_delivery: <HomeOutlined style={{ color: "#722ed1" }} />,
      delivered: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
    };
    return icons[status] || <ClockCircleOutlined />;
  };

  const getTimelineColor = (status) => {
    const colors = {
      sorted_for_transfer: "orange",
      in_transit: "blue",
      received_at_destination_branch: "cyan",
      sorted_for_delivery: "purple",
      delivered: "green",
    };
    return colors[status] || "gray";
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
      footer={[
        <Button key="close" onClick={onClose}>Close</Button>,
      ]}
      width={700}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space size={24}>
              <div>
                <Text type="secondary">Origin</Text>
                <br />
                <Text strong>{shipment.transfer_route?.origin || "Unknown"}</Text>
              </div>
              <ArrowRightOutlined style={{ fontSize: 20, color: "#bfbfbf" }} />
              <div>
                <Text type="secondary">Destination</Text>
                <br />
                <Text strong>{shipment.transfer_route?.destination || "Unknown"}</Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={24}>
          <Timeline
            mode="left"
            items={timeline.map((event, index) => ({
              key: index,
              color: getTimelineColor(event.status),
              dot: getTimelineIcon(event.status),
              children: (
                <div>
                  <Text strong>{event.description}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(event.at).toLocaleString("en-NP", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </div>
              ),
            }))}
          />
        </Col>
      </Row>
    </Modal>
  );
}

import { Modal } from "antd";
