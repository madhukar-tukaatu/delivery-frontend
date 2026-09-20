"use client";

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
      const [pendingRes, settlementsRes] = await Promise.all([
        api.get("/admin/settlements/pending-cash", { params: { per_page: 100 } }),
        api.get("/admin/settlements", { params: { per_page: 50 } }),
      ]);

      const pending = unwrap(pendingRes);
      const settled = unwrap(settlementsRes);

      setPendingDeposit(pending?.pending_deposit || []);
      setCounts(pending?.counts || null);
      setHint(pending?.hint || "");
      setSettlements(settled?.data || settled || []);
      setSelectedIds([]);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Could not load settlements / pending cash.";
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
      message.success("Cash deposited. Those shipments are now ready to settle.");
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
      message.success("Settlement generated (POD cash + delivery charges).");
      setSettleOpen(false);
      form.resetFields();
      setPreview(null);
      load();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.response?.data?.message || "Settlement create failed.");
    }
  }

  async function markPaid(id) {
    try {
      await api.post(`/admin/settlements/${id}/mark-paid`, {});
      message.success("Settlement marked paid.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Mark paid failed.");
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Where cash POD goes after rider Complete"
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>
              Rider completes cash POD → cash sits with the rider as{" "}
              <Tag color="orange">collected / pending_deposit</Tag>
              → it shows in <strong>section 1 below</strong> → branch deposits → then{" "}
              <strong>Generate settlement</strong> creates a row in section 2 → Mark paid.
            </Paragraph>
            <Text type="secondary">
              Section 2 (settlements list) stays empty until you generate. That is expected.
            </Text>
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
          <Tag color="blue">Ready to settle: {counts.ready_to_settle}</Tag>
          <Tag>Settlement batches: {counts.settlements}</Tag>
        </Space>
      ) : null}

      <Card
        title="1. Branch deposit — cash POD from riders (appears here first)"
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
            emptyText:
              "No cash POD awaiting deposit. After rider Complete (cash), a row should appear here. If a delivery shows pending_deposit in DB but nothing here, redeploy backend or check pod_records.status=collected.",
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
                <Space>
                  <Tag color={r.can_deposit ? "orange" : "red"}>{v}</Tag>
                  {!r.can_deposit ? <Tag>fix POD row</Tag> : null}
                </Space>
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
        title="2. Merchant settlements — generated batches (empty until Generate)"
        extra={
          <Button type="primary" onClick={openSettle}>
            Generate settlement
          </Button>
        }
        loading={loading}
      >
        <Table
          rowKey="id"
          dataSource={settlements}
          locale={{
            emptyText:
              "No settlement batches yet. Deposit cash in section 1 (preferred), then click Generate settlement for the merchant.",
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
            { title: "POD cash", dataIndex: "total_pod_collected" },
            { title: "Delivery charges", dataIndex: "total_delivery_charges" },
            { title: "POD fees", dataIndex: "total_pod_charges" },
            { title: "Payable", dataIndex: "final_payable_amount" },
            {
              title: "Status",
              dataIndex: "status",
              render: (v) => <Tag>{v}</Tag>,
            },
            {
              title: "Action",
              render: (_, r) => (
                <Button
                  disabled={["paid", "settled"].includes(String(r.status))}
                  onClick={() => markPaid(r.id)}
                >
                  Mark paid
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Generate accountable settlement"
        open={settleOpen}
        onCancel={() => setSettleOpen(false)}
        width={720}
        destroyOnClose
        footer={[
          <Button key="prev" loading={previewLoading} onClick={runPreview}>
            Preview breakdown
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
                <Radio value="after_deposit">
                  After branch deposit (preferred)
                </Radio>
                <Radio value="on_collection">
                  From collected cash (optional, before deposit)
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Alert
            style={{ marginBottom: 16 }}
            type={cashPath === "on_collection" ? "warning" : "success"}
            showIcon
            message={
              cashPath === "on_collection"
                ? "Uses collected cash still with riders. Merchant delivery charges are still deducted."
                : "Uses deposited cash POD. Also includes fee-only deliveries where merchant owes delivery charge."
            }
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
            <Space direction="vertical" style={{ width: "100%" }}>
              <Text>
                Shipments: {preview.shipment_count} · POD cash: Rs.{" "}
                {Number(preview.total_pod_collected || 0).toFixed(2)} · Delivery
                charges: Rs. {Number(preview.total_delivery_charges || 0).toFixed(2)} ·
                Payable:{" "}
                <strong>
                  Rs. {Number(preview.final_payable_amount || 0).toFixed(2)}
                </strong>
              </Text>
              <Table
                size="small"
                rowKey="shipment_id"
                pagination={false}
                dataSource={preview.lines || []}
                columns={[
                  { title: "Tracking", dataIndex: "tracking_number" },
                  { title: "Type", dataIndex: "payment_type" },
                  { title: "POD cash", dataIndex: "pod_amount" },
                  { title: "Delivery owed", dataIndex: "delivery_charge" },
                  { title: "Payer", dataIndex: "delivery_charge_paid_by" },
                  { title: "Net", dataIndex: "net_amount" },
                ]}
              />
            </Space>
          </Card>
        )}
      </Modal>
    </Space>
  );
}
