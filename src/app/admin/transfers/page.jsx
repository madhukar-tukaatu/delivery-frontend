"use client";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import Link from "next/link";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
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
  Collapse,
  Divider,
  Tooltip,
  Pagination,
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
  FilterOutlined,
  GlobalOutlined,
  OrderedListOutlined,
} from "@ant-design/icons";
import { usePermissions } from "@/hooks/usePermission";
import api from "@/lib/api";
import { formatMerchantLabel } from "@/lib/merchantLabel";
import {
  getTransfers,
  getTransferStats,
  getAvailableTransferRoutes,
  dispatchTransfers,
  dispatchToNextHop,
  receiveTransfer,
  getReceivedTransfers,
  getCompletedTransfers,
  getTransferHistory,
} from "@/services/admin/transferService";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

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
  return <Tag color={meta.color} style={{ margin: 0, fontSize: 11, lineHeight: "18px", padding: "0 6px" }}>{meta.label}</Tag>;
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

/**
 * Get the origin/destination key for a shipment
 * Used for grouping shipments by route
 */
function getRouteKey(shipment) {
  const originId = shipment.origin_sub_branch_id || shipment.origin_branch_id;
  const destId = shipment.destination_sub_branch_id || shipment.destination_branch_id;
  return `${originId}-${destId}`;
}

/**
 * Get route display name for a shipment
 */
function getRouteDisplayName(shipment) {
  const origin = routeLabel(shipment.origin_branch, shipment.origin_sub_branch, "Origin");
  const destination = routeLabel(shipment.destination_branch, shipment.destination_sub_branch, "Destination");
  return `${origin} → ${destination}`;
}


/**
 * Match a shipment to a transfer route using OPERATIONAL branch IDs
 * (backend maps coverage_locations <-> branches for us).
 */
function shipmentMatchesRoute(shipment, route) {
  if (!shipment || !route) return false;
  const svc = String(shipment.service_type || shipment.hop_meta?.service_type || "standard").toLowerCase();
  const routeSvc = String(route.service_type || "standard").toLowerCase();
  if (!(svc === routeSvc || routeSvc === "all")) return false;

  // Assigned snapshot route always matches its configured card.
  const assigned = Number(
    shipment.transfer_route_id || shipment.hop_meta?.transfer_route_id || 0
  );
  const routeId = Number(route.route_id ?? route.id ?? 0);
  if (assigned > 0 && routeId > 0 && assigned === routeId) return true;

  const destId = Number(shipment.destination_sub_branch_id || shipment.destination_branch_id || 0);
  const routeDest = Number(route.destination_branch_id || 0);
  const routeDestCov = Number(route.destination_coverage_id || 0);
  // Operational branch match (preferred) OR coverage-id match (legacy/AUTO payloads).
  return (
    (destId > 0 && routeDest > 0 && destId === routeDest) ||
    (destId > 0 && routeDestCov > 0 && destId === routeDestCov)
  );
}

function filterRoutesForShipments(availableRoutes, selectedShipments) {
  if (!selectedShipments.length) return availableRoutes;
  return availableRoutes.filter((route) =>
    selectedShipments.some((s) => shipmentMatchesRoute(s, route))
  );
}

function countParcelsForRoute(route, shipments) {
  return (shipments || []).filter((s) => shipmentMatchesRoute(s, route)).length;
}

function RoutePathChips({ route }) {
  const path = Array.isArray(route?.path) ? route.path : [];
  const nextId = Number(route?.next_hop_coverage_id || route?.next_hop_branch_id || 0);
  if (!path.length) {
    return <Text type="secondary">{route?.path_text || route?.route_name || "—"}</Text>;
  }
  return (
    <Space size={4} wrap>
      {path.map((node, idx) => {
        const id = Number(node.branch_id || node.id || 0);
        const isNext = nextId && id === nextId;
        const isLast = idx === path.length - 1;
        return (
          <span key={`${id}-${idx}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Tag
              color={isNext ? "processing" : isLast ? "purple" : "default"}
              style={{ marginInlineEnd: 0, fontWeight: isNext ? 700 : 500 }}
            >
              {isNext ? `NEXT: ${node.branch_name || node.name}` : (node.branch_name || node.name || `#${id}`)}
            </Tag>
            {!isLast ? <ArrowRightOutlined style={{ fontSize: 10, color: "#999" }} /> : null}
          </span>
        );
      })}
    </Space>
  );
}

function RoutePickerCards({
  routes,
  shipments,
  selectedRouteId,
  onSelect,
  loading,
  serviceTypeFilter,
}) {
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const cards = useMemo(() => {
    const all = (routes || [])
      .map((route) => {
        const id = Number(route.route_id ?? route.id);
        const count = countParcelsForRoute(route, shipments);
        return { route, id, count };
      })
      .filter((c) => !Number.isNaN(c.id))
      .sort((a, b) => b.count - a.count || String(a.route.route_code || "").localeCompare(String(b.route.route_code || "")));
    if (showAllRoutes) return all;
    const withParcels = all.filter((c) => c.count > 0);
    // If nothing matches ready parcels, still show a short list so BM can inspect config.
    return withParcels.length ? withParcels : all.slice(0, 8);
  }, [routes, shipments, showAllRoutes]);

  if (loading) {
    return <Card loading style={{ borderRadius: 12 }} />;
  }

  if (!cards.length) {
    return (
      <Alert
        type="warning"
        showIcon
        message="No transfer routes available for this branch / service type"
        description={
          <span>
            Configure an active route from this branch&apos;s coverage under{" "}
            <Link href="/admin/branch-transfer-routes">Admin → Transfer Routes</Link>
            {serviceTypeFilter && serviceTypeFilter !== "all"
              ? ` (filter: ${String(serviceTypeFilter).toUpperCase()})`
              : ""}
            . Destinations without a matching route cannot be dispatched.
          </span>
        }
        style={{ borderRadius: 12 }}
      />
    );
  }

  const totalRoutes = (routes || []).length;
  const hiddenCount = Math.max(0, totalRoutes - cards.length);

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      {hiddenCount > 0 && !showAllRoutes ? (
        <Button type="link" onClick={() => setShowAllRoutes(true)} style={{ paddingInline: 0 }}>
          Showing routes with ready parcels — show all {totalRoutes} routes
        </Button>
      ) : null}
      {showAllRoutes && totalRoutes > 8 ? (
        <Button type="link" onClick={() => setShowAllRoutes(false)} style={{ paddingInline: 0 }}>
          Show only routes with ready parcels
        </Button>
      ) : null}
    <Row gutter={[8, 8]}>
      {cards.map(({ route, id, count }) => {
        const selected = Number(selectedRouteId) === id;
        return (
          <Col xs={24} md={12} xl={8} key={id}>
            <Card
              size="small"
              hoverable
              onClick={() => onSelect(selected ? null : id)}
              styles={{ body: { padding: 10 } }}
              style={{
                borderRadius: 8,
                borderColor: selected ? "#1677ff" : undefined,
                boxShadow: selected ? "0 0 0 1px rgba(22,119,255,.35)" : undefined,
                cursor: "pointer",
                height: "100%",
              }}
            >
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
                  <Space wrap>
                    <Text strong>{route.route_code || `Route #${id}`}</Text>
                    <ServiceTypeTag value={route.service_type} />
                    {route.is_default ? <Tag color="gold">Default</Tag> : null}
                  </Space>
                  <Badge
                    count={count}
                    showZero
                    overflowCount={999}
                    style={{ backgroundColor: count ? "#1677ff" : "#d9d9d9" }}
                    title="Matching ready parcels"
                  />
                </Space>
                <RoutePathChips route={route} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Next hop: <Text strong>{route.next_hop_name || "Final destination"}</Text>
                  {" · "}
                  Final: {route.destination_branch_name || "—"}
                </Text>
                {selected ? <Tag color="blue">Selected for dispatch</Tag> : <Tag>Click to select</Tag>}
              </Space>
            </Card>
          </Col>
        );
      })}
    </Row>
    </Space>
  );
}


/**
 * Prefer live/_routeGroup (board grouping / API next-hop) over stale hop_meta.
 * hop_meta.next_hop can lag after transit receive until progress is recalculated.
 */
function resolveShipmentNextHop(shipment, availableRoutes = []) {
  const fromGroup = Number(shipment?._routeGroup?.next_hop_branch_id || 0);
  if (fromGroup > 0) {
    return {
      id: fromGroup,
      name: shipment?._routeGroup?.next_hop_name || `Branch #${fromGroup}`,
      service: String(shipment?._routeGroup?.service_type || shipment?.service_type || "standard").toLowerCase(),
      route: shipment?._routeGroup || null,
    };
  }
  const fromMeta = Number(shipment?.hop_meta?.next_hop_branch_id || 0);
  if (fromMeta > 0) {
    return {
      id: fromMeta,
      name: shipment?.hop_meta?.next_hop_name || `Branch #${fromMeta}`,
      service: String(shipment?.hop_meta?.service_type || shipment?.service_type || "standard").toLowerCase(),
      route: shipment?._routeGroup || null,
    };
  }
  const match = (availableRoutes || []).find((r) => shipmentMatchesRoute(shipment, r));
  if (match) {
    return {
      id: Number(match.next_hop_branch_id || 0),
      name: match.next_hop_name || "Next hop",
      service: String(match.service_type || shipment?.service_type || "standard").toLowerCase(),
      route: match,
    };
  }
  return { id: 0, name: null, service: String(shipment?.service_type || "standard").toLowerCase(), route: null };
}

