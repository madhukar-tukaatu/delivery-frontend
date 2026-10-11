"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Modal,
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
  NodeIndexOutlined,
} from "@ant-design/icons";
import { usePermissions } from "@/hooks/usePermission";
import {
  getDeliveries,
  getDeliverySummary,
  getAssignableRiders,
  assignDeliveryRider,
  bulkAssignDeliveries,
  failDelivery,
} from "@/services/admin/deliveryService";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import AreaAssignmentMap from "@/features/routing/AreaAssignmentMap";
import StatCard, { StatCardGrid } from "@/components/admin/ui/StatCard";
import { formatMerchantLabel } from "@/lib/merchantLabel";
import { refreshMenuBadges } from "@/hooks/useMenuBadges";
import { CreateRunModal } from "@/components/admin/delivery-runs/DeliveryRunBoard";
import DeliveryRunDetail from "@/components/admin/delivery-runs/DeliveryRunDetail";
import { RUN_STATUS_META } from "@/components/admin/delivery-runs/runMeta";

const { Text } = Typography;
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

/**
 * One status filter drives the coverage map, the list and the table. Only the
 * chosen status is fetched (lazily, cached per status) - counts come from the
 * lightweight /admin/deliveries/summary endpoint.
 */
const STATUS_TABS = [
  // "ready" = pending and not on a DR yet; "planned" = pending parcels already on
  // a DR with its rider (they count as Assigned until the run is dispatched).
  { key: "pending", label: "Ready to Assign", statuses: ["ready"], countKeys: ["ready"], hexOf: "pending" },
  { key: "assigned", label: "Assigned", statuses: ["assigned", "planned"], countKeys: ["assigned", "planned"] },
  { key: "accepted", label: "Accepted", statuses: ["accepted"] },
  { key: "out_for_delivery", label: "Out for Delivery", statuses: ["out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "failed", label: "Failed", statuses: ["failed"] },
  { key: "all", label: "All", statuses: [] },
];

const DEFAULT_STATUS = "pending";

function tabCount(tab, counts) {
  if (tab.key === "all") return counts.all ?? 0;
  return (tab.countKeys || tab.statuses).reduce((sum, k) => sum + Number(counts[k] || 0), 0);
}

function tabHex(tab) {
  return tab.key === "all" ? BRAND : statusMeta(tab.hexOf || tab.statuses[0]).hex;
}
const LEGACY_TAB_TO_STATUS = { ready: "pending", runs: "pending", all: "all", assigned: "assigned" };

function readStatusFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("status") || LEGACY_TAB_TO_STATUS[params.get("tab")] || params.get("tab");
  return STATUS_TABS.some((t) => t.key === raw) ? raw : null;
}

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

/** Post-complete money state for branch managers. */
function moneyFollowUp(shipment = {}) {
  const paymentType = String(shipment.payment_type || "").toLowerCase();
  const podStatus = String(shipment.pod_status || "").toLowerCase();
  const settlementStatus = String(shipment.settlement_status || "").toLowerCase();
  const pod = isPod(paymentType);
  const amount = Number(shipment.total_collectable_amount || shipment.pod_amount || 0);

  if (settlementStatus === "settled" || settlementStatus === "processing") {
    return {
      kind: settlementStatus,
      label: settlementStatus === "settled" ? "Settled with merchant" : "Settlement processing",
      color: settlementStatus === "settled" ? "success" : "processing",
      linkSettlements: settlementStatus === "processing",
    };
  }

  if (pod && amount > 0 && (podStatus === "collected" || settlementStatus === "pending_deposit")) {
    return {
      kind: "pod_cash",
      label: "Cash with rider - deposit at branch",
      color: "orange",
      linkSettlements: true,
    };
  }

  if (pod && (podStatus === "deposited" || settlementStatus === "ready") && podStatus !== "paid_direct") {
    return {
      kind: "ready",
      label: "Deposited - ready to settle",
      color: "blue",
      linkSettlements: true,
    };
  }

  if (pod && podStatus === "paid_direct") {
    return {
      kind: "pod_online",
      label:
        settlementStatus === "ready"
          ? "Online paid to merchant - delivery fee may still settle"
          : "Online paid to merchant - no cash pool",
      color: "green",
      linkSettlements: settlementStatus === "ready",
    };
  }

  if (!pod || amount <= 0) {
    return {
      kind: "prepaid",
      label:
        settlementStatus === "ready"
          ? "Prepaid - merchant delivery fee to settle"
          : "Prepaid - complete (no door collection)",
      color: settlementStatus === "ready" ? "blue" : "default",
      linkSettlements: settlementStatus === "ready",
    };
  }

  return {
    kind: "other",
    label: `POD ${podStatus || "-"} / ${settlementStatus || "-"}`,
    color: "default",
    linkSettlements: ["pending_deposit", "ready"].includes(settlementStatus),
  };
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** DR chip for a delivery that is (or was) on a delivery run. */
function RunChip({ run, onOpen }) {
  if (!run) return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
  const meta = RUN_STATUS_META[run.status] || { label: run.status, color: "default" };
  return (
    <Tooltip title={`${meta.label}${run.sequence ? ` · stop ${run.sequence}` : ""} - click to open`}>
      <Tag
        color={run.active ? meta.color : "default"}
        style={{ margin: 0, cursor: "pointer", fontFamily: "monospace" }}
        onClick={() => onOpen?.(run.id)}
      >
        {run.run_number}
        {run.sequence ? ` #${run.sequence}` : ""}
      </Tag>
    </Tooltip>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function DeliveriesPage() {
  const { can, branchId, isSuperAdmin } = usePermissions();

  const [typeTab, setTypeTab] = useState("all");
  const [statusTab, setStatusTab] = useState(DEFAULT_STATUS);
  const [urlReady, setUrlReady] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [rows, setRows] = useState([]);
  const [mapOpen, setMapOpen] = useState(true);
  const [mapRows, setMapRows] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [counts, setCounts] = useState({});
  // Bumped after any action; part of every cache key so stale lists are dropped.
  const [version, setVersion] = useState(0);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [riders, setRiders] = useState([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Multi-select for bulk assignment / delivery runs (table + map share it).
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const rowsById = useRef(new Map());

  // Delivery run (DR) actions live inside this view.
  const [createRunOpen, setCreateRunOpen] = useState(false);
  const [openRunId, setOpenRunId] = useState(null);

  // Per-status caches: { [cacheKey]: result } - cleared by `version`.
  const listCache = useRef(new Map());
  const mapCache = useRef(new Map());
  const listSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Deep link: ?status=assigned (legacy ?tab= still understood). Default Ready to Assign.
  useEffect(() => {
    const fromUrl = readStatusFromUrl();
    if (fromUrl) setStatusTab(fromUrl);
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    url.searchParams.delete("run");
    if (statusTab === DEFAULT_STATUS) url.searchParams.delete("status");
    else url.searchParams.set("status", statusTab);
    window.history.replaceState(null, "", url.toString());
  }, [urlReady, statusTab]);

  const baseParams = useMemo(() => {
    const statuses = STATUS_TABS.find((t) => t.key === statusTab)?.statuses ?? [];
    return {
      status: statuses.length ? statuses.join(",") : undefined,
      delivery_type: typeTab !== "all" ? typeTab : undefined,
      search: debouncedSearch || undefined,
      branch_id: branchId || undefined,
    };
  }, [statusTab, typeTab, debouncedSearch, branchId]);

  const rememberRows = useCallback((list) => {
    (list || []).forEach((r) => rowsById.current.set(r.id, r));
  }, []);

  const load = useCallback(
    async (page = 1, pageSize = 10, { force = false } = {}) => {
      const key = JSON.stringify({ ...baseParams, page, pageSize, version });
      const cached = listCache.current.get(key);
      if (cached && !force) {
        setRows(cached.list);
        setPagination({ current: cached.currentPage, pageSize: cached.pageSize, total: cached.total });
        return;
      }
      const seq = ++listSeq.current;
      setLoading(true);
      try {
        const result = await getDeliveries({ ...baseParams, page, per_page: pageSize });
        if (seq !== listSeq.current) return; // a newer request won
        listCache.current.set(key, result);
        rememberRows(result.list);
        setRows(result.list);
        setPagination({ current: result.currentPage, pageSize: result.pageSize, total: result.total });
      } catch (e) {
        if (seq !== listSeq.current) return;
        message.error(e?.response?.data?.message || "Could not load deliveries.");
        setRows([]);
      } finally {
        if (seq === listSeq.current) setLoading(false);
      }
    },
    [baseParams, version, rememberRows],
  );

  // Lightweight counts for the status chips / stat cards (no list loading).
  const loadSummary = useCallback(async () => {
    try {
      const data = await getDeliverySummary({
        branch_id: branchId || undefined,
        delivery_type: typeTab !== "all" ? typeTab : undefined,
      });
      setCounts({ ...data.byStatus, all: data.total, ready: data.ready, planned: data.planned });
    } catch {
      /* silent */
    }
  }, [branchId, typeTab]);

  // Only the chosen status is fetched; switching back uses the cache. A filter
  // change starts at page 1; a refresh after an action keeps the current page.
  const lastParams = useRef("");
  useEffect(() => {
    if (!urlReady) return;
    const paramsKey = JSON.stringify(baseParams);
    const filtersChanged = paramsKey !== lastParams.current;
    lastParams.current = paramsKey;
    if (filtersChanged) setSelectedRowKeys([]);
    load(filtersChanged ? 1 : pagination.current, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, load]);

  useEffect(() => {
    if (!urlReady) return;
    loadSummary();
  }, [urlReady, loadSummary, version]);

  useEffect(() => {
    if (!urlReady || !mapOpen) return undefined;
    const key = JSON.stringify({ ...baseParams, version });
    const cached = mapCache.current.get(key);
    if (cached) {
      setMapRows(cached);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setMapLoading(true);
      try {
        const params = { ...baseParams, page: 1, per_page: 100 };
        const first = await getDeliveries(params);
        let list = first.list ?? [];
        const pageSize = first.pageSize || 100;
        const pages = Math.min(Math.ceil((first.total || list.length) / pageSize), 5);
        for (let page = 2; page <= pages; page += 1) {
          const next = await getDeliveries({ ...params, page });
          list = list.concat(next.list ?? []);
        }
        if (cancelled) return;
        mapCache.current.set(key, list);
        rememberRows(list);
        setMapRows(list);
      } catch (error) {
        if (!cancelled) {
          message.error(error?.response?.data?.message || "Could not load deliveries for the map.");
          setMapRows([]);
        }
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlReady, mapOpen, baseParams, version, rememberRows]);

  /** Something changed (assign, fail, DR created/updated): drop caches, reload the open status + counts + sidebar badges. */
  const refresh = useCallback(() => {
    listCache.current.clear();
    mapCache.current.clear();
    setVersion((v) => v + 1);
    refreshMenuBadges();
  }, []);

  const changeStatus = useCallback((key) => {
    setStatusTab(STATUS_TABS.some((t) => t.key === key) ? key : "all");
    setPagination((p) => ({ ...p, current: 1 }));
  }, []);

  const openRun = useCallback((id) => {
    if (id) setOpenRunId(id);
  }, []);

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
      refresh();
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
          placeholder="Reason (customer unreachable, address wrong, refused...)"
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
        refresh();
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
        title: "Merchant",
        key: "merchant",
        width: 180,
        render: (_, r) => {
          const s = r.shipment ?? {};
          return (
            <Text ellipsis style={{ fontSize: 12 }} title={formatMerchantLabel(s.merchant || s)}>
              {formatMerchantLabel(s.merchant || { merchant_id: s.merchant_id, merchant_name: s.merchant_name, external_store_id: s.external_store_id })}
            </Text>
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
              <Text style={{ fontSize: 13 }}>{s.receiver_name || "-"}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {s.receiver_phone ? (
                  <Space size={4}><PhoneOutlined />{s.receiver_phone}</Space>
                ) : "-"}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {s.delivery_address || s.receiver_address || s.receiver_city || "-"}
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
          const delivered = r.status === "delivered";
          const follow = delivered ? moneyFollowUp(s) : null;

          return (
            <Space direction="vertical" size={2}>
              {pod ? (
                <Space direction="vertical" size={0}>
                  <Tag color="volcano" style={{ margin: 0 }}>
                    <DollarOutlined /> POD
                  </Tag>
                  <Text strong style={{ fontSize: 12 }}>{money(amount)}</Text>
                </Space>
              ) : (
                <Tag color="green" style={{ margin: 0 }}>Prepaid</Tag>
              )}
              {follow ? (
                <Tag color={follow.color} style={{ margin: 0, whiteSpace: "normal", maxWidth: 180 }}>
                  {follow.label}
                </Tag>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: "Rider",
        key: "rider",
        render: (_, r) => {
          const runRider = !r.rider && r.delivery_run?.active ? r.delivery_run.rider : null;
          const rider = r.rider || runRider;
          if (!rider) {
            return (
              <Text type="warning" italic style={{ fontSize: 12 }}>
                {r.delivery_run?.active ? "DR has no rider" : "Unassigned"}
              </Text>
            );
          }
          return (
            <Space size={6}>
              <Avatar size="small" style={{ background: "#f6ffed", color: "#52c41a" }}>
                {initials(rider.name)}
              </Avatar>
              <Space direction="vertical" size={0}>
                <Text style={{ fontSize: 12 }}>
                  {rider.name}
                  {runRider ? <Tag style={{ marginLeft: 6, fontSize: 10 }}>via {r.delivery_run.run_number}</Tag> : null}
                </Text>
                {rider.phone ? <Text type="secondary" style={{ fontSize: 11 }}>{rider.phone}</Text> : null}
              </Space>
            </Space>
          );
        },
      },
      {
        title: "Run",
        key: "run",
        width: 140,
        render: (_, r) => <RunChip run={r.delivery_run} onOpen={openRun} />,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (v, r) =>
          v === "pending" && r.delivery_run?.active ? (
            <Tooltip title={`On ${r.delivery_run.run_number} - its rider takes it when the DR is dispatched`}>
              <Tag color="purple" style={{ borderRadius: 999, margin: 0 }}>
                <Space size={4}>
                  <NodeIndexOutlined />
                  On DR
                </Space>
              </Tag>
            </Tooltip>
          ) : (
            <StatusPill status={v} />
          ),
      },
      {
        title: "",
        key: "actions",
        render: (_, r) => {
          const follow = r.status === "delivered" ? moneyFollowUp(r.shipment ?? {}) : null;
          const onRun = !!r.delivery_run?.active;

          return (
            <Space size={4} wrap>
              {onRun && ["pending", "assigned"].includes(r.status) && (
                <Tooltip title="This parcel is on a delivery run - change the rider on the run.">
                  <Button size="small" icon={<NodeIndexOutlined />} onClick={() => openRun(r.delivery_run.id)}>
                    Open DR
                  </Button>
                </Tooltip>
              )}
              {!onRun && can?.("deliveries.assign") && ["pending", "assigned"].includes(r.status) && (
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
              {follow?.linkSettlements && (
                <Button
                  size="small"
                  type="default"
                  icon={<DollarOutlined />}
                  href="/admin/settlements"
                >
                  {follow.kind === "pod_cash" ? "Deposit / settle" : "Settlements"}
                </Button>
              )}
            </Space>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [can, openAssign, openRun],
  );

  const canAssign = can?.("deliveries.assign");

  const rowSelection = canAssign
    ? {
        selectedRowKeys,
        preserveSelectedRowKeys: true,
        onChange: (keys) => setSelectedRowKeys(keys),
        getCheckboxProps: (record) => ({
          // Only pending / assigned deliveries that are not already on an active DR.
          disabled: !["pending", "assigned"].includes(record.status) || !!record.delivery_run?.active,
        }),
      }
    : undefined;

  // Create DR & assign rider from the selection (one branch per DR).
  const selectedRows = selectedRowKeys.map((id) => rowsById.current.get(id)).filter(Boolean);
  const runnable = selectedRows.filter((r) => r.status === "pending" && !r.delivery_run?.active);
  const runBranches = [...new Set(runnable.map((r) => r.branch_id || r.sub_branch_id).filter(Boolean))];
  const runBranchId = branchId || (runBranches.length === 1 ? runBranches[0] : null);
  const runCod = runnable.reduce((sum, r) => {
    const s = r.shipment ?? {};
    return sum + (isPod(s.payment_type) ? Number(s.total_collectable_amount || s.pod_amount || 0) : 0);
  }, 0);
  const canCreateRun = !!(isSuperAdmin || can?.("deliveries.assign"));

  const openCreateRun = () => {
    if (!runnable.length) {
      message.warning("Select Ready to Assign parcels that are not already on a DR.");
      return;
    }
    if (runnable.length !== selectedRows.length) {
      message.warning(`${selectedRows.length - runnable.length} selected parcel(s) are not Ready to Assign and will be left out.`);
    }
    if (!runBranchId) {
      message.warning("The selected parcels belong to different branches. Create one DR per branch.");
      return;
    }
    setCreateRunOpen(true);
  };

  const statusOptions = STATUS_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    color: tabHex(tab),
    count: tabCount(tab, counts),
  }));

  return (
    <div style={{ padding: 16, background: "#f7f8fa", minHeight: "100%" }}>
      <AdminPageHeader
        title="Deliveries"
        subtitle="Assign riders, track last-mile, and follow cash POD / settlement after delivery"
        actions={
          <Space>
            <Button
              icon={<EnvironmentOutlined />}
              type={mapOpen ? "primary" : "default"}
              onClick={() => setMapOpen((open) => !open)}
            >
              Map
            </Button>
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              Refresh
            </Button>
          </Space>
        }
      />

      {mapOpen && (
        <AreaAssignmentMap
          mode="delivery"
          loading={mapLoading}
          statusOptions={statusOptions}
          statusValue={statusTab}
          onStatusChange={changeStatus}
          selectedIds={selectedRowKeys}
          onSelectedIdsChange={setSelectedRowKeys}
          riders={riders}
          ridersLoading={ridersLoading}
          onLoadRiders={(ids) => loadRidersFor(ids?.[0])}
          onAssign={async (riderId, ids) => {
            const res = await bulkAssignDeliveries(riderId, ids);
            const skipped = Object.keys(res?.skipped || {}).length;
            if (skipped) {
              message.warning(`${res?.assigned?.length || 0} assigned, ${skipped} skipped.`);
            } else {
              message.success("Rider assigned.");
            }
            setSelectedRowKeys([]);
            setSelectedRider(null);
            refresh();
          }}
          stops={mapRows.map((row) => {
            const shipment = row.shipment ?? {};
            return {
              id: row.id,
              title: shipment.tracking_number || `#${row.shipment_id}`,
              subtitle: shipment.receiver_name || "",
              area:
                shipment.receiver_area ||
                shipment.delivery_area ||
                shipment.receiver_city ||
                "Unknown area",
              address: shipment.delivery_address || shipment.receiver_address || "",
              lat: shipment.delivery_lat,
              lng: shipment.delivery_lng,
              status: row.status,
              statusLabel: statusMeta(row.status).label,
              color: statusMeta(row.status).hex,
              deliveryType: row.delivery_type,
              riderName: row.rider?.name || "",
              riderRole: row.rider?.role || "",
              runNumber: row.delivery_run?.active ? row.delivery_run.run_number : "",
            };
          })}
        />
      )}

      <Card className="admin-card" style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="Search tracking, receiver, phone, DR number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
        </Space>
      </Card>

      <StatCardGrid>
        <StatCard
          label="Ready to Assign"
          value={counts.ready ?? 0}
          hint="Awaiting rider"
          variant="warning"
        />
        <StatCard
          label="Assigned"
          value={Number(counts.assigned || 0) + Number(counts.planned || 0)}
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
            const value = tabCount(tab, counts);
            const hex = tabHex(tab);
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeStatus(tab.key)}
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
              Put them on a delivery run (DR) for one rider, or assign them directly
            </Text>
            {runCod ? <Tag color="volcano" style={{ margin: 0 }}>COD {money(runCod)}</Tag> : null}
          </Space>
          <Space wrap>
            <Button onClick={() => setSelectedRowKeys([])}>Clear</Button>
            <Button icon={<UserAddOutlined />} onClick={openBulkAssign}>
              Assign without DR
            </Button>
            {canCreateRun && (
              <Button
                type="primary"
                icon={<NodeIndexOutlined />}
                disabled={!runnable.length}
                onClick={openCreateRun}
              >
                Create DR &amp; assign rider ({runnable.length})
              </Button>
            )}
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

      {/* Create DR & assign rider */}
      <CreateRunModal
        open={createRunOpen}
        shipmentIds={runnable.map((r) => r.shipment_id)}
        codTotal={runCod}
        branchId={runBranchId}
        requireRider
        onClose={() => setCreateRunOpen(false)}
        onCreated={(id) => {
          setCreateRunOpen(false);
          setSelectedRowKeys([]);
          refresh();
          if (id) openRun(id);
        }}
      />

      {/* DR detail (opened from a Run chip) */}
      <Modal
        open={!!openRunId}
        onCancel={() => setOpenRunId(null)}
        footer={null}
        width={1100}
        destroyOnHidden
        title={<Space><NodeIndexOutlined style={{ color: BRAND }} />Delivery run</Space>}
      >
        {openRunId ? (
          <DeliveryRunDetail runId={openRunId} branchId={branchId || null} canManage={canCreateRun} onChanged={refresh} />
        ) : null}
      </Modal>

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
                  label: `${r.name}${r.phone ? ` | ${r.phone}` : ""} - ${r.active_deliveries_count ?? 0} active`,
                }))}
                notFoundContent={ridersLoading ? "Loading..." : "No riders at this branch"}
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
                  <Space size={4}><ShopOutlined />{formatMerchantLabel(assignTarget.shipment?.merchant || assignTarget.shipment, "Merchant")}</Space>
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <Space size={4}><EnvironmentOutlined />
                    {assignTarget.shipment?.delivery_address || assignTarget.shipment?.receiver_address || "-"}
                  </Space>
                </Text>
                {isPod(assignTarget.shipment?.payment_type) ? (
                  <Tag color="volcano" style={{ margin: 0, width: "fit-content" }}>
                    <DollarOutlined /> Collect {money(assignTarget.shipment?.total_collectable_amount || assignTarget.shipment?.pod_amount)}
                  </Tag>
                ) : (
                  <Tag color="green" style={{ margin: 0, width: "fit-content" }}>Prepaid - nothing to collect</Tag>
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
                  label: `${r.name}${r.phone ? ` | ${r.phone}` : ""} - ${r.active_deliveries_count ?? 0} active`,
                }))}
                notFoundContent={ridersLoading ? "Loading..." : "No riders at this branch"}
              />
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}
