"use client";

import {
  AccountBookOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  InputNumber,
  Modal,
  Radio,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import api from "@/lib/api";

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
  const cashPath = Form.useWatch("cash_path", form);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [pendingRes, settlementsRes, invoicesRes] = await Promise.all([
        api.get("/admin/settlements/pending-cash", { params: { per_page: 100 } }),
        api.get("/admin/settlements", { params: { per_page: 50 } }),
        api.get("/admin/invoices", { params: { type: "delivery_charges", per_page: 50 } }),
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
    load();
  }, []);

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
        // Keep session details visible for ops; open gateway when URL present.
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

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Settlements"
        subtitle="POD deposits, merchant delivery bills, and settlement batches."
        icon={<AccountBookOutlined />}
        actions={
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
        }
      />

      <Alert
        type="info"
        showIcon
        message="Money tracks (POD + delivery bills + HQ commission)"
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>
              <strong>1. POD settlement</strong> - cash collected for the merchant.
              Listed after branch deposit. Payable = full POD cash (no delivery fee deducted).
            </Paragraph>
            <Paragraph style={{ marginBottom: 0 }}>
              <strong>2. Delivery charge bills</strong> - merchant-owed checkout delivery fees
              (and POD service fees). Auto-created after successful delivery. Billed separately. HQ commission (branch -> Tukaatu Express) is on /admin/hq-commissions.
            </Paragraph>
          </div>
        }
      />

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
        title="1. Branch deposit - cash POD from riders"
        extra={
          <Button type="primary" disabled={!selectedIds.length} onClick={depositSelected}>
            Deposit selected (Rs. {selectedAmount.toFixed(2)})
          </Button>
        }
        loading={loading}
      >
        <Table
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
            { title: "Merchant", dataIndex: "merchant_id" },
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
        title="2. POD settlements - payable to merchant (full POD cash)"
        extra={
          <Button onClick={openSettle}>
            Generate POD settlement (catch-up)
          </Button>
        }
        loading={loading}
      >
        <Table
          rowKey="id"
          dataSource={settlements}
          locale={{
            emptyText:
              "No POD settlements yet. They appear after branch deposit of cash POD.",
          }}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Number", dataIndex: "settlement_number" },
            { title: "Merchant", dataIndex: "merchant_id" },
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
                    type="primary"
                    disabled={["paid", "settled"].includes(String(r.status))}
                    onClick={() => paySettlementHamroPay(r.id)}
                  >
                    Pay via HamroPay
                  </Button>
                  <Button
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
        title="3. Delivery charge bills - merchant owes platform (checkout fees)"
        loading={loading}
      >
        <Table
          rowKey="id"
          dataSource={invoices}
          locale={{
            emptyText:
              "No delivery bills yet. They auto-create after successful delivery when the merchant owes delivery fees.",
          }}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Invoice", dataIndex: "invoice_number" },
            { title: "Merchant", dataIndex: "merchant_id" },
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
                <Button
                  disabled={String(r.status) === "paid"}
                  onClick={() => markInvoicePaid(r.id)}
                >
                  Mark bill paid
                </Button>
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
                label="Merchant ID"
                rules={[{ required: true, message: "Required" }]}
              >
                <InputNumber style={{ width: "100%" }} min={1} />
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
              Shipments: {preview.shipment_count} | POD cash payable: Rs.{" "}
              {Number(preview.final_payable_amount || preview.total_pod_collected || 0).toFixed(2)}
            </Text>
          </Card>
        )}
      </Modal>
    </Space>
  );
}
