"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import {
  Button,
  DatePicker,
  Empty,
  Input,
  Select,
  Skeleton,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowRightOutlined,
  ClearOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts";

import api from "@/lib/api";
import { normalizeShipmentListResponse } from "@/services/merchant/merchantShipmentService";
import { formatMerchantLabel } from "@/lib/merchantLabel";
import { collectAmount } from "@/lib/collectAmount";
import { labelForStatus } from "@/config/workflowStatus";
import { usePermissions } from "@/hooks/usePermission";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { useShipmentDrawer } from "@/components/admin/shipments/ShipmentDrawerProvider";

import styles from "./shipments.module.css";

const { Text } = Typography;

/*
|--------------------------------------------------------------------------
| Status palette (order = lifecycle order, used by chart + filter)
|--------------------------------------------------------------------------
*/
const STATUS_META = [
  ["booked", "#64748B"],
  ["pending", "#94A3B8"],
  ["confirmed", "#3B82F6"],
  ["awaiting_pickup", "#F59E0B"],
  ["pickup_requested", "#F59E0B"],
  ["pickup_assigned", "#8B5CF6"],
  ["picked_up", "#6366F1"],
  ["pickup_failed", "#F43F5E"],
  ["received_at_origin_sub_branch", "#7C3AED"],
  ["received_at_origin_branch", "#7C3AED"],
  ["received_at_origin", "#7C3AED"],
  ["sorted_for_delivery", "#14B8A6"],
  ["sorted_for_transfer", "#F97316"],
  ["in_transit", "#0891B2"],
  ["received_at_transit_hub", "#0E7490"],
  ["dispatched_to_destination_branch", "#0369A1"],
  ["received_at_destination_branch", "#CA8A04"],
  ["received_at_destination_sub_branch", "#CA8A04"],
  ["received_at_destination", "#CA8A04"],
  ["assigned_to_rider", "#DB2777"],
  ["out_for_delivery", "#2563EB"],
  ["delivered", "#10B981"],
  ["delivery_failed", "#EF4444"],
  ["failed", "#EF4444"],
  ["return_initiated", "#D97706"],
  ["returned_to_origin", "#B45309"],
  ["cancelled", "#9CA3AF"],
];
const STATUS_ORDER = STATUS_META.map(([key]) => key);
const STATUS_COLOR = Object.fromEntries(STATUS_META);
const EXTRA_LABELS = {
  awaiting_pickup: "Awaiting Pickup",
  pickup_requested: "Pickup Requested",
  received_at_origin: "Received at Origin",
  received_at_destination: "Received at Destination",
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
};

// Older status keys: only listed in the filter when shipments still use them.
const LEGACY_STATUSES = ["pending", "confirmed", "failed", "pickup_requested", "received_at_origin", "received_at_destination"];

const statusLabel = (status) => EXTRA_LABELS[status] || labelForStatus(status);
const statusColor = (status) => STATUS_COLOR[status] || "#64748B";

const SERVICE_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "express", label: "Express" },
  { value: "same_day", label: "Same day" },
];

const PAYMENT_OPTIONS = [
  { value: "pod", label: "POD" },
  { value: "prepaid", label: "Prepaid" },
  { value: "to_pay", label: "To pay" },
];

const FILTER_KEYS = [
  "search",
  "status",
  "service_type",
  "payment_type",
  "merchant_id",
  "branch_id",
  "origin_branch_id",
  "destination_branch_id",
  "date_from",
  "date_to",
];

const PAGE_SIZES = [10, 20, 50, 100];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/
function branchName(branch) {
  if (!branch) return null;
  if (typeof branch === "string") return branch;
  return branch.name || branch.branch_name || null;
}

