"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, Button, Card, Col, Descriptions, Form, Input, InputNumber, Modal, Row, Space, Tag, Timeline, Typography, message } from "antd";
import {
  adminAssignDelivery,
  adminAssignPickup,
  adminCreateTransfer,
  adminDispatchTransfer,
  adminGetShipment,
  adminReceiveOrigin,
  adminReceiveTransfer,
} from "@/services/deliveryOperationsApi";

const { Title, Text } = Typography;

function statusColor(status) {
  if (["delivered", "paid", "deposited"].includes(status)) return "green";
  if (["failed_delivery", "return_pending", "failed"].includes(status)) return "red";
  if (["in_transit", "out_for_delivery", "at_destination_hub"].includes(status)) return "blue";
  return "orange";
}

export default function AdminShipmentOperationsPage() {
  const params = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferBatch, setTransferBatch] = useState(null);
  const [form] = Form.useForm();

  async function load() {
    try {
      setLoading(true);
      setData(await adminGetShipment(params.id));
    } catch (error) {
      message.error("Could not load shipment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params.id]);

  async function run(action, success) {
    try {
      await action();
      message.success(success);
      form.resetFields();
      setPickupOpen(false);
      setDeliveryOpen(false);
      setTransferOpen(false);
      await load();
    } catch (error) {
      message.error(error?.response?.data?.message || "Action failed.");
    }
  }

  if (loading) return <Card loading />;
  if (!data?.shipment) return <Alert type="error" message="Shipment not found" />;

  const s = data.shipment;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Title level={3}>{s.tracking_number}</Title>
        <Space wrap>
          <Tag color={statusColor(s.status)}>{s.status}</Tag>
          {s.requires_transfer ? <Tag color="orange">Transfer Required</Tag> : <Tag color="green">Local Delivery</Tag>}
          <Tag>COD: {s.cod_amount}</Tag>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Shipment">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Merchant">{s.merchant_id}</Descriptions.Item>
              <Descriptions.Item label="Customer">{s.customer_name} / {s.customer_phone}</Descriptions.Item>
              <Descriptions.Item label="Address">{s.delivery_address}</Descriptions.Item>
              <Descriptions.Item label="Charge">{s.delivery_charge}</Descriptions.Item>
              <Descriptions.Item label="Collectable">{s.total_collectable}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Current Operations">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Pickup">{data.pickup?.status || "not created"}</Descriptions.Item>
              <Descriptions.Item label="Delivery">{data.delivery?.status || "not assigned"}</Descriptions.Item>
              <Descriptions.Item label="COD">{data.cod?.status || "-"}</Descriptions.Item>
              <Descriptions.Item label="Origin">{s.origin_sub_branch_id || s.origin_branch_id}</Descriptions.Item>
              <Descriptions.Item label="Destination">{s.destination_sub_branch_id || s.destination_branch_id}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title="Admin Actions">
        <Space wrap>
          <Button onClick={() => setPickupOpen(true)}>Assign Pickup Staff</Button>
          <Button onClick={() => run(() => adminReceiveOrigin(s.id, "Origin scan by admin"), "Received at origin hub")}>Receive at Origin</Button>
          <Button disabled={!s.requires_transfer} onClick={() => setTransferOpen(true)}>Create Transfer</Button>
          {transferBatch && <Button onClick={() => run(() => adminDispatchTransfer(transferBatch.id), "Transfer dispatched")}>Dispatch Transfer</Button>}
          {transferBatch && <Button onClick={() => run(() => adminReceiveTransfer(transferBatch.id), "Transfer received")}>Receive Transfer</Button>}
          <Button type="primary" onClick={() => setDeliveryOpen(true)}>Assign Delivery Rider</Button>
        </Space>
      </Card>

      <Card title="Timeline">
        <Timeline items={(data.tracking || []).map((item) => ({ color: statusColor(item.status), children: <><Text strong>{item.title}</Text><br /><Text type="secondary">{item.description}</Text></> }))} />
      </Card>

      <Modal title="Assign Pickup Staff" open={pickupOpen} onCancel={() => setPickupOpen(false)} onOk={() => form.validateFields().then((v) => run(() => adminAssignPickup(s.id, v.staff_id), "Pickup assigned"))}>
        <Form form={form} layout="vertical"><Form.Item name="staff_id" label="Staff/Rider ID" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item></Form>
      </Modal>

      <Modal title="Create Transfer" open={transferOpen} onCancel={() => setTransferOpen(false)} onOk={() => form.validateFields().then((v) => run(async () => { const b = await adminCreateTransfer(s.id, v); setTransferBatch(b); }, "Transfer created"))}>
        <Form form={form} layout="vertical">
          <Form.Item name="vehicle_number" label="Vehicle Number"><Input /></Form.Item>
          <Form.Item name="seal_number" label="Seal Number"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Assign Delivery Rider" open={deliveryOpen} onCancel={() => setDeliveryOpen(false)} onOk={() => form.validateFields().then((v) => run(() => adminAssignDelivery(s.id, v.rider_id), "Delivery rider assigned"))}>
        <Form form={form} layout="vertical"><Form.Item name="rider_id" label="Delivery Rider ID" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item></Form>
      </Modal>
    </Space>
  );
}
