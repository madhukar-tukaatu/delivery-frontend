"use client";

import { FileTextOutlined } from "@ant-design/icons";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import api from "@/lib/api";
import BranchScopeNotice from "@/components/admin/billing/BranchScopeNotice";
import { ViewBillButton, deliveryCount } from "@/components/admin/billing/StoreBillPreview";
import { formatMerchantLabel } from "@/lib/merchantLabel";
import { listMarketplaces } from "@/services/admin/adminMarketplaceService";
import { getMerchants } from "@/services/merchant/merchantService";

const { Text } = Typography;

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null);
  const [digestHint, setDigestHint] = useState("");
  const [marketplaceId, setMarketplaceId] = useState(null);
  const [merchantId, setMerchantId] = useState(null);
  const [status, setStatus] = useState(null);
  const [invoiceType, setInvoiceType] = useState(null);
  const [billSide, setBillSide] = useState(null);
  const [dueOnly, setDueOnly] = useState(false);
  const [summary, setSummary] = useState([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [marketplaces, setMarketplaces] = useState([]);
  const [merchantOptions, setMerchantOptions] = useState([]);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [mps, merchants] = await Promise.all([
        listMarketplaces().catch(() => []),
        getMerchants({ per_page: 200 }).catch(() => ({ list: [] })),
      ]);
      setMarketplaces(Array.isArray(mps) ? mps : []);
      setMerchantOptions(Array.isArray(merchants?.list) ? merchants.list : []);
    } catch {
      setMarketplaces([]);
      setMerchantOptions([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/invoices", {
        params: {
          per_page: 50,
          marketplace_id: marketplaceId || undefined,
          merchant_id: merchantId || undefined,
          status: status || undefined,
          type: invoiceType || undefined,
          payer_type: billSide || undefined,
          due_for_check: dueOnly ? 1 : undefined,
          search: search.trim() || undefined,
        },
      });
      const data = unwrap(res);
      setRows(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      setSummary(Array.isArray(data?.merchant_summary) ? data.merchant_summary : []);
    } catch (e) {
      message.error(e?.response?.data?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [marketplaceId, merchantId, status, invoiceType, billSide, dueOnly, search]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendDigest(period) {
    if (!merchantId) {
      setDigestHint("Pick a merchant first.");
      return;
    }
    setDigestHint("");
    setSending(period);
    try {
      const res = await api.post("/admin/invoices/send-digest", {
        merchant_id: merchantId,
        period,
      });
      message.success(res?.data?.message || (period === "weekly" ? "Weekly digest queued" : "Daily digest queued"));
    } catch (e) {
      message.error(e?.response?.data?.message || "Send failed");
    } finally {
      setSending(null);
    }
  }


  async function markChecked(id) {
    try {
      const res = await api.post(`/admin/invoices/${id}/mark-checked`, {});
      message.success(res?.data?.message || "Marked checked");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Check failed");
    }
  }

  async function closeInvoice(id) {
    try {
      const res = await api.post(`/admin/invoices/${id}/close`, {});
      message.success(res?.data?.message || "Invoice closed and marked paid.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Close failed");
    }
  }

  async function sendBill(id) {
    try {
      const res = await api.post(`/admin/invoices/${id}/send-email`, {});
      const data = unwrap(res);
      message.success(data?.to ? `Bill sent to ${data.to}` : res?.data?.message || "Bill sent");
    } catch (e) {
      message.error(e?.response?.data?.message || "Send failed");
    }
  }

  async function markPaid(id) {
    try {
      await api.post(`/admin/invoices/${id}/mark-paid`, {});
      message.success("Marked paid");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed");
    }
  }

  async function payHamro(id) {
    try {
      const res = await api.post(`/admin/invoices/${id}/pay-hamropay`, {});
      message.success("HamroPay session created (merchant -> branch)");
      console.info(unwrap(res));
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Pay failed");
    }
  }

  const merchantSelectOptions = useMemo(
    () =>
      merchantOptions.map((m) => ({
        value: m.id,
        label: formatMerchantLabel(m),
      })),
    [merchantOptions]
  );

  const filtersActive = marketplaceId || merchantId || status || invoiceType || billSide || dueOnly || search || searchDraft;

  return (
    <>
      <AdminPageHeader
        title="Invoices"
        subtitle="Delivery fees and other merchant invoices."
        icon={<FileTextOutlined />}
        actions={
          <Space size={8}>
            <Button
              size="small"
              loading={sending === "daily"}
              disabled={sending !== null}
              onClick={() => sendDigest("daily")}
            >
              Send daily bills
            </Button>
            <Button
              size="small"
              loading={sending === "weekly"}
              disabled={sending !== null}
              onClick={() => sendDigest("weekly")}
            >
              Send weekly bills
            </Button>
          </Space>
        }
      />

      <BranchScopeNotice style={{ margin: "8px 0" }} />
      <Text type="secondary" style={{ display: "block", margin: "8px 0" }}>
        Daily digests also run automatically at 6:17 AM; weekly is manual unless you run it.
      </Text>
      {digestHint ? (
        <Alert type="warning" showIcon message={digestHint} style={{ marginBottom: 8 }} />
      ) : null}

      <Card size="small" title="Filters" styles={{ body: { padding: "8px 12px" } }} style={{ marginBottom: 12 }}>
        <Space wrap size={8}>
          <Select
            size="small"
            allowClear
            placeholder="Marketplace"
            style={{ minWidth: 200 }}
            value={marketplaceId}
            onChange={(v) => setMarketplaceId(v ?? null)}
            options={(marketplaces || []).map((m) => ({
              value: m.id,
              label: m.name ? `${m.name}${m.code ? ` (${m.code})` : ""}` : `#${m.id}`,
            }))}
          />
          <Select
            size="small"
            allowClear
            showSearch
            placeholder="Merchant / store"
            style={{ minWidth: 240 }}
            value={merchantId}
            optionFilterProp="label"
            onChange={(v) => {
              setMerchantId(v ?? null);
              setDigestHint("");
            }}
            options={merchantSelectOptions}
          />
          <Select
            size="small"
            allowClear
            placeholder="Status"
            style={{ width: 140 }}
            value={status}
            onChange={(v) => setStatus(v ?? null)}
            options={[
              { value: "unpaid", label: "Unpaid" },
              { value: "paid", label: "Paid" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          <Select
            size="small"
            allowClear
            placeholder="Check"
            style={{ width: 150 }}
            value={dueOnly ? "due" : null}
            onChange={(v) => setDueOnly(v === "due")}
            options={[{ value: "due", label: "Due for check" }]}
          />
          <Select
            size="small"
            allowClear
            placeholder="Bill side"
            style={{ width: 180 }}
            value={billSide}
            onChange={(v) => setBillSide(v ?? null)}
            options={[
              { value: "merchant", label: "Merchant store" },
              { value: "company", label: "Marketplace" },
            ]}
          />
          <Select
            size="small"
            allowClear
            placeholder="Invoice type"
            style={{ width: 180 }}
            value={invoiceType}
            onChange={(v) => setInvoiceType(v ?? null)}
            options={[
              { value: "delivery_charges", label: "Delivery charges" },
              { value: "shipment", label: "Shipment" },
            ]}
          />
          <Input.Search
            size="small"
            allowClear
            placeholder="Invoice or tracking"
            style={{ width: 220 }}
            value={searchDraft}
            onChange={(e) => {
              const next = e.target.value;
              setSearchDraft(next);
              if (next === "") setSearch("");
            }}
            onSearch={(value) => setSearch(value.trim())}
          />
          {filtersActive ? (
            <Button
              size="small"
              onClick={() => {
                setMarketplaceId(null);
                setMerchantId(null);
                setStatus(null);
                setInvoiceType(null);
                setBillSide(null);
                setDueOnly(false);
                setSearchDraft("");
                setSearch("");
                setDigestHint("");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </Space>
      </Card>

      <Card
        size="small"
        title="Billing status by merchant"
        styles={{ body: { padding: 8 } }}
        style={{ marginBottom: 12 }}
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          Merchant store bills and marketplace bills are separate. Paid bills stay listed and are not emailed.
        </Text>
        <Table
          size="small"
          pagination={false}
          rowKey={(r) => `${r.side || "row"}-${r.merchant_id || "marketplace"}`}
          dataSource={summary}
          locale={{ emptyText: "No bills for these filters." }}
          columns={[
            {
              title: "Merchant",
              render: (_, r) =>
                r.side === "marketplace"
                  ? "Marketplace bills"
                  : formatMerchantLabel({
                      merchant_name: r.merchant_name,
                      merchant_id: r.merchant_id,
                      external_store_id: r.external_store_id,
                    }),
            },
            { title: "Unpaid", dataIndex: "unpaid_count", width: 80 },
            {
              title: "Unpaid total",
              dataIndex: "unpaid_total",
              width: 120,
              render: (v) => Number(v || 0).toFixed(2),
            },
            { title: "Paid", dataIndex: "paid_count", width: 70 },
            { title: "Due check", dataIndex: "due_for_check_count", width: 90, render: (v) => v ?? 0 },
          ]}
        />
      </Card>

      <Card size="small" styles={{ body: { padding: 8 } }} loading={loading}>
        <Table
          size="small"
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 20, size: "small" }}
          columns={[
            { title: "Invoice", dataIndex: "invoice_number" },
            {
              title: "Merchant",
              key: "merchant",
              render: (_, r) =>
                String(r.payer_type || "").toLowerCase() === "company"
                  ? "Marketplace bill"
                  : formatMerchantLabel(r),
            },
            { title: "Marketplace", dataIndex: "marketplace_name", render: (v) => v || "-" },
            {
              title: "Side",
              dataIndex: "payer_type",
              width: 120,
              render: (v) =>
                String(v || "merchant").toLowerCase() === "company" ? (
                  <Tag color="blue">Marketplace</Tag>
                ) : (
                  <Tag>Store</Tag>
                ),
            },
            {
              title: "Deliveries",
              key: "deliveries",
              width: 90,
              render: (_, r) => (r.type === "delivery_charges" ? deliveryCount(r) : "-"),
            },
            { title: "Amount", dataIndex: "total_amount" },
            {
              title: "Sent",
              dataIndex: "sent_at",
              width: 110,
              render: (v) => (v ? String(v).slice(0, 10) : "-"),
            },
            {
              title: "Check",
              width: 110,
              render: (_, r) =>
                r.due_for_check ? (
                  <Tag color="red">Due {r.days_since_sent ?? 3}d</Tag>
                ) : r.manual_checked_at ? (
                  <Tag>Checked</Tag>
                ) : (
                  "-"
                ),
            },
            {
              title: "Status",
              dataIndex: "status",
              render: (v) => <Tag color={v === "paid" ? "green" : "orange"}>{v}</Tag>,
            },
            {
              title: "Action",
              render: (_, r) => (
                <Space size={4} wrap>
                  {r.type === "delivery_charges" ? <ViewBillButton invoice={r} /> : null}
                  {r.type === "delivery_charges" ? (
                    <Button
                      size="small"
                      disabled={["paid", "cancelled", "canceled", "void", "voided"].includes(String(r.status || "").toLowerCase())}
                      onClick={() => sendBill(r.id)}
                    >
                      Send bill
                    </Button>
                  ) : null}
                  {r.type === "delivery_charges" && r.status !== "paid" ? (
                    <Button size="small" type="primary" onClick={() => payHamro(r.id)}>
                      Pay via HamroPay
                    </Button>
                  ) : null}
                  <Button size="small" disabled={!r.due_for_check} onClick={() => markChecked(r.id)}>
                    Mark checked
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    disabled={!r.sent_at || String(r.status) === "paid"}
                    onClick={() => closeInvoice(r.id)}
                  >
                    Close & mark paid
                  </Button>
                  <Button size="small" disabled={r.status === "paid"} onClick={() => markPaid(r.id)}>
                    Mark paid
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
