"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Popconfirm,
  Skeleton,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { ArrowRightOutlined, ExportOutlined, ReloadOutlined, CalculatorOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import {
  EmptyState,
  PaymentProgress,
  StatusTag,
  apiError,
  formatDateTime,
  formatRs,
  toNumber,
  unwrap,
} from "@/components/admin/billing/financeKit";
import { FlagTags, RoutePath, SettleTag, SplitTable, modeLabel } from "@/components/admin/billing/interBranchKit";

const { Text } = Typography;

const PAID_BY = { customer: "Customer", merchant: "Store", store: "Store", admin: "Tukaatu", marketplace: "Marketplace" };
const label = (v, map) => (v ? map?.[v] || String(v).replace(/_/g, " ") : "-");

function Section({ title, extra, children }) {
  return (
    <Card size="small" title={title} extra={extra} styles={{ body: { padding: 12 } }}>
      {children}
    </Card>
  );
}

function Money({ v, strong, type }) {
  return (
    <Text strong={strong} type={type} style={{ fontVariantNumeric: "tabular-nums" }}>
      {formatRs(v)}
    </Text>
  );
}

function FareBreakdown({ fare }) {
  if (!fare) return null;
  const ex = fare.extra_distance || {};
  const w = fare.weight_detail || {};
  const lines = [
    { key: "base", label: "Route base", detail: fare.route_base_source ? String(fare.route_base_source).replace(/_/g, " ") : null, amount: fare.route_base },
    {
      key: "extra",
      label: "Extra distance",
      detail:
        ex.extra_km !== undefined && ex.extra_km !== null
          ? `${Number(ex.delivery_distance_km ?? 0)} km from ${ex.measured_from || "coverage point"}; ${Number(ex.extra_km)} km over the included ${Number(ex.included_km ?? 0)} km × Rs ${Number(ex.rate_per_km ?? 0)}/km`
          : null,
      amount: ex.stored_total,
      note: ex.reconciled ? `Split uses ${formatRs(ex.used_total)} (only this much of the fare is above base + add-ons)` : null,
    },
    {
      key: "weight",
      label: "Weight add-on",
      detail: w.excess_kg ? `${Number(w.excess_kg)} kg over ${Number(w.included_kg ?? 0)} kg × Rs ${Number(w.rate_per_kg ?? 0)}/kg` : w.chargeable_kg ? `${Number(w.chargeable_kg)} kg chargeable, within the included weight` : null,
      amount: fare.additional_weight,
    },
    { key: "fragile", label: "Fragile", amount: fare.fragile },
    { key: "express", label: "Express", amount: fare.express },
    { key: "same_day", label: "Same day", amount: fare.same_day },
  ].filter((l) => l.key === "base" || l.key === "extra" || toNumber(l.amount) !== 0);
  const vat = fare.vat || {};
  const diff = toNumber(fare.difference);

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Table
        size="small"
        pagination={false}
        rowKey="key"
        dataSource={lines}
        showHeader={false}
        columns={[
          {
            render: (_, l) => (
              <Space direction="vertical" size={0}>
                <Text>{l.label}</Text>
                {l.detail ? <Text type="secondary" style={{ fontSize: 12 }}>{l.detail}</Text> : null}
                {l.note ? <Text type="warning" style={{ fontSize: 12 }}>{l.note}</Text> : null}
              </Space>
            ),
          },
          { align: "right", width: 140, render: (_, l) => <Money v={l.amount} /> },
        ]}
        summary={() => (
          <>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Space direction="vertical" size={0}>
                  <Text>Price breakdown total</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    VAT {vat.percentage ?? 13}% {vat.inclusive === false ? "added" : "included"}
                    {fare.service_type ? ` · ${fare.service_type}` : ""}
                  </Text>
                </Space>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Money v={fare.breakdown_final} />
              </Table.Summary.Cell>
            </Table.Summary.Row>
            <Table.Summary.Row style={{ background: "#fafafa" }}>
              <Table.Summary.Cell index={0}>
                <Text strong>Final fare charged</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Money v={fare.fare_charged} strong />
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </>
        )}
      />
      {fare.breakdown_final !== null && fare.breakdown_final !== undefined && Math.abs(diff) > 0.01 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          The stored breakdown differs from the fare charged by {formatRs(diff)}. Shares are always split from the fare charged.
        </Text>
      ) : null}
    </Space>
  );
}

