'use client';

import { Button, Card, Col, Descriptions, Form, Input, Modal, Popconfirm, Row, Space, Typography } from 'antd';
import { EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons';
import WorkflowStatusTag from './WorkflowStatusTag';
import { formatMoney, formatDateTime } from '@/config/workflowStatus';
import { useState } from 'react';

const { Text } = Typography;

export default function DeliveryTaskCard({ delivery, onOutForDelivery, onDelivered, onFailed }) {
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [deliverForm] = Form.useForm();
  const [failForm] = Form.useForm();
  const shipment = delivery.shipment || {};

  return (
    <>
      <Card
        title={
          <Space wrap>
            <span>{shipment.tracking_number || `Delivery #${delivery.id}`}</span>
            <WorkflowStatusTag status={delivery.status} />
            <WorkflowStatusTag status={shipment.status} />
          </Space>
        }
        extra={<Text type="secondary">{formatDateTime(delivery.assigned_at || delivery.created_at)}</Text>}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
              <Descriptions.Item label="Receiver">{shipment.receiver_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone"><Space><PhoneOutlined />{shipment.receiver_phone || '-'}</Space></Descriptions.Item>
              <Descriptions.Item label="Delivery Address" span={2}>
                <Space><EnvironmentOutlined />{shipment.receiver_address || '-'}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="City">{shipment.receiver_city || '-'}</Descriptions.Item>
              <Descriptions.Item label="Area">{shipment.receiver_area || '-'}</Descriptions.Item>
              <Descriptions.Item label="POD">{formatMoney(shipment.pod_amount)}</Descriptions.Item>
              <Descriptions.Item label="Total Collectable">{formatMoney(shipment.total_collectable_amount)}</Descriptions.Item>
              <Descriptions.Item label="Delivery Charge">{formatMoney(shipment.delivery_charge)}</Descriptions.Item>
              <Descriptions.Item label="Payment Type">{shipment.payment_type || '-'}</Descriptions.Item>
              <Descriptions.Item label="Coordinates">
                {shipment.delivery_lat && shipment.delivery_lng ? `${shipment.delivery_lat}, ${shipment.delivery_lng}` : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Col>

          <Col xs={24} lg={8}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" block onClick={() => onOutForDelivery(delivery)} disabled={delivery.status !== 'assigned'}>
                Out for Delivery
              </Button>
              <Button block type="primary" onClick={() => setDeliverOpen(true)} disabled={!['assigned', 'out_for_delivery'].includes(delivery.status)}>
                Mark Delivered
              </Button>
              <Button danger block onClick={() => setFailOpen(true)} disabled={!['assigned', 'out_for_delivery'].includes(delivery.status)}>
                Delivery Failed
              </Button>
              {shipment.delivery_lat && shipment.delivery_lng ? (
                <Button
                  block
                  href={`https://www.google.com/maps/search/?api=1&query=${shipment.delivery_lat},${shipment.delivery_lng}`}
                  target="_blank"
                >
                  Open Delivery Map
                </Button>
              ) : null}
            </Space>
          </Col>
        </Row>
      </Card>

      <Modal
        title="Mark as Delivered"
        open={deliverOpen}
        onCancel={() => setDeliverOpen(false)}
        onOk={() => deliverForm.submit()}
        okText="Confirm Delivered"
      >
        <Form
          form={deliverForm}
          layout="vertical"
          onFinish={(values) => {
            onDelivered(delivery, values);
            setDeliverOpen(false);
            deliverForm.resetFields();
          }}
        >
          <Form.Item name="receiver_name" label="Received By" initialValue={shipment.receiver_name}>
            <Input />
          </Form.Item>
          <Form.Item name="pod_collected" label="POD Collected Amount" initialValue={shipment.total_collectable_amount || shipment.pod_amount}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Delivery Failed"
        open={failOpen}
        onCancel={() => setFailOpen(false)}
        onOk={() => failForm.submit()}
        okText="Confirm Failed"
        okButtonProps={{ danger: true }}
      >
        <Form
          form={failForm}
          layout="vertical"
          onFinish={(values) => {
            onFailed(delivery, values);
            setFailOpen(false);
            failForm.resetFields();
          }}
        >
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: 'Please enter failure reason' }]}>
            <Input.TextArea rows={4} placeholder="Customer unavailable, phone unreachable, address wrong..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
