"use client";

import { Space, Table, Tag, Tooltip, Typography } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { formatRs, toNumber } from "@/components/admin/billing/financeKit";

const { Text } = Typography;

/**
 * Shared bits for inter-branch settlement screens: state chips, role chips,
 * the route path and the per-branch split table.
 */

export const SETTLE_STATES = {
  awaiting_bill: { color: "orange", label: "Bill not paid", tip: "The delivery-charge bill (store or marketplace) is not paid yet, so this share cannot go on a statement." },
  unsettled: { color: "gold", label: "Unsettled", tip: "Eligible, but not on any statement yet. It goes on the next generated statement." },
  on_statement: { color: "blue", label: "On statement", tip: "On a statement that is not paid yet." },
  partly_on_statement: { color: "geekblue", label: "Partly on statement", tip: "Some branches' shares are on a statement, others are not yet." },
  paid: { color: "cyan", label: "Paid, awaiting receipt", tip: "The paying branch marked the statement paid; the receiving branch has not confirmed." },
  received: { color: "green", label: "Received", tip: "The receiving branch confirmed the money arrived." },
  kept: { color: "green", label: "Kept by collector", tip: "This branch collected the fare and keeps its own share." },
  settled: { color: "green", label: "Settled", tip: "Nothing left to pay between branches for this shipment." },
  pending: { color: "orange", label: "Pending" },
};

export function SettleTag({ state, tooltip = true }) {
  const s = SETTLE_STATES[state] || { color: "default", label: state ? String(state).replace(/_/g, " ") : "-" };
  const tag = (
    <Tag color={s.color} style={{ marginInlineEnd: 0 }}>
      {s.label}
    </Tag>
  );
  return tooltip && s.tip ? <Tooltip title={s.tip}>{tag}</Tooltip> : tag;
}

const ROLE_COLORS = { origin: "geekblue", transit: "purple", delivery: "cyan" };

export function RoleTag({ role, position, count }) {
  return (
    <Tag color={ROLE_COLORS[role] || "default"} style={{ marginInlineEnd: 0, textTransform: "capitalize" }}>
      {role || "-"}
      {position && count > 1 ? ` ${position}/${count}` : ""}
    </Tag>
  );
}

const MODE_LABELS = {
  customer: "Customer paid at door",
  merchant_invoice: "Store invoice",
  company_invoice: "Marketplace invoice",
};

export function modeLabel(mode) {
  return MODE_LABELS[mode] || (mode ? String(mode).replace(/_/g, " ") : "-");
}

