'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Timeline,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
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

  return `${branch.name || '-'}${branch.area ? `, ${branch.area}` : ''}`;
}

function normalizeShipmentResponse(response) {
  const payload = response?.data || response;

  if (payload?.shipment) {
    return payload;
  }

  if (payload?.data?.shipment) {
    return payload.data;
  }

  if (payload?.data && !payload.data.shipment) {
    return {
      shipment: payload.data,
      tracking_events: payload.data.tracking_events || payload.data.trackingEvents || [],
      tasks: payload.data.tasks || [],
      price_breakdown: payload.data.price_breakdown || null,
      status_logs: payload.data.status_logs || [],
      notifications: payload.data.notifications || [],
    };
  }

  return {
    shipment: payload,
    tracking_events: payload?.tracking_events || payload?.trackingEvents || [],
    tasks: payload?.tasks || [],
    price_breakdown: payload?.price_breakdown || null,
    status_logs: payload?.status_logs || [],
    notifications: payload?.notifications || [],
  };
}

export default function AdminShipmentDetailPage() {
  const params = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const response = await getAdminShipment(params.id);
      setData(normalizeShipmentResponse(response));
    } catch (error) {
      message.error(error?.response?.data?.message || 'Could not load shipment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (loading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (!data?.shipment) {
    return <Empty description="Shipment not found" />;
  }

  const shipment = data.shipment;

  const trackingEvents =
    data.tracking_events ||
    shipment.tracking_events ||
    shipment.trackingEvents ||
    [];

  const tasks = data.tasks || shipment.tasks || [];
  const priceBreakdown = data.price_breakdown || shipment.price_breakdown || null;
  const statusLogs = data.status_logs || shipment.status_logs || [];
  const notifications = data.notifications || shipment.notifications || [];

  const pickupLat = shipment.pickup_lat || shipment.pickup_latitude;
  const pickupLng = shipment.pickup_lng || shipment.pickup_longitude;
  const deliveryLat = shipment.delivery_lat || shipment.delivery_latitude;
  const deliveryLng = shipment.delivery_lng || shipment.delivery_longitude;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              {shipment.tracking_number}
            </Title>
            <Text type="secondary">
              Merchant Order: {shipment.merchant_order_id || '-'}
            </Text>
          </Col>

          <Col>
            <Space wrap>
              <WorkflowStatusTag status={shipment.status} />
              <WorkflowStatusTag status={shipment.payment_type} />
              <Button icon={<ReloadOutlined />} onClick={load}>
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Delivery Charge"
              value={Number(shipment.delivery_charge || shipment.delivery_fee || 0)}
              precision={2}
              prefix="NPR"
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="COD Amount"
              value={Number(shipment.cod_amount || 0)}
              precision={2}
              prefix="NPR"
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Collectable"
              value={Number(
                shipment.total_collectable_amount ||
                  shipment.cod_amount ||
                  0
              )}
              precision={2}
              prefix="NPR"
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Distance"
              value={Number(shipment.route_distance_km || 0)}
              precision={2}
              suffix="km"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Sender / Pickup">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Name">
                {shipment.sender_name || shipment.customer_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {shipment.sender_phone || shipment.customer_phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {shipment.sender_address || shipment.pickup_address || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Coordinates">
                {pickupLat && pickupLng ? `${pickupLat}, ${pickupLng}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Origin Branch">
                {branchLabel(
                  shipment.origin_branch ||
                    shipment.originBranch ||
                    shipment.pickup_branch ||
                    shipment.pickupBranch
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Origin Sub-Branch">
                {branchLabel(
                  shipment.origin_sub_branch ||
                    shipment.originSubBranch ||
                    shipment.pickup_sub_branch ||
                    shipment.pickupSubBranch
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Receiver / Delivery">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Name">
                {shipment.receiver_name || shipment.customer_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {shipment.receiver_phone || shipment.customer_phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {shipment.receiver_address || shipment.delivery_address || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Coordinates">
                {deliveryLat && deliveryLng ? `${deliveryLat}, ${deliveryLng}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Destination Branch">
                {branchLabel(
                  shipment.destination_branch ||
                    shipment.destinationBranch ||
                    shipment.delivery_branch ||
                    shipment.deliveryBranch
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Destination Sub-Branch">
                {branchLabel(
                  shipment.destination_sub_branch ||
                    shipment.destinationSubBranch ||
                    shipment.delivery_sub_branch ||
                    shipment.deliverySubBranch
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <ShipmentWorkflowActions
        shipment={shipment}
        loading={actionLoading}
        onReceiveOrigin={() =>
          runAction(
            () => receiveOriginSubBranch(shipment.id),
            'Received at origin sub-branch.'
          )
        }
        onDispatchNext={() =>
          runAction(
            () => dispatchNextRouteStep(shipment.id),
            'Next route step dispatched.'
          )
        }
        onReceiveCurrent={() =>
          runAction(
            () => receiveCurrentRouteStep(shipment.id),
            'Current route step received.'
          )
        }
      />

      <Card title="Pricing Breakdown">
        {priceBreakdown ? (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Base Pickup Fee">
              {formatMoney(Number(priceBreakdown.base_pickup_fee || 0))}
            </Descriptions.Item>
            <Descriptions.Item label="Base Delivery Fee">
              {formatMoney(Number(priceBreakdown.base_delivery_fee || 0))}
            </Descriptions.Item>
            <Descriptions.Item label="Transfer Fee">
              {formatMoney(Number(priceBreakdown.base_transfer_fee || 0))}
            </Descriptions.Item>
            <Descriptions.Item label="Pickup Extra">
              {formatMoney(Number(priceBreakdown.pickup_extra_charge || 0))}
            </Descriptions.Item>
            <Descriptions.Item label="Delivery Extra">
              {formatMoney(Number(priceBreakdown.delivery_extra_charge || 0))}
            </Descriptions.Item>
            <Descriptions.Item label="Weight Charge">
              {formatMoney(Number(priceBreakdown.weight_charge || 0))}
            </Descriptions.Item>
            <Descriptions.Item label="COD Fee">
              {formatMoney(Number(priceBreakdown.cod_fee || 0))}
            </Descriptions.Item>
            <Descriptions.Item label="Final Price">
              <strong>{formatMoney(Number(priceBreakdown.final_price || shipment.delivery_fee || shipment.delivery_charge || 0))}</strong>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="No pricing breakdown found" />
        )}
      </Card>

      <Card title="Shipment Tasks">
        <Table
          rowKey="id"
          dataSource={tasks}
          pagination={false}
          columns={[
            {
              title: 'Task',
              dataIndex: 'task_number',
              render: (value) => value || '-',
            },
            {
              title: 'Type',
              dataIndex: 'type',
              render: (value) => value || '-',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (value) => <WorkflowStatusTag status={value} />,
            },
            {
              title: 'Priority',
              dataIndex: 'priority',
              render: (value) => value || '-',
            },
            {
              title: 'Assigned Staff',
              dataIndex: 'assigned_staff_id',
              render: (value) => value || '-',
            },
            {
              title: 'Assigned Rider',
              dataIndex: 'assigned_rider_id',
              render: (value) => value || '-',
            },
            {
              title: 'Due At',
              dataIndex: 'due_at',
              render: (value) => formatDateTime(value),
            },
          ]}
        />
      </Card>

      <Card title="Tracking Timeline">
        {trackingEvents.length ? (
          <Timeline
            items={trackingEvents.map((event) => ({
              color: event.status === 'delivered' ? 'green' : 'blue',
              children: (
                <div>
                  <strong>{labelForStatus(event.status)}</strong>
                  <div>{event.description || event.note || '-'}</div>
                  <Text type="secondary">
                    {event.location_text ? `${event.location_text} • ` : ''}
                    {formatDateTime(event.created_at)}
                  </Text>
                </div>
              ),
            }))}
          />
        ) : (
          <Empty description="No tracking events found" />
        )}
      </Card>

      <Card title="Status Logs">
        <Table
          rowKey="id"
          dataSource={statusLogs}
          pagination={false}
          columns={[
            {
              title: 'Old Status',
              dataIndex: 'old_status',
              render: (value) => value || '-',
            },
            {
              title: 'New Status',
              dataIndex: 'new_status',
              render: (value) => <WorkflowStatusTag status={value} />,
            },
            {
              title: 'Note',
              dataIndex: 'note',
              render: (value) => value || '-',
            },
            {
              title: 'Created',
              dataIndex: 'created_at',
              render: (value) => formatDateTime(value),
            },
          ]}
        />
      </Card>

      <Card title="Notifications">
        <Table
          rowKey="id"
          dataSource={notifications}
          pagination={false}
          columns={[
            {
              title: 'Title',
              dataIndex: 'title',
              render: (value) => value || '-',
            },
            {
              title: 'Message',
              dataIndex: 'message',
              render: (value) => value || '-',
            },
            {
              title: 'Type',
              dataIndex: 'type',
              render: (value) => value || '-',
            },
            {
              title: 'Read',
              dataIndex: 'is_read',
              render: (value) => value ? 'Yes' : 'No',
            },
            {
              title: 'Created',
              dataIndex: 'created_at',
              render: (value) => formatDateTime(value),
            },
          ]}
        />
      </Card>
    </Space>
  );
}