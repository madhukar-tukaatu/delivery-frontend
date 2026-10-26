"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CompassOutlined,
  PlayCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  InboxOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import {
  staffFinishPickupRun,
  staffGetPickupRuns,
  staffStartPickupRun,
  runErrorText,
} from "@/services/admin/pickupRunService";
import { vehicleText } from "@/components/admin/delivery-runs/runMeta";
import RunRouteMap from "@/components/maps/RunRouteMap";

const { Text } = Typography;

const RUN_STATUS_META = {
  open: { label: "Open", color: "default" },
  assigned: { label: "Assigned", color: "purple" },
  in_progress: { label: "In Progress", color: "blue" },
  completed: { label: "Completed", color: "green" },
  closed: { label: "Closed", color: "gray" },
};

const ITEM_STATUS_META = {
  queued: { label: "Queued", color: "default" },
  in_progress: { label: "En Route", color: "blue" },
  arrived: { label: "Arrived", color: "gold" },
  picked_up: { label: "Picked Up", color: "green" },
  failed: { label: "Failed", color: "red" },
  removed: { label: "Removed", color: "default" },
};

// Pickup request (PR) lifecycle labels, as on the legacy Individual Pickup Jobs screen.
const PR_STATUS_META = {
  requested: { label: "Requested", color: "default" },
  assigned: { label: "Assigned", color: "purple" },
  accepted: { label: "Accepted", color: "cyan" },
  started: { label: "On the way", color: "blue" },
  arrived: { label: "Arrived", color: "gold" },
  collected: { label: "Collected", color: "green" },
  on_way_to_branch: { label: "To branch", color: "geekblue" },
  completed: { label: "Completed", color: "green" },
  failed: { label: "Failed", color: "red" },
  cancelled: { label: "Cancelled", color: "default" },
};

const prIdOf = (i) => i?.pickup_request_id || i?.pickupRequest?.id || i?.pickup_request?.id || null;

// Live PR status from the API (pickup_status); older payloads fall back to the stop status.
const prStatusOf = (i) => {
  const s = String(i?.pickup_status || "").toLowerCase();
  if (s) return s;
  return { arrived: "arrived", picked_up: "collected", failed: "failed" }[i?.status] || "";
};

/**
 * props:
 *  - onOpenPickup(prId): open the pickup detail modal
 *  - onPickupAction(prId, action): action in accept | start | arrive | collect | transit | fail
 *    (the page runs the same staff endpoints / modals as the legacy jobs screen)
 *  - refreshKey: bump to reload runs after any pickup action
 *  - busyPickupId: PR id whose action is in flight
 */
