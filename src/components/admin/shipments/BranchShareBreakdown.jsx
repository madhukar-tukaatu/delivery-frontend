"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Space, Table, Tag, Typography, message } from "antd";
import api from "@/lib/api";
import { useIsFinanceHq } from "@/components/admin/billing/BranchScopeNotice";

const { Text } = Typography;
const money = (v) => `Rs ${Number(v || 0).toFixed(2)}`;
const ROLE_COLORS = { origin: "geekblue", transit: "purple", delivery: "cyan" };

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

/** Delivery-charge split per branch for one shipment (shipment_branch_shares). */
export default function BranchShareBreakdown({ shipmentId }) {
  const isHq = useIsFinanceHq();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setData(unwrap(await api.get(`/admin/shipments/${shipmentId}/branch-shares`)));
    } catch {
      setData(null); // no permission or not available: hide the card
    }
  }

  useEffect(() => {
    if (shipmentId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId]);

  async function recompute() {
    setBusy(true);
    try {
      await api.post(`/admin/shipments/${shipmentId}/branch-shares/recompute`);
      message.success("Branch shares recomputed.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Recompute failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return null;
  const rows = data.rows || [];
  const preview = data.preview;
  const hops = data.hops || [];
  if (!rows.length && !preview && !hops.length && !data.branch_share_status) return null;

  const previewRows = (preview?.rows || []).map((r) => ({ ...r, id: `p${r.position}`, preview: true }));
  const shown = rows.length ? rows : previewRows;

  return (
    <Card
      title="Branch share of delivery charge"
      extra={isHq && data.branch_share_status ? <Button size="small" loading={busy} onClick={recompute}>Recompute</Button> : null}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        {data.branch_share_status === "pending_config" ? (
          <Alert type="warning" showIcon message={data.branch_share_note || "No share percent row for this many branches."} />
        ) : null}
        {!rows.length && preview ? (
          <Alert
            type="info"
            showIcon
            message={`Preview only (not saved until delivered): fare ${money(preview.fare)}, extra km ${money(preview.extra)}, transport ${money(preview.transport_total)}, shared ${money(preview.shared)}${preview.status !== "computed" ? ` - ${preview.status}` : ""}`}
          />
        ) : null}
        {hops.length ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Hops: {hops.map((h) => `${h.transfer_number || h.manifest_number ? `${h.transfer_number || h.manifest_number} ` : ""}${h.from_branch_name || `#${h.from_branch_id ?? "?"}`} -> ${h.to_branch_name || `#${h.to_branch_id ?? "?"}`} (transport ${money(h.transport_cost)}${h.received_at ? ", received" : ""})`).join("  |  ")}
          </Text>
        ) : null}
        {shown.length ? (
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={shown}
            scroll={{ x: 900 }}
            columns={[
              { title: "Branch", render: (_, r) => r.branch?.name || `#${r.branch_id}` },
              { title: "Role", render: (_, r) => <Tag color={ROLE_COLORS[r.role]}>{r.role}</Tag> },
              { title: "%", dataIndex: "percent", align: "right", render: (v) => `${Number(v)}%` },
              { title: "Share", dataIndex: "share_amount", align: "right", render: money },
              { title: "Transport", dataIndex: "transport_amount", align: "right", render: money },
              { title: "Extra km", dataIndex: "extra_distance_amount", align: "right", render: money },
              { title: "Allocation", dataIndex: "allocation_amount", align: "right", render: (v) => <Text strong>{money(v)}</Text> },
              { title: "HQ", dataIndex: "hq_commission_amount", align: "right", render: money },
              { title: "Net", dataIndex: "net_amount", align: "right", render: money },
              { title: "Status", dataIndex: "status", render: (v, r) => (r.preview ? <Tag>preview</Tag> : <Tag>{v}</Tag>) },
            ]}
          />
        ) : null}
        {rows[0]?.collecting_branch_id ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Fare collected by {rows[0].collecting_branch?.name || `#${rows[0].collecting_branch_id}`} ({String(rows[0].collection_mode || "").replace("_", " ")}); it pays the other branches their allocation on the inter-branch statement.
          </Text>
        ) : null}
      </Space>
    </Card>
  );
}
