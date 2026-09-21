"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
  Tag,
  Tabs,
  Statistic,
  Empty,
  Tooltip,
  Badge,
  Segmented,
} from "antd";

import {
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
  FilterOutlined,
  DeleteOutlined,
  CopyOutlined,
  DownloadOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";

import { useRouter } from "next/navigation";

import {
  getShipments,
} from "@/services/merchant/merchantShipmentService";

import WorkflowStatusTag from "@/features/workflow/components/WorkflowStatusTag";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";

const { Title, Text } = Typography;

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "pickup_requested",
  "pickup_assigned",
  "picked_up",
  "received_at_origin",
  "in_transit",
  "received_at_destination",
  "out_for_delivery",
  "delivered",
  "failed",
  "cancelled",
];

const SERVICE_OPTIONS = [
  "standard",
  "express",
  "same_day",
];

const PAYMENT_OPTIONS = [
  "prepaid",
  "pod",
  "to_pay",
];

function branchLabel(branch) {
  if (!branch) {
    return "-";
  }

  if (typeof branch === "string") {
    return branch;
  }

  return [
    branch.name,
    branch.area,
  ]
    .filter(Boolean)
    .join(", ") || "-";
}

// Helper for status statistics
function getStatusStats(shipments = []) {
  return {
    delivered: shipments.filter(s => s.status === 'delivered').length,
    pending: shipments.filter(s => s.status === 'pending').length,
    in_transit: shipments.filter(s => s.status === 'in_transit').length,
    failed: shipments.filter(s => s.status === 'failed').length,
  };
}

// Status color mapping for advanced visualization
function getStatusColor(status) {
  const colors = {
    pending: '#FBBF24',
    confirmed: '#3B82F6',
    pickup_requested: '#8B5CF6',
    pickup_assigned: '#8B5CF6',
    picked_up: '#6366F1',
    received_at_origin: '#6366F1',
    in_transit: '#0891B2',
    received_at_destination: '#0891B2',
    out_for_delivery: '#10B981',
    delivered: '#10B981',
    failed: '#EF4444',
    cancelled: '#6B7280',
  };
  return colors[status] || '#6B7280';
}

