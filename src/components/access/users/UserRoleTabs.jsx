"use client";

import React from "react";
import { Tabs, Tag } from "antd";

function prettifyRole(role) {
  if (!role) return "";

  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function UserRoleTabs({
  roles = [],
  value = "all",
  onChange,
  userCounts = {},
}) {
  const items = [
    {
      key: "all",
      label: (
        <span>
          All Users{" "}
          <Tag bordered={false}>
            {userCounts.all ?? 0}
          </Tag>
        </span>
      ),
    },

    ...roles.map((role) => {
      const roleName = role.name;

      return {
        key: roleName,
        label: (
          <span>
            {role.label || prettifyRole(roleName)}{" "}
            <Tag bordered={false}>
              {userCounts[roleName] ?? 0}
            </Tag>
          </span>
        ),
      };
    }),
  ];

  return (
    <Tabs
      activeKey={value}
      onChange={onChange}
      items={items}
      type="card"
      destroyOnHidden={false}
    />
  );
}