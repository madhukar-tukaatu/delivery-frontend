"use client";

import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Modal, Space, Table, Tag, message } from "antd";
import { staffAcceptDelivery, staffGetDeliveries, staffMarkDelivered, staffMarkFailed, staffOutForDelivery } from "@/services/deliveryOperationsApi";

export default function StaffDeliveriesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failedRow, setFailedRow] = useState(null);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try { setRows(await staffGetDeliveries()); } catch { message.error("Could not load deliveries."); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function run(action) {
    try { await action(); message.success("Updated."); setFailedRow(null); form.resetFields(); load(); } catch (e) { message.error(e?.response?.data?.message || "Action failed."); }
  }

  return <>
    <Card title="Delivery Jobs">
      <Table rowKey="id" loading={loading} dataSource={rows} columns={[
        { title: "Tracking", dataIndex: "tracking_number" },
        { title: "Customer", dataIndex: "customer_name" },
        { title: "Address", dataIndex: "delivery_address" },
        { title: "Collect", dataIndex: "total_collectable" },
        { title: "Status", dataIndex: "status", render: (v) => <Tag>{v}</Tag> },
        { title: "Action", render: (_, r) => <Space wrap>
          <Button disabled={r.status !== "assigned"} onClick={() => run(() => staffAcceptDelivery(r.id))}>Accept</Button>
          <Button disabled={!['accepted','assigned'].includes(r.status)} onClick={() => run(() => staffOutForDelivery(r.id))}>Out For Delivery</Button>
          <Button type="primary" disabled={r.status !== "out_for_delivery"} onClick={() => run(() => staffMarkDelivered(r.id, { otp_verified: true, proof_type: "signature", proof_value: "received" }))}>Delivered</Button>
          <Button danger disabled={r.status !== "out_for_delivery"} onClick={() => setFailedRow(r)}>Failed</Button>
        </Space> },
      ]} />
    </Card>
    <Modal title="Failed Delivery" open={!!failedRow} onCancel={() => setFailedRow(null)} onOk={() => form.validateFields().then((v) => run(() => staffMarkFailed(failedRow.id, v.reason)))}>
      <Form form={form} layout="vertical"><Form.Item name="reason" label="Reason" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item></Form>
    </Modal>
  </>;
}
