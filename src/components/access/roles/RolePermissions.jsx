"use client";

import {
  Space,
  Tag,
  Tooltip,
} from "antd";

import {
  getPermissionColor,
  prettifyPermission,
} from "./roleUtils";

export default function RolePermissions({
  permissions = [],
  limit = 5,
}) {
  const normalized =
    permissions
      .map(
        (permission) =>
          typeof permission ===
          "string"
            ? permission
            : permission?.name
      )
      .filter(Boolean);

  if (
    !normalized.length
  ) {
    return (
      <Tag>
        No permissions
      </Tag>
    );
  }

  return (
    <Space
      size={[
        4,
        4,
      ]}
      wrap
    >
      {normalized
        .slice(0, limit)
        .map(
          (permission) => (
            <Tooltip
              key={
                permission
              }
              title={prettifyPermission(
                permission
              )}
            >
              <Tag
                color={getPermissionColor(
                  permission
                )}
                style={{
                  margin: 0,
                }}
              >
                {permission}
              </Tag>
            </Tooltip>
          )
        )}

      {normalized.length >
        limit && (
        <Tag>
          +
          {normalized.length -
            limit}{" "}
          more
        </Tag>
      )}
    </Space>
  );
}