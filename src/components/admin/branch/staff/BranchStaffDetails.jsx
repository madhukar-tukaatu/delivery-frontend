"use client";

import {
  Descriptions,
  Drawer,
  Empty,
  Tag,
} from "antd";

function getRoleName(staff) {
  if (
    Array.isArray(
      staff?.roles
    )
  ) {
    return staff.roles
      .map(
        (role) =>
          role.name
      )
      .join(", ");
  }

  return (
    staff?.role_name ||
    staff?.role ||
    "-"
  );
}

export default function BranchStaffDetails({
  open,
  staff,
  onClose,
}) {
  const active =
    staff?.is_active ??
    staff?.active ??
    staff?.status ===
      "active";

  return (
    <Drawer
      title="Staff Details"
      open={open}
      width={550}
      onClose={onClose}
    >
      {!staff ? (
        <Empty />
      ) : (
        <Descriptions
          bordered
          column={1}
        >
          <Descriptions.Item label="Name">
            {staff.name ||
              `${staff.first_name || ""} ${
                staff.last_name || ""
              }`.trim() ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Email">
            {staff.email ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Phone">
            {staff.phone ||
              "-"}
          </Descriptions.Item>

          <Descriptions.Item label="Role">
            <Tag>
              {getRoleName(
                staff
              )}
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
              "Current branch"}
          </Descriptions.Item>

          <Descriptions.Item label="Created">
            {staff.created_at ||
              "-"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
}