function buildNextHopGroups(routes, shipments, { includeEmptyFromRoutes = false } = {}) {
  const map = {};
  const ensureGroup = (key, seed) => {
    if (!map[key]) {
      map[key] = {
        key,
        nextHopId: seed.nextHopId,
        nextHopName: seed.nextHopName,
        serviceType: seed.serviceType,
        routes: [],
        routeIds: new Set(),
        finalCounts: new Map(), // destKey -> { key, name, count }
        count: 0,
        shipmentIds: [],
      };
    }
    return map[key];
  };

  // Master-detail board must NOT seed from the full availableRoutes catalog by
  // default — that repopulates empty bags after Outbound↔In Transit tab switches.
  // Seed only from outbound shipments / group_by_next_hop; routes are still used
  // by resolveShipmentNextHop for matching. Opt in via includeEmptyFromRoutes.
  if (includeEmptyFromRoutes) {
    (routes || []).forEach((route) => {
      const hopId = Number(route.next_hop_branch_id || 0);
      if (!hopId) return;
      const svc = String(route.service_type || "standard").toLowerCase();
      const key = `${hopId}::${svc}`;
      const g = ensureGroup(key, {
        nextHopId: hopId,
        nextHopName: route.next_hop_name || `Branch #${hopId}`,
        serviceType: svc,
      });
      const id = Number(route.route_id ?? route.id);
      if (!g.routeIds.has(id)) {
        g.routeIds.add(id);
        g.routes.push(route);
      }
    });
  }

  (shipments || []).forEach((s) => {
    const hop = resolveShipmentNextHop(s, routes);
    if (!hop.id) return;
    const key = `${hop.id}::${hop.service}`;
    const g = ensureGroup(key, {
      nextHopId: hop.id,
      nextHopName: hop.name || `Branch #${hop.id}`,
      serviceType: hop.service,
    });
    g.count += 1;
    g.shipmentIds.push(s.id);
    const dest = routeLabel(
      s.destination_branch,
      s.destination_sub_branch,
      s.hop_meta?.destination_name || "Final"
    );
    const destKey = String(s.destination_sub_branch_id || s.destination_branch_id || dest);
    const existing = g.finalCounts.get(destKey);
    if (existing) existing.count += 1;
    else g.finalCounts.set(destKey, { key: destKey, name: dest, count: 1 });
    if (hop.route) {
      const rid = Number(hop.route.route_id ?? hop.route.id);
      if (rid && !g.routeIds.has(rid)) {
        g.routeIds.add(rid);
        g.routes.push(hop.route);
      }
    }
  });

  return Object.values(map)
    .map((g) => {
      const finalBreakdown = Array.from(g.finalCounts.values()).sort(
        (a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name))
      );
      return {
        ...g,
        routeIds: Array.from(g.routeIds).filter(Boolean),
        finalBreakdown,
        finalNames: finalBreakdown.map((f) => f.name),
        routeCodes: (g.routes || []).map((r) => r.route_code || r.route_name).filter(Boolean),
      };
    })
    .filter((g) => includeEmptyFromRoutes || g.count > 0)
    .sort((a, b) => b.count - a.count || String(a.nextHopName).localeCompare(String(b.nextHopName)));
}

function TruncatedSummary({ label, items, max = 3 }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) {
    return (
      <Text type="secondary" style={{ fontSize: 11 }}>
        {label}: —
      </Text>
    );
  }
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  const full = list.join(", ");
  return (
    <Tooltip title={full}>
      <Text
        type="secondary"
        style={{
          fontSize: 11,
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "100%",
        }}
      >
        {label}: {shown.join(", ")}
        {rest > 0 ? ` +${rest}` : ""}
      </Text>
    </Tooltip>
  );
}

/** Stable accent palette hashed from next-hop branch id. */
const HOP_ACCENT_PALETTE = [
  { border: "#1677ff", badge: "#1677ff", soft: "#e6f4ff", selectedBg: "rgba(22,119,255,0.12)", chip: "blue" },
  { border: "#13c2c2", badge: "#13c2c2", soft: "#e6fffb", selectedBg: "rgba(19,194,194,0.12)", chip: "cyan" },
  { border: "#722ed1", badge: "#722ed1", soft: "#f9f0ff", selectedBg: "rgba(114,46,209,0.12)", chip: "purple" },
  { border: "#eb2f96", badge: "#eb2f96", soft: "#fff0f6", selectedBg: "rgba(235,47,150,0.12)", chip: "magenta" },
  { border: "#fa8c16", badge: "#fa8c16", soft: "#fff7e6", selectedBg: "rgba(250,140,22,0.12)", chip: "orange" },
  { border: "#52c41a", badge: "#52c41a", soft: "#f6ffed", selectedBg: "rgba(82,196,26,0.12)", chip: "green" },
  { border: "#2f54eb", badge: "#2f54eb", soft: "#f0f5ff", selectedBg: "rgba(47,84,235,0.12)", chip: "geekblue" },
  { border: "#a0d911", badge: "#7cb305", soft: "#fcffe6", selectedBg: "rgba(160,217,17,0.14)", chip: "lime" },
];

function hopAccent(nextHopId) {
  const id = Math.abs(Number(nextHopId) || 0);
  return HOP_ACCENT_PALETTE[id % HOP_ACCENT_PALETTE.length];
}

const FINAL_CHIP_COLORS = [
  "purple", "geekblue", "cyan", "magenta", "orange", "green", "blue", "volcano", "gold", "lime",
];

