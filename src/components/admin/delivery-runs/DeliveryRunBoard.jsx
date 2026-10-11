"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Empty,
  Input,
  Modal,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { CarOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import DeliveryRunDetail, { RunStatusTag } from "@/components/admin/delivery-runs/DeliveryRunDetail";
import { VEHICLE_OPTIONS, areaOf, fmtDate, rs, vehicleText } from "@/components/admin/delivery-runs/runMeta";
import {
  createDeliveryRun,
  getDeliveryRuns,
  getReadyForDelivery,
  getRunRiders,
  runErrorText,
} from "@/services/admin/deliveryRunService";

const { Text } = Typography;

export const RUN_STATUS_FILTERS = [
  { value: "active", label: "Active" },
  { value: "open,assigned", label: "Not dispatched" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "completed", label: "Waiting to close" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const ACCENT = {
  open: "#1677ff",
  assigned: "#faad14",
  out_for_delivery: "#13c2c2",
  completed: "#722ed1",
  closed: "#52c41a",
  cancelled: "#bfbfbf",
};

const PAGE_SIZE = 15;

function RunCard({ run, selected, onClick }) {
  const accent = ACCENT[run.status] || "#1677ff";
  const vehicle = vehicleText(run.vehicle_type, run.vehicle_number);
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        cursor: "pointer",
        borderRadius: 8,
        borderTop: `1px solid ${selected ? accent : "#f0f0f0"}`,
        borderRight: `1px solid ${selected ? accent : "#f0f0f0"}`,
        borderBottom: `1px solid ${selected ? accent : "#f0f0f0"}`,
        borderLeft: `4px solid ${accent}`,
        background: selected ? `${accent}14` : "#fff",
        padding: "8px 10px",
        outline: "none",
      }}
    >
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ textAlign: "center", minWidth: 36 }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: accent }}>{run.expected_count}</div>
          <Text type="secondary" style={{ fontSize: 10 }}>
            parcels
          </Text>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={4} wrap>
            <Text strong style={{ fontSize: 13 }}>
              {run.run_number}
            </Text>
            <RunStatusTag status={run.status} />
          </Space>
          <div style={{ fontSize: 12 }}>
            {run.rider ? <Text>{run.rider.name}</Text> : <Text type="warning">No rider</Text>}
            {vehicle ? (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {" "}
                · <CarOutlined /> {vehicle}
              </Text>
            ) : null}
            {run.branch?.name ? (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {" "}
                · {run.branch.name}
              </Text>
            ) : null}
          </div>
          <Space size={2} wrap style={{ marginTop: 2 }}>
            {run.delivered_count ? (
              <Tag color="green" style={{ margin: 0, fontSize: 11 }}>
                {run.delivered_count} delivered
              </Tag>
            ) : null}
            {run.failed_count ? (
              <Tag color="red" style={{ margin: 0, fontSize: 11 }}>
                {run.failed_count} failed
              </Tag>
            ) : null}
            {run.status === "out_for_delivery" && run.pending_count ? (
              <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                {run.pending_count} on road
              </Tag>
            ) : null}
          </Space>
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
            COD {rs(run.cod_expected)}
            {Number(run.cod_collected) ? ` · cash ${rs(run.cod_collected)}` : ""}
          </Text>
          <Text type="secondary" style={{ fontSize: 10, display: "block" }}>
            {run.closed_at
              ? `Closed ${fmtDate(run.closed_at)}`
              : run.dispatched_at
                ? `Out ${fmtDate(run.dispatched_at)}`
                : `Created ${fmtDate(run.created_at)}`}
          </Text>
        </div>
      </div>
    </div>
  );
}

/**
 * New DR for a set of parcels: rider (optional), vehicle, notes, dispatch now.
 * Used by the Ready-to-assign list and the by-area view.
 */
