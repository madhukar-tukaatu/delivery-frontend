"use client";

import {
  Button,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";

import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  StopOutlined,
  CheckOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

function getRoleName(user) {
  if (user?.roles?.length) {
    return user.roles
      .map((role) => role.name)
      .join(", ");
  }

  return user?.role || "-";
}

function getStatus(user) {
  if (
    user?.is_active === false ||
    user?.active === false ||
    user?.status === "inactive"
  ) {
    return "inactive";
  }

  return "active";
}

function statusTag(user) {
  const status = getStatus(user);

  return (
    <Tag
      color={
        status === "active"
          ? "green"
          : "red"
      }
    >
      {status.toUpperCase()}
    </Tag>
  );
}

export default function StaffTable({
  staff = [],
  loading = false,
  pagination,
  onPaginationChange,
  onView,
  onEdit,
  onToggle,
  onDelete,
}) {
  const columns = [
    {
      title: "Name",
      key: "name",
      fixed: "left",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Button
            type="link"
            style={{
              padding: 0,
            }}
            onClick={() =>
              onView(record)
            }
          >
            {record.name || "-"}
          </Button>

          <Text type="secondary">
            {record.email || "-"}
          </Text>
        </Space>
      ),
    },

    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (value) =>
        value || "-",
    },

    {
      title: "Role",
      key: "role",
      render: (_, record) => (
        <Tag>
          {getRoleName(record)
            .replaceAll("_", " ")
            .toUpperCase()}
        </Tag>
      ),
    },

    {
      title: "Staff Type",
      key: "staff_type",
      render: (_, record) => (
        <Tag>
          {String(
            record.staff_type ??
              record.type ??
              "-"
          )
            .replaceAll("_", " ")
            .toUpperCase()}
        </Tag>
      ),
    },

    {
      title: "Branch",
      key: "branch",
      render: (_, record) =>
        record.branch?.name ||
        record.branch_name ||
        "-",
    },

    {
      title: "Status",
      key: "status",
      render: (_, record) =>
        statusTag(record),
    },

    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, record) => {
        const active =
          getStatus(record) ===
          "active";

        return (
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() =>
                onView(record)
              }
            >
              View
            </Button>

            <Button
              icon={<EditOutlined />}
              onClick={() =>
                onEdit(record)
              }
            >
              Edit
            </Button>

            <Button
              icon={
                active ? (
                  <StopOutlined />
                ) : (
                  <CheckOutlined />
                )
              }
              onClick={() =>
                onToggle(record)
              }
            >
              {active
                ? "Disable"
                : "Enable"}
            </Button>

            <Popconfirm
              title="Delete this staff member?"
              description="This action cannot be undone."
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{
                danger: true,
              }}
              onConfirm={() =>
                onDelete(record)
              }
            >
              <Button
                danger
                icon={
                  <DeleteOutlined />
                }
              >
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={staff}
      columns={columns}
      scroll={{
        x: 1100,
      }}
      pagination={{
        current:
          pagination?.current ?? 1,

        pageSize:
          pagination?.pageSize ?? 20,

        total:
          pagination?.total ?? 0,

        showSizeChanger: true,

        showTotal: (total) =>
          `${total} staff members`,

        onChange: (
          current,
          pageSize
        ) =>
          onPaginationChange({
            current,
            pageSize,
          }),
      }}
    />
  );
}