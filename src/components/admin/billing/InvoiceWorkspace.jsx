"use client";

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MailOutlined,
  MoreOutlined,
  ReloadOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Collapse,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import StatCard, { StatCardGrid } from "@/components/admin/ui/StatCard";
import BranchScopeNotice, { useIsFinanceHq } from "@/components/admin/billing/BranchScopeNotice";
import { ViewBillButton, deliveryCount } from "@/components/admin/billing/StoreBillPreview";
import {
  EmptyState,
  PAYMENT_METHODS,
  PayerTag,
  StatusTag,
  apiError,
  branchList,
  formatDate,
  formatDateTime,
  formatRs,
  methodLabel,
  unwrap,
  PaymentProgress,
  SourceTag,
  newRequestId,
  toNumber,
} from "@/components/admin/billing/financeKit";
import { formatMerchantLabel } from "@/lib/merchantLabel";
import { listMarketplaces } from "@/services/admin/adminMarketplaceService";
import { getMerchants } from "@/services/merchant/merchantService";
import { usePermissions } from "@/hooks/usePermission";

const { Text, Title } = Typography;

const PAYER_TABS = [
  { key: "all", label: "All" },
  { key: "merchant", label: "Store bills" },
  { key: "company", label: "Marketplace (free delivery)" },
];

const isClosed = (s) => ["paid", "cancelled", "canceled", "void", "voided"].includes(String(s || "").toLowerCase());

/**
 * Shared list for Finance › Invoices and Finance › Delivery charges.
 * mode "invoices": every invoice type, digest buttons, merchant summary.
 * mode "delivery": delivery_charges only.
 */
