"use client";

import {
  AccountBookOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  ReloadOutlined,
  WalletOutlined,
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
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
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
import BranchScopeNotice from "@/components/admin/billing/BranchScopeNotice";
import {
  EmptyState,
  PAYMENT_METHODS,
  StatusTag,
  apiError,
  formatDate,
  formatDateTime,
  formatRs,
  methodLabel,
  unwrap,
} from "@/components/admin/billing/financeKit";
import { formatMerchantLabel, marketplaceLabel } from "@/lib/merchantLabel";
import { listMarketplaces } from "@/services/admin/adminMarketplaceService";
import { getMerchants } from "@/services/merchant/merchantService";
import { usePermissions } from "@/hooks/usePermission";

const { Text, Title, Paragraph } = Typography;

const OPEN = ["pending", "processing", "approved"];
const DONE = ["paid", "settled"];

const STATUS_FILTERS = [
  { value: "pending,processing,approved", label: "To pay" },
  { value: "settled,paid", label: "Paid" },
  { value: "", label: "All" },
];

export default function SettlementsPage() {
  const { can } = usePermissions();
  const [tab, setTab] = useState("payouts");

  const [marketplaceId, setMarketplaceId] = useState(null);
  const [merchantId, setMerchantId] = useState(null);
  const [marketplaces, setMarketplaces] = useState([]);
  const [merchantOptions, setMerchantOptions] = useState([]);

  // payouts (merchant settlements)
  const [status, setStatus] = useState("pending,processing,approved");
  const [range, setRange] = useState(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [settlements, setSettlements] = useState([]);
  const [settlementTotal, setSettlementTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loadingList, setLoadingList] = useState(false);

  // cash to deposit
  const [pendingDeposit, setPendingDeposit] = useState([]);
  const [counts, setCounts] = useState(null);
  const [hint, setHint] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingCash, setLoadingCash] = useState(false);
  const [depositing, setDepositing] = useState(false);

  const [detail, setDetail] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [hamro, setHamro] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      listMarketplaces().catch(() => []),
      getMerchants({ per_page: 200 }).catch(() => ({ list: [] })),
    ]).then(([mps, merchants]) => {
      setMarketplaces(Array.isArray(mps) ? mps : []);
      setMerchantOptions(Array.isArray(merchants?.list) ? merchants.list : []);
    });
  }, []);

  const scope = useMemo(
    () => ({ marketplace_id: marketplaceId || undefined, merchant_id: merchantId || undefined }),
    [marketplaceId, merchantId]
  );

  const loadSettlements = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await api.get("/admin/settlements", {
        params: {
          ...scope,
          status: status || undefined,
          from: range?.[0] ? range[0].format("YYYY-MM-DD") : undefined,
          to: range?.[1] ? range[1].format("YYYY-MM-DD") : undefined,
          search: search || undefined,
          page,
          per_page: 20,
        },
      });
      const d = unwrap(r);
      setSettlements(Array.isArray(d?.data) ? d.data : []);
      setSettlementTotal(Number(d?.total || 0));
      setSummary(d?.summary || null);
    } catch (e) {
      message.error(apiError(e, "Could not load settlements"));
    } finally {
      setLoadingList(false);
    }
  }, [scope, status, range, search, page]);

  const loadCash = useCallback(async () => {
    setLoadingCash(true);
    try {
      const r = await api.get("/admin/settlements/pending-cash", { params: { ...scope, per_page: 100 } });
      const d = unwrap(r);
      setPendingDeposit(Array.isArray(d?.pending_deposit) ? d.pending_deposit : []);
      setCounts(d?.counts || null);
      setHint(d?.hint || "");
      setSelectedIds([]);
    } catch (e) {
      message.error(apiError(e, "Could not load cash awaiting deposit"));
    } finally {
      setLoadingCash(false);
    }
  }, [scope]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  useEffect(() => {
    loadCash();
  }, [loadCash]);

  useEffect(() => {
    setPage(1);
  }, [scope, status, range, search]);

  const refreshAll = () => {
    loadSettlements();
    loadCash();
  };

  const cashTotal = useMemo(
    () => pendingDeposit.reduce((a, r) => a + Number(r.collected_amount || 0), 0),
    [pendingDeposit]
  );
  const selectedAmount = useMemo(
    () =>
      pendingDeposit
        .filter((r) => r.pod_record_id && selectedIds.includes(r.pod_record_id))
        .reduce((a, r) => a + Number(r.collected_amount || 0), 0),
    [pendingDeposit, selectedIds]
  );

  async function depositSelected() {
    setDepositing(true);
    try {
      await api.post("/admin/pod/deposit", {
        pod_record_ids: selectedIds,
        remarks: "Branch deposit from settlements console",
      });
      message.success(`Deposited ${formatRs(selectedAmount)}. Those shipments are now ready to settle.`);
      refreshAll();
    } catch (e) {
      message.error(apiError(e, "Deposit failed"));
    } finally {
      setDepositing(false);
    }
  }

  const openDetail = useCallback(async (id) => {
    setDetail({ id, data: null });
    try {
      const r = await api.get(`/admin/settlements/${id}`);
      setDetail({ id, data: unwrap(r) });
    } catch (e) {
      message.error(apiError(e, "Could not open settlement"));
      setDetail(null);
    }
  }, []);

  async function startHamroPay(s) {
    try {
      const r = await api.post(`/admin/settlements/${s.id}/pay-hamropay`, {});
      setHamro({ settlement: s, session: unwrap(r) });
    } catch (e) {
      message.error(apiError(e, "HamroPay failed. The store may need HamroPay KYB first."));
    }
  }

  async function confirmHamroPay() {
    try {
      const r = await api.post(`/admin/settlements/${hamro.settlement.id}/confirm-hamropay`, {
        merchant_txn_id: hamro.session?.merchant_txn_id,
      });
      message.success(r?.data?.message || "Payment confirmed");
      setHamro(null);
      refreshAll();
    } catch (e) {
      message.error(apiError(e, "Not confirmed yet"));
    }
  }

  function rowMenu(s) {
    const open = OPEN.includes(String(s.status));
    return [
      { key: "view", label: "View details", onClick: () => openDetail(s.id) },
      open && can("settlements.pay_hamropay")
        ? { key: "hamro", icon: <WalletOutlined />, label: "Pay via HamroPay", onClick: () => startHamroPay(s) }
        : null,
      open && can("settlements.mark_paid")
        ? { key: "paid", icon: <CheckCircleOutlined />, label: "Record manual payment…", onClick: () => setPayTarget(s) }
        : null,
    ].filter(Boolean);
  }

  const merchantSelectOptions = useMemo(
    () => merchantOptions.map((m) => ({ value: m.id, label: formatMerchantLabel(m) })),
    [merchantOptions]
  );

  const settlementColumns = [
    {
      title: "Settlement",
      dataIndex: "settlement_number",
      render: (v, s) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => openDetail(s.id)} style={{ fontWeight: 600 }}>
            {v}
          </a>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Created {formatDate(s.created_at)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Store",
      key: "store",
      render: (_, s) => (
        <Space direction="vertical" size={0}>
          <span>{formatMerchantLabel(s)}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {marketplaceLabel(s)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Deliveries",
      key: "deliveries",
      width: 90,
      align: "right",
      render: (_, s) => s.delivery_count ?? (Array.isArray(s.items) ? s.items.length : "-"),
    },
    {
      title: "Cash path",
      dataIndex: "cash_path",
      render: (v) =>
        v === "on_collection" ? <Tag color="gold">Before deposit</Tag> : <Tag color="blue">After deposit</Tag>,
    },
    {
      title: "Payable to store",
      dataIndex: "final_payable_amount",
      align: "right",
      render: (v) => <Text strong>{formatRs(v)}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (v, s) => (
        <Space direction="vertical" size={0}>
          <StatusTag status={v} label={DONE.includes(String(v)) ? "Paid to store" : OPEN.includes(String(v)) ? "To pay" : undefined} />
          {s.settled_at ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDate(s.settled_at)} · {methodLabel(s.payment_method)}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      width: 170,
      render: (_, s) => (
        <Space size={4}>
          {OPEN.includes(String(s.status)) && can("settlements.mark_paid") ? (
            <Button size="small" type="primary" onClick={() => setPayTarget(s)}>
              Pay store
            </Button>
          ) : (
            <Button size="small" onClick={() => openDetail(s.id)}>
              View
            </Button>
          )}
          <Dropdown menu={{ items: rowMenu(s) }} trigger={["click"]}>
            <Button size="small" icon={<MoreOutlined />} aria-label="More actions" />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const filtersActive = marketplaceId || merchantId;

  return (
    <>
      <AdminPageHeader
        title="Settlements"
        subtitle="Collect POD cash from riders, deposit it, then pay each store its full POD cash."
        icon={<AccountBookOutlined />}
        breadcrumb={[{ title: "Finance" }, { title: "Settlements" }]}
        actions={
          <Space size={8}>
            {can("settlements.create") ? (
              <Button size="small" onClick={() => setGenerateOpen(true)}>
                Generate settlement
              </Button>
            ) : null}
            <Button size="small" icon={<ReloadOutlined />} onClick={refreshAll} loading={loadingList || loadingCash}>
              Refresh
            </Button>
          </Space>
        }
      />

      <BranchScopeNotice style={{ margin: "8px 0" }} />

      <StatCardGrid>
        <StatCard
          label="Cash to deposit"
          value={formatRs(cashTotal)}
          hint={`${counts?.awaiting_branch_deposit ?? pendingDeposit.length} POD collections with riders / branch`}
          variant="warning"
          icon={<BankOutlined />}
        />
        <StatCard
          label="To pay stores"
          value={formatRs(summary?.pending_amount ?? 0)}
          hint={`${summary?.pending_count ?? 0} settlements${counts?.ready_to_settle ? ` · ${counts.ready_to_settle} shipments ready to settle` : ""}`}
          variant="accent"
          icon={<ClockCircleOutlined />}
        />
        <StatCard
          label="Paid this month"
          value={formatRs(summary?.paid_this_month_amount ?? 0)}
          hint={`${summary?.paid_this_month_count ?? 0} settlements since ${formatDate(summary?.since)}`}
          variant="success"
          icon={<CheckCircleOutlined />}
        />
        <StatCard
          label="Paid all time"
          value={formatRs(summary?.paid_amount ?? 0)}
          hint={`${summary?.paid_count ?? 0} settlements`}
          variant="primary"
          icon={<AccountBookOutlined />}
        />
      </StatCardGrid>

      <Card size="small" style={{ margin: "12px 0" }} styles={{ body: { padding: "8px 12px" } }}>
        <Space wrap size={8}>
          <Select
            size="small"
            allowClear
            placeholder="All marketplaces"
            style={{ minWidth: 200 }}
            value={marketplaceId}
            onChange={(v) => setMarketplaceId(v ?? null)}
            options={marketplaces.map((m) => ({ value: m.id, label: m.name || m.code || `#${m.id}` }))}
          />
          <Select
            size="small"
            allowClear
            showSearch
            placeholder="All stores"
            style={{ minWidth: 240 }}
            value={merchantId}
            optionFilterProp="label"
            onChange={(v) => setMerchantId(v ?? null)}
            options={merchantSelectOptions}
          />
          {filtersActive ? (
            <Button
              size="small"
              type="link"
              onClick={() => {
                setMarketplaceId(null);
                setMerchantId(null);
              }}
            >
              Clear
            </Button>
          ) : null}
          <Text type="secondary" style={{ fontSize: 12 }}>
            POD cash is paid to stores in full. Delivery fees are billed separately on{" "}
            <Link href="/admin/invoices">Invoices</Link> and <Link href="/admin/marketplace-bills">Marketplace bills</Link>; HQ
            commission is on <Link href="/admin/hq-commissions">HQ commissions</Link>.
          </Text>
        </Space>
      </Card>

      <Card size="small" styles={{ body: { paddingTop: 0 } }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: "payouts",
              label: (
                <Badge count={summary?.pending_count || 0} size="small" offset={[8, -2]} color="#1677ff">
                  Payouts to stores
                </Badge>
              ),
              children: (
                <>
                  <Space wrap size={8} style={{ marginBottom: 8 }}>
                    <Radio.Group
                      size="small"
                      optionType="button"
                      buttonStyle="solid"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      options={STATUS_FILTERS}
                    />
                    <DatePicker.RangePicker size="small" value={range} onChange={setRange} allowEmpty={[true, true]} />
                    <Input.Search
                      size="small"
                      allowClear
                      placeholder="Settlement no, store or tracking"
                      style={{ width: 260 }}
                      value={searchDraft}
                      onChange={(e) => {
                        setSearchDraft(e.target.value);
                        if (!e.target.value) setSearch("");
                      }}
                      onSearch={(v) => setSearch(v.trim())}
                    />
                  </Space>
                  <Table
                    size="small"
                    rowKey="id"
                    loading={loadingList}
                    dataSource={settlements}
                    columns={settlementColumns}
                    scroll={{ x: 900 }}
                    locale={{
                      emptyText: (
                        <EmptyState
                          title={status.startsWith("pending") ? "No store payouts waiting" : "No settlements match"}
                          hint="Settlements are created after the branch deposits the POD cash collected by riders."
                        />
                      ),
                    }}
                    pagination={{
                      current: page,
                      pageSize: 20,
                      total: settlementTotal,
                      size: "small",
                      showSizeChanger: false,
                      onChange: setPage,
                    }}
                  />
                </>
              ),
            },
            {
              key: "cash",
              label: (
                <Badge count={pendingDeposit.length} size="small" offset={[8, -2]} color="#fa8c16">
                  Cash to deposit
                </Badge>
              ),
              children: (
                <>
                  {selectedIds.length ? (
                    <Alert
                      type="warning"
                      showIcon
                      style={{ marginBottom: 8 }}
                      message={`${selectedIds.length} selected · ${formatRs(selectedAmount)}`}
                      action={
                        <Button size="small" type="primary" loading={depositing} onClick={depositSelected}>
                          Deposit selected
                        </Button>
                      }
                    />
                  ) : (
                    <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                      Tick the POD cash your branch has received from riders and deposit it. Deposited cash becomes ready to settle with the store.
                    </Paragraph>
                  )}
                  <Table
                    size="small"
                    rowKey={(r) => r.pod_record_id || r.id}
                    loading={loadingCash}
                    dataSource={pendingDeposit}
                    rowSelection={
                      can("pod.deposit")
                        ? {
                            selectedRowKeys: selectedIds,
                            onChange: setSelectedIds,
                            getCheckboxProps: (r) => ({ disabled: !r.can_deposit || !r.pod_record_id }),
                          }
                        : undefined
                    }
                    pagination={{ pageSize: 20, size: "small" }}
                    locale={{ emptyText: <EmptyState title="No cash waiting" hint="All collected POD cash has been deposited." /> }}
                    columns={[
                      { title: "Tracking", render: (_, r) => r.tracking_number || r.shipment_id },
                      { title: "Store", render: (_, r) => formatMerchantLabel(r) },
                      { title: "Marketplace", render: (_, r) => marketplaceLabel(r) },
                      { title: "Rider", dataIndex: "collected_by", render: (v) => v || "-" },
                      { title: "POD cash", dataIndex: "collected_amount", align: "right", render: (v) => formatRs(v) },
                      {
                        title: "Status",
                        dataIndex: "status",
                        render: (v, r) => <Tag color={r.can_deposit ? "orange" : "red"}>{String(v || "-").replace(/_/g, " ")}</Tag>,
                      },
                    ]}
                  />
                  {hint ? (
                    <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                      {hint}
                    </Text>
                  ) : null}
                </>
              ),
            },
          ]}
        />
      </Card>

      <SettlementDrawer
        detail={detail}
        onClose={() => setDetail(null)}
        onPay={(s) => setPayTarget(s)}
        onHamro={(s) => startHamroPay(s)}
        can={can}
      />

      <SettlementPaidModal
        settlement={payTarget}
        onClose={() => setPayTarget(null)}
        onDone={() => {
          const id = payTarget?.id;
          setPayTarget(null);
          refreshAll();
          if (detail?.id === id) openDetail(id);
        }}
      />

      <Modal
        open={Boolean(hamro)}
        title="HamroPay payout created"
        onCancel={() => setHamro(null)}
        footer={
          <Space>
            <Button onClick={() => setHamro(null)}>Close</Button>
            <Button type="primary" onClick={confirmHamroPay} disabled={!hamro?.session?.merchant_txn_id}>
              Check payment status
            </Button>
          </Space>
        }
      >
        {hamro ? (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Settlement">{hamro.settlement.settlement_number}</Descriptions.Item>
            <Descriptions.Item label="Store">{formatMerchantLabel(hamro.settlement)}</Descriptions.Item>
            <Descriptions.Item label="Amount">{formatRs(hamro.settlement.final_payable_amount)}</Descriptions.Item>
            <Descriptions.Item label="Transaction id">
              <Text copyable>{hamro.session?.merchant_txn_id || "-"}</Text>
            </Descriptions.Item>
            {hamro.session?.gateway_url ? (
              <Descriptions.Item label="Gateway">
                <Text copyable>{hamro.session.gateway_url}</Text>
              </Descriptions.Item>
            ) : null}
          </Descriptions>
        ) : null}
      </Modal>

      <GenerateSettlementModal
        open={generateOpen}
        merchantId={merchantId}
        merchantOptions={merchantSelectOptions}
        onClose={() => setGenerateOpen(false)}
        onDone={() => {
          setGenerateOpen(false);
          refreshAll();
        }}
      />
    </>
  );
}

function SettlementDrawer({ detail, onClose, onPay, onHamro, can }) {
  const s = detail?.data;
  const items = Array.isArray(s?.items) ? s.items : [];
  const open = s && OPEN.includes(String(s.status));
  return (
    <Drawer
      open={Boolean(detail)}
      onClose={onClose}
      width={760}
      title={s?.settlement_number || "Settlement"}
      extra={s ? <StatusTag status={s.status} /> : null}
      destroyOnClose
    >
      {!s ? (
        <Skeleton active />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }} wrap>
            <div>
              <Text type="secondary">Payable to store</Text>
              <Title level={3} style={{ margin: 0 }}>
                {formatRs(s.final_payable_amount)}
              </Title>
            </div>
            {open ? (
              <Space>
                {can("settlements.pay_hamropay") ? <Button onClick={() => onHamro(s)}>Pay via HamroPay</Button> : null}
                {can("settlements.mark_paid") ? (
                  <Button type="primary" onClick={() => onPay(s)}>
                    Record payment
                  </Button>
                ) : null}
              </Space>
            ) : null}
          </Space>
          <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Store">{formatMerchantLabel(s)}</Descriptions.Item>
            <Descriptions.Item label="Marketplace">{marketplaceLabel(s)}</Descriptions.Item>
            <Descriptions.Item label="Period">
              {s.period_from || s.period_to ? `${formatDate(s.period_from)} – ${formatDate(s.period_to)}` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Cash path">{s.cash_path === "on_collection" ? "Before deposit" : "After deposit"}</Descriptions.Item>
            <Descriptions.Item label="POD cash collected">{formatRs(s.total_pod_collected)}</Descriptions.Item>
            <Descriptions.Item label="Adjustments">{formatRs(s.adjustments)}</Descriptions.Item>
            <Descriptions.Item label="Created">{formatDateTime(s.created_at)}</Descriptions.Item>
            <Descriptions.Item label="Deliveries">{items.length}</Descriptions.Item>
            {DONE.includes(String(s.status)) ? (
              <>
                <Descriptions.Item label="Paid">{formatDateTime(s.settled_at)}</Descriptions.Item>
                <Descriptions.Item label="Method">{methodLabel(s.payment_method)}</Descriptions.Item>
                <Descriptions.Item label="Reference" span={2}>
                  <Text copyable={Boolean(s.bank_reference_number)}>{s.bank_reference_number || "-"}</Text>
                </Descriptions.Item>
              </>
            ) : null}
          </Descriptions>
          <Card size="small" title={`Shipments (${items.length})`} styles={{ body: { padding: 0 } }}>
            <Table
              size="small"
              rowKey="id"
              dataSource={items}
              pagination={items.length > 15 ? { pageSize: 15, size: "small" } : false}
              columns={[
                { title: "Tracking", key: "t", render: (_, r) => r.shipment?.tracking_number || `#${r.shipment_id}` },
                { title: "Delivered", key: "d", render: (_, r) => formatDate(r.shipment?.delivered_at) },
                { title: "POD cash", dataIndex: "pod_amount", align: "right", render: (v) => formatRs(v) },
                { title: "Net to store", dataIndex: "net_amount", align: "right", render: (v) => formatRs(v) },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Total payable</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <Text strong>{formatRs(s.final_payable_amount)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </Space>
      )}
    </Drawer>
  );
}

function SettlementPaidModal({ settlement, onClose, onDone }) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settlement) form.setFieldsValue({ payment_method: "bank_transfer", bank_reference_number: "" });
  }, [settlement, form]);

  return (
    <Modal
      open={Boolean(settlement)}
      title={settlement ? `Pay ${formatMerchantLabel(settlement)}` : ""}
      okText="Mark paid to store"
      confirmLoading={busy}
      onCancel={onClose}
      destroyOnClose
      onOk={async () => {
        const v = await form.validateFields();
        setBusy(true);
        try {
          const r = await api.post(`/admin/settlements/${settlement.id}/mark-paid`, v);
          message.success(r?.data?.message || "Settlement marked paid");
          onDone();
        } catch (e) {
          message.error(apiError(e, "Mark paid failed"));
        } finally {
          setBusy(false);
        }
      }}
    >
      {settlement ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={`${settlement.settlement_number}: pay ${formatRs(settlement.final_payable_amount)} to the store, then record it here.`}
        />
      ) : null}
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="payment_method" label="Method" rules={[{ required: true }]}>
          <Select options={PAYMENT_METHODS} />
        </Form.Item>
        <Form.Item
          name="bank_reference_number"
          label="Reference"
          rules={[{ required: true, message: "Enter the bank / wallet reference" }]}
        >
          <Input placeholder="Transaction id" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function GenerateSettlementModal({ open, merchantId, merchantOptions, onClose, onDone }) {
  const [form] = Form.useForm();
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ cash_path: "after_deposit", adjustments: 0, period: null, merchant_id: merchantId || undefined });
      setPreview(null);
    }
  }, [open, merchantId, form]);

  function periodParams(v) {
    return {
      period_from: v.period?.[0] ? dayjs(v.period[0]).format("YYYY-MM-DD") : undefined,
      period_to: v.period?.[1] ? dayjs(v.period[1]).format("YYYY-MM-DD") : undefined,
    };
  }

  async function runPreview() {
    try {
      const v = await form.validateFields();
      setBusy("preview");
      const r = await api.get("/admin/settlements/preview", {
        params: { merchant_id: v.merchant_id, cash_path: v.cash_path, adjustments: v.adjustments || 0, ...periodParams(v) },
      });
      setPreview(unwrap(r));
    } catch (e) {
      if (!e?.errorFields) message.error(apiError(e, "Preview failed"));
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    try {
      const v = await form.validateFields();
      setBusy("create");
      await api.post("/admin/settlements", {
        merchant_id: v.merchant_id,
        adjustments: v.adjustments || 0,
        cash_path: v.cash_path,
        ...periodParams(v),
      });
      message.success("Settlement created. Pay the store from “Payouts to stores”.");
      onDone();
    } catch (e) {
      if (!e?.errorFields) message.error(apiError(e, "Could not create settlement"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      title="Generate store settlement"
      open={open}
      onCancel={onClose}
      width={640}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="prev" loading={busy === "preview"} onClick={runPreview}>
          Preview
        </Button>,
        <Button key="ok" type="primary" loading={busy === "create"} onClick={create}>
          Generate
        </Button>,
      ]}
    >
      <Paragraph type="secondary">
        Settlements are normally created automatically after deposit. Use this to catch up on a store. The store gets its full POD cash;
        delivery fees are billed separately.
      </Paragraph>
      <Form form={form} layout="vertical" requiredMark={false}>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item name="merchant_id" label="Store" rules={[{ required: true, message: "Pick a store" }]}>
              <Select showSearch optionFilterProp="label" placeholder="Select store" options={merchantOptions} />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="adjustments" label="Adjustments (Rs)">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="cash_path" label="Which cash">
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="after_deposit">Cash already deposited by the branch (recommended)</Radio>
                  <Radio value="on_collection">Cash collected by riders, not yet deposited</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="period" label="Period (optional)">
              <DatePicker.RangePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      {preview ? (
        <Alert
          type="success"
          showIcon
          message={`${preview.merchant_name ? `${formatMerchantLabel(preview)}: ` : ""}${preview.shipment_count ?? 0} shipments · payable ${formatRs(
            preview.final_payable_amount ?? preview.total_pod_collected ?? 0
          )}`}
        />
      ) : null}
    </Modal>
  );
}
