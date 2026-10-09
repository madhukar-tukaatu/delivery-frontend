"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Empty, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography, message } from "antd";
import {
  ArrowRightOutlined,
  CarOutlined,
  EyeOutlined,
  InboxOutlined,
  SendOutlined,
  StopOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { cancelContainer, getContainer, getContainers } from "@/services/admin/transferService";
import { TrStatusTag, TR_STATUS_META } from "@/components/admin/transfers/TransferReceiveScanner";
import { vehicleLabel } from "@/components/admin/transfers/TransferDispatchModal";

const { Text } = Typography;

function fmt(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? String(dt) : d.toLocaleString();
}

function money(v) {
  const n = Number(v || 0);
  return n ? `Rs ${n.toFixed(2)}` : "-";
}

export function trSplitText(c) {
  const parts = [];
  if (c.last_mile_count) parts.push(`${c.last_mile_count} last mile`);
  if (c.onward_count) {
    const names = (c.onward_breakdown || []).map((o) =>
      (c.onward_breakdown || []).length > 1 ? `${o.destination_name} ${o.count}` : o.destination_name
    );
    parts.push(`${c.onward_count} onward to ${names.join(", ")}`);
  }
  return parts.join(", ");
}

const ITEM_TAG = {
  added: ["default", "Loaded"],
  sent: ["processing", "On the way"],
  dispatched: ["processing", "On the way"],
  in_transit: ["processing", "On the way"],
  received: ["success", "Received"],
  missing: ["warning", "Missing"],
  lost: ["error", "Lost"],
  moved: ["default", "Arrived on other TR"],
  cancelled: ["default", "Removed"],
};

function ContainerItems({ containerId, params }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    getContainer(containerId, params)
      .then((d) => alive && setRows(d?.items || []))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [containerId, params]);
  return (
    <Table
      size="small"
      rowKey="item_id"
      loading={rows === null}
      dataSource={rows || []}
      pagination={(rows || []).length > 20 ? { pageSize: 20, size: "small" } : false}
      columns={[
        { title: "Parcel", dataIndex: "tracking_number", render: (v, i) => <Text strong style={{ fontSize: 12 }}>{v || `#${i.shipment_id}`}</Text> },
        {
          title: "At next hop",
          key: "final",
          render: (_, i) =>
            i.is_final_here ? <Tag color="green" style={{ margin: 0 }}>Last mile</Tag> : <Tag color="purple" style={{ margin: 0 }}>→ {i.destination_name || "onward"}</Tag>,
        },
        {
          title: "Status",
          key: "status",
          render: (_, i) => {
            const [color, label] = ITEM_TAG[i.status] || ["default", i.status];
            return (
              <Space size={4}>
                <Tag color={color} style={{ margin: 0 }}>{label}</Tag>
                {i.is_extra ? <Tag color="gold" style={{ margin: 0 }}>Extra</Tag> : null}
                {i.discrepancy_note ? (
                  <Tooltip title={i.discrepancy_note}>
                    <WarningOutlined style={{ color: "#d46b08" }} />
                  </Tooltip>
                ) : null}
              </Space>
            );
          },
        },
        { title: "Cost share", dataIndex: "transport_cost", align: "right", render: money },
        { title: "Received", dataIndex: "received_at", render: fmt },
      ]}
    />
  );
}

/**
 * TR (transfer container) list, one row per trip.
 *
 * props:
 *  - direction: "outbound" (Sent) | "inbound" (arriving) | "inbound_all" (all received) | "all" (History)
 *  - branchId: admin branch override
 *  - search, dateFrom, dateTo: external filters
 *  - reloadKey: bump to reload
 *  - canReceive, canDispatch: permission flags
 *  - onOpen(container): open the check-in / detail drawer
 *  - onDispatchOpen(container): send an open (held) TR
 *  - onChanged(): after cancel
 *  - highlightId: TR id to highlight (deep link)
 */