export function RoutePath({ route, highlight = [] }) {
  const items = (route || []).map((r) => (typeof r === "string" ? { name: r } : r));
  if (!items.length) return <Text type="secondary">-</Text>;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
      {items.map((r, i) => (
        <span key={`${r.branch_id ?? r.name}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {i > 0 ? <ArrowRightOutlined style={{ fontSize: 10, color: "#8c8c8c" }} /> : null}
          <span style={{ fontWeight: highlight.includes(Number(r.branch_id)) ? 600 : 400, whiteSpace: "nowrap" }}>{r.name}</span>
        </span>
      ))}
    </span>
  );
}

const FLAG_TEXT = {
  extra_distance_capped: "Extra distance was more than the fare and was capped.",
  transport_shortfall: "Transport plus extra distance exceeded the fare; transport refunds were scaled down.",
  transport_branch_not_in_chain: "A dispatching branch was not in the chain; its transport went to the origin branch.",
  extra_distance_reconciled: "Extra distance was reduced to what the fare actually charged.",
};

export function FlagTags({ flags }) {
  if (!flags?.length) return null;
  return (
    <Space size={4} wrap>
      {flags.map((f) => (
        <Tooltip key={f} title={FLAG_TEXT[f] || f}>
          <Tag color="warning" style={{ marginInlineEnd: 0 }}>{String(f).replace(/_/g, " ")}</Tag>
        </Tooltip>
      ))}
    </Space>
  );
}

const rs = (v) => formatRs(v);

/**
 * Per-branch split for one shipment.
 * rows: splits from the API. fare: fare charged. viewerIds: highlight the viewer's branch.
 */
export function SplitTable({ rows, fare, showStatement = true, size = "small" }) {
  const data = rows || [];
  const count = data.length;
  const sum = (k) => data.reduce((a, r) => a + toNumber(r[k]), 0);
  const totalAlloc = sum("allocation_amount");
  const ok = fare === undefined || fare === null || Math.abs(totalAlloc - toNumber(fare)) < 0.011;

  const columns = [
    {
      title: "Branch",
      render: (_, r) => (
        <Space size={4} wrap>
          <Text strong={r.is_viewer}>{r.branch_name}</Text>
          {r.is_viewer ? <Tag color="blue" style={{ marginInlineEnd: 0 }}>You</Tag> : null}
          {r.is_collector ? (
            <Tooltip title="Collected the fare; pays the other branches">
              <Tag color="gold" style={{ marginInlineEnd: 0 }}>Collector</Tag>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    { title: "Role", render: (_, r) => <RoleTag role={r.role} position={r.position} count={count} /> },
    { title: "%", dataIndex: "percent", align: "right", render: (v) => `${Number(v)}%` },
    { title: "Share", dataIndex: "share_amount", align: "right", render: rs },
    { title: "Transport", dataIndex: "transport_amount", align: "right", render: (v) => formatRs(v, { blankZero: true }) },
    { title: "Extra km", dataIndex: "extra_distance_amount", align: "right", render: (v) => formatRs(v, { blankZero: true }) },
    { title: "Allocation", dataIndex: "allocation_amount", align: "right", render: (v) => <Text strong>{rs(v)}</Text> },
    {
      title: "HQ",
      dataIndex: "hq_commission_amount",
      align: "right",
      render: (v, r) => (
        <Tooltip title={r.hq_rate !== undefined ? `${Number(r.hq_rate)}% of allocation` : undefined}>
          {rs(v)}
        </Tooltip>
      ),
    },
    { title: "Net", dataIndex: "net_amount", align: "right", render: rs },
    {
      title: "Settlement",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <SettleTag state={r.state} />
          {showStatement && r.statement_number ? (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.statement_number} ({r.statement_status})
            </Text>
          ) : null}
          {showStatement && r.statement?.statement_number ? (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.statement.statement_number} ({r.statement.status})
            </Text>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Table
      size={size}
      rowKey={(r) => r.id ?? `${r.branch_id}-${r.position}`}
      pagination={false}
      dataSource={data}
      columns={columns}
      scroll={{ x: 980 }}
      rowClassName={(r) => (r.is_viewer ? "ibs-viewer-row" : "")}
      onRow={(r) => ({ style: r.is_viewer ? { background: "#e6f4ff" } : undefined })}
      summary={() =>
        data.length ? (
          <Table.Summary.Row style={{ background: "#fafafa" }}>
            <Table.Summary.Cell index={0} colSpan={2}>
              <Text strong>Total</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              {Number(sum("percent").toFixed(4))}%
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">{rs(sum("share_amount"))}</Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right">{rs(sum("transport_amount"))}</Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right">{rs(sum("extra_distance_amount"))}</Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="right">
              <Tooltip title={ok ? "Allocations add up to the fare" : `Allocations do not add up to the fare (${rs(fare)})`}>
                <Text strong type={ok ? "success" : "danger"}>{rs(totalAlloc)}</Text>
              </Tooltip>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7} align="right">{rs(sum("hq_commission_amount"))}</Table.Summary.Cell>
            <Table.Summary.Cell index={8} align="right">{rs(sum("net_amount"))}</Table.Summary.Cell>
            <Table.Summary.Cell index={9} />
          </Table.Summary.Row>
        ) : null
      }
    />
  );
}
