"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  InboxOutlined,
  OrderedListOutlined,
  PhoneOutlined,
  PrinterOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import {
  addPickupRunItems,
  assignPickupRunRider,
  cancelPickupRun,
  closePickupRun,
  dispatchPickupRun,
  getPickupRun,
  getPickupRunRiders,
  getReadyForPickup,
  receiveAllPickupRunShipments,
  receivePickupRunShipment,
  removePickupRunItems,
  runErrorText,
  sequencePickupRun,
} from "@/services/admin/pickupRunService";
import { rejectPickupShipment } from "@/services/admin/pickupService";
import { VEHICLE_OPTIONS, fmtDate, vehicleText } from "@/components/admin/delivery-runs/runMeta";
import RunRouteMap from "@/components/maps/RunRouteMap";

const { Text } = Typography;

const RUN_STATUS_META = {
  open: { label: "Open", color: "default" },
  assigned: { label: "Assigned", color: "purple" },
  in_progress: { label: "In Progress", color: "blue" },
  completed: { label: "Completed", color: "green" },
  closed: { label: "Closed", color: "gray" },
  cancelled: { label: "Cancelled", color: "red" },
};

const ITEM_STATUS_META = {
  queued: { label: "Queued", color: "default" },
  in_progress: { label: "En Route", color: "blue" },
  arrived: { label: "Arrived", color: "cyan" },
  picked_up: { label: "Picked Up", color: "green" },
  failed: { label: "Failed", color: "red" },
  removed: { label: "Removed", color: "gray" },
};

