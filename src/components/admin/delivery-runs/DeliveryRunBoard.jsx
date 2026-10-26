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
  Radio,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { CarOutlined, CompassOutlined, EnvironmentOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import RunRouteMap from "@/components/maps/RunRouteMap";
import { useShipmentDrawer } from "@/components/admin/shipments/ShipmentDrawerProvider";
import DeliveryRunDetail, { RunStatusTag } from "@/components/admin/delivery-runs/DeliveryRunDetail";
import { VEHICLE_OPTIONS, areaOf, fmtDate, rs, vehicleText } from "@/components/admin/delivery-runs/runMeta";
import {
  createDeliveryRun,
  getDeliveryRun,
  getDeliveryRuns,
  getReadyForDelivery,
  getRunRiders,
  runErrorText,
  suggestDeliveryRuns,
} from "@/services/admin/deliveryRunService";

const { Text } = Typography;

export const RUN_STATUS_FILTERS = [
  { value: "active", label: "Active" },
  { value: "open,assigned", label: "Collecting" },
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
            {run.status === "assigned" ? (
              <Tag color={run.can_start ? "green" : "geekblue"} style={{ margin: 0, fontSize: 11 }}>
                Bagged {run.bagged_count ?? 0}/{(run.bagged_count ?? 0) + (run.to_bag_count ?? 0) || run.expected_count}
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
 * New DR for a set of parcels: rider (optional), vehicle, notes. The rider
 * collects and bags each parcel at the warehouse, then starts the run.
 * Used by the Ready-to-assign list and the by-area view.
 */
/** Load route suggestions for a parcel selection while `open` (un-started runs + riders on the road). */
export function useRunSuggestions(open, shipmentIds = [], branchId = null) {
  const [state, setState] = useState({ runs: [], onRoad: [], loading: false });
  const key = (shipmentIds || []).join(",");
  useEffect(() => {
    if (!open || !key) {
      setState({ runs: [], onRoad: [], loading: false });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    suggestDeliveryRuns(key.split(",").map(Number), branchId)
      .then((res) => alive && setState({ runs: res.runs, onRoad: res.onRoad, loading: false }))
      .catch(() => alive && setState({ runs: [], onRoad: [], loading: false }));
    return () => {
      alive = false;
    };
  }, [open, key, branchId]);
  return state;
}

/**
 * Join-or-new choice for a rider who is still collecting (run not started):
 * route-fit chips, "Add to DR-x" vs a separate option, on-road and off-route notes.
 */
export function RunJoinPicker({
  suggestions,
  riderId,
  mode,
  onModeChange,
  onPickRider,
  joinValue = "existing",
  otherValue = "new",
  otherLabel = "Create new run",
  onRoadNote = "Parcels cannot be added to a run that is out for delivery; they go on a new run.",
}) {
  const runs = suggestions?.runs || [];
  const onRoad = suggestions?.onRoad || [];
  const fitting = runs.filter((r) => r.rider?.id && r.fits).slice(0, 4);
  const riderRun = riderId ? runs.find((r) => Number(r.rider?.id) === Number(riderId)) : null;
  const riderOnRoad = riderId && !riderRun ? onRoad.find((r) => Number(r.rider?.id) === Number(riderId)) : null;
  const stopsText = (r) => `${r.stops} stop${r.stops === 1 ? "" : "s"}`;

  return (
    <>
      {fitting.length ? (
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
            Same route, not started yet (tap to add to it)
          </Text>
          <Space size={[4, 4]} wrap>
            {fitting.map((r) => {
              const on = riderRun && riderRun.id === r.id && mode === joinValue;
              return (
                <Tag
                  key={r.id}
                  color={on ? "blue" : "geekblue"}
                  icon={<CompassOutlined />}
                  style={{ cursor: "pointer", margin: 0, borderStyle: on ? "solid" : "dashed" }}
                  onClick={() => {
                    onPickRider?.(r.rider.id);
                    onModeChange?.(joinValue);
                  }}
                >
                  {r.label}
                  {r.selected_count ? ` · ${r.fit_count}/${r.selected_count} fit` : ""}
                  {r.nearest_km != null ? ` · ${Number(r.nearest_km).toFixed(1)} km` : ""}
                </Tag>
              );
            })}
          </Space>
        </div>
      ) : null}

      {riderRun ? (
        <div style={{ border: "1px solid #ffe58f", background: "#fffbe6", borderRadius: 8, padding: "8px 10px" }}>
          <Radio.Group value={mode} onChange={(e) => onModeChange?.(e.target.value)} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Radio value={joinValue}>
              Add to <Text strong>{riderRun.run_number}</Text> ({riderRun.rider?.name}&apos;s current run, {stopsText(riderRun)}, not started)
            </Radio>
            <Radio value={otherValue}>{otherLabel}</Radio>
          </Radio.Group>
          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
            {mode === joinValue
              ? `Bagged ${riderRun.bagged_count}/${riderRun.bagged_count + riderRun.to_bag_count} so far. The added parcels arrive unbagged, stops are re-ordered, and Start locks again until the rider bags them.`
              : "The rider gets a second run that is started separately."}
          </Text>
          {mode === joinValue && riderRun.off_route?.length ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 6 }}
              message={`${riderRun.off_route.length} parcel${riderRun.off_route.length === 1 ? " is" : "s are"} off ${riderRun.run_number}'s route`}
              description={`${riderRun.off_route.slice(0, 5).join(", ")}${riderRun.off_route.length > 5 ? "..." : ""}: no shared area and more than 2 km from its stops. You can still add them.`}
            />
          ) : null}
        </div>
      ) : null}

      {riderOnRoad ? (
        <Alert
          type="info"
          showIcon
          message={`${riderOnRoad.rider?.name || "This rider"} is on the road with ${riderOnRoad.run_number} (${riderOnRoad.pending_count} stop${riderOnRoad.pending_count === 1 ? "" : "s"} left)`}
          description={onRoadNote}
        />
      ) : null}
    </>
  );
}

export function CreateRunModal({ open, shipmentIds = [], codTotal = 0, branchId = null, requireRider = false, initialRiderId = null, onClose, onCreated }) {
  const [creating, setCreating] = useState(false);
  const [riders, setRiders] = useState([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [form, setForm] = useState({ rider_user_id: initialRiderId || null, vehicle_type: "bike", vehicle_number: "", notes: "" });
  const [runMode, setRunMode] = useState("existing");
  const count = shipmentIds.length;
  const suggestions = useRunSuggestions(open, shipmentIds, branchId);
  const riderRun = form.rider_user_id ? suggestions.runs.find((r) => Number(r.rider?.id) === Number(form.rider_user_id)) : null;
  const joining = Boolean(riderRun) && runMode === "existing";

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setForm({ rider_user_id: initialRiderId || null, vehicle_type: "bike", vehicle_number: "", notes: "" });
    setRunMode("existing");
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
          run_mode: riderRun ? runMode : "auto",
        },
        branchId
      );
      message.success(res.message || (res.data?.merged ? "Parcels added to the rider's run." : "Delivery run created."), res.data?.merged ? 6 : 3);
      if (res.data?.merged && res.data?.off_route?.length) {
        message.warning(`Off-route on ${res.data?.run?.run_number || "the run"}: ${res.data.off_route.slice(0, 5).join(", ")}`, 6);
      }
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
      okText={joining ? `Add to ${riderRun.run_number}` : form.rider_user_id ? "Create DR & assign" : "Create DR"}
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
            {requireRider ? "Rider (the whole DR is assigned to this rider)" : "Rider (optional now; the rider collects and bags the parcels)"}
          </Text>
          <Select
            showSearch
            allowClear
            loading={ridersLoading}
            placeholder="Choose rider"
            optionFilterProp="label"
            style={{ width: "100%" }}
            value={form.rider_user_id ?? undefined}
            onChange={(v) => {
              setForm((f) => ({ ...f, rider_user_id: v ?? null }));
              setRunMode("existing");
            }}
            options={riders.map((r) => {
              const own = suggestions.runs.find((x) => Number(x.rider?.id) === Number(r.id));
              const road = !own && suggestions.onRoad.find((x) => Number(x.rider?.id) === Number(r.id));
              return {
                value: r.id,
                label: `${r.name}${r.phone ? ` · ${r.phone}` : ""} (${r.active_deliveries ?? 0} active)${own ? ` · collecting ${own.run_number}` : road ? " · on the road" : ""}`,
              };
            })}
            notFoundContent={ridersLoading ? "Loading..." : "No active riders at this branch"}
          />
        </div>
        <RunJoinPicker
          suggestions={suggestions}
          riderId={form.rider_user_id}
          mode={runMode}
          onModeChange={setRunMode}
          onPickRider={(id) => setForm((f) => ({ ...f, rider_user_id: id }))}
          onRoadNote="Parcels cannot be added to a run that is out for delivery. This creates a new run the rider collects after coming back."
        />
        {joining ? null : (
        <>
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
        </>
        )}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {joining
            ? `${riderRun.rider?.name || "The rider"} sees "${count} new parcel${count === 1 ? "" : "s"} added to ${riderRun.run_number} - collect and bag" in their Deliveries page.`
            : form.rider_user_id
            ? "The rider is notified in their Deliveries page, collects each parcel from the warehouse, bags it (tap or scan) and starts the run when all are bagged."
            : "Assign a rider later from the run."}
        </Text>
      </Space>
    </Modal>
  );
}

/**
 * "Ready for delivery" tab: parcels sorted for delivery at the branch, grouped
 * by area. Tick parcels and create a DR (optionally with a rider).
 */
export function ReadyForDelivery({ branchId = null, canManage = false, reloadKey = 0, onCreated, onCount }) {
  const [ready, setReady] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createRiderId, setCreateRiderId] = useState(null);
  const [debPicked, setDebPicked] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setDebPicked(picked), 500);
    return () => clearTimeout(t);
  }, [picked]);

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

  // Route fit for the current selection: un-started runs these parcels could join.
  const pickSuggest = useRunSuggestions(canManage && debPicked.length > 0 && !createOpen, debPicked, createBranchId);
  const pickFits = pickSuggest.runs.filter((r) => r.rider?.id && r.fits).slice(0, 3);

  const openCreate = (riderId = null) => {
    setCreateRiderId(riderId);
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
                <Button type="primary" icon={<PlusOutlined />} disabled={!picked.length} onClick={() => openCreate(null)}>
                  Create DR{picked.length ? ` (${picked.length})` : ""}
                </Button>
              </Space>
            ) : null}
          </div>

          {canManage && picked.length && pickFits.length ? (
            <Space size={[4, 4]} wrap>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Same route, rider still bagging:
              </Text>
              {pickFits.map((r) => (
                <Tag
                  key={r.id}
                  color="geekblue"
                  icon={<CompassOutlined />}
                  style={{ cursor: "pointer", margin: 0 }}
                  onClick={() => openCreate(r.rider.id)}
                >
                  {r.label} · {r.fit_count}/{r.selected_count} fit
                </Tag>
              ))}
            </Space>
          ) : null}

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
        initialRiderId={createRiderId}
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
export function DeliveryRunsBoard({ branchId = null, canManage = false, reloadKey = 0, selectedRunId: propSelectedRunId = null, onSelectRun, onChanged }) {
  const [internalSelectedRunId, setInternalSelectedRunId] = useState(propSelectedRunId);
  const selectedRunId = propSelectedRunId ?? internalSelectedRunId;
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    if (propSelectedRunId !== null && propSelectedRunId !== undefined) {
      setInternalSelectedRunId(propSelectedRunId);
    }
  }, [propSelectedRunId]);

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
      if (!selectedRunId && res.list?.length) {
        setInternalSelectedRunId(res.list[0].id);
      }
    } catch (e) {
      message.error(runErrorText(e, "Could not load delivery runs."));
      setRuns([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, status, debounced, branchId, selectedRunId]);

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

  // Layout like the Pickup Runs board: split map (list + live route map),
  // manage (list + run detail) and cards (grid + route map modal).
  const [layout, setLayout] = useState("split");
  const [activeRunData, setActiveRunData] = useState(null);
  const [activeRunLoading, setActiveRunLoading] = useState(false);
  const [mapRun, setMapRun] = useState(null);
  const { openShipment } = useShipmentDrawer();
  const [mapLoading, setMapLoading] = useState(false);

  useEffect(() => {
    if (layout !== "split" || !selectedRunId) {
      if (!selectedRunId) setActiveRunData(null);
      return undefined;
    }
    let cancelled = false;
    setActiveRunLoading(true);
    getDeliveryRun(selectedRunId, branchId)
      .then((full) => {
        if (!cancelled) setActiveRunData(full?.run || full);
      })
      .catch(() => {
        if (!cancelled) setActiveRunData(runs.find((r) => r.id === selectedRunId) || null);
      })
      .finally(() => {
        if (!cancelled) setActiveRunLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [layout, selectedRunId, branchId, runs]);

  const selectRun = (id) => {
    setInternalSelectedRunId(id);
    onSelectRun?.(id);
  };

  const manageRun = (id) => {
    selectRun(id);
    setMapRun(null);
    setLayout("manage");
  };

  const openQuickMap = async (run) => {
    setMapLoading(true);
    setMapRun(run);
    try {
      const full = await getDeliveryRun(run.id, branchId);
      setMapRun(full?.run || full || run);
    } catch {
      // keep the summary row
    } finally {
      setMapLoading(false);
    }
  };

  const openParcel = (shipmentId) => {
    if (shipmentId) openShipment(shipmentId);
  };

  const layoutSwitch = (
    <Segmented
      value={layout}
      onChange={setLayout}
      options={[
        { label: "Split Map View", value: "split" },
        { label: "Manage View", value: "manage" },
        { label: "Cards View", value: "cards" },
      ]}
    />
  );

  const quickMapModal = (
    <Modal
      title={`Route Map · ${mapRun?.run_number || "Delivery Run"}`}
      open={Boolean(mapRun)}
      width={960}
      zIndex={990}
      onCancel={() => setMapRun(null)}
      footer={[
        <Button key="manage" onClick={() => mapRun && manageRun(mapRun.id)}>
          Manage Run
        </Button>,
        <Button key="close" type="primary" onClick={() => setMapRun(null)}>
          Close Map
        </Button>,
      ]}
      destroyOnHidden
    >
      <Spin spinning={mapLoading}>
        {mapRun && <RunRouteMap run={mapRun} mode="delivery" onOpenDelivery={openParcel} height="520px" />}
      </Spin>
    </Modal>
  );

  if (layout === "cards") {
    return (
      <div>
        <Card size="small" style={{ borderRadius: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <Space.Compact style={{ minWidth: 320 }}>
              <Select style={{ width: "45%" }} value={status} options={RUN_STATUS_FILTERS} onChange={setStatus} />
              <Input allowClear placeholder="DR, rider or tracking" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Space.Compact>
            {layoutSwitch}
          </div>
        </Card>
        <Spin spinning={loading}>
          {!runs.length ? (
            <Card style={{ borderRadius: 12 }}>
              <Empty description="No delivery runs match" />
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {runs.map((run) => (
                <Col xs={24} sm={12} lg={8} key={run.id}>
                  <Card
                    size="small"
                    style={{ borderRadius: 10, borderTop: `3px solid ${ACCENT[run.status] || "#13c2c2"}` }}
                    styles={{ body: { padding: 8 } }}
                    actions={[
                      <Button key="map" type="text" icon={<EnvironmentOutlined />} onClick={() => openQuickMap(run)}>
                        Route Map
                      </Button>,
                      <Button key="manage" type="text" icon={<CompassOutlined />} onClick={() => manageRun(run.id)}>
                        Manage Run
                      </Button>,
                    ]}
                  >
                    <RunCard run={run} selected={false} onClick={() => openQuickMap(run)} />
                  </Card>
                </Col>
              ))}
            </Row>
          )}
          {total > PAGE_SIZE ? (
            <Pagination size="small" style={{ marginTop: 12 }} current={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} showSizeChanger={false} />
          ) : null}
        </Spin>
        {quickMapModal}
      </div>
    );
  }

  return (
    <>
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>{layoutSwitch}</div>
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
                    <RunCard
                      key={run.id}
                      run={run}
                      selected={run.id === selectedRunId}
                      onClick={() => selectRun(run.id)}
                    />
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
        {layout === "split" ? (
          <Spin spinning={activeRunLoading}>
            {activeRunData ? (
              <Card
                size="small"
                style={{ borderRadius: 12 }}
                title={
                  <Space wrap>
                    <Text strong style={{ fontSize: 15 }}>
                      {activeRunData.run_number}
                    </Text>
                    <RunStatusTag status={activeRunData.status} />
                    {activeRunData.rider?.name ? <Text type="secondary">({activeRunData.rider.name})</Text> : null}
                  </Space>
                }
                extra={
                  <Space>
                    <Button size="small" icon={<EnvironmentOutlined />} onClick={() => openQuickMap(activeRunData)}>
                      Fullscreen
                    </Button>
                    <Button size="small" type="primary" onClick={() => manageRun(activeRunData.id)}>
                      Manage Stops &amp; Parcels
                    </Button>
                  </Space>
                }
                styles={{ body: { padding: 0 } }}
              >
                <RunRouteMap run={activeRunData} mode="delivery" onOpenDelivery={openParcel} height="600px" />
              </Card>
            ) : (
              <Card style={{ borderRadius: 12 }}>
                <Empty description="Select a run to view its route map." />
              </Card>
            )}
          </Spin>
        ) : (
          <DeliveryRunDetail runId={selectedRunId} branchId={branchId} canManage={canManage} onChanged={handleChanged} />
        )}
      </Col>
    </Row>
    {quickMapModal}
    </>
  );
}
