"use client";

import React from "react";

import {
  Descriptions,
  Drawer,
  Tag,
} from "antd";

function getRoleName(staff) {
  if (
    Array.isArray(staff?.roles) &&
    staff.roles.length
  ) {
    return staff.roles
      .map(
        (role) => role?.name
      )
      .filter(Boolean)
      .join(", ");
  }

  return (
    staff?.role ||
    staff?.role_name ||
    "-"
  );
}

export default function BranchStaffDetails({
  open,
  staff,
  onClose,
}) {
  if (!staff) {
    return null;
  }

  const active =
    typeof staff.is_active ===
    "boolean"
      ? staff.is_active
      : true;

  return (
    <Drawer
      title="Staff Details"
      open={open}
      onClose={onClose}
      width={500}
    >
      <Descriptions
        bordered
        column={1}
      >
        <Descriptions.Item label="ID">
          {staff.id}
        </Descriptions.Item>

        <Descriptions.Item label="Name">
          {staff.name ||
            staff.full_name ||
            "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Phone">
          {staff.phone ||
            staff.mobile ||
            "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Email">
          {staff.email || "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Role">
          <Tag>
            {getRoleName(staff)}
          </Tag>
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
              ? "Active"
              : "Inactive"}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item label="Branch">
          {staff.branch?.name ||
            staff.branch_name ||
            "-"}
        </Descriptions.Item>

        <Descriptions.Item label="Created">
          {staff.created_at || "-"}
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  );
}