export default function ShipmentsPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [shipments, setShipments] =
    useState([]);

  const [viewMode, setViewMode] = useState('table'); // 'table' or 'list'

  const [showFilters, setShowFilters] = useState(false);

  const [pagination, setPagination] =
    useState({
      current: 1,
      pageSize: 20,
      total: 0,
    });

  const [filters, setFilters] =
    useState({
      search: "",
      status: undefined,
      service_type: undefined,
      payment_type: undefined,

      /*
       * IMPORTANT:
       *
       * branch_id should only be shown/used
       * by super admin.
       *
       * You can conditionally render this
       * after loading auth/permissions.
       */
      branch_id: undefined,
    });

  async function load(page = 1, pageSize = 20) {
    try {
      setLoading(true);

      const params = {
        page,
        per_page: pageSize,
      };

      if (filters.search?.trim()) {
        params.search =
          filters.search.trim();
      }

      if (filters.status) {
        params.status =
          filters.status;
      }

      if (filters.service_type) {
        params.service_type =
          filters.service_type;
      }

      if (filters.payment_type) {
        params.payment_type =
          filters.payment_type;
      }

      /*
       * Only send branch_id if explicitly selected.
       *
       * Backend MUST enforce authorization.
       */
      if (filters.branch_id) {
        params.branch_id =
          filters.branch_id;
      }

      const result =
        await getShipments(params);

      setShipments(
        result.list
      );

      setPagination({
        current:
          result.currentPage,

        pageSize:
          result.pageSize,

        total:
          result.total,
      });
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
        "Could not load shipments."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, 20);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter(key, value) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function resetFilters() {
    setFilters({
      search: "",
      status: undefined,
      service_type: undefined,
      payment_type: undefined,
      branch_id: undefined,
    });

    setTimeout(() => {
      load(1, pagination.pageSize);
    }, 0);
  }

  const columns = [
    {
      title: "Tracking Number",
      dataIndex: "tracking_number",
      key: "tracking_number",
      width: 140,
      render: (value, record) => (
        <Tooltip title="Click to view details">
          <Space direction="vertical" size={0}>
            <Button
              type="link"
              style={{ padding: 0, fontSize: "12px", fontWeight: "600" }}
              onClick={() =>
                router.push(
                  `/admin/shipments/${record.id}`
                )
              }
            >
              <CopyOutlined style={{ marginRight: "4px" }} />
              {value || "-"}
            </Button>

            <Text
              type="secondary"
              style={{ fontSize: "11px" }}
            >
              {record.merchant_order_id || "-"}
            </Text>
          </Space>
        </Tooltip>
      ),
    },

    {
      title: "Merchant",
      key: "merchant",
      width: 130,
      render: (_, record) => (
        <Text ellipsis style={{ fontSize: "12px" }}>
          {record.merchant?.name ||
          record.merchant_name ||
          "-"}
        </Text>
      ),
    },

    {
      title: "Route",
      key: "route",
      width: 200,
      render: (_, record) => (
        <Space size={0} style={{ fontSize: "12px" }}>
          <Text ellipsis style={{ maxWidth: "70px" }} title={branchLabel(record.origin_branch || record.originBranch)}>
            {branchLabel(
              record.origin_branch ||
              record.originBranch
            )}
          </Text>
          <ArrowRightOutlined style={{ color: "#0891B2" }} />
          <Text ellipsis style={{ maxWidth: "70px" }} title={branchLabel(record.destination_branch || record.destinationBranch)}>
            {branchLabel(
              record.destination_branch ||
              record.destinationBranch
            )}
          </Text>
        </Space>
      ),
    },

    {
      title: "Receiver",
      key: "receiver",
      width: 150,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: "12px", fontWeight: "500" }}>
            {record.receiver_name || "-"}
          </Text>

          <Text type="secondary" style={{ fontSize: "11px" }}>
            {record.receiver_phone || "-"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Service",
      dataIndex: "service_type",
      key: "service_type",
      width: 90,
      render: (value) =>
        value ? (
          <Tag
            color="blue"
            style={{ fontSize: "11px" }}
          >
            {String(value).replace("_", " ").toUpperCase()}
          </Tag>
        ) : (
          "-"
        ),
    },

    {
      title: "Payment",
      dataIndex: "payment_type",
      key: "payment_type",
      width: 90,
      render: (value) =>
        value ? (
          <WorkflowStatusTag
            status={value}
          />
        ) : (
          "-"
        ),
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (value, record) => (
        <Space direction="vertical" size={2}>
          <Badge 
            color={getStatusColor(value)}
            text={
              <Text style={{ fontSize: "11px", fontWeight: "600" }}>
                {value?.replace(/_/g, " ").toUpperCase()}
              </Text>
            }
          />
          {record?.is_transfer ? (
            <Tag color="orange" style={{ margin: 0, fontSize: "10px" }}>
              Transfer{record?.transfer_stage_label ? ` ┬╖ ${record.transfer_stage_label}` : ""}
            </Tag>
          ) : null}
        </Space>
      ),
    },

    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View Details">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                router.push(
                  `/admin/shipments/${record.id}`
                )
              }
              style={{ background: "#0891B2", borderColor: "#0891B2" }}
            >
              View
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Space
      direction="vertical"
      size={16}
      style={{
        width: "100%",
      }}
    >
      {/* Enhanced Page Header */}
      <AdminPageHeader
        title="Shipments"
        subtitle="Manage and track all merchant shipments in real-time"
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => load(pagination.current, pagination.pageSize)}
            loading={loading}
            style={{ background: "#fff", color: "#0891B2", borderColor: "#0891B2" }}
          >
            Refresh
          </Button>
        }
      />

      {/* Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-stat-card" style={{ borderLeft: "4px solid #10B981" }}>
            <Space direction="vertical" size={0} style={{ width: "100%" }}>
              <Text style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>
                <CheckCircleOutlined style={{ marginRight: "4px" }} />
                Delivered
              </Text>
              <Title level={3} style={{ margin: "4px 0 0 0", color: "#10B981" }}>
                {getStatusStats(shipments).delivered}
              </Title>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-stat-card" style={{ borderLeft: "4px solid #0891B2" }}>
            <Space direction="vertical" size={0} style={{ width: "100%" }}>
              <Text style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>
                <ClockCircleOutlined style={{ marginRight: "4px" }} />
                In Transit
              </Text>
              <Title level={3} style={{ margin: "4px 0 0 0", color: "#0891B2" }}>
                {getStatusStats(shipments).in_transit}
              </Title>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-stat-card" style={{ borderLeft: "4px solid #FBBF24" }}>
            <Space direction="vertical" size={0} style={{ width: "100%" }}>
              <Text style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>
                <ExclamationCircleOutlined style={{ marginRight: "4px" }} />
                Pending
              </Text>
              <Title level={3} style={{ margin: "4px 0 0 0", color: "#FBBF24" }}>
                {getStatusStats(shipments).pending}
              </Title>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="admin-stat-card" style={{ borderLeft: "4px solid #EF4444" }}>
            <Space direction="vertical" size={0} style={{ width: "100%" }}>
              <Text style={{ fontSize: "11px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>
                <StopOutlined style={{ marginRight: "4px" }} />
                Failed
              </Text>
              <Title level={3} style={{ margin: "4px 0 0 0", color: "#EF4444" }}>
                {getStatusStats(shipments).failed}
              </Title>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Enhanced Filters Section */}
      <Card 
        title={
          <Space>
            <FilterOutlined style={{ color: "#0891B2" }} />
            <span>Filters & Search</span>
          </Space>
        } 
        className="admin-card"
        extra={
          <Button 
            type="text" 
            size="small"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? "Hide" : "Show"} Filters
          </Button>
        }
        style={{ marginBottom: showFilters ? 16 : 0 }}
      >
        {showFilters && (
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8} lg={6}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Tracking / Order / Receiver"
                value={filters.search}
                onChange={(event) =>
                  updateFilter(
                    "search",
                    event.target.value
                  )
                }
                onPressEnter={() =>
                  load(
                    1,
                    pagination.pageSize
                  )
                }
              />
            </Col>

            <Col xs={12} md={5}>
              <Select
                allowClear
                style={{
                  width: "100%",
                }}
                placeholder="Status"
                value={filters.status}
                onChange={(value) =>
                  updateFilter(
                    "status",
                    value
                  )
                }
                options={STATUS_OPTIONS.map(
                  (value) => ({
                    label: value
                      .replaceAll("_", " ")
                      .toUpperCase(),
                    value,
                  })
                )}
              />
            </Col>

            <Col xs={12} md={5}>
              <Select
                allowClear
                style={{
                  width: "100%",
                }}
                placeholder="Service"
                value={
                  filters.service_type
                }
                onChange={(value) =>
                  updateFilter(
                    "service_type",
                    value
                  )
                }
                options={SERVICE_OPTIONS.map(
                  (value) => ({
                    label:
                      value.toUpperCase(),
                    value,
                  })
                )}
              />
            </Col>

            <Col xs={12} md={5}>
              <Select
                allowClear
                style={{
                  width: "100%",
                }}
                placeholder="Payment"
                value={
                  filters.payment_type
                }
                onChange={(value) =>
                  updateFilter(
                    "payment_type",
                    value
                  )
                }
                options={PAYMENT_OPTIONS.map(
                  (value) => ({
                    label:
                      value.toUpperCase(),
                    value,
                  })
                )}
              />
            </Col>

            <Col xs={12} md={3}>
              <Button
                type="primary"
                block
                onClick={() =>
                  load(
                    1,
                    pagination.pageSize
                  )
                }
                style={{ background: "#0891B2", borderColor: "#0891B2" }}
              >
                Search
              </Button>
            </Col>

            <Col xs={12} md={3}>
              <Button
                block
                onClick={resetFilters}
              >
                Reset
              </Button>
            </Col>

            <Col xs={24}>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Total Results: <strong>{pagination.total} shipments</strong>
              </Text>
            </Col>
          </Row>
        )}
      </Card>

      {/* View Mode Selector */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Space>
            <Text strong>View:</Text>
            <Segmented 
              value={viewMode} 
              onChange={setViewMode}
              options={[
                { label: 'Table View', value: 'table' },
                { label: 'List View', value: 'list' },
              ]}
            />
          </Space>
        </Col>
      </Row>

      {/* Main Table/List Section */}
      <Card className="admin-card" style={{ width: "100%" }}>
        {shipments.length === 0 && !loading ? (
          <Empty description="No shipments found" style={{ padding: "40px 0" }} />
        ) : (
          <Table
            className="compact"
            rowKey="id"
            loading={loading}
            dataSource={shipments}
            columns={columns}
            scroll={{
              x: 1500,
            }}
            pagination={{
              current:
                pagination.current,

              pageSize:
                pagination.pageSize,

              total:
                pagination.total,

              showSizeChanger: true,

              showTotal: (total) =>
                `${total} shipments`,

              onChange: (
                page,
                pageSize
              ) => {
                load(
                  page,
                  pageSize
                );
              },
            }}
            rowClassName={(record) => {
              const classes = [];
              if (record.status === 'delivered') classes.push('row-success');
              if (record.status === 'failed') classes.push('row-danger');
              if (record.status === 'in_transit') classes.push('row-info');
              return classes.join(' ');
            }}
          />
        )}
      </Card>
    </Space>
  );
}
