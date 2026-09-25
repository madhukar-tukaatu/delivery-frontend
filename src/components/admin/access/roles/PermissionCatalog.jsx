"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Card,
  Checkbox,
  Collapse,
  Empty,
  Input,
  Space,
  Tag,
  Typography,
} from "antd";

import {
  SearchOutlined,
} from "@ant-design/icons";

import {
  getPermissionColor,
  prettifyPermission,
} from "./roleUtils";

const {
  Text,
} = Typography;

export default function PermissionCatalog({
  groups = [],
  loading = false,
}) {
  const [
    search,
    setSearch,
  ] = useState("");

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const filteredGroups =
    useMemo(() => {
      if (!normalizedSearch) {
        return groups;
      }

      return groups
        .map((group) => {
          const permissions =
            (group.permissions || [])
              .filter((permission) => {
                const name =
                  permission?.name ||
                  "";

                const label =
                  permission?.label ||
                  prettifyPermission(
                    name
                  );

                const description =
                  permission?.description ||
                  "";

                return (
                  name
                    .toLowerCase()
                    .includes(
                      normalizedSearch
                    ) ||
                  label
                    .toLowerCase()
                    .includes(
                      normalizedSearch
                    ) ||
                  description
                    .toLowerCase()
                    .includes(
                      normalizedSearch
                    )
                );
              });

          return {
            ...group,
            permissions,
          };
        })
        .filter(
          (group) =>
            group.permissions
              .length > 0
        );
    }, [
      groups,
      normalizedSearch,
    ]);

  const totalPermissions =
    groups.reduce(
      (total, group) =>
        total +
        (
          group.permissions || []
        ).length,
      0
    );

  const visiblePermissions =
    filteredGroups.reduce(
      (total, group) =>
        total +
        (
          group.permissions || []
        ).length,
      0
    );

  const items =
    filteredGroups.map(
      (group) => ({
        key: group.key,

        label: (
          <Space>
            <Text strong>
              {group.label}
            </Text>

            <Tag>
              {
                group.permissions
                  ?.length || 0
              }
            </Tag>
          </Space>
        ),

        children: (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 8,
            }}
          >
            {group.permissions.map(
              (permission) => (
                <Card
                  key={
                    permission.name
                  }
                  size="small"
                  style={{
                    height: "100%",
                  }}
                  styles={{
                    body: {
                      padding: 12,
                    },
                  }}
                >
                  <Space
                    direction="vertical"
                    size={4}
                    style={{
                      width: "100%",
                    }}
                  >
                    <Space
                      align="start"
                    >
                      <Checkbox
                        disabled
                        checked
                      />

                      <Text strong>
                        {
                          permission.label ||
                          prettifyPermission(
                            permission.name
                          )
                        }
                      </Text>
                    </Space>

                    <Tag
                      color={getPermissionColor(
                        permission.name
                      )}
                      style={{
                        width:
                          "fit-content",
                        marginLeft: 24,
                      }}
                    >
                      {
                        permission.name
                      }
                    </Tag>

                    {permission.description && (
                      <Text
                        type="secondary"
                        style={{
                          marginLeft: 24,
                        }}
                      >
                        {
                          permission.description
                        }
                      </Text>
                    )}
                  </Space>
                </Card>
              )
            )}
          </div>
        ),
      })
    );

  return (
    <Card
      title="Permission Catalog"
      loading={loading}
      extra={
        <Space wrap>
          <Tag color="blue">
            {totalPermissions} total
          </Tag>

          {search && (
            <Tag color="green">
              {visiblePermissions} matching
            </Tag>
          )}
        </Space>
      }
    >
      <Input
        allowClear
        size="large"
        prefix={
          <SearchOutlined />
        }
        placeholder="Search permission name, label or description..."
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value
          )
        }
        style={{
          marginBottom: 16,
        }}
      />

      {!loading &&
        !filteredGroups.length && (
          <Empty
            description={
              search
                ? "No permissions match your search."
                : "No permissions found."
            }
          />
        )}

      {!!filteredGroups.length && (
        <Collapse
          defaultActiveKey={filteredGroups.map(
            (group) =>
              group.key
          )}
          items={items}
        />
      )}
    </Card>
  );
}