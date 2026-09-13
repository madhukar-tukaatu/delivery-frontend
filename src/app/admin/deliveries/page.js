"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  UserAddOutlined,
  EnvironmentOutlined,
  SwapOutlined,
  PhoneOutlined,
  ShopOutlined,
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InboxOutlined,
  DollarOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { usePermissions } from "@/hooks/usePermission";
import {
  getDeliveries,
  getDeliverySummary,
  getAssignableRiders,
  assignDeliveryRider,
  bulkAssignDeliveries,
  failDelivery,
} from "@/services/deliveryService";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatCard, { StatCardGrid } from "@/components/admin/StatCard";

const { Text, Title } = Typography;
const BRAND = "#0891B2";

/* -------------------------------------------------------------------------- */
/* Status + type config                                                       */
/* -------------------------------------------------------------------------- */

const STATUS_META = {
  pending: { label: "Ready to Assign", color: "gold", hex: "#faad14", icon: <InboxOutlined /> },
  assigned: { label: "Assigned", color: "purple", hex: "#722ed1", icon: <UserAddOutlined /> },
  accepted: { label: "Accepted", color: "geekblue", hex: "#2f54eb", icon: <CheckCircleOutlined /> },
  out_for_delivery: { label: "Out for Delivery", color: "processing", hex: "#1677ff", icon: <CarOutlined /> },
  delivered: { label: "Delivered", color: "success", hex: "#389e0d", icon: <CheckCircleOutlined /> },
  failed: { label: "Failed", color: "error", hex: "#cf1322", icon: <CloseCircleOutlined /> },
};