export default function StaffPickupRunPanel({ onOpenPickup, onPickupAction, onChanged, refreshKey = 0, busyPickupId = null }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(null);
  const [finishing, setFinishing] = useState(null);
  const [mapRun, setMapRun] = useState(null);
  const [runViewMode, setRunViewMode] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await staffGetPickupRuns();
      const list = data.active || [];
      setRuns(list);
      // keep the fullscreen map in sync with the refreshed run
      setMapRun((prev) => (prev ? list.find((r) => r.id === prev.id) || prev : prev));
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const start = async (run) => {
    setStarting(run.id);
    try {
      const res = await staffStartPickupRun(run.id);
      // Starting the run accepts + starts every pickup on it (one summary toast)
      const results = res?.data?.start_results || res?.start_results || [];
      const failed = results.filter((r) => !r.ok && ["requested", "pending", "assigned", "accepted"].includes(r.from));
      const moved = results.filter((r) => r.changed && r.ok).length;
      const name = res?.run_number || run.run_number || "Run";
      let text = moved
        ? `${name} started — ${moved} pickup${moved === 1 ? "" : "s"} accepted and started`
        : `${name} started — all pickups already started`;
      if (failed.length) {
        text += `. Could not start: ${failed.map((r) => `${r.request_number}${r.error ? ` (${r.error})` : ""}`).join(", ")}`;
        message.warning(text, 6);
      } else message.success(text);
      await load();
      onChanged?.();
    } catch (e) {
      message.error(runErrorText(e, "Could not start pickup run."));
    } finally {
      setStarting(null);
    }
  };

  const finish = async (run) => {
    setFinishing(run.id);
    try {
      const res = await staffFinishPickupRun(run.id);
      message.success(res?.message || "Pickup run finished.");
      await load();
      onChanged?.();
    } catch (e) {
      message.error(runErrorText(e, "Could not finish pickup run."));
    } finally {
      setFinishing(null);
    }
  };

  /**
   * Next workflow buttons for one stop, by PR status (legacy rules):
   * assigned → Accept · accepted → Start trip · started → Arrived ·
   * arrived → Collect parcels · collected → Start transit · Fail while active.
   */
  const renderPickupActions = (run, stop, context = "list", { fromModal = false } = {}) => {
    const prId = prIdOf(stop);
    if (!prId || !onPickupAction) return null;
    if (["open", "assigned"].includes(run.status)) {
      return context === "list" ? (
        <Text type="secondary" style={{ fontSize: 11 }}>
          Start the run to begin
        </Text>
      ) : null;
    }
    if (!["in_progress", "completed"].includes(run.status)) return null;

    const s = prStatusOf(stop);
    const busy = busyPickupId != null && String(busyPickupId) === String(prId);
    const act = (action) => (e) => {
      e?.stopPropagation?.();
      // collect / fail open a modal: close the fullscreen map first so it is not hidden behind
      if (fromModal && ["collect", "fail"].includes(action)) setMapRun(null);
      onPickupAction(prId, action);
    };
    const primary = (action, label, icon) => (
      <Button key={action} size="small" type="primary" icon={icon} loading={busy} onClick={act(action)}>
        {label}
      </Button>
    );

    const out = [];
    // The run start already accepted + started every pickup. A stop still at
    // assigned/accepted here lagged behind: re-sync the whole run in one tap.
    if (["assigned", "accepted"].includes(s) && run.status === "in_progress") {
      out.push(
        <Button key="sync" size="small" type="primary" icon={<PlayCircleOutlined />} loading={starting === run.id}
          onClick={(e) => { e?.stopPropagation?.(); start(run); }}>
          Start pickup
        </Button>
      );
    }
    if (s === "started") out.push(primary("arrive", "Arrived", <EnvironmentOutlined />));
    if (s === "arrived") out.push(primary("collect", "Collect parcels", <InboxOutlined />));
    if (s === "collected") out.push(primary("transit", "Start transit to branch", <CarOutlined />));
    if (["assigned", "accepted", "started", "arrived"].includes(s)) {
      out.push(
        <Button key="fail" size="small" danger icon={<CloseCircleOutlined />} disabled={busy} onClick={act("fail")}>
          Fail
        </Button>
      );
    }
    return out.length ? out : null;
  };

  if (!runs.length) {
    return (
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 12, borderTop: "3px solid #0891b2" }}
        title={
          <Space>
            <CarOutlined style={{ color: "#0891b2" }} />
            <span style={{ fontWeight: 600 }}>My Pickup Runs (PR)</span>
          </Space>
        }
        extra={<Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={load} />}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No active pickup runs assigned yet. Ask your branch manager to assign you a Pickup Run (PR)."
        />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      style={{ marginBottom: 16, borderRadius: 12, borderTop: "3px solid #0891b2" }}
      title={
        <Space>
          <CarOutlined style={{ color: "#0891b2" }} />
          <span style={{ fontWeight: 600 }}>My Pickup Runs (PR)</span>
        </Space>
      }
      extra={<Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={load} />}
    >
      <Collapse
        size="small"
        defaultActiveKey={runs.slice(0, 1).map((r) => String(r.id))}
        items={runs.map((run) => {
          const meta = RUN_STATUS_META[run.status] || { label: run.status, color: "default" };
          const items = (run.items || []).filter((i) => i.status !== "removed");
          const openStops = items.filter((i) => !["picked_up", "failed", "removed"].includes(i.status));

          const finishButton = (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              disabled={openStops.length > 0}
              loading={finishing === run.id}
            >
              Finish run
            </Button>
          );

          return {
            key: String(run.id),
            label: (
              <Space wrap size={6}>
                <Text strong>{run.run_number}</Text>
                <Tag color={meta.color} style={{ margin: 0 }}>
                  {meta.label}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {run.picked_up_count}/{run.expected_count} picked up
                  {run.failed_count ? ` · ${run.failed_count} failed` : ""}
                </Text>
              </Space>
            ),
            extra:
              run.status === "assigned" ? (
                <span onClick={(e) => e.stopPropagation()} role="presentation">
                  <Popconfirm
                    title={`Start ${run.run_number}?`}
                    description={`Confirm you are ready to start picking up from ${run.expected_count} merchant locations.`}
                    onConfirm={() => start(run)}
                  >
                    <Button type="primary" size="small" icon={<SendOutlined />} loading={starting === run.id}>
                      Start run
                    </Button>
                  </Popconfirm>
                </span>
              ) : ["in_progress", "completed"].includes(run.status) ? (
                <span onClick={(e) => e.stopPropagation()} role="presentation">
                  {openStops.length > 0 ? (
                    <Tooltip
                      title={`Finish run unlocks when every stop is picked up or failed. Still open: ${openStops
                        .map((i) => `#${i.sequence} ${(i.pickupRequest || i)?.request_number || ""}`.trim())
                        .join(", ")}. Collect or fail each stop first.`}
                    >
                      {finishButton}
                    </Tooltip>
                  ) : (
                    <Popconfirm
                      title={`Finish ${run.run_number}?`}
                      description={`${run.picked_up_count} picked up, ${run.failed_count || 0} failed. Hand over collected parcels at the branch.`}
                      onConfirm={() => finish(run)}
                    >
                      {finishButton}
                    </Popconfirm>
                  )}
                </span>
              ) : null,
            children: (
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                {run.branch?.name || vehicleText(run.vehicle_type, run.vehicle_number) || run.notes ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {[run.branch?.name, vehicleText(run.vehicle_type, run.vehicle_number)].filter(Boolean).join(" · ")}
                    {run.notes ? ` · ${run.notes}` : ""}
                  </Text>
                ) : null}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 8 }}>
                  <Segmented
                    size="small"
                    value={runViewMode[run.id] || "map"}
                    onChange={(val) => setRunViewMode((prev) => ({ ...prev, [run.id]: val }))}
                    options={[
                      { label: "Route Map", value: "map" },
                      { label: `Stops List (${items.length})`, value: "list" },
                    ]}
                  />
                  <Button
                    size="small"
                    icon={<EnvironmentOutlined />}
                    onClick={() => setMapRun(run)}
                  >
                    Fullscreen Map
                  </Button>
                </div>

                {(runViewMode[run.id] || "map") === "map" ? (
                  <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #f0f0f0", marginBottom: 8 }}>
                    <RunRouteMap
                      run={run}
                      mode="pickup"
                      isRider
                      onOpenPickup={onOpenPickup}
                      renderStopActions={(stop, ctx) => renderPickupActions(run, stop, ctx)}
                      height="380px"
                    />
                  </div>
                ) : (
                  <>
                    {items.map((i, index) => {
                      const st = ITEM_STATUS_META[i.status] || { label: i.status, color: "default" };
                      const pr = i.pickupRequest || i.pickup_request || i;
                      const prId = prIdOf(i);
                      const prStatus = prStatusOf(i);
                      const prMeta = PR_STATUS_META[prStatus];
                      const merchantName = pr?.merchant?.name || pr?.merchant?.business_name || pr?.pickup_name || "Merchant";
                      const area = pr?.pickup_area || pr?.area || "Kathmandu";
                      const addr = pr?.pickup_address || "No address";
                      const phone = pr?.pickup_phone;
                      const shipments = i.shipments || pr?.shipments || [];

                      return (
                        <div
                          key={i.id || i.item_id || index}
                          role="button"
                          tabIndex={0}
                          onClick={() => prId && onOpenPickup?.(prId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && prId) onOpenPickup?.(prId);
                          }}
                          style={{
                            display: "flex",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #f0f0f0",
                            background: i.status === "picked_up" ? "#f6ffed" : "#fff",
                            alignItems: "center",
                            cursor: onOpenPickup ? "pointer" : "default",
                          }}
                        >
                          {/* Sequence Badge */}
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: i.status === "picked_up" ? "#52c41a" : "#0891b2",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: 12,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {i.sequence || index + 1}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <Text strong style={{ fontSize: 13 }}>
                                {pr?.request_number || `PR Stop #${index + 1}`} · {merchantName}
                              </Text>
                              <Space size={2}>
                                <Tag color={st.color} style={{ margin: 0, fontSize: 11 }}>
                                  {st.label}
                                </Tag>
                                {prMeta && prMeta.label !== st.label ? (
                                  <Tag color={prMeta.color} style={{ margin: 0, fontSize: 11 }}>
                                    PR: {prMeta.label}
                                  </Tag>
                                ) : null}
                              </Space>
                            </div>
                            <div style={{ fontSize: 11, color: "#666" }}>
                              📍 {area} · {addr}
                            </div>
                            {/* Shipment parcels tracking tags */}
                            <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 3 }}>
                              {shipments.length > 0 ? (
                                shipments.map((s) => (
                                  <Tag key={s.id || s.tracking_number} color="blue" style={{ margin: 0, fontSize: 10, fontFamily: "monospace" }}>
                                    {s.tracking_number}
                                  </Tag>
                                ))
                              ) : (
                                <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>
                                  📦 {pr?.parcel_quantity || 1} pkg
                                </Tag>
                              )}
                            </div>
                          </div>

                          <Space size={4} wrap style={{ justifyContent: "flex-end" }}>
                            {renderPickupActions(run, i, "list")}

                            {onOpenPickup && (
                              <Button
                                size="small"
                                icon={<FileTextOutlined />}
                                disabled={!prId}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenPickup(prId);
                                }}
                                style={{ borderColor: "#0891b2", color: "#0891b2", background: "#fff" }}
                              >
                                Open PR
                              </Button>
                            )}

                            {phone && (
                              <Button
                                size="small"
                                type="text"
                                icon={<PhoneOutlined />}
                                href={`tel:${phone}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}

                            <Button
                              size="small"
                              icon={<CompassOutlined />}
                              onClick={(e) => e.stopPropagation()}
                              href={
                                pr?.pickup_lat && pr?.pickup_lng
                                  ? `https://www.google.com/maps/dir/?api=1&destination=${pr.pickup_lat},${pr.pickup_lng}`
                                  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr + ", " + area)}`
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Map
                            </Button>
                          </Space>
                        </div>
                      );
                    })}

                    {/* Prominent finish prompt when all stops are completed */}
                    {openStops.length === 0 && items.length > 0 && run.status !== "closed" && (
                      <Alert
                        type="success"
                        showIcon
                        message="All stops on this run are completed!"
                        description={`${run.picked_up_count} picked up, ${run.failed_count || 0} failed. Hand over collected parcels at the origin branch.`}
                        action={
                          <Popconfirm
                            title={`Finish ${run.run_number}?`}
                            description="Confirm you have returned to branch and are handing over collected parcels."
                            onConfirm={() => finish(run)}
                          >
                            <Button type="primary" icon={<CheckCircleOutlined />} loading={finishing === run.id}>
                              Finish Run & Handover
                            </Button>
                          </Popconfirm>
                        }
                        style={{ marginTop: 12 }}
                      />
                    )}
                  </>
                )}
              </Space>
            ),
          };
        })}
      />

      {/* Route Map Modal for Rider */}
      <Modal
        title={`Pickup Route Map · ${mapRun?.run_number || "Pickup Run"}`}
        open={Boolean(mapRun)}
        width={920}
        onCancel={() => setMapRun(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setMapRun(null)}>
            Close
          </Button>,
        ]}
        destroyOnHidden
      >
        {mapRun && (
          <RunRouteMap
            run={mapRun}
            mode="pickup"
            isRider
            onOpenPickup={
              onOpenPickup
                ? (id) => {
                    setMapRun(null);
                    onOpenPickup(id);
                  }
                : null
            }
            renderStopActions={(stop, ctx) => renderPickupActions(mapRun, stop, ctx, { fromModal: true })}
            height="480px"
          />
        )}
      </Modal>
    </Card>
  );
}
