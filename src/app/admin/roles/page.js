"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Card,
  Checkbox,
  Collapse,
  Empty,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  SafetyCertificateOutlined,
  SearchOutlined,
  CheckSquareOutlined,
  ClearOutlined,
} from "@ant-design/icons";

import api from "@/lib/api";
import {
  Button,
  Form,
  Input,
  SimpleTablePageWithCRUD,
} from "@/components/PageTools";
import { Divider } from "antd";

const { Text } = Typography;

/**
 * Supports both backend response styles:
 *
 * 1. Old:
 * {
 *   data: {
 *     users: [{ name: "users.view" }],
 *     shipments: [{ name: "shipments.view" }]
 *   }
 * }
 *
 * 2. Better grouped:
 * {
 *   data: [
 *     {
 *       group_key: "users",
 *       group_label: "Users",
 *       permissions: [{ name: "users.view", label: "View Users" }]
 *     }
 *   ]
 * }
 */
function normalizePermissionGroups(rawData) {
  if (!rawData) return [];

  if (Array.isArray(rawData)) {
    return rawData.map((group) => ({
      key: group.group_key || group.key || group.group || "general",
      label:
        group.group_label ||
        group.label ||
        prettifyLabel(group.group_key || group.key || group.group || "general"),
      permissions: normalizePermissions(group.permissions || []),
    }));
  }

  return Object.entries(rawData).map(([groupKey, permissions]) => ({
    key: groupKey || "general",
    label: prettifyLabel(groupKey || "general"),
    permissions: normalizePermissions(permissions || []),
  }));
}

function normalizePermissions(permissions) {
  return permissions
    .map((permission) => {
      if (typeof permission === "string") {
        return {
          name: permission,
          label: prettifyPermission(permission),
          description: "",
        };
      }

      return {
        id: permission.id,
        name: permission.name,
        label: permission.label || prettifyPermission(permission.name),
        description: permission.description || "",
      };
    })
    .filter((permission) => permission.name);
}

