"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Badge,
  Tag,
  Typography,
  message,
} from "antd";

import {
  getPermissions,
} from "@/services/accessApi";

import {
  SimpleTablePageWithCRUD,
} from "@/components/PageTools";

import RoleForm from "@/components/access/roles/RoleForm";

import RolePermissions from "@/components/access/roles/RolePermissions";

import {
  normalizePermissionGroups,
  prettifyLabel,
} from "@/components/access/roles/roleUtils";

const { Text } = Typography;

export default function RolesPage() {
  const [
    permissionGroups,
    setPermissionGroups,
  ] = useState([]);

  const [
    loadingPermissions,
    setLoadingPermissions,
  ] = useState(true);

  const [
    refresh,
    setRefresh,
  ] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | Load permissions
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadPermissions();
  }, []);

  async function loadPermissions() {
    try {
      setLoadingPermissions(true);

      const data =
        await getPermissions();

      setPermissionGroups(
        normalizePermissionGroups(
          data
        )
      );
    } catch (error) {
      console.error(error);

      message.error(
        "Failed to load permissions."
      );

      setPermissionGroups([]);
    } finally {
      setLoadingPermissions(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Table columns
  |--------------------------------------------------------------------------
  */

  const columns = [
    {
      title: "Role Key",
      dataIndex: "name",
      key: "name",

      render: (value) => (
        <Text
          strong
          code
        >
          {value}
        </Text>
      ),
    },

    {
      title: "Label",
      dataIndex: "label",
      key: "label",

      render: (
        value,
        record
      ) =>
        value ||
        prettifyLabel(
          record.name
        ),
    },

    {
      title: "Description",
      dataIndex:
        "description",
      key: "description",

      render: (value) =>
        value || (
          <Text type="secondary">
            No description
          </Text>
        ),
    },

    {
      title: "Permissions",
      key: "permissions",

      render: (_, record) => (
        <RolePermissions
          permissions={
            record.permissions ||
            []
          }
          limit={5}
        />
      ),
    },

    {
      title: "Count",
      key: "count",
      width: 80,

      render: (_, record) => {
        const count =
          record.permissions
            ?.length || 0;

        return (
          <Badge
            count={count}
            style={{
              backgroundColor:
                count
                  ? "#1677ff"
                  : "#999",
            }}
          />
        );
      },
    },

    {
      title: "Type",
      key: "type",

      render: (_, record) => {
        if (
          record.name ===
          "super_admin"
        ) {
          return (
            <Tag color="red">
              System
            </Tag>
          );
        }

        if (record.is_system) {
          return (
            <Tag color="orange">
              System
            </Tag>
          );
        }

        return (
          <Tag color="blue">
            Custom
          </Tag>
        );
      },
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | Refresh table
  |--------------------------------------------------------------------------
  */

  function handleSuccess() {
    setRefresh(
      (value) => value + 1
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Page
  |--------------------------------------------------------------------------
  */

  return (
    <SimpleTablePageWithCRUD
      title="Roles & Permissions"
      endpoint="/admin/roles"
      columns={columns}
      reloadKey={refresh}
      modalForm={
        <RoleForm
          permissionGroups={
            permissionGroups
          }
          loadingPermissions={
            loadingPermissions
          }
          onSuccess={
            handleSuccess
          }
        />
      }
    />
  );
}