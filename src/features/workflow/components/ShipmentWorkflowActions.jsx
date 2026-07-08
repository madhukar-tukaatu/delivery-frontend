'use client';

import { Button, Card, Descriptions, Empty, Space, Table, Tag, Typography, message } from 'antd';
import WorkflowStatusTag from './WorkflowStatusTag';
import { formatDateTime, formatMoney, labelForStatus } from '@/config/workflowStatus';

const { Text } = Typography;

function firstPendingOrReadyStep(steps = []) {
  return steps.find((step) => ['pending', 'ready'].includes(step.status));
}

function firstInTransitStep(steps = []) {
  return steps.find((step) => step.status === 'in_transit');
}

export default function ShipmentWorkflowActions({ shipment, onReceiveOrigin, onDispatchNext, onReceiveCurrent }) {
  if (!shipment) return <Empty />;

  const steps = shipment.route_steps || shipment.routeSteps || [];
  const inTransit = firstInTransitStep(steps);
  const nextStep = firstPendingOrReadyStep(steps);

  const routeColumns = [
    { title: 'Step', dataIndex: 'sequence', width: 70, render: (v) => <Tag>{v}</Tag> },
    { title: 'From', render: (_, row) => <div><strong>{row.from_branch?.name || row.fromBranch?.name || '-'}</strong><br /><Text type="secondary">{row.from_branch?.address || row.fromBranch?.address || '-'}</Text></div> },
    { title: 'To', render: (_, row) => <div><strong>{row.to_branch?.name || row.toBranch?.name || '-'}</strong><br /><Text type="secondary">{row.to_branch?.address || row.toBranch?.address || '-'}</Text></div> },
    { title: 'Distance', dataIndex: 'distance_km', render: (v) => `${Number(v || 0).toFixed(2)} km` },
    { title: 'Fee', dataIndex: 'fee', render: (v) => formatMoney(v) },
    { title: 'Status', dataIndex: 'status', render: (v) => <WorkflowStatusTag status={v} /> },
    { title: 'Departed', dataIndex: 'departed_at', render: formatDateTime },
    { title: 'Received', dataIndex: 'received_at', render: formatDateTime },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="Current Workflow Action">
        <Descriptions bordered column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Shipment Status"><WorkflowStatusTag status={shipment.status} /></Descriptions.Item>
          <Descriptions.Item label="Merchant Status">{labelForStatus(shipment.merchant_status)}</Descriptions.Item>
          <Descriptions.Item label="Current Branch">{shipment.current_branch?.name || shipment.currentBranch?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Current Sub-Branch">{shipment.current_sub_branch?.name || shipment.currentSubBranch?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Next Route Step">
            {nextStep ? `${nextStep.from_branch?.name || nextStep.fromBranch?.name || '-'} → ${nextStep.to_branch?.name || nextStep.toBranch?.name || '-'}` : 'No pending step'}
          </Descriptions.Item>
          <Descriptions.Item label="In Transit Step">
            {inTransit ? `${inTransit.from_branch?.name || inTransit.fromBranch?.name || '-'} → ${inTransit.to_branch?.name || inTransit.toBranch?.name || '-'}` : 'None'}
          </Descriptions.Item>
        </Descriptions>

        <Space style={{ marginTop: 16 }} wrap>
          <Button
            type="primary"
            disabled={shipment.status !== 'picked_up'}
            onClick={onReceiveOrigin}
          >
            Receive at Origin Sub-Branch
          </Button>

          <Button
            type="primary"
            disabled={!nextStep || !!inTransit || ['booked', 'pickup_assigned'].includes(shipment.status)}
            onClick={onDispatchNext}
          >
            Dispatch Next Route Step
          </Button>

          <Button
            type="primary"
            disabled={!inTransit}
            onClick={onReceiveCurrent}
          >
            Receive Current Route Step
          </Button>
        </Space>

        {shipment.status === 'pickup_assigned' ? (
          <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            Pickup staff must mark this parcel as picked up before branch processing can continue.
          </Text>
        ) : null}
      </Card>

      <Card title="Route Steps">
        <Table rowKey="id" columns={routeColumns} dataSource={steps} pagination={false} scroll={{ x: true }} />
      </Card>
    </Space>
  );
}
