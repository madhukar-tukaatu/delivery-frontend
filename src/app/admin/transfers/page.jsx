"use client";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Modal,
  Row,
  Space,
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
  getAvailableTransferRoutes,
  dispatchTransfers,
  receiveTransfer,
  getReceivedTransfers,
  getCompletedTransfers,
  getTransferHistory,
} from "@/services/admin/transferService";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const SERVICE_TYPE_META = {
  standard: { color: "default", label: "STANDARD" },
  express: { color: "orange", label: "EXPRESS" },
  same_day: { color: "magenta", label: "SAME DAY" },
  flight: { color: "purple", label: "FLIGHT" },
};

function ServiceTypeTag({ value }) {
  if (!value) return null;
  const key = String(value).toLowerCase();
  const meta = SERVICE_TYPE_META[key] || { color: "default", label: String(value).toUpperCase() };
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

function hopLabel(shipment) {
  const hop = shipment?.hop_meta;
  if (!hop) return null;
  const bits = [];
  if (hop.path_text) bits.push(hop.path_text);
  if (hop.next_hop_name) bits.push(`Next: ${hop.next_hop_name}`);
  if (hop.transfer_leg_index != null) bits.push(`Leg ${(Number(hop.transfer_leg_index) || 0) + 1}`);
  return bits.length ? bits.join(" | ") : null;
}


function money(v) {
  const n = Number(v || 0);
  return `NPR ${n.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
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

const TRANSFER_STAGE_META = {
  ready_to_dispatch: { color: "orange", icon: <SendOutlined />, text: "Ready to Dispatch" },
  in_transit: { color: "processing", icon: <CarOutlined />, text: "In Transit" },
  received: { color: "cyan", icon: <InboxOutlined />, text: "Received at Destination" },
  out_for_delivery: { color: "geekblue", icon: <HomeOutlined />, text: "Out for Delivery" },
  delivered: { color: "success", icon: <CheckCircleOutlined />, text: "Delivered" },
  returning: { color: "warning", icon: <SwapOutlined />, text: "Returning" },
  cancelled: { color: "default", icon: null, text: "Cancelled" },
};

// Single source of truth for the transfer status chip. Uses the backend
// transfer_stage/transfer_stage_label so every tab shows the same wording.
function TransferStageTag({ shipment }) {
  const stage = shipment?.transfer_stage;
  const meta = TRANSFER_STAGE_META[stage];

  if (!meta) {
    const fallback = shipment?.transfer_stage_label || shipment?.status || "-";
    return <Tag>{String(fallback).replaceAll("_", " ")}</Tag>;
  }

  return (
    <Tag color={meta.color} icon={meta.icon}>
      {meta.text}
    </Tag>
  );
}

// One-line instruction shown at the top of each tab so the operation flow is
// obvious: dispatch -> in transit -> receive -> sorted for delivery -> done.
function TabGuide({ type, message: msg }) {
  return (
    <Alert
      type={type}
      showIcon
      message={msg}
      style={{ borderRadius: "14px 14px 0 0" }}
    />
  );
}

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
                <Text strong>
                  {shipment.transfer_summary?.origin
                    || shipment.hop_meta?.origin_name
                    || shipment.origin_branch?.name
                    || shipment.originBranch?.name
                    || "Unknown"}
                </Text>
              </div>
              <ArrowRightOutlined style={{ fontSize: 20, color: "#bfbfbf" }} />
              <div>
                <Text type="secondary">Destination</Text>
                <br />
                <Text strong>
                  {shipment.transfer_summary?.destination
                    || shipment.hop_meta?.destination_name
                    || shipment.destination_branch?.name
                    || shipment.destinationBranch?.name
                    || "Unknown"}
                </Text>
              </div>
              {(shipment.hop_meta?.next_hop_name || shipment.transfer_summary?.next_hop) ? (
                <>
                  <ArrowRightOutlined style={{ fontSize: 20, color: "#bfbfbf" }} />
                  <div>
                    <Text type="secondary">Next hop</Text>
                    <br />
                    <Text strong>
                      {shipment.hop_meta?.next_hop_name || shipment.transfer_summary?.next_hop}
                    </Text>
                  </div>
                </>
              ) : null}
            </Space>
            {(shipment.hop_meta?.path_text || shipment.transfer_summary?.path_text || shipment.hop_meta?.in_transit_label) ? (
              <div style={{ marginTop: 12 }}>
                {shipment.hop_meta?.path_text || shipment.transfer_summary?.path_text ? (
                  <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                    Path: {shipment.hop_meta?.path_text || shipment.transfer_summary?.path_text}
                  </Text>
                ) : null}
                {shipment.hop_meta?.in_transit_label ? (
                  <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                    {shipment.hop_meta.in_transit_label}
                  </Text>
                ) : null}
                {shipment.hop_meta?.route_code ? (
                  <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                    Route {shipment.hop_meta.route_code}
                    {shipment.hop_meta.route_name ? ` · ${shipment.hop_meta.route_name}` : ""}
                  </Text>
                ) : null}
              </div>
            ) : null}
          </Card>
        </Col>
        <Col span={24}>
          {timeline.length > 0 ? (
            <Timeline
              mode="left"
              items={timeline.map((event, index) => ({
                key: index,
                color: getTimelineColor(event.status),
                dot: getTimelineIcon(event.status),
                children: (
                  <div>
                    <Text strong>{event.description}</Text>
                    {(event.next_hop || event.path_text || event.branch_name) ? (
                      <>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {[event.branch_name, event.next_hop ? `Next: ${event.next_hop}` : null, event.path_text]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </>
                    ) : null}
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(event.at)}
                    </Text>
                  </div>
                ),
              }))}
            />
          ) : (
            <Empty description="No timeline events found" />
          )}
        </Col>
      </Row>
    </Modal>
  );
}

export default function TransfersPage() {
  const { can } = usePermissions();

  // Tab management
  const [activeTab, setActiveTab] = useState("outbound");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");

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

  // Configured transfer route selection (required for outbound dispatch)
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedTransferRouteId, setSelectedTransferRouteId] = useState(null);

  // Pagination
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  // Timeline modal state
  const [timelineModal, setTimelineModal] = useState({ open: false, shipment: null });

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

  // Load configured transfer routes for this branch
  const loadAvailableRoutes = useCallback(async () => {
    setRoutesLoading(true);
    try {
      const params = {};
      if (serviceTypeFilter && serviceTypeFilter !== "all") {
        params.service_type = serviceTypeFilter;
      }
      const res = await getAvailableTransferRoutes(params);
      const routes = res.routes || [];
      setAvailableRoutes(routes);
      setSelectedTransferRouteId((prev) => {
        if (prev && routes.some((r) => Number(r.route_id || r.id) === Number(prev))) {
          return prev;
        }
        return null;
      });
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load transfer routes");
      setAvailableRoutes([]);
    } finally {
      setRoutesLoading(false);
    }
  }, [serviceTypeFilter]);

  // Load outbound (optionally filtered by selected transfer route)
  const loadOutbound = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: pageSize,
        direction: "outbound",
        search: debouncedSearch || undefined,
      };
      if (selectedTransferRouteId) {
        params.transfer_route_id = selectedTransferRouteId;
      }
      if (serviceTypeFilter && serviceTypeFilter !== "all") {
        params.service_type = serviceTypeFilter;
      }
      const res = await getTransfers(params);
      setOutboundRows(res.list);
      setPagination((p) => ({ ...p, current: res.currentPage, total: res.total }));
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load outbound transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedTransferRouteId, serviceTypeFilter]);

  // Load inbound
  const loadInbound = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const inboundParams = { page, per_page: pageSize, direction: "inbound", search: debouncedSearch || undefined };
      if (serviceTypeFilter && serviceTypeFilter !== "all") inboundParams.service_type = serviceTypeFilter;
      const res = await getTransfers(inboundParams);
      setInboundRows(res.list);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load inbound transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, serviceTypeFilter]);

  // Load received
  const loadReceived = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const receivedParams = { page, per_page: pageSize, search: debouncedSearch || undefined };
      if (serviceTypeFilter && serviceTypeFilter !== "all") receivedParams.service_type = serviceTypeFilter;
      const res = await getReceivedTransfers(receivedParams);
      setReceivedRows(res.list);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load received transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, serviceTypeFilter]);

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
      default:
        break;
    }
  }, [activeTab, pagination.current, pagination.pageSize, loadOutbound, loadInbound, loadReceived, loadCompleted, loadHistory]);

  // Load stats + configured routes on mount / when service type filter changes
  useEffect(() => {
    loadStats();
    loadAvailableRoutes();
  }, [loadStats, loadAvailableRoutes]);

  // Reload lists when service type filter changes
  useEffect(() => {
    setPagination((p) => ({ ...p, current: 1 }));
    setSelectedRowKeys([]);
    // loadData runs via activeTab/debouncedSearch effect; trigger explicitly
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceTypeFilter]);

  // Reload outbound when the selected transfer route changes
  useEffect(() => {
    if (activeTab !== "outbound") return;
    setPagination((p) => ({ ...p, current: 1 }));
    loadOutbound(1, pagination.pageSize);
    setSelectedRowKeys([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTransferRouteId]);

  // Reload data when tab or search changes
  useEffect(() => {
    setPagination((p) => ({ ...p, current: 1 }));
    loadData();
  }, [activeTab, debouncedSearch]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([loadStats(), loadData()]);
  }, [loadStats, loadData]);

  // Bulk dispatch (requires a configured transfer route)
  const handleBulkDispatch = async () => {
    if (selectedRowKeys.length === 0) return;
    if (!selectedTransferRouteId) {
      message.warning("Select a transfer route before dispatching.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await dispatchTransfers(selectedRowKeys, selectedTransferRouteId);
      const ok = res?.dispatched?.length ?? 0;
      const skip = res?.skipped ? Object.keys(res.skipped).length : 0;
      message.success(skip === 0 ? `${ok} dispatched on selected route.` : `${ok} dispatched, ${skip} skipped.`);
      setSelectedRowKeys([]);
      await refresh();
    } catch (e) {
      const errors = e?.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()?.[0] : null;
      message.error(firstError || e?.response?.data?.message || "Failed to dispatch.");
    } finally {
      setSubmitting(false);
    }
  };

  // Individual receive
  const handleReceive = async (shipmentId) => {
    setReceivingId(shipmentId);
    try {
      await receiveTransfer(shipmentId);
      message.success("Received at this hop. Transit parcels go to Outbound for onward dispatch; final destination goes to Received for last-mile.");
      await refresh();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to receive.");
    } finally {
      setReceivingId(null);
    }
  };

  // Show timeline modal
  const showTimelineModal = (shipment) => {
    setTimelineModal({ open: true, shipment });
  };

  // Common columns
  const shipmentColumn = {
    title: "Shipment",
    key: "shipment",
    render: (_, s) => (
      <Space direction="vertical" size={2}>
        <Text strong style={{ fontSize: 13 }}>{s.tracking_number || `#${s.id}`}</Text>
        <Space size={4} wrap>
          <TransferStageTag shipment={s} />
          <ServiceTypeTag value={s.hop_meta?.service_type || s.service_type} />
        </Space>
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

      // Prefer the backend-computed transfer stage so every tab/view agrees.
      const nextHop = s.hop_meta?.next_hop_name;
      const pathText = s.hop_meta?.path_text;
      const stageHint = {
        ready_to_dispatch: nextHop ? `Ready at ${current} -> next ${nextHop}` : `Ready at ${current}`,
        in_transit: nextHop ? `In transit to ${nextHop}` : `In transit to ${destination}`,
        received: `Arrived at ${destination}`,
        out_for_delivery: `Out for delivery at ${destination}`,
        delivered: `Delivered to ${destination}`,
        returning: "Returning to origin",
        cancelled: "Cancelled",
      };
      const hint = stageHint[s.transfer_stage] || `Current: ${current}`;

      return (
        <Space direction="vertical" size={2}>
          <Space size={6} style={{ fontSize: 12 }}>
            <Tag style={{ margin: 0, maxWidth: 180 }}>{origin}</Tag>
            <ArrowRightOutlined style={{ color: "#bfbfbf" }} />
            <Tag color="blue" style={{ margin: 0, maxWidth: 180 }}>{destination}</Tag>
          </Space>
          {pathText ? (
            <Text type="secondary" style={{ fontSize: 11 }}>{pathText}</Text>
          ) : null}
          <Text type="secondary" style={{ fontSize: 11 }}>
            {hint}
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
        <Text style={{ fontSize: 13 }}>{s.receiver_name || "-"}</Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {s.receiver_phone ? <Space size={4}><PhoneOutlined />{s.receiver_phone}</Space> : "-"}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {s.delivery_address || s.receiver_address || s.receiver_city || "-"}
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
    shipmentColumn,
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
          "-"
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
      render: (_, s) => <TransferStageTag shipment={s} />,
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
  const getCurrentData = () => {
    switch (activeTab) {
      case "outbound":
        return { rows: outboundRows, columns: outboundColumns, count: stats.outbound };
      case "inbound":
        return { rows: inboundRows, columns: inboundColumns, count: stats.in_transit };
      case "received":
        return { rows: receivedRows, columns: receivedColumns, count: stats.received };
      case "completed":
        return { rows: completedRows, columns: completedColumns, count: stats.completed };
      case "history":
        return { rows: historyRows, columns: historyColumns, count: pagination.total };
      default:
        return { rows: [], columns: [], count: 0 };
    }
  };

  const { rows: currentRows, columns: currentColumns, count: currentCount } = getCurrentData();

  // Tab items configuration
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
          <TabGuide
            type="warning"
            message="Hop-by-hop: pick Transfer Route (+ service type), select parcels, Dispatch to the NEXT hop only. Transit hubs receive then re-dispatch onward; destination receives for last-mile."
          />
          <Card size="small" style={{ margin: 12, borderRadius: 12 }}>
            <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
              <Space wrap>
                <Text strong>Transfer Route</Text>
                <Select
                  showSearch
                  allowClear
                  placeholder={
                    availableRoutes.length
                      ? "Select a configured transfer route"
                      : "No active transfer routes from this branch"
                  }
                  style={{ minWidth: 360 }}
                  loading={routesLoading}
                  value={selectedTransferRouteId}
                  optionFilterProp="label"
                  onChange={(value) => setSelectedTransferRouteId(value || null)}
                  optionLabelProp="label"
                  options={(() => {
                    const groups = {};
                    availableRoutes.forEach((route) => {
                      const svc = String(route.service_type || "standard").toLowerCase();
                      if (!groups[svc]) groups[svc] = [];
                      const id = Number(route.route_id || route.id);
                      const code = route.route_code || `#${id}`;
                      const pathText = route.path_text || route.route_name || route.name || "";
                      const nextHop = route.next_hop_name ? ` -> next ${route.next_hop_name}` : "";
                      groups[svc].push({
                        value: id,
                        label: `${code} | ${pathText}${nextHop}`,
                      });
                    });
                    return Object.keys(groups).sort().map((svc) => ({
                      label: (SERVICE_TYPE_META[svc]?.label || svc.toUpperCase()),
                      options: groups[svc],
                    }));
                  })()}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadAvailableRoutes}
                  loading={routesLoading}
                >
                  Refresh routes
                </Button>
              </Space>
              {selectedTransferRouteId ? (
                <Tag color="blue">Filtering outbound to selected route</Tag>
              ) : (
                <Tag color="orange">Select a route to filter and dispatch</Tag>
              )}
            </Space>
            {!routesLoading && availableRoutes.length === 0 && (
              <Alert
                style={{ marginTop: 12 }}
                type="warning"
                showIcon
                message="No active transfer routes start from your branch. Configure them under Admin -> Transfer Routes before dispatching."
              />
            )}
          </Card>
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
          <TabGuide
            type="info"
            message="Parcels whose NEXT hop is this branch. Receive them here. If this is a transit hub, they move to Outbound for onward dispatch; if final destination, they go to Received for last-mile."
          />
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
          <TabGuide
            type="success"
            message="Arrived at this branch and sorted for last-mile delivery. Assign a rider from the Deliveries board to complete the drop-off."
          />
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
          <TabGuide
            type="success"
            message="Cross-branch transfers that reached their destination and were delivered to the customer."
          />
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
          <TabGuide
            type="info"
            message="Full transfer timeline for every cross-branch parcel. Filter by date or status, and open View Timeline for step-by-step tracking."
          />
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

  return (
    <div style={{ padding: 24, background: "#f7f8fa", minHeight: "100%" }}>
      {/* Header */}
      <AdminPageHeader
        title="Transfers"
        subtitle="Hop-by-hop branch handoffs - organized by service type"
        icon={<SwapOutlined />}
        actions={
          <Button icon={<ReloadOutlined />} onClick={refresh}>Refresh</Button>
        }
      />
      <Card className="admin-card" style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="Search tracking, receiver, phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <Select
            value={serviceTypeFilter}
            onChange={setServiceTypeFilter}
            style={{ width: 180 }}
            options={[
              { value: "all", label: "All service types" },
              { value: "standard", label: "STANDARD" },
              { value: "express", label: "EXPRESS" },
              { value: "same_day", label: "SAME DAY" },
              { value: "flight", label: "FLIGHT" },
            ]}
          />
        </Space>
      </Card>

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
              Dispatch on selected transfer route
            </Text>
          </Space>
          <Space>
            <Button onClick={() => setSelectedRowKeys([])}>Clear</Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleBulkDispatch}
              disabled={!selectedTransferRouteId}
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