const STATUS_TABS = [
  { key: "all", label: "All", statuses: [] },
  { key: "pending", label: "Ready to Assign", statuses: ["pending"] },
  { key: "assigned", label: "Assigned", statuses: ["assigned"] },
  { key: "accepted", label: "Accepted", statuses: ["accepted"] },
  { key: "out_for_delivery", label: "Out for Delivery", statuses: ["out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "failed", label: "Failed", statuses: ["failed"] },
];

const TYPE_TABS = [
  { key: "all", label: "All Deliveries", icon: <InboxOutlined /> },
  { key: "last_mile", label: "Last-mile", icon: <EnvironmentOutlined /> },
  { key: "transfer", label: "Transfers", icon: <SwapOutlined /> },
];

function statusMeta(status) {
  return (
    STATUS_META[String(status || "").toLowerCase()] ?? {
      label: String(status || "-"),
      color: "default",
      hex: "#8c8c8c",
      icon: <InboxOutlined />,
    }
  );
}

function StatusPill({ status }) {
  const m = statusMeta(status);
  return (
    <Tag color={m.color} style={{ borderRadius: 999, margin: 0 }}>
      <Space size={4}>
        {m.icon}
        {m.label}
      </Space>
    </Tag>
  );
}

function money(v) {
  const n = Number(v || 0);
  return `NPR ${n.toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isPod(paymentType) {
  return ["pod", "cod", "to_pay"].includes(String(paymentType || "").toLowerCase());
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function DeliveriesPage() {
  const { can, branchId } = usePermissions();

  const [typeTab, setTypeTab] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [counts, setCounts] = useState({});

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [riders, setRiders] = useState([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Multi-select for bulk assignment.
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (page = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const statuses = STATUS_TABS.find((t) => t.key === statusTab)?.statuses ?? [];
        const result = await getDeliveries({
          page,
          per_page: pageSize,
          status: statuses.length ? statuses[0] : undefined,
          delivery_type: typeTab !== "all" ? typeTab : undefined,
          search: debouncedSearch || undefined,
          branch_id: branchId || undefined,
        });
        setRows(result.list);
        setPagination({ current: result.currentPage, pageSize: result.pageSize, total: result.total });
      } catch (e) {
        message.error(e?.response?.data?.message || "Could not load deliveries.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [statusTab, typeTab, debouncedSearch, branchId],
  );

  const loadSummary = useCallback(async () => {
    try {
      const data = await getDeliverySummary({ branch_id: branchId || undefined });
      setCounts({ all: data.total, ...data.byStatus });
    } catch {
      /* silent */
    }
  }, [branchId]);

  useEffect(() => {
    setSelectedRowKeys([]);
    load(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusTab, typeTab, debouncedSearch]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const refresh = useCallback(async () => {
    await Promise.all([load(pagination.current, pagination.pageSize), loadSummary()]);
  }, [load, loadSummary, pagination]);

  const loadRidersFor = useCallback(async (deliveryId) => {
    setRidersLoading(true);
    try {
      const list = await getAssignableRiders(deliveryId);
      setRiders(list);
    } catch {
      setRiders([]);
    } finally {
      setRidersLoading(false);
    }
  }, []);

  const openAssign = useCallback(
    async (delivery) => {
      setBulkMode(false);
      setAssignTarget(delivery);
      setSelectedRider(null);
      setAssignOpen(true);
      await loadRidersFor(delivery.id);
    },
    [loadRidersFor],
  );

  const openBulkAssign = useCallback(async () => {
    if (selectedRowKeys.length === 0) return;
    setBulkMode(true);
    setAssignTarget(null);
    setSelectedRider(null);
    setAssignOpen(true);
    // Load rider pool from the first selected delivery (same branch in practice).
    await loadRidersFor(selectedRowKeys[0]);
  }, [selectedRowKeys, loadRidersFor]);

  const submitAssign = async () => {
    if (!selectedRider) {
      message.warning("Select a rider.");
      return;
    }
    setSubmitting(true);
    try {
      if (bulkMode) {
        const res = await bulkAssignDeliveries(selectedRider, selectedRowKeys);
        const assigned = res?.assigned?.length ?? 0;
        const skipped = res?.skipped ? Object.keys(res.skipped).length : 0;
        message.success(
          skipped === 0
            ? `${assigned} deliveries assigned.`
            : `${assigned} assigned, ${skipped} skipped.`,
        );
        setSelectedRowKeys([]);
      } else {
        await assignDeliveryRider(assignTarget.id, selectedRider);
        message.success("Rider assigned.");
      }
      setAssignOpen(false);
      setAssignTarget(null);
      setBulkMode(false);
      await refresh();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to assign rider.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFail = (delivery) => {
    let reason = "";
    Modal.confirm({
      title: "Mark delivery as failed",
      icon: <CloseCircleOutlined style={{ color: "#cf1322" }} />,
      content: (
        <Input.TextArea
          rows={3}
          placeholder="Reason (customer unreachable, address wrong, refused…)"
          onChange={(e) => {
            reason = e.target.value;
          }}
        />
      ),
      okText: "Mark failed",
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!reason.trim()) {
          message.error("A reason is required.");
          throw new Error("reason required");
        }
        await failDelivery(delivery.id, reason.trim());
        message.success("Delivery marked as failed.");
        await refresh();
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        title: "Shipment",
        key: "shipment",
        render: (_, r) => {
          const s = r.shipment ?? {};
          return (
            <Space direction="vertical" size={2}>
              <Text strong style={{ fontSize: 13 }}>
                {s.tracking_number || `#${r.shipment_id}`}
              </Text>
              <Tag
                color={r.delivery_type === "transfer" ? "orange" : "green"}
                style={{ margin: 0 }}
              >
                {r.delivery_type === "transfer" ? (
                  <><SwapOutlined /> Transfer</>
                ) : (
                  <><EnvironmentOutlined /> Last-mile</>
                )}
              </Tag>
            </Space>
          );
        },
      },
      {
        title: "Route",
        key: "route",
        render: (_, r) => {
          const s = r.shipment ?? {};
          const origin = s.origin_branch?.name || "Origin";
          const dest = s.destination_branch?.name || "Destination";
          return (
            <Space size={6} style={{ fontSize: 12 }}>
              <Tag style={{ margin: 0 }}>{origin}</Tag>
              <ArrowRightOutlined style={{ color: "#bfbfbf" }} />
              <Tag color="blue" style={{ margin: 0 }}>{dest}</Tag>
            </Space>
          );
        },
      },
      {
        title: "Receiver",
        key: "receiver",
        render: (_, r) => {
          const s = r.shipment ?? {};
          return (
            <Space direction="vertical" size={0}>
              <Text style={{ fontSize: 13 }}>{s.receiver_name || "—"}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {s.receiver_phone ? (
                  <Space size={4}><PhoneOutlined />{s.receiver_phone}</Space>
                ) : "—"}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {s.delivery_address || s.receiver_address || s.receiver_city || "—"}
              </Text>
            </Space>
          );
        },
      },
      {
        title: "Payment",
        key: "payment",
        render: (_, r) => {
          const s = r.shipment ?? {};
          const pod = isPod(s.payment_type);
          const amount = Number(s.total_collectable_amount || s.pod_amount || 0);
          return pod ? (
            <Space direction="vertical" size={0}>
              <Tag color="volcano" style={{ margin: 0 }}>
                <DollarOutlined /> POD
              </Tag>
              <Text strong style={{ fontSize: 12 }}>{money(amount)}</Text>
            </Space>
          ) : (
            <Tag color="green" style={{ margin: 0 }}>Prepaid</Tag>
          );
        },
      },
      {
        title: "Rider",
        key: "rider",
        render: (_, r) => {
          const rider = r.rider;
          if (!rider) return <Text type="warning" italic style={{ fontSize: 12 }}>Unassigned</Text>;
          return (
            <Space size={6}>
              <Avatar size="small" style={{ background: "#f6ffed", color: "#52c41a" }}>
                {initials(rider.name)}
              </Avatar>
              <Space direction="vertical" size={0}>
                <Text style={{ fontSize: 12 }}>{rider.name}</Text>
                {rider.phone ? <Text type="secondary" style={{ fontSize: 11 }}>{rider.phone}</Text> : null}
              </Space>
            </Space>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (v) => <StatusPill status={v} />,
      },
      {
        title: "",
        key: "actions",
        render: (_, r) => (
          <Space size={4}>
            {can?.("deliveries.assign") && ["pending", "assigned"].includes(r.status) && (
              <Button
                size="small"
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => openAssign(r)}
              >
                {r.status === "pending" ? "Assign" : "Reassign"}
              </Button>
            )}
            {can?.("deliveries.failed") &&
              ["pending", "assigned", "accepted", "out_for_delivery"].includes(r.status) && (
                <Button size="small" danger onClick={() => handleFail(r)}>
                  Fail
                </Button>
              )}
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [can, openAssign],
  );

  const canAssign = can?.("deliveries.assign");

  const rowSelection = canAssign
    ? {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
        getCheckboxProps: (record) => ({
          // Only pending / assigned deliveries can be (re)assigned in bulk.
          disabled: !["pending", "assigned"].includes(record.status),
        }),
      }
    : undefined;

  return (
    <div style={{ padding: 16, background: "#f7f8fa", minHeight: "100%" }}>
      <AdminPageHeader
        title="Deliveries"
        subtitle="Assign riders and track last-mile deliveries and transfers"
        actions={
          <>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Search tracking, receiver, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              Refresh
            </Button>
          </>
        }
      />

      <StatCardGrid>
        <StatCard
          label="Ready to Assign"
          value={counts.pending ?? 0}
          hint="Awaiting rider"
          variant="warning"
        />
        <StatCard
          label="Assigned"
          value={counts.assigned ?? 0}
          hint="With riders"
          variant="primary"
        />
        <StatCard
          label="Out for Delivery"
          value={counts.out_for_delivery ?? 0}
          hint="On the road"
          variant="accent"
        />
        <StatCard
          label="Delivered"
          value={counts.delivered ?? 0}
          hint="Completed"
          variant="success"
        />
      </StatCardGrid>

      {/* Delivery type toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {TYPE_TABS.map((t) => {
          const active = typeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTypeTab(t.key); setPagination((p) => ({ ...p, current: 1 })); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
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
            </button>
          );
        })}
      </div>

      {/* Status chips */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #eef0f2", padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {STATUS_TABS.map((tab) => {
            const active = statusTab === tab.key;
            const value = tab.key === "all" ? (counts.all ?? 0) : (counts[tab.statuses[0]] ?? 0);
            const hex = tab.key === "all" ? BRAND : statusMeta(tab.statuses[0]).hex;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setStatusTab(tab.key); setPagination((p) => ({ ...p, current: 1 })); }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 999,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: active ? "#fff" : "#4b5563",
                  background: active ? hex : "#f5f6f8",
                  border: `1px solid ${active ? hex : "#eef0f2"}`,
                }}
              >
                {tab.label}
                <span
                  style={{
                    background: active ? "rgba(255,255,255,0.25)" : "#fff",
                    color: active ? "#fff" : "#111827",
                    borderRadius: 999,
                    padding: "0 7px",
                    fontSize: 11,
                  }}
                >
                  {value}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk action bar */}
      {canAssign && selectedRowKeys.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "#e6f4ff",
            border: "1px solid #91caff",
            borderRadius: 12,
            padding: "10px 16px",
            marginBottom: 12,
          }}
        >
          <Space size={8}>
            <Badge count={selectedRowKeys.length} style={{ background: BRAND }} />
            <Text strong>{selectedRowKeys.length} selected</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Assign these to one rider as a delivery route
            </Text>
          </Space>
          <Space>
            <Button onClick={() => setSelectedRowKeys([])}>Clear</Button>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={openBulkAssign}
            >
              Assign selected to rider
            </Button>
          </Space>
        </div>
      )}

      {/* Table */}
      <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 14, width: "100%" }} className="admin-card">
        <Table
          className="compact"
          rowKey="id"
          size="middle"
          loading={loading}
          rowSelection={rowSelection}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1000 }}
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No deliveries" />,
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (t) => `${t} deliver${t === 1 ? "y" : "ies"}`,
            onChange: (p, ps) => load(p, ps),
          }}
        />
      </Card>

      {/* Assign rider modal */}
      <Modal
        title={
          <Space>
            <UserAddOutlined style={{ color: "#0891B2" }} />
            {bulkMode ? "Assign selected deliveries" : "Assign delivery rider"}
          </Space>
        }
        open={assignOpen}
        onCancel={() => { setAssignOpen(false); setAssignTarget(null); setBulkMode(false); }}
        onOk={submitAssign}
        confirmLoading={submitting}
        okText={bulkMode ? `Assign ${selectedRowKeys.length} to rider` : "Assign rider"}
        okButtonProps={{ disabled: !selectedRider }}
      >
        {bulkMode ? (
          <Space direction="vertical" size={12} style={{ width: "100%", marginTop: 8 }}>
            <Card size="small" style={{ background: "#fafbfc" }}>
              <Space size={8}>
                <Badge count={selectedRowKeys.length} style={{ background: BRAND }} />
                <Text strong>{selectedRowKeys.length} deliveries</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  will be handed to one rider
                </Text>
              </Space>
            </Card>
            <div>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>Rider (fewest active deliveries first)</Text>
              <Select
                style={{ width: "100%", marginTop: 4 }}
                loading={ridersLoading}
                placeholder="Select a rider"
                value={selectedRider}
                onChange={setSelectedRider}
                options={riders.map((r) => ({
                  value: r.id,
                  label: `${r.name}${r.phone ? ` · ${r.phone}` : ""} — ${r.active_deliveries_count ?? 0} active`,
                }))}
                notFoundContent={ridersLoading ? "Loading…" : "No riders at this branch"}
              />
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Deliveries not in a ready/assigned state will be skipped automatically.
            </Text>
          </Space>
        ) : assignTarget ? (
          <Space direction="vertical" size={12} style={{ width: "100%", marginTop: 8 }}>
            <Card size="small" style={{ background: "#fafbfc" }}>
              <Space direction="vertical" size={2} style={{ width: "100%" }}>
                <Text strong>{assignTarget.shipment?.tracking_number || `#${assignTarget.shipment_id}`}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <Space size={4}><ShopOutlined />{assignTarget.shipment?.merchant?.name || "Merchant"}</Space>
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <Space size={4}><EnvironmentOutlined />
                    {assignTarget.shipment?.delivery_address || assignTarget.shipment?.receiver_address || "—"}
                  </Space>
                </Text>
                {isPod(assignTarget.shipment?.payment_type) ? (
                  <Tag color="volcano" style={{ margin: 0, width: "fit-content" }}>
                    <DollarOutlined /> Collect {money(assignTarget.shipment?.total_collectable_amount || assignTarget.shipment?.pod_amount)}
                  </Tag>
                ) : (
                  <Tag color="green" style={{ margin: 0, width: "fit-content" }}>Prepaid — nothing to collect</Tag>
                )}
              </Space>
            </Card>

            <div>
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>Rider (fewest active deliveries first)</Text>
              <Select
                style={{ width: "100%", marginTop: 4 }}
                loading={ridersLoading}
                placeholder="Select a rider"
                value={selectedRider}
                onChange={setSelectedRider}
                options={riders.map((r) => ({
                  value: r.id,
                  label: `${r.name}${r.phone ? ` · ${r.phone}` : ""} — ${r.active_deliveries_count ?? 0} active`,
                }))}
                notFoundContent={ridersLoading ? "Loading…" : "No riders at this branch"}
              />
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}