function prettifyLabel(value = "") {
  return value
    .replaceAll("-", "_")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function prettifyPermission(permission = "") {
  const [module = "", action = ""] = permission.split(".");
  const cleanAction = prettifyLabel(action);
  const cleanModule = prettifyLabel(module);

  if (!action) return cleanModule;

  return `${cleanAction} ${cleanModule}`;
}

function getPermissionColor(permissionName = "") {
  if (permissionName.endsWith(".view")) return "blue";
  if (permissionName.endsWith(".create")) return "green";
  if (permissionName.endsWith(".update")) return "orange";
  if (permissionName.endsWith(".edit")) return "orange";
  if (permissionName.endsWith(".delete")) return "red";
  if (permissionName.endsWith(".approve")) return "purple";
  if (permissionName.endsWith(".status")) return "cyan";
  if (permissionName.endsWith(".manage")) return "volcano";
  return "default";
}

export default function RolesPage() {
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoadingPermissions(true);

      const res = await api.get("/admin/permissions");
      const groups = normalizePermissionGroups(res.data?.data);

      setPermissionGroups(groups);
    } catch (error) {
      message.error("Failed to load permissions");
      setPermissionGroups([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const allPermissions = useMemo(() => {
    return permissionGroups.flatMap((group) => group.permissions || []);
  }, [permissionGroups]);

  const columns = [
    {
      title: "Role Key",
      dataIndex: "name",
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: "Label",
      dataIndex: "label",
      render: (value, record) => value || prettifyLabel(record.name),
    },
    {
      title: "Permissions",
      render: (_, record) => {
        const permissions = record.permissions || [];

        if (!permissions.length) {
          return <Tag color="default">No permissions</Tag>;
        }

        return (
          <Space size={[4, 4]} wrap>
            {permissions.slice(0, 8).map((permission) => {
              const name = permission.name || permission;

              return (
                <Tooltip key={name} title={prettifyPermission(name)}>
                  <Tag color={getPermissionColor(name)}>{name}</Tag>
                </Tooltip>
              );
            })}

            {permissions.length > 8 && (
              <Tag color="default">+{permissions.length - 8} more</Tag>
            )}
          </Space>
        );
      },
    },
  ];

  const RoleForm = ({ record, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const isEdit = !!record;

    const selectedPermissions = Form.useWatch("permissions", form) || [];

    useEffect(() => {
      if (record) {
        form.setFieldsValue({
          name: record.name,
          label: record.label,
          description: record.description,
          permissions: (record.permissions || []).map((permission) =>
            permission.name ? permission.name : permission
          ),
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          permissions: [],
        });
      }
    }, [record, form]);

    const filteredGroups = useMemo(() => {
      const keyword = search.trim().toLowerCase();

      if (!keyword) return permissionGroups;

      return permissionGroups
        .map((group) => {
          const groupMatched =
            group.key.toLowerCase().includes(keyword) ||
            group.label.toLowerCase().includes(keyword);

          const permissions = group.permissions.filter((permission) => {
            return (
              groupMatched ||
              permission.name.toLowerCase().includes(keyword) ||
              permission.label.toLowerCase().includes(keyword) ||
              permission.description?.toLowerCase().includes(keyword)
            );
          });

          return {
            ...group,
            permissions,
          };
        })
        .filter((group) => group.permissions.length > 0);
    }, [search, permissionGroups]);

    const selectedSet = useMemo(() => {
      return new Set(selectedPermissions);
    }, [selectedPermissions]);

    const updateSelectedPermissions = (nextPermissions) => {
      form.setFieldsValue({
        permissions: Array.from(new Set(nextPermissions)),
      });
    };

    const selectGroup = (group) => {
      const groupPermissionNames = group.permissions.map(
        (permission) => permission.name
      );

      updateSelectedPermissions([
        ...selectedPermissions,
        ...groupPermissionNames,
      ]);
    };

    const clearGroup = (group) => {
      const groupPermissionNames = new Set(
        group.permissions.map((permission) => permission.name)
      );

      updateSelectedPermissions(
        selectedPermissions.filter(
          (permission) => !groupPermissionNames.has(permission)
        )
      );
    };

    const selectAll = () => {
      updateSelectedPermissions(allPermissions.map((permission) => permission.name));
    };

    const clearAll = () => {
      updateSelectedPermissions([]);
    };

    const handleSubmit = async (values) => {
      try {
        const payload = {
          ...values,
          permissions: values.permissions || [],
        };

        if (isEdit) {
          await api.put(`/admin/roles/${record.id}`, payload);
          message.success("Role updated successfully");
        } else {
          await api.post("/admin/roles", payload);
          message.success("Role created successfully");
        }

        setRefresh((value) => value + 1);
        onSuccess?.();
      } catch (err) {
        message.error(err?.response?.data?.message || "Operation failed");
      }
    };

    const collapseItems = filteredGroups.map((group) => {
      const groupPermissionNames = group.permissions.map(
        (permission) => permission.name
      );

      const selectedInGroup = groupPermissionNames.filter((permission) =>
        selectedSet.has(permission)
      ).length;

      return {
        key: group.key,
        label: (
          <Space>
            <SafetyCertificateOutlined />
            <Text strong>{group.label}</Text>
            <Badge
              count={`${selectedInGroup}/${group.permissions.length}`}
              style={{ backgroundColor: selectedInGroup ? "#1677ff" : "#999" }}
            />
          </Space>
        ),
        extra: (
          <Space
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <Button size="small" onClick={() => selectGroup(group)}>
              Select Group
            </Button>
            <Button size="small" onClick={() => clearGroup(group)}>
              Clear
            </Button>
          </Space>
        ),
        children: (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 10,
            }}
          >
            {group.permissions.map((permission) => (
              <Card
                key={permission.name}
                size="small"
                bodyStyle={{ padding: 10 }}
                style={{
                  borderColor: selectedSet.has(permission.name)
                    ? "#1677ff"
                    : undefined,
                }}
              >
                <Checkbox value={permission.name}>
                  <div>
                    <Text strong>{permission.label}</Text>
                    <div>
                      <Tag
                        color={getPermissionColor(permission.name)}
                        style={{ marginTop: 6 }}
                      >
                        {permission.name}
                      </Tag>
                    </div>
                    {permission.description && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {permission.description}
                      </Text>
                    )}
                  </div>
                </Checkbox>
              </Card>
            ))}
          </div>
        ),
      };
    });

    return (
      <Form layout="vertical" form={form} onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Role Key"
          rules={[{ required: true, message: "Role key is required" }]}
          extra="Use clean keys like booking_staff, branch_manager, delivery_rider."
        >
          <Input placeholder="booking_staff" disabled={isEdit} />
        </Form.Item>

        <Form.Item name="label" label="Label">
          <Input placeholder="Booking Staff" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Short role description..." />
        </Form.Item>

        <Divider orientation="left">Permissions</Divider>

        <Card size="small" style={{ marginBottom: 16 }}>
          <Space
            style={{
              width: "100%",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <Space wrap>
              <Badge
                count={`${selectedPermissions.length}/${allPermissions.length}`}
                style={{ backgroundColor: "#1677ff" }}
              />
              <Text type="secondary">permissions selected</Text>
            </Space>

            <Space wrap>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Search permissions..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ width: 260 }}
              />

              <Button icon={<CheckSquareOutlined />} onClick={selectAll}>
                Select All
              </Button>

              <Button icon={<ClearOutlined />} onClick={clearAll}>
                Clear All
              </Button>
            </Space>
          </Space>
        </Card>

        <Form.Item name="permissions" initialValue={[]}>
          <Checkbox.Group style={{ width: "100%" }}>
            {loadingPermissions ? (
              <Card loading />
            ) : collapseItems.length ? (
              <Collapse
                defaultActiveKey={collapseItems.map((item) => item.key)}
                items={collapseItems}
              />
            ) : (
              <Empty description="No permissions found" />
            )}
          </Checkbox.Group>
        </Form.Item>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 24,
          }}
        >
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            {isEdit ? "Update Role" : "Create Role"}
          </Button>
        </div>
      </Form>
    );
  };

  return (
    <SimpleTablePageWithCRUD
      title="Roles & Permissions"
      endpoint="/admin/roles"
      columns={columns}
      modalForm={<RoleForm />}
      reloadKey={refresh}
    />
  );
}