export function CreateRunModal({ open, shipmentIds = [], codTotal = 0, branchId = null, requireRider = false, onClose, onCreated }) {
  const [creating, setCreating] = useState(false);
  const [riders, setRiders] = useState([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [form, setForm] = useState({ rider_user_id: null, vehicle_type: "bike", vehicle_number: "", notes: "", dispatch_now: false });
  const count = shipmentIds.length;

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setForm({ rider_user_id: null, vehicle_type: "bike", vehicle_number: "", notes: "", dispatch_now: false });
    setRidersLoading(true);
    getRunRiders({}, branchId)
      .then((list) => alive && setRiders(list))
      .catch((e) => {
        if (alive) {
          setRiders([]);
          message.error(runErrorText(e, "Could not load riders."));
        }
      })
      .finally(() => alive && setRidersLoading(false));
    return () => {
      alive = false;
    };
  }, [open, branchId]);

  const submit = async () => {
    if (requireRider && !form.rider_user_id) {
      message.warning("Choose the rider for this DR.");
      return;
    }
    setCreating(true);
    try {
      const res = await createDeliveryRun(
        {
          shipment_ids: shipmentIds,
          rider_user_id: form.rider_user_id || null,
          vehicle_type: form.vehicle_type || null,
          vehicle_number: form.vehicle_number || null,
          notes: form.notes || null,
          dispatch_now: !!(form.dispatch_now && form.rider_user_id),
        },
        branchId
      );
      message.success(res.message || "Delivery run created.");
      const skipped = res.data?.skipped;
      if (skipped && Object.keys(skipped).length) message.warning(Object.values(skipped).slice(0, 3).join(" "));
      onCreated?.(res.data?.run?.id || null);
    } catch (e) {
      message.error(runErrorText(e, "Could not create the run."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      title={
        requireRider
          ? `Create DR & assign rider (${count} parcel${count === 1 ? "" : "s"})`
          : `New delivery run (${count} parcel${count === 1 ? "" : "s"})`
      }
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={creating}
      okText={form.dispatch_now && form.rider_user_id ? "Create DR & dispatch" : requireRider ? "Create DR & assign" : "Create DR"}
      okButtonProps={{ disabled: !count || (requireRider && !form.rider_user_id) }}
      destroyOnHidden
    >
      <Space direction="vertical" style={{ width: "100%" }} size={10}>
        <Alert
          type="info"
          showIcon
          message={`COD to collect on this run: ${rs(codTotal)}. Stops are ordered by area; you can reorder them after creating.`}
        />
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {requireRider ? "Rider (the whole DR is assigned to this rider)" : "Rider (optional now, required to dispatch)"}
          </Text>
          <Select
            showSearch
            allowClear
            loading={ridersLoading}
            placeholder="Choose rider"
            optionFilterProp="label"
            style={{ width: "100%" }}
            value={form.rider_user_id ?? undefined}
            onChange={(v) => setForm((f) => ({ ...f, rider_user_id: v ?? null }))}
            options={riders.map((r) => ({
              value: r.id,
              label: `${r.name}${r.phone ? ` · ${r.phone}` : ""} (${r.active_deliveries ?? 0} active)`,
            }))}
            notFoundContent={ridersLoading ? "Loading..." : "No active riders at this branch"}
          />
        </div>
        <Space.Compact style={{ width: "100%" }}>
          <Select
            allowClear
            placeholder="Vehicle"
            style={{ width: "40%" }}
            value={form.vehicle_type ?? undefined}
            options={VEHICLE_OPTIONS}
            onChange={(v) => setForm((f) => ({ ...f, vehicle_type: v ?? null }))}
          />
          <Input
            placeholder="Vehicle number (optional)"
            value={form.vehicle_number}
            onChange={(e) => setForm((f) => ({ ...f, vehicle_number: e.target.value }))}
          />
        </Space.Compact>
        <Input.TextArea
          rows={2}
          placeholder="Notes for the rider (optional)"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <Space>
          <Switch
            size="small"
            disabled={!form.rider_user_id}
            checked={form.dispatch_now && !!form.rider_user_id}
            onChange={(v) => setForm((f) => ({ ...f, dispatch_now: v }))}
          />
          <Text>Dispatch now (rider already has the parcels)</Text>
        </Space>
      </Space>
    </Modal>
  );
}

/**
 * "Ready for delivery" tab: parcels sorted for delivery at the branch, grouped
 * by area. Tick parcels and create a DR (optionally with rider + dispatch).
 */
export function ReadyForDelivery({ branchId = null, canManage = false, reloadKey = 0, onCreated, onCount }) {
  const [ready, setReady] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getReadyForDelivery({}, branchId);
      setReady(rows);
      onCount?.(rows.length);
      setPicked((cur) => cur.filter((id) => rows.some((r) => r.shipment_id === id)));
    } catch (e) {
      message.error(runErrorText(e, "Could not load parcels ready for delivery."));
      setReady([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, onCount]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  useEffect(() => {
    setPicked([]);
  }, [branchId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return ready;
    return ready.filter((r) =>
      [r.tracking_number, r.receiver_name, r.receiver_phone, r.delivery_address, r.receiver_area, r.receiver_city, r.merchant?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [ready, search]);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const key = areaOf(r);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [filtered]);

  const pickedRows = useMemo(() => ready.filter((r) => picked.includes(r.shipment_id)), [ready, picked]);
  const pickedBranches = useMemo(() => [...new Set(pickedRows.map((r) => r.branch_id).filter(Boolean))], [pickedRows]);
  const pickedCod = pickedRows.reduce((sum, r) => sum + Number(r.cod_amount || 0), 0);
  const createBranchId = branchId || (pickedBranches.length === 1 ? pickedBranches[0] : null);

  const togglePick = (id, on) => setPicked((cur) => (on ? [...new Set([...cur, id])] : cur.filter((x) => x !== id)));
  const toggleGroup = (rows, on) => {
    const ids = rows.map((r) => r.shipment_id);
    setPicked((cur) => (on ? [...new Set([...cur, ...ids])] : cur.filter((x) => !ids.includes(x))));
  };
  const allVisibleOn = filtered.length > 0 && filtered.every((r) => picked.includes(r.shipment_id));

  const openCreate = () => {
    if (!picked.length) return;
    if (!createBranchId) {
      message.warning("The selected parcels are at different branches. Pick one branch at the top first.");
      return;
    }
    setCreateOpen(true);
  };

  return (
    <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 12 } }}>
      <Spin spinning={loading}>
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search tracking, receiver, phone, area, merchant"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
            />
            {canManage ? (
              <Space wrap>
                <Checkbox
                  checked={allVisibleOn}
                  indeterminate={!allVisibleOn && filtered.some((r) => picked.includes(r.shipment_id))}
                  disabled={!filtered.length}
                  onChange={(e) => toggleGroup(filtered, e.target.checked)}
                >
                  Select all shown
                </Checkbox>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {picked.length} selected{picked.length ? ` · COD ${rs(pickedCod)}` : ""}
                </Text>
                {picked.length ? (
                  <Button size="small" onClick={() => setPicked([])}>
                    Clear
                  </Button>
                ) : null}
                <Button type="primary" icon={<PlusOutlined />} disabled={!picked.length} onClick={openCreate}>
                  Create DR{picked.length ? ` (${picked.length})` : ""}
                </Button>
              </Space>
            ) : null}
          </div>

          {!groups.length ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                ready.length
                  ? "No parcels match the search"
                  : "No parcels waiting. Parcels show here once they are sorted for delivery at the branch."
              }
            />
          ) : (
            <Collapse
              size="small"
              defaultActiveKey={groups.slice(0, 4).map(([area]) => area)}
              items={groups.map(([area, rows]) => {
                const allOn = rows.every((r) => picked.includes(r.shipment_id));
                const someOn = rows.some((r) => picked.includes(r.shipment_id));
                const cod = rows.reduce((s, r) => s + Number(r.cod_amount || 0), 0);
                return {
                  key: area,
                  label: (
                    <Space size={6} onClick={(e) => e.stopPropagation()}>
                      {canManage ? (
                        <Checkbox
                          checked={allOn}
                          indeterminate={someOn && !allOn}
                          onChange={(e) => toggleGroup(rows, e.target.checked)}
                        />
                      ) : null}
                      <Text strong>{area}</Text>
                      <Tag style={{ margin: 0 }}>{rows.length}</Tag>
                      {cod ? (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          COD {rs(cod)}
                        </Text>
                      ) : null}
                    </Space>
                  ),
                  children: (
                    <Row gutter={[12, 4]}>
                      {rows.map((r) => (
                        <Col xs={24} md={12} xl={8} key={r.shipment_id}>
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: "1px dashed #f0f0f0" }}>
                            {canManage ? (
                              <Checkbox
                                checked={picked.includes(r.shipment_id)}
                                onChange={(e) => togglePick(r.shipment_id, e.target.checked)}
                              />
                            ) : null}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Space size={4} wrap>
                                <Text strong style={{ fontFamily: "monospace", fontSize: 12 }}>
                                  {r.tracking_number}
                                </Text>
                                {r.reattempt || r.attempts > 1 ? (
                                  <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>
                                    Re-delivery
                                  </Tag>
                                ) : null}
                                {Number(r.cod_amount) > 0 ? (
                                  <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>
                                    COD {rs(r.cod_amount)}
                                  </Tag>
                                ) : (
                                  <Tag style={{ margin: 0, fontSize: 10 }}>Prepaid</Tag>
                                )}
                              </Space>
                              <div style={{ fontSize: 12 }}>
                                {r.receiver_name || "-"}
                                {r.receiver_phone ? ` · ${r.receiver_phone}` : ""}
                              </div>
                              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                                {r.delivery_address || "-"}
                              </Text>
                              {r.merchant?.name ? (
                                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                                  {r.merchant.name}
                                </Text>
                              ) : null}
                              {r.last_failure_reason ? (
                                <div style={{ fontSize: 11, color: "#d46b08" }}>Last attempt: {r.last_failure_reason}</div>
                              ) : null}
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  ),
                };
              })}
            />
          )}
        </Space>
      </Spin>

      <CreateRunModal
        open={createOpen}
        shipmentIds={picked}
        codTotal={pickedCod}
        branchId={createBranchId}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          setPicked([]);
          onCreated?.(id);
        }}
      />
    </Card>
  );
}

