"use client";

import React from "react";

import {
  Descriptions,
  Divider,
  Drawer,
  Space,
  Tag,
  Typography,
} from "antd";

const { Text, Title } = Typography;

function roleLabel(role) {
  if (!role) return "";

  return (
    role.label ||
    role.name
      ?.replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export default function UserDetails({
  open,
  user,
  onClose,
}) {
  if (!user) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        title="User Details"
        width={600}
      >
        <Text type="secondary">
          No user selected.
        </Text>
      </Drawer>
    );
  }

  const roles = user.roles || [];

  const permissions = user.permissions || [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="User Details"
      width={650}
    >
      <Title level={4}>
        {user.name}
      </Title>

      <Space wrap style={{ marginBottom: 20 }}>
        {roles.length ? (
          roles.map((role) => (
            <Tag
              color="blue"
              key={role.id || role.name}
            >
              {roleLabel(role)}
            </Tag>
          ))
        ) : user.role ? (
          <Tag color="blue">
            {user.role}
          </Tag>
        ) : (
          <Tag>
            No Role
          </Tag>
        )}

        <Tag
          color={user.is_active ? "green" : "red"}
        >
          {user.is_active ? "Active" : "Disabled"}
        </Tag>
      </Space>

      <Descriptions
        bordered
        column={1}
        size="small"
      >
        <Descriptions.Item label="ID">
          {user.id}
        </Descriptions.Item>

        <Descriptions.Item label="Full Name">
          {user.name || "—"}
        </Descriptions.Item>

        <Descriptions.Item label="Email">
          {user.email || "—"}
        </Descriptions.Item>

        <Descriptions.Item label="Phone">
          {user.phone || "—"}
        </Descriptions.Item>

        <Descriptions.Item label="Legacy Role">
          {user.role || "—"}
        </Descriptions.Item>

        <Descriptions.Item label="Branch">
          {user.branch?.name || user.branch_id || "—"}
        </Descriptions.Item>

        <Descriptions.Item label="Merchant">
          {user.merchant?.name || user.merchant_id || "—"}
        </Descriptions.Item>

        <Descriptions.Item label="Status">
          <Tag
            color={user.is_active ? "green" : "red"}
          >
            {user.is_active ? "Active" : "Disabled"}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item label="Created">
          {user.created_at
            ? new Date(user.created_at).toLocaleString()
            : "—"}
        </Descriptions.Item>

        <Descriptions.Item label="Last Login">
          {user.last_login_at
            ? new Date(user.last_login_at).toLocaleString()
            : "—"}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Title level={5}>
        Inherited Permissions
      </Title>

      <Text type="secondary">
        These permissions come from the user's assigned role.
        They cannot be directly assigned here.
      </Text>

      <div style={{ marginTop: 12 }}>
        {permissions.length ? (
          <Space wrap>
            {permissions.map((permission) => (
              <Tag key={permission.id || permission.name}>
                {permission.name || permission}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">
            Permissions are inherited from the role.
          </Text>
        )}
      </div>
    </Drawer>
  );
}