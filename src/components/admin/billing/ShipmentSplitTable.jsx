"use client";

import { Space, Table, Tag, Tooltip, Typography } from "antd";
import { EmptyState, StatusTag, formatDate, formatRs } from "@/components/admin/billing/financeKit";
import { FlagTags, RoutePath, SettleTag, SplitTable, modeLabel } from "@/components/admin/billing/interBranchKit";

const { Text } = Typography;

/**
 * One row per shipment (from GET admin/inter-branch-settlements/shipments or
 * admin/branch-shares). Expand a row for the per-branch split.
 */
export default function ShipmentSplitTable({ rows, loading, pagination, onChange, showYours, viewerIds = [], onOpen, emptyHint }) {
  const columns = [
    {
      title: "Tracking",
      fixed: "left",
      width: 180,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <a
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.(r.shipment_id);
            }}
          >
            {r.tracking_number || `#${r.shipment_id}`}
          </a>
          {r.merchant_name ? <Text type="secondary" style={{ fontSize: 11 }}>{r.merchant_name}</Text> : null}
        </Space>
      ),
    },
    { title: "Delivered", dataIndex: "delivered_at", width: 110, render: (v) => formatDate(v) },
    { title: "Route", width: 260, render: (_, r) => <RoutePath route={r.route} highlight={viewerIds} /> },
    { title: "Branches", dataIndex: "branch_count", align: "center", width: 80 },
    { title: "Fare", dataIndex: "fare", align: "right", width: 110, render: (v) => <Text strong>{formatRs(v)}</Text> },
    { title: "Transport", dataIndex: "transport_total", align: "right", width: 100, render: (v) => formatRs(v, { blankZero: true }) },
    {
      title: "Extra km",
      dataIndex: "extra_distance_total",
      align: "right",
      width: 100,
      render: (v, r) => {
        const big = Number(v) > Number(r.fare) * 0.5 && Number(r.branch_count) > 1;
        return big ? (
          <Tooltip title="Extra distance takes more than half the fare; open the shipment to check the price breakdown.">
            <Text type="warning">{formatRs(v)}</Text>
          </Tooltip>
        ) : (
          formatRs(v, { blankZero: true })
        );
      },
    },
    { title: "HQ", dataIndex: "hq_total", align: "right", width: 90, render: (v) => formatRs(v) },
    ...(showYours
      ? [
          {
            title: "Your share",
            dataIndex: "your_allocation",
            align: "right",
            width: 110,
            render: (v, r) => (
              <Space direction="vertical" size={0} style={{ alignItems: "flex-end" }}>
                <Text strong>{formatRs(v)}</Text>
                {r.your_role ? <Text type="secondary" style={{ fontSize: 11, textTransform: "capitalize" }}>{r.your_role}</Text> : null}
              </Space>
            ),
          },
          { title: "Your net", dataIndex: "your_net", align: "right", width: 100, render: (v) => formatRs(v) },
        ]
      : []),
    {
      title: "Collected by",
      width: 180,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{r.collecting_branch_name || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{modeLabel(r.collection_mode)}</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      width: 190,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <SettleTag state={r.state} />
          {showYours && r.your_state && r.your_state !== r.state ? (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Yours: <SettleTag state={r.your_state} />
            </Text>
          ) : null}
          {r.invoice && r.collection_mode !== "customer" ? (
            <Tooltip title={`${r.invoice.invoice_number} · ${formatRs(r.invoice.outstanding_amount)} outstanding`}>
              <span style={{ fontSize: 11 }}>
                Bill <StatusTag status={r.invoice.status} />
              </span>
            </Tooltip>
          ) : null}
          <FlagTags flags={r.flags} />
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="shipment_id"
      loading={loading}
      dataSource={rows}
      columns={columns}
      size="middle"
      scroll={{ x: showYours ? 1700 : 1500 }}
      pagination={pagination ? { showSizeChanger: true, showTotal: (t) => `${t} shipments`, ...pagination, onChange } : false}
      locale={{ emptyText: <EmptyState title="No shipments" hint={emptyHint || "Delivered transfers with a branch split show here."} /> }}
      expandable={{
        expandRowByClick: true,
        rowExpandable: (r) => (r.splits || []).length > 0,
        expandedRowRender: (r) => (
          <div style={{ padding: "4px 0" }}>
            <SplitTable rows={r.splits} fare={r.fare} />
          </div>
        ),
      }}
    />
  );
}