function finalChipColor(key) {
  const s = String(key || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return FINAL_CHIP_COLORS[h % FINAL_CHIP_COLORS.length];
}

function FinalBreakdownChips({ items, max = 6, size = "default" }) {
  const list = Array.isArray(items) ? items.filter((f) => f && f.name) : [];
  if (!list.length) return null;
  const shown = list.slice(0, max);
  const rest = list.slice(max);
  const tagStyle =
    size === "small"
      ? { margin: 0, fontSize: 11, lineHeight: "18px", padding: "0 6px" }
      : { margin: 0 };
  return (
    <Space size={4} wrap>
      {shown.map((f) => (
        <Tooltip key={f.key || f.name} title={`${f.name}: ${f.count} parcel${f.count === 1 ? "" : "s"}`}>
          <Tag color={finalChipColor(f.key || f.name)} style={tagStyle}>
            {f.name} <Text strong style={{ fontSize: size === "small" ? 11 : 12 }}>{f.count}</Text>
          </Tag>
        </Tooltip>
      ))}
      {rest.length > 0 ? (
        <Tooltip title={rest.map((f) => `${f.name} ${f.count}`).join(", ")}>
          <Tag style={tagStyle}>+{rest.length}</Tag>
        </Tooltip>
      ) : null}
    </Space>
  );
}

/**
 * Collapsible unmatched-parcels notice — softer when other hops already match.
 */
function UnmatchedParcelsAlert({ unmatched, hasMatchedHops }) {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(unmatched) ? unmatched : [];
  if (!list.length) return null;

  const tracking = list
    .map((s) => s.tracking_number || (s.id != null ? `#${s.id}` : null))
    .filter(Boolean);
  const shown = tracking.slice(0, 12);
  const rest = tracking.length - shown.length;
  const alertType = hasMatchedHops ? "warning" : "error";
  const title = hasMatchedHops
    ? `${list.length} ready parcel${list.length === 1 ? "" : "s"} need a transfer route`
    : `${list.length} ready parcel${list.length === 1 ? "" : "s"} have no matching active route`;
  const reason = hasMatchedHops
    ? "These destinations/service types are not covered yet — other ready parcels already match a next hop and can be bagged normally."
    : "No active transfer route matches their destination and service type, so they cannot be bagged yet.";

  return (
    <Alert
      type={alertType}
      showIcon
      style={{ padding: "6px 10px", borderRadius: 8 }}
      message={
        <Space wrap size={[8, 4]} style={{ width: "100%", justifyContent: "space-between" }}>
          <Text strong style={{ fontSize: 13 }}>
            {title}
          </Text>
          <Button
            type="link"
            size="small"
            style={{ padding: 0, height: "auto" }}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide details" : "Show details"}
          </Button>
        </Space>
      }
      description={
        open ? (
          <Space direction="vertical" size={6} style={{ width: "100%" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {reason}
            </Text>
            {shown.length > 0 ? (
              <div>
                <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>
                  Tracking:
                </Text>
                <Space size={4} wrap>
                  {shown.map((t) => (
                    <Tag key={t} style={{ margin: 0, fontFamily: "monospace", fontSize: 11 }}>
                      {t}
                    </Tag>
                  ))}
                  {rest > 0 ? <Tag style={{ margin: 0 }}>+{rest} more</Tag> : null}
                </Space>
              </div>
            ) : null}
            <div>
              <Link href="/admin/branch-transfer-routes">
                <Button type="primary" size="small" ghost>
                  Open Transfer Routes
                </Button>
              </Link>
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                Admin → Transfer Routes — add an active route for each missing destination / service.
              </Text>
            </div>
          </Space>
        ) : (
          <span style={{ fontSize: 12 }}>
            {hasMatchedHops
              ? "Other parcels already match a next hop. "
              : ""}
            Create missing routes under{" "}
            <Link href="/admin/branch-transfer-routes">Transfer Routes</Link>
            {" — "}
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto", fontSize: 12 }}
              onClick={() => setOpen(true)}
            >
              list tracking #
            </Button>
          </span>
        )
      }
    />
  );
}

/**
 * Master-detail next-hop bagging board:
 * left = all next hops, right = selected hop detail + shipment table.
 */
function NextHopMasterDetail({
  routes,
  shipments,
  selectedNextHopKey,
  onSelect,
  onDispatch,
  loading,
  dispatching,
  canDispatch,
  selectedRowKeys,
  onSelectionChange,
}) {
  const [hopSearch, setHopSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  // Default: hide empty hops. Only seed catalog empties when user toggles show.
  const [showEmptyHops, setShowEmptyHops] = useState(false);
  const groups = useMemo(
    () => buildNextHopGroups(routes, shipments, { includeEmptyFromRoutes: showEmptyHops }),
    [routes, shipments, showEmptyHops]
  );
  const emptyHopCount = useMemo(() => {
    if (showEmptyHops) return 0;
    const all = buildNextHopGroups(routes, shipments, { includeEmptyFromRoutes: true });
    return all.filter((g) => !(g.count > 0)).length;
  }, [routes, shipments, showEmptyHops]);

  const filteredGroups = useMemo(() => {
    const q = hopSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const hay = [
        g.nextHopName,
        g.serviceType,
        ...(g.finalNames || []),
        ...(g.routeCodes || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [groups, hopSearch]);

  const LIST_PAGE_SIZE = 15;
  const useListPagination = filteredGroups.length > 20;
  const pageCount = Math.max(1, Math.ceil(filteredGroups.length / LIST_PAGE_SIZE));
  const safeListPage = Math.min(listPage, pageCount);
  const visibleGroups = useListPagination
    ? filteredGroups.slice((safeListPage - 1) * LIST_PAGE_SIZE, safeListPage * LIST_PAGE_SIZE)
    : filteredGroups;

  useEffect(() => {
    setListPage(1);
  }, [hopSearch]);

  const selected = useMemo(
    () => groups.find((g) => g.key === selectedNextHopKey) || null,
    [groups, selectedNextHopKey]
  );

  const detailShipments = useMemo(() => {
    if (!selected) return [];
    const idSet = new Set(selected.shipmentIds || []);
    return (shipments || []).filter((s) => idSet.has(s.id));
  }, [selected, shipments]);

  const fromLabel = useMemo(() => {
    if (!detailShipments.length) return "This branch";
    const s = detailShipments[0];
    return (
      routeLabel(s.current_branch, s.current_sub_branch, null) ||
      routeLabel(s.origin_branch, s.origin_sub_branch, "Origin") ||
      "This branch"
    );
  }, [detailShipments]);

  const detailColumns = useMemo(
    () => [
      {
        title: "Shipment",
        key: "shipment",
        width: 160,
        render: (_, s) => (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 12 }}>
              {s.tracking_number || `#${s.id}`}
            </Text>
            <Space size={4} wrap>
              <TransferStageTag shipment={s} />
              <ServiceTypeTag value={s.hop_meta?.service_type || s.service_type} />
            </Space>
          </Space>
        ),
      },
      {
        title: "Merchant",
        key: "merchant",
        width: 160,
        ellipsis: true,
        render: (_, s) => (
          <Text ellipsis style={{ fontSize: 11 }} title={formatMerchantLabel(s.merchant || s)}>
            {formatMerchantLabel(s.merchant || s)}
          </Text>
        ),
      },
      {
        title: "Final destination",
        key: "final_dest",
        width: 160,
        ellipsis: true,
        render: (_, s) => {
          const dest = routeLabel(
            s.destination_branch,
            s.destination_sub_branch,
            s.hop_meta?.destination_name || "Final"
          );
          const destKey = String(
            s.destination_sub_branch_id || s.destination_branch_id || dest
          );
          return (
            <Tooltip title={dest}>
              <Tag
                color={finalChipColor(destKey)}
                style={{
                  margin: 0,
                  maxWidth: 150,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: 11,
                }}
              >
                {dest}
              </Tag>
            </Tooltip>
          );
        },
      },
      {
        title: "Receiver",
        key: "receiver",
        width: 140,
        render: (_, s) => (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12 }}>{s.receiver_name || "-"}</Text>
            <Text type="secondary" style={{ fontSize: 10 }}>
              {s.receiver_phone ? (
                <Space size={4}>
                  <PhoneOutlined />
                  {s.receiver_phone}
                </Space>
              ) : (
                "-"
              )}
            </Text>
          </Space>
        ),
      },
      {
        title: "Payment",
        key: "payment",
        width: 110,
        render: (_, s) =>
          ["pod", "cod", "to_pay"].includes(String(s.payment_type || "").toLowerCase()) ? (
            <Space direction="vertical" size={0}>
              <Tag color="volcano" style={{ margin: 0 }}>
                <DollarOutlined /> POD
              </Tag>
              <Text strong style={{ fontSize: 11 }}>
                {money(s.total_collectable_amount || s.pod_amount)}
              </Text>
            </Space>
          ) : (
            <Tag color="green" style={{ margin: 0 }}>
              Prepaid
            </Tag>
          ),
      },
    ],
    []
  );

  if (loading) {
    return <Card size="small" loading style={{ borderRadius: 8, minHeight: 320 }} />;
  }

  if (!groups.length) {
    const hasRoutes = (routes || []).some((r) => Number(r.next_hop_branch_id || 0) > 0);
    return (
      <Alert
        type={hasRoutes ? "info" : "warning"}
        showIcon
        style={{ borderRadius: 8, padding: "6px 10px" }}
        message={hasRoutes ? "No ready parcels to dispatch" : "No next-hop bags available"}
        description={
          hasRoutes ? (
            <Space direction="vertical" size={4}>
              <span>
                Outbound next hops appear here only when there are shipments ready to
                dispatch.
              </span>
              {!showEmptyHops ? (
                <Button type="link" size="small" onClick={() => setShowEmptyHops(true)} style={{ paddingInline: 0 }}>
                  Show empty hops (configured routes with zero bags)
                </Button>
              ) : null}
            </Space>
          ) : (
            <span>
              Configure active routes under{" "}
              <Link href="/admin/branch-transfer-routes">Transfer Routes</Link>.
            </span>
          )
        }
      />
    );
  }

  const selectGroup = (g) => {
    if (!g) {
      onSelect?.(null);
      return;
    }
    onSelect?.(selectedNextHopKey === g.key ? null : g);
  };

  return (
    <Row gutter={[10, 10]} style={{ minHeight: 420 }}>
      {/* Left: next-hop list (~38–42%) */}
      <Col xs={24} lg={9} xl={9} style={{ display: "flex", flexDirection: "column" }}>
        <Card
          size="small"
          title={
            <Space size={6}>
              <Text strong style={{ fontSize: 13 }}>
                Next hops
              </Text>
              <Badge
                count={groups.length}
                overflowCount={999}
                style={{ backgroundColor: "#1677ff" }}
                title={showEmptyHops ? "All next-hop destinations (incl. empty)" : "Next hops with ready parcels"}
              />
            </Space>
          }
          styles={{
            body: {
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 560,
              minHeight: 320,
            },
          }}
          style={{ borderRadius: 8, height: "100%" }}
        >
          <Input
            allowClear
            size="small"
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="Search next hop, final, route…"
            value={hopSearch}
            onChange={(e) => setHopSearch(e.target.value)}
          />
          {emptyHopCount > 0 && !showEmptyHops ? (
            <Button
              type="link"
              size="small"
              onClick={() => setShowEmptyHops(true)}
              style={{ paddingInline: 0, height: "auto", alignSelf: "flex-start" }}
            >
              Showing hops with ready parcels — show {emptyHopCount} empty
            </Button>
          ) : null}
          {showEmptyHops ? (
            <Button
              type="link"
              size="small"
              onClick={() => setShowEmptyHops(false)}
              style={{ paddingInline: 0, height: "auto", alignSelf: "flex-start" }}
            >
              Hide empty hops
            </Button>
          ) : null}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              paddingRight: 2,
            }}
            role="listbox"
            aria-label="Next hop destinations"
          >
            {visibleGroups.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No next hops match"
                style={{ margin: "24px 0" }}
              />
            ) : (
              visibleGroups.map((g) => {
                const isSelected = selectedNextHopKey === g.key;
                const accent = hopAccent(g.nextHopId);
                return (
                  <div
                    key={g.key}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => selectGroup(g)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectGroup(g);
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = isSelected
                        ? `0 0 0 1px ${accent.border}33`
                        : "none";
                    }}
                    style={{
                      cursor: "pointer",
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? accent.border : "#f0f0f0"}`,
                      borderLeft: `4px solid ${accent.border}`,
                      background: isSelected ? accent.selectedBg : "#fff",
                      boxShadow: isSelected ? `0 0 0 1px ${accent.border}33` : "none",
                      padding: "8px 10px",
                      outline: "none",
                      transition: "border-color .15s, background .15s, box-shadow .15s, transform .15s",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ flex: "0 0 auto", textAlign: "center", minWidth: 36 }}>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            lineHeight: 1.1,
                            color: accent.badge,
                          }}
                          title="Ready parcels to this next hop"
                        >
                          {g.count}
                        </div>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          total
                        </Text>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Space size={4} wrap style={{ marginBottom: 4 }}>
                          <Text strong style={{ fontSize: 13 }}>
                            → {g.nextHopName}
                          </Text>
                          <Tag
                            color={accent.chip}
                            style={{ margin: 0, fontSize: 11, lineHeight: "18px", padding: "0 6px" }}
                          >
                            next
                          </Tag>
                          <ServiceTypeTag value={g.serviceType} />
                        </Space>
                        {(g.finalBreakdown || []).length > 0 ? (
                          <div style={{ marginBottom: 2 }}>
                            <FinalBreakdownChips items={g.finalBreakdown} max={4} size="small" />
                          </div>
                        ) : (
                          <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                            No ready parcels yet
                          </Text>
                        )}
                        {(g.routeCodes || []).length > 0 ? (
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 10,
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              opacity: 0.75,
                            }}
                            title={(g.routeCodes || []).join(", ")}
                          >
                            {(g.routeCodes || []).slice(0, 3).join(" · ")}
                            {(g.routeCodes || []).length > 3
                              ? ` +${g.routeCodes.length - 3}`
                              : ""}
                          </Text>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {useListPagination ? (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
              <Pagination
                size="small"
                current={safeListPage}
                pageSize={LIST_PAGE_SIZE}
                total={filteredGroups.length}
                onChange={setListPage}
                showSizeChanger={false}
                showTotal={(t) => `${t} hops`}
              />
            </div>
          ) : null}
        </Card>
      </Col>

      {/* Right: detail (~58–62%) */}
      <Col xs={24} lg={15} xl={15} style={{ display: "flex", flexDirection: "column" }}>
        <Card
          size="small"
          styles={{
            body: {
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 560,
              minHeight: 320,
              overflow: "hidden",
            },
          }}
          style={{ borderRadius: 8, height: "100%" }}
        >
          {!selected ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Select a next hop on the left to bag & dispatch"
              style={{ margin: "48px 0" }}
            />
          ) : (
            <>
              {(() => {
                const accent = hopAccent(selected.nextHopId);
                return (
              <Space
                wrap
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: 8,
                  borderLeft: `4px solid ${accent.border}`,
                  background: accent.soft,
                }}
                size={[8, 6]}
              >
                <Space direction="vertical" size={4} style={{ minWidth: 0, flex: 1 }}>
                  <Space size={6} wrap align="center">
                    <Text strong style={{ fontSize: 14 }}>
                      {fromLabel}
                    </Text>
                    <ArrowRightOutlined style={{ color: accent.badge }} />
                    <Text strong style={{ fontSize: 14, color: accent.badge }}>
                      {selected.nextHopName}
                    </Text>
                    <ServiceTypeTag value={selected.serviceType} />
                    <Badge
                      count={selected.count}
                      overflowCount={999}
                      style={{ backgroundColor: accent.badge }}
                      title="Total parcels to this next hop"
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      total
                    </Text>
                  </Space>
                  {(selected.finalBreakdown || []).length > 0 ? (
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>
                        By final:
                      </Text>
                      <FinalBreakdownChips items={selected.finalBreakdown} max={8} size="small" />
                    </div>
                  ) : null}
                  {(selected.routeCodes || []).length > 0 ? (
                    <Text type="secondary" style={{ fontSize: 11, opacity: 0.8 }}>
                      Routes: {(selected.routeCodes || []).slice(0, 5).join(" · ")}
                      {(selected.routeCodes || []).length > 5
                        ? ` +${selected.routeCodes.length - 5}`
                        : ""}
                    </Text>
                  ) : null}
                </Space>
                {canDispatch ? (
                  <Button
                    type="primary"
                    size="small"
                    icon={<SendOutlined />}
                    disabled={!selected.count || !selectedRowKeys?.length || dispatching}
                    loading={dispatching}
                    onClick={() => onDispatch?.(selected)}
                    style={{ backgroundColor: accent.badge, borderColor: accent.badge }}
                  >
                    Dispatch Transfer
                  </Button>
                ) : null}
              </Space>
                );
              })()}

              <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
                <Table
                  rowKey="id"
                  size="small"
                  loading={loading}
                  dataSource={detailShipments}
                  columns={detailColumns}
                  rowSelection={
                    canDispatch
                      ? {
                          selectedRowKeys: (selectedRowKeys || []).filter((id) =>
                            detailShipments.some((s) => s.id === id)
                          ),
                          onChange: (keys) => onSelectionChange?.(keys),
                          selections: [
                            Table.SELECTION_ALL,
                            Table.SELECTION_INVERT,
                            Table.SELECTION_NONE,
                          ],
                        }
                      : undefined
                  }
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20"],
                    showTotal: (t) => `${t} shipment${t === 1 ? "" : "s"}`,
                    size: "small",
                  }}
                  scroll={{ x: 640 }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No ready parcels for this next hop"
                      />
                    ),
                  }}
                />
              </div>
            </>
          )}
        </Card>
      </Col>
    </Row>
  );
}


/**
 * Group shipments by origin-destination route
 */
function groupShipmentsByRoute(shipments) {
  const groups = {};
  shipments.forEach(shipment => {
    const key = getRouteKey(shipment);
    if (!groups[key]) {
      groups[key] = {
        key,
        origin: routeLabel(shipment.origin_branch, shipment.origin_sub_branch, "Origin"),
        destination: routeLabel(shipment.destination_branch, shipment.destination_sub_branch, "Destination"),
        originId: shipment.origin_sub_branch_id || shipment.origin_branch_id,
        destinationId: shipment.destination_sub_branch_id || shipment.destination_branch_id,
        shipments: [],
        count: 0,
      };
    }
    groups[key].shipments.push(shipment);
    groups[key].count++;
  });
  return Object.values(groups);
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
      style={{ borderRadius: "8px 8px 0 0", padding: "6px 10px", fontSize: 12 }}
    />
  );
}

const statusText = (status) =>
  status ? String(status).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-";

const TRANSFER_EVENT_LABEL = {
  sorted_for_transfer: "Sorted for transfer",
  dispatched: "Dispatched",
  received: "Received",
  sorted_for_delivery: "Sorted for delivery",
  last_mile: "Last mile",
  delivered: "Delivered",
  delivery_failed: "Delivery failed",
  returning: "Returning",
};

// Current status of the parcel (as of now), with the branch it is at.
function CurrentStatusCell({ shipment }) {
  const info = shipment?.transfer_info || {};
  return (
    <Space direction="vertical" size={2}>
      <TransferStageTag shipment={shipment} />
      <Text type="secondary" style={{ fontSize: 11 }}>
        {info.current_status_label || statusText(shipment?.status)}
        {info.current_branch_name ? ` at ${info.current_branch_name}` : ""}
      </Text>
      <DataGapTag info={info} />
    </Space>
  );
}

function DataGapTag({ info }) {
  const gaps = info?.data_gaps || [];
  if (!gaps.length) return null;
  return (
    <Tooltip title={gaps.join(" ")}>
      <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>Data note</Tag>
    </Tooltip>
  );
}

// "Sent" (dispatch from the selected branch) or "Received" (arrival at it).
function TransferLegCell({ leg, kind, fallbackAt }) {
  if (!leg && !fallbackAt) {
    return <Text type="secondary" style={{ fontSize: 12 }}>Not recorded</Text>;
  }
  const at = leg?.at || fallbackAt;
  const other = kind === "sent" ? leg?.to_branch_name : leg?.from_branch_name;
  return (
    <Space direction="vertical" size={0}>
      <Text style={{ fontSize: 13 }}>{formatDate(at)}</Text>
      {other ? (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {kind === "sent" ? `To ${other}` : `From ${other}`}
        </Text>
      ) : null}
      <Text type="secondary" style={{ fontSize: 11 }}>
        {leg?.by ? `By ${leg.by}` : "User not recorded"}
        {leg?.manifest_number ? ` | ${leg.manifest_number}` : ""}
      </Text>
    </Space>
  );
}

// The selected branch's own transfer events for this parcel.
function BranchEventsCell({ shipment }) {
  const events = (shipment?.branch_events?.length ? shipment.branch_events : shipment?.timeline) || [];
  if (!events.length) {
    return <Text type="secondary" style={{ fontSize: 12 }}>No transfer events recorded</Text>;
  }
  return (
    <Space direction="vertical" size={0}>
      {events.slice(-5).map((e, i) => {
        const where = e.type === "dispatched" && e.from_branch_name
          ? `${e.from_branch_name} -> ${e.to_branch_name || "?"}`
          : e.branch_name;
        return (
          <Text key={`${e.status}-${e.at}-${i}`} style={{ fontSize: 12 }}>
            <Text strong style={{ fontSize: 12 }}>{TRANSFER_EVENT_LABEL[e.type] || statusText(e.status)}</Text>
            {where ? ` ${where}` : ""}
            <Text type="secondary" style={{ fontSize: 11 }}>
              {` | ${formatDate(e.at)}${e.by ? ` | ${e.by}` : ""}`}
            </Text>
          </Text>
        );
      })}
    </Space>
  );
}

function TransferInfoSummary({ info }) {
  const roleText = { origin: "Origin branch", destination: "Destination branch", transit: "Transit hub" };
  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        {info.branch_name ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {info.branch_name}{info.role ? ` (${roleText[info.role] || info.role})` : ""}
          </Text>
        ) : null}
        {info.sent ? (
          <Text style={{ fontSize: 12 }}>
            <Text strong style={{ fontSize: 12 }}>Sent</Text>
            {` from ${info.sent.branch_name || "-"}${info.sent.to_branch_name ? ` to ${info.sent.to_branch_name}` : ""} | ${formatDate(info.sent.at)}${info.sent.by ? ` | by ${info.sent.by}` : ""}${info.sent.manifest_number ? ` | ${info.sent.manifest_number}` : ""}`}
          </Text>
        ) : null}
        {info.received ? (
          <Text style={{ fontSize: 12 }}>
            <Text strong style={{ fontSize: 12 }}>Received</Text>
            {` at ${info.received.branch_name || "-"} | ${formatDate(info.received.at)}${info.received.by ? ` | by ${info.received.by}` : ""}`}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12 }}>
          <Text strong style={{ fontSize: 12 }}>Now</Text>
          {` ${info.current_status_label || statusText(info.current_status)}${info.current_branch_name ? ` at ${info.current_branch_name}` : ""}`}
        </Text>
        {(info.data_gaps || []).map((g) => (
          <Alert key={g} type="warning" showIcon message={g} style={{ padding: "2px 8px", fontSize: 12 }} />
        ))}
      </Space>
    </Card>
  );
}

function TimelineModal({ open, shipment, onClose }) {
  if (!shipment) return null;

  const timeline = shipment.timeline || [];

  const getTimelineIcon = (status) => {
    const icons = {
      sorted_for_transfer: <SendOutlined style={{ color: "#fa8c16" }} />,
      in_transit: <CarOutlined style={{ color: "#1677ff" }} />,
      dispatched_to_destination_branch: <CarOutlined style={{ color: "#1677ff" }} />,
      received_at_transit_hub: <InboxOutlined style={{ color: "#13c2c2" }} />,
      received_at_destination_branch: <InboxOutlined style={{ color: "#13c2c2" }} />,
      received_at_destination_sub_branch: <InboxOutlined style={{ color: "#13c2c2" }} />,
      sorted_for_delivery: <HomeOutlined style={{ color: "#722ed1" }} />,
      assigned_to_rider: <HomeOutlined style={{ color: "#2f54eb" }} />,
      out_for_delivery: <CarOutlined style={{ color: "#2f54eb" }} />,
      delivered: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
    };
    return icons[status] || <ClockCircleOutlined />;
  };

  const getTimelineColor = (status) => {
    const colors = {
      sorted_for_transfer: "orange",
      in_transit: "blue",
      dispatched_to_destination_branch: "blue",
      received_at_transit_hub: "cyan",
      received_at_destination_branch: "cyan",
      received_at_destination_sub_branch: "cyan",
      sorted_for_delivery: "purple",
      assigned_to_rider: "geekblue",
      out_for_delivery: "geekblue",
      delivered: "green",
      delivery_failed: "red",
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
          {shipment.transfer_info ? <TransferInfoSummary info={shipment.transfer_info} /> : null}
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
                    <Text strong>{event.description || statusText(event.status)}</Text>
                    {(event.next_hop || event.path_text || event.branch_name || event.to_branch_name) ? (
                      <>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {[
                            event.from_branch_name && event.to_branch_name
                              ? `${event.from_branch_name} -> ${event.to_branch_name}`
                              : event.branch_name,
                            event.manifest_number ? `Manifest ${event.manifest_number}` : null,
                            event.next_hop ? `Next: ${event.next_hop}` : null,
                            event.path_text,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </>
                    ) : null}
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(event.at)}
                      {event.by ? ` | by ${event.by}` : ""}
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

/**
 * Grouped Outbound View - Shows shipments grouped by origin-destination route
 * with expandable sections for each route group
 */
function GroupedOutboundView({ rows, selectedRowKeys, onSelectionChange, loading, pagination, onDispatchGroup }) {
  // Group by route using the _routeGroup attached by the backend
  const groups = useMemo(() => {
    const routeGroups = {};
    rows.forEach((shipment) => {
      const route = shipment._routeGroup || {
        id: null,
        route_code: "UNMATCHED",
        route_name: "No configured route",
        is_configured: false,
        path_text: "Create a transfer route for this destination / service",
        destination_branch_id: shipment.destination_branch_id,
        service_type: shipment.service_type,
      };

      const routeKey =
        route.id ||
        route.route_id ||
        `fallback-${shipment.destination_sub_branch_id || shipment.destination_branch_id || shipment.id}`;
      if (!routeGroups[routeKey]) {
        routeGroups[routeKey] = {
          key: String(routeKey),
          route,
          origin: routeLabel(
            route.origin_branch || shipment.origin_branch,
            route.origin_sub_branch || shipment.origin_sub_branch,
            "Origin"
          ),
          destination: routeLabel(
            route.destination_branch || shipment.destination_branch,
            route.destination_sub_branch || shipment.destination_sub_branch,
            "Destination"
          ),
          transitBranches: route.transit_branches || [],
          pathText: route.path_text,
          shipments: [],
          count: 0,
        };
      }
      routeGroups[routeKey].shipments.push(shipment);
      routeGroups[routeKey].count++;
    });
    return Object.values(routeGroups);
  }, [rows]);
  
  // Flatten selected keys for the parent component
  const handleGroupSelectionChange = (groupKey, selectedKeys) => {
    const newSelected = new Set(selectedRowKeys);
    selectedKeys.forEach(key => newSelected.add(key));
    // Remove keys from other groups that are not in this group's selection
    groups.forEach(g => {
      if (g.key !== groupKey) {
        g.shipments.forEach(s => newSelected.delete(s.id));
      }
    });
    onSelectionChange(Array.from(newSelected));
  };

  const handleDispatchGroup = (group) => {
    if (onDispatchGroup) {
      onDispatchGroup(group);
    }
  };

  return (
    <div style={{ padding: 8 }}>
      {groups.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing to dispatch. Ready parcels appear here after Sort for Transfer." />
      ) : (
        <Collapse
          activeKey={groups.map(g => g.key)}
          bordered={false}
          ghost
        >
          {groups.map((group, index) => (
            <Panel
              key={group.key}
              header={
                <Space size={12} style={{ width: "100%", justifyContent: "space-between" }}>
                  <Space>
                    <OrderedListOutlined />
                    <Text strong>{group.origin}</Text>
                    {group.transitBranches.length > 0 ? (
                      <>
                        <ArrowRightOutlined style={{ color: "#bfbfbf", fontSize: 16 }} />
                        {group.transitBranches.map((tb, i) => (
                          <Space key={i} size={4}>
                            <Text strong style={{ color: "#fa8c16" }}>{tb.name}</Text>
                            {i < group.transitBranches.length - 1 && <ArrowRightOutlined style={{ color: "#bfbfbf", fontSize: 16 }} />}
                          </Space>
                        ))}
                        <ArrowRightOutlined style={{ color: "#bfbfbf", fontSize: 16 }} />
                      </>
                    ) : (
                      <ArrowRightOutlined style={{ color: "#bfbfbf", fontSize: 16 }} />
                    )}
                    <Text strong style={{ color: "#1677ff" }}>{group.destination}</Text>
                  </Space>
                  <Space size={8}>
                    <Badge count={group.count} color="blue" />
                    <Tag color="green">{group.route?.service_type?.toUpperCase() || "STANDARD"}</Tag>
                    {group.pathText && (
                      <Tooltip title={group.pathText}>
                        <Tag color="orange"><GlobalOutlined /> {group.pathText.substring(0, 40)}...</Tag>
                      </Tooltip>
                    )}
                    <Tag color="purple">Route: {group.route?.route_code || group.route?.route_name || 'Auto'}</Tag>
                  </Space>
                </Space>
              }
              showArrow={false}
            >
              <div style={{ padding: "8px 0" }}>
                <Space style={{ marginBottom: 8, justifyContent: "space-between" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {group.count} shipment{group.count !== 1 ? 's' : ''} • {group.route?.transfer_count || 1} hop{group.route?.transfer_count > 1 ? 's' : ''}
                    {group.transitBranches.length > 0 && ` • Transit: ${group.transitBranches.map(t => t.name).join(' → ')}`}
                  </Text>
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      icon={<SendOutlined />}
                      onClick={() => handleDispatchGroup(group)}
                      disabled={loading}
                    >
                      Dispatch Group
                    </Button>
                  </Space>
                </Space>
                <Table
                  rowKey="id"
                  size="small"
                  rowSelection={{
                    selectedRowKeys: selectedRowKeys.filter(key => 
                      group.shipments.some(s => s.id === key)
                    ),
                    onChange: (keys) => handleGroupSelectionChange(group.key, keys),
                    columnWidth: "40px",
                  }}
                  columns={[
                    {
                      title: "Shipment",
                      key: "shipment",
                      render: (_, s) => (
                        <Space direction="vertical" size={2}>
                          <Text strong style={{ fontSize: 12 }}>{s.tracking_number || `#${s.id}`}</Text>
                          <Space size={4} wrap>
                            <TransferStageTag shipment={s} />
                            <ServiceTypeTag value={s.hop_meta?.service_type || s.service_type} />
                          </Space>
                        </Space>
                      ),
                    },
                    {
                      title: "Receiver",
                      key: "receiver",
                      render: (_, s) => (
                        <Space direction="vertical" size={0}>
                          <Text style={{ fontSize: 12 }}>{s.receiver_name || "-"}</Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {s.receiver_phone ? <Space size={4}><PhoneOutlined />{s.receiver_phone}</Space> : "-"}
                          </Text>
                        </Space>
                      ),
                    },
                    {
                      title: "Payment",
                      key: "payment",
                      render: (_, s) =>
                        ["pod", "cod", "to_pay"].includes(String(s.payment_type || "").toLowerCase()) ? (
                          <Space direction="vertical" size={0}>
                            <Tag color="volcano" style={{ margin: 0 }}><DollarOutlined /> POD</Tag>
                            <Text strong style={{ fontSize: 11 }}>{money(s.total_collectable_amount || s.pod_amount)}</Text>
                          </Space>
                        ) : (
                          <Tag color="green" style={{ margin: 0 }}>Prepaid</Tag>
                        ),
                    },
                    {
                      title: "Next Hop",
                      key: "next_hop",
                      render: (_, s) => (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {s.hop_meta?.next_hop_name || s.hop_meta?.path_text || "Final Destination"}
                        </Text>
                      ),
                    },
                  ]}
                  dataSource={group.shipments}
                  scroll={{ x: 800 }}
                  locale={{
                    emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No shipments in this group" />,
                  }}
                  pagination={false}
                />
              </div>
            </Panel>
          ))}
        </Collapse>
      )}
      {/* Pagination at bottom */}
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          showSizeChanger={true}
          showTotal={(t) => `${t} shipment${t === 1 ? "" : "s"}`}
          onChange={(p, ps) => pagination.onChange(p, ps)}
        />
      </div>
    </div>
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
    sent: 0,
    in_transit: 0,
    received: 0,
    completed: 0,
    total_value: 0,
    pod_amount: 0,
  });
  const [outboundRows, setOutboundRows] = useState([]);
  const [sentRows, setSentRows] = useState([]);
  const [historyDirection, setHistoryDirection] = useState("all");
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

  // View mode for outbound tab (next_hop | grouped/route | flat)
  const [viewMode, setViewMode] = useState("next_hop");
  const [selectedNextHopKey, setSelectedNextHopKey] = useState(null);
  const [selectedNextHop, setSelectedNextHop] = useState(null);

  // Selected branch ID for admin users to override branch scope
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  // Branches list for admin branch selector
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsData = await getTransferStats(selectedBranchId);
      setStats(statsData);
    } catch (e) {
      message.error("Failed to load transfer statistics");
    } finally {
      setStatsLoading(false);
    }
  }, [selectedBranchId]);

  // Load configured transfer routes for this branch
  const loadAvailableRoutes = useCallback(async () => {
    setRoutesLoading(true);
    try {
      const params = {};
      if (serviceTypeFilter && serviceTypeFilter !== "all") {
        params.service_type = serviceTypeFilter;
      }
      if (selectedBranchId) {
        params.branch_id = selectedBranchId;
      }
      const res = await getAvailableTransferRoutes(params);
      // Branch-scoped API returns flat route cards. Admin (no branch_id) may
      // return origin groups { origin_branch_id, routes: [...] } — flatten.
      const raw = Array.isArray(res.routes) ? res.routes : [];
      const routes = raw.some((r) => Array.isArray(r?.routes))
        ? raw.flatMap((g) => (Array.isArray(g.routes) ? g.routes : []))
        : raw;
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
  }, [serviceTypeFilter, selectedBranchId]);

  // Computed: Filter routes that match selected shipments
  const filteredRoutesForSelection = useMemo(() => {
    if (!selectedRowKeys.length) return availableRoutes;
    const selectedShipments = outboundRows.filter((s) => selectedRowKeys.includes(s.id));
    if (!selectedShipments.length) return availableRoutes;
    return filterRoutesForShipments(availableRoutes, selectedShipments);
  }, [availableRoutes, selectedRowKeys, outboundRows]);

  const routesForCards = useMemo(() => {
    return selectedRowKeys.length ? filteredRoutesForSelection : availableRoutes;
  }, [selectedRowKeys, filteredRoutesForSelection, availableRoutes]);

  // Unmatched = no resolved next hop (same rule as next-hop groups).
  // Do NOT use shipmentMatchesRoute alone: hop_meta.next_hop can place a
  // parcel in a Ready-to-Dispatch hop while availableRoutes shape/keys fail
  // a dest-only compare (false "no matching active route" double-count).
  const unmatchedOutbound = useMemo(() => {
    return outboundRows.filter((s) => {
      const hop = resolveShipmentNextHop(s, availableRoutes);
      return !Number(hop?.id || 0);
    });
  }, [outboundRows, availableRoutes]);

  // When a route card is selected, show only parcels that match that route.
  // Card badge counts always use full outboundRows (see RoutePickerCards).
  const displayedOutbound = useMemo(() => {
    let rows = outboundRows;
    if (selectedTransferRouteId) {
      const route = availableRoutes.find(
        (r) => Number(r.route_id ?? r.id) === Number(selectedTransferRouteId)
      );
      if (route) rows = rows.filter((s) => shipmentMatchesRoute(s, route));
    }
    if (selectedNextHop && viewMode === "next_hop") {
      rows = rows.filter((s) => {
        const hop = resolveShipmentNextHop(s, availableRoutes);
        return (
          Number(hop.id) === Number(selectedNextHop.nextHopId) &&
          String(hop.service) === String(selectedNextHop.serviceType)
        );
      });
    }
    return rows;
  }, [outboundRows, availableRoutes, selectedTransferRouteId, selectedNextHop, viewMode]);

  // Auto-select first next-hop with shipments when none selected (ops speed).
  // Also refresh the selected hop object after outbound reload.
  useEffect(() => {
    if (viewMode !== "next_hop" || activeTab !== "outbound") return;
    // Shipment-driven groups only (no empty catalog seeds) so tab switches
    // cannot reselect / re-show empty hops.
    const groups = buildNextHopGroups(availableRoutes, outboundRows);
    if (!groups.length) {
      if (selectedNextHopKey) {
        setSelectedNextHopKey(null);
        setSelectedNextHop(null);
      }
      return;
    }
    if (selectedNextHopKey) {
      const match = groups.find((g) => g.key === selectedNextHopKey && g.count > 0);
      if (match) {
        setSelectedNextHop(match);
        setSelectedRowKeys((prev) => {
          const ids = new Set(match.shipmentIds || []);
          // Preserve user checkbox edits; only drop ids that left this hop.
          return (prev || []).filter((id) => ids.has(id));
        });
        return;
      }
      // Previous selection gone or emptied — fall through to auto-pick
    }
    if (!outboundRows.length) return;
    const first = groups.find((g) => g.count > 0);
    if (!first) return;
    setSelectedNextHopKey(first.key);
    setSelectedNextHop(first);
    setSelectedRowKeys(first.shipmentIds || []);
  }, [outboundRows, availableRoutes, viewMode, activeTab, selectedNextHopKey]);

  // Load outbound (optionally filtered by selected transfer route)
  const loadOutbound = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const baseParams = {
        page,
        per_page: pageSize,
        direction: "outbound",
        search: debouncedSearch || undefined,
      };
      if (selectedBranchId) {
        baseParams.branch_id = selectedBranchId;
      }
      if (serviceTypeFilter && serviceTypeFilter !== "all") {
        baseParams.service_type = serviceTypeFilter;
      }

      const flattenGrouped = (res) => {
        const allShipments = [];
        (res.routes || []).forEach((routeGroup) => {
          (routeGroup.shipments || []).forEach((shipment) => {
            allShipments.push({
              ...shipment,
              _routeGroup: routeGroup.route,
            });
          });
        });
        // Keep unmatched ready parcels visible with a clear CTA group.
        (res.unmatched || []).forEach((shipment) => {
          allShipments.push({
            ...shipment,
            _routeGroup: {
              id: null,
              route_id: null,
              route_code: "UNMATCHED",
              route_name: "No configured route",
              is_configured: false,
              destination_branch_id:
                shipment.destination_sub_branch_id || shipment.destination_branch_id,
              service_type: shipment.service_type || "standard",
              path_text: "Configure a transfer route for this destination",
            },
          });
        });
        return allShipments;
      };

      let allShipments = [];
      let total = 0;

      if (viewMode === "next_hop") {
        const groupedRes = await getTransfers({ ...baseParams, group_by_next_hop: true });
        if (Array.isArray(groupedRes?.next_hops) && groupedRes.next_hops.length) {
          const all = [];
          groupedRes.next_hops.forEach((hop) => {
            (hop.shipments || []).forEach((shipment) => {
              all.push({
                ...shipment,
                _routeGroup: {
                  id: hop.next_hop_branch_id,
                  next_hop_branch_id: hop.next_hop_branch_id,
                  next_hop_name: hop.next_hop_name,
                  next_hop_coverage_id: hop.next_hop_coverage_id,
                  service_type: hop.service_type,
                  destination_branch_name: (hop.finals || []).map((f) => f.destination_name).join(", "),
                  route_code: (hop.route_codes || [])[0] || null,
                  is_configured: true,
                },
              });
            });
          });
          (groupedRes.unmatched || []).forEach((shipment) => {
            all.push({
              ...shipment,
              _routeGroup: {
                id: null,
                route_code: "UNMATCHED",
                route_name: "No next hop resolved",
                is_configured: false,
              },
            });
          });
          allShipments = all;
          total = Number(groupedRes.total_shipments ?? all.length);
        }
        if (allShipments.length === 0) {
          // Fall back to route-grouped + client next-hop regroup
          const routeRes = await getTransfers({ ...baseParams, group_by_route: true });
          if (Array.isArray(routeRes?.routes)) {
            allShipments = flattenGrouped(routeRes);
            total = Number(routeRes.total_shipments ?? allShipments.length);
          }
        }
        if (allShipments.length === 0) {
          const flatRes = await getTransfers(baseParams);
          allShipments = flatRes.list || [];
          total = Number(flatRes.total ?? allShipments.length);
        }
      } else if (viewMode === "grouped") {
        const groupedRes = await getTransfers({ ...baseParams, group_by_route: true });
        if (Array.isArray(groupedRes?.routes)) {
          allShipments = flattenGrouped(groupedRes);
          total = Number(groupedRes.total_shipments ?? allShipments.length);
        }
        // Safety net: if grouped parse yielded nothing, fall back to flat list
        // so route-card counts and the board never go blank while stats > 0.
        if (allShipments.length === 0) {
          const flatRes = await getTransfers(baseParams);
          allShipments = flatRes.list || [];
          total = Number(flatRes.total ?? allShipments.length);
        }
      } else {
        const flatRes = await getTransfers(baseParams);
        allShipments = flatRes.list || [];
        total = Number(flatRes.total ?? allShipments.length);
      }

      setOutboundRows(allShipments);
      setPagination((p) => ({ ...p, current: page, total }));
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load outbound transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, serviceTypeFilter, selectedBranchId, viewMode]);

  // Load inbound
  const loadInbound = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const inboundParams = { page, per_page: pageSize, direction: "inbound", search: debouncedSearch || undefined };
      if (selectedBranchId) {
        inboundParams.branch_id = selectedBranchId;
      }
      if (serviceTypeFilter && serviceTypeFilter !== "all") inboundParams.service_type = serviceTypeFilter;
      const res = await getTransfers(inboundParams);
      setInboundRows(res.list);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load inbound transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, serviceTypeFilter, selectedBranchId]);

  // Load sent (outbounded): everything the branch dispatched, any later state
  const loadSent = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, direction: "sent", search: debouncedSearch || undefined };
      if (selectedBranchId) params.branch_id = selectedBranchId;
      if (serviceTypeFilter && serviceTypeFilter !== "all") params.service_type = serviceTypeFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await getTransfers(params);
      setSentRows(res.list || []);
      setPagination((p) => ({ ...p, current: res.currentPage || page, pageSize, total: Number(res.total ?? 0) }));
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load sent transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, serviceTypeFilter, statusFilter, selectedBranchId]);

  // Load received: everything that arrived at the branch, any later state
  const loadReceived = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const receivedParams = { page, per_page: pageSize, search: debouncedSearch || undefined };
      if (selectedBranchId) {
        receivedParams.branch_id = selectedBranchId;
      }
      if (serviceTypeFilter && serviceTypeFilter !== "all") receivedParams.service_type = serviceTypeFilter;
      if (statusFilter !== "all") receivedParams.status = statusFilter;
      const res = await getReceivedTransfers(receivedParams);
      setReceivedRows(res.list || []);
      setPagination((p) => ({ ...p, current: res.currentPage || page, pageSize, total: Number(res.total ?? 0) }));
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load received transfers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, serviceTypeFilter, statusFilter, selectedBranchId]);

  // Load completed
  const loadCompleted = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, search: debouncedSearch || undefined };
      if (selectedBranchId) {
        params.branch_id = selectedBranchId;
      }
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
  }, [debouncedSearch, dateRange, selectedBranchId]);

  // Load history
  const loadHistory = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, search: debouncedSearch || undefined };
      if (selectedBranchId) {
        params.branch_id = selectedBranchId;
      }
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (historyDirection !== "all") {
        params.direction = historyDirection;
      }
      if (serviceTypeFilter && serviceTypeFilter !== "all") params.service_type = serviceTypeFilter;
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
  }, [debouncedSearch, dateRange, statusFilter, historyDirection, serviceTypeFilter, selectedBranchId]);

  // Load data based on active tab
  const loadData = useCallback(async () => {
    setSelectedRowKeys([]);
    switch (activeTab) {
      case "outbound":
        await loadOutbound(pagination.current, pagination.pageSize);
        break;
      case "sent":
        await loadSent();
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
  }, [activeTab, pagination.current, pagination.pageSize, loadOutbound, loadSent, loadInbound, loadReceived, loadCompleted, loadHistory]);

  // Load branches for admin branch selector
  const loadBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const response = await api.get("/admin/branches", {
        params: { per_page: 100, status: "active" },
      });
      const payload = response?.data?.data ?? response?.data ?? [];
      const branchesList = Array.isArray(payload) ? payload : (payload?.data || []);
      setBranches(branchesList);
    } catch (e) {
      console.error("Failed to load branches:", e);
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  // Load stats + configured routes + branches on mount / when service type filter changes
  useEffect(() => {
    loadStats();
    loadAvailableRoutes();
    loadBranches();
  }, [loadStats, loadAvailableRoutes, loadBranches]);

  // Reload lists when service type filter changes
  useEffect(() => {
    setPagination((p) => ({ ...p, current: 1 }));
    setSelectedRowKeys([]);
    setSelectedNextHopKey(null);
    setSelectedNextHop(null);
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

  // Reload the open tab when the branch or a history filter changes
  // (skipped on first render: the tab/search effect above already loads).
  const filtersMounted = useRef(false);
  useEffect(() => {
    if (!filtersMounted.current) {
      filtersMounted.current = true;
      return;
    }
    setPagination((p) => ({ ...p, current: 1 }));
    setSelectedRowKeys([]);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, statusFilter, dateRange, historyDirection]);

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

  // Hub bagging: dispatch all ready parcels that share the same next hop
  const handleDispatchNextHop = async (group) => {
    if (!group?.nextHopId) {
      message.warning("Select a next hop first.");
      return;
    }
    const ids = (group.shipmentIds && group.shipmentIds.length)
      ? group.shipmentIds
      : outboundRows
          .filter((s) => {
            const hop = resolveShipmentNextHop(s, availableRoutes);
            return Number(hop.id) === Number(group.nextHopId)
              && String(hop.service) === String(group.serviceType);
          })
          .map((s) => s.id);
    if (!ids.length) {
      message.warning("No ready parcels for this next hop.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await dispatchToNextHop(ids, group.nextHopId);
      const ok = res?.dispatched?.length ?? res?.dispatched_count ?? 0;
      const skip = res?.skipped ? Object.keys(res.skipped).length : 0;
      message.success(
        skip === 0
          ? `${ok} dispatched to ${group.nextHopName}.`
          : `${ok} dispatched to ${group.nextHopName}, ${skip} skipped.`
      );
      setSelectedRowKeys([]);
      setSelectedNextHopKey(null);
      setSelectedNextHop(null);
      await refresh();
    } catch (e) {
      const errors = e?.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()?.[0] : null;
      message.error(firstError || e?.response?.data?.message || "Failed to dispatch to next hop.");
    } finally {
      setSubmitting(false);
    }
  };

    // Dispatch a group of shipments by route (for grouped view)
  const handleDispatchGroup = async (group) => {
    if (!group || !group.shipments || group.shipments.length === 0) {
      message.warning("No shipments in this group to dispatch.");
      return;
    }
    if (!group.route || !group.route.id) {
      message.warning("No valid route for this group.");
      return;
    }
    
    const shipmentIds = group.shipments.map(s => s.id);
    const transferRouteId = group.route.id || group.route.route_id;
    
    setSubmitting(true);
    try {
      const res = await dispatchTransfers(shipmentIds, transferRouteId);
      const ok = res?.dispatched?.length ?? 0;
      const skip = res?.skipped ? Object.keys(res.skipped).length : 0;
      message.success(skip === 0 ? `${ok} dispatched on route ${group.route.route_code || group.route.route_name}.` : `${ok} dispatched, ${skip} skipped.`);
      setSelectedRowKeys([]);
      await refresh();
    } catch (e) {
      const errors = e?.response?.data?.errors;
      const firstError = errors ? Object.values(errors).flat()?.[0] : null;
      message.error(firstError || e?.response?.data?.message || "Failed to dispatch group.");
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
          <Space size={6} style={{ fontSize: 12 }} wrap>
            <Tag style={{ margin: 0, maxWidth: 160 }}>{origin}</Tag>
            <ArrowRightOutlined style={{ color: "#bfbfbf" }} />
            {nextHop ? (
              <Tag color="processing" style={{ margin: 0, maxWidth: 180 }}>Next: {nextHop}</Tag>
            ) : null}
            {nextHop ? <ArrowRightOutlined style={{ color: "#bfbfbf" }} /> : null}
            <Tag color="purple" style={{ margin: 0, maxWidth: 180 }}>Final: {destination}</Tag>
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

  const timelineColumn = {
    title: "Timeline",
    key: "timeline",
    render: (_, s) => (
      <Button type="link" size="small" onClick={() => showTimelineModal(s)}>
        View Timeline
      </Button>
    ),
  };

  const currentStatusColumn = {
    title: "Current Status",
    key: "current_status",
    render: (_, s) => <CurrentStatusCell shipment={s} />,
  };

  // Sent columns: dispatched FROM the branch, any later state
  const sentColumns = [
    shipmentColumn,
    routeColumn,
    {
      title: "Sent",
      key: "sent",
      render: (_, s) => (
        <TransferLegCell leg={s.transfer_info?.sent} kind="sent" fallbackAt={s.dispatched_at} />
      ),
    },
    currentStatusColumn,
    receiverColumn,
    timelineColumn,
  ];

  // Received columns: arrived AT the branch, any later state
  const receivedColumns = [
    shipmentColumn,
    routeColumn,
    {
      title: "Received",
      key: "received_at",
      render: (_, s) => (
        <TransferLegCell
          leg={s.transfer_info?.received}
          kind="received"
          fallbackAt={s.transfer_info ? null : s.received_at_destination_at}
        />
      ),
    },
    currentStatusColumn,
    receiverColumn,
    paymentColumn,
    timelineColumn,
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

  // History columns: the branch's transfer events + current status
  const historyColumns = [
    shipmentColumn,
    routeColumn,
    {
      title: "Branch Transfer Events",
      key: "branch_events",
      render: (_, s) => <BranchEventsCell shipment={s} />,
    },
    currentStatusColumn,
    {
      title: "Updated",
      key: "updated",
      render: (_, s) => formatDate(s.updated_at),
    },
    timelineColumn,
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
      case "sent":
        return { rows: sentRows, columns: sentColumns, count: pagination.total };
      case "inbound":
        return { rows: inboundRows, columns: inboundColumns, count: stats.in_transit };
      case "received":
        return { rows: receivedRows, columns: receivedColumns, count: pagination.total };
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
        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 10 }}>
          <TabGuide
            type="info"
            message="Hub bagging: parcels that share the same NEXT hop (e.g. KTM→BHA direct + KTM→BRN via BHA) dispatch together. Drill into By route when you need one transfer route only."
          />

          <Card size="small" style={{ margin: 8, borderRadius: 8 }} styles={{ body: { padding: 10 } }}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Space wrap size={[8, 6]} style={{ width: "100%", justifyContent: "space-between" }}>
                <Space wrap size={6}>
                  <Text strong style={{ fontSize: 12 }}>Service</Text>
                  <Select
                    size="small"
                    value={serviceTypeFilter}
                    onChange={setServiceTypeFilter}
                    style={{ minWidth: 130 }}
                    options={[
                      { value: "all", label: "All services" },
                      { value: "standard", label: "Standard" },
                      { value: "express", label: "Express" },
                      { value: "same_day", label: "Same day" },
                      { value: "flight", label: "Flight" },
                    ]}
                  />
                  <Text strong style={{ fontSize: 12 }}>View</Text>
                  <Select
                    size="small"
                    value={viewMode}
                    onChange={(v) => {
                      setViewMode(v);
                      setSelectedNextHopKey(null);
                      setSelectedNextHop(null);
                      if (v === "next_hop") setSelectedTransferRouteId(null);
                    }}
                    style={{ minWidth: 160 }}
                    options={[
                      { value: "next_hop", label: "By next hop" },
                      { value: "grouped", label: "By route" },
                      { value: "flat", label: "Flat list" },
                    ]}
                  />
                  <Badge
                    count={viewMode === "next_hop" ? undefined : routesForCards.length}
                    overflowCount={999}
                    style={{ backgroundColor: "#1677ff" }}
                    title="Routes from this branch"
                  />
                  <Button size="small" icon={<ReloadOutlined />} onClick={loadAvailableRoutes} loading={routesLoading}>
                    Refresh
                  </Button>
                </Space>
              </Space>

              {viewMode === "next_hop" ? null : (
                <RoutePickerCards
                  routes={routesForCards}
                  shipments={outboundRows}
                  selectedRouteId={selectedTransferRouteId}
                  onSelect={(id) => {
                    setSelectedTransferRouteId(id);
                    setSelectedNextHopKey(null);
                    setSelectedNextHop(null);
                  }}
                  loading={routesLoading}
                  serviceTypeFilter={serviceTypeFilter}
                />
              )}

              {unmatchedOutbound.length > 0 && (
                <UnmatchedParcelsAlert
                  unmatched={unmatchedOutbound}
                  hasMatchedHops={outboundRows.some((s) =>
                    Number(resolveShipmentNextHop(s, availableRoutes)?.id || 0) > 0
                  )}
                />
              )}

              {viewMode !== "next_hop" ? (
                selectedTransferRouteId ? (
                  <Tag color="blue" style={{ margin: 0 }}>
                    Filtering / dispatch locked to route #{selectedTransferRouteId}
                  </Tag>
                ) : (
                  <Tag color="orange" style={{ margin: 0 }}>Select a route card before dispatching</Tag>
                )
              ) : null}
            </Space>
          </Card>

          {viewMode === "next_hop" ? (
            <div style={{ padding: "0 8px 8px" }}>
              <NextHopMasterDetail
                routes={routesForCards}
                shipments={outboundRows}
                selectedNextHopKey={selectedNextHopKey}
                loading={routesLoading || loading}
                dispatching={submitting}
                canDispatch={!!can?.("transfers.dispatch")}
                selectedRowKeys={selectedRowKeys}
                onSelectionChange={setSelectedRowKeys}
                onSelect={(group) => {
                  if (!group) {
                    setSelectedNextHopKey(null);
                    setSelectedNextHop(null);
                    setSelectedRowKeys([]);
                    return;
                  }
                  setSelectedNextHopKey(group.key);
                  setSelectedNextHop(group);
                  setSelectedTransferRouteId(null);
                  setSelectedRowKeys(group.shipmentIds || []);
                }}
                onDispatch={(group) => handleDispatchNextHop(group)}
              />
            </div>
          ) : viewMode === "flat" ? (
            <Table
              rowKey="id"
              size="small"
              loading={loading}
              dataSource={displayedOutbound}
              columns={outboundColumns}
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                getCheckboxProps: (record) => {
                  if (!selectedTransferRouteId) {
                    return { disabled: true, title: "Select a transfer route first" };
                  }
                  const route = availableRoutes.find(
                    (r) => Number(r.route_id ?? r.id) === Number(selectedTransferRouteId)
                  );
                  const ok = route ? shipmentMatchesRoute(record, route) : false;
                  return {
                    disabled: !ok,
                    title: ok ? undefined : "Parcel does not match selected route / service",
                  };
                },
              }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                onChange: (page, pageSize) => loadOutbound(page, pageSize),
              }}
              scroll={{ x: 1100 }}
            />
          ) : (
            <GroupedOutboundView
              rows={displayedOutbound}
              selectedRowKeys={selectedRowKeys}
              onSelectionChange={setSelectedRowKeys}
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: (page, pageSize) => loadOutbound(page, pageSize),
              }}
              onDispatchGroup={(group) => {
                const routeId = group?.route?.id || group?.route?.route_id;
                if (routeId) setSelectedTransferRouteId(Number(routeId));
                const ids = (group?.shipments || []).map((s) => s.id);
                setSelectedRowKeys(ids);
              }}
            />
          )}
        </Card>
      ),

    },
    {
      key: "sent",
      label: (
        <span>
          <SendOutlined /> Sent ({stats.sent ?? 0})
        </span>
      ),
      children: (
        <Card styles={{ body: { padding: 0 } }} style={{ borderRadius: 14 }}>
          <TabGuide
            type="info"
            message="Parcels this branch has dispatched (outbounded) to another branch, with their current status: in transit, received, out for delivery, delivered."
          />
          <Table
            rowKey="id"
            size="middle"
            loading={loading && activeTab === "sent"}
            columns={currentColumns}
            dataSource={currentRows}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing sent from this branch" />,
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: currentCount,
              showSizeChanger: true,
              showTotal: (t) => `${t} transfer${t === 1 ? "" : "s"}`,
              onChange: (p, ps) => loadSent(p, ps),
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
            message="Transfers received at this branch (final destination or transit hub), with their current status: sorted, assigned to rider, out for delivery, delivered."
          />
          <Table
            rowKey="id"
            size="middle"
            loading={loading && activeTab === "received"}
            columns={currentColumns}
            dataSource={currentRows}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No received transfers" />,
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: currentCount,
              showSizeChanger: true,
              showTotal: (t) => `${t} transfer${t === 1 ? "" : "s"}`,
              onChange: (p, ps) => loadReceived(p, ps),
            }}
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
            message="Transfer events for this branch (sorted, dispatched, received) with time and user, and each parcel's current status. Filter by date, status or direction; open View Timeline for every step."
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
    <div style={{ padding: 12, background: "#f7f8fa", minHeight: "100%" }}>
      {/* Header */}
      <AdminPageHeader
        title="Transfers"
        subtitle="Hop-by-hop branch handoffs - organized by service type"
        icon={<SwapOutlined />}
        actions={
          <Button icon={<ReloadOutlined />} onClick={refresh}>Refresh</Button>
        }
      />
      <Card className="admin-card" size="small" style={{ marginBottom: 8 }} styles={{ body: { padding: 10 } }}>
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
          {/* Branch Selector (for Admin users to override branch scope) */}
          {branches.length > 0 && (
            <Select
              value={selectedBranchId}
              onChange={(value) => setSelectedBranchId(value || null)}
              style={{ width: 220 }}
              placeholder="Select branch to manage"
              allowClear
              loading={branchesLoading}
              options={branches.map((branch) => ({
                value: branch.id,
                label: `${branch.name} (${branch.code || branch.id})`,
              }))}
            />
          )}
        </Col>
        <Col>
          {/* Current-status filter (Sent / Received / History) */}
          {["sent", "received", "history"].includes(activeTab) && (
            <Space wrap>
              {activeTab === "history" && (
                <Select
                  value={historyDirection}
                  onChange={setHistoryDirection}
                  style={{ width: 160 }}
                  options={[
                    { value: "all", label: "Sent + Received" },
                    { value: "sent", label: "Sent only" },
                    { value: "received", label: "Received only" },
                  ]}
                />
              )}
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 200 }}
              >
                <Option value="all">All current statuses</Option>
                <Option value="sorted_for_transfer">Ready to dispatch</Option>
                <Option value="in_transit">In Transit</Option>
                <Option value="received_at_transit_hub">At transit hub</Option>
                <Option value="received_at_destination_branch">Received at destination</Option>
                <Option value="sorted_for_delivery">Sorted for delivery</Option>
                <Option value="assigned_to_rider">Assigned to rider</Option>
                <Option value="out_for_delivery">Out for delivery</Option>
                <Option value="delivered">Delivered</Option>
                <Option value="delivery_failed">Delivery failed</Option>
              </Select>
            </Space>
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
            gap: 10,
            background: "#fff7e6",
            border: "1px solid #ffd591",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 8,
          }}
        >
          <Space size={8}>
            <Badge count={selectedRowKeys.length} style={{ background: "#fa8c16" }} />
            <Text strong style={{ fontSize: 13 }}>{selectedRowKeys.length} selected</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {viewMode === "next_hop"
                ? (selectedNextHop ? `Dispatch bag → ${selectedNextHop.nextHopName}` : "Dispatch to next hop")
                : "Dispatch on selected transfer route"}
            </Text>
          </Space>
          <Space>
            <Button size="small" onClick={() => setSelectedRowKeys([])}>Clear</Button>
            {viewMode === "next_hop" ? (
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                loading={submitting}
                onClick={() => handleDispatchNextHop(selectedNextHop)}
                disabled={!selectedNextHop || selectedRowKeys.length === 0}
              >
                {selectedNextHop ? `Dispatch to ${selectedNextHop.nextHopName}` : "Dispatch to next hop"}
              </Button>
            ) : (
              <Tooltip
                title={
                  !selectedTransferRouteId
                    ? "Select a transfer route card first"
                    : "Dispatch selected parcels to the route NEXT hop"
                }
              >
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  loading={submitting}
                  onClick={handleBulkDispatch}
                  disabled={!selectedTransferRouteId || selectedRowKeys.length === 0}
                >
                  Dispatch selected
                </Button>
              </Tooltip>
            )}
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