function Hops({ hops }) {
  if (!hops?.length) {
    return <Text type="secondary">No inter-branch hops recorded (no manifest moved this parcel between branches).</Text>;
  }
  return (
    <Table
      size="small"
      pagination={false}
      rowKey={(h, i) => `${h.dispatch_manifest_id}-${i}`}
      dataSource={hops}
      scroll={{ x: 760 }}
      columns={[
        { title: "#", width: 40, render: (_, __, i) => i + 1 },
        {
          title: "Hop",
          render: (_, h) => (
            <Space size={4}>
              <Text>{h.from_branch_name || `#${h.from_branch_id ?? "?"}`}</Text>
              <ArrowRightOutlined style={{ fontSize: 10, color: "#8c8c8c" }} />
              <Text>{h.to_branch_name || `#${h.to_branch_id ?? "?"}`}</Text>
            </Space>
          ),
        },
        {
          title: "Manifest",
          render: (_, h) => (
            <Space direction="vertical" size={0}>
              <Text>{h.transfer_number || h.manifest_number || "-"}</Text>
              {h.manifest_status ? <Text type="secondary" style={{ fontSize: 11 }}>{String(h.manifest_status).replace(/_/g, " ")}</Text> : null}
            </Space>
          ),
        },
        { title: "Transport", render: (_, h) => [h.vehicle_type, h.vehicle_number].filter(Boolean).join(" · ") || "-" },
        { title: "Cost", dataIndex: "transport_cost", align: "right", render: (v) => formatRs(v) },
        { title: "Dispatched", dataIndex: "dispatched_at", render: formatDateTime },
        { title: "Received", dataIndex: "received_at", render: (v) => (v ? formatDateTime(v) : <Text type="secondary">Not yet</Text>) },
      ]}
    />
  );
}

function SplitSteps({ split }) {
  if (!split) return null;
  const step = (lbl, v, sign) => (
    <Space direction="vertical" size={0} style={{ minWidth: 110 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>{lbl}</Text>
      <Text strong style={{ fontSize: 16 }}>
        {sign ? `${sign} ` : ""}
        {formatRs(v)}
      </Text>
    </Space>
  );
  return (
    <Space direction="vertical" size={6} style={{ width: "100%" }}>
      <Space wrap size={16} align="end">
        {step("Fare", split.fare)}
        {step("Extra distance (delivery branch)", split.extra_distance, "−")}
        {step("Transport (dispatching branches)", split.transport_total, "−")}
        {step("Shared by percent", split.shared, "=")}
      </Space>
      <Text type="secondary">
        {split.branch_count || (split.rows || []).length} branch{(split.branch_count || 0) === 1 ? "" : "es"} → {(split.percents || []).map((p) => `${Number(p)}%`).join(" / ") || "-"}
        . Allocation = share + transport + extra. HQ takes its commission from each allocation.
      </Text>
    </Space>
  );
}

function Payments({ payments, viewerIds }) {
  if (!payments?.length) {
    return <Text type="secondary">No money moves between branches: the collecting branch keeps the whole fare.</Text>;
  }
  return (
    <Space direction="vertical" size={6} style={{ width: "100%" }}>
      {payments.map((p) => {
        const youPay = viewerIds.includes(Number(p.from_branch_id));
        const youGet = viewerIds.includes(Number(p.to_branch_id));
        return (
          <div
            key={`${p.from_branch_id}-${p.to_branch_id}`}
            style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "6px 8px", border: "1px solid #f0f0f0", borderRadius: 6 }}
          >
            {youPay ? <Tag color="volcano">You pay</Tag> : youGet ? <Tag color="green">You receive</Tag> : null}
            <Text strong>{p.from_branch_name}</Text>
            <Text type="secondary">pays</Text>
            <Text strong>{p.to_branch_name}</Text>
            <Text strong style={{ marginLeft: "auto" }}>{formatRs(p.amount)}</Text>
            <SettleTag state={p.state} />
            {p.statement ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {p.statement.statement_number} · <StatusTag status={p.statement.status} />
              </Text>
            ) : null}
          </div>
        );
      })}
    </Space>
  );
}

