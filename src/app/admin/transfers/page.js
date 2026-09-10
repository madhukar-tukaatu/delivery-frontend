"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
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
  DownloadOutlined,
} from "@ant-design/icons";
import { usePermissions } from "@/hooks/usePermission";
import {
  getTransfers,
  getTransferSummary,
  dispatchTransfers,
  receiveTransfer,
} from "@/services/transferService";

const { Text, Title } = Typography;
const BRAND = "#027196";

function money(v) {
  const n = Number(v || 0);
  return `NPR ${n.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function isPod(t) {
  return ["pod", "cod", "to_pay"].includes(String(t || "").toLowerCase());
}

export default function TransfersPage() {
  const { can } = usePermissions();

  const [direction, setDirection] = useState("outbound");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [counts, setCounts] = useState({ outbound: 0, inbound: 0 });

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (page = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const res = await getTransfers({
          page,
          per_page: pageSize,
          direction,
          search: debouncedSearch || undefined,
        });
        setRows(res.list);
        setPagination({ current: res.currentPage, pageSize: res.pageSize, total: res.total });
      } catch (e) {
        message.error(e?.response?.data?.message || "Could not load transfers.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [direction, debouncedSearch],
  );

  const loadSummary = useCallback(async () => {
    try {
      setCounts(await getTransferSummary());
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    setSelectedRowKeys([]);
    load(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, debouncedSearch]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const refresh = useCallback(async () => {
    await Promise.all([load(pagination.current, pagination.pageSize), loadSummary()]);
  }, [load, loadSummary, pagination]);

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

  const columns = useMemo(() => {
    const base = [
      {
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
      },
      {
        title: "Route",
        key: "route",
        render: (_, s) => (
          <Space size={6} style={{ fontSize: 12 }}>
            <Tag style={{ margin: 0 }}>{s.origin_branch?.name || "Origin"}</Tag>
            <ArrowRightOutlined style={{ color: "#bfbfbf" }} />
            <Tag color="blue" style={{ margin: 0 }}>{s.destination_branch?.name || "Destination"}</Tag>
          </Space>
        ),
      },
      {
        title: "Receiver",
        key: "receiver",
        render: (_, s) => (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 13 }}>{s.receiver_name || "—"}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {s.receiver_phone ? <Space size={4}><PhoneOutlined />{s.receiver_phone}</Space> : "—"}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {s.delivery_address || s.receiver_address || s.receiver_city || "—"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Payment",
        key: "payment",
        render: (_, s) =>
          isPod(s.payment_type) ? (
            <Space direction="vertical" size={0}>
              <Tag color="volcano" style={{ margin: 0 }}><DollarOutlined /> POD</Tag>
              <Text strong style={{ fontSize: 12 }}>{money(s.total_collectable_amount || s.pod_amount)}</Text>
            </Space>
          ) : (
            <Tag color="green" style={{ margin: 0 }}>Prepaid</Tag>
          ),
      },
    ];

    if (direction === "inbound") {
      base.push({
        title: "",
        key: "actions",
        render: (_, s) =>
          can?.("dispatches.receive") ? (
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              loading={receivingId === s.id}
              onClick={() => handleReceive(s.id)}
            >
              Receive
            </Button>
          ) : null,
      });
    }

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, can, receivingId]);

  const rowSelection =
    direction === "outbound" && can?.("dispatches.dispatch")
      ? { selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }
      : undefined;

  const TYPE_TABS = [
    { key: "outbound", label: "Outbound (to send)", icon: <SendOutlined />, count: counts.outbound },
    { key: "inbound", label: "Inbound (to receive)", icon: <InboxOutlined />, count: counts.inbound },
  ];

  return (
    <div style={{ padding: 24, background: "#f7f8fa", minHeight: "100%" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }} gutter={[12, 12]}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Transfers</Title>
          <Text type="secondary">Branch-to-branch parcel transfers</Text>
        </Col>
        <Col>
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Search tracking, receiver, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260 }}
            />
            <Button icon={<ReloadOutlined />} onClick={refresh}>Refresh</Button>
          </Space>
        </Col>
      </Row>

      {/* Direction tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {TYPE_TABS.map((t) => {
          const active = direction === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => { setDirection(t.key); setPagination((p) => ({ ...p, current: 1 })); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: active ? "#fff" : "#4b5563",
                background: active ? BRAND : "#fff",
                border: `1px solid ${active ? BRAND : "#eef0f2"}`,
              }}
            >
              {t.icon}
              {t.label}
              <span
                style={{
                  background: active ? "rgba(255,255,255,0.25)" : "#f0f2f5",
                  color: active ? "#fff" : "#111827",
                  borderRadius: 999,
                  padding: "0 8px",
                  fontSize: 12,
                }}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bulk dispatch bar */}
      {direction === "outbound" && can?.("dispatches.dispatch") && selectedRowKeys.length > 0 && (
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

      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 14 }}>
        <Table
          rowKey="id"
          size="middle"
          loading={loading}
          rowSelection={rowSelection}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={direction === "outbound" ? "Nothing to dispatch" : "Nothing arriving"}
              />
            ),
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (t) => `${t} shipment${t === 1 ? "" : "s"}`,
            onChange: (p, ps) => load(p, ps),
          }}
        />
      </Card>
    </div>
  );
}
