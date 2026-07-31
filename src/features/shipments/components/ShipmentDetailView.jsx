'use client';

import {
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Table,
  Tag,
  Timeline,
  Typography,
  Button,
  message,
} from 'antd';

import {
  EnvironmentOutlined,
  ShopOutlined,
  UserOutlined,
  CarOutlined,
  DollarOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons';

import {
//   prettyStatus,
  statusColor,
  routeStepStatusLabel,
  routeStepStatusColor,
  formatMoney,
  formatDateTime,
  prettyStatus,
} from '@/config/shipmentStatus';

const { Title, Text } = Typography;

const nextStatusOptions = [
  { value: 'picked_up', label: 'Mark as Picked Up' },
  { value: 'received_at_origin_sub_branch', label: 'Received at Origin Sub-Branch' },
  { value: 'transferred_to_origin_branch', label: 'Transferred to Origin Branch' },
  { value: 'received_at_origin_branch', label: 'Received at Origin Branch' },
  { value: 'dispatched_to_transit_hub', label: 'Dispatched to Transit Hub' },
  { value: 'received_at_transit_hub', label: 'Received at Transit Hub' },
  { value: 'dispatched_to_destination_branch', label: 'Dispatched to Destination Branch' },
  { value: 'received_at_destination_branch', label: 'Received at Destination Branch' },
  { value: 'transferred_to_destination_sub_branch', label: 'Transferred to Destination Sub-Branch' },
  { value: 'received_at_destination_sub_branch', label: 'Received at Destination Sub-Branch' },
  { value: 'assigned_to_rider', label: 'Assigned to Rider' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'delivery_failed', label: 'Delivery Failed' },
  { value: 'return_initiated', label: 'Return Initiated' },
];

function branchName(branch) {
  if (!branch) return '-';
  return `${branch.name}${branch.area ? `, ${branch.area}` : ''}`;
}

function coordinates(lat, lng) {
  if (!lat || !lng) return '-';
  return `${lat}, ${lng}`;
}

export default function ShipmentDetailView({ shipment, onUpdateStatus }) {
  const [form] = Form.useForm();

  if (!shipment) {
    return <Empty description="Shipment not found" />;
  }

  const charge = shipment.delivery_charge_breakdown || {};
  const routeSteps = shipment.route_steps || [];
  const trackingEvents = shipment.tracking_events || [];

  const handleSubmit = async (values) => {
    try {
      await onUpdateStatus(values);
      form.resetFields();
      message.success('Shipment status updated.');
    } catch (error) {
      message.error(error?.response?.data?.message || 'Could not update status.');
    }
  };

  const routeColumns = [
    {
      title: 'Step',
      dataIndex: 'sequence',
      width: 70,
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: 'From',
      render: (_, row) => (
        <div>
          <strong>{row.from_branch?.name || '-'}</strong>
          <br />
          <Text type="secondary">{row.from_branch?.address || '-'}</Text>
        </div>
      ),
    },
    {
      title: 'To',
      render: (_, row) => (
        <div>
          <strong>{row.to_branch?.name || '-'}</strong>
          <br />
          <Text type="secondary">{row.to_branch?.address || '-'}</Text>
        </div>
      ),
    },
    {
      title: 'Distance',
      dataIndex: 'distance_km',
      render: (value) => `${Number(value || 0).toFixed(2)} km`,
    },
    {
      title: 'Fee',
      dataIndex: 'fee',
      render: (value) => formatMoney(value),
    },
    {
      title: 'ETA',
      dataIndex: 'estimated_hours',
      render: (value) => `${value || 0} hrs`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => (
        <Tag color={routeStepStatusColor(value)}>
          {routeStepStatusLabel(value)}
        </Tag>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={18} style={{ width: '100%' }}>
      <Card>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space direction="vertical" size={2}>
              <Title level={3} style={{ margin: 0 }}>
                Shipment {shipment.tracking_number}
              </Title>
              <Text type="secondary">
                Merchant Order: {shipment.merchant_order_id || '-'}
              </Text>
            </Space>
          </Col>

          <Col>
            <Space>
              <Tag color={statusColor(shipment.status)} style={{ fontSize: 14, padding: '4px 10px' }}>
                {prettyStatus(shipment.status)}
              </Tag>

              <Tag color="blue" style={{ fontSize: 14, padding: '4px 10px' }}>
                {shipment.payment_type?.toUpperCase()}
              </Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Delivery Charge"
              value={Number(shipment.delivery_charge || 0)}
              prefix="NPR"
              precision={2}
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="POD Amount"
              value={Number(shipment.pod_amount || 0)}
              prefix="NPR"
              precision={2}
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Total Collectable"
              value={Number(shipment.total_collectable_amount || 0)}
              prefix="NPR"
              precision={2}
            />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Route Distance"
              value={Number(shipment.route_distance_km || 0)}
              suffix="km"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Card title={<><ShopOutlined /> Merchant & Shipment Details</>}>
        <Descriptions bordered column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Merchant">
            {shipment.merchant?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Source">
            {shipment.source?.replaceAll('_', ' ') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Parcel Type">
            {shipment.parcel_type || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Weight">
            {shipment.weight || 0} kg
          </Descriptions.Item>
          <Descriptions.Item label="Quantity">
            {shipment.quantity || 1}
          </Descriptions.Item>
          <Descriptions.Item label="Estimated Delivery">
            {shipment.estimated_delivery_time || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Created At">
            {formatDateTime(shipment.created_at)}
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated">
            {formatDateTime(shipment.updated_at)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<><UserOutlined /> Pickup / Sender</>}>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Name">{shipment.sender_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{shipment.sender_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Address">{shipment.sender_address || '-'}</Descriptions.Item>
              <Descriptions.Item label="City">{shipment.sender_city || '-'}</Descriptions.Item>
              <Descriptions.Item label="Area">{shipment.sender_area || '-'}</Descriptions.Item>
              <Descriptions.Item label="Coordinates">
                {coordinates(shipment.pickup_lat, shipment.pickup_lng)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<><EnvironmentOutlined /> Delivery / Receiver</>}>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Name">{shipment.receiver_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{shipment.receiver_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Address">{shipment.receiver_address || '-'}</Descriptions.Item>
              <Descriptions.Item label="City">{shipment.receiver_city || '-'}</Descriptions.Item>
              <Descriptions.Item label="Area">{shipment.receiver_area || '-'}</Descriptions.Item>
              <Descriptions.Item label="Coordinates">
                {coordinates(shipment.delivery_lat, shipment.delivery_lng)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title={<><CarOutlined /> Branch Routing</>}>
        <Steps
          current={1}
          items={[
            {
              title: 'Origin Sub-Branch',
              description: branchName(shipment.origin_sub_branch),
            },
            {
              title: 'Origin Branch',
              description: branchName(shipment.origin_branch),
            },
            {
              title: 'Destination Branch',
              description: branchName(shipment.destination_branch),
            },
            {
              title: 'Destination Sub-Branch',
              description: branchName(shipment.destination_sub_branch) || 'Direct branch delivery',
            },
          ]}
        />

        <Divider />

        <Descriptions bordered column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Current Branch">
            {branchName(shipment.current_branch)}
          </Descriptions.Item>
          <Descriptions.Item label="Current Sub-Branch">
            {branchName(shipment.current_sub_branch)}
          </Descriptions.Item>
          <Descriptions.Item label="Origin Branch">
            {branchName(shipment.origin_branch)}
          </Descriptions.Item>
          <Descriptions.Item label="Destination Branch">
            {branchName(shipment.destination_branch)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Route Movement Plan">
        <Table
          rowKey="id"
          columns={routeColumns}
          dataSource={routeSteps}
          pagination={false}
          scroll={{ x: true }}
        />
      </Card>

      <Card title={<><DollarOutlined /> Charges Breakdown</>}>
        <Descriptions bordered column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Pickup Fee">{formatMoney(charge.pickup_fee)}</Descriptions.Item>
          <Descriptions.Item label="Route Fee">{formatMoney(charge.route_fee)}</Descriptions.Item>
          <Descriptions.Item label="Delivery Fee">{formatMoney(charge.delivery_fee)}</Descriptions.Item>
          <Descriptions.Item label="Weight Fee">{formatMoney(charge.weight_fee)}</Descriptions.Item>
          <Descriptions.Item label="POD Fee">{formatMoney(charge.pod_fee)}</Descriptions.Item>
          <Descriptions.Item label="Remote Area Fee">{formatMoney(charge.remote_area_fee)}</Descriptions.Item>
          <Descriptions.Item label="Total Delivery Charge">
            <strong>{formatMoney(charge.total || shipment.delivery_charge)}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="Total Collectable">
            <strong>{formatMoney(shipment.total_collectable_amount)}</strong>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Update Shipment Status">
        <Form form={form} layout="inline" onFinish={handleSubmit}>
          <Form.Item
            name="status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select
              placeholder="Select next status"
              style={{ width: 300 }}
              options={nextStatusOptions}
            />
          </Form.Item>

          <Form.Item name="remarks">
            <Input placeholder="Remarks" style={{ width: 260 }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Update
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title={<><FieldTimeOutlined /> Tracking Timeline</>}>
        {trackingEvents.length ? (
          <Timeline
            items={trackingEvents.map((event) => ({
              color: statusColor(event.status),
              children: (
                <div>
                  <strong>{prettyStatus(event.status)}</strong>
                  <div>{event.description || '-'}</div>
                  <Text type="secondary">
                    {event.location_text ? `${event.location_text} • ` : ''}
                    {formatDateTime(event.created_at)}
                  </Text>
                </div>
              ),
            }))}
          />
        ) : (
          <Empty description="No tracking events yet" />
        )}
      </Card>
    </Space>
  );
}