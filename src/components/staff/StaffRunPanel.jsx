"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  Modal,
  Progress,
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
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
  PhoneOutlined,
  ReloadOutlined,
  SendOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import {
  staffBagRun,
  staffFinishRun,
  staffGetRuns,
  staffMissingRun,
  staffStartRun,
  staffUnbagRun,
  runErrorText,
} from "@/services/admin/deliveryRunService";
import { startBrowserRiderLocation } from "@/services/admin/riderLocationService";
import {
  ITEM_STATUS_META,
  OUTCOME_META,
  RUN_STATUS_META,
  areaOf,
  rs,
  vehicleText,
} from "@/components/admin/delivery-runs/runMeta";
import RunRouteMap from "@/components/maps/RunRouteMap";

const { Text } = Typography;

/**
 * Rider view of assigned DR runs on /staff/deliveries: parcels in stop order.
 * Assigned run = collect & bag at the warehouse (Bag / scan, Unbag, Missing);
 * Start run unlocks when every parcel is bagged. Route Map is the default view.
 * Tapping a stop opens the normal delivery drawer, so arrived / POD cash or
 * online / delivered / failed keep working exactly as before.
 *
 * props:
 *  - deliveries: the rider's delivery rows (to open the matching drawer)
 *  - onOpenDelivery(delivery)
 *  - onChanged(): reload deliveries after the run is started
 *  - onDeliveryAction(delivery, action): accept | out | arrive | complete | fail
 *    (page runs the legacy endpoints and the POD / COD / fail modals)
 *  - busyAction: page's in-flight action key ("accept:12", ...)
 */
