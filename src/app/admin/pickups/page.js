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
  Tag,
  Typography,
  message,
} from "antd";

import {
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { useRouter } from "next/navigation";

import {
  getPickups,
} from "@/services/pickupService";

const {
  Title,
  Text,
} = Typography;

const STATUS_OPTIONS = [
  "requested",
  "pending",
  "assigned",
  "started",
  "arrived",
  "collecting",
  "completed",
  "failed",
  "cancelled",
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

function statusTag(status) {
  if (!status) {
    return "-";
  }

  return (
    <Tag>
      {String(status)
        .replaceAll("_", " ")
        .toUpperCase()}
    </Tag>
  );
}

export default function PickupsPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [pickups, setPickups] =
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
      branch_id: undefined,
    });

  async function load(
    page = 1,
    pageSize = 20
  ) {
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

      /*
       * Super admin can use this.
       *
       * Branch users must still be
       * restricted by backend.
       */
      if (filters.branch_id) {
        params.branch_id =
          filters.branch_id;
      }

      const result =
        await getPickups(params);

      setPickups(
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
        "Could not load pickups."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateFilter(
    key,
    value
  ) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function resetFilters() {
    setFilters({
      search: "",
      status: undefined,
      branch_id: undefined,
    });

    setTimeout(() => {
      load(
        1,
        pagination.pageSize
      );
    }, 0);
  }

  const columns = [
    {
      title: "Pickup Request",
      dataIndex: "request_number",
      key: "request_number",
      render: (
        value,
        record
      ) => (
        <Button
          type="link"
          style={{
            padding: 0,
          }}
          onClick={() =>
            router.push(
              `/admin/pickups/${record.id}`
            )
          }
        >
          {value || `#${record.id}`}
        </Button>
      ),
    },

    {
      title: "Merchant",
      key: "merchant",
      render: (_, record) =>
        record.merchant?.name ||
        "-",
    },

    {
      title: "Pickup",
      key: "pickup",
      render: (_, record) => (
        <Space
          direction="vertical"
          size={0}
        >
          <Text strong>
            {record.pickup_name ||
              "-"}
          </Text>

          <Text type="secondary">
            {record.pickup_phone ||
              "-"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Branch",
      key: "branch",
      render: (_, record) => (
        <Space
          direction="vertical"
          size={0}
        >
          <Text strong>
            {branchLabel(
              record.branch
            )}
          </Text>

          <Text type="secondary">
            {branchLabel(
              record.subBranch ||
              record.sub_branch
            )}
          </Text>
        </Space>
      ),
    },

    {
      title: "Pickup Location",
      key: "pickup_location",
      render: (_, record) =>
        record.pickupLocation?.name ||
        record.pickup_location?.name ||
        "-",
    },

    {
      title: "Assigned",
      key: "assigned",
      render: (_, record) =>
        record.assignedStaff?.name ||
        record.assigned_staff?.name ||
        record.assigned_to ||
        "-",
    },

    {
      title: "Shipments",
      key: "shipments",
      render: (_, record) => {
        const count =
          Array.isArray(
            record.shipments
          )
            ? record.shipments.length
            : record.shipment_count ?? 0;

        return count;
      },
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: statusTag,
    },

    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() =>
            router.push(
              `/admin/pickups/${record.id}`
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
              style={{
                margin: 0,
              }}
            >
              Pickup Operations
            </Title>

            <Text type="secondary">
              Branch pickup requests
            </Text>
          </Col>

          <Col>
            <Button
              icon={
                <ReloadOutlined />
              }
              loading={loading}
              onClick={() =>
                load(
                  pagination.current,
                  pagination.pageSize
                )
              }
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      <Card title="Pickup Filters">
        <Row gutter={[12, 12]}>
          <Col
            xs={24}
            md={10}
          >
            <Input
              allowClear
              prefix={
                <SearchOutlined />
              }
              placeholder="Request number / pickup name / phone"
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

          <Col
            xs={12}
            md={6}
          >
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
                  value,
                  label:
                    value
                      .replaceAll(
                        "_",
                        " "
                      )
                      .toUpperCase(),
                })
              )}
            />
          </Col>

          <Col
            xs={12}
            md={4}
          >
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

          <Col
            xs={12}
            md={4}
          >
            <Button
              block
              onClick={
                resetFilters
              }
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
          dataSource={pickups}
          columns={columns}
          scroll={{
            x: 1200,
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
              `${total} pickup requests`,

            onChange: (
              page,
              pageSize
            ) =>
              load(
                page,
                pageSize
              ),
          }}
        />
      </Card>
    </Space>
  );
}