"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Avatar,
  Badge,
  Button,
  Col,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  ReloadOutlined,
  SearchOutlined,
  UserAddOutlined,
  SwapOutlined,
  CloseCircleOutlined,
  SendOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  ShopOutlined,
  InboxOutlined,
  ClockCircleOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  RightOutlined,
} from "@ant-design/icons";

import {
  getPickups,
  getPickup,
  getPickupAssignableStaff,
  assignPickup,
  transferPickup,
  failPickup,
  resendPickupCallback,
} from "@/services/pickupService";

const { Title, Text } = Typography;

const BRAND = "#027196";

/*
|--------------------------------------------------------------------------
| Status configuration
|--------------------------------------------------------------------------
*/

const STATUS_META = {
  requested: { label: "Requested", color: "blue", hex: "#1677ff", icon: <InboxOutlined />, hint: "Waiting for a rider to be assigned" },
  assigned: { label: "Assigned", color: "purple", hex: "#722ed1", icon: <UserAddOutlined />, hint: "Rider assigned, awaiting acceptance" },
  accepted: { label: "Accepted", color: "geekblue", hex: "#2f54eb", icon: <CheckCircleOutlined />, hint: "Rider accepted the pickup" },
  started: { label: "En Route", color: "cyan", hex: "#13c2c2", icon: <CarOutlined />, hint: "Rider is travelling to the merchant" },
  arrived: { label: "Arrived", color: "gold", hex: "#faad14", icon: <EnvironmentOutlined />, hint: "Rider has reached the pickup location" },
  collected: { label: "Collected", color: "green", hex: "#52c41a", icon: <CheckCircleOutlined />, hint: "All shipments collected from merchant" },
  on_way_to_branch: { label: "On Way to Branch", color: "orange", hex: "#fa8c16", icon: <CarOutlined />, hint: "Rider in transit to origin branch" },
  completed: { label: "Completed", color: "success", hex: "#389e0d", icon: <CheckCircleOutlined />, hint: "Branch verified all shipments" },
  failed: { label: "Failed", color: "error", hex: "#cf1322", icon: <ExclamationCircleOutlined />, hint: "Pickup could not be completed" },
  cancelled: { label: "Cancelled", color: "default", hex: "#8c8c8c", icon: <CloseCircleOutlined />, hint: "Pickup was cancelled" },
};

const TAB_STATUSES = ["requested", "assigned", "collected", "on_way_to_branch", "completed", "failed"];