export default function InvoiceWorkspace({ mode = "invoices" }) {
  const isDelivery = mode === "delivery";
  const endpoint = isDelivery ? "/admin/delivery-charges" : "/admin/invoices";
  const isHq = useIsFinanceHq();
  const { can } = usePermissions();

  const [payer, setPayer] = useState("all");
  const [status, setStatus] = useState("open");
  const [invoiceType, setInvoiceType] = useState(null);
  const [marketplaceId, setMarketplaceId] = useState(null);
  const [merchantId, setMerchantId] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [dueOnly, setDueOnly] = useState(false);
  const [range, setRange] = useState(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState(null);
  const [noticesPending, setNoticesPending] = useState(null);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);

  const [marketplaces, setMarketplaces] = useState([]);
  const [merchantOptions, setMerchantOptions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [sendingDigest, setSendingDigest] = useState(null);

  const [detail, setDetail] = useState(null);
  const [payInvoice, setPayInvoice] = useState(null);
  const [hamro, setHamro] = useState(null);

  useEffect(() => {
    Promise.all([
      listMarketplaces().catch(() => []),
      getMerchants({ per_page: 200 }).catch(() => ({ list: [] })),
    ]).then(([mps, merchants]) => {
      setMarketplaces(Array.isArray(mps) ? mps : []);
      setMerchantOptions(Array.isArray(merchants?.list) ? merchants.list : []);
    });
  }, []);

  useEffect(() => {
    if (!isHq) return;
    api
      .get("/admin/branches", { params: { per_page: 200 } })
      .then((r) => setBranches(branchList(r)))
      .catch(() => setBranches([]));
  }, [isHq]);

  const params = useMemo(
    () => ({
      per_page: 20,
      page,
      payer_type: payer === "all" ? undefined : payer,
      status: status || undefined,
      type: isDelivery ? "delivery_charges" : invoiceType || undefined,
      marketplace_id: marketplaceId || undefined,
      merchant_id: merchantId || undefined,
      branch_id: branchId || undefined,
      due_for_check: dueOnly ? 1 : undefined,
      from_date: range?.[0] ? range[0].format("YYYY-MM-DD") : undefined,
      to_date: range?.[1] ? range[1].format("YYYY-MM-DD") : undefined,
      search: search || undefined,
    }),
    [page, payer, status, isDelivery, invoiceType, marketplaceId, merchantId, branchId, dueOnly, range, search]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint, { params });
      const d = unwrap(res);
      setRows(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      setTotal(Number(d?.total || 0));
      setTotals(d?.totals || null);
      setNoticesPending(d?.notices_pending || null);
      setSummary(Array.isArray(d?.merchant_summary) ? d.merchant_summary : []);
    } catch (e) {
      message.error(apiError(e, "Could not load invoices"));
    } finally {
      setLoading(false);
    }
  }, [endpoint, params]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [payer, status, invoiceType, marketplaceId, merchantId, branchId, dueOnly, range, search]);

  const openDetail = useCallback(async (id) => {
    setDetail({ id, data: null });
    try {
      const r = await api.get(`/admin/invoices/${id}`);
      setDetail({ id, data: unwrap(r) });
    } catch (e) {
      message.error(apiError(e, "Could not open invoice"));
      setDetail(null);
    }
  }, []);

  async function post(path, okText, body = {}) {
    try {
      const r = await api.post(path, body);
      message.success(r?.data?.message || okText);
      load();
      return unwrap(r) ?? true;
    } catch (e) {
      message.error(apiError(e, "Action failed"));
      return null;
    }
  }

  async function sendBill(r) {
    const d = await post(`/admin/invoices/${r.id}/send-email`, "Bill sent");
    if (d?.to) message.info(`Sent to ${d.to}`);
  }

  async function startHamroPay(r) {
    const d = await post(`/admin/invoices/${r.id}/pay-hamropay`, "HamroPay checkout created");
    if (d && d !== true) setHamro({ invoice: r, session: d });
  }

  async function sendDigest(period) {
    if (!merchantId) {
      message.warning("Pick a store first, then send its daily or weekly bill.");
      return;
    }
    setSendingDigest(period);
    try {
      const res = await api.post("/admin/invoices/send-digest", { merchant_id: merchantId, period });
      message.success(res?.data?.message || "Digest queued");
    } catch (e) {
      message.error(apiError(e, "Send failed"));
    } finally {
      setSendingDigest(null);
    }
  }

  function menuItems(r) {
    const onBill = Boolean(r.marketplace_bill_number) && !isClosed(r.status);
    const delivery = r.type === "delivery_charges";
    return [
      { key: "view", label: "View details", onClick: () => openDetail(r.id) },
      delivery && can("invoices.send_email")
        ? {
            key: "send",
            icon: <MailOutlined />,
            label: onBill ? "Send bill (use Marketplace bills)" : "Email bill",
            disabled: isClosed(r.status) || onBill,
            onClick: () => sendBill(r),
          }
        : null,
      delivery && !isClosed(r.status) && can("invoices.pay_hamropay")
        ? { key: "hamro", label: "HamroPay checkout", disabled: onBill, onClick: () => startHamroPay(r) }
        : null,
      can("invoices.mark_paid")
        ? {
            key: "check",
            label: "Mark checked",
            disabled: !r.due_for_check,
            onClick: () => post(`/admin/invoices/${r.id}/mark-checked`, "Marked checked"),
          }
        : null,
      can("invoices.mark_paid")
        ? {
            key: "paid",
            icon: <CheckCircleOutlined />,
            label: r.status === "partially_paid" ? "Record another payment" : "Record payment",
            disabled: isClosed(r.status) || onBill,
            onClick: () => setPayInvoice(r),
          }
        : null,
    ].filter(Boolean);
  }

  const merchantSelectOptions = useMemo(
    () => merchantOptions.map((m) => ({ value: m.id, label: formatMerchantLabel(m) })),
    [merchantOptions]
  );

  const columns = [
    {
      title: "Invoice",
      dataIndex: "invoice_number",
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => openDetail(r.id)} style={{ fontWeight: 600 }}>
            {v}
          </a>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.tracking_number || formatDate(r.invoice_date)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Bill to",
      key: "billto",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Space size={4}>
            <PayerTag type={r.payer_type} />
            <span>
              {String(r.payer_type || "").toLowerCase() === "company"
                ? r.marketplace_name || "Marketplace"
                : formatMerchantLabel(r)}
            </span>
          </Space>
          {String(r.payer_type || "").toLowerCase() !== "company" && r.marketplace_name ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.marketplace_name}
            </Text>
          ) : null}
        </Space>
      ),
    },
    isHq ? { title: "Branch", dataIndex: "branch_name", render: (v) => v || "-" } : null,
    !isDelivery
      ? {
          title: "Type",
          dataIndex: "type",
          render: (v) => (v === "delivery_charges" ? "Delivery" : String(v || "-").replace(/_/g, " ")),
        }
      : { title: "Deliveries", key: "dc", align: "right", width: 90, render: (_, r) => deliveryCount(r) },
    {
      title: "Amount",
      dataIndex: "total_amount",
      align: "right",
      render: (v) => <Text strong>{formatRs(v)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <StatusTag status={v} tooltip={r.status === "paid" && r.paid_by_label ? `Paid by ${r.paid_by_label}` : null} />
          {r.marketplace_bill_number ? (
            <Link href="/admin/marketplace-bills" style={{ fontSize: 12 }}>
              On {r.marketplace_bill_number}
            </Link>
          ) : null}
          {r.marketplace_bill_progress && r.status !== "paid" && Number(r.marketplace_bill_progress.paid_amount) > 0 ? (
            <PaymentProgress
              compact
              total={r.marketplace_bill_progress.total_amount}
              paid={r.marketplace_bill_progress.paid_amount}
              outstanding={r.marketplace_bill_progress.outstanding_amount}
            />
          ) : null}
          {r.status === "partially_paid" ? <PaymentProgress compact total={r.total_amount} paid={r.paid_so_far} outstanding={r.outstanding} /> : null}
          {toNumber(r.pending_notices?.count) > 0 ? (
            <Tag color="orange" style={{ cursor: "pointer" }} onClick={() => openDetail(r.id)}>
              Notice to verify: {formatRs(r.pending_notices.amount)}
            </Tag>
          ) : null}
          {r.due_for_check ? <Tag color="red">Check: {r.days_since_sent ?? 3}d</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Sent / paid",
      key: "dates",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text type={r.sent_at ? undefined : "secondary"} style={{ fontSize: 12 }}>
            {r.sent_at ? `Sent ${formatDate(r.sent_at)}` : "Not sent"}
          </Text>
          {r.paid_at ? (
            <Text type="success" style={{ fontSize: 12 }}>
              Paid {formatDate(r.paid_at)}
              {r.payment_reference ? ` · ${r.payment_reference}` : ""}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 170,
      align: "right",
      render: (_, r) => (
        <Space size={4}>
          {r.type === "delivery_charges" ? <ViewBillButton invoice={r} /> : null}
          <Dropdown menu={{ items: menuItems(r) }} trigger={["click"]}>
            <Button size="small" icon={<MoreOutlined />} aria-label="Actions" />
          </Dropdown>
        </Space>
      ),
    },
  ].filter(Boolean);

  const filtersActive =
    marketplaceId || merchantId || branchId || status !== "open" || invoiceType || dueOnly || range || search;

  return (
    <>
      <AdminPageHeader
        title={isDelivery ? "Delivery charges" : "Invoices"}
        subtitle={
          isDelivery
            ? "Delivery-charge bills per shipment. Store free delivery is billed to the store; marketplace free delivery is collected on Marketplace bills."
            : "All invoices for stores and marketplaces. Find a bill, see who paid it, and record payments."
        }
        icon={isDelivery ? <ShopOutlined /> : <FileTextOutlined />}
        breadcrumb={[{ title: "Finance" }, { title: isDelivery ? "Delivery charges" : "Invoices" }]}
        actions={
          <Space size={8} wrap>
            {!isDelivery && can("invoices.send_digest") ? (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    { key: "daily", label: "Send daily bill to selected store", onClick: () => sendDigest("daily") },
                    { key: "weekly", label: "Send weekly bill to selected store", onClick: () => sendDigest("weekly") },
                  ],
                }}
              >
                <Button size="small" icon={<MailOutlined />} loading={Boolean(sendingDigest)}>
                  Store digests
                </Button>
              </Dropdown>
            ) : null}
            <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Refresh
            </Button>
          </Space>
        }
      />

      <BranchScopeNotice style={{ margin: "8px 0" }} />

      <StatCardGrid>
        <StatCard
          label="Unpaid"
          value={formatRs(totals?.unpaid ?? 0)}
          hint={`${totals?.unpaid_count ?? 0} invoices in this view`}
          variant="warning"
          icon={<ClockCircleOutlined />}
        />
        <StatCard
          label="Paid"
          value={formatRs(totals?.paid ?? 0)}
          hint="in this view"
          variant="success"
          icon={<CheckCircleOutlined />}
        />
        <StatCard
          label="Total billed"
          value={formatRs(totals?.total ?? 0)}
          hint={`${totals?.count ?? 0} invoices`}
          variant="primary"
          icon={<FileTextOutlined />}
        />
      </StatCardGrid>

      {toNumber(noticesPending?.count) > 0 && status !== "has_notices" ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
          message={`${noticesPending.count} store payment notice(s) for ${formatRs(noticesPending.amount)} are waiting for you to verify.`}
          description="A store says it paid. Check the money arrived, then Verify (records the payment) or Reject (with a reason). Nothing is paid until you verify."
          action={
            <Button size="small" type="primary" onClick={() => setStatus("has_notices")}>
              Show them
            </Button>
          }
        />
      ) : null}

      <Card size="small" style={{ margin: "12px 0" }} styles={{ body: { paddingTop: 0 } }}>
        <Tabs activeKey={payer} onChange={setPayer} items={PAYER_TABS.map((t) => ({ key: t.key, label: t.label }))} />
        {payer === "company" ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 8 }}
            message={
              <span>
                Marketplace free-delivery charges are billed in batches per branch. Send and track them on{" "}
                <Link href="/admin/marketplace-bills">Marketplace bills</Link>.
              </span>
            }
          />
        ) : null}
        <Space wrap size={8} style={{ marginBottom: 8 }}>
          <Select
            size="small"
            style={{ width: 160 }}
            value={status || "all"}
            onChange={(v) => setStatus(v === "all" ? null : v)}
            options={[
              { value: "open", label: "To collect" },
              { value: "has_notices", label: "Notices to verify" },
              { value: "unpaid", label: "Unpaid" },
              { value: "partially_paid", label: "Partially paid" },
              { value: "paid", label: "Paid" },
              { value: "cancelled", label: "Cancelled" },
              { value: "all", label: "Any status" },
            ]}
          />
          {isHq ? (
            <Select
              size="small"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All branches"
              style={{ minWidth: 180 }}
              value={branchId}
              onChange={(v) => setBranchId(v ?? null)}
              options={branches.map((b) => ({ value: b.id, label: b.name || b.code || `#${b.id}` }))}
            />
          ) : null}
          <Select
            size="small"
            allowClear
            placeholder="All marketplaces"
            style={{ minWidth: 180 }}
            value={marketplaceId}
            onChange={(v) => setMarketplaceId(v ?? null)}
            options={marketplaces.map((m) => ({ value: m.id, label: m.name || m.code || `#${m.id}` }))}
          />
          <Select
            size="small"
            allowClear
            showSearch
            placeholder="Store"
            style={{ minWidth: 220 }}
            value={merchantId}
            optionFilterProp="label"
            onChange={(v) => setMerchantId(v ?? null)}
            options={merchantSelectOptions}
          />
          {!isDelivery ? (
            <Select
              size="small"
              allowClear
              placeholder="Invoice type"
              style={{ width: 160 }}
              value={invoiceType}
              onChange={(v) => setInvoiceType(v ?? null)}
              options={[
                { value: "delivery_charges", label: "Delivery charges" },
                { value: "shipment", label: "Shipment" },
              ]}
            />
          ) : null}
          <DatePicker.RangePicker size="small" value={range} onChange={setRange} allowEmpty={[true, true]} />
          <Button size="small" type={dueOnly ? "primary" : "default"} danger={dueOnly} onClick={() => setDueOnly(!dueOnly)}>
            Due for check
          </Button>
          <Input.Search
            size="small"
            allowClear
            placeholder="Invoice or tracking no"
            style={{ width: 220 }}
            value={searchDraft}
            onChange={(e) => {
              setSearchDraft(e.target.value);
              if (!e.target.value) setSearch("");
            }}
            onSearch={(v) => setSearch(v.trim())}
          />
          {filtersActive ? (
            <Button
              size="small"
              type="link"
              onClick={() => {
                setMarketplaceId(null);
                setMerchantId(null);
                setBranchId(null);
                setStatus("open");
                setInvoiceType(null);
                setDueOnly(false);
                setRange(null);
                setSearch("");
                setSearchDraft("");
              }}
            >
              Reset
            </Button>
          ) : null}
        </Space>

        <Table
          size="small"
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 960 }}
          locale={{
            emptyText: (
              <EmptyState
                title={status === "open" || status === "unpaid" ? "Nothing to collect here" : "No invoices match"}
                hint="Change the tab, status or filters."
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            size: "small",
            showSizeChanger: false,
            showTotal: (t) => `${t} invoices`,
            onChange: setPage,
          }}
        />
      </Card>

      {!isDelivery && summary.length ? (
        <Collapse
          size="small"
          style={{ marginBottom: 12 }}
          items={[
            {
              key: "s",
              label: `Billing status by store (${summary.length})`,
              children: (
                <Table
                  size="small"
                  pagination={summary.length > 10 ? { pageSize: 10, size: "small" } : false}
                  rowKey={(r) => `${r.side || "row"}-${r.merchant_id || "marketplace"}`}
                  dataSource={summary}
                  columns={[
                    {
                      title: "Store",
                      render: (_, r) =>
                        r.side === "marketplace"
                          ? "Marketplace bills"
                          : formatMerchantLabel({
                              merchant_name: r.merchant_name,
                              merchant_id: r.merchant_id,
                              external_store_id: r.external_store_id,
                            }),
                    },
                    { title: "Unpaid", dataIndex: "unpaid_count", align: "right", width: 80 },
                    { title: "Unpaid amount", dataIndex: "unpaid_total", align: "right", render: (v) => formatRs(v) },
                    { title: "Paid", dataIndex: "paid_count", align: "right", width: 70 },
                    { title: "Due check", dataIndex: "due_for_check_count", align: "right", width: 90, render: (v) => v ?? 0 },
                  ]}
                />
              ),
            },
          ]}
        />
      ) : null}

      <InvoiceDetailDrawer detail={detail} onClose={() => setDetail(null)} can={can} onChanged={(id) => { openDetail(id); load(); }} actions={(inv) => (
        <Dropdown menu={{ items: menuItems(inv).filter((i) => i.key !== "view") }} trigger={["click"]}>
          <Button size="small">Actions</Button>
        </Dropdown>
      )} />

      <InvoiceMarkPaidModal
        invoice={payInvoice}
        onClose={() => setPayInvoice(null)}
        onSubmit={async (values) => {
          const ok = await post(`/admin/invoices/${payInvoice.id}/mark-paid`, "Payment recorded", values);
          if (ok) {
            setPayInvoice(null);
            if (detail?.id === payInvoice.id) openDetail(payInvoice.id);
          }
        }}
      />

      <Modal
        open={Boolean(hamro)}
        title="HamroPay checkout created"
        onCancel={() => setHamro(null)}
        footer={
          <Space>
            <Button onClick={() => setHamro(null)}>Close</Button>
            <Button
              type="primary"
              onClick={async () => {
                const d = await post(
                  `/admin/invoices/${hamro.invoice.id}/confirm-hamropay`,
                  "Payment confirmed",
                  { merchant_txn_id: hamro.session.merchant_txn_id }
                );
                if (d) setHamro(null);
              }}
            >
              Check payment status
            </Button>
          </Space>
        }
      >
        {hamro ? (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Invoice">{hamro.invoice.invoice_number}</Descriptions.Item>
            <Descriptions.Item label="Amount">{formatRs(hamro.session.amount)}</Descriptions.Item>
            <Descriptions.Item label="Paid to">Billing branch account</Descriptions.Item>
            <Descriptions.Item label="Transaction id">
              <Text copyable>{hamro.session.merchant_txn_id}</Text>
            </Descriptions.Item>
            {hamro.session.gateway_url ? (
              <Descriptions.Item label="Gateway">
                <Text copyable>{hamro.session.gateway_url}</Text>
              </Descriptions.Item>
            ) : null}
          </Descriptions>
        ) : null}
      </Modal>
    </>
  );
}

