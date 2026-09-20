"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  Modal,
  Radio,
  Row,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

export default function AdminCodAccountsPage() {
  const [pendingDeposit, setPendingDeposit] = useState([]);
  const [onlinePaid, setOnlinePaid] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [form] = Form.useForm();
  const cashPath = Form.useWatch("cash_path", form);

  async function load() {
    setLoading(true);
    try {
      const [collectedRes, paidDirectRes, settlementsRes] = await Promise.all([
        api.get("/admin/pod", { params: { status: "collected", per_page: 100 } }),
        api.get("/admin/pod", { params: { status: "paid_direct", per_page: 50 } }),
        api.get("/admin/settlements", { params: { per_page: 50 } }),
      ]);

      const collected = unwrap(collectedRes);
      const paid = unwrap(paidDirectRes);
      const settled = unwrap(settlementsRes);

      setPendingDeposit(collected?.data || collected || []);
      setOnlinePaid(paid?.data || paid || []);
      setSettlements(settled?.data || settled || []);
      setSelectedIds([]);
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load POD / settlement data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedAmount = useMemo(() => {
    return pendingDeposit
      .filter((row) => selectedIds.includes(row.id))
      .reduce((sum, row) => sum + Number(row.collected_amount || 0), 0);
  }, [pendingDeposit, selectedIds]);

  async function depositSelected() {
    if (!selectedIds.length) {
      message.warning("Select at least one collected cash POD to deposit.");
      return;
    }

    try {
      await api.post("/admin/pod/deposit", {
        pod_record_ids: selectedIds,
        remarks: "Branch deposit from accounts console",
      });
      message.success("Cash POD deposited. Shipments are ready for settlement.");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Deposit failed.");
    }
  }

  async function createSettlement(values) {
    try {
      const path = values.cash_path || "after_deposit";
      await api.post("/admin/settlements", {
        merchant_id: values.merchant_id,
        adjustments: values.adjustments || 0,
        cash_path: path,
      });
      message.success(
        path === "on_collection"
          ? "Settlement generated from collected cash (before deposit)."
          : "Settlement generated from deposited cash shipments."
      );
      setSettleOpen(false);
      form.resetFields();
      form.setFieldsValue({ cash_path: "after_deposit" });
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Settlement create failed.");
    }
  }

  async function markPaid(id) {
    try {
      await api.post(`/admin/settlements/${id}/mark-paid`, {});
      message.success("Settlement marked paid (merchant paid).");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Mark paid failed.");
    }
  }

  function openSettleModal() {
    form.setFieldsValue({ cash_path: "after_deposit", adjustments: 0 });
    setSettleOpen(true);
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Cash POD: pay merchant first"
        description="Preferred path: rider collects → branch deposit → generate settlement → mark paid. Optional path: settle from collected cash before deposit when you need to pay the merchant sooner. Online prepaid/POD stay out of this cash pool."
      />

      <Card
        title="Cash POD awaiting branch deposit (preferred)"
        extra={
          <Button type="primary" disabled={!selectedIds.length} onClick={depositSelected}>
            Deposit selected (Rs. {selectedAmount.toFixed(2)})
          </Button>
        }
        loading={loading}
      >
        <Table
          rowKey="id"
          dataSource={pendingDeposit}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: setSelectedIds,
          }}
          columns={[
            {
              title: "Tracking",
              render: (_, r) => r.shipment?.tracking_number || r.shipment_id,
            },
            { title: "Merchant", dataIndex: "merchant_id" },
            { title: "Rider", dataIndex: "collected_by" },
            { title: "POD", dataIndex: "pod_amount" },
            { title: "Collected", dataIndex: "collected_amount" },
            {
              title: "Status",
              dataIndex: "status",
              render: (v) => <Tag color="orange">{v}</Tag>,
            },
          ]}
        />
      </Card>

      <Card title="Online POD paid direct to merchant (record only)" loading={loading}>
        <Table
          rowKey="id"
          dataSource={onlinePaid}
          columns={[
            {
              title: "Tracking",
              render: (_, r) => r.shipment?.tracking_number || r.shipment_id,
            },
            { title: "Merchant", dataIndex: "merchant_id" },
            { title: "Amount", dataIndex: "collected_amount" },
            { title: "Reference", dataIndex: "payment_reference" },
            { title: "Session", dataIndex: "payment_session_id" },
            {
              title: "Status",
              dataIndex: "status",
              render: (v) => <Tag color="green">{v}</Tag>,
            },
          ]}
        />
      </Card>

      <Card
        title="Merchant settlements (cash payable)"
        extra={<Button type="primary" onClick={openSettleModal}>Generate settlement</Button>}
        loading={loading}
      >
        <Table
          rowKey="id"
          dataSource={settlements}
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
            { title: "POD", dataIndex: "total_pod_collected" },
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
        title="Generate merchant settlement"
        open={settleOpen}
        onCancel={() => setSettleOpen(false)}
        onOk={() => form.validateFields().then(createSettlement)}
        okText="Generate"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ cash_path: "after_deposit", adjustments: 0 }}>
          <Form.Item
            name="cash_path"
            label="Cash settlement path"
            rules={[{ required: true, message: "Choose a cash path." }]}
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="after_deposit">
                  After branch deposit (preferred) - shipments with settlement_status ready
                </Radio>
                <Radio value="on_collection">
                  From collected cash (optional) - pay merchant before deposit; rider cash still deposits later
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Alert
            type={cashPath === "on_collection" ? "warning" : "success"}
            showIcon
            style={{ marginBottom: 16 }}
            message={
              cashPath === "on_collection"
                ? "Optional path: uses collected / pending_deposit cash POD. Deposit can still happen afterward for cash control."
                : "Preferred path: only deposited cash POD (ready). Online paid_direct is excluded."
            }
          />

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="merchant_id"
                label="Merchant ID"
                rules={[{ required: true, message: "Merchant ID is required" }]}
              >
                <InputNumber style={{ width: "100%" }} min={1} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="adjustments" label="Adjustments">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}