const RESEND_EVENTS = [
  { value: "pickup.rider_assigned", label: "Rider assigned", scope: "pickup" },
  { value: "pickup.rider_started", label: "Rider started", scope: "pickup" },
  { value: "pickup.rider_arrived", label: "Rider arrived", scope: "pickup" },
  { value: "pickup.completed", label: "Pickup completed", scope: "pickup" },
  { value: "shipment.collected", label: "Shipment collected", scope: "shipment" },
  { value: "shipment.received_at_origin", label: "Shipment received at origin", scope: "shipment" },
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function metaFor(status) {
  return STATUS_META[String(status ?? "").toLowerCase()] ?? {
    label: String(status ?? "Unknown"), color: "default", hex: "#8c8c8c", icon: <InboxOutlined />, hint: "",
  };
}

function StatusTag({ status, withIcon = true }) {
  const meta = metaFor(status);
  return (
    <Tag color={meta.color} style={{ borderRadius: 999, paddingInline: 10, margin: 0 }}>
      <Space size={4}>
        {withIcon ? meta.icon : null}
        {meta.label}
      </Space>
    </Tag>
  );
}

function getPickupId(p) {
  return p?.id ?? p?.pickup_request_id ?? null;
}
function getRequestNumber(p) {
  return p?.request_number ?? `#${getPickupId(p) ?? "-"}`;
}
function getMerchantName(p) {
  return p?.merchant?.name ?? p?.merchant?.business_name ?? "Unknown merchant";
}
function getLocation(p) {
  return p?.pickup_location ?? p?.pickupLocation ?? null;
}
function getLocationName(p) {
  const loc = getLocation(p);
  return loc?.name ?? p?.pickup_name ?? "Pickup location";
}
function getRider(p) {
  return p?.assigned_staff ?? p?.assignedStaff ?? null;
}

function getShipments(p) {
  if (!Array.isArray(p?.shipments)) return [];
  return p.shipments
    .map((item) => {
      if (!item) return null;
      const s = item.shipment ?? item;
      return {
        id: s.id ?? item.id ?? null,
        tracking_number: s.tracking_number ?? item.tracking_number ?? null,
        merchant_order_id: s.merchant_order_id ?? item.merchant_order_id ?? null,
        status: s.status ?? item.status ?? "unknown",
      };
    })
    .filter((s) => s && (s.id || s.tracking_number));
}

function fmtDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-NP", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function initialsOf(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/*
|--------------------------------------------------------------------------
| Small building blocks
|--------------------------------------------------------------------------
*/

function SectionCard({ icon, title, extra, children }) {
  return (
    <div
      style={{
        border: "1px solid #eef0f2",
        borderRadius: 14,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #f4f5f6",
          background: "#fafbfc",
        }}
      >
        <Space size={8} style={{ color: "#4b5563", fontWeight: 600, fontSize: 13 }}>
          <span style={{ color: BRAND }}>{icon}</span>
          {title}
        </Space>
        {extra}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#1f2937" }}>{children}</div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function AdminPickupsPage() {
  const [activeTab, setActiveTab] = useState("requested");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const [counts, setCounts] = useState({});

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [assignForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [cancelForm] = Form.useForm();
  const [resendForm] = Form.useForm();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(
    async (page = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const result = await getPickups({
          page,
          per_page: pageSize,
          search: debouncedSearch || undefined,
          status: activeTab || undefined,
        });
        setRows(result.list ?? []);
        setPagination({
          current: result.currentPage ?? page,
          pageSize: result.pageSize ?? pageSize,
          total: result.total ?? 0,
        });
      } catch (error) {
        message.error(error?.response?.data?.message || "Could not load pickups.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, debouncedSearch]
  );

  useEffect(() => {
    load(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, debouncedSearch]);

  const loadCounts = useCallback(async () => {
    try {
      const entries = await Promise.all(
        TAB_STATUSES.map(async (status) => {
          const res = await getPickups({ page: 1, per_page: 1, status });
          return [status, res.total ?? 0];
        })
      );
      setCounts(Object.fromEntries(entries));
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const openDetail = useCallback(async (pickup) => {
    const id = getPickupId(pickup);
    if (!id) return;
    setDrawerOpen(true);
    setDetail(pickup);
    setDetailLoading(true);
    try {
      const fresh = await getPickup(id);
      if (fresh) setDetail(fresh);
    } catch (error) {
      message.error("Could not load pickup details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!detail) return;
    const id = getPickupId(detail);
    setDetailLoading(true);
    try {
      const fresh = await getPickup(id);
      if (fresh) setDetail(fresh);
    } finally {
      setDetailLoading(false);
    }
  }, [detail]);

  const loadStaff = useCallback(async () => {
    if (!detail) return;
    setStaffLoading(true);
    try {
      const list = await getPickupAssignableStaff(getPickupId(detail));
      setStaff(Array.isArray(list) ? list : []);
    } catch {
      setStaff([]);
    } finally {
      setStaffLoading(false);
    }
  }, [detail]);

  const afterMutation = useCallback(async () => {
    await Promise.all([refreshDetail(), load(pagination.current, pagination.pageSize), loadCounts()]);
  }, [refreshDetail, load, loadCounts, pagination]);

  const submitAssign = async () => {
    const values = await assignForm.validateFields();
    setSubmitting(true);
    try {
      await assignPickup(getPickupId(detail), values.staff_id);
      message.success("Rider assigned.");
      setAssignOpen(false);
      assignForm.resetFields();
      await afterMutation();
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to assign.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitTransfer = async () => {
    const values = await transferForm.validateFields();
    setSubmitting(true);
    try {
      await transferPickup(getPickupId(detail), values.staff_id, values.reason);
      message.success("Pickup transferred.");
      setTransferOpen(false);
      transferForm.resetFields();
      await afterMutation();
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to transfer.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCancel = async () => {
    const values = await cancelForm.validateFields();
    setSubmitting(true);
    try {
      await failPickup(getPickupId(detail), values.reason);
      message.success("Pickup cancelled.");
      setCancelOpen(false);
      cancelForm.resetFields();
      await afterMutation();
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to cancel.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitResend = async () => {
    const values = await resendForm.validateFields();
    setSubmitting(true);
    try {
      await resendPickupCallback(getPickupId(detail), values.event, values.shipment_id || null);
      message.success("Callback re-sent.");
      setResendOpen(false);
      resendForm.resetFields();
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to resend callback.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = (value) => {
    if (!value) return;
    navigator.clipboard?.writeText(String(value));
    message.success("Copied to clipboard.");
  };

  const columns = useMemo(
    () => [
      {
        title: "Request",
        key: "request",
        render: (_, r) => (
          <Space direction="vertical" size={0}>
            <Button type="link" style={{ padding: 0, height: "auto", fontWeight: 600 }} onClick={() => openDetail(r)}>
              {getRequestNumber(r)}
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {getShipments(r).length} shipment{getShipments(r).length === 1 ? "" : "s"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Merchant",
        key: "merchant",
        render: (_, r) => (
          <Space>
            <Avatar size="small" style={{ background: "#e6f4ff", color: "#1677ff" }} icon={<ShopOutlined />} />
            <Space direction="vertical" size={0}>
              <Text strong>{getMerchantName(r)}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{getLocationName(r)}</Text>
            </Space>
          </Space>
        ),
      },
      {
        title: "Rider",
        key: "rider",
        render: (_, r) => {
          const rider = getRider(r);
          if (!rider) return <Text type="secondary">Unassigned</Text>;
          return (
            <Space>
              <Avatar size="small" style={{ background: "#f6ffed", color: "#52c41a" }}>{initialsOf(rider.name)}</Avatar>
              <Space direction="vertical" size={0}>
                <Text>{rider.name}</Text>
                {rider.phone ? <Text type="secondary" style={{ fontSize: 12 }}>{rider.phone}</Text> : null}
              </Space>
            </Space>
          );
        },
      },
      { title: "Status", key: "status", render: (_, r) => <StatusTag status={r.status} /> },
      {
        title: "Created",
        key: "created",
        render: (_, r) => <Text type="secondary" style={{ fontSize: 13 }}>{fmtDate(r.created_at) ?? "-"}</Text>,
      },
      {
        title: "",
        key: "action",
        width: 48,
        render: (_, r) => <Button type="text" icon={<RightOutlined />} onClick={() => openDetail(r)} />,
      },
    ],
    [openDetail]
  );

  const detailShipments = getShipments(detail);
  const detailLocation = getLocation(detail);
  const detailRider = getRider(detail);
  const detailStatus = String(detail?.status ?? "").toLowerCase();

  const canAssign = ["requested", "assigned"].includes(detailStatus);
  const canTransfer = ["requested", "assigned", "accepted", "started", "arrived"].includes(detailStatus);
  const canCancel = ["requested", "assigned", "accepted", "started", "arrived"].includes(detailStatus);

  const lat = detailLocation?.latitude ?? detailLocation?.lat ?? detail?.pickup_lat ?? null;
  const lng = detailLocation?.longitude ?? detailLocation?.lng ?? detail?.pickup_lng ?? null;
  const hasCoords = lat != null && lng != null;

  const timeline = [
    { label: "Requested", value: detail?.created_at, dot: <InboxOutlined /> },
    { label: "Rider assigned", value: detail?.assigned_at, dot: <UserAddOutlined /> },
    { label: "Accepted", value: detail?.accepted_at, dot: <CheckCircleOutlined /> },
    { label: "En route", value: detail?.started_at, dot: <CarOutlined /> },
    { label: "Arrived", value: detail?.arrived_at, dot: <EnvironmentOutlined /> },
    { label: "Collected", value: detail?.collected_at ?? detail?.picked_up_at, dot: <CheckCircleOutlined /> },
    { label: "On way to branch", value: detail?.in_transit_at ?? detail?.on_way_at, dot: <CarOutlined /> },
    { label: "Completed at branch", value: detail?.completed_at, dot: <CheckCircleOutlined /> },
  ].filter((t) => t.value);

  return (
    <div style={{ padding: 24, background: "#f7f8fa", minHeight: "100%" }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }} gutter={[12, 12]}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Pickups</Title>
          <Text type="secondary">Monitor the pickup lifecycle across every branch</Text>
        </Col>
        <Col>
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Search request, merchant, tracking…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => { load(pagination.current, pagination.pageSize); loadCounts(); }}>
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {TAB_STATUSES.map((status) => {
          const meta = metaFor(status);
          const active = activeTab === status;
          return (
            <Col key={status} xs={12} sm={8} lg={4}>
              <div
                role="button"
                onClick={() => setActiveTab(status)}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  cursor: "pointer",
                  background: "#fff",
                  border: `1px solid ${active ? meta.hex : "#eef0f2"}`,
                  boxShadow: active ? `0 8px 20px ${meta.hex}22` : "0 1px 2px rgba(0,0,0,0.03)",
                  transition: "all .2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      display: "inline-flex", width: 30, height: 30, borderRadius: 9,
                      alignItems: "center", justifyContent: "center",
                      background: `${meta.hex}15`, color: meta.hex,
                    }}
                  >
                    {meta.icon}
                  </span>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{meta.label}</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: active ? meta.hex : "#111827", lineHeight: 1 }}>
                  {counts[status] ?? 0}
                </div>
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Tabs + table */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #eef0f2", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #f4f5f6", overflowX: "auto" }}>
          <Segmented
            value={activeTab}
            onChange={(v) => setActiveTab(v)}
            options={TAB_STATUSES.map((status) => {
              const meta = metaFor(status);
              return {
                value: status,
                label: (
                  <Space size={6}>
                    {meta.icon}
                    <span>{meta.label}</span>
                    <Badge
                      count={counts[status] ?? 0}
                      showZero
                      overflowCount={999}
                      style={{ background: activeTab === status ? meta.hex : "#d9d9d9" }}
                    />
                  </Space>
                ),
              };
            })}
          />
        </div>

        <Table
          rowKey={(r) => getPickupId(r)}
          loading={loading}
          columns={columns}
          dataSource={rows}
          onRow={(r) => ({ onClick: () => openDetail(r), style: { cursor: "pointer" } })}
          locale={{
            emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`No ${metaFor(activeTab).label.toLowerCase()} pickups`} />,
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (t) => `${t} pickup${t === 1 ? "" : "s"}`,
            onChange: (page, pageSize) => load(page, pageSize),
          }}
        />
      </div>

      {/* Detail Drawer */}
      <Drawer
        open={drawerOpen}
        width={Math.min(520, typeof window !== "undefined" ? window.innerWidth - 40 : 520)}
        onClose={() => setDrawerOpen(false)}
        maskClosable
        destroyOnClose
        styles={{
          header: { borderBottom: "1px solid #f0f0f0" },
          body: { padding: 20, background: "#f7f8fa" },
        }}
        title={
          detail ? (
            <Space direction="vertical" size={2}>
              <Space size={8}>
                <Text strong style={{ fontSize: 16 }}>{getRequestNumber(detail)}</Text>
                <StatusTag status={detail.status} />
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>{metaFor(detail.status).hint}</Text>
            </Space>
          ) : "Pickup"
        }
        extra={<Button icon={<ReloadOutlined />} loading={detailLoading} onClick={refreshDetail}>Refresh</Button>}
      >
        {detail ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {/* Action bar */}
            <Space wrap>
              {canAssign && (
                <Button type="primary" icon={<UserAddOutlined />}
                  onClick={() => { assignForm.resetFields(); loadStaff(); setAssignOpen(true); }}>
                  Assign rider
                </Button>
              )}
              {canTransfer && (
                <Button icon={<SwapOutlined />}
                  onClick={() => { transferForm.resetFields(); loadStaff(); setTransferOpen(true); }}>
                  Transfer
                </Button>
              )}
              <Button icon={<SendOutlined />}
                onClick={() => { resendForm.resetFields(); setResendOpen(true); }}>
                Resend callback
              </Button>
              {canCancel && (
                <Button danger icon={<CloseCircleOutlined />}
                  onClick={() => { cancelForm.resetFields(); setCancelOpen(true); }}>
                  Cancel
                </Button>
              )}
            </Space>

            {/* Merchant + location */}
            <SectionCard icon={<ShopOutlined />} title="Merchant & Location">
              <Field label="Merchant"><Text strong>{getMerchantName(detail)}</Text></Field>
              <Field label="Location">{getLocationName(detail)}</Field>
              {detailLocation?.address ? <Field label="Address">{detailLocation.address}</Field> : null}
              {(detailLocation?.phone ?? detail?.pickup_phone) ? (
                <Field label="Phone">
                  <Space size={6}><PhoneOutlined style={{ color: BRAND }} />{detailLocation?.phone ?? detail?.pickup_phone}</Space>
                </Field>
              ) : null}

              {hasCoords ? (
                <>
                  <Divider style={{ margin: "8px 0 12px" }} />
                  <Space size={6} style={{ marginBottom: 8 }}>
                    <EnvironmentOutlined style={{ color: BRAND }} />
                    <Text copyable={{ text: `${lat}, ${lng}` }} style={{ fontSize: 13 }}>
                      {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
                    </Text>
                  </Space>
                  <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #eef0f2" }}>
                    <iframe
                      title="Pickup location"
                      width="100%"
                      height="160"
                      style={{ border: 0, display: "block" }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
                    />
                  </div>
                  <Button
                    block
                    style={{ marginTop: 8 }}
                    icon={<EnvironmentOutlined />}
                    href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                    target="_blank"
                  >
                    Open in Google Maps
                  </Button>
                </>
              ) : null}
            </SectionCard>

            {/* Rider */}
            <SectionCard icon={<CarOutlined />} title="Assigned Rider">
              {detailRider ? (
                <Space>
                  <Avatar style={{ background: "#f6ffed", color: "#52c41a" }}>{initialsOf(detailRider.name)}</Avatar>
                  <Space direction="vertical" size={0}>
                    <Text strong>{detailRider.name}</Text>
                    {detailRider.phone ? <Text type="secondary"><PhoneOutlined /> {detailRider.phone}</Text> : null}
                  </Space>
                </Space>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No rider assigned yet" style={{ margin: "8px 0" }} />
              )}
            </SectionCard>

            {/* Timeline */}
            {timeline.length ? (
              <SectionCard icon={<ClockCircleOutlined />} title="Timeline">
                <Timeline
                  style={{ marginTop: 4 }}
                  items={timeline.map((t) => ({
                    dot: <span style={{ color: BRAND }}>{t.dot}</span>,
                    children: (
                      <Space direction="vertical" size={0}>
                        <Text strong style={{ fontSize: 13 }}>{t.label}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{fmtDate(t.value)}</Text>
                      </Space>
                    ),
                  }))}
                />
              </SectionCard>
            ) : null}

            {/* Shipments */}
            <SectionCard
              icon={<InboxOutlined />}
              title="Shipments"
              extra={<Badge count={detailShipments.length} showZero style={{ background: BRAND }} />}
            >
              {detailShipments.length ? (
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  {detailShipments.map((s) => (
                    <div
                      key={s.id ?? s.tracking_number}
                      style={{
                        border: "1px solid #eef0f2", borderRadius: 10, padding: "10px 12px",
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                      }}
                    >
                      <Space direction="vertical" size={2}>
                        <Space size={6}>
                          <Text strong style={{ fontSize: 13 }}>{s.tracking_number ?? "—"}</Text>
                          {s.tracking_number ? (
                            <Tooltip title="Copy tracking">
                              <CopyOutlined style={{ color: "#bfbfbf", cursor: "pointer" }} onClick={() => copyText(s.tracking_number)} />
                            </Tooltip>
                          ) : null}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>Order: {s.merchant_order_id ?? "N/A"}</Text>
                      </Space>
                      <StatusTag status={s.status} withIcon={false} />
                    </div>
                  ))}
                </Space>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No shipments" style={{ margin: "8px 0" }} />
              )}
            </SectionCard>
          </Space>
        ) : (
          <Empty description="Select a pickup" />
        )}
      </Drawer>

      {/* Assign modal */}
      <Modal title="Assign rider" open={assignOpen} onCancel={() => setAssignOpen(false)} onOk={submitAssign} confirmLoading={submitting} okText="Assign">
        <Form form={assignForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="staff_id" label="Rider" rules={[{ required: true, message: "Select a rider" }]}>
            <Select
              loading={staffLoading}
              placeholder="Select a rider"
              options={staff.map((s) => ({ value: s.id, label: `${s.name}${s.phone ? ` · ${s.phone}` : ""}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Transfer modal */}
      <Modal title="Transfer to another rider" open={transferOpen} onCancel={() => setTransferOpen(false)} onOk={submitTransfer} confirmLoading={submitting} okText="Transfer">
        <Form form={transferForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="staff_id" label="New rider" rules={[{ required: true, message: "Select a rider" }]}>
            <Select
              loading={staffLoading}
              placeholder="Select a rider"
              options={staff.filter((s) => Number(s.id) !== Number(detailRider?.id)).map((s) => ({ value: s.id, label: `${s.name}${s.phone ? ` · ${s.phone}` : ""}` }))}
            />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Enter a reason" }]}>
            <Input.TextArea rows={3} placeholder="Why is this pickup being transferred?" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Cancel modal */}
      <Modal title="Cancel pickup" open={cancelOpen} onCancel={() => setCancelOpen(false)} onOk={submitCancel} confirmLoading={submitting} okText="Cancel pickup" okButtonProps={{ danger: true }} cancelText="Keep">
        <Form form={cancelForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: "Enter a reason" }]}>
            <Input.TextArea rows={4} placeholder="Shipment missing, cutoff passed, service not fulfillable…" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Resend modal */}
      <Modal title="Resend callback" open={resendOpen} onCancel={() => setResendOpen(false)} onOk={submitResend} confirmLoading={submitting} okText="Resend">
        <Form form={resendForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="event" label="Event" rules={[{ required: true, message: "Select an event" }]}>
            <Select
              placeholder="Select an event"
              onChange={() => resendForm.setFieldValue("shipment_id", undefined)}
              options={RESEND_EVENTS.map((e) => ({ value: e.value, label: e.label }))}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.event !== cur.event}>
            {({ getFieldValue }) => {
              const ev = RESEND_EVENTS.find((e) => e.value === getFieldValue("event"));
              if (ev?.scope !== "shipment") return null;
              return (
                <Form.Item name="shipment_id" label="Shipment" rules={[{ required: true, message: "Select a shipment" }]}>
                  <Select
                    placeholder="Select a shipment"
                    options={detailShipments.map((s) => ({ value: s.id, label: s.tracking_number ?? `#${s.id}` }))}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
