"use client";

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  PieChartOutlined,
  RollbackOutlined,
  MoreOutlined,
  ReloadOutlined,
  SendOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Radio,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Timeline,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import StatCard, { StatCardGrid } from "@/components/admin/ui/StatCard";
import BranchScopeNotice, { useIsFinanceHq } from "@/components/admin/billing/BranchScopeNotice";
import {
  EmptyState,
  PAYMENT_METHODS,
  PaymentProgress,
  SourceTag,
  StatusTag,
  apiError,
  branchList,
  formatDate,
  formatDateTime,
  formatRs,
  methodLabel,
  newRequestId,
  toNumber,
  unwrap,
} from "@/components/admin/billing/financeKit";
import { listMarketplaces } from "@/services/admin/adminMarketplaceService";
import { NoticeVerifyModal, ReasonModal } from "@/components/admin/billing/InvoiceWorkspace";
import { usePermissions } from "@/hooks/usePermission";

const { Text, Title } = Typography;

const TABS = [
  { key: "ready", label: "Ready to bill" },
  { key: "awaiting", label: "Awaiting payment" },
  { key: "has_notices", label: "Notices to verify" },
  { key: "partially_paid", label: "Partially paid" },
  { key: "paid", label: "Paid" },
  { key: "reopened", label: "Reopened / not received" },
  { key: "draft", label: "Drafts" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All bills" },
];

/** Statuses that accept a payment (server: MarketplaceBill::PAYABLE_STATUSES). */
const PAYABLE = ["sent", "partially_paid", "reopened"];

function billStatusTooltip(b) {
  if (b.status === "reopened") return b.reopen_reason ? `Reopened: ${b.reopen_reason}` : "Reopened";
  if (b.status === "sent" && b.days_outstanding != null) return `${b.days_outstanding} day(s) since sent`;
  if (b.status === "partially_paid") return `Paid ${formatRs(b.paid_amount)} of ${formatRs(b.total_amount)}`;
  if (b.status === "paid") return b.paid_by_label ? `Last payment by ${b.paid_by_label}` : null;
  return null;
}

const hasPayments = (b) => toNumber(b?.paid_amount) > 0;

export default function MarketplaceBillsPage() {
  const isHq = useIsFinanceHq();
  const { can } = usePermissions();

  const [tab, setTab] = useState("ready");
  const [branchId, setBranchId] = useState(null);
  const [marketplaceId, setMarketplaceId] = useState(null);
  const [range, setRange] = useState(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [marketplaces, setMarketplaces] = useState([]);
  const [branches, setBranches] = useState([]);

  const [summary, setSummary] = useState(null);
  const [groups, setGroups] = useState([]);
  const [bills, setBills] = useState([]);
  const [billTotal, setBillTotal] = useState(0);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [review, setReview] = useState(null); // ready group being reviewed
  const [detail, setDetail] = useState(null); // {id, data, loading}
  const [payBill, setPayBill] = useState(null);
  const [reopenBill, setReopenBill] = useState(null);
  const [reversal, setReversal] = useState(null); // {bill, payment}

  const from = range?.[0] ? range[0].format("YYYY-MM-DD") : undefined;
  const to = range?.[1] ? range[1].format("YYYY-MM-DD") : undefined;

  useEffect(() => {
    listMarketplaces()
      .then((m) => setMarketplaces(Array.isArray(m) ? m : []))
      .catch(() => setMarketplaces([]));
  }, []);

  useEffect(() => {
    if (!isHq) return;
    api
      .get("/admin/branches", { params: { per_page: 200 } })
      .then((r) => setBranches(branchList(r)))
      .catch(() => setBranches([]));
  }, [isHq]);

  const baseParams = useMemo(
    () => ({
      branch_id: branchId || undefined,
      marketplace_id: marketplaceId || undefined,
      from,
      to,
    }),
    [branchId, marketplaceId, from, to]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = tab === "all" || tab === "ready" ? undefined : tab;
      const billsReq = api.get("/admin/marketplace-bills", {
        params: { ...baseParams, status, search: search || undefined, page, per_page: 20 },
      });
      const readyReq = tab === "ready" ? api.get("/admin/marketplace-bills/ready", { params: baseParams }) : null;
      const [billsRes, readyRes] = await Promise.all([billsReq, readyReq]);
      const b = unwrap(billsRes);
      setBills(Array.isArray(b?.data) ? b.data : []);
      setBillTotal(Number(b?.total || 0));
      setTotals(b?.totals || null);
      setSummary(b?.summary || null);
      if (readyRes) {
        const r = unwrap(readyRes);
        setGroups(Array.isArray(r?.groups) ? r.groups : []);
      }
    } catch (e) {
      message.error(apiError(e, "Could not load marketplace bills"));
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [tab, baseParams, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab, branchId, marketplaceId, from, to, search]);

  const openDetail = useCallback(async (id) => {
    setDetail({ id, data: null, loading: true });
    try {
      const r = await api.get(`/admin/marketplace-bills/${id}`);
      setDetail({ id, data: unwrap(r), loading: false });
    } catch (e) {
      message.error(apiError(e, "Could not open bill"));
      setDetail(null);
    }
  }, []);

  const refreshDetail = useCallback(
    (id) => {
      if (detail?.id === id) openDetail(id);
    },
    [detail, openDetail]
  );

  async function action(bill, path, okText, body = {}) {
    try {
      const r = await api.post(`/admin/marketplace-bills/${bill.id}/${path}`, body);
      message.success(r?.data?.message || okText);
      load();
      refreshDetail(bill.id);
      return true;
    } catch (e) {
      message.error(apiError(e, "Action failed"));
      return false;
    }
  }

  function confirmCancel(bill) {
    Modal.confirm({
      title: `Cancel ${bill.bill_number}?`,
      icon: <ExclamationCircleOutlined />,
      content: "The bill is withdrawn and its deliveries go back to “Ready to bill”, so you can bill them again.",
      okText: "Cancel bill",
      okButtonProps: { danger: true },
      cancelText: "Keep",
      onOk: () => action(bill, "cancel-bill", "Bill cancelled"),
    });
  }

  function rowActions(b) {
    const payable = PAYABLE.includes(b.status);
    const cancellable = ["draft", "sent", "reopened"].includes(b.status) && !hasPayments(b);
    const items = [
      { key: "view", label: "View bill & payments", onClick: () => openDetail(b.id) },
      b.status === "draft" && can("marketplace_bills.send")
        ? { key: "send", icon: <SendOutlined />, label: "Send to marketplace", onClick: () => action(b, "send", "Bill sent") }
        : null,
      payable && can("marketplace_bills.send")
        ? { key: "resend", icon: <SendOutlined />, label: "Resend (reminder)", onClick: () => action(b, "resend", "Reminder sent") }
        : null,
      payable && can("marketplace_bills.mark_paid")
        ? { key: "paid", icon: <DollarOutlined />, label: "Record payment", onClick: () => setPayBill(b) }
        : null,
      hasPayments(b) && ["paid", "partially_paid"].includes(b.status) && can("marketplace_bills.report_not_received")
        ? { key: "reopen", icon: <ExclamationCircleOutlined />, danger: true, label: "Report not received", onClick: () => openNotReceived(b) }
        : null,
      cancellable && can("marketplace_bills.cancel_bill") ? { type: "divider" } : null,
      cancellable && can("marketplace_bills.cancel_bill")
        ? { key: "cancel", danger: true, label: "Cancel bill", onClick: () => confirmCancel(b) }
        : null,
    ].filter(Boolean);
    return items;
  }

  async function openNotReceived(b) {
    // The modal lists the recorded payments, so make sure we have them.
    if (Array.isArray(b.payments)) {
      setReopenBill(b);
      return;
    }
    try {
      const r = await api.get(`/admin/marketplace-bills/${b.id}`);
      setReopenBill(unwrap(r));
    } catch (e) {
      message.error(apiError(e, "Could not load payments"));
    }
  }

  function primaryAction(b) {
    if (b.status === "draft" && can("marketplace_bills.send")) {
      return (
        <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => action(b, "send", "Bill sent")}>
          Send
        </Button>
      );
    }
    if (PAYABLE.includes(b.status) && can("marketplace_bills.mark_paid")) {
      return (
        <Button size="small" type="primary" ghost icon={<DollarOutlined />} onClick={() => setPayBill(b)}>
          Record payment
        </Button>
      );
    }
    if (PAYABLE.includes(b.status) && can("marketplace_bills.send")) {
      return (
        <Button size="small" onClick={() => action(b, "resend", "Reminder sent")}>
          Remind
        </Button>
      );
    }
    if (b.status === "paid" && can("marketplace_bills.report_not_received")) {
      return (
        <Button size="small" danger onClick={() => openNotReceived(b)}>
          Not received?
        </Button>
      );
    }
    return null;
  }

  const columns = [
    {
      title: "Bill",
      dataIndex: "bill_number",
      render: (v, b) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => openDetail(b.id)} style={{ fontWeight: 600 }}>
            {v}
          </a>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(b.period_start)}
            {b.period_end && b.period_end !== b.period_start ? ` – ${formatDate(b.period_end)}` : ""}
          </Text>
        </Space>
      ),
    },
    isHq
      ? {
          title: "Branch",
          dataIndex: "branch_name",
          render: (v, b) => v || (b.branch_id ? `#${b.branch_id}` : "-"),
        }
      : null,
    { title: "Marketplace", dataIndex: "marketplace_name", render: (v) => v || "-" },
    { title: "Deliveries", dataIndex: "invoice_count", width: 90, align: "right" },
    {
      title: "Total",
      dataIndex: "total_amount",
      align: "right",
      render: (v) => <Text strong>{formatRs(v)}</Text>,
    },
    {
      title: "Paid",
      dataIndex: "paid_amount",
      align: "right",
      render: (v) => (toNumber(v) > 0 ? <Text style={{ color: "#389e0d" }}>{formatRs(v)}</Text> : <Text type="secondary">-</Text>),
    },
    {
      title: "Outstanding",
      dataIndex: "outstanding_amount",
      align: "right",
      render: (v, b) =>
        b.status === "cancelled" || b.status === "draft" ? (
          <Text type="secondary">-</Text>
        ) : toNumber(v) > 0 ? (
          <Text strong style={{ color: "#d46b08" }}>
            {formatRs(v)}
          </Text>
        ) : (
          <Text type="secondary">Rs 0.00</Text>
        ),
    },
    {
      title: "Progress",
      key: "progress",
      width: 150,
      render: (_, b) =>
        ["draft", "cancelled"].includes(b.status) ? (
          <Text type="secondary">-</Text>
        ) : (
          <PaymentProgress compact total={b.total_amount} paid={b.paid_amount} outstanding={b.outstanding_amount} />
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v, b) => (
        <Space direction="vertical" size={2}>
          <StatusTag status={v} tooltip={billStatusTooltip(b)} />
          {toNumber(b.pending_notices?.count) > 0 ? (
            <Text style={{ fontSize: 12, color: "#d46b08", cursor: "pointer" }} onClick={() => openDetail(b.id)}>
              Notice to verify: {formatRs(b.pending_notices.amount)}
            </Text>
          ) : null}
          {b.last_push && ["failed", "skipped"].includes(b.last_push.status) ? (
            <Text type="danger" style={{ fontSize: 12 }}>
              Push {b.last_push.status === "failed" ? "failed" : "not sent"}
            </Text>
          ) : null}
          {PAYABLE.includes(v) && b.days_outstanding != null ? (
            <Text type={b.days_outstanding > 15 ? "danger" : "secondary"} style={{ fontSize: 12 }}>
              {b.days_outstanding}d outstanding
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Sent",
      dataIndex: "sent_at",
      render: (v, b) =>
        v ? (
          <Space direction="vertical" size={0}>
            <span>{formatDate(v)}</span>
            {b.send_count > 1 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                sent {b.send_count}×
              </Text>
            ) : null}
          </Space>
        ) : (
          <Text type="secondary">Not sent</Text>
        ),
    },
    {
      title: "Last payment",
      key: "payment",
      render: (_, b) =>
        hasPayments(b) && b.status !== "reopened" ? (
          <Space direction="vertical" size={0}>
            <span>
              {b.status === "paid" ? formatDate(b.paid_at) : "Part paid"} · {methodLabel(b.payment_method)}
            </span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {b.paid_by_label || b.paid_by_type}
              {b.payment_reference ? ` · Ref ${b.payment_reference}` : ""}
            </Text>
          </Space>
        ) : b.status === "reopened" ? (
          <Text type="danger" style={{ fontSize: 12 }}>
            {b.reopen_reason || "Reported not received"}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 150,
      align: "right",
      render: (_, b) => (
        <Space size={4}>
          {primaryAction(b)}
          <Dropdown menu={{ items: rowActions(b) }} trigger={["click"]}>
            <Button size="small" icon={<MoreOutlined />} aria-label="More actions" />
          </Dropdown>
        </Space>
      ),
    },
  ].filter(Boolean);

  const s = summary || {};
  const filtersActive = branchId || marketplaceId || range || search;

  return (
    <>
      <AdminPageHeader
        title="Marketplace bills"
        subtitle="Bill marketplaces for free-delivery charges. Each branch sends (pushes) its own bills to the marketplace API. The marketplace sends a payment notice; you check the money arrived and verify it. Only a fully paid bill releases branch shares."
        icon={<ShopOutlined />}
        breadcrumb={[{ title: "Finance" }, { title: "Marketplace bills" }]}
        actions={
          <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Refresh
          </Button>
        }
      />

      <BranchScopeNotice style={{ margin: "8px 0" }} />

      {toNumber(s.notices_pending?.count) > 0 && tab !== "has_notices" ? (
        <Alert
          type="warning"
          showIcon
          style={{ margin: "8px 0" }}
          message={`${s.notices_pending.count} payment notice(s) for ${formatRs(s.notices_pending.amount)} on ${s.notices_pending.bills} bill(s) are waiting for you to verify.`}
          description="The marketplace says it paid. Nothing is recorded until you check the branch account and press Verify (or Reject with a reason)."
          action={
            <Button size="small" type="primary" onClick={() => setTab("has_notices")}>
              Show them
            </Button>
          }
        />
      ) : null}

      <StatCardGrid>
        <StatCard
          label="Ready to bill"
          value={formatRs(s.ready?.total ?? 0)}
          hint={`${s.ready?.count ?? 0} deliveries not billed yet`}
          variant="accent"
          icon={<FileDoneOutlined />}
        />
        <StatCard
          label="Outstanding"
          value={formatRs(s.outstanding?.total ?? 0)}
          hint={`${s.outstanding?.count ?? 0} bills still to be paid${s.draft?.count ? ` · ${s.draft.count} draft` : ""}`}
          variant="warning"
          icon={<ClockCircleOutlined />}
        />
        <StatCard
          label="Partially paid"
          value={s.partially_paid?.count ?? 0}
          hint={`${formatRs(s.partially_paid?.paid ?? 0)} received · ${formatRs(s.partially_paid?.outstanding ?? 0)} due`}
          variant="primary"
          icon={<PieChartOutlined />}
        />
        <StatCard
          label="Received this month"
          value={formatRs(s.paid_this_month?.total ?? 0)}
          hint={`${s.paid_this_month?.count ?? 0} payments since ${formatDate(s.paid_this_month?.since)}`}
          variant="success"
          icon={<CheckCircleOutlined />}
        />
        <StatCard
          label="Reopened / not received"
          value={s.reopened_count ?? 0}
          hint={s.reopened?.outstanding ? `${formatRs(s.reopened.outstanding)} due again` : "Bills reopened after a payment was not received"}
          variant={s.reopened_count ? "danger" : "primary"}
          icon={<ExclamationCircleOutlined />}
        />
      </StatCardGrid>

      <Card size="small" style={{ margin: "12px 0" }} styles={{ body: { padding: "8px 12px" } }}>
        <Space wrap size={8}>
          {isHq ? (
            <Select
              size="small"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="All branches"
              style={{ minWidth: 200 }}
              value={branchId}
              onChange={(v) => setBranchId(v ?? null)}
              options={branches.map((b) => ({ value: b.id, label: b.name || b.code || `#${b.id}` }))}
            />
          ) : null}
          <Select
            size="small"
            allowClear
            placeholder="All marketplaces"
            style={{ minWidth: 200 }}
            value={marketplaceId}
            onChange={(v) => setMarketplaceId(v ?? null)}
            options={marketplaces.map((m) => ({ value: m.id, label: m.name || m.code || `#${m.id}` }))}
          />
          <DatePicker.RangePicker size="small" value={range} onChange={setRange} allowEmpty={[true, true]} />
          {tab !== "ready" ? (
            <Input.Search
              size="small"
              allowClear
              placeholder="Bill no, reference or tracking"
              style={{ width: 260 }}
              value={searchDraft}
              onChange={(e) => {
                setSearchDraft(e.target.value);
                if (!e.target.value) setSearch("");
              }}
              onSearch={(v) => setSearch(v.trim())}
            />
          ) : null}
          {filtersActive ? (
            <Button
              size="small"
              type="link"
              onClick={() => {
                setBranchId(null);
                setMarketplaceId(null);
                setRange(null);
                setSearch("");
                setSearchDraft("");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </Space>
      </Card>

      <Card size="small" styles={{ body: { paddingTop: 0 } }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={TABS.map((t) => ({
            key: t.key,
            label:
              t.key === "ready" && s.ready?.count ? (
                <Badge count={s.ready.count} size="small" offset={[8, -2]} color="#1677ff">
                  {t.label}
                </Badge>
              ) : t.key === "reopened" && s.reopened_count ? (
                <Badge count={s.reopened_count} size="small" offset={[8, -2]}>
                  {t.label}
                </Badge>
              ) : t.key === "has_notices" && s.notices_pending?.count ? (
                <Badge count={s.notices_pending.count} size="small" offset={[8, -2]} color="#fa8c16">
                  {t.label}
                </Badge>
              ) : t.key === "partially_paid" && s.partially_paid?.count ? (
                <Badge count={s.partially_paid.count} size="small" offset={[8, -2]} color="#faad14">
                  {t.label}
                </Badge>
              ) : (
                t.label
              ),
          }))}
        />

        {tab === "ready" ? (
          !loadedOnce ? (
            <Skeleton active />
          ) : groups.length === 0 ? (
            <EmptyState
              title="Nothing to bill"
              hint="Delivery charges that a marketplace covers (free delivery) appear here once the shipment is delivered."
            />
          ) : (
            <Row gutter={[12, 12]}>
              {groups.map((g) => (
                <Col xs={24} md={12} xl={8} key={`${g.branch_id}-${g.marketplace_id}`}>
                  <Card
                    size="small"
                    title={
                      <Space direction="vertical" size={0}>
                        <span>{g.marketplace_name}</span>
                        {isHq ? (
                          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                            Billed by {g.branch_name || "No branch"}
                          </Text>
                        ) : null}
                      </Space>
                    }
                    extra={<Text strong style={{ fontSize: 16 }}>{formatRs(g.total)}</Text>}
                    actions={[
                      <Button
                        key="review"
                        type="primary"
                        size="small"
                        disabled={!g.branch_id || !g.marketplace_id || !can("marketplace_bills.create")}
                        onClick={() => setReview(g)}
                      >
                        Review &amp; send
                      </Button>,
                    ]}
                  >
                    <Space direction="vertical" size={4} style={{ width: "100%" }}>
                      <Text>
                        {g.invoice_count} {g.invoice_count === 1 ? "delivery" : "deliveries"} ·{" "}
                        {formatDate(g.first_date)}
                        {g.last_date && g.last_date !== g.first_date ? ` – ${formatDate(g.last_date)}` : ""}
                      </Text>
                      {g.push_ready || g.bill_to_email ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Bill goes to {[g.push_ready ? "the marketplace API (push)" : null, g.bill_to_email].filter(Boolean).join(" + ")}
                        </Text>
                      ) : (
                        <Alert
                          type="warning"
                          showIcon
                          style={{ padding: "2px 8px", fontSize: 12 }}
                          message={g.send_blocker || "No callback URL / secret and no billing email on this marketplace. Set them under Marketplaces."}
                        />
                      )}
                      {g.emailed_before ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {g.emailed_before} were emailed earlier as single invoices.
                        </Text>
                      ) : null}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          )
        ) : (
          <>
            {totals ? (
              <Space size={24} wrap style={{ marginBottom: 8 }}>
                <Text type="secondary">
                  {totals.count} bills · Total <Text strong>{formatRs(totals.total)}</Text>
                </Text>
                <Text type="secondary">
                  Paid <Text strong style={{ color: "#389e0d" }}>{formatRs(totals.paid)}</Text>
                </Text>
                <Text type="secondary">
                  Outstanding <Text strong style={{ color: "#d46b08" }}>{formatRs(totals.outstanding)}</Text>
                </Text>
              </Space>
            ) : null}
            <Table
              size="small"
              rowKey="id"
              loading={loading}
              dataSource={bills}
              columns={columns}
              scroll={{ x: 1250 }}
              locale={{
                emptyText: (
                  <EmptyState
                    title="No bills here"
                    hint={
                      tab === "awaiting"
                        ? "Bills you send to marketplaces wait here until they are fully paid."
                        : tab === "partially_paid"
                        ? "Bills with part of the amount received show here until the rest is paid."
                        : "Try another tab or clear the filters."
                    }
                  />
                ),
              }}
              pagination={{
                current: page,
                pageSize: 20,
                total: billTotal,
                size: "small",
                showSizeChanger: false,
                onChange: setPage,
              }}
            />
          </>
        )}
      </Card>

      <ReviewDrawer
        group={review}
        isHq={isHq}
        onClose={() => setReview(null)}
        onDone={(bill) => {
          setReview(null);
          load();
          if (bill?.id) openDetail(bill.id);
        }}
      />

      <BillDetailDrawer
        detail={detail}
        isHq={isHq}
        onClose={() => setDetail(null)}
        canReverse={can("marketplace_bills.reverse_payment")}
        onReverse={(bill, payment) => setReversal({ bill, payment })}
        canVerify={can("marketplace_bills.mark_paid")}
        canPush={can("marketplace_bills.send")}
        onChanged={(id) => {
          load();
          openDetail(id);
        }}
        actions={(b) => (
          <Space wrap>
            {primaryAction(b)}
            <Dropdown menu={{ items: rowActions(b).filter((i) => i.key !== "view") }} trigger={["click"]}>
              <Button size="small">More</Button>
            </Dropdown>
          </Space>
        )}
      />

      <RecordPaymentModal
        bill={payBill}
        onClose={() => setPayBill(null)}
        onSubmit={async (values) => {
          const ok = await action(payBill, "mark-paid", "Payment recorded", values);
          if (ok) setPayBill(null);
        }}
      />

      <ReportNotReceivedModal
        bill={reopenBill}
        onClose={() => setReopenBill(null)}
        onSubmit={async (body) => {
          const ok = await action(reopenBill, "report-not-received", "Payment reversed", body);
          if (ok) setReopenBill(null);
        }}
      />

      <ReversePaymentModal
        target={reversal}
        onClose={() => setReversal(null)}
        onSubmit={async (reason) => {
          const ok = await action(reversal.bill, `payments/${reversal.payment.id}/reverse`, "Payment reversed", { reason });
          if (ok) setReversal(null);
        }}
      />
    </>
  );
}

function ReviewDrawer({ group, isHq, onClose, onDone }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!group) return;
    setLoading(true);
    setRows([]);
    api
      .get("/admin/marketplace-bills/ready", {
        params: { branch_id: group.branch_id, marketplace_id: group.marketplace_id, with_invoices: 1 },
      })
      .then((r) => {
        const list = unwrap(r)?.invoices || [];
        setRows(list);
        setSelected(list.map((i) => i.id));
      })
      .catch((e) => message.error(apiError(e, "Could not load deliveries")))
      .finally(() => setLoading(false));
  }, [group]);

  const selectedTotal = rows.filter((r) => selected.includes(r.id)).reduce((a, r) => a + Number(r.amount || 0), 0);

  async function submit(sendNow) {
    setBusy(sendNow ? "send" : "draft");
    try {
      const r = await api.post("/admin/marketplace-bills", {
        marketplace_id: group.marketplace_id,
        branch_id: group.branch_id,
        invoice_ids: selected,
        send_now: sendNow,
      });
      const d = unwrap(r);
      if (d?.send_error) message.warning(r?.data?.message || d.send_error, 6);
      else message.success(r?.data?.message || "Bill created");
      onDone(d);
    } catch (e) {
      message.error(apiError(e, "Could not create bill"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Drawer
      open={Boolean(group)}
      onClose={onClose}
      width={760}
      title={group ? `Bill ${group.marketplace_name}${isHq && group.branch_name ? ` from ${group.branch_name}` : ""}` : ""}
      destroyOnClose
      footer={
        <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
          <Text>
            {selected.length} selected · <Text strong>{formatRs(selectedTotal)}</Text>
          </Text>
          <Space>
            <Button onClick={() => submit(false)} loading={busy === "draft"} disabled={!selected.length || busy}>
              Save as draft
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => submit(true)}
              loading={busy === "send"}
              disabled={!selected.length || busy || !group?.bill_to_email}
            >
              {group?.bill_to_email ? `Send to ${group.bill_to_email}` : "Send (no billing email)"}
            </Button>
          </Space>
        </Space>
      }
    >
      {group && !group.bill_to_email ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="This marketplace has no billing email"
          description="Set the billing email on the marketplace (Settings › Marketplaces) to send. You can still save a draft now."
        />
      ) : null}
      <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
        Untick deliveries you don't want on this bill. They stay in “Ready to bill”.
      </Text>
      <Table
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={false}
        scroll={{ y: 480 }}
        rowSelection={{ selectedRowKeys: selected, onChange: (k) => setSelected(k) }}
        columns={[
          { title: "Tracking", dataIndex: "tracking_number", render: (v) => v || "-" },
          { title: "Store", dataIndex: "store_name", render: (v, r) => v || r.store_id || "-" },
          { title: "Delivered", dataIndex: "delivered_at", render: (v, r) => formatDate(v || r.invoice_date) },
          { title: "Amount", dataIndex: "amount", align: "right", render: (v) => formatRs(v) },
        ]}
      />
    </Drawer>
  );
}

function BillDetailDrawer({ detail, isHq, onClose, actions, canReverse, onReverse, canVerify = true, canPush = true, onChanged = () => {} }) {
  const b = detail?.data;
  const [verify, setVerify] = useState(null);
  const [reject, setReject] = useState(null);
  const [pushing, setPushing] = useState(false);
  async function post(path, body, okText) {
    try {
      const r = await api.post(`/admin/marketplace-bills/${b.id}/${path}`, body);
      message.success(r?.data?.message || okText);
      onChanged(b.id);
      return true;
    } catch (e) {
      message.error(apiError(e, "Action failed"));
      return false;
    }
  }
  const notices = Array.isArray(b?.notices) ? b.notices : [];
  const pendingNotices = notices.filter((n) => n.status === "pending_verification");
  return (
    <Drawer
      open={Boolean(detail)}
      onClose={onClose}
      width={820}
      title={b ? b.bill_number : "Bill"}
      extra={b ? <StatusTag status={b.status} /> : null}
      destroyOnClose
    >
      {!b ? (
        <Skeleton active />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <Title level={3} style={{ margin: 0 }}>
              {formatRs(b.total_amount)}
            </Title>
            {actions(b)}
          </Space>

          {!["draft", "cancelled"].includes(b.status) ? (
            <Card size="small">
              <PaymentProgress total={b.total_amount} paid={b.paid_amount} outstanding={b.outstanding_amount} />
            </Card>
          ) : null}

          {b.status === "reopened" ? (
            <Alert
              type="error"
              showIcon
              message="Bill reopened (payment reversed / not received)"
              description={`${b.reopen_reason || ""}${b.reopened_at ? ` (${formatDateTime(b.reopened_at)})` : ""}`}
            />
          ) : null}

          <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Marketplace">{b.marketplace_name}</Descriptions.Item>
            <Descriptions.Item label="Billing branch">{b.branch_name || "-"}</Descriptions.Item>
            <Descriptions.Item label="Period">
              {formatDate(b.period_start)} – {formatDate(b.period_end)}
            </Descriptions.Item>
            <Descriptions.Item label="Deliveries">{b.invoice_count}</Descriptions.Item>
            <Descriptions.Item label="Sent">
              {b.sent_at ? `${formatDateTime(b.sent_at)}${b.sent_to_email ? ` to ${b.sent_to_email}` : ""}` : "Not sent yet"}
            </Descriptions.Item>
            <Descriptions.Item label="Times sent">{b.send_count || 0}</Descriptions.Item>
            {b.status === "paid" ? <Descriptions.Item label="Fully paid on">{formatDateTime(b.paid_at)}</Descriptions.Item> : null}
            {b.how_to_pay?.text ? (
              <Descriptions.Item label="How the marketplace pays" span={2}>
                {b.how_to_pay.text}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          {notices.length ? (
            <Card
              size="small"
              title={`Payment notices from the marketplace${pendingNotices.length ? ` (${pendingNotices.length} to verify)` : ""}`}
              styles={{ body: { padding: 0 } }}
            >
              {pendingNotices.length ? (
                <Alert
                  type="warning"
                  showIcon
                  banner
                  message="Check the money arrived in the branch account, then Verify (records the payment, part amounts allowed) or Reject with a reason. The marketplace is told either way."
                />
              ) : null}
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={notices}
                columns={[
                  { title: "Sent", dataIndex: "submitted_at", render: formatDateTime },
                  { title: "Amount", dataIndex: "amount", align: "right", render: (v) => <Text strong>{formatRs(v)}</Text> },
                  {
                    title: "Method / reference",
                    key: "m",
                    render: (_, n) => (
                      <Space direction="vertical" size={0}>
                        <span>{methodLabel(n.method)}</span>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {n.reference || "-"} | paid {formatDate(n.paid_at)}
                        </Text>
                      </Space>
                    ),
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    render: (v, n) => (
                      <Space direction="vertical" size={0}>
                        <StatusTag status={v} />
                        {v === "verified" ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatRs(n.verified_amount)} by {n.verified_by_label || "-"}
                          </Text>
                        ) : null}
                        {v === "rejected" ? (
                          <Text type="danger" style={{ fontSize: 12 }}>
                            {n.reject_reason}
                          </Text>
                        ) : null}
                      </Space>
                    ),
                  },
                  {
                    title: "",
                    key: "a",
                    align: "right",
                    render: (_, n) =>
                      n.status === "pending_verification" && canVerify ? (
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
            </Card>
          ) : null}

          {b.sent_at ? (
            <Card
              size="small"
              title="Pushed to the marketplace API"
              extra={
                canPush && b.status !== "cancelled" ? (
                  <Button
                    size="small"
                    icon={<SendOutlined />}
                    loading={pushing}
                    disabled={b.push_target && !b.push_target.ready}
                    onClick={async () => {
                      setPushing(true);
                      await post("push", {}, "Push queued");
                      setPushing(false);
                    }}
                  >
                    Push again
                  </Button>
                ) : null
              }
              styles={{ body: { padding: 0 } }}
            >
              {b.push_target && !b.push_target.ready ? (
                <Alert type="warning" showIcon banner message={`${b.push_target.problem}. Set it on Admin -> Marketplaces; email is used meanwhile.`} />
              ) : null}
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={b.deliveries || []}
                locale={{ emptyText: "Nothing pushed yet" }}
                columns={[
                  { title: "Event", dataIndex: "event", render: (v) => <Text code>{v}</Text> },
                  { title: "Queued", dataIndex: "queued_at", render: formatDateTime },
                  { title: "Status", dataIndex: "status", render: (v) => <StatusTag status={v} /> },
                  { title: "HTTP", dataIndex: "http_status", render: (v) => v ?? "-" },
                  { title: "Tries", dataIndex: "attempts", align: "right" },
                  {
                    title: "Last attempt / error",
                    key: "e",
                    render: (_, d) => (
                      <Space direction="vertical" size={0}>
                        <span>{d.delivered_at ? `Delivered ${formatDateTime(d.delivered_at)}` : formatDateTime(d.last_attempt_at)}</span>
                        {d.last_error ? (
                          <Text type="danger" style={{ fontSize: 12 }}>
                            {d.last_error}
                          </Text>
                        ) : null}
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          ) : null}

          <Card
            size="small"
            title={`Payments (${(b.payments || []).filter((p) => p.status === "recorded").length} recorded)`}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              size="small"
              rowKey="id"
              dataSource={b.payments || []}
              pagination={false}
              locale={{ emptyText: <EmptyState title="No payments yet" hint="Verified payment notices, HamroPay and payments recorded by the branch appear here." /> }}
              rowClassName={(p) => (p.status === "reversed" ? "ant-table-row-disabled" : "")}
              columns={[
                { title: "Paid on", dataIndex: "paid_at", render: (v) => formatDateTime(v) },
                {
                  title: "Amount",
                  dataIndex: "amount",
                  align: "right",
                  render: (v, p) => (
                    <Text strong delete={p.status === "reversed"}>
                      {formatRs(v)}
                    </Text>
                  ),
                },
                {
                  title: "Method / reference",
                  key: "ref",
                  render: (_, p) => (
                    <Space direction="vertical" size={0}>
                      <span>{methodLabel(p.method)}</span>
                      {p.reference ? (
                        <Text type="secondary" copyable style={{ fontSize: 12 }}>
                          {p.reference}
                        </Text>
                      ) : null}
                    </Space>
                  ),
                },
                {
                  title: "By",
                  key: "by",
                  render: (_, p) => (
                    <Space direction="vertical" size={0}>
                      <span>{p.recorded_by_label || p.source}</span>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <SourceTag source={p.source} />
                        {p.note ? ` · ${p.note}` : ""}
                      </Text>
                    </Space>
                  ),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (v, p) => (
                    <StatusTag
                      status={v}
                      tooltip={
                        p.status === "reversed"
                          ? `${p.reverse_reason || "Reversed"}${p.reversed_at ? ` · ${formatDateTime(p.reversed_at)}` : ""}${p.reversed_by_label ? ` · ${p.reversed_by_label}` : ""}`
                          : null
                      }
                    />
                  ),
                },
                {
                  title: "",
                  key: "act",
                  align: "right",
                  render: (_, p) =>
                    p.status === "recorded" && canReverse ? (
                      <Button size="small" danger type="link" icon={<RollbackOutlined />} onClick={() => onReverse(b, p)}>
                        Reverse
                      </Button>
                    ) : null,
                },
              ]}
            />
          </Card>

          <Card size="small" title={`Deliveries on this bill (${b.lines?.length || 0})`} styles={{ body: { padding: 0 } }}>
            <Table
              size="small"
              rowKey={(r) => r.invoice_id}
              dataSource={b.lines || []}
              pagination={(b.lines || []).length > 15 ? { pageSize: 15, size: "small" } : false}
              columns={[
                { title: "Tracking", dataIndex: "tracking_number", render: (v) => v || "-" },
                { title: "Store", dataIndex: "store_name", render: (v, r) => v || r.store_id || "-" },
                { title: "Delivered", dataIndex: "delivered_at", render: (v, r) => formatDate(v || r.invoice_date) },
                { title: "Invoice", dataIndex: "invoice_number" },
                { title: "Amount", dataIndex: "amount", align: "right", render: (v) => formatRs(v) },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Text strong>Total</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong>{formatRs(b.total_amount)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>

          {Array.isArray(b.payment_history) && b.payment_history.length ? (
            <Card size="small" title="Older payments reported as not received (before part payments)">
              <Timeline
                items={b.payment_history.map((h, i) => ({
                  key: i,
                  color: "red",
                  children: (
                    <Space direction="vertical" size={0}>
                      <Text>
                        {formatRs(h.paid_amount)} by {methodLabel(h.payment_method)}
                        {h.payment_reference ? ` · Ref ${h.payment_reference}` : ""} ({h.paid_by_type || "-"}, {formatDateTime(h.paid_at)})
                      </Text>
                      <Text type="danger" style={{ fontSize: 12 }}>
                        Not received: {h.reason} · {formatDateTime(h.reported_not_received_at)}
                      </Text>
                    </Space>
                  ),
                }))}
              />
            </Card>
          ) : null}
        </Space>
      )}
      <NoticeVerifyModal
        notice={verify}
        outstanding={b?.outstanding_amount}
        onClose={() => setVerify(null)}
        onSubmit={async (values) => {
          const ok = await post(`notices/${verify.id}/verify`, values, "Verified");
          if (ok) setVerify(null);
        }}
      />
      <ReasonModal
        open={Boolean(reject)}
        title={reject ? `Reject payment notice of ${formatRs(reject.amount)}` : ""}
        okText="Reject notice"
        hint="The marketplace receives billing.payment_notice.rejected with this reason. Nothing is recorded."
        onClose={() => setReject(null)}
        onSubmit={async (reason) => {
          const ok = await post(`notices/${reject.id}/reject`, { reason }, "Rejected");
          if (ok) setReject(null);
        }}
      />
    </Drawer>
  );
}

function RecordPaymentModal({ bill, onClose, onSubmit }) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const outstanding = bill
    ? toNumber(bill.outstanding_amount ?? Math.max(0, toNumber(bill.total_amount) - toNumber(bill.paid_amount)))
    : 0;
  const amount = Form.useWatch("amount", form);
  const after = Math.max(0, Math.round((outstanding - toNumber(amount)) * 100) / 100);

  useEffect(() => {
    if (bill) {
      setRequestId(newRequestId()); // one id per modal open: a double click cannot record twice
      form.setFieldsValue({
        amount: outstanding,
        method: "bank_transfer",
        reference: "",
        paid_at: dayjs(),
        note: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill, form]);

  return (
    <Modal
      open={Boolean(bill)}
      title={bill ? `Record payment · ${bill.bill_number}` : ""}
      okText={toNumber(amount) > 0 && toNumber(amount) < outstanding ? "Record part payment" : "Record payment"}
      onCancel={onClose}
      confirmLoading={busy}
      destroyOnClose
      onOk={async () => {
        const v = await form.validateFields();
        setBusy(true);
        try {
          await onSubmit({
            amount: v.amount,
            method: v.method,
            reference: v.reference,
            paid_at: v.paid_at ? v.paid_at.format("YYYY-MM-DD HH:mm:ss") : undefined,
            note: v.note || undefined,
            request_id: requestId,
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      {bill ? (
        <Card size="small" style={{ marginBottom: 12 }}>
          <PaymentProgress total={bill.total_amount} paid={bill.paid_amount} outstanding={outstanding} />
        </Card>
      ) : null}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="If the marketplace sent a payment notice, verify that notice instead (it is listed on the bill). Record a payment here only when the money has reached the branch account without a notice. Part payments are allowed."
      />
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="amount"
          label={
            <Space>
              <span>Amount received</span>
              <Button size="small" type="link" style={{ padding: 0 }} onClick={() => form.setFieldsValue({ amount: outstanding })}>
                Full outstanding ({formatRs(outstanding)})
              </Button>
            </Space>
          }
          extra={
            toNumber(amount) > 0 && toNumber(amount) <= outstanding
              ? after > 0
                ? `Rs ${after.toLocaleString("en-IN", { minimumFractionDigits: 2 })} will stay outstanding (bill becomes Partially paid).`
                : "This pays the bill in full. Its deliveries become paid and branch shares are released."
              : null
          }
          rules={[
            { required: true, message: "Enter the amount" },
            {
              validator: (_, v) => {
                const n = toNumber(v);
                if (v === null || v === undefined || v === "") return Promise.resolve();
                if (n <= 0) return Promise.reject(new Error("Amount must be greater than zero"));
                if (n - outstanding > 0.004) return Promise.reject(new Error(`Amount exceeds outstanding ${formatRs(outstanding)}`));
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber style={{ width: "100%" }} min={0.01} max={outstanding} step={0.01} precision={2} prefix="Rs" />
        </Form.Item>
        <Space style={{ width: "100%" }} size={12} align="start">
          <Form.Item name="method" label="Method" rules={[{ required: true }]} style={{ minWidth: 200 }}>
            <Select options={PAYMENT_METHODS} />
          </Form.Item>
          <Form.Item name="paid_at" label="Paid on">
            <DatePicker showTime={{ format: "HH:mm" }} format="DD MMM YYYY HH:mm" disabledDate={(d) => d && d.isAfter(dayjs(), "day")} />
          </Form.Item>
        </Space>
        <Form.Item
          name="reference"
          label="Payment reference"
          rules={[{ required: true, message: "Enter the bank / wallet reference" }]}
        >
          <Input placeholder="e.g. bank transaction id" />
        </Form.Item>
        <Form.Item name="note" label="Note">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ReversePaymentModal({ target, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (target) setReason("");
  }, [target]);
  const p = target?.payment;
  const b = target?.bill;
  const willUnpay = b && p && b.status === "paid";

  return (
    <Modal
      open={Boolean(target)}
      title={p ? `Reverse payment of ${formatRs(p.amount)}?` : ""}
      okText="Reverse payment"
      okButtonProps={{ danger: true, disabled: reason.trim().length < 3 }}
      confirmLoading={busy}
      onCancel={onClose}
      destroyOnClose
      onOk={async () => {
        setBusy(true);
        try {
          await onSubmit(reason.trim());
        } finally {
          setBusy(false);
        }
      }}
    >
      {p ? (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>
            {methodLabel(p.method)}
            {p.reference ? ` · Ref ${p.reference}` : ""} · {formatDateTime(p.paid_at)} · {p.recorded_by_label || p.source}
          </Text>
          <Text type="secondary">
            The payment stays in the history as reversed and the outstanding goes up by {formatRs(p.amount)}.
            {willUnpay
              ? " The bill is fully paid now, so its deliveries become unpaid again. Inter-branch statement lines already generated are not changed."
              : ""}
          </Text>
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            placeholder="Reason, e.g. Entered twice by mistake."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Space>
      ) : null}
    </Modal>
  );
}

function ReportNotReceivedModal({ bill, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [paymentId, setPaymentId] = useState("all");
  const [busy, setBusy] = useState(false);
  const recorded = (bill?.payments || []).filter((p) => p.status === "recorded");

  useEffect(() => {
    if (bill) {
      setReason("");
      setPaymentId(recorded.length === 1 ? recorded[0].id : "all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill]);

  return (
    <Modal
      open={Boolean(bill)}
      title={bill ? `Payment for ${bill.bill_number} not received?` : ""}
      okText="Reverse & notify marketplace"
      okButtonProps={{ danger: true, disabled: reason.trim().length < 3 || !recorded.length }}
      confirmLoading={busy}
      onCancel={onClose}
      destroyOnClose
      onOk={async () => {
        setBusy(true);
        try {
          await onSubmit({ reason: reason.trim(), payment_id: paymentId === "all" ? undefined : paymentId });
        } finally {
          setBusy(false);
        }
      }}
    >
      {bill ? (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>
            Choose the payment that did not reach your account. It is reversed (kept in the history), the outstanding goes back up, and the
            marketplace is emailed and gets a webhook so it can check and pay again.
          </Text>
          {recorded.length ? (
            <Radio.Group value={paymentId} onChange={(e) => setPaymentId(e.target.value)} style={{ width: "100%" }}>
              <Space direction="vertical">
                {recorded.map((p) => (
                  <Radio key={p.id} value={p.id}>
                    {formatRs(p.amount)} · {methodLabel(p.method)}
                    {p.reference ? ` · Ref ${p.reference}` : ""} · {formatDate(p.paid_at)} · {p.recorded_by_label || p.source}
                  </Radio>
                ))}
                {recorded.length > 1 ? <Radio value="all">All {recorded.length} recorded payments</Radio> : null}
              </Space>
            </Radio.Group>
          ) : (
            <Alert type="warning" showIcon message="This bill has no recorded payment." />
          )}
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            placeholder="Reason, e.g. No credit for this reference in our bank statement up to 12 Oct."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Space>
      ) : (
        <Empty />
      )}
    </Modal>
  );
}
