"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Button,
  Card,
  Input,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import {
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { useRouter } from "next/navigation";

import {
  getMerchants,
} from "@/services/merchantService";

import { StatusTag } from "@/components/PageTools";

import { usePermissions } from "@/hooks/usePermission";

const { Text } = Typography;

export default function MerchantsPage() {
  const router = useRouter();

  const {
    user,
    loading: authLoading,
    isSuperAdmin,
    branchId,
    can,
  } = usePermissions();

  const [rows, setRows] = useState([]);

  const [loading, setLoading] =
    useState(false);

  const [pagination, setPagination] =
    useState({
      current: 1,
      pageSize: 15,
      total: 0,
    });

  const [search, setSearch] =
    useState("");

  const [searchInput, setSearchInput] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Permission
  |--------------------------------------------------------------------------
  */

  const canViewMerchants =
    can("merchants.view");

  /*
  |--------------------------------------------------------------------------
  | Load Merchants
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | Both Super Admin and Branch Manager use:
  |
  | GET /admin/merchants
  |
  | The backend decides whether the user gets:
  |
  | Super Admin
  |   -> all merchants
  |
  | Branch Manager
  |   -> only merchants belonging to their branch
  |
  */

  const load = useCallback(
    async (
      page = 1,
      pageSize = 15,
      currentSearch = "",
    ) => {
      /*
      |--------------------------------------------------------------------------
      | No authenticated user
      |--------------------------------------------------------------------------
      */

      if (!user) {
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Permission check
      |--------------------------------------------------------------------------
      */

      if (!canViewMerchants) {
        setRows([]);

        setPagination({
          current: 1,
          pageSize,
          total: 0,
        });

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Branch check
      |--------------------------------------------------------------------------
      |
      | Super admin does not need a branch.
      |
      | Branch manager must have one.
      |
      */

      if (
        !isSuperAdmin &&
        !branchId
      ) {
        setRows([]);

        setPagination({
          current: 1,
          pageSize,
          total: 0,
        });

        message.warning(
          "No branch is assigned to your account.",
        );

        return;
      }

      setLoading(true);

      try {
        /*
        |--------------------------------------------------------------------------
        | API parameters
        |--------------------------------------------------------------------------
        */

        const params = {
          page,
          per_page: pageSize,

          ...(currentSearch
            ? {
                search:
                  currentSearch,
              }
            : {}),
        };

        /*
        |--------------------------------------------------------------------------
        | IMPORTANT
        |--------------------------------------------------------------------------
        |
        | NEVER call:
        |
        | /admin/branches/{branchId}/merchants
        |
        | Both user types use the same endpoint.
        |
        */

        const result =
          await getMerchants(
            params,
          );

        /*
        |--------------------------------------------------------------------------
        | Update table
        |--------------------------------------------------------------------------
        */

        setRows(
          result?.list ?? [],
        );

        setPagination({
          current:
            result?.currentPage ??
            page,

          pageSize:
            result?.pageSize ??
            pageSize,

          total:
            result?.total ??
            0,
        });
      } catch (error) {
        console.error(
          "Could not load merchants:",
          error,
        );

        message.error(
          error?.response?.data
            ?.message ??
            "Could not load merchants.",
        );

        setRows([]);

        setPagination({
          current: page,
          pageSize,
          total: 0,
        });
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      canViewMerchants,
      isSuperAdmin,
      branchId,
    ],
  );

  /*
  |--------------------------------------------------------------------------
  | Initial Load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      return;
    }

    if (!canViewMerchants) {
      return;
    }

    /*
     * Branch managers need branchId.
     *
     * Super admin does not.
     */
    if (
      !isSuperAdmin &&
      !branchId
    ) {
      return;
    }

    load(
      1,
      pagination.pageSize,
      search,
    );
  }, [
    authLoading,
    user,
    canViewMerchants,
    isSuperAdmin,
    branchId,
    load,
    pagination.pageSize,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const handleSearch = () => {
    const value =
      searchInput.trim();

    setSearch(value);

    load(
      1,
      pagination.pageSize,
      value,
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Reset
  |--------------------------------------------------------------------------
  */

  const handleReset = () => {
    setSearchInput("");

    setSearch("");

    load(
      1,
      pagination.pageSize,
      "",
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Refresh
  |--------------------------------------------------------------------------
  */

  const handleRefresh = () => {
    load(
      pagination.current,
      pagination.pageSize,
      search,
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Columns
  |--------------------------------------------------------------------------
  */

  const columns = [
    {
      title: "Merchant / Store",

      dataIndex: "name",

      key: "name",

      render: (
        value,
        row,
      ) => (
        <div>
          <Text
            strong
            style={{
              fontSize: 13,
            }}
          >
            {value || "—"}
          </Text>

          {row.owner_name && (
            <div>
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                }}
              >
                {row.owner_name}
              </Text>
            </div>
          )}
        </div>
      ),
    },

    {
      title: "Code",

      dataIndex: "code",

      key: "code",

      render: (
        value,
      ) =>
        value ? (
          <Tag
            style={{
              margin: 0,
              fontSize: 11,
            }}
          >
            {value}
          </Tag>
        ) : (
          "—"
        ),
    },

    {
      title: "Phone",

      dataIndex: "phone",

      key: "phone",

      render: (
        value,
      ) => (
        <Text
          style={{
            fontSize: 12,
          }}
        >
          {value || "—"}
        </Text>
      ),
    },

    {
      title: "Email",

      dataIndex: "email",

      key: "email",

      render: (
        value,
      ) => (
        <Text
          style={{
            fontSize: 12,
          }}
        >
          {value || "—"}
        </Text>
      ),
    },

    {
      title: "Branch",

      key: "branch",

      render: (
        _,
        row,
      ) => {
        const branch =
          row.default_branch ??
          row.branch;

        if (!branch) {
          return (
            <Text
              type="secondary"
              style={{
                fontSize: 11,
              }}
            >
              —
            </Text>
          );
        }

        return (
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {branch.name ||
                "—"}
            </div>

            {branch.code && (
              <Text
                type="secondary"
                style={{
                  fontSize: 10,
                }}
              >
                {branch.code}
              </Text>
            )}
          </div>
        );
      },
    },

    {
      title: "Status",

      dataIndex: "status",

      key: "status",

      render: (
        value,
      ) => (
        <StatusTag
          value={value}
        />
      ),
    },

    {
      title: "Created",

      dataIndex: "created_at",

      key: "created_at",

      render: (
        value,
      ) => (
        <Text
          type="secondary"
          style={{
            fontSize: 11,
          }}
        >
          {value
            ? new Date(
                value,
              ).toLocaleDateString(
                "en-NP",
                {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                },
              )
            : "—"}
        </Text>
      ),
    },

    {
      title: "Action",

      key: "action",

      width: 70,

      align: "center",

      render: (
        _,
        row,
      ) => (
        <Button
          type="text"
          size="small"
          icon={
            <EyeOutlined />
          }
          style={{
            color:
              "#6366f1",
          }}
          onClick={(
            event,
          ) => {
            event.stopPropagation();

            router.push(
              `/admin/merchants/${row.id}`,
            );
          }}
        />
      ),
    },
  ];

  /*
  |--------------------------------------------------------------------------
  | Auth Loading
  |--------------------------------------------------------------------------
  */

  if (authLoading) {
    return (
      <Card loading>
        <Text>
          Loading merchant permissions...
        </Text>
      </Card>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Not Authenticated
  |--------------------------------------------------------------------------
  */

  if (!user) {
    return (
      <Card>
        <Text type="danger">
          Unable to determine the
          authenticated user.
        </Text>
      </Card>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Permission Denied
  |--------------------------------------------------------------------------
  */

  if (!canViewMerchants) {
    return (
      <Card>
        <Space
          direction="vertical"
          size={4}
        >
          <Text
            strong
            style={{
              fontSize: 16,
            }}
          >
            Access Denied
          </Text>

          <Text type="secondary">
            You do not have permission
            to view merchants.
          </Text>
        </Space>
      </Card>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Branch Not Assigned
  |--------------------------------------------------------------------------
  */

  if (
    !isSuperAdmin &&
    !branchId
  ) {
    return (
      <Card>
        <Space
          direction="vertical"
          size={4}
        >
          <Text
            strong
            style={{
              fontSize: 16,
            }}
          >
            No Branch Assigned
          </Text>

          <Text type="secondary">
            Your account does not have
            an assigned branch, so
            merchants cannot be loaded.
          </Text>
        </Space>
      </Card>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Main Page
  |--------------------------------------------------------------------------
  */

  return (
    <Space
      direction="vertical"
      size={12}
      style={{
        width: "100%",
      }}
    >
      {/* Header */}

      <Card>
        <Space
          style={{
            justifyContent:
              "space-between",
            width: "100%",
          }}
          wrap
        >
          <div>
            <Text
              style={{
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              Merchants / Stores
            </Text>

            <br />

            <Text
              type="secondary"
              style={{
                fontSize: 12,
              }}
            >
              {isSuperAdmin
                ? "View all merchants and stores."
                : "View merchants assigned to your branch."}
            </Text>
          </div>

          <Button
            icon={
              <ReloadOutlined />
            }
            onClick={
              handleRefresh
            }
            loading={loading}
          >
            Refresh
          </Button>
        </Space>

        {/* Search */}

        <Space
          wrap
          style={{
            marginTop: 12,
          }}
        >
          <Input
            allowClear
            style={{
              width: 240,
            }}
            placeholder="Search name / email / phone"
            prefix={
              <SearchOutlined />
            }
            value={
              searchInput
            }
            onChange={(
              event,
            ) => {
              setSearchInput(
                event.target
                  .value,
              );
            }}
            onPressEnter={
              handleSearch
            }
          />

          <Button
            type="primary"
            onClick={
              handleSearch
            }
          >
            Search
          </Button>

          <Button
            onClick={
              handleReset
            }
          >
            Reset
          </Button>
        </Space>
      </Card>

      {/* Table */}

      <Card
        title={
          <Text
            style={{
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Merchant Directory
          </Text>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{
            x: 950,
          }}
          pagination={{
            ...pagination,

            showSizeChanger:
              true,

            pageSizeOptions: [
              "15",
              "30",
              "50",
            ],

            showTotal: (
              total,
              range,
            ) =>
              `${range[0]}–${range[1]} of ${total} merchants`,

            onChange: (
              page,
              pageSize,
            ) => {
              load(
                page,
                pageSize,
                search,
              );
            },
          }}
          onRow={(
            row,
          ) => ({
            style: {
              cursor:
                "pointer",
            },

            onClick: () => {
              router.push(
                `/admin/merchants/${row.id}`,
              );
            },
          })}
        />
      </Card>
    </Space>
  );
}