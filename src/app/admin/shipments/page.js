"use client";

import { useCallback, useEffect, useState } from "react";

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
} from "antd";

import {
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { useRouter } from "next/navigation";

import { getShipments } from "@/services/merchantShipmentService";

import { usePermissions } from "@/hooks/usePermission";

import WorkflowStatusTag from "@/features/workflow/components/WorkflowStatusTag";

import { formatDateTime, formatMoney } from "@/config/workflowStatus";

const { Text } = Typography;

const STATUS_OPTIONS = [
  {
    label: "Booked",
    value: "booked",
  },
  {
    label: "Pickup Assigned",
    value: "pickup_assigned",
  },
  {
    label: "Picked Up",
    value: "picked_up",
  },
  {
    label: "In Transit",
    value: "in_transit",
  },
  {
    label: "Out For Delivery",
    value: "out_for_delivery",
  },
  {
    label: "Delivered",
    value: "delivered",
  },
  {
    label: "Delivery Failed",
    value: "delivery_failed",
  },
  {
    label: "Returned",
    value: "returned",
  },
];

export default function ShipmentsPage() {
  const router = useRouter();

  const {
    user,
    loading: authLoading,
    isSuperAdmin,
    branchId,
    can,
  } = usePermissions();

  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    service_type: "",
    payment_type: "",
  });

  /*
   * Permission
   *
   * Super admin is automatically allowed
   * by your usePermissions() implementation.
   *
   * Other users need:
   *
   * shipments.view
   */
  const canViewShipments = can("shipments.view");

  /*
   * Load shipments.
   *
   * IMPORTANT:
   *
   * We intentionally DO NOT call:
   *
   * /admin/branches/{branchId}/shipments
   *
   * There is no such Laravel route.
   *
   * Everyone calls:
   *
   * /admin/shipments
   *
   * The Laravel controller determines whether
   * the authenticated user is super admin or
   * branch scoped.
   */
  const load = useCallback(
    async (page = 1, pageSize = 20, currentFilters = filters) => {
      if (!user) {
        return;
      }

      if (!canViewShipments) {
        setRows([]);

        setPagination({
          current: 1,
          pageSize,
          total: 0,
        });

        return;
      }

      /*
       * Branch users must have a branch.
       *
       * Super admin does not need one.
       */
      if (!isSuperAdmin && !branchId) {
        setRows([]);

        setPagination({
          current: 1,
          pageSize,
          total: 0,
        });

        message.warning("No branch is assigned to your account.");

        return;
      }

      setLoading(true);

      try {
        const params = {
          page,
          per_page: pageSize,

          ...(currentFilters.search
            ? {
                search: currentFilters.search,
              }
            : {}),

          ...(currentFilters.status
            ? {
                status: currentFilters.status,
              }
            : {}),

          ...(currentFilters.service_type
            ? {
                service_type: currentFilters.service_type,
              }
            : {}),

          ...(currentFilters.payment_type
            ? {
                payment_type: currentFilters.payment_type,
              }
            : {}),
        };

        /*
         * BOTH super admin and branch users
         * call the same endpoint.
         *
         * Backend performs the actual scope.
         */
        const result = await getShipments(params);

        setRows(result?.list || []);

        setPagination({
          current: result?.currentPage || page,

          pageSize: result?.pageSize || pageSize,

          total: result?.total || 0,
        });
      } catch (error) {
        console.error("Could not load shipments:", error);

        message.error(
          error?.response?.data?.message || "Could not load shipments.",
        );

        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [user, canViewShipments, isSuperAdmin, branchId, filters],
  );

  /*
   * Initial load.
   *
   * Wait until usePermissions()
   * finishes loading the authenticated user.
   */
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      return;
    }

    if (!canViewShipments) {
      return;
    }

    load(1, pagination.pageSize, filters);
  }, [authLoading, user, canViewShipments, load]);

  /*
   * Search
   */
  const handleSearch = () => {
    load(1, pagination.pageSize, filters);
  };

  /*
   * Reset filters
   */
  const handleReset = () => {
    const resetFilters = {
      search: "",
      status: "",
      service_type: "",
      payment_type: "",
    };

    setFilters(resetFilters);

    load(1, pagination.pageSize, resetFilters);
  };

  /*
   * Refresh
   */
  const handleRefresh = () => {
    load(pagination.current, pagination.pageSize, filters);
  };

  /*
   * Table columns
   */
  const columns = [
    {
      title: "Tracking",
      dataIndex: "tracking_number",
      key: "tracking_number",
      fixed: "left",

      render: (value, row) => (
        <Space direction="vertical" size={0}>
          <Button
            type="link"
            style={{
              padding: 0,
              fontWeight: 700,
            }}
            onClick={() => router.push(`/admin/shipments/${row.id}`)}
          >
            {value || "—"}
          </Button>

          <Text
            type="secondary"
            style={{
              fontSize: 11,
            }}
          >
            Order: {row.merchant_order_id || "—"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Customer",
      key: "customer",

      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text
            strong
            style={{
              fontSize: 13,
            }}
          >
            {row.receiver_name || row.customer_name || "—"}
          </Text>

          <Text
            type="secondary"
            style={{
              fontSize: 11,
            }}
          >
            {row.receiver_phone || row.customer_phone || "—"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Route",
      key: "route",

      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Text
            style={{
              fontSize: 12,
            }}
          >
            {row.origin_branch?.name || row.sender_city || "—"}
          </Text>

          <Text
            type="secondary"
            style={{
              fontSize: 11,
            }}
          >
            → {row.destination_branch?.name || row.receiver_city || "—"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Service",
      dataIndex: "service_type",
      key: "service_type",

      render: (value) => (value ? <Tag color="blue">{value}</Tag> : "—"),
    },

    {
      title: "Payment",
      dataIndex: "payment_type",
      key: "payment_type",

      render: (value) => (
        <Tag color={value === "pod" ? "orange" : "green"}>{value || "—"}</Tag>
      ),
    },

    {
      title: "Fee",
      key: "fee",
      align: "right",

      render: (_, row) =>
        formatMoney(Number(row.delivery_charge || row.delivery_fee || 0)),
    },

    {
      title: "POD",
      key: "pod",
      align: "right",

      render: (_, row) => formatMoney(Number(row.pod_amount || 0)),
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",

      render: (value) => <WorkflowStatusTag status={value} />,
    },

    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",

      render: (value) => formatDateTime(value),
    },

    {
      title: "Action",
      key: "action",
      fixed: "right",

      render: (_, row) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/admin/shipments/${row.id}`)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  /*
   * Authentication loading
   */
  if (authLoading) {
    return (
      <Card loading>
        <Text>Loading shipment permissions...</Text>
      </Card>
    );
  }

  /*
   * No authenticated user
   */
  if (!user) {
    return (
      <Card>
        <Text type="danger">Unable to determine the authenticated user.</Text>
      </Card>
    );
  }

  /*
   * Permission denied
   */
  if (!canViewShipments) {
    return (
      <Card>
        <Space direction="vertical" size={4}>
          <Text
            strong
            style={{
              fontSize: 16,
            }}
          >
            Access Denied
          </Text>

          <Text type="secondary">
            You do not have permission to view shipments.
          </Text>
        </Space>
      </Card>
    );
  }

  /*
   * Branch user without branch
   */
  if (!isSuperAdmin && !branchId) {
    return (
      <Card>
        <Space direction="vertical" size={4}>
          <Text
            strong
            style={{
              fontSize: 16,
            }}
          >
            No Branch Assigned
          </Text>

          <Text type="secondary">
            Your account does not have an assigned branch, so shipments cannot
            be loaded.
          </Text>
        </Space>
      </Card>
    );
  }

  return (
    <Space
      direction="vertical"
      size={12}
      style={{
        width: "100%",
      }}
    >
      {/* Header */}
      <Card>
        <Space
          direction="vertical"
          size={12}
          style={{
            width: "100%",
          }}
        >
          <Space
            style={{
              justifyContent: "space-between",
              width: "100%",
            }}
            wrap
          >
            <div>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Shipments
              </Text>

              <br />

              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                }}
              >
                {isSuperAdmin
                  ? "Track and manage all courier shipments."
                  : "View and manage shipments assigned to your branch."}
              </Text>
            </div>

            <Space>
              {can("shipments.create") && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => router.push("/admin/shipments/create")}
                >
                  New Shipment
                </Button>
              )}

              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Space>

          {/* Filters */}
          <Space wrap>
            <Input
              allowClear
              style={{
                width: 240,
              }}
              placeholder="Search tracking / customer"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              onPressEnter={handleSearch}
            />

            <Select
              allowClear
              style={{
                width: 180,
              }}
              placeholder="Status"
              value={filters.status || undefined}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  status: value || "",
                }))
              }
              options={STATUS_OPTIONS}
            />

            <Select
              allowClear
              style={{
                width: 150,
              }}
              placeholder="Payment"
              value={filters.payment_type || undefined}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  payment_type: value || "",
                }))
              }
              options={[
                {
                  label: "POD",
                  value: "pod",
                },
                {
                  label: "Prepaid",
                  value: "prepaid",
                },
              ]}
            />

            <Button type="primary" onClick={handleSearch}>
              Search
            </Button>

            <Button onClick={handleReset}>Reset</Button>
          </Space>
        </Space>
      </Card>

      {/* Table */}
      <Card
        title={
          <Text
            style={{
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Shipment Directory
          </Text>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{
            x: 1200,
          }}
          pagination={{
            ...pagination,

            showSizeChanger: true,

            pageSizeOptions: ["20", "50", "100"],

            showTotal: (total, range) =>
              `${range[0]}–${range[1]} of ${total} shipments`,

            onChange: (page, pageSize) => {
              load(page, pageSize, filters);
            },
          }}
        />
      </Card>
    </Space>
  );
}