/** Body of the drawer; also embedded in the shipment detail drawer (compact). */
export default function ShipmentSettlementBreakdown({ shipmentId, compact = false, onOpenShipment, reloadKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!shipmentId) return;
    setLoading(true);
    setError(null);
    try {
      setData(unwrap(await api.get(`/admin/inter-branch-settlements/shipments/${shipmentId}`)));
    } catch (e) {
      setData(null);
      setError(e?.response?.status === 404 ? "not_found" : apiError(e, "Could not load the settlement breakdown."));
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  async function recompute() {
    setBusy(true);
    try {
      const res = await api.post(`/admin/shipments/${shipmentId}/branch-shares/recompute`);
      message.success(res?.data?.message || "Branch shares recomputed.");
      load();
    } catch (e) {
      message.error(apiError(e, "Recompute failed."));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <Skeleton active paragraph={{ rows: compact ? 4 : 10 }} />;
  if (error === "not_found") {
    return compact ? null : <EmptyState title="Not available" hint="This shipment has no share for your branch, or it does not exist." />;
  }
  if (error) return <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>Retry</Button>} />;
  if (!data) return null;

  const { shipment: s, billing: b, fare, hops, split, payments, checks, flags, preview, viewer } = data;
  const viewerIds = (viewer?.branch_ids || []).map(Number);
  const rows = split?.rows || [];
  const previewRows = (preview?.rows || []).map((r) => ({ ...r, id: `p${r.position}`, state: "pending", is_viewer: viewerIds.includes(Number(r.branch_id)) }));
  const isHq = Boolean(viewer?.is_hq);

  const recomputeBtn =
    isHq && (rows.length || s?.branch_share_status) ? (
      split?.locked ? (
        <Tooltip title="Shares are on a statement (or settled). Remove the shipment from its statement before recomputing.">
          <Button size="small" icon={<CalculatorOutlined />} disabled>
            Recompute
          </Button>
        </Tooltip>
      ) : (
        <Popconfirm title="Recompute this shipment's branch shares from the current fare and hops?" onConfirm={recompute}>
          <Button size="small" icon={<CalculatorOutlined />} loading={busy}>
            Recompute
          </Button>
        </Popconfirm>
      )
    ) : null;

  const content = (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {!compact ? (
        <Section
          title={
            <Space wrap>
              <Text strong>{s.tracking_number}</Text>
              <StatusTag status={s.status} />
              {split?.state ? <SettleTag state={split.state} /> : null}
            </Space>
          }
          extra={
            <Space>
              <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading} />
              {onOpenShipment ? (
                <Button size="small" icon={<ExportOutlined />} onClick={() => onOpenShipment(s.id)}>
                  Shipment
                </Button>
              ) : null}
            </Space>
          }
        >
          <Descriptions size="small" column={{ xs: 1, sm: 2 }} colon={false} labelStyle={{ color: "#8c8c8c" }}>
            <Descriptions.Item label="Store">{s.merchant_name || "-"}{s.marketplace_name ? ` · ${s.marketplace_name}` : ""}</Descriptions.Item>
            <Descriptions.Item label="Delivered">{formatDateTime(s.delivered_at)}</Descriptions.Item>
            <Descriptions.Item label="Route" span={2}>
              <RoutePath route={rows.length ? rows.map((r) => ({ name: r.branch_name, branch_id: r.branch_id })) : s.route} highlight={viewerIds} />
            </Descriptions.Item>
            <Descriptions.Item label="Payment">
              {String(s.payment_type || "-").toUpperCase()}
              {toNumber(s.pod_amount) ? ` · collect ${formatRs(s.pod_amount)}` : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Delivery charge paid by">{label(s.delivery_charge_paid_by, PAID_BY)}</Descriptions.Item>
            <Descriptions.Item label="Free delivery by">{s.delivery_free_by && s.delivery_free_by !== "none" ? label(s.delivery_free_by, PAID_BY) : "No"}</Descriptions.Item>
            <Descriptions.Item label="Collected by">
              {b?.collecting_branch_name || "-"} <Text type="secondary">({modeLabel(b?.collection_mode)})</Text>
            </Descriptions.Item>
          </Descriptions>
        </Section>
      ) : null}

      {(checks || []).map((c) => (
        <Alert key={c.code} type={c.level === "error" ? "error" : c.level === "warning" ? "warning" : "info"} showIcon message={c.message} />
      ))}

      <Section title="Who was billed">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Text>
            Billing branch <Text strong>{b?.billing_branch_name || "-"}</Text> · collection{" "}
            <Text strong>{modeLabel(b?.collection_mode)}</Text>
            {b?.collecting_branch_name ? (
              <>
                {" "}by <Text strong>{b.collecting_branch_name}</Text>
              </>
            ) : null}
          </Text>
          {(b?.invoices || []).length ? (
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={b.invoices}
              scroll={{ x: 640 }}
              columns={[
                { title: "Invoice", dataIndex: "invoice_number" },
                { title: "Payer", render: (_, i) => `${i.payer_name || "-"}${i.payer_type ? ` (${i.payer_type === "company" ? "marketplace" : "store"})` : ""}` },
                { title: "Branch", dataIndex: "branch_name" },
                { title: "Status", dataIndex: "status", render: (v) => <StatusTag status={v} /> },
                { title: "Amount", dataIndex: "total_amount", align: "right", render: (v) => formatRs(v) },
                { title: "Paid", width: 160, render: (_, i) => <PaymentProgress compact total={i.total_amount} paid={i.paid_amount} outstanding={i.outstanding_amount} /> },
              ]}
            />
          ) : (
            <Text type="secondary">No delivery-charge invoice.</Text>
          )}
        </Space>
      </Section>

      <Section title="Fare breakdown">
        <FareBreakdown fare={fare} />
      </Section>

      <Section title="Hops">
        <Hops hops={hops} />
      </Section>

      <Section title="How the fare is split" extra={recomputeBtn}>
        {rows.length ? (
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <SplitSteps split={split} />
            <SplitTable rows={rows} fare={split.fare} />
            <FlagTags flags={flags} />
          </Space>
        ) : preview ? (
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Alert
              type="info"
              showIcon
              message={`Preview only: shares are saved once the parcel is delivered${preview.status !== "computed" ? ` (${String(preview.status).replace(/_/g, " ")})` : ""}.`}
            />
            <SplitSteps split={{ fare: preview.fare, extra_distance: preview.extra, transport_total: preview.transport_total, shared: preview.shared, branch_count: preview.branch_count, percents: preview.percents }} />
            <SplitTable rows={previewRows} fare={preview.fare} showStatement={false} />
            <FlagTags flags={preview.flags} />
          </Space>
        ) : (
          <EmptyState title="No split yet" hint={s?.branch_share_note || "Shares are computed when the parcel is delivered."} />
        )}
      </Section>

      {rows.length && isHq && data.recompute_differs && previewRows.length ? (
        <Section title="A fresh calculation would give">
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Text type="secondary">
              Compare with the saved split above. {split?.locked ? "Recompute is blocked because the shares are already on a statement." : "Use Recompute to save it."}
            </Text>
            <SplitTable rows={previewRows} fare={preview.fare} showStatement={false} />
          </Space>
        </Section>
      ) : null}

      {rows.length ? (
        <Section title="Who pays whom">
          <Payments payments={payments} viewerIds={viewerIds} />
        </Section>
      ) : null}
    </Space>
  );

  if (!compact) return content;
  if (!rows.length && !preview && !s?.branch_share_status) return null;

  return (
    <Card
      title="Delivery-charge settlement between branches"
      extra={
        <Space size={6}>
          {split?.state ? <SettleTag state={split.state} /> : null}
          <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading} />
        </Space>
      }
      styles={{ body: { background: "#f5f7fa", padding: 12 } }}
    >
      {content}
    </Card>
  );
}
