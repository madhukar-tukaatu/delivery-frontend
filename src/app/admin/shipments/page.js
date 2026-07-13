'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import WorkflowStatusTag from '@/features/workflow/components/WorkflowStatusTag';
import { getAdminShipments } from '@/services/workflowService';
import { formatDateTime, formatMoney } from '@/config/workflowStatus';

const { Title, Text } = Typography;

export default function AdminShipmentsPage() {
  const router = useRouter();

  const [shipments, setShipments] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    service_type: '',
    payment_type: '',
  });

  const load = async (page = 1, pageSize = 20) => {
    try {
      setLoading(true);

      const response = await getAdminShipments({
        page,
        per_page: pageSize,
        ...filters,
      });

      const payload = response?.data || response;

      const rows =
        payload?.data?.data ||
        payload?.data ||
        payload?.shipments?.data ||
        payload?.shipments ||
        [];

      const meta =
        payload?.data ||
        payload?.shipments ||
        {};

      setShipments(Array.isArray(rows) ? rows : []);

      setPagination({
        current: meta.current_page || page,
        pageSize: meta.per_page || pageSize,
        total: meta.total || rows.length || 0,
      });
    } catch (error) {
      message.error(error?.response?.data?.message || 'Could not load shipments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    load(1, pagination.pageSize);
  };

  const handleReset = () => {
    setFilters({
      search: '',
      status: '',
      service_type: '',
      payment_type: '',
    });

    setTimeout(() => load(1, pagination.pageSize), 0);
  };

  const columns = [
    {
      title: 'Tracking',
      dataIndex: 'tracking_number',
      key: 'tracking_number',
      fixed: 'left',
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Button
            type="link"
            style={{ padding: 0, fontWeight: 700 }}
            onClick={() => router.push(`/admin/shipments/${record.id}`)}
          >
            {value || '-'}
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Order: {record.merchant_order_id || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.receiver_name || record.customer_name || '-'}</Text>
          <Text type="secondary">{record.receiver_phone || record.customer_phone || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Route',
      key: 'route',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>
            {record.origin_branch?.name ||
              record.origin_branch_name ||
              record.pickup_branch_name ||
              record.sender_city ||
              '-'}
          </Text>
          <Text type="secondary">
            →{' '}
            {record.destination_branch?.name ||
              record.destination_branch_name ||
              record.delivery_branch_name ||
              record.receiver_city ||
              '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Service',
      dataIndex: 'service_type',
      key: 'service_type',
      render: (value) => value ? <Tag color="blue">{value}</Tag> : '-',
    },
    {
      title: 'Payment',
      dataIndex: 'payment_type',
      key: 'payment_type',
      render: (value) => (
        <Tag color={value === 'cod' ? 'orange' : 'green'}>
          {value || '-'}
        </Tag>
      ),
    },
    {
      title: 'Delivery Fee',
      key: 'delivery_fee',
      align: 'right',
      render: (_, record) =>
        formatMoney(
          Number(record.delivery_charge || record.delivery_fee || 0)
        ),
    },
    {
      title: 'COD',
      key: 'cod_amount',
      align: 'right',
      render: (_, record) => formatMoney(Number(record.cod_amount || 0)),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => <WorkflowStatusTag status={value} />,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => formatDateTime(value),
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => router.push(`/admin/shipments/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }} wrap>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Shipments
              </Title>
              <Text type="secondary">
                View, track and manage all courier shipments.
              </Text>
            </div>

            <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize)}>
              Refresh
            </Button>
          </Space>

          <Space wrap>
            <Input
              allowClear
              style={{ width: 260 }}
              placeholder="Search tracking/order/customer"
              value={filters.search}
              prefix={<SearchOutlined />}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onPressEnter={handleSearch}
            />

            <Select
              allowClear
              style={{ width: 190 }}
              placeholder="Status"
              value={filters.status || undefined}
              onChange={(value) => setFilters({ ...filters, status: value || '' })}
              options={[
                { label: 'Booked', value: 'booked' },
                { label: 'Pickup Assigned', value: 'pickup_assigned' },
                { label: 'Picked Up', value: 'picked_up' },
                { label: 'In Transit', value: 'in_transit' },
                { label: 'Out For Delivery', value: 'out_for_delivery' },
                { label: 'Delivered', value: 'delivered' },
                { label: 'Delivery Failed', value: 'delivery_failed' },
                { label: 'Returned', value: 'returned' },
                { label: 'Pickup Pending', value: 'pickup_pending' },
              ]}
            />

            <Select
              allowClear
              style={{ width: 160 }}
              placeholder="Service"
              value={filters.service_type || undefined}
              onChange={(value) => setFilters({ ...filters, service_type: value || '' })}
              options={[
                { label: 'Standard', value: 'standard' },
                { label: 'Express', value: 'express' },
                { label: 'Same Day', value: 'same_day' },
              ]}
            />

            <Select
              allowClear
              style={{ width: 150 }}
              placeholder="Payment"
              value={filters.payment_type || undefined}
              onChange={(value) => setFilters({ ...filters, payment_type: value || '' })}
              options={[
                { label: 'COD', value: 'cod' },
                { label: 'Prepaid', value: 'prepaid' },
              ]}
            />

            <Button type="primary" onClick={handleSearch}>
              Search
            </Button>

            <Button onClick={handleReset}>
              Reset
            </Button>
          </Space>
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={shipments}
          scroll={{ x: 1300 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `${total} shipments`,
            onChange: (page, pageSize) => load(page, pageSize),
          }}
        />
      </Card>
    </Space>
  );
}