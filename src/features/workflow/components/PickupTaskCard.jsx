'use client';

import { Button, Card, Col, Descriptions, Popconfirm, Row, Space, Typography } from 'antd';
import { EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons';
import WorkflowStatusTag from './WorkflowStatusTag';
import { formatMoney, formatDateTime } from '@/config/workflowStatus';

const { Text } = Typography;

export default function PickupTaskCard({ pickup, onPickedUp, onFailed }) {
  const shipment = pickup.shipment || {};
  const merchant = pickup.merchant || shipment.merchant || {};

  return (
    <Card
      title={
        <Space wrap>
          <span>{shipment.tracking_number || `Pickup #${pickup.id}`}</span>
          <WorkflowStatusTag status={pickup.status} />
          <WorkflowStatusTag status={shipment.status} />
        </Space>
      }
      extra={<Text type="secondary">{formatDateTime(pickup.assigned_at || pickup.created_at)}</Text>}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
            <Descriptions.Item label="Merchant">{merchant.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Merchant Order">{shipment.merchant_order_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="Pickup Name">{pickup.pickup_name || shipment.sender_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Pickup Phone">
              <Space><PhoneOutlined />{pickup.pickup_phone || shipment.sender_phone || '-'}</Space>
            </Descriptions.Item>
            <Descriptions.Item label="Pickup Address" span={2}>
              <Space><EnvironmentOutlined />{pickup.pickup_address || shipment.sender_address || '-'}</Space>
            </Descriptions.Item>
            <Descriptions.Item label="Receiver">{shipment.receiver_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Delivery City">{shipment.receiver_city || '-'}</Descriptions.Item>
            <Descriptions.Item label="Weight">{shipment.weight || 0} kg</Descriptions.Item>
            <Descriptions.Item label="COD">{formatMoney(shipment.cod_amount)}</Descriptions.Item>
            <Descriptions.Item label="Total Collectable">{formatMoney(shipment.total_collectable_amount)}</Descriptions.Item>
            <Descriptions.Item label="Coordinates">
              {pickup.pickup_lat && pickup.pickup_lng ? `${pickup.pickup_lat}, ${pickup.pickup_lng}` : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Col>

        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" block onClick={() => onPickedUp(pickup)} disabled={!['pending', 'assigned'].includes(pickup.status)}>
              Mark Picked Up
            </Button>
            <Popconfirm
              title="Mark pickup as failed?"
              description="Use this when merchant is unavailable, parcel not ready, or address is wrong."
              onConfirm={() => onFailed(pickup)}
            >
              <Button danger block disabled={!['pending', 'assigned'].includes(pickup.status)}>
                Pickup Failed
              </Button>
            </Popconfirm>
            {pickup.pickup_lat && pickup.pickup_lng ? (
              <Button
                block
                href={`https://www.google.com/maps/search/?api=1&query=${pickup.pickup_lat},${pickup.pickup_lng}`}
                target="_blank"
              >
                Open Pickup Map
              </Button>
            ) : null}
          </Space>
        </Col>
      </Row>
    </Card>
  );
}
