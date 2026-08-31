"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Button,
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
  CheckOutlined,
  ClearOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import {
  getPermissionColor,
  prettifyPermission,
} from "./roleUtils";

const {
  Text,
} = Typography;

export default function PermissionSelector({
  groups = [],
  value = [],
  onChange,
  loading = false,
}) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selected,
    setSelected,
  ] = useState(
    Array.isArray(value)
      ? value
      : []
  );

  useEffect(() => {
    setSelected(
      Array.isArray(value)
        ? value
        : []
    );
  }, [value]);

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const allPermissions =
    useMemo(() => {
      return groups.flatMap(
        (group) =>
          group.permissions || []
      );
    }, [groups]);

  const filteredGroups =
    useMemo(() => {
      if (!normalizedSearch) {
        return groups;
      }

      return groups
        .map((group) => ({
          ...group,

          permissions:
            (
              group.permissions ||
              []
            ).filter(
              (permission) => {
                const name =
                  permission?.name ||
                  "";

                const label =
                  permission?.label ||
                  prettifyPermission(
                    name
                  );

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
                    )
                );
              }
            ),
        }))
        .filter(
          (group) =>
            group.permissions
              .length > 0
        );
    }, [
      groups,
      normalizedSearch,
    ]);

  function updateSelection(
    next
  ) {
    const unique =
      Array.from(
        new Set(next)
      );

    setSelected(unique);

    onChange?.(unique);
  }

  function togglePermission(
    permissionName
  ) {
    if (
      selected.includes(
        permissionName
      )
    ) {
      updateSelection(
        selected.filter(
          (name) =>
            name !==
            permissionName
        )
      );

      return;
    }

    updateSelection([
      ...selected,
      permissionName,
    ]);
  }

  function selectAll() {
    updateSelection(
      allPermissions.map(
        (permission) =>
          permission.name
      )
    );
  }

  function clearAll() {
    updateSelection([]);
  }

  function selectGroup(
    group
  ) {
    const names =
      (
        group.permissions ||
        []
      ).map(
        (permission) =>
          permission.name
      );

    updateSelection([
      ...selected,
      ...names,
    ]);
  }

  function clearGroup(
    group
  ) {
    const names = new Set(
      (
        group.permissions ||
        []
      ).map(
        (permission) =>
          permission.name
      )
    );

    updateSelection(
      selected.filter(
        (name) =>
          !names.has(name)
      )
    );
  }

  const items =
    filteredGroups.map(
      (group) => {
        const names =
          (
            group.permissions ||
            []
          ).map(
            (permission) =>
              permission.name
          );

        const selectedCount =
          names.filter(
            (name) =>
              selected.includes(
                name
              )
          ).length;

        const allSelected =
          names.length > 0 &&
          selectedCount ===
            names.length;

        return {
          key: group.key,

          label: (
            <Space>
              <Text strong>
                {group.label}
              </Text>

              <Tag>
                {selectedCount}/
                {names.length}
              </Tag>
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
                type={
                  allSelected
                    ? "default"
                    : "link"
                }
                onClick={() =>
                  selectGroup(
                    group
                  )
                }
              >
                Select all
              </Button>

              <Button
                size="small"
                type="link"
                danger
                onClick={() =>
                  clearGroup(
                    group
                  )
                }
              >
                Clear
              </Button>
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
                (permission) => {
                  const checked =
                    selected.includes(
                      permission.name
                    );

                  return (
                    <Card
                      key={
                        permission.name
                      }
                      size="small"
                      hoverable
                      onClick={() =>
                        togglePermission(
                          permission.name
                        )
                      }
                      style={{
                        cursor:
                          "pointer",
                        borderColor:
                          checked
                            ? "#1677ff"
                            : undefined,
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
                          width:
                            "100%",
                        }}
                      >
                        <Space
                          align="start"
                        >
                          <Checkbox
                            checked={
                              checked
                            }
                            onChange={() =>
                              togglePermission(
                                permission.name
                              )
                            }
                            onClick={(event) =>
                              event.stopPropagation()
                            }
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
                  );
                }
              )}
            </div>
          ),
        };
      }
    );

  return (
    <Card
      size="small"
      loading={loading}
    >
      <Space
        direction="vertical"
        size={12}
        style={{
          width: "100%",
        }}
      >
        <Space
          wrap
          style={{
            width: "100%",
            justifyContent:
              "space-between",
          }}
        >
          <Space wrap>
            <Tag color="blue">
              {selected.length} selected
            </Tag>

            <Tag>
              {allPermissions.length} available
            </Tag>
          </Space>

          <Space wrap>
            <Button
              icon={
                <CheckOutlined />
              }
              onClick={
                selectAll
              }
              disabled={
                !allPermissions.length
              }
            >
              Select All
            </Button>

            <Button
              icon={
                <ClearOutlined />
              }
              danger
              onClick={
                clearAll
              }
              disabled={
                !selected.length
              }
            >
              Clear All
            </Button>
          </Space>
        </Space>

        <Input
          allowClear
          prefix={
            <SearchOutlined />
          }
          placeholder="Search permissions..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
        />

        {!filteredGroups.length && (
          <Empty
            description={
              search
                ? "No permissions found."
                : "No permissions available."
            }
          />
        )}

        {!!filteredGroups.length && (
          <Collapse
            items={items}
            defaultActiveKey={filteredGroups.map(
              (group) =>
                group.key
            )}
          />
        )}
      </Space>
    </Card>
  );
}