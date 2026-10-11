"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { CreditCardOutlined, FileSearchOutlined, ReloadOutlined, SendOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import api from "@/lib/api";
import { submitPodCheckoutForm } from "@/lib/podCheckout";
import {
  PAYMENT_METHODS,
  PaymentProgress,
  SourceTag,
  StatusTag,
  apiError,
  formatDate,
  formatDateTime,
  formatRs,
  methodLabel,
  newRequestId,
  toNumber,
  unwrap,
} from "@/components/admin/billing/financeKit";

const { Text, Paragraph } = Typography;

/**
 * Merchant portal: Billing.
 * What the store owes each branch for delivery charges. The store tells the
 * branch it paid (payment notice): by invoice number, everything (oldest
 * first) or a part amount. The branch checks the money and verifies it; only
 * then is it counted as paid. HamroPay payments are confirmed automatically.
 */
export default function MerchantBillingPage() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState([]);
  const [noticeModal, setNoticeModal] = useState(null); // {mode: 'single'|'all', invoice?, branchId?}
  const [detailId, setDetailId] = useState(null);
  const [hamro, setHamro] = useState(null); // {sessions, amount}
  const [lookupValue, setLookupValue] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      setSummary(unwrap(await api.get("/merchant/billing/summary")));
    } catch (e) {
      message.error(apiError(e, "Could not load billing summary"));
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const d = unwrap(await api.get("/merchant/billing/invoices", { params: { status, search: search || undefined, page, per_page: 20 } }));
      setRows(d?.data || []);
      setTotal(d?.total || 0);
    } catch (e) {
      message.error(apiError(e, "Could not load invoices"));
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  const loadNotices = useCallback(async () => {
    try {
      const d = unwrap(await api.get("/merchant/billing/notices", { params: { per_page: 50 } }));
      setNotices(d?.data || []);
    } catch (e) {
      // the list is secondary; keep the page usable
    }
  }, []);

  const reloadAll = useCallback(() => {
    loadSummary();
    loadRows();
    loadNotices();
  }, [loadSummary, loadRows, loadNotices]);

  useEffect(() => {
    loadSummary();
    loadNotices();
  }, [loadSummary, loadNotices]);
  useEffect(() => {
    loadRows();
  }, [loadRows]);

  async function lookup(value) {
    const number = String(value || "").trim();
    if (!number) return;
    try {
      const inv = unwrap(await api.get("/merchant/billing/invoices/lookup", { params: { number } }));
      if (toNumber(inv.claimable) <= 0) {
        message.info(
          toNumber(inv.outstanding_amount) <= 0
            ? `${inv.invoice_number} is already paid.`
            : `${inv.invoice_number}: ${formatRs(inv.pending_verification_amount)} is already waiting for the branch to verify.`
        );
        setDetailId(inv.id);
        return;
      }
      setNoticeModal({ mode: "single", invoice: inv });
    } catch (e) {
      message.error(apiError(e, "Invoice not found"));
    }
  }

  async function startHamroPay(payload) {
    try {
      const res = await api.post("/merchant/billing/hamropay", payload);
      const d = unwrap(res);
      setHamro(d);
      if (res?.data?.message) message.info(res.data.message);
    } catch (e) {
      message.error(apiError(e, "Could not start HamroPay"));
    }
  }

  const columns = [
    {
      title: "Invoice",
      dataIndex: "invoice_number",
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => setDetailId(r.id)}>{v}</a>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.tracking_number || "-"}
          </Text>
        </Space>
      ),
    },
    { title: "Date", dataIndex: "invoice_date", width: 120, render: formatDate },
    { title: "Branch (pay to)", dataIndex: "branch_name", render: (v) => v || "-" },
    { title: "Total", dataIndex: "total_amount", align: "right", render: (v) => formatRs(v) },
    {
      title: "Paid",
      key: "progress",
      width: 170,
      render: (_, r) => <PaymentProgress compact total={r.total_amount} paid={r.paid_amount} outstanding={r.outstanding_amount} />,
    },
    {
      title: "Waiting for branch",
      dataIndex: "pending_verification_amount",
      align: "right",
      render: (v) => (toNumber(v) > 0 ? <Tag color="orange">{formatRs(v)}</Tag> : "-"),
    },
    { title: "Status", dataIndex: "status", width: 140, render: (v) => <StatusTag status={v} /> },
    {
      title: "",
      key: "actions",
      width: 220,
      render: (_, r) =>
        ["unpaid", "partially_paid"].includes(r.status) && !r.on_marketplace_bill ? (
          <Space wrap>
            <Button size="small" icon={<SendOutlined />} disabled={toNumber(r.claimable) <= 0} onClick={() => setNoticeModal({ mode: "single", invoice: r })}>
              I paid
            </Button>
            <Button size="small" icon={<CreditCardOutlined />} disabled={toNumber(r.claimable) <= 0} onClick={() => startHamroPay({ invoice_id: r.id })}>
              HamroPay
            </Button>
          </Space>
        ) : (
          <Button size="small" type="link" onClick={() => setDetailId(r.id)}>
            Details
          </Button>
        ),
    },
  ];

  const branchColumns = [
    { title: "Branch (pay to)", dataIndex: "branch_name", render: (v) => <strong>{v || "-"}</strong> },
    { title: "Invoices", dataIndex: "invoices", align: "right" },
    { title: "Oldest", dataIndex: "oldest_invoice_date", render: formatDate },
    { title: "Outstanding", dataIndex: "outstanding", align: "right", render: (v) => <strong>{formatRs(v)}</strong> },
    { title: "Waiting for branch", dataIndex: "pending_verification", align: "right", render: (v) => (toNumber(v) > 0 ? formatRs(v) : "-") },
    { title: "Still to pay", dataIndex: "claimable", align: "right", render: (v) => formatRs(v) },
    {
      title: "",
      key: "a",
      render: (_, b) => (
        <Space wrap>
          <Button size="small" type="primary" disabled={toNumber(b.claimable) <= 0} onClick={() => setNoticeModal({ mode: "all", branchId: b.branch_id, branchName: b.branch_name, max: b.claimable })}>
            I paid this branch
          </Button>
          <Button size="small" icon={<CreditCardOutlined />} disabled={toNumber(b.claimable) <= 0} onClick={() => startHamroPay({ branch_id: b.branch_id })}>
            HamroPay
          </Button>
        </Space>
      ),
    },
  ];

  const noticeColumns = [
    { title: "Sent", dataIndex: "submitted_at", render: formatDateTime },
    { title: "Invoice", dataIndex: "number" },
    { title: "Branch", dataIndex: "branch_name" },
    { title: "Amount", dataIndex: "amount", align: "right", render: (v) => formatRs(v) },
    { title: "Method", dataIndex: "method", render: methodLabel },
    { title: "Reference", dataIndex: "reference", render: (v, n) => <span>{v || "-"}{n.batch_reference && n.batch_reference !== v ? <Text type="secondary"> ({n.batch_reference})</Text> : null}</span> },
    {
      title: "Status",
      dataIndex: "status",
      render: (v, n) => (
        <Space direction="vertical" size={0}>
          <StatusTag status={v} />
          {v === "verified" && toNumber(n.verified_amount) !== toNumber(n.amount) ? <Text type="secondary" style={{ fontSize: 12 }}>Branch verified {formatRs(n.verified_amount)}</Text> : null}
          {v === "rejected" ? <Text type="danger" style={{ fontSize: 12 }}>{n.reject_reason}</Text> : null}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Billing"
      extra={
        <Button icon={<ReloadOutlined />} onClick={reloadAll}>
          Refresh
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Delivery charges you owe each branch"
        description="Pay the branch, then tell us here (I paid). The branch checks the money arrived and verifies it; only then the invoice counts as paid. Payments are applied to the oldest invoice first. HamroPay payments are confirmed automatically."
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small"><Statistic title="Outstanding" value={formatRs(summary?.outstanding ?? 0)} valueStyle={{ color: "#d46b08" }} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small"><Statistic title="Waiting for branch check" value={formatRs(summary?.pending_verification ?? 0)} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small"><Statistic title="Still to pay" value={formatRs(summary?.claimable ?? 0)} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small"><Statistic title="Paid this month" value={formatRs(summary?.paid_this_month?.total ?? 0)} valueStyle={{ color: "#389e0d" }} /></Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            style={{ width: 340 }}
            placeholder="Pay by invoice number (INV-...)"
            enterButton={<><FileSearchOutlined /> Find</>}
            value={lookupValue}
            onChange={(e) => setLookupValue(e.target.value)}
            onSearch={lookup}
          />
          <Button type="primary" disabled={toNumber(summary?.claimable) <= 0} onClick={() => setNoticeModal({ mode: "all", max: summary?.claimable })}>
            I paid all / a part
          </Button>
          <Button icon={<CreditCardOutlined />} disabled={toNumber(summary?.claimable) <= 0} onClick={() => startHamroPay({})}>
            Pay all with HamroPay
          </Button>
        </Space>
      </Card>

      <Tabs
        items={[
          {
            key: "branches",
            label: "By branch",
            children: (
              <Table
                rowKey="branch_id"
                size="middle"
                dataSource={summary?.by_branch || []}
                columns={branchColumns}
                pagination={false}
                locale={{ emptyText: <Empty description="Nothing to pay. All delivery charges are paid." /> }}
              />
            ),
          },
          {
            key: "invoices",
            label: "Invoices",
            children: (
              <>
                <Space wrap style={{ marginBottom: 12 }}>
                  <Select
                    value={status}
                    style={{ width: 180 }}
                    onChange={(v) => { setStatus(v); setPage(1); }}
                    options={[
                      { value: "open", label: "To pay" },
                      { value: "partially_paid", label: "Partially paid" },
                      { value: "paid", label: "Paid" },
                      { value: "all", label: "All" },
                    ]}
                  />
                  <Input.Search allowClear placeholder="Invoice or tracking number" style={{ width: 260 }} onSearch={(v) => { setSearch(v); setPage(1); }} />
                </Space>
                <Table
                  rowKey="id"
                  size="middle"
                  loading={loading}
                  dataSource={rows}
                  columns={columns}
                  pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
                  scroll={{ x: 1000 }}
                />
              </>
            ),
          },
          {
            key: "notices",
            label: `My payment notices${notices.filter((n) => n.status === "pending_verification").length ? ` (${notices.filter((n) => n.status === "pending_verification").length} waiting)` : ""}`,
            children: <Table rowKey="id" size="middle" dataSource={notices} columns={noticeColumns} pagination={{ pageSize: 20 }} scroll={{ x: 900 }} />,
          },
        ]}
      />

      {noticeModal ? (
        <NoticeModal
          ctx={noticeModal}
          onClose={() => setNoticeModal(null)}
          onDone={() => { setNoticeModal(null); reloadAll(); }}
        />
      ) : null}
      <InvoiceDrawer id={detailId} onClose={() => setDetailId(null)} />
      <HamroPayModal data={hamro} onClose={() => { setHamro(null); reloadAll(); }} />
    </Card>
  );
}

function NoticeModal({ ctx, onClose, onDone }) {
  const [form] = Form.useForm();
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [requestId] = useState(newRequestId);
  const amount = Form.useWatch("amount", form);
  const single = ctx.mode === "single";
  const max = single ? toNumber(ctx.invoice?.claimable) : toNumber(ctx.max);

  useEffect(() => {
    form.setFieldsValue({ amount: max || undefined, method: "bank_transfer", paid_at: dayjs() });
  }, [form, max]);

  useEffect(() => {
    if (single) return undefined;
    const t = setTimeout(async () => {
      try {
        const d = unwrap(await api.get("/merchant/billing/pay-all/preview", { params: { amount: amount || undefined, branch_id: ctx.branchId || undefined } }));
        setPreview(d);
        setPreviewError(null);
      } catch (e) {
        setPreview(null);
        setPreviewError(apiError(e));
      }
    }, 350);
    return () => clearTimeout(t);
  }, [amount, single, ctx.branchId]);

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const body = {
        amount: v.amount,
        method: v.method,
        reference: v.reference,
        paid_at: v.paid_at ? v.paid_at.format("YYYY-MM-DD") : undefined,
        note: v.note,
        request_id: requestId,
      };
      const res = single
        ? await api.post(`/merchant/billing/invoices/${ctx.invoice.id}/payment-notice`, body)
        : await api.post("/merchant/billing/pay-all", { ...body, branch_id: ctx.branchId || undefined });
      message.success(res?.data?.message || "Payment notice sent.");
      onDone();
    } catch (e) {
      message.error(apiError(e, "Could not send the notice"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      width={single ? 520 : 720}
      title={single ? `I paid ${ctx.invoice.invoice_number}` : ctx.branchName ? `I paid ${ctx.branchName}` : "I paid (all or a part)"}
      okText="Send payment notice"
      confirmLoading={saving}
      onOk={submit}
      onCancel={onClose}
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message="The branch checks this payment first"
        description="Your invoices count as paid only after the branch verifies the money arrived. You can pay a part; the rest stays due."
      />
      {single ? (
        <Descriptions size="small" column={2} style={{ marginBottom: 12 }}>
          <Descriptions.Item label="Branch">{ctx.invoice.branch_name || "-"}</Descriptions.Item>
          <Descriptions.Item label="Outstanding">{formatRs(ctx.invoice.outstanding_amount)}</Descriptions.Item>
          <Descriptions.Item label="Waiting for branch">{formatRs(ctx.invoice.pending_verification_amount)}</Descriptions.Item>
          <Descriptions.Item label="You can claim">{formatRs(ctx.invoice.claimable)}</Descriptions.Item>
        </Descriptions>
      ) : null}
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="amount" label={`Amount paid (max ${formatRs(max)})`} rules={[{ required: true, message: "Enter the amount" }]}>
              <InputNumber min={0.01} max={max || undefined} step={100} style={{ width: "100%" }} prefix="Rs" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="method" label="How you paid" rules={[{ required: true }]}>
              <Select options={PAYMENT_METHODS.filter((m) => m.value !== "hamropay")} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="reference" label="Transaction / slip reference" rules={single ? [{ required: true, message: "Enter the reference" }] : []}>
              <Input placeholder="Bank / wallet transaction id" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="paid_at" label="Paid on">
              <DatePicker style={{ width: "100%" }} disabledDate={(d) => d && d.isAfter(dayjs(), "day")} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="note" label="Note (optional)">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      </Form>
      {!single ? (
        <div>
          <Text strong>How it is applied (oldest invoice first)</Text>
          {previewError ? <Alert type="error" showIcon message={previewError} style={{ marginTop: 8 }} /> : null}
          {preview ? (
            <>
              <Table
                style={{ marginTop: 8 }}
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={preview.lines}
                scroll={{ y: 220 }}
                columns={[
                  { title: "Invoice", dataIndex: "number" },
                  { title: "Date", dataIndex: "date", render: formatDate },
                  { title: "Branch", dataIndex: "branch_name" },
                  { title: "Due", dataIndex: "due_before", align: "right", render: (v) => formatRs(v) },
                  { title: "Applied", dataIndex: "amount", align: "right", render: (v) => <strong>{formatRs(v)}</strong> },
                  { title: "Left", dataIndex: "due_after", align: "right", render: (v) => formatRs(v) },
                ]}
              />
              <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                Per branch: {preview.by_branch.map((b) => `${b.branch_name || "Branch " + b.branch_id} ${formatRs(b.amount)}`).join(" | ")}. Still due after this: {formatRs(preview.remaining_after)}.
              </Paragraph>
            </>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

function InvoiceDrawer({ id, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!id) { setData(null); return; }
    api.get(`/merchant/billing/invoices/${id}`).then((r) => setData(unwrap(r))).catch((e) => message.error(apiError(e)));
  }, [id]);
  return (
    <Drawer open={!!id} width={640} title={data?.invoice_number || "Invoice"} onClose={onClose}>
      {data ? (
        <>
          <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Status"><StatusTag status={data.status} /></Descriptions.Item>
            <Descriptions.Item label="Branch">{data.branch_name || "-"}</Descriptions.Item>
            <Descriptions.Item label="Date">{formatDate(data.invoice_date)}</Descriptions.Item>
            <Descriptions.Item label="Tracking">{data.tracking_number || "-"}</Descriptions.Item>
            <Descriptions.Item label="Reference to use" span={2}>{data.payable?.reference_to_use}</Descriptions.Item>
          </Descriptions>
          <PaymentProgress total={data.total_amount} paid={data.paid_amount} outstanding={data.outstanding_amount} />
          {toNumber(data.pending_verification_amount) > 0 ? (
            <Alert style={{ marginTop: 12 }} type="warning" showIcon message={`${formatRs(data.pending_verification_amount)} is waiting for the branch to verify.`} />
          ) : null}
          <h4 style={{ marginTop: 20 }}>Payments</h4>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={data.payments || []}
            locale={{ emptyText: "No payment recorded yet" }}
            columns={[
              { title: "Date", dataIndex: "paid_at", render: formatDate },
              { title: "Amount", dataIndex: "amount", align: "right", render: (v) => formatRs(v) },
              { title: "Method", dataIndex: "method", render: methodLabel },
              { title: "Reference", dataIndex: "reference" },
              { title: "Source", dataIndex: "source", render: (v) => <SourceTag source={v} /> },
              { title: "Status", dataIndex: "status", render: (v, p) => <StatusTag status={v} tooltip={p.reverse_reason} /> },
            ]}
          />
          <h4 style={{ marginTop: 20 }}>My payment notices</h4>
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={data.notices || []}
            locale={{ emptyText: "No notices" }}
            columns={[
              { title: "Sent", dataIndex: "submitted_at", render: formatDateTime },
              { title: "Amount", dataIndex: "amount", align: "right", render: (v) => formatRs(v) },
              { title: "Reference", dataIndex: "reference" },
              { title: "Status", dataIndex: "status", render: (v, n) => <StatusTag status={v} tooltip={n.reject_reason} /> },
            ]}
          />
        </>
      ) : null}
    </Drawer>
  );
}

function HamroPayModal({ data, onClose }) {
  const [checking, setChecking] = useState(null);
  const sessions = useMemo(() => data?.sessions || [], [data]);
  async function confirm(txn) {
    setChecking(txn);
    try {
      const res = await api.post("/merchant/billing/hamropay/confirm", { merchant_txn_id: txn });
      message.success(res?.data?.message || "Payment confirmed.");
    } catch (e) {
      message.error(apiError(e, "HamroPay has not confirmed this payment yet."));
    } finally {
      setChecking(null);
    }
  }
  return (
    <Modal open={!!data} title="Pay with HamroPay" footer={<Button onClick={onClose}>Close</Button>} onCancel={onClose} width={640}>
      <Paragraph type="secondary">
        Each branch is paid separately to its own HamroPay account. Open each checkout, pay, then press &quot;I have paid&quot;. HamroPay confirms the payment and it is recorded automatically.
      </Paragraph>
      {sessions.map((s) => (
        <Card key={s.merchant_txn_id || s.branch_id} size="small" style={{ marginBottom: 8 }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <span>
              <strong>{s.branch_name || `Branch ${s.branch_id}`}</strong>: {formatRs(s.amount)} ({(s.invoices || []).length} invoice(s))
            </span>
            {s.error ? (
              <Text type="danger">{s.error}</Text>
            ) : (
              <Space>
                <Button type="primary" onClick={() => submitPodCheckoutForm(s.checkout, "_blank")}>Open checkout</Button>
                <Button loading={checking === s.merchant_txn_id} onClick={() => confirm(s.merchant_txn_id)}>I have paid</Button>
              </Space>
            )}
          </Space>
        </Card>
      ))}
    </Modal>
  );
}