function money(value) {
  const amount = Number(value || 0);
  return `NPR ${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}



function readFilters(searchParams) {
  const filters = {};
  FILTER_KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value !== null && value !== "") filters[key] = value;
  });
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPageRaw = Number(searchParams.get("per_page")) || 20;
  const perPage = PAGE_SIZES.includes(perPageRaw) ? perPageRaw : 20;
  return { filters, page, perPage };
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/*
|--------------------------------------------------------------------------
| Status donut
|--------------------------------------------------------------------------
*/
function StatusDonut({ counts, total, activeStatus, loading, onSelect }) {
  const data = useMemo(
    () =>
      Object.entries(counts || {})
        .filter(([, value]) => Number(value) > 0)
        .map(([status, value]) => ({ status, value: Number(value), label: statusLabel(status) }))
        .sort((a, b) => {
          const ia = STATUS_ORDER.indexOf(a.status);
          const ib = STATUS_ORDER.indexOf(b.status);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        }),
    [counts]
  );

  const delivered = Number(counts?.delivered || 0);
  const deliveredRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const activeCount = activeStatus ? Number(counts?.[activeStatus] || 0) : total;

  if (loading && !data.length) {
    return (
      <div className={styles.chartCard}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    );
  }

  return (
    <div className={styles.chartCard}>
      <div className={styles.donutWrap}>
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius="64%"
                outerRadius="98%"
                paddingAngle={data.length > 1 ? 1.5 : 0}
                stroke="#fff"
                strokeWidth={1}
                isAnimationActive={false}
                onClick={(entry) => onSelect(entry?.status)}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={statusColor(entry.status)}
                    opacity={!activeStatus || activeStatus === entry.status ? 1 : 0.28}
                    style={{ cursor: "pointer", outline: "none" }}
                  />
                ))}
              </Pie>
              <ChartTooltip
                formatter={(value, name) => [
                  `${value} (${total ? ((value / total) * 100).toFixed(1) : 0}%)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className={styles.donutEmpty} />
        )}
        <div className={styles.donutCenter}>
          <strong>{activeCount}</strong>
          <span>{activeStatus ? statusLabel(activeStatus) : "Shipments"}</span>
        </div>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendHead}>
          <span className={styles.legendTitle}>Shipments by status</span>
          <span className={styles.legendMeta}>
            {total} total · <b>{deliveredRate}%</b> delivered
          </span>
        </div>
        {data.length ? (
          <div className={styles.legendGrid}>
            {data.map((entry) => {
              const active = activeStatus === entry.status;
              const pct = total ? ((entry.value / total) * 100).toFixed(1) : "0";
              return (
                <button
                  type="button"
                  key={entry.status}
                  className={`${styles.legendItem} ${active ? styles.legendItemActive : ""} ${
                    activeStatus && !active ? styles.legendItemDim : ""
                  }`}
                  onClick={() => onSelect(entry.status)}
                  title={active ? "Click to clear the status filter" : `Show ${entry.label}`}
                >
                  <span className={styles.dot} style={{ background: statusColor(entry.status) }} />
                  <span className={styles.legendLabel}>{entry.label}</span>
                  <span className={styles.legendCount}>{entry.value}</span>
                  <span className={styles.legendPct}>{pct}%</span>
                </button>
              );
            })}
          </div>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            No shipments match these filters.
          </Text>
        )}
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/
function ShipmentsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const { filters, page, perPage } = useMemo(
    () => readFilters(new URLSearchParams(queryString)),
    [queryString]
  );

  const { openShipment } = useShipmentDrawer();
  const { isSuperAdmin } = usePermissions();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [countsTotal, setCountsTotal] = useState(0);
  const [facets, setFacets] = useState({ merchants: [], branches: [] });
  const [searchText, setSearchText] = useState(filters.search || "");
  const [reloadKey, setReloadKey] = useState(0);

  const requestRef = useRef(0);
  const searchTimer = useRef(null);

  /* Keep the search box in sync when the URL changes (back/forward, Clear). */
  useEffect(() => {
    setSearchText(filters.search || "");
  }, [filters.search]);

  const updateQuery = useCallback(
    (patch, { keepPage = false } = {}) => {
      const next = new URLSearchParams(queryString);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") next.delete(key);
        else next.set(key, String(value));
      });
      if (!keepPage && !("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, queryString, router]
  );

  /* Load list + counts whenever URL filters/page change. */
  useEffect(() => {
    const requestId = ++requestRef.current;
    setLoading(true);

    api
      .get("/admin/shipments", {
        params: { ...filters, page, per_page: perPage, with_counts: 1 },
      })
      .then((response) => {
        if (requestId !== requestRef.current) return;
        const payload = response?.data?.data ?? response?.data ?? {};
        const normalized = normalizeShipmentListResponse(response, { page, per_page: perPage });
        setRows(normalized.list);
        setTotal(normalized.total);
        setCounts(payload.status_counts || {});
        setCountsTotal(Number(payload.counts_total ?? normalized.total) || 0);
        if (payload.facets) {
          setFacets({
            merchants: Array.isArray(payload.facets.merchants) ? payload.facets.merchants : [],
            branches: Array.isArray(payload.facets.branches) ? payload.facets.branches : [],
          });
        }
      })
      .catch((error) => {
        if (requestId !== requestRef.current) return;
        message.error(error?.response?.data?.message || "Could not load shipments.");
      })
      .finally(() => {
        if (requestId === requestRef.current) setLoading(false);
      });
  }, [filters, page, perPage, reloadKey]);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const onSearchChange = (value) => {
    setSearchText(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      updateQuery({ search: value.trim() });
    }, 450);
  };

  const submitSearch = (value) => {
    clearTimeout(searchTimer.current);
    updateQuery({ search: String(value ?? searchText).trim() });
  };

  const toggleStatus = (status) => {
    if (!status) return;
    updateQuery({ status: filters.status === status ? "" : status });
  };

  const clearAll = () => {
    clearTimeout(searchTimer.current);
    setSearchText("");
    const next = new URLSearchParams();
    if (perPage !== 20) next.set("per_page", String(perPage));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const activeFilterCount = FILTER_KEYS.filter((key) => filters[key]).length;

  /* Options */
  const statusOptions = useMemo(() => {
    const keys = new Set([...STATUS_ORDER, ...Object.keys(counts || {})]);
    return [...keys]
      .filter((key) => counts?.[key] || filters.status === key || !LEGACY_STATUSES.includes(key))
      .map((key) => ({
        value: key,
        label: (
          <span className={styles.optionRow}>
            <span className={styles.dot} style={{ background: statusColor(key) }} />
            {statusLabel(key)}
            {counts?.[key] ? <span className={styles.optionCount}>{counts[key]}</span> : null}
          </span>
        ),
        search: statusLabel(key),
      }));
  }, [counts, filters.status]);

  const merchantOptions = useMemo(
    () =>
      facets.merchants.map((merchant) => ({
        value: String(merchant.id),
        label: merchant.code ? `${merchant.name} (${merchant.code})` : merchant.name,
      })),
    [facets.merchants]
  );

  const branchOptions = useMemo(
    () => facets.branches.map((branch) => ({ value: String(branch.id), label: branch.name })),
    [facets.branches]
  );

  const dateRange = useMemo(
    () => [
      filters.date_from ? dayjs(filters.date_from) : null,
      filters.date_to ? dayjs(filters.date_to) : null,
    ],
    [filters.date_from, filters.date_to]
  );

  const copyTracking = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`Copied ${value}`);
    } catch {
      message.info(value);
    }
  };

  /* Export the filtered list (up to 1,000 rows) as CSV. */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = [];
      for (let current = 1; current <= 10; current += 1) {
        const response = await api.get("/admin/shipments", {
          params: { ...filters, page: current, per_page: 100 },
        });
        const normalized = normalizeShipmentListResponse(response, { page: current, per_page: 100 });
        all.push(...normalized.list);
        if (all.length >= normalized.total || normalized.list.length < 100) break;
      }

      const header = [
        "Tracking",
        "Order ref",
        "Merchant",
        "Service",
        "Origin",
        "Destination",
        "Current branch",
        "Receiver",
        "Phone",
        "Address",
        "Payment",
        "Collect (POD)",
        "Status",
        "Created",
      ];
      const lines = all.map((row) =>
        [
          row.tracking_number,
          row.merchant_order_id || row.order_reference,
          formatMerchantLabel(row),
          row.service_type,
          branchName(row.origin_branch || row.originBranch),
          branchName(row.destination_branch || row.destinationBranch),
          branchName(row.current_branch || row.currentBranch),
          row.receiver_name,
          row.receiver_phone,
          row.delivery_address,
          row.payment_type,
          collectAmount(row),
          statusLabel(row.status),
          row.created_at ? dayjs(row.created_at).format("YYYY-MM-DD HH:mm") : "",
        ]
          .map(csvCell)
          .join(",")
      );

      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shipments-${dayjs().format("YYYYMMDD-HHmm")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      message.success(`Exported ${all.length} shipment${all.length === 1 ? "" : "s"}.`);
    } catch (error) {
      message.error(error?.response?.data?.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: "Shipment",
      key: "tracking",
      width: 196,
      fixed: "left",
      render: (_, record) => {
        const service = record.service_type ? String(record.service_type).replaceAll("_", " ") : null;
        const transfer = !!record.is_transfer;
        return (
          <div className={styles.cellStack}>
            <span className={styles.trackingRow}>
              <button
                type="button"
                className={styles.trackingLink}
                onClick={() => openShipment(record.id)}
                title="Open shipment details"
              >
                {record.tracking_number || `#${record.id}`}
              </button>
              {record.tracking_number ? (
                <Tooltip title="Copy tracking number">
                  <CopyOutlined className={styles.copyIcon} onClick={() => copyTracking(record.tracking_number)} />
                </Tooltip>
              ) : null}
            </span>
            <span className={styles.chipRow}>
              {service ? (
                <span className={`${styles.chip} ${record.service_type === "express" ? styles.chipExpress : ""}`}>
                  {service}
                </span>
              ) : null}
              <span className={`${styles.chip} ${transfer ? styles.chipTransfer : styles.chipLastMile}`}>
                {transfer ? `Transfer${record.transfer_stage_label ? ` · ${record.transfer_stage_label}` : ""}` : "Last-mile"}
              </span>
              {record.merchant_order_id ? (
                <span className={styles.muted} title={record.merchant_order_id}>
                  {record.merchant_order_id}
                </span>
              ) : null}
            </span>
          </div>
        );
      },
    },
    {
      title: "Merchant",
      key: "merchant",
      width: 136,
      ellipsis: true,
      render: (_, record) => (
        <span className={styles.ellipsis} title={formatMerchantLabel(record)}>
          {formatMerchantLabel(record)}
        </span>
      ),
    },
    {
      title: "Route",
      key: "route",
      width: 196,
      render: (_, record) => {
        const origin = branchName(record.origin_branch || record.originBranch) || "-";
        const destination = branchName(record.destination_branch || record.destinationBranch) || "-";
        const current = branchName(record.current_branch || record.currentBranch);
        const nextHop = branchName(record.next_hop_branch || record.nextHopBranch);
        const km = Number(record.route_distance_km) > 0 ? `${Number(record.route_distance_km).toFixed(0)} km` : null;
        return (
          <div className={styles.cellStack}>
            <span className={styles.routeRow}>
              <span className={styles.ellipsis} title={origin}>{origin}</span>
              <ArrowRightOutlined className={styles.routeArrow} />
              <span className={styles.ellipsis} title={destination}>{destination}</span>
            </span>
            {current || nextHop || km ? (
              <span className={styles.muted}>
                {current ? `At ${current}` : null}
                {nextHop ? `${current ? " · " : ""}next ${nextHop}` : null}
                {km ? `${current || nextHop ? " · " : ""}${km}` : null}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Receiver",
      key: "receiver",
      width: 176,
      render: (_, record) => (
        <div className={styles.cellStack}>
          <span className={styles.ellipsis} title={record.receiver_name}>
            <b>{record.receiver_name || "-"}</b>
            {record.receiver_phone ? (
              <a className={styles.phone} href={`tel:${record.receiver_phone}`}>
                {record.receiver_phone}
              </a>
            ) : null}
          </span>
          <span className={`${styles.muted} ${styles.ellipsis}`} title={record.delivery_address}>
            {record.receiver_area || record.receiver_city || record.delivery_address || ""}
          </span>
        </div>
      ),
    },
    {
      title: "Payment",
      key: "payment",
      width: 108,
      align: "right",
      render: (_, record) => {
        const type = record.payment_type || "";
        const isPod = type === "pod";
        // Same rule as the shipment drawer / backend Shipment::collect_amount.
        const collect = collectAmount(record);
        return (
          <div className={`${styles.cellStack} ${styles.alignRight}`}>
            <Tooltip title={collect > 0 ? "Collect from customer (POD total)" : "Nothing to collect at the door"}>
              <span className={collect > 0 ? styles.amount : styles.muted}>{money(collect)}</span>
            </Tooltip>
            <span className={`${styles.chip} ${isPod ? styles.chipPod : styles.chipPrepaid}`}>
              {type ? (isPod ? "POD" : type.replaceAll("_", " ")) : "-"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 156,
      render: (_, record) => (
        <button
          type="button"
          className={styles.statusChip}
          style={{ "--status-color": statusColor(record.status) }}
          onClick={() => toggleStatus(record.status)}
          title="Filter by this status"
        >
          <span className={styles.dot} style={{ background: statusColor(record.status) }} />
          {statusLabel(record.status)}
        </button>
      ),
    },
    {
      title: "Created",
      key: "created_at",
      width: 92,
      render: (_, record) =>
        record.created_at ? (
          <div className={styles.cellStack}>
            <span>{dayjs(record.created_at).format("DD MMM YY")}</span>
            <span className={styles.muted}>{dayjs(record.created_at).format("hh:mm A")}</span>
          </div>
        ) : (
          "-"
        ),
    },
    {
      title: "",
      key: "actions",
      fixed: "right",
      width: 68,
      render: (_, record) => (
        <span className={styles.actions}>
          <Tooltip title="View details">
            <Button size="small" type="primary" icon={<EyeOutlined />} onClick={() => openShipment(record.id)} aria-label="View details" />
          </Tooltip>
          <Tooltip title="Print label">
            <Link href={`/admin/shipments/${record.id}/print`} target="_blank" className={styles.iconAction}>
              <PrinterOutlined />
            </Link>
          </Tooltip>
        </span>
      ),
    },
  ];

  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(page * perPage, total);

  return (
    <div className={styles.page}>
      <AdminPageHeader
        title="Shipments"
        subtitle="Track every shipment in your scope"
        actions={
          <span className={styles.headerActions}>
            <Button size="small" icon={<DownloadOutlined />} loading={exporting} onClick={exportCsv} disabled={!total}>
              Export CSV
            </Button>
            <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => setReloadKey((k) => k + 1)}>
              Refresh
            </Button>
          </span>
        }
      />

      <StatusDonut
        counts={counts}
        total={countsTotal}
        activeStatus={filters.status}
        loading={loading}
        onSelect={toggleStatus}
      />

      <div className={styles.toolbar}>
        <Input
          allowClear
          size="middle"
          className={styles.search}
          prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
          placeholder="Tracking, receiver, phone, merchant, order ref"
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          onPressEnter={(event) => submitSearch(event.currentTarget.value)}
        />
        <Select
          allowClear
          showSearch
          className={styles.fStatus}
          placeholder="Status"
          value={filters.status}
          options={statusOptions}
          optionFilterProp="search"
          onChange={(value) => updateQuery({ status: value })}
          popupMatchSelectWidth={260}
        />
        <Select
          allowClear
          className={styles.fSmall}
          placeholder="Service"
          value={filters.service_type}
          options={SERVICE_OPTIONS}
          onChange={(value) => updateQuery({ service_type: value })}
        />
        <Select
          allowClear
          className={styles.fSmall}
          placeholder="Payment"
          value={filters.payment_type}
          options={PAYMENT_OPTIONS}
          onChange={(value) => updateQuery({ payment_type: value })}
        />
        <Select
          allowClear
          showSearch
          className={styles.fMerchant}
          placeholder="Merchant"
          value={filters.merchant_id}
          options={merchantOptions}
          optionFilterProp="label"
          onChange={(value) => updateQuery({ merchant_id: value })}
          popupMatchSelectWidth={280}
        />
        {isSuperAdmin ? (
          <Select
            allowClear
            showSearch
            className={styles.fBranch}
            placeholder="Any branch"
            value={filters.branch_id}
            options={branchOptions}
            optionFilterProp="label"
            onChange={(value) => updateQuery({ branch_id: value })}
            popupMatchSelectWidth={240}
          />
        ) : null}
        <Select
          allowClear
          showSearch
          className={styles.fBranch}
          placeholder="Origin"
          value={filters.origin_branch_id}
          options={branchOptions}
          optionFilterProp="label"
          onChange={(value) => updateQuery({ origin_branch_id: value })}
          popupMatchSelectWidth={240}
        />
        <Select
          allowClear
          showSearch
          className={styles.fBranch}
          placeholder="Destination"
          value={filters.destination_branch_id}
          options={branchOptions}
          optionFilterProp="label"
          onChange={(value) => updateQuery({ destination_branch_id: value })}
          popupMatchSelectWidth={240}
        />
        <DatePicker.RangePicker
          className={styles.fDate}
          value={dateRange}
          allowEmpty={[true, true]}
          format="DD MMM YY"
          placeholder={["Created from", "to"]}
          onChange={(values) =>
            updateQuery({
              date_from: values?.[0] ? values[0].format("YYYY-MM-DD") : "",
              date_to: values?.[1] ? values[1].format("YYYY-MM-DD") : "",
            })
          }
        />
        <Button icon={<ClearOutlined />} onClick={clearAll} disabled={!activeFilterCount && !searchText}>
          Clear{activeFilterCount ? ` (${activeFilterCount})` : ""}
        </Button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHead}>
          <span>
            {total ? (
              <>
                Showing <b>{from}–{to}</b> of <b>{total}</b> shipments
              </>
            ) : loading ? (
              "Loading shipments…"
            ) : (
              "No shipments"
            )}
            {filters.status ? (
              <button type="button" className={styles.activePill} onClick={() => updateQuery({ status: "" })}>
                <span className={styles.dot} style={{ background: statusColor(filters.status) }} />
                {statusLabel(filters.status)} ✕
              </button>
            ) : null}
          </span>
          <Link href="/admin/shipments/create" className={styles.headLink}>
            <PlusOutlined /> New shipment
          </Link>
        </div>

        <Table
          className={styles.table}
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          tableLayout="fixed"
          scroll={{ x: 1128, y: "max(320px, calc(100vh - 380px))" }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No shipments match these filters" /> }}
          rowClassName={(record) =>
            record.status === "delivered"
              ? styles.rowDelivered
              : ["delivery_failed", "failed", "pickup_failed"].includes(record.status)
                ? styles.rowFailed
                : ""
          }
          pagination={{
            current: page,
            pageSize: perPage,
            total,
            size: "small",
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZES,
            showTotal: (count) => `${count} shipments`,
            onChange: (nextPage, nextSize) => {
              if (nextSize !== perPage) updateQuery({ per_page: nextSize, page: "" });
              else updateQuery({ page: nextPage > 1 ? nextPage : "" }, { keepPage: true });
            },
          }}
        />
      </div>
    </div>
  );
}

export default function ShipmentsPage() {
  return (
    <Suspense fallback={<Skeleton active paragraph={{ rows: 8 }} />}>
      <ShipmentsPageInner />
    </Suspense>
  );
}