function InvoiceDetailDrawer({ detail, onClose, actions, can = () => true, onChanged = () => {} }) {
  const inv = detail?.data;
  const items = Array.isArray(inv?.items) ? inv.items : [];
  const [verify, setVerify] = useState(null);
  const [reject, setReject] = useState(null);
  const [reverse, setReverse] = useState(null);
  return (
    <Drawer
      open={Boolean(detail)}
      onClose={onClose}
      width={720}
      title={inv?.invoice_number || "Invoice"}
      extra={inv ? <StatusTag status={inv.status} /> : null}
      destroyOnClose
    >
      {!inv ? (
        <Skeleton active />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Title level={3} style={{ margin: 0 }}>
              {formatRs(inv.total_amount)}
            </Title>
            {actions(inv)}
          </Space>
          {inv.marketplace_bill_number ? (
            <Alert
              type="info"
              showIcon
              message={
                <span>
                  This charge is on marketplace bill <b>{inv.marketplace_bill_number}</b> ({String(inv.marketplace_bill_status || "").replace(/_/g, " ")}).
                  The marketplace can pay the bill in parts; this delivery becomes paid when the whole bill is paid. Manage it on{" "}
                  <Link href="/admin/marketplace-bills">Marketplace bills</Link>.
                </span>
              }
              description={
                inv.marketplace_bill_progress && !["draft", "cancelled"].includes(inv.marketplace_bill_status) ? (
                  <div style={{ marginTop: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Bill payment progress
                    </Text>
                    <PaymentProgress
                      total={inv.marketplace_bill_progress.total_amount}
                      paid={inv.marketplace_bill_progress.paid_amount}
                      outstanding={inv.marketplace_bill_progress.outstanding_amount}
                    />
                  </div>
                ) : null
              }
            />
          ) : null}
          {inv.payable ? (
            <Card size="small" title="Payments">
              <PaymentProgress total={inv.total_amount} paid={inv.paid_so_far} outstanding={inv.outstanding} />
              <Table
                style={{ marginTop: 12 }}
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={inv.payments || []}
                locale={{ emptyText: "No payment recorded yet" }}
                columns={[
                  { title: "Paid on", dataIndex: "paid_at", render: formatDate },
                  { title: "Amount", dataIndex: "amount", align: "right", render: (v) => formatRs(v) },
                  { title: "Method / ref", key: "m", render: (_, p) => <span>{methodLabel(p.method)}{p.reference ? <Text type="secondary"> {p.reference}</Text> : null}</span> },
                  { title: "Source", dataIndex: "source", render: (v, p) => <Space size={2} direction="vertical"><SourceTag source={v} /><Text type="secondary" style={{ fontSize: 11 }}>{p.recorded_by_label}</Text></Space> },
                  { title: "Status", dataIndex: "status", render: (v, p) => <StatusTag status={v} tooltip={p.reverse_reason ? `${p.reverse_reason}${p.reversed_by_label ? " - " + p.reversed_by_label : ""}` : null} /> },
                  {
                    title: "",
                    key: "a",
                    render: (_, p) =>
                      p.status === "recorded" && can("invoices.reverse_payment") ? (
                        <Button size="small" danger type="link" onClick={() => setReverse(p)}>
                          Reverse
                        </Button>
                      ) : null,
                  },
                ]}
              />
              {(inv.notices || []).length ? (
                <>
                  <Text strong style={{ display: "block", marginTop: 12 }}>
                    Payment notices from the store
                  </Text>
                  <Table
                    size="small"
                    rowKey="id"
                    pagination={false}
                    dataSource={inv.notices}
                    columns={[
                      { title: "Sent", dataIndex: "submitted_at", render: formatDateTime },
                      { title: "Amount", dataIndex: "amount", align: "right", render: (v) => formatRs(v) },
                      { title: "Method / ref", key: "m", render: (_, n) => <span>{methodLabel(n.method)}{n.reference ? <Text type="secondary"> {n.reference}</Text> : null}</span> },
                      { title: "Status", dataIndex: "status", render: (v, n) => <StatusTag status={v} tooltip={n.reject_reason || (n.verified_amount != null ? `Verified ${formatRs(n.verified_amount)}` : null)} /> },
                      {
                        title: "",
                        key: "a",
                        render: (_, n) =>
                          n.status === "pending_verification" && can("invoices.mark_paid") ? (
                            <Space size={4}>
                              <Button size="small" type="primary" onClick={() => setVerify(n)}>
                                Verify
                              </Button>
                              <Button size="small" danger onClick={() => setReject(n)}>
                                Reject
                              </Button>
                            </Space>
                          ) : null,
                      },
                    ]}
                  />
                </>
              ) : null}
            </Card>
          ) : null}
          {inv.reopen_reason && inv.status !== "paid" ? (
            <Alert type="warning" showIcon message={`Payment reported not received: ${inv.reopen_reason}`} />
          ) : null}
          <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Bill to">
              <Space size={4}>
                <PayerTag type={inv.payer_type} />
                {String(inv.payer_type || "").toLowerCase() === "company" ? inv.marketplace_name : formatMerchantLabel(inv)}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Email">{inv.bill_to || "-"}</Descriptions.Item>
            <Descriptions.Item label="Marketplace">{inv.marketplace_name || "-"}</Descriptions.Item>
            <Descriptions.Item label="Billing branch">{inv.branch_name || "-"}</Descriptions.Item>
            <Descriptions.Item label="Tracking">{inv.tracking_number || "-"}</Descriptions.Item>
            <Descriptions.Item label="Delivered">{formatDateTime(inv.delivered_at)}</Descriptions.Item>
            <Descriptions.Item label="Invoice date">{formatDate(inv.invoice_date)}</Descriptions.Item>
            <Descriptions.Item label="Sent">{inv.sent_at ? formatDateTime(inv.sent_at) : "Not sent"}</Descriptions.Item>
            <Descriptions.Item label="Checked">{inv.manual_checked_at ? formatDateTime(inv.manual_checked_at) : "-"}</Descriptions.Item>
            {inv.status === "paid" ? (
              <>
                <Descriptions.Item label="Paid">{formatDateTime(inv.paid_at)}</Descriptions.Item>
                <Descriptions.Item label="Paid by">{inv.paid_by_label || inv.paid_by_type || "-"}</Descriptions.Item>
                <Descriptions.Item label="Amount received">{formatRs(inv.paid_amount ?? inv.total_amount)}</Descriptions.Item>
                <Descriptions.Item label="Method">{methodLabel(inv.payment_method)}</Descriptions.Item>
                <Descriptions.Item label="Reference" span={2}>
                  <Text copyable={Boolean(inv.payment_reference)}>{inv.payment_reference || "-"}</Text>
                </Descriptions.Item>
              </>
            ) : null}
          </Descriptions>
          <Card size="small" title="Lines" styles={{ body: { padding: 0 } }}>
            <Table
              size="small"
              rowKey={(r, i) => r.id ?? i}
              dataSource={items}
              pagination={false}
              columns={[
                { title: "Description", dataIndex: "description" },
                { title: "Qty", dataIndex: "quantity", align: "right", width: 60 },
                { title: "Amount", key: "amt", align: "right", render: (_, r) => formatRs(r.total ?? r.amount ?? r.unit_price) },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong>{formatRs(inv.total_amount)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </Space>
      )}
      <NoticeVerifyModal
        notice={verify}
        outstanding={inv?.outstanding}
        onClose={() => setVerify(null)}
        onSubmit={async (values) => {
          try {
            const r = await api.post(`/admin/invoices/${inv.id}/notices/${verify.id}/verify`, values);
            message.success(r?.data?.message || "Verified");
            setVerify(null);
            onChanged(inv.id);
          } catch (e) {
            message.error(apiError(e, "Verify failed"));
          }
        }}
      />
      <ReasonModal
        open={Boolean(reject)}
        title={reject ? `Reject notice of ${formatRs(reject.amount)}` : ""}
        okText="Reject notice"
        hint="Tell the store why (for example: no credit found for this reference). Nothing is recorded."
        onClose={() => setReject(null)}
        onSubmit={async (reason) => {
          try {
            const r = await api.post(`/admin/invoices/${inv.id}/notices/${reject.id}/reject`, { reason });
            message.success(r?.data?.message || "Rejected");
            setReject(null);
            onChanged(inv.id);
          } catch (e) {
            message.error(apiError(e, "Reject failed"));
          }
        }}
      />
      <ReasonModal
        open={Boolean(reverse)}
        title={reverse ? `Reverse payment of ${formatRs(reverse.amount)}` : ""}
        okText="Reverse payment"
        hint="The amount becomes due again. If the invoice was fully paid it is reopened."
        withNotReceived
        onClose={() => setReverse(null)}
        onSubmit={async (reason, notReceived) => {
          try {
            const r = await api.post(`/admin/invoices/${inv.id}/payments/${reverse.id}/reverse`, { reason, not_received: notReceived });
            message.success(r?.data?.message || "Reversed");
            setReverse(null);
            onChanged(inv.id);
          } catch (e) {
            message.error(apiError(e, "Reverse failed"));
          }
        }}
      />
    </Drawer>
  );
}

/** Verify a payment notice: amount is editable (part of the notice may have arrived). */
export function NoticeVerifyModal({ notice, outstanding, onClose, onSubmit }) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (notice) {
      form.setFieldsValue({ amount: Number(notice.amount), reference: notice.reference || "", method: notice.method || "bank_transfer", note: "" });
    }
  }, [notice, form]);
  return (
    <Modal
      open={Boolean(notice)}
      title={notice ? `Verify payment notice ${formatRs(notice.amount)}` : ""}
      okText="Verify and record"
      confirmLoading={busy}
      onCancel={onClose}
      destroyOnClose
      onOk={async () => {
        const v = await form.validateFields();
        setBusy(true);
        try {
          await onSubmit(v);
        } finally {
          setBusy(false);
        }
      }}
    >
      {notice ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Check the money arrived in the branch account first."
          description={`Sent by ${notice.payer_name || "payer"} on ${formatDateTime(notice.submitted_at)}. Paid on ${formatDate(notice.paid_at)}. If only part arrived, verify that amount.${outstanding != null ? " Outstanding now: " + formatRs(outstanding) + "." : ""}`}
        />
      ) : null}
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="amount" label="Amount received" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} min={0.01} max={notice ? Number(notice.amount) : undefined} step={0.01} prefix="Rs" />
        </Form.Item>
        <Space style={{ width: "100%" }} size={12} align="start">
          <Form.Item name="method" label="Method" style={{ minWidth: 200 }}>
            <Select options={PAYMENT_METHODS} />
          </Form.Item>
          <Form.Item name="reference" label="Reference">
            <Input />
          </Form.Item>
        </Space>
        <Form.Item name="note" label="Note">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/** Asks for a reason (reject notice / reverse payment). */
export function ReasonModal({ open, title, okText, hint, withNotReceived = false, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [notReceived, setNotReceived] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setReason("");
      setNotReceived(true);
    }
  }, [open]);
  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      okButtonProps={{ danger: true, disabled: reason.trim().length < 3 }}
      confirmLoading={busy}
      onCancel={onClose}
      destroyOnClose
      onOk={async () => {
        setBusy(true);
        try {
          await onSubmit(reason.trim(), notReceived);
        } finally {
          setBusy(false);
        }
      }}
    >
      {hint ? <Text type="secondary">{hint}</Text> : null}
      <Input.TextArea style={{ marginTop: 8 }} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" />
      {withNotReceived ? (
        <Select
          style={{ marginTop: 8, width: "100%" }}
          value={notReceived}
          onChange={setNotReceived}
          options={[
            { value: true, label: "Money was not received" },
            { value: false, label: "Recorded by mistake" },
          ]}
        />
      ) : null}
    </Modal>
  );
}

