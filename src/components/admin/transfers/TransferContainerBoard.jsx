"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Col, Empty, Input, Modal, Pagination, Row, Select, Space, Spin, Tag, Tooltip, Typography, message } from "antd";
import { ArrowRightOutlined, BarcodeOutlined, CarOutlined, SearchOutlined, StopOutlined } from "@ant-design/icons";
import { cancelContainer, getContainers, lookupContainer } from "@/services/admin/transferService";
import TransferReceiveScanner, { SealTag, TrStatusTag, TR_STATUS_META } from "@/components/admin/transfers/TransferReceiveScanner";
import OpenTrManager from "@/components/admin/transfers/OpenTrManager";
import { vehicleLabel } from "@/components/admin/transfers/TransferDispatchModal";

const { Text } = Typography;

/** Same accent palette as the Outbound next-hop board, hashed from the other branch's id. */
const ACCENTS = [
  { border: "#1677ff", badge: "#1677ff", selectedBg: "rgba(22,119,255,0.12)" },
  { border: "#13c2c2", badge: "#13c2c2", selectedBg: "rgba(19,194,194,0.12)" },
  { border: "#722ed1", badge: "#722ed1", selectedBg: "rgba(114,46,209,0.12)" },
  { border: "#eb2f96", badge: "#eb2f96", selectedBg: "rgba(235,47,150,0.12)" },
  { border: "#fa8c16", badge: "#fa8c16", selectedBg: "rgba(250,140,22,0.12)" },
  { border: "#52c41a", badge: "#52c41a", selectedBg: "rgba(82,196,26,0.12)" },
  { border: "#2f54eb", badge: "#2f54eb", selectedBg: "rgba(47,84,235,0.12)" },
  { border: "#a0d911", badge: "#7cb305", selectedBg: "rgba(160,217,17,0.14)" },
];

function accentFor(id) {
  return ACCENTS[Math.abs(Number(id) || 0) % ACCENTS.length];
}

function fmt(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? String(dt) : d.toLocaleString();
}

function money(v) {
  const n = Number(v || 0);
  return n ? `Rs ${n.toFixed(2)}` : null;
}

const PAGE_SIZE = 15;

function readSaved(key) {
  if (typeof window === "undefined" || !key) return null;
  try {
    const v = JSON.parse(window.sessionStorage.getItem(key) || "null");
    return v && v.id ? v : null;
  } catch {
    return null;
  }
}

function TrCard({ c, selected, direction, onClick }) {
  const other = direction === "inbound" || direction === "inbound_all" ? c.from_branch?.id : c.to_branch?.id;
  const accent = accentFor(other);
  const vehicle = [vehicleLabel(c.vehicle_type), c.vehicle_number].filter(Boolean).join(" · ");
  const carrier = c.rider?.name || c.driver_name;
  const cost = money(c.transport_cost);
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
        border: `1px solid ${selected ? accent.border : "#f0f0f0"}`,
        borderLeft: `4px solid ${accent.border}`,
        background: selected ? accent.selectedBg : "#fff",
        boxShadow: selected ? `0 0 0 1px ${accent.border}33` : "none",
        padding: "8px 10px",
        outline: "none",
        transition: "border-color .15s, background .15s, box-shadow .15s",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ flex: "0 0 auto", textAlign: "center", minWidth: 36 }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: accent.badge }}>{c.parcel_count}</div>
          <Text type="secondary" style={{ fontSize: 10 }}>parcels</Text>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Space size={4} wrap style={{ marginBottom: 2 }}>
            <Text strong style={{ fontSize: 13 }}>{c.display_number}</Text>
            <TrStatusTag status={c.status} />
            <SealTag c={c} />
          </Space>
          <div style={{ fontSize: 12 }}>
            <Text>{c.from_branch?.name || "-"}</Text> <ArrowRightOutlined style={{ color: accent.badge, fontSize: 10 }} />{" "}
            <Text strong>{c.to_branch?.name || "-"}</Text>
          </div>
          <Text style={{ fontSize: 11, display: "block" }}>
            <Text type="success" style={{ fontSize: 11 }}>{c.last_mile_count} last mile</Text>
            {c.onward_count ? <Text type="secondary" style={{ fontSize: 11 }}> · {c.onward_count} onward</Text> : null}
          </Text>
          <Space size={2} wrap style={{ marginTop: 2 }}>
            {c.status !== "open" ? <Tag style={{ margin: 0, fontSize: 11 }}>{c.expected_count} exp</Tag> : null}
            {c.received_count ? <Tag color="green" style={{ margin: 0, fontSize: 11 }}>{c.received_count} in</Tag> : null}
            {c.missing_count ? <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>{c.missing_count} missing</Tag> : null}
            {c.extra_count ? <Tag color="gold" style={{ margin: 0, fontSize: 11 }}>{c.extra_count} extra</Tag> : null}
            {c.auto_append && c.status === "open" ? <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>auto-add</Tag> : null}
          </Space>
          {vehicle || carrier || cost ? (
            <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
              {vehicle || carrier ? (
                <>
                  <CarOutlined /> {[vehicle, carrier].filter(Boolean).join(" · ")}
                </>
              ) : null}
              {cost ? `${vehicle || carrier ? " · " : ""}${cost}` : ""}
            </Text>
          ) : null}
          <Text type="secondary" style={{ fontSize: 10, display: "block" }}>
            {c.dispatched_at ? `Sent ${fmt(c.dispatched_at)}` : `Created ${fmt(c.created_at) || "-"}`}
            {c.received_at ? ` · Received ${fmt(c.received_at)}` : ""}
            {c.cancelled_at ? ` · Cancelled ${fmt(c.cancelled_at)}` : ""}
          </Text>
        </div>
      </div>
    </div>
  );
}

