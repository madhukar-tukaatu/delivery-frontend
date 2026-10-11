"use client";

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  PercentageOutlined,
  ReloadOutlined,
  SettingOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import StatCard, { StatCardGrid } from "@/components/admin/ui/StatCard";
import BranchScopeNotice, { useIsFinanceHq } from "@/components/admin/billing/BranchScopeNotice";
import {
  EmptyState,
  StatusTag,
  apiError,
  formatDate,
  formatRs,
  unwrap,
} from "@/components/admin/billing/financeKit";
import { usePermissions } from "@/hooks/usePermission";

const { Text, Paragraph } = Typography;

export default function HqCommissionsPage() {
  const isHq = useIsFinanceHq();
  const { can, branchId: userBranchId } = usePermissions();
  const [tab, setTab] = useState("overview");
  const [payRef, setPayRef] = useState("");
  const [summary, setSummary] = useState(null);
  const [branchId, setBranchId] = useState(null);

  const [bills, setBills] = useState([]);
  const [billTotal, setBillTotal] = useState(0);
  const [billPage, setBillPage] = useState(1);
  const [billStatus, setBillStatus] = useState("unpaid");

  const [settlements, setSettlements] = useState([]);
  const [settlementTotal, setSettlementTotal] = useState(0);
  const [settlementPage, setSettlementPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [hamro, setHamro] = useState(null);

  const loadSummary = useCallback(async () => {
    try {
      const r = await api.get("/admin/hq-commissions/summary");
      setSummary(unwrap(r));
    } catch (e) {
      message.error(apiError(e, "Could not load HQ commission summary"));
    }
  }, []);

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/hq-commissions/bills", {
        params: { per_page: 20, page: billPage, status: billStatus || undefined, branch_id: branchId || undefined },
      });
      const d = unwrap(r);
      setBills(Array.isArray(d?.data) ? d.data : []);
      setBillTotal(Number(d?.total || 0));
    } catch (e) {
      message.error(apiError(e, "Could not load commission bills"));
    } finally {
      setLoading(false);
    }
  }, [billPage, billStatus, branchId]);

  const loadSettlements = useCallback(async () => {
    try {
      const r = await api.get("/admin/hq-commissions/settlements", {
        params: { per_page: 20, page: settlementPage, branch_id: branchId || undefined },
      });
      const d = unwrap(r);
      setSettlements(Array.isArray(d?.data) ? d.data : []);
      setSettlementTotal(Number(d?.total || 0));
    } catch (e) {
      message.error(apiError(e, "Could not load commission settlements"));
    }
  }, [settlementPage, branchId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);
  useEffect(() => {
    loadBills();
  }, [loadBills]);
  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);
  useEffect(() => {
    setBillPage(1);
    setSettlementPage(1);
  }, [branchId, billStatus]);

  const refreshAll = () => {
    loadSummary();
    loadBills();
    loadSettlements();
  };

  async function settleBranch(id, name) {
    Modal.confirm({
      title: `Create a payment batch for ${name || "this branch"}?`,
      content: "All unpaid HQ commission bills of the branch are grouped into one settlement that the branch pays to Tukaatu Express.",
      okText: "Create batch",
      onOk: async () => {
        try {
          const r = await api.post("/admin/hq-commissions/settlements", { branch_id: id });
          message.success(r?.data?.message || "Settlement batch created");
          setTab("settlements");
          refreshAll();
        } catch (e) {
          message.error(apiError(e, "Could not create settlement"));
        }
      },
    });
  }

  async function startHamro(s) {
    try {
      const r = await api.post(`/admin/hq-commissions/settlements/${s.id}/pay-hamropay`, {});
      setHamro({ settlement: s, session: unwrap(r) });
      refreshAll();
    } catch (e) {
      message.error(apiError(e, "HamroPay failed. Branch and company HamroPay accounts must be saved."));
    }
  }

  const byBranch = Array.isArray(summary?.by_branch) ? summary.by_branch : [];
  const branchOptions = useMemo(
    () => byBranch.filter((b) => b.branch_id).map((b) => ({ value: b.branch_id, label: b.branch_name })),
    [byBranch]
  );
  const branchName = (row) => row.branch?.name || byBranch.find((b) => b.branch_id === row.branch_id)?.branch_name || (row.branch_id ? `#${row.branch_id}` : "-");

  const tabs = [
    isHq
      ? {
          key: "overview",
          label: "By branch",
          children: (
            <Table
              size="small"
              rowKey={(r) => r.branch_id ?? "none"}
              dataSource={byBranch}
              pagination={false}
              locale={{ emptyText: <EmptyState title="No commission yet" hint="Bills appear after deliveries are completed." /> }}
              columns={[
                { title: "Branch", dataIndex: "branch_name" },
                { title: "Rate", dataIndex: "hq_percent", align: "right", render: (v) => (v != null ? `${v}%` : "-") },
                {
                  title: "Owes HQ",
                  dataIndex: "unpaid_amount",
                  align: "right",
                  render: (v, r) => (
                    <Space direction="vertical" size={0} style={{ alignItems: "flex-end" }}>
                      <Text strong type={v > 0 ? "warning" : undefined}>
                        {formatRs(v)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {r.unpaid_count} bills
                      </Text>
                    </Space>
                  ),
                },
                { title: "In payment", dataIndex: "processing_amount", align: "right", render: (v) => formatRs(v) },
                { title: "Paid this month", dataIndex: "paid_this_month_amount", align: "right", render: (v) => formatRs(v) },
                { title: "Paid all time", dataIndex: "paid_amount", align: "right", render: (v) => formatRs(v) },
                {
                  title: "",
                  key: "a",
                  align: "right",
                  render: (_, r) => (
                    <Space size={4}>
                      <Button
                        size="small"
                        onClick={() => {
                          setBranchId(r.branch_id);
                          setTab("bills");
                        }}
                      >
                        Bills
                      </Button>
                      {r.unpaid_count > 0 && can("hq_commissions.create") ? (
                        <Button size="small" type="primary" onClick={() => settleBranch(r.branch_id, r.branch_name)}>
                          Create batch
                        </Button>
                      ) : null}
                    </Space>
                  ),
                },
              ]}
              summary={(rows) =>
                rows.length > 1 ? (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <Text strong>All branches</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong>{formatRs(summary?.unpaid_amount)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      {formatRs(summary?.processing_amount)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      {formatRs(summary?.paid_this_month_amount)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      {formatRs(summary?.paid_amount)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} />
                  </Table.Summary.Row>
                ) : null
              }
            />
          ),
        }
      : null,
    {
      key: "bills",
      label: "Commission bills",
      children: (
        <>
          <Space wrap size={8} style={{ marginBottom: 8 }}>
            <Radio.Group
              size="small"
              optionType="button"
              buttonStyle="solid"
              value={billStatus}
              onChange={(e) => setBillStatus(e.target.value)}
              options={[
                { value: "unpaid", label: "Unpaid" },
                { value: "processing", label: "In payment" },
                { value: "paid", label: "Paid" },
                { value: "", label: "All" },
              ]}
            />
            {!isHq && summary?.unpaid_count > 0 && can("hq_commissions.create") ? (
              <Button size="small" type="primary" onClick={() => settleBranch(userBranchId, null)} disabled={!userBranchId}>
                Pay all unpaid ({formatRs(summary.unpaid_amount)})
              </Button>
            ) : null}
          </Space>
          <Table
            size="small"
            rowKey="id"
            loading={loading}
            dataSource={bills}
            scroll={{ x: 820 }}
            locale={{ emptyText: <EmptyState title="No bills" hint="Change the status filter." /> }}
            pagination={{ current: billPage, pageSize: 20, total: billTotal, size: "small", showSizeChanger: false, onChange: setBillPage }}
            columns={[
              {
                title: "Bill",
                dataIndex: "bill_number",
                render: (v, r) => (
                  <Space direction="vertical" size={0}>
                    <Text strong>{v}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(r.created_at)}
                    </Text>
                  </Space>
                ),
              },
              isHq ? { title: "Branch", key: "b", render: (_, r) => branchName(r) } : null,
              { title: "Shipment", key: "s", render: (_, r) => r.shipment?.tracking_number || (r.shipment_id ? `#${r.shipment_id}` : "-") },
              { title: "Branch share", dataIndex: "delivery_charge_base", align: "right", render: (v) => formatRs(v) },
              { title: "Rate", dataIndex: "commission_rate", align: "right", render: (v) => `${Number(v || 0)}%` },
              { title: "Commission", dataIndex: "commission_amount", align: "right", render: (v) => <Text strong>{formatRs(v)}</Text> },
              { title: "Status", dataIndex: "status", render: (v) => <StatusTag status={v} label={v === "processing" ? "In payment" : undefined} /> },
            ].filter(Boolean)}
          />
        </>
      ),
    },
    {
      key: "settlements",
      label: "Payments to HQ",
      children: (
        <Table
          size="small"
          rowKey="id"
          dataSource={settlements}
          scroll={{ x: 760 }}
          locale={{ emptyText: <EmptyState title="No payment batches" hint="Create a batch from a branch's unpaid bills." /> }}
          pagination={{
            current: settlementPage,
            pageSize: 20,
            total: settlementTotal,
            size: "small",
            showSizeChanger: false,
            onChange: setSettlementPage,
          }}
          columns={[
            {
              title: "Batch",
              dataIndex: "settlement_number",
              render: (v, r) => (
                <Space direction="vertical" size={0}>
                  <Text strong>{v}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatDate(r.created_at)} · {Array.isArray(r.bills) ? r.bills.length : 0} bills
                  </Text>
                </Space>
              ),
            },
            isHq ? { title: "Branch", key: "b", render: (_, r) => branchName(r) } : null,
            { title: "Payable to HQ", dataIndex: "final_payable_amount", align: "right", render: (v) => <Text strong>{formatRs(v)}</Text> },
            {
              title: "Status",
              dataIndex: "status",
              render: (v, r) => (
                <Space direction="vertical" size={0}>
                  <StatusTag status={v} />
                  {r.paid_at ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDate(r.paid_at)}
                      {r.payment_reference ? ` · ${r.payment_reference}` : ""}
                    </Text>
                  ) : null}
                </Space>
              ),
            },
            {
              title: "",
              key: "a",
              align: "right",
              render: (_, r) =>
                r.status !== "paid" ? (
                  <Space size={4}>
                    {can("hq_commissions.pay_hamropay") ? (
                      <Button size="small" icon={<WalletOutlined />} onClick={() => startHamro(r)}>
                        HamroPay
                      </Button>
                    ) : null}
                    {can("hq_commissions.mark_paid") ? (
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => {
                          setPayRef("");
                          setPayTarget(r);
                        }}
                      >
                        Mark paid
                      </Button>
                    ) : null}
                  </Space>
                ) : null,
            },
          ].filter(Boolean)}
        />
      ),
    },
    isHq
      ? {
          key: "settings",
          label: (
            <span>
              <SettingOutlined /> Rate settings
            </span>
          ),
          children: <RateSettings onSaved={refreshAll} />,
        }
      : null,
  ].filter(Boolean);

  const activeTab = tabs.find((t) => t.key === tab) ? tab : tabs[0].key;

  return (
    <>
      <AdminPageHeader
        title="HQ commissions"
        subtitle={`Each branch owes Tukaatu Express ${summary?.hq_percent ?? "…"}% of its share of every delivery charge.`}
        icon={<PercentageOutlined />}
        breadcrumb={[{ title: "Finance" }, { title: "HQ commissions" }]}
        actions={
          <Button size="small" icon={<ReloadOutlined />} onClick={refreshAll}>
            Refresh
          </Button>
        }
      />
      <BranchScopeNotice style={{ margin: "8px 0" }} />

      <StatCardGrid>
        <StatCard
          label={isHq ? "Branches owe HQ" : "Your branch owes HQ"}
          value={formatRs(summary?.unpaid_amount ?? 0)}
          hint={`${summary?.unpaid_count ?? 0} unpaid bills`}
          variant="warning"
          icon={<ClockCircleOutlined />}
        />
        <StatCard
          label="In payment"
          value={formatRs(summary?.processing_amount ?? 0)}
          hint={`${summary?.processing_count ?? 0} bills in a batch`}
          variant="accent"
          icon={<WalletOutlined />}
        />
        <StatCard
          label="Paid this month"
          value={formatRs(summary?.paid_this_month_amount ?? 0)}
          hint={`Earned this month: ${formatRs(summary?.this_month_amount ?? 0)}`}
          variant="success"
          icon={<CheckCircleOutlined />}
        />
        <StatCard
          label="Commission rate"
          value={summary?.hq_percent != null ? `${summary.hq_percent}%` : "-"}
          hint="of the branch's delivery-charge share"
          variant="primary"
          icon={<PercentageOutlined />}
        />
      </StatCardGrid>

      <Card size="small" style={{ marginTop: 12 }} styles={{ body: { paddingTop: 0 } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setTab}
          items={tabs}
          tabBarExtraContent={
            isHq && activeTab !== "settings" && activeTab !== "overview" ? (
              <Select
                size="small"
                allowClear
                placeholder="All branches"
                style={{ minWidth: 180 }}
                value={branchId}
                onChange={(v) => setBranchId(v ?? null)}
                options={branchOptions}
              />
            ) : null
          }
        />
        <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
          A transfer shipment creates one commission bill per branch that handled it. This is separate from store POD cash and delivery-fee
          invoices.
        </Paragraph>
      </Card>

      <Modal
        open={Boolean(payTarget)}
        title={payTarget ? `Mark ${payTarget.settlement_number} paid to HQ` : ""}
        okText="Mark paid"
        onCancel={() => setPayTarget(null)}
        destroyOnClose
        onOk={async () => {
          const ref = payRef.trim();
          try {
            const r = await api.post(`/admin/hq-commissions/settlements/${payTarget.id}/mark-paid`, {
              payment_reference: ref || undefined,
            });
            message.success(r?.data?.message || "Marked paid");
            setPayTarget(null);
            refreshAll();
          } catch (e) {
            message.error(apiError(e, "Mark paid failed"));
          }
        }}
      >
        {payTarget ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text>
              {branchName(payTarget)} pays {formatRs(payTarget.final_payable_amount)} to Tukaatu Express.
            </Text>
            <Input
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="Payment reference (bank / wallet transaction id)"
            />
          </Space>
        ) : null}
      </Modal>

      <Modal open={Boolean(hamro)} title="HamroPay session created" onCancel={() => setHamro(null)} footer={<Button onClick={() => setHamro(null)}>Close</Button>}>
        {hamro ? (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Batch">{hamro.settlement.settlement_number}</Descriptions.Item>
            <Descriptions.Item label="Amount">{formatRs(hamro.settlement.final_payable_amount)}</Descriptions.Item>
            {hamro.session?.merchant_txn_id ? (
              <Descriptions.Item label="Transaction id">
                <Text copyable>{hamro.session.merchant_txn_id}</Text>
              </Descriptions.Item>
            ) : null}
            {hamro.session?.gateway_url ? (
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

function RateSettings({ onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/admin/hq-commissions/settings")
      .then((r) => form.setFieldsValue({ hq_percent: unwrap(r)?.hq_percent ?? 5 }))
      .catch(() => {});
  }, [form]);

  return (
    <Space direction="vertical" style={{ maxWidth: 520 }}>
      <Alert
        type="info"
        showIcon
        message="Changing the rate affects new commission bills only. Existing bills keep the rate they were created with."
      />
      <Form
        form={form}
        layout="inline"
        onFinish={async (v) => {
          setSaving(true);
          try {
            await api.post("/admin/hq-commissions/settings", v);
            message.success("Commission rate saved");
            onSaved();
          } catch (e) {
            message.error(apiError(e, "Save failed"));
          } finally {
            setSaving(false);
          }
        }}
      >
        <Form.Item name="hq_percent" label="HQ % of delivery charge" rules={[{ required: true }]}>
          <InputNumber min={0} max={100} step={0.1} addonAfter="%" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          Save
        </Button>
      </Form>
    </Space>
  );
}