function getGoogleMapsDirectionsUrl(stop) {
  const lat = stop?.latitude || stop?.point?.lat || stop?.shipment?.delivery_latitude;
  const lng = stop?.longitude || stop?.point?.lng || stop?.shipment?.delivery_longitude;
  if (lat && lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  const addr = encodeURIComponent(`${stop?.area || ""} ${stop?.address || stop?.shipment?.delivery_address || ""}`.trim());
  return `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
}

export default function StaffRunPanel({
  deliveries = [],
  onOpenDelivery,
  onChanged,
  onDeliveryAction,
  busyAction = "",
  onRunsLoaded,
  legacyActiveCount = 0,
  onShowList,
}) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [starting, setStarting] = useState(null);
  const [finishing, setFinishing] = useState(null);
  const [mapRun, setMapRun] = useState(null);
  const [mobileNavRun, setMobileNavRun] = useState(null);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [gpsLiveInfo, setGpsLiveInfo] = useState(null);
  const [runViewMode, setRunViewMode] = useState({});
  const [bagBusy, setBagBusy] = useState("");
  const [scanText, setScanText] = useState({});
  const [missing, setMissing] = useState(null); // { run, item }
  const [missingNote, setMissingNote] = useState("");
  const onRunsLoadedRef = useRef(onRunsLoaded);
  onRunsLoadedRef.current = onRunsLoaded;
  // item ids already marked New per run, so a refresh only announces newly added parcels.
  const seenNewRef = useRef(null);

  // Auto-start high-precision GPS tracking when any run is out_for_delivery
  const activeOutRun = useMemo(() => runs.find((r) => r.status === "out_for_delivery"), [runs]);

  useEffect(() => {
    if (!activeOutRun?.id) {
      setGpsLiveInfo(null);
      return;
    }

    const stopTracking = startBrowserRiderLocation({
      runId: activeOutRun.id,
      intervalMs: 5000,
      onSuccess: (res, payload) => {
        setGpsLiveInfo({
          lat: payload.lat,
          lng: payload.lng,
          speed: payload.speed,
          heading: payload.heading,
          accuracy: payload.accuracy,
          time: new Date().toLocaleTimeString(),
        });
      },
      onError: (err) => {
        console.warn("Rider auto GPS signal:", err?.message);
      },
    });

    return () => {
      stopTracking?.();
    };
  }, [activeOutRun?.id]);

  const announceNew = (list) => {
    const first = seenNewRef.current === null;
    const seen = seenNewRef.current || new Set();
    list.forEach((r) => {
      if (r.status !== "assigned") return;
      const fresh = (r.items || []).filter((i) => i.is_new && !seen.has(`${r.id}:${i.item_id}`));
      fresh.forEach((i) => seen.add(`${r.id}:${i.item_id}`));
      if (!first && fresh.length) {
        message.warning({
          content: `${fresh.length} new parcel${fresh.length === 1 ? "" : "s"} added to ${r.run_number} - collect and bag`,
          duration: 8,
          key: `run-new-${r.id}`,
        });
      }
    });
    seenNewRef.current = seen;
  };

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await staffGetRuns();
      const list = data.active || [];
      announceNew(list);
      setRuns(list);
      setLoadError("");
      setMapRun((prev) => (prev ? list.find((r) => r.id === prev.id) || prev : prev));
      onRunsLoadedRef.current?.(list);
    } catch (e) {
      // Keep the last good list on a refresh error instead of blanking the panel.
      if (!silent) setLoadError(runErrorText(e, "Could not load your delivery runs."));
    } finally {
      setLoaded(true);
      if (!silent) setLoading(false);
    }
  }, []);

  // Reload whenever the rider's deliveries reload (after any delivery action).
  useEffect(() => {
    load();
  }, [load, deliveries]);

  // New runs / admin edits show up without a manual refresh (every 30s while visible).
  useEffect(() => {
    const tick = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") load({ silent: true });
    };
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [load]);

  const applyRun = (fresh) => {
    if (fresh?.id) {
      setRuns((prev) => prev.map((r) => (r.id === fresh.id ? fresh : r)));
      setMapRun((prev) => (prev && prev.id === fresh.id ? fresh : prev));
    }
  };

  const start = async (run) => {
    setStarting(run.id);
    try {
      const res = await staffStartRun(run.id);
      message.success(res?.message || `${run.run_number} started.`);
      await load();
      onChanged?.();
      // Auto-open mobile navigation mode
      setMobileNavRun(run);
      setCurrentStopIndex(0);
    } catch (e) {
      message.error(runErrorText(e, "Could not start the run."), 6);
      load({ silent: true });
    } finally {
      setStarting(null);
    }
  };

  /** Bag one stop: payload { item_id } or { code } (scanned / typed tracking number). */
  const bag = async (run, payload, key) => {
    if (bagBusy) return false;
    setBagBusy(key);
    try {
      const res = await staffBagRun(run.id, payload);
      applyRun(res?.data?.run);
      message.success(res?.message || "Bagged.");
      if (payload.code) setScanText((prev) => ({ ...prev, [run.id]: "" }));
      onChanged?.();
      return true;
    } catch (e) {
      message.error(runErrorText(e, "Could not bag the parcel."), 5);
      return false;
    } finally {
      setBagBusy("");
    }
  };

  const unbag = async (run, item) => {
    if (bagBusy) return;
    setBagBusy(`unbag:${item.item_id}`);
    try {
      const res = await staffUnbagRun(run.id, item.item_id);
      applyRun(res?.data?.run);
      message.success(res?.message || "Taken out of the bag.");
      onChanged?.();
    } catch (e) {
      message.error(runErrorText(e, "Could not unbag the parcel."));
    } finally {
      setBagBusy("");
    }
  };

  const reportMissing = async () => {
    if (!missing) return;
    const { run, item } = missing;
    setBagBusy(`missing:${item.item_id}`);
    try {
      const res = await staffMissingRun(run.id, item.item_id, missingNote.trim() || null);
      applyRun(res?.data?.run);
      message.success(res?.message || "Reported missing.");
      setMissing(null);
      setMissingNote("");
      onChanged?.();
    } catch (e) {
      message.error(runErrorText(e, "Could not report the parcel."));
    } finally {
      setBagBusy("");
    }
  };

  const bagCounts = (run) => {
    const items = (run.items || []).filter((i) => i.status !== "removed");
    const bagged = run.bagged_count ?? items.filter((i) => i.status === "bagged").length;
    const total = items.length || Number(run.expected_count) || 0;
    const unbagged = items.filter((i) => i.status === "queued");
    return { bagged, total, unbagged, canStart: run.can_start ?? (total > 0 && unbagged.length === 0) };
  };

  /** Warehouse actions for a stop while the run is being collected (status assigned). */
  const renderBagActions = (run, item, context = "list") => {
    const stop = (fn) => (e) => {
      e?.stopPropagation?.();
      fn();
    };
    if (item.status === "queued") {
      return [
        item.is_new ? (
          <Tag key="new" color="magenta" style={{ margin: 0, alignSelf: "center" }}>
            New
          </Tag>
        ) : null,
        <Button
          key="bag"
          size="small"
          type="primary"
          icon={<InboxOutlined />}
          loading={bagBusy === `bag:${item.item_id}`}
          disabled={Boolean(bagBusy) && bagBusy !== `bag:${item.item_id}`}
          onClick={stop(() => bag(run, { item_id: item.item_id }, `bag:${item.item_id}`))}
        >
          Bag
        </Button>,
        <Button
          key="missing"
          size="small"
          danger
          type={context === "list" ? "text" : "default"}
          icon={<ExclamationCircleOutlined />}
          disabled={Boolean(bagBusy)}
          onClick={stop(() => {
            setMissingNote("");
            setMissing({ run, item });
          })}
        >
          Missing
        </Button>,
      ];
    }
    if (item.status === "bagged") {
      return [
        <Button
          key="unbag"
          size="small"
          icon={<UndoOutlined />}
          loading={bagBusy === `unbag:${item.item_id}`}
          disabled={Boolean(bagBusy) && bagBusy !== `unbag:${item.item_id}`}
          onClick={stop(() => unbag(run, item))}
        >
          Unbag
        </Button>,
        <Button
          key="missing"
          size="small"
          danger
          type="text"
          icon={<ExclamationCircleOutlined />}
          disabled={Boolean(bagBusy)}
          onClick={stop(() => {
            setMissingNote("");
            setMissing({ run, item });
          })}
        />,
      ];
    }
    return null;
  };

  const finish = async (run) => {
    setFinishing(run.id);
    try {
      const res = await staffFinishRun(run.id);
      message.success(res.message || "Run finished.");
      await load();
      onChanged?.();
    } catch (e) {
      message.error(runErrorText(e, "Could not finish the run."));
    } finally {
      setFinishing(null);
    }
  };

  const findRow = (item) =>
    deliveries.find(
      (d) =>
        (item.delivery_id && Number(d.id) === Number(item.delivery_id)) ||
        (item.shipment_id && Number(d.shipment_id) === Number(item.shipment_id)) ||
        (item.tracking_number &&
          (d.shipment?.tracking_number === item.tracking_number ||
            d.tracking_number === item.tracking_number))
    );

  /**
   * Next workflow buttons for one stop, by the rider's delivery status
   * (legacy drawer rules): assigned → Accept / Out for delivery ·
   * accepted → Out for delivery · out_for_delivery → Arrived, then
   * Collect & complete (COD) / Confirm & complete (prepaid) · Fail while out.
   */
  const renderDeliveryActions = (run, item, context = "list", { fromModal = false } = {}) => {
    // Collecting at the warehouse: only Bag / Unbag / Missing until the run starts.
    if (run.status === "assigned") return renderBagActions(run, item, context);
    if (!onDeliveryAction) return null;
    if (["delivered", "failed", "removed"].includes(item.status)) return null;
    const row = findRow(item);
    if (!row) {
      if (context !== "list") return null;
      return (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {["open", "assigned"].includes(run.status) ? "Start the run to begin" : "Refresh to load this parcel"}
        </Text>
      );
    }
    const s = String(row.status || "").toLowerCase();
    const arrived = !!(row.arrived_at || item.arrived);
    const busy = Boolean(busyAction);
    const act = (action) => (e) => {
      e?.stopPropagation?.();
      if (fromModal && ["arrive", "complete", "fail"].includes(action)) setMapRun(null);
      onDeliveryAction(row, action);
    };
    const btn = (action, label, icon, extra = {}) => (
      <Button
        key={action}
        size="small"
        type="primary"
        icon={icon}
        disabled={busy && !String(busyAction).endsWith(`:${row.id}`)}
        loading={String(busyAction) === `${action}:${row.id}`}
        onClick={act(action)}
        {...extra}
      >
        {label}
      </Button>
    );
    const cod = Number(item.cod_amount) > 0;
    const out = [];
    if (s === "assigned") out.push(btn("accept", "Accept", <CheckCircleOutlined />));
    if (["assigned", "accepted"].includes(s))
      out.push(btn("out", "Out for delivery", <SendOutlined />, s === "assigned" ? { type: "default" } : {}));
    if (s === "out_for_delivery" && !arrived) out.push(btn("arrive", "Arrived", <EnvironmentOutlined />));
    if (s === "out_for_delivery" && arrived)
      out.push(btn("complete", cod ? `Collect ${rs(item.cod_amount)} & complete` : "Confirm & complete", <CheckCircleOutlined />));
    if (s === "out_for_delivery")
      out.push(
        <Button key="fail" size="small" danger icon={<CloseCircleOutlined />} disabled={busy} onClick={act("fail")}>
          Failed
        </Button>
      );
    return out.length ? out : null;
  };

  const openStop = (item, run = null) => {
    if (run?.status === "assigned" || ["queued", "bagged"].includes(item.status)) {
      message.info(
        item.status === "bagged"
          ? `${item.tracking_number || "Parcel"} is bagged. It opens here after you start the run.`
          : `Find ${item.tracking_number || "this parcel"} in the warehouse and tap Bag (or scan it).`
      );
      return;
    }
    const row = findRow(item);
    if (row) {
      onOpenDelivery?.(row);
    } else if (item.status === "queued") {
      message.info("Start the run first. The parcel opens here once it is out for delivery.");
    } else {
      message.info("Refresh deliveries to open this parcel.");
    }
  };

  if (!runs.length) {
    const emptyText = !loaded
      ? "Loading your delivery runs..."
      : "No active delivery run. When the branch assigns you a run (DR), it shows here with the parcels to collect and bag.";
    return (
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 12, borderTop: "3px solid #13c2c2" }}
        title={
          <Space>
            <CarOutlined style={{ color: "#13c2c2" }} />
            <span>My delivery runs (DR)</span>
          </Space>
        }
        extra={<Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => load()} />}
      >
        {loadError ? <Alert type="error" showIcon message={loadError} style={{ marginBottom: 8 }} /> : null}
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText}>
          {legacyActiveCount > 0 && onShowList ? (
            <Button type="primary" onClick={onShowList}>
              Open my {legacyActiveCount} individual deliver{legacyActiveCount === 1 ? "y" : "ies"}
            </Button>
          ) : null}
        </Empty>
      </Card>
    );
  }

  return (
    <Card
      size="small"
      style={{ marginBottom: 16, borderRadius: 12, borderTop: "3px solid #13c2c2" }}
      title={
        <Space>
          <CarOutlined />
          <span>My delivery runs</span>
        </Space>
      }
      extra={<Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => load()} />}
    >
      {loadError ? <Alert type="warning" showIcon message={loadError} style={{ marginBottom: 8 }} /> : null}
      <Collapse
        size="small"
        defaultActiveKey={runs.slice(0, 1).map((r) => String(r.id))}
        items={runs.map((run) => {
          const meta = RUN_STATUS_META[run.status] || { label: run.status, color: "default" };
          const items = (run.items || []).filter((i) => i.status !== "removed");
          const openStops = items.filter((i) => !["delivered", "failed", "removed"].includes(i.status));
          const collecting = run.status === "assigned";
          const bc = bagCounts(run);

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
                  {collecting ? `Bagged ${bc.bagged}/${bc.total}` : `${run.delivered_count}/${run.expected_count} delivered`} · COD {rs(run.cod_expected)}
                  {Number(run.cod_collected) ? ` · cash ${rs(run.cod_collected)}` : ""}
                </Text>
              </Space>
            ),
            extra:
              run.status === "assigned" ? (
                <span onClick={(e) => e.stopPropagation()} role="presentation">
                  {bc.canStart ? (
                    <Popconfirm
                      title={`Start ${run.run_number}?`}
                      description={`Leave the branch with ${bc.bagged} bagged parcel${bc.bagged === 1 ? "" : "s"} (COD ${rs(run.cod_expected)}).`}
                      onConfirm={() => start(run)}
                    >
                      <Button type="primary" size="small" icon={<SendOutlined />} loading={starting === run.id}>
                        Start run
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Tooltip
                      title={
                        bc.total
                          ? `Bag every parcel first (${bc.bagged}/${bc.total} bagged). Report a parcel missing if you cannot find it.`
                          : "This run has no parcels."
                      }
                    >
                      <Button type="primary" size="small" icon={<SendOutlined />} disabled>
                        Start run
                      </Button>
                    </Tooltip>
                  )}
                </span>
              ) : ["out_for_delivery", "completed"].includes(run.status) ? (
                <span onClick={(e) => e.stopPropagation()} role="presentation">
                  {openStops.length > 0 ? (
                    <Tooltip
                      title={`Finish run unlocks when every stop is delivered or failed. Still open: ${openStops
                        .map((i) => `#${i.sequence} ${i.tracking_number || ""}`.trim())
                        .join(", ")}. Mark each delivered or failed first.`}
                    >
                      {finishButton}
                    </Tooltip>
                  ) : (
                    <Popconfirm
                      title={`Finish ${run.run_number}?`}
                      description={`${run.delivered_count} delivered, ${run.failed_count} failed. Hand over cash ${rs(
                        run.cod_collected
                      )} and failed parcels at the branch.`}
                      onConfirm={() => finish(run)}
                    >
                      {finishButton}
                    </Popconfirm>
                  )}
                </span>
              ) : null,
            children: (
              <Space direction="vertical" style={{ width: "100%" }} size={6}>
                {run.branch?.name || vehicleText(run.vehicle_type, run.vehicle_number) || run.notes ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {[run.branch?.name, vehicleText(run.vehicle_type, run.vehicle_number)].filter(Boolean).join(" · ")}
                    {run.notes ? ` · ${run.notes}` : ""}
                  </Text>
                ) : null}
                {collecting && Number(run.new_count) > 0 ? (
                  <Alert
                    type="warning"
                    showIcon
                    message={`${run.new_count} new parcel${Number(run.new_count) === 1 ? "" : "s"} added to ${run.run_number} - collect and bag`}
                    description={`Find ${Number(run.new_count) === 1 ? "it" : "them"} in the warehouse (marked New), bag or report missing. Start unlocks again after that.`}
                  />
                ) : null}
                {collecting ? (
                  <div style={{ border: "1px solid #91caff", background: "#f0f7ff", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text strong>
                        <InboxOutlined /> Collect &amp; bag · Bagged {bc.bagged}/{bc.total}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {bc.canStart ? "All bagged - tap Start run when you leave." : "Start unlocks when every parcel is bagged."}
                      </Text>
                    </div>
                    <Progress
                      percent={bc.total ? Math.round((bc.bagged / bc.total) * 100) : 0}
                      size="small"
                      status={bc.canStart ? "success" : "active"}
                      showInfo={false}
                      style={{ margin: "4px 0 6px" }}
                    />
                    <Input.Search
                      placeholder="Scan or type tracking no. and press Enter"
                      enterButton="Bag"
                      allowClear
                      value={scanText[run.id] || ""}
                      onChange={(e) => setScanText((prev) => ({ ...prev, [run.id]: e.target.value }))}
                      loading={bagBusy === `scan:${run.id}`}
                      onSearch={(value) => {
                        const code = String(value || "").trim();
                        if (code) bag(run, { code }, `scan:${run.id}`);
                      }}
                      autoComplete="off"
                    />
                    {bc.canStart ? (
                      <Popconfirm
                        title={`Start ${run.run_number}?`}
                        description={`Leave the branch with ${bc.bagged} bagged parcel${bc.bagged === 1 ? "" : "s"} (COD ${rs(run.cod_expected)}).`}
                        onConfirm={() => start(run)}
                      >
                        <Button type="primary" block icon={<SendOutlined />} loading={starting === run.id} style={{ marginTop: 8 }}>
                          Start run · {bc.bagged} parcel{bc.bagged === 1 ? "" : "s"}
                        </Button>
                      </Popconfirm>
                    ) : null}
                  </div>
                ) : null}
                {run.status === "completed" ? (
                  <Text type="success">
                    All stops done. Hand over cash {rs(run.cod_collected)} and returned parcels at the branch.
                  </Text>
                ) : null}

                {run.status === "out_for_delivery" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                      borderRadius: 10,
                      margin: "8px 0 12px",
                      color: "#ffffff",
                      flexWrap: "wrap",
                      gap: 8,
                      boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>
                        🏍️ Fullscreen Rider Navigation Active
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
                        {gpsLiveInfo
                          ? `🟢 GPS Live (±${Math.round(gpsLiveInfo.accuracy || 3)}m) • Auto-tracking on`
                          : "🟢 High-accuracy auto GPS streaming active"}
                      </div>
                    </div>
                    <Button
                      type="default"
                      size="middle"
                      icon={<CompassOutlined />}
                      onClick={() => {
                        setMobileNavRun(run);
                        setCurrentStopIndex(0);
                      }}
                      style={{ fontWeight: 800, background: "#ffffff", color: "#0284c7", border: "none" }}
                    >
                      Open Mobile Navigation
                    </Button>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4, marginBottom: 8 }}>
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
                    icon={<CompassOutlined />}
                    onClick={() => {
                      setMobileNavRun(run);
                      setCurrentStopIndex(0);
                    }}
                    style={{ fontWeight: 700, borderColor: "#0284c7", color: "#0284c7" }}
                  >
                    Mobile Fullscreen
                  </Button>
                </div>

                {(runViewMode[run.id] || "map") === "map" ? (
                  <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #f0f0f0", marginBottom: 8 }}>
                    <RunRouteMap
                      run={run}
                      mode="delivery"
                      isRider
                      onOpenDelivery={(id) => {
                        const stopItem = items.find((x) => Number(x.shipment_id) === Number(id)) || { shipment_id: id };
                        openStop(stopItem, run);
                      }}
                      onStopAction={(stop) => openStop(stop, run)}
                      renderStopActions={(stop, ctx) => renderDeliveryActions(run, stop, ctx)}
                      height="380px"
                    />
                  </div>
                ) : (
                  <>
                    {items.map((i) => {
                      const st = ITEM_STATUS_META[i.status] || { label: i.status, color: "default" };
                      const outcome = OUTCOME_META[i.outcome];
                      const done = ["delivered", "failed"].includes(i.status);

                      return (
                        <div
                          key={i.item_id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openStop(i, run)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") openStop(i, run);
                          }}
                          style={{
                            display: "flex",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #f0f0f0",
                            background: done ? "#fafafa" : "#fff",
                            cursor: "pointer",
                            opacity: done ? 0.75 : 1,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              minWidth: 28,
                              height: 28,
                              borderRadius: 14,
                              background: done ? "#d9d9d9" : "#13c2c2",
                              color: "#fff",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {i.sequence}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Space size={4} wrap>
                              <Text strong style={{ fontFamily: "monospace", fontSize: 12 }}>
                                {i.tracking_number}
                              </Text>
                              <Tag color={st.color} style={{ margin: 0 }}>
                                {i.status === "out_for_delivery" && i.arrived ? "Arrived" : st.label}
                              </Tag>
                              {i.is_new ? (
                                <Tag color="magenta" style={{ margin: 0 }}>
                                  New
                                </Tag>
                              ) : null}
                              {outcome ? (
                                <Tag color={outcome.color} style={{ margin: 0 }}>
                                  {outcome.label}
                                </Tag>
                              ) : null}
                              {Number(i.cod_amount) > 0 ? (
                                <Tag color="gold" style={{ margin: 0 }}>
                                  COD {rs(i.cod_amount)}
                                </Tag>
                              ) : (
                                <Tag style={{ margin: 0 }}>Prepaid</Tag>
                              )}
                            </Space>
                            <div style={{ fontSize: 13 }}>{i.receiver_name || "-"}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {areaOf(i)} · {i.delivery_address || "-"}
                            </Text>
                            {i.status === "failed" && i.reason ? (
                              <div style={{ fontSize: 11, color: "#cf1322" }}>{i.reason}</div>
                            ) : null}
                          </div>

                          <Space size={4} wrap style={{ justifyContent: "flex-end" }}>
                            {renderDeliveryActions(run, i, "list")}
                            {!done && !collecting && (
                              <Button
                                size="small"
                                icon={<FileTextOutlined />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openStop(i, run);
                                }}
                                style={{ borderColor: "#0891b2", color: "#0891b2", background: "#fff" }}
                              >
                                Open
                              </Button>
                            )}

                            {i.receiver_phone ? (
                              <Button
                                size="small"
                                type="text"
                                icon={<PhoneOutlined />}
                                href={`tel:${i.receiver_phone}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : null}
                          </Space>
                        </div>
                      );
                    })}

                    {/* Bottom finish prompt when all stops done */}
                    {openStops.length === 0 && items.length > 0 && ["out_for_delivery", "completed"].includes(run.status) && (
                      <Alert
                        type="success"
                        showIcon
                        message="All delivery stops completed!"
                        description={`${run.delivered_count} delivered, ${run.failed_count} failed. Return to branch with cash ${rs(
                          run.cod_collected
                        )} and failed parcels.`}
                        action={
                          <Popconfirm
                            title={`Finish ${run.run_number}?`}
                            description={`Confirm you are returning to branch with cash ${rs(
                              run.cod_collected
                            )} and ${run.failed_count} returned parcels.`}
                            onConfirm={() => finish(run)}
                          >
                            <Button type="primary" icon={<CheckCircleOutlined />} loading={finishing === run.id}>
                              Finish Run & Handover
                            </Button>
                          </Popconfirm>
                        }
                        style={{ marginTop: 10 }}
                      />
                    )}
                  </>
                )}
              </Space>
            ),
          };
        })}
      />

      {/* FULLSCREEN MOBILE NAVIGATION VIEW FOR RIDER */}
      {mobileNavRun && (() => {
        const navItems = mobileNavRun.items || [];
        const openNavStops = navItems.filter((i) => !["delivered", "failed", "removed"].includes(i.status));
        const activeNavStop = openNavStops[currentStopIndex] || openNavStops[0] || navItems[0];
        const totalNavStops = navItems.length;

        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              background: "#0f172a",
              display: "flex",
              flexDirection: "column",
              height: "100dvh",
              width: "100vw",
              overflow: "hidden",
            }}
          >
            {/* 1. TOP MOBILE HUD */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.95)",
                backdropFilter: "blur(12px)",
                padding: "10px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#fff",
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setMobileNavRun(null)}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 34,
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ✕
                </button>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🏍️ {mobileNavRun.run_number}</span>
                    <span style={{ fontSize: 11, background: "#0284c7", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                      Stop {currentStopIndex + 1}/{totalNavStops}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                    <span>
                      {gpsLiveInfo
                        ? `GPS Active (±${Math.round(gpsLiveInfo.accuracy || 3)}m) • ${Math.round(gpsLiveInfo.speed || 0)} km/h`
                        : "Streaming Real GPS to Dispatch"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen?.();
                    } else {
                      document.documentElement.requestFullscreen?.();
                    }
                  }}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#38bdf8",
                    borderRadius: 8,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ⛶ Full
                </button>
              </div>
            </div>

            {/* 2. FULLSCREEN INTERACTIVE MAP (flex: 1) */}
            <div style={{ flex: 1, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
              <RunRouteMap
                run={mobileNavRun}
                mode="delivery"
                isRider
                height="100%"
                onOpenDelivery={(id) => {
                  const stopItem = (mobileNavRun.items || []).find((x) => Number(x.shipment_id) === Number(id)) || { shipment_id: id };
                  openStop(stopItem, mobileNavRun);
                }}
                onStopAction={(stop) => openStop(stop, mobileNavRun)}
                renderStopActions={(stop, ctx) => renderDeliveryActions(mobileNavRun, stop, ctx, { fromModal: true })}
              />
            </div>

            {/* 3. BOTTOM DOCKED STOP DETAILS CARD */}
            {activeNavStop && (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px 16px 0 0",
                  boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
                  padding: "14px 16px",
                  zIndex: 20,
                  color: "#0f172a",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ background: "#2563eb", color: "#fff", fontWeight: 800, fontSize: 12, padding: "2px 8px", borderRadius: 12 }}>
                      Stop #{activeNavStop.sequence}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                      {activeNavStop.shipment?.recipient_name || activeNavStop.customer_name || "Recipient"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      disabled={currentStopIndex <= 0}
                      onClick={() => setCurrentStopIndex((i) => Math.max(0, i - 1))}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: currentStopIndex > 0 ? "pointer" : "not-allowed",
                        opacity: currentStopIndex > 0 ? 1 : 0.4,
                      }}
                    >
                      ◀ Prev
                    </button>
                    <button
                      type="button"
                      disabled={currentStopIndex >= openNavStops.length - 1}
                      onClick={() => setCurrentStopIndex((i) => Math.min(openNavStops.length - 1, i + 1))}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        cursor: currentStopIndex < openNavStops.length - 1 ? "pointer" : "not-allowed",
                        opacity: currentStopIndex < openNavStops.length - 1 ? 1 : 0.4,
                      }}
                    >
                      Next ▶
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, lineHeight: 1.35 }}>
                  📍 {activeNavStop.area || ""} {activeNavStop.address || activeNavStop.shipment?.delivery_address || ""}
                </div>

                {Number(activeNavStop.cod_amount || activeNavStop.shipment?.cod_amount) > 0 && (
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#059669", marginBottom: 10 }}>
                    💵 Collect COD: Rs {Number(activeNavStop.cod_amount || activeNavStop.shipment?.cod_amount).toFixed(2)}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: 8 }}>
                  <a
                    href={getGoogleMapsDirectionsUrl(activeNavStop)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "9px 6px",
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: 12,
                      textDecoration: "none",
                    }}
                  >
                    🗺️ Maps
                  </a>

                  <a
                    href={`tel:${activeNavStop.phone || activeNavStop.shipment?.recipient_phone || ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "9px 6px",
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      borderRadius: 8,
                      color: "#047857",
                      fontWeight: 700,
                      fontSize: 12,
                      textDecoration: "none",
                    }}
                  >
                    📞 Call
                  </a>

                  <button
                    type="button"
                    onClick={() => openStop(activeNavStop, mobileNavRun)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: "9px 6px",
                      background: "#0284c7",
                      border: "none",
                      borderRadius: 8,
                      color: "#ffffff",
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    ✅ Deliver Stop
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <Modal
        title={`Route Map · ${mapRun?.run_number || "Delivery Run"}`}
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
            mode="delivery"
            isRider
            onOpenDelivery={(id) => {
              const stopItem = (mapRun.items || []).find((x) => Number(x.shipment_id) === Number(id)) || { shipment_id: id };
              if (mapRun.status !== "assigned") setMapRun(null);
              openStop(stopItem, mapRun);
            }}
            onStopAction={(stop) => {
              if (mapRun.status !== "assigned") setMapRun(null);
              openStop(stop, mapRun);
            }}
            renderStopActions={(stop, ctx) => renderDeliveryActions(mapRun, stop, ctx, { fromModal: true })}
            height="480px"
          />
        )}
      </Modal>

      <Modal
        title={missing ? `Report ${missing.item.tracking_number || "parcel"} missing` : "Report missing"}
        open={Boolean(missing)}
        onCancel={() => setMissing(null)}
        okText="Report missing"
        okButtonProps={{ danger: true, loading: Boolean(missing) && bagBusy === `missing:${missing?.item?.item_id}` }}
        onOk={reportMissing}
        destroyOnHidden
      >
        <p style={{ marginBottom: 8 }}>
          The parcel leaves {missing?.run?.run_number} and goes back to the branch&apos;s Ready for delivery queue. The branch is told.
        </p>
        <Input.TextArea
          rows={2}
          maxLength={200}
          placeholder="Note for the branch (optional), e.g. not on shelf B3"
          value={missingNote}
          onChange={(e) => setMissingNote(e.target.value)}
        />
      </Modal>
    </Card>
  );
}