export default function TransferContainerTable({
  direction = "outbound",
  branchId = null,
  search = "",
  dateFrom = null,
  dateTo = null,
  reloadKey = 0,
  canReceive = false,
  canDispatch = false,
  onOpen,
  onDispatchOpen,
  onChanged,
  highlightId = null,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState({ current: 1, pageSize: 20, total: 0 });
  const [status, setStatus] = useState(direction === "inbound" ? "" : "all");
  const [trSearch, setTrSearch] = useState("");
  const params = useMemo(() => (branchId ? { branch_id: branchId } : {}), [branchId]);

  const load = useCallback(
    async (current = 1, pageSize = 20) => {
      setLoading(true);
      try {
        const apiDirection = direction === "inbound_all" ? "inbound" : direction;
        const q = {
          direction: apiDirection,
          page: current,
          per_page: pageSize,
          search: (trSearch || search || "").trim() || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          ...params,
        };
        if (status && status !== "all") q.status = status;
        // Inbound without a status means "still arriving"; History wants every TR.
        if (direction === "inbound_all" && (!status || status === "all")) q.status = Object.keys(TR_STATUS_META).join(",");
        const res = await getContainers(q);
        setRows(res.list || []);
        setPage({ current: res.currentPage || current, pageSize, total: Number(res.total || 0) });
      } catch (e) {
        message.error(e?.response?.data?.message || "Failed to load TRs");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [direction, trSearch, search, dateFrom, dateTo, params, status]
  );

  useEffect(() => {
    load(1, page.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, reloadKey]);

  const doCancel = (c) => {
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
          load(page.current, page.pageSize);
          onChanged?.();
        } catch (e) {
          message.error(e?.response?.data?.message || "Failed to cancel TR");
          throw e;
        }
      },
    });
  };

  const statusOptions =
    direction === "inbound"
      ? [
          { value: "", label: "Arriving + partially received" },
          { value: "dispatched,in_transit", label: "Arriving" },
          { value: "partially_received", label: "Partially received" },
          { value: "received", label: "Received" },
        ]
      : [{ value: "all", label: "All TR statuses" }].concat(
          Object.entries(TR_STATUS_META).map(([value, m]) => ({ value, label: m.label }))
        );

  const columns = [
    {
      title: "TR",
      key: "tr",
      width: 170,
      render: (_, c) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{c.display_number}</Text>
          {c.transfer_number && c.manifest_number ? (
            <Text type="secondary" style={{ fontSize: 10 }}>{c.manifest_number}</Text>
          ) : null}
          <Text type="secondary" style={{ fontSize: 11 }}>{fmt(c.dispatched_at || c.created_at)}</Text>
        </Space>
      ),
    },
    {
      title: "Trip",
      key: "trip",
      render: (_, c) => (
        <Space direction="vertical" size={2}>
          <Space size={4} wrap style={{ fontSize: 12 }}>
            <Text>{c.from_branch?.name || "-"}</Text>
            <ArrowRightOutlined style={{ color: "#bfbfbf" }} />
            <Text strong>{c.to_branch?.name || "-"}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {c.parcel_count} parcel{c.parcel_count === 1 ? "" : "s"}
            {trSplitText(c) ? ` (${trSplitText(c)})` : ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Vehicle",
      key: "vehicle",
      width: 170,
      render: (_, c) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>
            <CarOutlined /> {[vehicleLabel(c.vehicle_type), c.vehicle_number].filter(Boolean).join(" · ") || "-"}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {c.rider?.name || c.driver_name || ""}
            {c.rider?.phone || c.driver_phone ? ` · ${c.rider?.phone || c.driver_phone}` : ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Check-in",
      key: "counts",
      width: 180,
      render: (_, c) => (
        <Space size={2} wrap>
          <Tag style={{ margin: 0 }}>{c.expected_count} exp</Tag>
          {c.received_count ? <Tag color="green" style={{ margin: 0 }}>{c.received_count} in</Tag> : null}
          {c.missing_count ? <Tag color="orange" style={{ margin: 0 }}>{c.missing_count} missing</Tag> : null}
          {c.extra_count ? <Tag color="gold" style={{ margin: 0 }}>{c.extra_count} extra</Tag> : null}
        </Space>
      ),
    },
    { title: "Trip cost", dataIndex: "transport_cost", align: "right", width: 100, render: money },
    { title: "Status", dataIndex: "status", width: 140, render: (s) => <TrStatusTag status={s} /> },
    {
      title: "",
      key: "actions",
      width: 170,
      fixed: "right",
      render: (_, c) => {
        if (direction === "outbound" && c.status === "open" && canDispatch) {
          return (
            <Space size={4}>
              <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => onDispatchOpen?.(c)}>
                Dispatch
              </Button>
              <Button size="small" danger icon={<StopOutlined />} onClick={() => doCancel(c)} />
            </Space>
          );
        }
        if (direction === "inbound" && canReceive && ["dispatched", "in_transit"].includes(c.status)) {
          return (
            <Button size="small" type="primary" icon={<InboxOutlined />} onClick={() => onOpen?.(c)}>
              Receive
            </Button>
          );
        }
        if (direction === "inbound" && canReceive && c.status === "partially_received") {
          return (
            <Button size="small" icon={<WarningOutlined />} onClick={() => onOpen?.(c)} style={{ color: "#d46b08", borderColor: "#ffd591" }}>
              Resolve missing
            </Button>
          );
        }
        return (
          <Button size="small" icon={<EyeOutlined />} onClick={() => onOpen?.(c)}>
            View
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <Space wrap size={6} style={{ padding: "8px 8px 6px" }}>
        <Input.Search
          size="small"
          allowClear
          placeholder="TR no., vehicle, driver, tracking"
          style={{ width: 260 }}
          onSearch={(v) => setTrSearch(v)}
        />
        <Select size="small" value={status} onChange={setStatus} options={statusOptions} style={{ width: 210 }} />
      </Space>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 1050 }}
        rowClassName={(c) => (highlightId && Number(c.id) === Number(highlightId) ? "ant-table-row-selected" : "")}
        expandable={{ expandedRowRender: (c) => <ContainerItems containerId={c.id} params={params} /> }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={direction === "inbound" ? "No TRs arriving" : direction === "outbound" ? "No TRs sent yet" : "No TRs"}
            />
          ),
        }}
        pagination={{
          current: page.current,
          pageSize: page.pageSize,
          total: page.total,
          showSizeChanger: true,
          size: "small",
          showTotal: (t) => `${t} TR${t === 1 ? "" : "s"}`,
          onChange: (p, ps) => load(p, ps),
        }}
      />
    </div>
  );
}
