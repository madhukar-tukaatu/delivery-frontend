"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, Modal, Space, Table, Tag, Timeline, Typography, message } from "antd";
import { useParams } from "next/navigation";
import {
  assignDeliveryRider,
  assignPickupStaff,
  createTransferBatch,
  dispatchTransferBatch,
  getAdminShipmentLifecycle,
  receiveShipmentAtOrigin,
  receiveTransferBatch,
} from "@/services/deliveryLifecycleApi";

const { Title, Text } = Typography;

function statusColor(status) {
  if (["delivered", "completed", "settled", "paid"].includes(status)) return "green";
  if (["failed", "return_pending", "returned"].includes(status)) return "red";
  if (["in_transit", "out_for_delivery", "assigned"].includes(status)) return "blue";
  return "default";
}

export default function AdminShipmentLifecyclePage() {
  const params = useParams();
  const shipmentId = params.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    try {
      setLoading(true);
      setData(await getAdminShipmentLifecycle(shipmentId));
    } catch (error) {
      message.error("Could not load shipment lifecycle.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [shipmentId]);

  const run = async (fn, success) => {
    try {
      setLoading(true);
      await fn();
      message.success(success);
      await load();
    } catch (error) {
      message.error(error?.response?.data?.message || "Action failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!data) return <Card loading />;

  const shipment = data.shipment;

  const routeColumns = [
    { title: "Seq", dataIndex: "sequence" },
    { title: "Type", dataIndex: "type" },
    { title: "From", render: (_, r) => `${r.from_branch_id || "-"}/${r.from_sub_branch_id || "-"}` },
    { title: "To", render: (_, r) => `${r.to_branch_id || "-"}/${r.to_sub_branch_id || "-"}` },
    { title: "Status", dataIndex: "status", render: (v) => <Tag color={statusColor(v)}>{v}</Tag> },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Title level={3}>Shipment Lifecycle</Title>
        <Space wrap>
          <Tag color="blue">{shipment.tracking_number}</Tag>
          <Tag color={statusColor(shipment.status)}>{shipment.status}</Tag>
          <Tag>Pickup: {shipment.pickup_status}</Tag>
          <Tag>Delivery: {shipment.delivery_status}</Tag>
          <Tag>POD: {shipment.pod_status}</Tag>
        </Space>
      </Card>

      <Card title="Shipment Summary" loading={loading}>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Merchant ID">{shipment.merchant_id}</Descriptions.Item>
          <Descriptions.Item label="Source">{shipment.source}</Descriptions.Item>
          <Descriptions.Item label="Receiver">{shipment.receiver_name}</Descriptions.Item>
          <Descriptions.Item label="Phone">{shipment.receiver_phone}</Descriptions.Item>
          <Descriptions.Item label="Address">{shipment.receiver_address}</Descriptions.Item>
          <Descriptions.Item label="City/Area">{shipment.receiver_city} / {shipment.receiver_area}</Descriptions.Item>
          <Descriptions.Item label="Delivery Charge">{shipment.delivery_charge}</Descriptions.Item>
          <Descriptions.Item label="POD Amount">{shipment.pod_amount}</Descriptions.Item>
          <Descriptions.Item label="Total Collectable">{shipment.total_collectable}</Descriptions.Item>
          <Descriptions.Item label="Current Branch">{shipment.current_branch_id} / {shipment.current_sub_branch_id}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Admin Actions">
        <Space wrap>
          <InputNumber id="pickupStaffId" placeholder="Pickup staff ID" />
          <Button onClick={() => {
            const el = document.getElementById("pickupStaffId");
            run(() => assignPickupStaff(shipmentId, Number(el.value)), "Pickup staff assigned.");
          }}>Assign Pickup Staff</Button>

          <Button onClick={() => run(() => receiveShipmentAtOrigin(shipmentId), "Received at origin.")}>Receive at Origin Hub</Button>

          <Button onClick={() => setTransferOpen(true)}>Create Transfer Batch</Button>

          <InputNumber id="deliveryRiderId" placeholder="Delivery rider ID" />
          <Button type="primary" onClick={() => {
            const el = document.getElementById("deliveryRiderId");
            run(() => assignDeliveryRider(shipmentId, Number(el.value)), "Delivery rider assigned.");
          }}>Assign Delivery Rider</Button>
        </Space>
      </Card>

      {transferResult?.batch && (
        <Alert
          type="success"
          showIcon
          message={`Transfer Batch: ${transferResult.batch.batch_number}`}
          action={
            <Space>
              <Button onClick={() => run(() => dispatchTransferBatch(transferResult.batch.id), "Transfer dispatched.")}>Dispatch</Button>
              <Button onClick={() => run(() => receiveTransferBatch(transferResult.batch.id), "Transfer received.")}>Receive</Button>
            </Space>
          }
        />
      )}

      <Card title="Route Steps">
        <Table rowKey="id" columns={routeColumns} dataSource={data.route_steps || []} pagination={false} />
      </Card>

      <Card title="Lifecycle Events">
        <Timeline
          items={(data.events || []).map((event) => ({
            color: statusColor(event.status),
            children: <><Text strong>{event.event}</Text><br /><Text type="secondary">{event.remarks}</Text></>,
          }))}
        />
      </Card>

      <Card title="Payment / POD">
        {data.pod ? (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="POD Amount">{data.pod.pod_amount}</Descriptions.Item>
            <Descriptions.Item label="Delivery Charge Collected">{data.pod.delivery_charge_collected}</Descriptions.Item>
            <Descriptions.Item label="Total Collected">{data.pod.total_collected}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag>{data.pod.status}</Tag></Descriptions.Item>
          </Descriptions>
        ) : <Alert message="No POD for this shipment." />}
      </Card>

      <Modal title="Create Transfer Batch" open={transferOpen} onCancel={() => setTransferOpen(false)} onOk={async () => {
        const values = await form.validateFields();
        const result = await createTransferBatch({ ...values, shipment_ids: [Number(shipmentId)] });
        setTransferResult(result);
        setTransferOpen(false);
        await load();
      }}>
        <Form form={form} layout="vertical" initialValues={{ from_branch_id: shipment.origin_branch_id, from_sub_branch_id: shipment.origin_sub_branch_id, to_branch_id: shipment.destination_branch_id, to_sub_branch_id: shipment.destination_sub_branch_id }}>
          <Form.Item name="from_branch_id" label="From Branch"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="from_sub_branch_id" label="From Sub Branch"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="to_branch_id" label="To Branch" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="to_sub_branch_id" label="To Sub Branch"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="vehicle_number" label="Vehicle Number"><Input /></Form.Item>
          <Form.Item name="driver_id" label="Driver ID"><InputNumber style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