export default function PickupRunDetail({ runId, branchId = null, onBack = null, onRunUpdated = null, onOpenPickup = null }) {
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [riders, setRiders] = useState([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [riderModal, setRiderModal] = useState(false);
  const [riderForm, setRiderForm] = useState({ rider_user_id: null, vehicle_type: null, vehicle_number: "" });
  const [addModal, setAddModal] = useState(false);
  const [readyRows, setReadyRows] = useState([]);
  const [readyLoading, setReadyLoading] = useState(false);
  const [addKeys, setAddKeys] = useState([]);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [closeModal, setCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState("");
  const [mapModal, setMapModal] = useState(false);
  const [detailTab, setDetailTab] = useState("split");

  // Shipment receiving / discrepancy states
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null); // { pickupRequestId, shipmentId }
  const [rejectReason, setRejectReason] = useState("");
  const [rejectType, setRejectType] = useState("other");
  const [shipmentSearch, setShipmentSearch] = useState("");

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const data = await getPickupRun(runId, branchId);
      setRun(data);
    } catch (e) {
      message.error(runErrorText(e, "Could not load pickup run."));
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [runId, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (name, fn) => {
    setBusy(name);
    try {
      const res = await fn();
      message.success(res?.message || "Saved.");
      await load();
      onRunUpdated?.();
      return true;
    } catch (e) {
      message.error(runErrorText(e));
      return false;
    } finally {
      setBusy("");
    }
  };

  const openRiderModal = async () => {
    setRiderForm({
      rider_user_id: run?.rider?.id ?? null,
      vehicle_type: run?.vehicle_type ?? null,
      vehicle_number: run?.vehicle_number ?? "",
    });
    setRiderModal(true);
    setRidersLoading(true);
    try {
      const list = await getPickupRunRiders({ run_id: run?.id }, branchId);
      setRiders(list);
    } catch {
      setRiders([]);
    } finally {
      setRidersLoading(false);
    }
  };

  const openAddModal = async () => {
    setAddKeys([]);
    setAddModal(true);
    setReadyLoading(true);
    try {
      const list = await getReadyForPickup({}, branchId);
      setReadyRows(list);
    } catch {
      setReadyRows([]);
    } finally {
      setReadyLoading(false);
    }
  };

  const items = useMemo(() => {
    return (run?.items || []).filter((i) => i.status !== "removed");
  }, [run?.items]);

  const allShipments = useMemo(() => {
    const list = [];
    (run?.items || []).forEach((item) => {
      if (item.status === "removed") return;
      (item.shipments || []).forEach((s) => {
        list.push({
          ...s,
          pickup_request_id: item.pickup_request_id,
          pickup_request_number: item.request_number,
          merchant_name: item.merchant?.business_name || item.merchant?.name || item.pickup_name,
          pickup_area: item.pickup_area || item.area,
          stop_status: item.status,
        });
      });
    });
    return list;
  }, [run?.items]);

  const receivedShipments = useMemo(() => {
    return allShipments.filter(
      (s) => s.status === "received_at_origin" || s.pivot_status === "received"
    ).length;
  }, [allShipments]);

  const pendingReceiveCount = Math.max(0, allShipments.length - receivedShipments);

  const handleReceiveSingle = async (pickupRequestId, shipmentId) => {
    await act(`receive_${shipmentId}`, () =>
      receivePickupRunShipment(run.id, pickupRequestId, shipmentId, {}, branchId)
    );
  };

  const handleReceiveAll = async () => {
    await act("receive_all", () =>
      receiveAllPickupRunShipments(run.id, branchId)
    );
  };

  const openRejectModal = (pickupRequestId, shipmentId) => {
    setRejectTarget({ pickupRequestId, shipmentId });
    setRejectReason("");
    setRejectType("other");
    setRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      message.warning("Please provide a rejection reason.");
      return;
    }
    const ok = await act("reject", () =>
      rejectPickupShipment(rejectTarget.pickupRequestId, rejectTarget.shipmentId, {
        reason: rejectReason.trim(),
        type: rejectType,
      })
    );
    if (ok) {
      setRejectModal(false);
      setRejectTarget(null);
    }
  };

  const moveItem = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    await act("seq", () => sequencePickupRun(run.id, reordered.map((i) => i.id), branchId));
  };

  if (loading && !run) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!run) {
    return (
      <Card>
        <Empty description="Pickup run not found.">
          {onBack && <Button onClick={onBack}>Back to runs</Button>}
        </Empty>
      </Card>
    );
  }

  const editable = run.editable;
  const closable = ["in_progress", "completed"].includes(run.status);

  const columns = [
    {
      title: "#",
      key: "seq",
      width: 50,
      render: (_, __, idx) => <Text strong>{idx + 1}</Text>,
    },
    {
      title: "Reorder",
      key: "reorder",
      width: 70,
      render: (_, __, idx) =>
        editable ? (
          <Space size={2}>
            <Button
              size="small"
              type="text"
              icon={<ArrowUpOutlined />}
              disabled={idx === 0 || busy === "seq"}
              onClick={() => moveItem(idx, -1)}
            />
            <Button
              size="small"
              type="text"
              icon={<ArrowDownOutlined />}
              disabled={idx === items.length - 1 || busy === "seq"}
              onClick={() => moveItem(idx, 1)}
            />
          </Space>
        ) : null,
    },
    {
      title: "Request Number",
      dataIndex: "request_number",
      key: "request_number",
      render: (v) => <Text strong style={{ fontFamily: "monospace" }}>{v}</Text>,
    },
    {
      title: "Merchant",
      key: "merchant",
      render: (_, r) => (
        <div>
          <Text strong>{r.merchant?.business_name || r.merchant?.name || r.pickup_name}</Text>
          {r.pickup_phone && (
            <div style={{ fontSize: 12 }}>
              <a href={`tel:${r.pickup_phone}`}>{r.pickup_phone}</a>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Area & Address",
      key: "address",
      render: (_, r) => (
        <div>
          <Tag color="blue">{r.pickup_area || r.area || "Kathmandu"}</Tag>
          <div style={{ fontSize: 12, color: "#666" }}>{r.pickup_address}</div>
        </div>
      ),
    },
    {
      title: "Parcels / Tracking",
      key: "parcels",
      render: (_, r) => (
        <Space size={3} wrap>
          {(r.shipments || []).length > 0 ? (
            r.shipments.map((s) => (
              <Tag key={s.id || s.tracking_number} color="blue" style={{ fontFamily: "monospace", fontSize: 11, margin: 0 }}>
                {s.tracking_number}
              </Tag>
            ))
          ) : (
            <Tag color="cyan">{r.parcel_quantity || 1} pkg</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, r) => {
        const meta = ITEM_STATUS_META[r.status] || { label: r.status, color: "default" };
        return (
          <Space size={4}>
            <Tag color={meta.color}>{meta.label}</Tag>
            {r.arrived_at && <Tag color="geekblue">Arrived</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, r) => (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<FileTextOutlined />}
          onClick={() => onOpenPickup?.(r.pickup_request_id || r.id)}
          style={{ borderColor: "#0891b2", color: "#0891b2" }}
        >
          Open PR
        </Button>
      ),
    },
  ];

  return (
    <Spin spinning={Boolean(busy)}>
      <Card
        title={
          <Space wrap size={8}>
            {onBack && <Button size="small" onClick={onBack}>← Back</Button>}
            <Text strong style={{ fontSize: 18 }}>{run.run_number}</Text>
            <Tag color={RUN_STATUS_META[run.status]?.color || "default"}>
              {RUN_STATUS_META[run.status]?.label || run.status}
            </Tag>
            {run.branch?.name && <Text type="secondary">{run.branch.name}</Text>}
          </Space>
        }
        extra={
          <Space wrap>
            <Button
              type="primary"
              ghost
              icon={<EnvironmentOutlined />}
              onClick={() => setMapModal(true)}
            >
              Route Map
            </Button>
            <Button
              icon={<PrinterOutlined />}
              href={`/admin/pickups/runs/${run.id}/print?type=sheet${branchId ? `&branch_id=${branchId}` : ""}`}
              target="_blank"
            >
              Run sheet
            </Button>
            <Button
              icon={<PrinterOutlined />}
              href={`/admin/pickups/runs/${run.id}/print?type=label${branchId ? `&branch_id=${branchId}` : ""}`}
              target="_blank"
            >
              Crate label
            </Button>
          </Space>
        }
      >
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={12} sm={6} md={4}>
            <Statistic title="Total Stops" value={run.expected_count} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Statistic title="Picked Up Stops" value={run.picked_up_count} valueStyle={{ color: "#389e0d" }} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Statistic title="Failed Stops" value={run.failed_count} valueStyle={{ color: run.failed_count ? "#cf1322" : undefined }} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Statistic title="Total Parcels" value={allShipments.length} prefix={<InboxOutlined />} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Statistic title="Received at Hub" value={receivedShipments} valueStyle={{ color: "#10b981", fontWeight: 700 }} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Statistic title="Pending Check-in" value={pendingReceiveCount} valueStyle={{ color: pendingReceiveCount ? "#faad14" : undefined }} />
          </Col>
        </Row>

        <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Rider">
            {run.rider ? (
              <span>
                {run.rider.name}
                {run.rider.phone && ` · ${run.rider.phone}`}
              </span>
            ) : (
              <Text type="warning">Not assigned</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Vehicle">
            {vehicleText(run.vehicle_type, run.vehicle_number) || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Created">{fmtDate(run.created_at)}</Descriptions.Item>
          <Descriptions.Item label="Dispatched">{fmtDate(run.dispatched_at)}</Descriptions.Item>
          {run.closed_at && <Descriptions.Item label="Closed">{fmtDate(run.closed_at)}</Descriptions.Item>}
          {run.notes && <Descriptions.Item label="Notes" span={2}>{run.notes}</Descriptions.Item>}
        </Descriptions>

        {/* Action Bar */}
        <Space wrap style={{ marginBottom: 16 }}>
          {pendingReceiveCount > 0 && (
            <Popconfirm
              title={`Receive all ${pendingReceiveCount} collected shipment(s) at branch hub?`}
              description="Marks all collected parcels on this run as verified and received at origin branch."
              onConfirm={handleReceiveAll}
            >
              <Button
                type="primary"
                icon={<InboxOutlined />}
                loading={busy === "receive_all"}
                style={{ background: "#10B981", borderColor: "#10B981" }}
              >
                Receive All Shipments ({pendingReceiveCount})
              </Button>
            </Popconfirm>
          )}

          {editable && (
            <>
              <Button icon={<UserSwitchOutlined />} onClick={openRiderModal}>
                {run.rider ? "Change rider" : "Assign rider"}
              </Button>
              <Button icon={<PlusOutlined />} onClick={openAddModal}>
                Add pickups
              </Button>
              <Popconfirm
                title={`Remove ${selectedKeys.length} stop(s)?`}
                disabled={!selectedKeys.length}
                onConfirm={async () => {
                  const ids = items.filter((i) => selectedKeys.includes(i.id)).map((i) => i.pickup_request_id);
                  const ok = await act("remove", () => removePickupRunItems(run.id, ids, null, branchId));
                  if (ok) setSelectedKeys([]);
                }}
              >
                <Button danger icon={<DeleteOutlined />} disabled={!selectedKeys.length}>
                  Remove {selectedKeys.length ? `(${selectedKeys.length})` : ""}
                </Button>
              </Popconfirm>
              <Button
                icon={<OrderedListOutlined />}
                loading={busy === "seq"}
                onClick={() => act("seq", () => sequencePickupRun(run.id, null, branchId))}
              >
                Auto order by area
              </Button>
              <Popconfirm
                title={`Dispatch ${run.run_number} to ${run.rider?.name || "rider"}?`}
                disabled={!run.rider || !items.length}
                onConfirm={() => act("dispatch", () => dispatchPickupRun(run.id, {}, branchId))}
              >
                <Tooltip title={!run.rider ? "Assign a rider first" : !items.length ? "Add pickups first" : ""}>
                  <Button type="primary" icon={<SendOutlined />} disabled={!run.rider || !items.length}>
                    Dispatch run
                  </Button>
                </Tooltip>
              </Popconfirm>
              <Button danger icon={<StopOutlined />} onClick={() => setCancelModal(true)}>
                Cancel run
              </Button>
            </>
          )}

          {closable && (
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setCloseModal(true)}>
              Close run
            </Button>
          )}
        </Space>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 4 }}>
          <Segmented
            value={detailTab}
            onChange={setDetailTab}
            options={[
              { label: `Split Map View (${items.length} PRs)`, value: "split" },
              { label: `Stops Table (${items.length})`, value: "table" },
              { label: `Run Shipments (${allShipments.length})`, value: "shipments" },
            ]}
          />
          {detailTab === "split" && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              🏢 Branch Start ➔ {items.length} pickup stop{items.length === 1 ? "" : "s"} on route
            </Text>
          )}
          {detailTab === "shipments" && (
            <Input
              placeholder="Search parcel tracking #, order #, receiver..."
              prefix={<SearchOutlined />}
              allowClear
              value={shipmentSearch}
              onChange={(e) => setShipmentSearch(e.target.value)}
              style={{ width: 260 }}
            />
          )}
        </div>

        {detailTab === "split" ? (
          <Row gutter={[16, 16]}>
            {/* Left Column: Sequenced PR Stops List */}
            <Col xs={24} lg={11}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Text strong style={{ fontSize: 14 }}>
                  Stops in Route Order ({items.length})
                </Text>
                {editable && (
                  <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={openAddModal}>
                    Add Pickups
                  </Button>
                )}
              </div>

              <div style={{ maxHeight: "640px", overflowY: "auto", paddingRight: 4 }}>
                {items.length === 0 ? (
                  <Card size="small" style={{ borderRadius: 8, textAlign: "center", padding: 24 }}>
                    <Empty description="No pickup requests added to this run yet.">
                      {editable && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
                          Add Pickups
                        </Button>
                      )}
                    </Empty>
                  </Card>
                ) : (
                  items.map((r, idx) => {
                    const meta = ITEM_STATUS_META[r.status] || { label: r.status, color: "default" };
                    const shipments = r.shipments || [];
                    const isPickedUp = r.status === "picked_up";
                    return (
                      <Card
                        key={r.id}
                        size="small"
                        style={{
                          marginBottom: 8,
                          borderRadius: 8,
                          border: isPickedUp ? "1px solid #b7eb8f" : "1px solid #e2e8f0",
                          borderLeft: isPickedUp ? "4px solid #52c41a" : "4px solid #0891b2",
                          background: isPickedUp ? "#f6ffed" : "#fff",
                        }}
                        styles={{ body: { padding: "10px 12px" } }}
                      >
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          {/* Sequence Badge */}
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: isPickedUp ? "#52c41a" : "#0891b2",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {idx + 1}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* PR Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>
                                {r.request_number}
                              </Text>
                              <Space size={4}>
                                <Tag color={meta.color} style={{ margin: 0, fontSize: 11 }}>{meta.label}</Tag>
                                {r.arrived_at && <Tag color="geekblue" style={{ margin: 0, fontSize: 10 }}>Arrived</Tag>}
                              </Space>
                            </div>

                            {/* Merchant info */}
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", marginTop: 2 }}>
                              {r.merchant?.business_name || r.merchant?.name || r.pickup_name}
                              {r.pickup_phone && (
                                <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 6 }}>
                                  · <a href={`tel:${r.pickup_phone}`}>{r.pickup_phone}</a>
                                </span>
                              )}
                            </div>

                            {/* Area and Address */}
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                              📍 {r.pickup_area || r.area || "Kathmandu"} · {r.pickup_address}
                            </div>

                            {/* Attached shipments (TEX tracking tags) */}
                            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center" }}>
                              {shipments.length > 0 ? (
                                shipments.map((s) => (
                                  <Tag key={s.id || s.tracking_number} color="blue" style={{ margin: 0, fontSize: 10, fontFamily: "monospace" }}>
                                    {s.tracking_number}
                                  </Tag>
                                ))
                              ) : (
                                <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>
                                  📦 {r.parcel_quantity || 1} pkg
                                </Tag>
                              )}
                            </div>

                            {/* Action Row */}
                            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Button
                                size="small"
                                type="primary"
                                ghost
                                icon={<FileTextOutlined />}
                                onClick={() => onOpenPickup?.(r.pickup_request_id || r.id)}
                                style={{ borderColor: "#0891b2", color: "#0891b2" }}
                              >
                                Open PR
                              </Button>

                              {editable && (
                                <Space size={2}>
                                  <Button
                                    size="small"
                                    type="text"
                                    icon={<ArrowUpOutlined />}
                                    disabled={idx === 0 || busy === "seq"}
                                    onClick={() => moveItem(idx, -1)}
                                  />
                                  <Button
                                    size="small"
                                    type="text"
                                    icon={<ArrowDownOutlined />}
                                    disabled={idx === items.length - 1 || busy === "seq"}
                                    onClick={() => moveItem(idx, 1)}
                                  />
                                  <Popconfirm
                                    title={`Remove ${r.request_number} from this run?`}
                                    onConfirm={async () => {
                                      await act("remove", () => removePickupRunItems(run.id, [r.pickup_request_id || r.id], null, branchId));
                                    }}
                                  >
                                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                                  </Popconfirm>
                                </Space>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </Col>

            {/* Right Column: Route Map showing loop from branch */}
            <Col xs={24} lg={13}>
              <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", position: "sticky", top: 16 }}>
                <RunRouteMap run={run} mode="pickup" onOpenPickup={onOpenPickup} height="640px" />
              </div>
            </Col>
          </Row>
        ) : detailTab === "shipments" ? (
          <Table
            size="small"
            rowKey="id"
            dataSource={allShipments.filter((s) => {
              if (!shipmentSearch.trim()) return true;
              const q = shipmentSearch.toLowerCase().trim();
              return (
                (s.tracking_number || "").toLowerCase().includes(q) ||
                (s.merchant_order_id || "").toLowerCase().includes(q) ||
                (s.receiver_name || "").toLowerCase().includes(q) ||
                (s.receiver_phone || "").toLowerCase().includes(q) ||
                (s.pickup_request_number || "").toLowerCase().includes(q) ||
                (s.merchant_name || "").toLowerCase().includes(q)
              );
            })}
            columns={[
              {
                title: "Tracking #",
                dataIndex: "tracking_number",
                key: "tracking_number",
                render: (v) => (
                  <Space size={4}>
                    <Text strong style={{ fontFamily: "monospace" }}>{v || "-"}</Text>
                    {v && (
                      <Tooltip title="Copy tracking">
                        <CopyOutlined
                          style={{ color: "#999", cursor: "pointer", fontSize: 11 }}
                          onClick={() => {
                            navigator.clipboard?.writeText(v);
                            message.success("Copied tracking #");
                          }}
                        />
                      </Tooltip>
                    )}
                  </Space>
                ),
              },
              {
                title: "Order #",
                dataIndex: "merchant_order_id",
                key: "merchant_order_id",
                render: (v) => v || "-",
              },
              {
                title: "Pickup Request",
                key: "pr",
                render: (_, s) => (
                  <div>
                    <Text strong style={{ fontSize: 12 }}>{s.pickup_request_number}</Text>
                    <div style={{ fontSize: 11, color: "#666" }}>{s.merchant_name}</div>
                  </div>
                ),
              },
              {
                title: "Receiver & Destination",
                key: "receiver",
                render: (_, s) => (
                  <div>
                    <div>{s.receiver_name || "-"}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>{s.receiver_city || s.pickup_area || "-"}</div>
                  </div>
                ),
              },
              {
                title: "Parcel Status",
                dataIndex: "status",
                key: "status",
                render: (v) => {
                  const isRec = v === "received_at_origin" || v === "received";
                  return <Tag color={isRec ? "success" : v === "picked_up" ? "cyan" : "default"}>{v || "-"}</Tag>;
                },
              },
              {
                title: "Action",
                key: "action",
                align: "right",
                render: (_, s) => {
                  const isRec = s.status === "received_at_origin" || s.pivot_status === "received";
                  if (isRec) {
                    return <Tag color="success"><CheckCircleOutlined /> Received</Tag>;
                  }
                  return (
                    <Space size={6}>
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        style={{ background: "#10B981", borderColor: "#10B981" }}
                        loading={busy === `receive_${s.id}`}
                        onClick={() => handleReceiveSingle(s.pickup_request_id, s.id)}
                      >
                        Receive
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() => openRejectModal(s.pickup_request_id, s.id)}
                      >
                        Reject
                      </Button>
                    </Space>
                  );
                },
              },
            ]}
            locale={{ emptyText: "No shipments found in this run." }}
          />
        ) : (
          <Table
            size="small"
            rowKey="id"
            columns={columns}
            dataSource={items}
            pagination={false}
            rowSelection={
              editable
                ? {
                    selectedRowKeys: selectedKeys,
                    onChange: setSelectedKeys,
                  }
                : undefined
            }
            expandable={{
              expandedRowRender: (record) => {
                const shipments = record.shipments || [];
                if (!shipments.length) {
                  return (
                    <div style={{ padding: "8px 16px", color: "#888", fontStyle: "italic", fontSize: 12 }}>
                      No shipment parcels attached to pickup {record.request_number}.
                    </div>
                  );
                }
                return (
                  <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8, border: "1px solid #e2e8f0", margin: "4px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Space>
                        <InboxOutlined style={{ color: "#0891b2" }} />
                        <Text strong style={{ fontSize: 13 }}>
                          Parcels for {record.request_number} ({shipments.length} pkg)
                        </Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {shipments.filter((s) => s.status === "received_at_origin" || s.pivot_status === "received").length}/{shipments.length} received at branch hub
                      </Text>
                    </div>
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={false}
                      dataSource={shipments}
                      columns={[
                        {
                          title: "Tracking #",
                          dataIndex: "tracking_number",
                          key: "tracking_number",
                          render: (v) => (
                            <Space size={4}>
                              <Text strong style={{ fontFamily: "monospace" }}>{v || "-"}</Text>
                              {v && (
                                <Tooltip title="Copy tracking number">
                                  <CopyOutlined
                                    style={{ color: "#999", cursor: "pointer", fontSize: 11 }}
                                    onClick={() => {
                                      navigator.clipboard?.writeText(v);
                                      message.success("Copied tracking #");
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </Space>
                          ),
                        },
                        {
                          title: "Merchant Order #",
                          dataIndex: "merchant_order_id",
                          key: "merchant_order_id",
                          render: (v) => v || "-",
                        },
                        {
                          title: "Receiver",
                          key: "receiver",
                          render: (_, s) => (
                            <div>
                              <div>{s.receiver_name || "-"}</div>
                              {s.receiver_phone && <span style={{ fontSize: 11, color: "#666" }}>{s.receiver_phone}</span>}
                            </div>
                          ),
                        },
                        {
                          title: "Destination",
                          dataIndex: "receiver_city",
                          key: "receiver_city",
                          render: (v) => v || "-",
                        },
                        {
                          title: "Parcel Status",
                          dataIndex: "status",
                          key: "status",
                          render: (v) => {
                            const isRec = v === "received_at_origin" || v === "received";
                            return <Tag color={isRec ? "success" : v === "picked_up" ? "cyan" : "default"}>{v || "-"}</Tag>;
                          },
                        },
                        {
                          title: "Origin Check-in",
                          key: "action",
                          align: "right",
                          render: (_, s) => {
                            const isRec = s.status === "received_at_origin" || s.pivot_status === "received";
                            if (isRec) {
                              return <Tag color="success"><CheckCircleOutlined /> Received</Tag>;
                            }
                            return (
                              <Space size={6}>
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<CheckCircleOutlined />}
                                  style={{ background: "#10B981", borderColor: "#10B981" }}
                                  loading={busy === `receive_${s.id}`}
                                  onClick={() => handleReceiveSingle(record.pickup_request_id, s.id)}
                                >
                                  Receive
                                </Button>
                                <Button
                                  size="small"
                                  danger
                                  icon={<CloseCircleOutlined />}
                                  onClick={() => openRejectModal(record.pickup_request_id, s.id)}
                                >
                                  Reject
                                </Button>
                              </Space>
                            );
                          },
                        },
                      ]}
                    />
                  </div>
                );
              },
              defaultExpandAllRows: true,
            }}
            locale={{ emptyText: "No pickups in this run." }}
          />
        )}
      </Card>

      {/* Rider Modal */}
      <Modal
        title={`Assign rider to ${run.run_number}`}
        open={riderModal}
        onCancel={() => setRiderModal(false)}
        confirmLoading={busy === "assign_rider"}
        okText="Assign"
        onOk={async () => {
          if (!riderForm.rider_user_id) {
            message.warning("Select a rider.");
            return;
          }
          const ok = await act("assign_rider", () => assignPickupRunRider(run.id, riderForm, branchId));
          if (ok) setRiderModal(false);
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Select
            showSearch
            placeholder="Select rider"
            style={{ width: "100%" }}
            loading={ridersLoading}
            value={riderForm.rider_user_id}
            onChange={(v) => setRiderForm((f) => ({ ...f, rider_user_id: v }))}
            options={riders.map((r) => ({
              value: r.id,
              label: `${r.name}${r.phone ? ` · ${r.phone}` : ""}`,
            }))}
          />
          <Space.Compact style={{ width: "100%" }}>
            <Select
              allowClear
              placeholder="Vehicle"
              style={{ width: "40%" }}
              value={riderForm.vehicle_type}
              options={VEHICLE_OPTIONS}
              onChange={(v) => setRiderForm((f) => ({ ...f, vehicle_type: v }))}
            />
            <Input
              placeholder="Vehicle number"
              value={riderForm.vehicle_number}
              onChange={(e) => setRiderForm((f) => ({ ...f, vehicle_number: e.target.value }))}
            />
          </Space.Compact>
        </Space>
      </Modal>

      {/* Add Pickups Modal */}
      <Modal
        title={`Add pickups to ${run.run_number}`}
        open={addModal}
        width={760}
        onCancel={() => setAddModal(false)}
        okText={`Add ${addKeys.length || ""}`}
        okButtonProps={{ disabled: !addKeys.length }}
        confirmLoading={busy === "add"}
        onOk={async () => {
          const ok = await act("add", () => addPickupRunItems(run.id, addKeys, branchId));
          if (ok) setAddModal(false);
        }}
      >
        <Table
          size="small"
          rowKey="pickup_request_id"
          loading={readyLoading}
          dataSource={readyRows}
          pagination={{ pageSize: 8, size: "small" }}
          rowSelection={{ selectedRowKeys: addKeys, onChange: setAddKeys }}
          columns={[
            { title: "Request", dataIndex: "request_number" },
            { title: "Merchant", key: "merchant", render: (_, r) => r.merchant?.business_name || r.pickup_name },
            { title: "Area", dataIndex: "pickup_area" },
            { title: "Parcels", dataIndex: "parcel_quantity", render: (v) => `${v || 1} pkg` },
          ]}
          locale={{ emptyText: "No pickups ready to add." }}
        />
      </Modal>

      {/* Cancel Modal */}
      <Modal
        title={`Cancel ${run.run_number}?`}
        open={cancelModal}
        onCancel={() => setCancelModal(false)}
        okText="Cancel run"
        okButtonProps={{ danger: true }}
        confirmLoading={busy === "cancel"}
        onOk={async () => {
          const ok = await act("cancel", () => cancelPickupRun(run.id, cancelReason || null, branchId));
          if (ok) setCancelModal(false);
        }}
      >
        <Text type="secondary">Pickups will be released and returned to ready list.</Text>
        <Input.TextArea
          rows={2}
          style={{ marginTop: 8 }}
          placeholder="Reason (optional)"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </Modal>

      {/* Close Modal */}
      <Modal
        title={`Close ${run.run_number}`}
        open={closeModal}
        onCancel={() => setCloseModal(false)}
        okText="Close run"
        confirmLoading={busy === "close"}
        onOk={async () => {
          const ok = await act("close", () => closePickupRun(run.id, { notes: closeNotes }, branchId));
          if (ok) setCloseModal(false);
        }}
      >
        <Text type="secondary">Mark this pickup run completed and closed.</Text>
        <Input.TextArea
          rows={2}
          style={{ marginTop: 8 }}
          placeholder="Closing notes (optional)"
          value={closeNotes}
          onChange={(e) => setCloseNotes(e.target.value)}
        />
      </Modal>

      {/* Route Map Modal */}
      <Modal
        title={`Pickup Route Map · ${run.run_number}`}
        open={mapModal}
        width={960}
        onCancel={() => setMapModal(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setMapModal(false)}>
            Close Map
          </Button>,
        ]}
        destroyOnHidden
      >
        <RunRouteMap run={run} mode="pickup" height="540px" />
      </Modal>

      {/* Reject Discrepancy Modal */}
      <Modal
        title={
          <Space>
            <CloseCircleOutlined style={{ color: "#ef4444" }} />
            <span>Reject Shipment Discrepancy</span>
          </Space>
        }
        open={rejectModal}
        onCancel={() => {
          setRejectModal(false);
          setRejectTarget(null);
        }}
        confirmLoading={busy === "reject"}
        okText="Confirm Rejection"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        onOk={handleRejectConfirm}
      >
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Alert
            type="warning"
            showIcon
            message="Marking shipment discrepancy at branch hub"
            description="If the rider returned without this parcel, or if it is damaged or mismatched, record the discrepancy reason."
          />
          <div>
            <Text strong style={{ fontSize: 12 }}>Discrepancy Type</Text>
            <Select
              style={{ width: "100%", marginTop: 4 }}
              value={rejectType}
              onChange={setRejectType}
              options={[
                { value: "missing", label: "Missing / Not Handed Over" },
                { value: "damaged", label: "Damaged Parcel" },
                { value: "mismatch", label: "Mismatch with Store Order" },
                { value: "other", label: "Other Verification Issue" },
              ]}
            />
          </div>
          <div>
            <Text strong style={{ fontSize: 12 }}>Reason / Notes (Required)</Text>
            <Input.TextArea
              rows={3}
              placeholder="Explain the discrepancy..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      </Modal>
    </Spin>
  );
}