function InvoiceMarkPaidModal({ invoice, onClose, onSubmit }) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);

  const [requestId, setRequestId] = useState(null);
  const due = invoice ? toNumber(invoice.outstanding ?? invoice.total_amount) : 0;
  useEffect(() => {
    if (invoice) {
      setRequestId(newRequestId());
      form.setFieldsValue({
        paid_amount: due,
        payment_method: "bank_transfer",
        payment_reference: "",
        paid_at: dayjs(),
      });
    }
  }, [invoice, form]);

  return (
    <Modal
      open={Boolean(invoice)}
      title={invoice ? `Record payment for ${invoice.invoice_number}` : ""}
      okText="Record payment"
      confirmLoading={busy}
      onCancel={onClose}
      destroyOnClose
      onOk={async () => {
        const v = await form.validateFields();
        setBusy(true);
        try {
          await onSubmit({
            paid_amount: v.paid_amount,
            payment_method: v.payment_method,
            payment_reference: v.payment_reference || undefined,
            paid_at: v.paid_at ? v.paid_at.format("YYYY-MM-DD HH:mm:ss") : undefined,
            note: v.note || undefined,
            request_id: requestId,
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        {invoice && toNumber(invoice.paid_so_far) > 0 ? (
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`Already paid ${formatRs(invoice.paid_so_far)} of ${formatRs(invoice.total_amount)}. Outstanding ${formatRs(due)}.`} />
        ) : null}
        <Form.Item
          name="paid_amount"
          label="Amount received"
          extra="A part payment is fine; the rest stays due. The invoice becomes Paid only when nothing is outstanding."
          rules={[{ required: true }]}
        >
          <InputNumber style={{ width: "100%" }} min={0.01} max={due || undefined} step={0.01} prefix="Rs" />
        </Form.Item>
        <Space style={{ width: "100%" }} size={12} align="start">
          <Form.Item name="payment_method" label="Method" rules={[{ required: true }]} style={{ minWidth: 200 }}>
            <Select options={PAYMENT_METHODS} />
          </Form.Item>
          <Form.Item name="paid_at" label="Paid on">
            <DatePicker showTime={{ format: "HH:mm" }} format="DD MMM YYYY HH:mm" />
          </Form.Item>
        </Space>
        <Form.Item
          name="payment_reference"
          label="Reference"
          extra="Bank / wallet transaction id, so the payment can be traced later."
          rules={[{ required: true, message: "Enter a payment reference" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="note" label="Note">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
