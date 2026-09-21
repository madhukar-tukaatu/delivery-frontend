"use client";

import React from "react";

import {
  Button,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";

import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

function roleLabel(role) {
  if (!role) return "";

  return (
    role.label ||
    role.name
      ?.replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function roleColor(name) {
  if (!name) return "default";

  if (name === "super_admin") return "red";
  if (name.includes("admin")) return "purple";
  if (name.includes("manager")) return "blue";
  if (name.includes("staff")) return "green";
  if (name === "rider") return "orange";
  if (name === "merchant") return "cyan";

  return "default";
}

export default function UserTable({
  users = [],
  loading = false,
  pagination,
  onPaginationChange,
  onEdit,
  onView,
  onDelete,
  onToggle,
}) {
  const columns = [
    {
      title: "User",
      key: "user",
      render: (_, record) => (
        <div>
          <Text strong>{record.name}</Text>

          <div>
            <Text type="secondary">
              {record.email}
            </Text>
          </div>

          {record.phone && (
            <div>
              <Text type="secondary">
                {record.phone}
              </Text>
            </div>
          )}
        </div>
      ),
    },

    {
      title: "Role",
      key: "role",
      render: (_, record) => {
        const roles = record.roles || [];

        if (!roles.length) {
          if (record.role) {
            return (
              <Tag color={roleColor(record.role)}>
                {record.role}
              </Tag>
            );
          }

          return <Tag>Unassigned</Tag>;
        }

        return (
          <Space wrap>
            {roles.map((role) => (
              <Tag
                key={role.id || role.name}
                color={roleColor(role.name)}
              >
                {roleLabel(role)}
              </Tag>
            ))}
          </Space>
        );
      },
    },

    {
      title: "Branch",
      key: "branch",
      render: (_, record) => {
        if (!record.branch) {
          return (
            <Text type="secondary">
              —
            </Text>
          );
        }

        return (
          <div>
            <Text strong>
              {record.branch.name}
            </Text>

            {record.branch.code && (
              <div>
                <Text type="secondary">
                  {record.branch.code}
                </Text>
              </div>
            )}
          </div>
        );
      },
    },

    {
      title: "Merchant",
      key: "merchant",
      render: (_, record) => {
        if (!record.merchant) {
          return (
            <Text type="secondary">
              —
            </Text>
          );
        }

        return (
          <Text strong>
            {record.merchant.name}
          </Text>
        );
      },
    },

    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Switch
          checked={Boolean(record.is_active)}
          checkedChildren="Active"
          unCheckedChildren="Disabled"
          disabled={record.role === "super_admin"}
          onChange={() => onToggle?.(record)}
        />
      ),
    },

    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Tooltip title="View">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onView?.(record)}
            />
          </Tooltip>

          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit?.(record)}
            />
          </Tooltip>

          <Popconfirm
            title="Delete this user?"
            description="This action cannot be undone."
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => onDelete?.(record)}
            disabled={record.role === "super_admin"}
          >
            <Tooltip title="Delete">
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={record.role === "super_admin"}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={users}
      loading={loading}
      scroll={{
        x: 1100,
      }}
      pagination={{
        current: pagination?.current || 1,
        pageSize: pagination?.pageSize || 20,
        total: pagination?.total || 0,
        showSizeChanger: true,
        showTotal: (total) => `${total} users`,
      }}
      onChange={(nextPagination) => {
        onPaginationChange?.({
          current: nextPagination.current,
          pageSize: nextPagination.pageSize,
        });
      }}
    />
  );
}