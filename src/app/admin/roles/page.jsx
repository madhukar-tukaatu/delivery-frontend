"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Alert,
  Button,
  Card,
  Space,
  Typography,
  message,
} from "antd";

import {
  ReloadOutlined,
  SafetyOutlined,
} from "@ant-design/icons";

import {
  getPermissions,
  syncPermissions,
} from "@/services/accessApi";

import {
  SimpleTablePageWithCRUD,
} from "@/components/PageTools";

import RoleForm from "@/components/access/roles/RoleForm";

import RolePermissions from "@/components/access/roles/RolePermissions";

import PermissionCatalog from "@/components/access/roles/PermissionCatalog";

import {
  normalizePermissionGroups,
  prettifyLabel,
} from "@/components/access/roles/roleUtils";

const {
  Text,
} = Typography;

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
    syncing,
    setSyncing,
  ] = useState(false);

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
      setLoadingPermissions(
        true
      );

      const data =
        await getPermissions();

      setPermissionGroups(
        normalizePermissionGroups(
          data
        )
      );
    } catch (error) {
      console.error(
        error
      );

      message.error(
        "Failed to load permissions."
      );

      setPermissionGroups(
        []
      );
    } finally {
      setLoadingPermissions(
        false
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Sync access
  |--------------------------------------------------------------------------
  */

  async function handleSyncAccess() {
    try {
      setSyncing(true);

      await syncPermissions();

      message.success(
        "Access permissions synchronized successfully."
      );

      await loadPermissions();

      setRefresh(
        (value) =>
          value + 1
      );
    } catch (error) {
      console.error(
        error
      );

      const output =
        error?.response?.data
          ?.output;

      message.error(
        error?.response?.data
          ?.message ||
          "Access synchronization failed."
      );

      if (output) {
        console.error(
          "Sync output:",
          output
        );
      }
    } finally {
      setSyncing(false);
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

      render: (
        value
      ) => (
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
      title:
        "Description",

      dataIndex:
        "description",

      key: "description",

      render: (
        value
      ) =>
        value || (
          <Text type="secondary">
            No description
          </Text>
        ),
    },

    {
      title:
        "Permissions",

      key: "permissions",

      render: (
        _,
        record
      ) => (
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

      render: (
        _,
        record
      ) => {
        const count =
          record
            .permissions
            ?.length ||
          0;

        return (
          <Text strong>
            {count}
          </Text>
        );
      },
    },

    {
      title: "Type",

      key: "type",

      render: (
        _,
        record
      ) => {
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

        if (
          record.is_system
        ) {
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
      (value) =>
        value + 1
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Page
  |--------------------------------------------------------------------------
  */

  return (
    <div
      style={{
        display: "flex",
        flexDirection:
          "column",
        gap: 20,
      }}
    >
      <Card>
        <Space
          style={{
            width: "100%",
            justifyContent:
              "space-between",
          }}
          wrap
        >
          <Space>
            <SafetyOutlined
              style={{
                fontSize: 22,
              }}
            />

            <div>
              <Typography.Title
                level={3}
                style={{
                  margin: 0,
                }}
              >
                Roles & Permissions
              </Typography.Title>

              <Text type="secondary">
                Manage roles and
                synchronize
                permissions from
                Laravel routes.
              </Text>
            </div>
          </Space>

          <Button
            icon={
              <ReloadOutlined />
            }
            loading={syncing}
            onClick={
              handleSyncAccess
            }
          >
            Sync Access
          </Button>
        </Space>
      </Card>

      <Alert
        type="info"
        showIcon
        message="Access synchronization"
        description="Sync Access runs the Laravel access:sync-routes command through app:sync-access. After synchronization, the permission catalog is reloaded automatically."
      />

      <SimpleTablePageWithCRUD
        title="Roles"
        endpoint="/admin/roles"
        columns={columns}
        reloadKey={
          refresh
        }
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

      <PermissionCatalog
        groups={
          permissionGroups
        }
        loading={
          loadingPermissions
        }
      />
    </div>
  );
}