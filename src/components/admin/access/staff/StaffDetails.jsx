"use client";

import {
  Descriptions,
  Drawer,
  Tag,
} from "antd";

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

function roleLabel(user) {
  if (
    Array.isArray(user?.roles) &&
    user.roles.length
  ) {
    return user.roles
      .map((role) => role?.name)
      .filter(Boolean)
      .join(", ");
  }

  return (
    user?.role ||
    user?.user_type ||
    "-"
  );
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
      />
    );
  }

  const active =
    user.is_active ??
    user.active ??
    user.status === "active";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Staff Details"
      width={600}
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
            {roleLabel(user)}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item label="Branch">
          {branchLabel(
            user.branch
          )}
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
          {user.created_at || "-"}
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  );
}