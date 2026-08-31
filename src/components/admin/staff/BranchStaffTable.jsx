"use client";

import {
  Button,
  Popconfirm,
  Space,
  Table,
  Tag,
} from "antd";

function getStatusColor(active) {
  return active
    ? "green"
    : "red";
}

function getRoleName(record) {
  if (Array.isArray(record.roles)) {
    return record.roles
      .map(
        (role) =>
          role.name
      )
      .join(", ");
  }

  return (
    record.role_name ||
    record.role ||
    "-"
  );
}

export default function BranchStaffTable({
  staff,
  loading,
  pagination,
  onPaginationChange,
  onEdit,
  onView,
  onDelete,
  onToggle,
}) {
  const columns = [
    {
      title: "Name",
      key: "name",
      render: (_, record) =>
        record.name ||
        `${record.first_name || ""} ${
          record.last_name || ""
        }`.trim() ||
        "-",
    },

    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (value) =>
        value || "-",
    },

    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (value) =>
        value || "-",
    },

    {
      title: "Role",
      key: "role",
      render: (_, record) => (
        <Tag>
          {getRoleName(record)}
        </Tag>
      ),
    },

    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const active =
          record.is_active ??
          record.active ??
          record.status ===
            "active";

        return (
          <Tag
            color={getStatusColor(
              active
            )}
          >
            {active
              ? "Active"
              : "Inactive"}
          </Tag>
        );
      },
    },

    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button
            size="small"
            onClick={() =>
              onView(record)
            }
          >
            View
          </Button>

          <Button
            size="small"
            onClick={() =>
              onEdit(record)
            }
          >
            Edit
          </Button>

          <Button
            size="small"
            onClick={() =>
              onToggle(record)
            }
          >
            Toggle
          </Button>

          <Popconfirm
            title="Remove this staff member?"
            description="The staff member will no longer be available for branch operations."
            okText="Remove"
            cancelText="Cancel"
            onConfirm={() =>
              onDelete(record)
            }
          >
            <Button
              size="small"
              danger
            >
              Remove
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={staff}
      columns={columns}
      scroll={{
        x: 1000,
      }}
      pagination={{
        current:
          pagination.current,
        pageSize:
          pagination.pageSize,
        total:
          pagination.total,
        showSizeChanger: true,
        showTotal: (
          total,
          range
        ) =>
          `${range[0]}-${range[1]} of ${total}`,
        onChange:
          onPaginationChange,
      }}
    />
  );
}