/**
 * "Delivery runs" tab: DR cards on the left, the selected run on the right
 * (assign rider, order stops, print, dispatch, close & reconcile).
 */
export function DeliveryRunsBoard({ branchId = null, canManage = false, reloadKey = 0, selectedRunId = null, onSelectRun, onChanged }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [status, debounced, branchId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDeliveryRuns({ page, per_page: PAGE_SIZE, status, search: debounced || undefined }, branchId);
      setRuns(res.list);
      setTotal(res.total);
    } catch (e) {
      message.error(runErrorText(e, "Could not load delivery runs."));
      setRuns([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, status, debounced, branchId]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const handleChanged = useCallback(
    (fresh) => {
      load();
      onChanged?.(fresh);
    },
    [load, onChanged]
  );

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={9}>
        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 12 } }}>
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            <Space.Compact style={{ width: "100%" }}>
              <Select style={{ width: "45%" }} value={status} options={RUN_STATUS_FILTERS} onChange={setStatus} />
              <Input allowClear placeholder="DR, rider or tracking" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Space.Compact>
            <Spin spinning={loading}>
              {!runs.length ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={status === "active" && !debounced ? "No active delivery runs. Create one from Ready for delivery." : "No delivery runs match"}
                />
              ) : (
                <Space direction="vertical" style={{ width: "100%" }} size={6} role="listbox">
                  {runs.map((run) => (
                    <RunCard key={run.id} run={run} selected={run.id === selectedRunId} onClick={() => onSelectRun?.(run.id)} />
                  ))}
                </Space>
              )}
            </Spin>
            {total > PAGE_SIZE ? (
              <Pagination size="small" current={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} showSizeChanger={false} />
            ) : null}
            <Text type="secondary" style={{ fontSize: 11 }}>
              {total} run{total === 1 ? "" : "s"}
            </Text>
          </Space>
        </Card>
      </Col>
      <Col xs={24} lg={15}>
        <DeliveryRunDetail runId={selectedRunId} branchId={branchId} canManage={canManage} onChanged={handleChanged} />
      </Col>
    </Row>
  );
}
