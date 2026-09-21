"use client";

import {
  Descriptions,
  Drawer,
  Empty,
  Space,
  Tag,
  Typography,
} from "antd";

const { Text } = Typography;

function roleLabel(user) {
  if (user?.roles?.length) {
    return user.roles
      .map((role) => role.name)
      .join(", ");
  }

  return user?.role || "-";
}

export default function StaffDetails({
  open,
  user,
  onClose,
}) {
  if (!user) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        title="Staff Details"
      >
        <Empty />
      </Drawer>
    );
  }

  const active =
    user.is_active !== false &&
    user.active !== false &&
    user.status !== "inactive";

  return (
    <Drawer
      title="Staff Details"
      open={open}
      onClose={onClose}
      width={550}
    >
      <Space
        direction="vertical"
        size={16}
        style={{
          width: "100%",
        }}
      >
        <Descriptions
          bordered
          column={1}
          size="small"
        >
          <Descriptions.Item label="Name">
            {user.name || "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Email">
            {user.email || "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Phone">
            {user.phone || "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Role">
            <Tag>
              {roleLabel(user)
                .replaceAll("_", " ")
                .toUpperCase()}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Staff Type">
            {user.staff_type ??
              user.type ??
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Branch">
            {user.branch?.name ??
              user.branch_name ??
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Status">
            <Tag
              color={
                active
                  ? "green"
                  : "red"
              }
            >
              {active
                ? "ACTIVE"
                : "INACTIVE"}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Created">
            {user.created_at
              ? new Date(
                  user.created_at
                ).toLocaleString()
              : "-"}
          </Descriptions.Item>
        </Descriptions>

        <Text type="secondary">
          Staff branch assignment is controlled
          by the backend and cannot be changed
          by the branch manager.
        </Text>
      </Space>
    </Drawer>
  );
}