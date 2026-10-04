"use client";

import {
  AccountBookOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import api from "@/lib/api";
import { formatMerchantLabel, marketplaceLabel } from "@/lib/merchantLabel";
import { ViewBillButton, deliveryCount } from "@/components/admin/billing/StoreBillPreview";
import { listMarketplaces } from "@/services/admin/adminMarketplaceService";
import { getMerchants } from "@/services/merchant/merchantService";

const { Text, Paragraph } = Typography;

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

export default function SettlementsPage() {
  const [pendingDeposit, setPendingDeposit] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [counts, setCounts] = useState(null);
  const [hint, setHint] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [settleOpen, setSettleOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form] = Form.useForm();
  const [marketplaceId, setMarketplaceId] = useState(null);
  const [merchantId, setMerchantId] = useState(null);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [marketplaces, setMarketplaces] = useState([]);
  const [merchantOptions, setMerchantOptions] = useState([]);
  const [digestSending, setDigestSending] = useState(null);
  const [digestHint, setDigestHint] = useState("");
  const [billSide, setBillSide] = useState(null);
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

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const listParams = {
        per_page: 50,
        marketplace_id: marketplaceId || undefined,
        merchant_id: merchantId || undefined,
        merchant: merchantSearch.trim() || undefined,
      };
      const pendingParams = {
        per_page: 100,
        marketplace_id: marketplaceId || undefined,
        merchant_id: merchantId || undefined,
        merchant: merchantSearch.trim() || undefined,
      };
      const invoiceParams = {
        type: "delivery_charges",
        per_page: 50,
        marketplace_id: marketplaceId || undefined,
        merchant_id: merchantId || undefined,
        merchant: merchantSearch.trim() || undefined,
      };

      const [pendingRes, settlementsRes, invoicesRes] = await Promise.all([
        api.get("/admin/settlements/pending-cash", { params: pendingParams }),
        api.get("/admin/settlements", { params: listParams }),
        api.get("/admin/invoices", { params: invoiceParams }),
      ]);

      const pending = unwrap(pendingRes);
      const settled = unwrap(settlementsRes);
      const billed = unwrap(invoicesRes);

      setPendingDeposit(pending?.pending_deposit || []);
      setCounts(pending?.counts || null);
      setHint(pending?.hint || "");
      setSettlements(settled?.data || settled || []);
      setInvoices(billed?.data || billed || []);
      setSelectedIds([]);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Could not load settlements / bills.";
      setLoadError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketplaceId, merchantId]);

  const depositableRows = useMemo(
    () => pendingDeposit.filter((row) => row.can_deposit && row.pod_record_id),
    [pendingDeposit]
  );

  const selectedAmount = useMemo(() => {
    return depositableRows
      .filter((row) => selectedIds.includes(row.pod_record_id))
      .reduce((sum, row) => sum + Number(row.collected_amount || 0), 0);
  }, [depositableRows, selectedIds]);

  async function depositSelected() {
    if (!selectedIds.length) {
      message.warning("Select at least one collected cash POD to deposit.");
      return;
    }
    try {
      await api.post("/admin/pod/deposit", {
        pod_record_ids: selectedIds,
        remarks: "Branch deposit from settlements console",
      });
      message.success("Cash deposited. POD settlement batch updated.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Deposit failed.");
    }
  }

  function openSettle() {
    form.setFieldsValue({
      cash_path: "after_deposit",
      adjustments: 0,
      period: null,
      merchant_id: merchantId || undefined,
    });
    setPreview(null);
    setSettleOpen(true);
  }

  function periodParams(values) {
    const range = values.period;
    return {
      period_from: range?.[0] ? dayjs(range[0]).format("YYYY-MM-DD") : undefined,
      period_to: range?.[1] ? dayjs(range[1]).format("YYYY-MM-DD") : undefined,
    };
  }

  async function runPreview() {
    try {
      const values = await form.validateFields([
        "merchant_id",
        "cash_path",
        "period",
        "adjustments",
      ]);
      setPreviewLoading(true);
      const res = await api.get("/admin/settlements/preview", {
        params: {
          merchant_id: values.merchant_id,
          cash_path: values.cash_path || "after_deposit",
          adjustments: values.adjustments || 0,
          ...periodParams(values),
        },
      });
      setPreview(unwrap(res));
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || "Preview failed.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function createSettlement() {
    try {
      const values = await form.validateFields();
      await api.post("/admin/settlements", {
        merchant_id: values.merchant_id,
        adjustments: values.adjustments || 0,
        cash_path: values.cash_path || "after_deposit",
        ...periodParams(values),
      });
      message.success("POD settlement generated (cash payable to merchant).");
      setSettleOpen(false);
      form.resetFields();
      setPreview(null);
      load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || "Settlement create failed.");
    }
  }

  async function markSettlementPaid(id) {
    try {
      await api.post(`/admin/settlements/${id}/mark-paid`, {});
      message.success("POD settlement marked paid to merchant.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Mark paid failed.");
    }
  }

  async function paySettlementHamroPay(id) {
    try {
      const res = await api.post(`/admin/settlements/${id}/pay-hamropay`, {});
      const data = unwrap(res);
      message.success("HamroPay session created. Complete checkout to pay the merchant.");
      if (data?.gateway_url && data?.checkout) {
        console.info("HamroPay checkout", data);
      }
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "HamroPay pay failed. Register merchant KYB first.");
    }
  }

  async function markInvoicePaid(id) {
    try {
      await api.post(`/admin/invoices/${id}/mark-paid`, {});
      message.success("Delivery bill marked paid by merchant.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Mark invoice paid failed.");
    }
  }

  async function sendDigest(period) {
    if (!merchantId) {
      setDigestHint("Pick a merchant first.");
      return;
    }
    setDigestHint("");
    setDigestSending(period);
    try {
      const res = await api.post("/admin/invoices/send-digest", {
        merchant_id: merchantId,
        period,
      });
      message.success(res?.data?.message || (period === "weekly" ? "Weekly digest queued" : "Daily digest queued"));
    } catch (e) {
      message.error(e?.response?.data?.message || "Send failed");
    } finally {
      setDigestSending(null);
    }
  }

  const visibleInvoices = useMemo(() => {
    if (!billSide) return invoices;
    return invoices.filter((row) => {
      const payer = String(row.payer_type || "merchant").toLowerCase();
      return billSide === "company" ? payer === "company" : payer !== "company";
    });
  }, [invoices, billSide]);

  const merchantSelectOptions = useMemo(
    () =>
      merchantOptions.map((m) => ({
        value: m.id,
        label: formatMerchantLabel(m),
      })),
    [merchantOptions]
  );

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Settlements"
        subtitle="POD deposits, merchant delivery bills, and settlement batches — filter by marketplace or store."
        icon={<AccountBookOutlined />}
        actions={
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
        }
      />

      <Alert
        type="info"
        showIcon
        banner
        message="POD cash is settled in full. Delivery fees are billed separately. HQ commission is on /admin/hq-commissions."
      />

      <Card size="small" title="Filters" styles={{ body: { padding: "8px 12px" } }}>
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
          <Input.Search
            size="small"
            allowClear
            placeholder="Search merchant name / STORE-id / #"
            style={{ width: 240 }}
            value={merchantSearch}
            onChange={(e) => setMerchantSearch(e.target.value)}
            onSearch={() => load()}
          />
          {(marketplaceId || merchantId || merchantSearch) && (
            <Button
              size="small"
              onClick={() => {
                setMarketplaceId(null);
                setMerchantId(null);
                setMerchantSearch("");
                setDigestHint("");
              }}
            >
              Clear filters
            </Button>
          )}
        </Space>
      </Card>

      {loadError ? (
        <Alert type="error" showIcon message="Load failed" description={loadError} />
      ) : null}

      {counts ? (
        <Space wrap>
          <Tag color="orange">
            Awaiting branch deposit: {counts.awaiting_branch_deposit}
          </Tag>
          <Tag color="blue">Ready to settle POD: {counts.ready_to_settle}</Tag>
          <Tag>POD settlement batches: {counts.settlements}</Tag>
        </Space>
      ) : null}

      <Card
        size="small"
        title="1. Branch deposit - cash POD from riders"
        styles={{ header: { background: "#fff7e6", minHeight: 40 }, body: { padding: 8 } }}
        extra={
          <Button size="small" type="primary" disabled={!selectedIds.length} onClick={depositSelected}>
            Deposit selected (Rs. {selectedAmount.toFixed(2)})
          </Button>
        }
        loading={loading}
      >
        <Table
          size="small"
          rowKey={(r) => r.pod_record_id || r.id}
          dataSource={pendingDeposit}
          locale={{
            emptyText: "No cash POD awaiting deposit.",
          }}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: setSelectedIds,
            getCheckboxProps: (r) => ({ disabled: !r.can_deposit }),
          }}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: "Tracking",
              render: (_, r) => r.tracking_number || r.shipment_id,
            },
            {
              title: "Merchant",
              key: "merchant",
              render: (_, r) => formatMerchantLabel(r),
            },
            {
              title: "Marketplace",
              key: "marketplace",
              render: (_, r) => marketplaceLabel(r),
            },
            { title: "Rider", dataIndex: "collected_by" },
            { title: "POD cash", dataIndex: "collected_amount" },
            {
              title: "Status",
              dataIndex: "status",
              render: (v, r) => (
                <Tag color={r.can_deposit ? "orange" : "red"}>{v}</Tag>
              ),
            },
          ]}
        />
        {hint ? (
          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            {hint}
          </Text>
        ) : null}
      </Card>

      <Card
        size="small"
        title="2. POD settlements - payable to merchant (full POD cash)"
        styles={{ header: { background: "#e6f4ff", minHeight: 40 }, body: { padding: 8 } }}
        extra={
          <Button size="small" onClick={openSettle}>
            Generate POD settlement (catch-up)
          </Button>
        }
        loading={loading}
      >
        <Table
          size="small"
          rowKey="id"
          dataSource={settlements}
          locale={{
            emptyText:
              "No POD settlements yet. They appear after branch deposit of cash POD.",
          }}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Number", dataIndex: "settlement_number" },
            {
              title: "Merchant",
              key: "merchant",
              render: (_, r) => formatMerchantLabel(r),
            },
            {
              title: "Marketplace",
              key: "marketplace",
              render: (_, r) => marketplaceLabel(r),
            },
            {
              title: "Deliveries",
              key: "deliveries",
              width: 90,
              render: (_, r) => r.delivery_count ?? (Array.isArray(r.items) ? r.items.length : "-"),
            },
            {
              title: "Path",
              dataIndex: "cash_path",
              render: (v) =>
                v === "on_collection" ? (
                  <Tag color="gold">Before deposit</Tag>
                ) : (
                  <Tag color="blue">After deposit</Tag>
                ),
            },
            { title: "POD cash (payable)", dataIndex: "total_pod_collected" },
            { title: "Payable to merchant", dataIndex: "final_payable_amount" },
            {
              title: "Status",
              dataIndex: "status",
              render: (v) => <Tag>{v}</Tag>,
            },
            {
              title: "Action",
              render: (_, r) => (
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    disabled={["paid", "settled"].includes(String(r.status))}
                    onClick={() => paySettlementHamroPay(r.id)}
                  >
                    Pay via HamroPay
                  </Button>
                  <Button
                    size="small"
                    disabled={["paid", "settled"].includes(String(r.status))}
                    onClick={() => markSettlementPaid(r.id)}
                  >
                    Mark paid (manual)
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Card
        size="small"
        title="3. Delivery charge bills - merchant owes platform (checkout fees)"
        styles={{ header: { background: "#f6ffed", minHeight: 40 }, body: { padding: 8 } }}
        extra={
          <Space size={8}>
            <Select
              size="small"
              allowClear
              placeholder="Bill side"
              style={{ width: 150 }}
              value={billSide}
              onChange={(v) => setBillSide(v ?? null)}
              options={[
                { value: "merchant", label: "Merchant store" },
                { value: "company", label: "Marketplace" },
              ]}
            />
            <Button
              size="small"
              loading={digestSending === "daily"}
              disabled={digestSending !== null || billSide === "company"}
              onClick={() => sendDigest("daily")}
            >
              Send daily bills
            </Button>
            <Button
              size="small"
              loading={digestSending === "weekly"}
              disabled={digestSending !== null || billSide === "company"}
              onClick={() => sendDigest("weekly")}
            >
              Send weekly bills
            </Button>
          </Space>
        }
        loading={loading}
      >
        {digestHint ? (
          <Alert type="warning" showIcon message={digestHint} style={{ marginBottom: 8 }} />
        ) : null}
        <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
          Merchant store bills and marketplace bills are separate. Paid bills stay listed and are not emailed.
          Daily digests also run automatically at 6:17 AM; weekly is manual unless you run it.
        </Text>
        <Table
          size="small"
          rowKey="id"
          dataSource={visibleInvoices}
          locale={{
            emptyText:
              "No delivery bills yet. They auto-create after successful delivery when the merchant owes delivery fees.",
          }}
          pagination={{ pageSize: 10 }}
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
            {
              title: "Marketplace",
              key: "marketplace",
              render: (_, r) => marketplaceLabel(r),
            },
            {
              title: "Side",
              dataIndex: "payer_type",
              width: 110,
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
              render: (_, r) => deliveryCount(r),
            },
            { title: "Date", dataIndex: "invoice_date" },
            { title: "Subtotal", dataIndex: "subtotal" },
            { title: "Total due", dataIndex: "total_amount" },
            {
              title: "Status",
              dataIndex: "status",
              render: (v) => (
                <Tag color={v === "paid" ? "green" : "volcano"}>{v}</Tag>
              ),
            },
            {
              title: "Action",
              render: (_, r) => (
                <Space size={4} wrap>
                  <ViewBillButton invoice={r} />
                  <Button
                    size="small"
                    disabled={String(r.status) === "paid"}
                    onClick={() => markInvoicePaid(r.id)}
                  >
                    Mark bill paid
                  </Button>
                </Space>
              ),
            },
          ]}
          expandable={{
            expandedRowRender: (r) => (
              <Table
                size="small"
                pagination={false}
                rowKey="id"
                dataSource={r.items || []}
                columns={[
                  { title: "Description", dataIndex: "description" },
                  { title: "Qty", dataIndex: "quantity" },
                  { title: "Unit", dataIndex: "unit_price" },
                  { title: "Total", dataIndex: "total" },
                ]}
              />
            ),
          }}
        />
      </Card>

      <Modal
        title="Generate POD settlement (catch-up)"
        open={settleOpen}
        onCancel={() => setSettleOpen(false)}
        width={720}
        destroyOnClose
        footer={[
          <Button key="prev" loading={previewLoading} onClick={runPreview}>
            Preview
          </Button>,
          <Button key="cancel" onClick={() => setSettleOpen(false)}>
            Cancel
          </Button>,
          <Button key="ok" type="primary" onClick={createSettlement}>
            Generate
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ cash_path: "after_deposit", adjustments: 0 }}
        >
          <Form.Item name="cash_path" label="Cash POD path" rules={[{ required: true }]}>
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="after_deposit">After branch deposit (preferred)</Radio>
                <Radio value="on_collection">
                  From collected cash (optional, before deposit)
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          <Alert
            style={{ marginBottom: 16 }}
            type="success"
            showIcon
            message="Payable to merchant = full POD cash. Delivery fees are billed on invoices, not deducted here."
          />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="merchant_id"
                label="Merchant / store"
                rules={[{ required: true, message: "Required" }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select merchant"
                  options={merchantSelectOptions}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="adjustments" label="Adjustments">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="period" label="Period (optional)">
                <DatePicker.RangePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {preview && (
          <Card size="small" title="Preview" style={{ marginTop: 8 }}>
            <Text>
              {preview.merchant_name
                ? `${formatMerchantLabel(preview)} · `
                : ""}
              Shipments: {preview.shipment_count} | POD cash payable: Rs.{" "}
              {Number(preview.final_payable_amount || preview.total_pod_collected || 0).toFixed(2)}
            </Text>
          </Card>
        )}
      </Modal>
    </Space>
  );
}

