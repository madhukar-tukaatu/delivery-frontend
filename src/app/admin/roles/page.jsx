"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Alert,
  Button,
  Card,
  Space,
  Tag,
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

/*
|--------------------------------------------------------------------------
| Roles & Permissions Page
|--------------------------------------------------------------------------
*/

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

  const loadPermissions = useCallback(
    async () => {
      try {
        setLoadingPermissions(true);

        const data =
          await getPermissions();

        const normalized =
          normalizePermissionGroups(
            data
          );

        setPermissionGroups(
          Array.isArray(normalized)
            ? normalized
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load permissions:",
          error
        );

        setPermissionGroups([]);

        message.error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load permissions."
        );
      } finally {
        setLoadingPermissions(false);
      }
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | Initial load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  /*
  |--------------------------------------------------------------------------
  | Sync access permissions
  |--------------------------------------------------------------------------
  */

  const handleSyncAccess =
    useCallback(async () => {
      if (syncing) {
        return;
      }

      try {
        setSyncing(true);

        const response =
          await syncPermissions();

        console.log(
          "Access synchronization response:",
          response
        );

        message.success(
          "Access permissions synchronized successfully."
        );

        /*
         * Reload permission catalog after
         * Laravel route permissions are synced.
         */
        await loadPermissions();

        /*
         * Reload roles table because
         * role permission relationships may
         * have changed after synchronization.
         */
        setRefresh(
          (value) => value + 1
        );
      } catch (error) {
        console.error(
          "Access synchronization failed:",
          error
        );

        const responseData =
          error?.response?.data;

        const output =
          responseData?.output;

        if (output) {
          console.error(
            "Access sync output:",
            output
          );
        }

        message.error(
          responseData?.message ||
            error?.message ||
            "Access synchronization failed."
        );
      } finally {
        setSyncing(false);
      }
    }, [
      loadPermissions,
      syncing,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Refresh roles table after CRUD
  |--------------------------------------------------------------------------
  */

  const handleSuccess =
    useCallback(() => {
      setRefresh(
        (value) => value + 1
      );

      /*
       * Permission changes made through
       * role CRUD should also refresh the
       * permission-related UI.
       */
      loadPermissions();
    }, [
      loadPermissions,
    ]);

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

      width: 180,

      render: (value) => (
        <Text
          strong
          code
        >
          {value || "—"}
        </Text>
      ),
    },

    {
      title: "Label",

      dataIndex: "label",

      key: "label",

      width: 180,

      render: (
        value,
        record
      ) =>
        value ||
        prettifyLabel(
          record?.name
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

      width: 300,

      render: (
        _,
        record
      ) => (
        <RolePermissions
          permissions={
            Array.isArray(
              record?.permissions
            )
              ? record.permissions
              : []
          }
          limit={5}
        />
      ),
    },

    {
      title: "Count",

      key: "count",

      width: 80,

      align: "center",

      render: (
        _,
        record
      ) => {
        const count =
          Array.isArray(
            record?.permissions
          )
            ? record.permissions.length
            : 0;

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

      width: 110,

      render: (
        _,
        record
      ) => {
        if (
          record?.name ===
          "super_admin"
        ) {
          return (
            <Tag color="red">
              System
            </Tag>
          );
        }

        if (
          record?.is_system
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
  | Page
  |--------------------------------------------------------------------------
  */

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* --------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* --------------------------------------------------------------- */}

      <Card>
        <Space
          style={{
            width: "100%",
            justifyContent:
              "space-between",
          }}
          wrap
        >
          <Space
            align="start"
          >
            <SafetyOutlined
              style={{
                fontSize: 22,
                marginTop: 4,
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
                Manage administrator roles,
                permissions and access
                control.
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

      {/* --------------------------------------------------------------- */}
      {/* Synchronization information                                     */}
      {/* --------------------------------------------------------------- */}

      <Alert
        type="info"
        showIcon
        message="Access synchronization"
        description={
          <>
            Sync Access synchronizes
            permissions from the Laravel
            application routes through
            <Text code>
              app:sync-access
            </Text>
            . The permission catalog and
            roles table are reloaded after
            synchronization.
          </>
        }
      />

      {/* --------------------------------------------------------------- */}
      {/* Roles                                                           */}
      {/* --------------------------------------------------------------- */}

      <SimpleTablePageWithCRUD
        title="Roles"
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

      {/* --------------------------------------------------------------- */}
      {/* Permission Catalog                                              */}
      {/* --------------------------------------------------------------- */}

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