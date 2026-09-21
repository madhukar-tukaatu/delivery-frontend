"use client";

import React from "react";
import {
  Button,
  Input,
  Select,
  Space,
} from "antd";

import {
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

export default function UserFilters({
  search,
  onSearchChange,
  role,
  roles = [],
  onRoleChange,
  onRefresh,
  loading = false,
}) {
  const roleOptions = [
    {
      value: "all",
      label: "All Roles",
    },

    ...roles.map((item) => ({
      value: item.name,
      label: item.label || item.name,
    })),
  ];

  return (
    <Space
      wrap
      style={{
        width: "100%",
        justifyContent: "space-between",
        marginBottom: 16,
      }}
    >
      <Space wrap>
        <Input
          allowClear
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name, email or phone"
          prefix={<SearchOutlined />}
          style={{
            width: 300,
          }}
        />

        <Select
          value={role || "all"}
          onChange={onRoleChange}
          options={roleOptions}
          style={{
            minWidth: 180,
          }}
        />
      </Space>

      <Button
        icon={<ReloadOutlined />}
        onClick={onRefresh}
        loading={loading}
      >
        Refresh
      </Button>
    </Space>
  );
}