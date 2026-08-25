"use client";

import {
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  Empty,
  Input,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";

import {
  CheckSquareOutlined,
  ClearOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

import {
  getPermissionColor,
  prettifyPermission,
} from "./roleUtils";

const { Text } = Typography;

export default function PermissionSelector({
  groups = [],
  value = [],
  onChange,
  loading = false,
}) {
  const selectedSet = new Set(value);

  const allPermissions = groups.flatMap(
    (group) => group.permissions
  );

  const update = (next) => {
    const unique = [
      ...new Set(next),
    ];

    onChange?.(unique);
  };

  const selectAll = () => {
    update(
      allPermissions.map(
        (permission) =>
          permission.name
      )
    );
  };

  const clearAll = () => {
    update([]);
  };

  const selectGroup = (group) => {
    update([
      ...value,
      ...group.permissions.map(
        (permission) =>
          permission.name
      ),
    ]);
  };

  const clearGroup = (group) => {
    const groupNames = new Set(
      group.permissions.map(
        (permission) =>
          permission.name
      )
    );

    update(
      value.filter(
        (permission) =>
          !groupNames.has(permission)
      )
    );
  };

  if (loading) {
    return (
      <Card loading />
    );
  }

  if (!groups.length) {
    return (
      <Empty
        description="No permissions available."
      />
    );
  }

  return (
    <div>
      <Card
        size="small"
        style={{
          marginBottom: 12,
        }}
      >
        <Space wrap>
          <Badge
            count={`${value.length}/${allPermissions.length}`}
            style={{
              backgroundColor:
                "#1677ff",
            }}
          />

          <Text type="secondary">
            permissions selected
          </Text>

          <Button
            size="small"
            icon={
              <CheckSquareOutlined />
            }
            onClick={selectAll}
          >
            Select All
          </Button>

          <Button
            size="small"
            icon={
              <ClearOutlined />
            }
            onClick={clearAll}
          >
            Clear All
          </Button>
        </Space>
      </Card>

      <Collapse
        defaultActiveKey={groups.map(
          (group) => group.key
        )}
        items={groups.map(
          (group) => {
            const names =
              group.permissions.map(
                (permission) =>
                  permission.name
              );

            const selectedCount =
              names.filter(
                (name) =>
                  selectedSet.has(name)
              ).length;

            return {
              key: group.key,

              label: (
                <Space>
                  <SafetyCertificateOutlined />

                  <Text strong>
                    {group.label}
                  </Text>

                  <Badge
                    count={`${selectedCount}/${names.length}`}
                    style={{
                      backgroundColor:
                        selectedCount
                          ? "#1677ff"
                          : "#999",
                    }}
                  />
                </Space>
              ),

              extra: (
                <Space
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <Button
                    size="small"
                    onClick={() =>
                      selectGroup(group)
                    }
                  >
                    All
                  </Button>

                  <Button
                    size="small"
                    onClick={() =>
                      clearGroup(group)
                    }
                  >
                    Clear
                  </Button>
                </Space>
              ),

              children: (
                <PermissionGrid
                  permissions={
                    group.permissions
                  }
                  selectedSet={
                    selectedSet
                  }
                  value={value}
                  onChange={update}
                />
              ),
            };
          }
        )}
      />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Permission Grid
|--------------------------------------------------------------------------
*/

function PermissionGrid({
  permissions,
  selectedSet,
  value,
  onChange,
}) {
  const togglePermission = (
    permissionName,
    checked
  ) => {
    if (checked) {
      onChange([
        ...value,
        permissionName,
      ]);

      return;
    }

    onChange(
      value.filter(
        (permission) =>
          permission !==
          permissionName
      )
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 8,
      }}
    >
      {permissions.map(
        (permission) => {
          const selected =
            selectedSet.has(
              permission.name
            );

          return (
            <Card
              key={
                permission.name
              }
              size="small"
              style={{
                borderColor:
                  selected
                    ? "#1677ff"
                    : undefined,
                cursor: "pointer",
              }}
              styles={{
                body: {
                  padding: 10,
                },
              }}
              onClick={() =>
                togglePermission(
                  permission.name,
                  !selected
                )
              }
            >
              <Checkbox
                checked={selected}
                onChange={(event) => {
                  event.stopPropagation();

                  togglePermission(
                    permission.name,
                    event.target.checked
                  );
                }}
              >
                <Text strong>
                  {permission.label ||
                    prettifyPermission(
                      permission.name
                    )}
                </Text>
              </Checkbox>

              <div>
                <Tooltip
                  title={
                    permission.description ||
                    permission.name
                  }
                >
                  <Tag
                    color={getPermissionColor(
                      permission.name
                    )}
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                    }}
                  >
                    {permission.name}
                  </Tag>
                </Tooltip>
              </div>

              {permission.description && (
                <Text
                  type="secondary"
                  style={{
                    display: "block",
                    marginTop: 5,
                    fontSize: 11,
                  }}
                >
                  {
                    permission.description
                  }
                </Text>
              )}
            </Card>
          );
        }
      )}
    </div>
  );
}