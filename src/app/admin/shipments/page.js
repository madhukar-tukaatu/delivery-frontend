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
} from "antd";

import {
  ReloadOutlined,
  SearchOutlined,
  EyeOutlined,
} from "@ant-design/icons";

import { useRouter } from "next/navigation";

import {
  getShipments,
} from "@/services/merchantShipmentService";

import WorkflowStatusTag from "@/features/workflow/components/WorkflowStatusTag";

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

export default function ShipmentsPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [shipments, setShipments] =
    useState([]);

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
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() =>
              router.push(
                `/admin/shipments/${record.id}`
              )
            }
          >
            {value || "-"}
          </Button>

          <Text
            type="secondary"
            style={{ fontSize: 12 }}
          >
            {record.merchant_order_id || "-"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Merchant",
      key: "merchant",
      render: (_, record) =>
        record.merchant?.name ||
        record.merchant_name ||
        "-",
    },

    {
      title: "Origin",
      key: "origin",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {branchLabel(
              record.origin_branch ||
              record.originBranch
            )}
          </Text>

          <Text type="secondary">
            {branchLabel(
              record.origin_sub_branch ||
              record.originSubBranch
            )}
          </Text>
        </Space>
      ),
    },

    {
      title: "Current Location",
      key: "current",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {branchLabel(
              record.current_branch ||
              record.currentBranch
            )}
          </Text>

          <Text type="secondary">
            {branchLabel(
              record.current_sub_branch ||
              record.currentSubBranch
            )}
          </Text>
        </Space>
      ),
    },

    {
      title: "Destination",
      key: "destination",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {branchLabel(
              record.destination_branch ||
              record.destinationBranch
            )}
          </Text>

          <Text type="secondary">
            {branchLabel(
              record.destination_sub_branch ||
              record.destinationSubBranch
            )}
          </Text>
        </Space>
      ),
    },

    {
      title: "Receiver",
      key: "receiver",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>
            {record.receiver_name || "-"}
          </Text>

          <Text type="secondary">
            {record.receiver_phone || "-"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Service",
      dataIndex: "service_type",
      key: "service_type",
      render: (value) =>
        value ? (
          <Tag>
            {String(value).toUpperCase()}
          </Tag>
        ) : (
          "-"
        ),
    },

    {
      title: "Payment",
      dataIndex: "payment_type",
      key: "payment_type",
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
      render: (value) => (
        <WorkflowStatusTag
          status={value}
        />
      ),
    },

    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() =>
            router.push(
              `/admin/shipments/${record.id}`
            )
          }
        >
          View
        </Button>
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
      <Card>
        <Row
          justify="space-between"
          align="middle"
          gutter={[16, 16]}
        >
          <Col>
            <Title
              level={3}
              style={{ margin: 0 }}
            >
              Shipments
            </Title>

            <Text type="secondary">
              Branch shipment operations
            </Text>
          </Col>

          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() =>
                load(
                  pagination.current,
                  pagination.pageSize
                )
              }
              loading={loading}
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      <Card title="Shipment Filters">
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
        </Row>
      </Card>

      <Card>
        <Table
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
        />
      </Card>
    </Space>
  );
}