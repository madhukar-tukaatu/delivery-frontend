"use client";

import { useEffect, useState } from "react";
import { Button, Card, Col, DatePicker, Form, InputNumber, Modal, Row, Space, Table, Tag, message } from "antd";
import { accountsConfirmCodDeposit, accountsCreateSettlement, accountsGetCodPending, accountsGetSettlements, accountsMarkSettlementPaid } from "@/services/deliveryOperationsApi";

export default function AdminCodAccountsPage() {
  const [codRows, setCodRows] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [settleOpen, setSettleOpen] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    try {
      setCodRows(await accountsGetCodPending());
      setSettlements(await accountsGetSettlements());
    } catch { message.error("Could not load accounts data."); }
  }

  useEffect(() => { load(); }, []);

  async function run(action, ok = "Updated") {
    try { await action(); message.success(ok); setSettleOpen(false); form.resetFields(); load(); } catch (e) { message.error(e?.response?.data?.message || "Action failed."); }
  }

  return <Space direction="vertical" size={16} style={{ width: "100%" }}>
    <Card title="Pending COD Deposits">
      <Table rowKey="id" dataSource={codRows} columns={[
        { title: "Tracking", dataIndex: "tracking_number" },
        { title: "Customer", dataIndex: "customer_name" },
        { title: "Rider", dataIndex: "rider_id" },
        { title: "COD", dataIndex: "cod_amount" },
        { title: "Collect", dataIndex: "total_collected" },
        { title: "Status", dataIndex: "status", render: (v) => <Tag>{v}</Tag> },
        { title: "Action", render: (_, r) => <Button type="primary" onClick={() => run(() => accountsConfirmCodDeposit(r.id, { amount: r.total_collected }), "Deposit confirmed")}>Confirm Deposit</Button> },
      ]} />
    </Card>

    <Card title="Merchant Settlements" extra={<Button onClick={() => setSettleOpen(true)}>Create Settlement</Button>}>
      <Table rowKey="id" dataSource={settlements} columns={[
        { title: "Number", dataIndex: "settlement_number" },
        { title: "Merchant", dataIndex: "merchant_id" },
        { title: "Shipments", dataIndex: "shipment_count" },
        { title: "COD Total", dataIndex: "cod_total" },
        { title: "Charges", dataIndex: "delivery_charge_total" },
        { title: "Payable", dataIndex: "payable_amount" },
        { title: "Status", dataIndex: "status", render: (v) => <Tag>{v}</Tag> },
        { title: "Action", render: (_, r) => <Button disabled={r.status === "paid"} onClick={() => run(() => accountsMarkSettlementPaid(r.id), "Settlement paid")}>Mark Paid</Button> },
      ]} />
    </Card>

    <Modal title="Create Merchant Settlement" open={settleOpen} onCancel={() => setSettleOpen(false)} onOk={() => form.validateFields().then((v) => run(() => accountsCreateSettlement({ merchant_id: v.merchant_id, period_from: v.period?.[0]?.format('YYYY-MM-DD'), period_to: v.period?.[1]?.format('YYYY-MM-DD') }), "Settlement created"))}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={24}><Form.Item name="merchant_id" label="Merchant ID" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={24}><Form.Item name="period" label="Period"><DatePicker.RangePicker style={{ width: "100%" }} /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  </Space>;
}