/**
 * TR-first master-detail board, same layout as Outbound: TR cards on the left,
 * the selected TR on the right with the actions that fit it.
 *  - open TR from this branch: edit parcels (add / remove), auto-add, dispatch, cancel
 *  - TR arriving here: receive flow (seal check, parcel scan, confirm)
 *  - partially received: resolve missing (Found / Lost)
 *  - anything else: read-only detail; print label / manifest everywhere
 *
 * props:
 *  - tabKey: remembers the selected TR per tab (sessionStorage)
 *  - direction: "outbound" | "inbound" | "inbound_all" | "all"
 *  - defaultStatuses: statuses listed when the status filter is "default" (e.g. "dispatched,in_transit")
 *  - statusOptions: [{ value, label }] for the status filter ("" = defaultStatuses)
 *  - branchId, search, dateFrom, dateTo, reloadKey
 *  - canReceive, canDispatch, scanLookup (show "scan TR label" box)
 *  - onDispatchOpen(container): dispatch an open TR (page owns the dispatch dialog)
 *  - onChanged(): after any change (stats reload)
 *  - highlightId: TR to select (deep link)
 *  - emptyText
 */
export default function TransferContainerBoard({
  tabKey,
  direction = "outbound",
  defaultStatuses = "",
  statusOptions = null,
  branchId = null,
  search = "",
  dateFrom = null,
  dateTo = null,
  reloadKey = 0,
  canReceive = false,
  canDispatch = false,
  scanLookup = false,
  onDispatchOpen,
  onChanged,
  highlightId = null,
  emptyText = "No TRs",
}) {
  const storageKey = tabKey ? `transfers:tr-board:${tabKey}` : null;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [trSearch, setTrSearch] = useState("");
  const [selected, setSelected] = useState(() => (highlightId ? { id: Number(highlightId) } : readSaved(storageKey)));
  const [localReload, setLocalReload] = useState(0);
  const [detailKey, setDetailKey] = useState(0);
  const [scanCode, setScanCode] = useState("");
  const [looking, setLooking] = useState(false);
  const scanRef = useRef(null);
  const params = useMemo(() => (branchId ? { branch_id: branchId } : {}), [branchId]);

  useEffect(() => {
    if (highlightId) setSelected({ id: Number(highlightId) });
  }, [highlightId]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      if (selected?.id) window.sessionStorage.setItem(storageKey, JSON.stringify(selected));
      else window.sessionStorage.removeItem(storageKey);
    } catch {
      // storage unavailable
    }
  }, [selected, storageKey]);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const apiDirection = direction === "inbound_all" ? "inbound" : direction;
        const q = {
          direction: apiDirection,
          page: p,
          per_page: PAGE_SIZE,
          search: (trSearch || search || "").trim() || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          ...params,
        };
        const st = status || defaultStatuses;
        if (st && st !== "all") q.status = st;
        if (st === "all" && apiDirection === "inbound") q.status = Object.keys(TR_STATUS_META).join(",");
        const res = await getContainers(q);
        const list = res.list || [];
        setRows(list);
        setTotal(Number(res.total || 0));
        setPage(res.currentPage || p);
        // Keep the remembered TR; otherwise pick the first one.
        setSelected((cur) => {
          if (cur?.id) {
            const hit = list.find((c) => Number(c.id) === Number(cur.id));
            return hit ? { id: hit.id, status: hit.status } : cur;
          }
          return list[0] ? { id: list[0].id, status: list[0].status } : null;
        });
      } catch (e) {
        message.error(e?.response?.data?.message || "Failed to load TRs");
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [direction, trSearch, search, dateFrom, dateTo, params, status, defaultStatuses]
  );

  useEffect(() => {
    load(1);
  }, [load, reloadKey, localReload]);

  const changed = () => {
    setLocalReload((k) => k + 1);
    onChanged?.();
  };

  const selectRow = (c) => {
    setSelected({ id: c.id, status: c.status });
    setDetailKey((k) => k + 1);
  };

  const onScanLookup = async () => {
    const code = scanCode.trim();
    if (!code) return;
    setLooking(true);
    try {
      const data = await lookupContainer(code, params);
      if (!data?.id) throw new Error("TR not found");
      setSelected({ id: data.id, status: data.status });
      setDetailKey((k) => k + 1);
      setScanCode("");
      message.success(`${data.display_number} opened`);
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || "TR not found");
      setScanCode("");
    } finally {
      setLooking(false);
      setTimeout(() => scanRef.current?.focus?.(), 50);
    }
  };

  const doCancel = (c) => {
    if (!c?.id) return;
    let reason = "";
    Modal.confirm({
      title: `Cancel ${c.display_number}?`,
      icon: <StopOutlined style={{ color: "#cf1322" }} />,
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text type="secondary">Only an open TR (not yet dispatched) can be cancelled. Its parcels stay ready for transfer.</Text>
          <Input placeholder="Reason (optional)" maxLength={255} onChange={(e) => (reason = e.target.value)} />
        </Space>
      ),
      okText: "Cancel TR",
      okButtonProps: { danger: true },
      cancelText: "Keep",
      onOk: async () => {
        try {
          await cancelContainer(c.id, reason, params);
          message.success(`${c.display_number} cancelled`);
          setSelected({ id: c.id, status: "cancelled" });
          setDetailKey((k) => k + 1);
          changed();
        } catch (e) {
          message.error(e?.response?.data?.message || "Failed to cancel TR");
          throw e;
        }
      },
    });
  };

  const options = statusOptions || [{ value: "", label: "All TR statuses" }];
  const selRow = rows.find((c) => Number(c.id) === Number(selected?.id));
  const selStatus = selRow?.status || selected?.status;
  const showEditor = selStatus === "open" && canDispatch && direction !== "inbound" && direction !== "inbound_all";

  return (
    <Row gutter={[10, 10]} style={{ padding: 8 }}>
      <Col xs={24} lg={9} style={{ display: "flex", flexDirection: "column" }}>
        <Card
          size="small"
          style={{ borderRadius: 8, height: "100%" }}
          styles={{ body: { padding: 10, display: "flex", flexDirection: "column", gap: 8, maxHeight: 680, minHeight: 320 } }}
        >
          {scanLookup && canReceive ? (
            <Input.Search
              ref={scanRef}
              prefix={<BarcodeOutlined />}
              placeholder="Scan TR label (e.g. TR-000001)"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onSearch={onScanLookup}
              loading={looking}
              enterButton="Open"
              allowClear
            />
          ) : null}
          <Space.Compact style={{ width: "100%" }}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="TR no., tracking, vehicle, driver"
              onPressEnter={(e) => setTrSearch(e.target.value)}
              onChange={(e) => {
                if (!e.target.value) setTrSearch("");
              }}
            />
            <Select value={status} onChange={setStatus} options={options} style={{ width: 190 }} />
          </Space.Compact>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {total} TR{total === 1 ? "" : "s"}
          </Text>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 2 }} role="listbox" aria-label="Transfer containers">
            {loading && !rows.length ? (
              <div style={{ textAlign: "center", padding: 32 }}>
                <Spin />
              </div>
            ) : rows.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} style={{ margin: "24px 0" }} />
            ) : (
              rows.map((c) => (
                <TrCard key={c.id} c={c} direction={direction} selected={Number(selected?.id) === Number(c.id)} onClick={() => selectRow(c)} />
              ))
            )}
          </div>
          {total > PAGE_SIZE ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Pagination size="small" current={page} pageSize={PAGE_SIZE} total={total} onChange={(p) => load(p)} showSizeChanger={false} />
            </div>
          ) : null}
        </Card>
      </Col>
      <Col xs={24} lg={15} style={{ display: "flex", flexDirection: "column" }}>
        <Card size="small" style={{ borderRadius: 8, height: "100%" }} styles={{ body: { padding: 10, maxHeight: 680, minHeight: 320, overflowY: "auto" } }}>
          {!selected?.id ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Select a TR on the left" style={{ margin: "48px 0" }} />
          ) : showEditor ? (
            <OpenTrManager
              key={`edit-${selected.id}-${detailKey}`}
              inline
              open
              containerId={selected.id}
              branchId={branchId}
              reloadKey={reloadKey}
              onChanged={changed}
              onDispatch={(c) => c && onDispatchOpen?.(c)}
              onCancelTr={doCancel}
            />
          ) : (
            <TransferReceiveScanner
              key={`view-${selected.id}-${detailKey}-${reloadKey}`}
              inline
              open
              containerId={selected.id}
              branchId={branchId}
              onDone={changed}
            />
          )}
          {selected?.id && selStatus === "open" && !showEditor ? (
            <Tooltip title="Only the sending branch can change an open TR">
              <Text type="secondary" style={{ fontSize: 11 }}>Open TR: not dispatched yet.</Text>
            </Tooltip>
          ) : null}
        </Card>
      </Col>
    </Row>
  );
}
