'use client';

import { useEffect, useState } from 'react';
import { Card, Col, Descriptions, Empty, Row, Space, Spin, Statistic, Timeline, Typography, message } from 'antd';
import { useParams } from 'next/navigation';
import ShipmentWorkflowActions from '@/features/workflow/components/ShipmentWorkflowActions';
import WorkflowStatusTag from '@/features/workflow/components/WorkflowStatusTag';
import {
  dispatchNextRouteStep,
  getAdminShipment,
  receiveCurrentRouteStep,
  receiveOriginSubBranch,
} from '@/services/workflowService';
import { formatDateTime, formatMoney, labelForStatus } from '@/config/workflowStatus';

const { Title, Text } = Typography;

function branchLabel(branch) {
  if (!branch) return '-';
  return `${branch.name}${branch.area ? `, ${branch.area}` : ''}`;
}

export default function AdminShipmentDetailPage() {
  const params = useParams();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getAdminShipment(params.id);
      setShipment(data);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Could not load shipment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) load();
  }, [params.id]);

  const runAction = async (fn, successMessage) => {
    try {
      setActionLoading(true);
      await fn();
      message.success(successMessage);
      await load();
    } catch (error) {
      message.error(error?.response?.data?.message || 'Workflow action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Card><Spin /></Card>;
  if (!shipment) return <Empty description="Shipment not found" />;

  const trackingEvents = shipment.tracking_events || shipment.trackingEvents || [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>{shipment.tracking_number}</Title>
            <Text type="secondary">Merchant Order: {shipment.merchant_order_id || '-'}</Text>
          </Col>
          <Col>
            <Space wrap>
              <WorkflowStatusTag status={shipment.status} />
              <WorkflowStatusTag status={shipment.payment_type} />
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}><Card><Statistic title="Delivery Charge" value={Number(shipment.delivery_charge || 0)} precision={2} prefix="NPR" /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="COD Amount" value={Number(shipment.cod_amount || 0)} precision={2} prefix="NPR" /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Collectable" value={Number(shipment.total_collectable_amount || 0)} precision={2} prefix="NPR" /></Card></Col>
        <Col xs={24} md={6}><Card><Statistic title="Distance" value={Number(shipment.route_distance_km || 0)} precision={2} suffix="km" /></Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Sender / Pickup">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Name">{shipment.sender_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{shipment.sender_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Address">{shipment.sender_address || '-'}</Descriptions.Item>
              <Descriptions.Item label="Coordinates">{shipment.pickup_lat && shipment.pickup_lng ? `${shipment.pickup_lat}, ${shipment.pickup_lng}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="Origin Branch">{branchLabel(shipment.origin_branch || shipment.originBranch)}</Descriptions.Item>
              <Descriptions.Item label="Origin Sub-Branch">{branchLabel(shipment.origin_sub_branch || shipment.originSubBranch)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Receiver / Delivery">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Name">{shipment.receiver_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{shipment.receiver_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Address">{shipment.receiver_address || '-'}</Descriptions.Item>
              <Descriptions.Item label="Coordinates">{shipment.delivery_lat && shipment.delivery_lng ? `${shipment.delivery_lat}, ${shipment.delivery_lng}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="Destination Branch">{branchLabel(shipment.destination_branch || shipment.destinationBranch)}</Descriptions.Item>
              <Descriptions.Item label="Destination Sub-Branch">{branchLabel(shipment.destination_sub_branch || shipment.destinationSubBranch)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <ShipmentWorkflowActions
        shipment={shipment}
        onReceiveOrigin={() => runAction(() => receiveOriginSubBranch(shipment.id), 'Received at origin sub-branch.')}
        onDispatchNext={() => runAction(() => dispatchNextRouteStep(shipment.id), 'Next route step dispatched.')}
        onReceiveCurrent={() => runAction(() => receiveCurrentRouteStep(shipment.id), 'Current route step received.')}
      />

      <Card title="Tracking Timeline">
        <Timeline
          items={trackingEvents.map((event) => ({
            color: event.status === 'delivered' ? 'green' : 'blue',
            children: (
              <div>
                <strong>{labelForStatus(event.status)}</strong>
                <div>{event.description || '-'}</div>
                <Text type="secondary">{event.location_text ? `${event.location_text} • ` : ''}{formatDateTime(event.created_at)}</Text>
              </div>
            ),
          }))}
        />
      </Card>
    </Space>
  );
}
