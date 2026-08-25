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
  getMerchantsByBranchId,
} from "@/services/merchantService";

import { StatusTag } from "@/components/PageTools";

// Use the hook your project already uses for authenticated user.
// Change this import if your project has a different auth/user hook.
import { useAuth } from "@/hooks/useAuth";

const { Text } = Typography;

export default function MerchantsPage() {
  const router = useRouter();

  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 15,
    total: 0,
  });

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(
    async (
      page = 1,
      pageSize = 15,
      currentSearch = search
    ) => {
      if (!user) {
        return;
      }

      setLoading(true);

      try {
        const params = {
          page,
          per_page: pageSize,
          ...(currentSearch
            ? {
                search: currentSearch,
              }
            : {}),
        };

        let result;

        /*
         * IMPORTANT:
         *
         * Super admin:
         *   Can see every merchant.
         *
         * Everyone else:
         *   Must use their branch_id.
         *
         * This means branch_manager does NOT get
         * the global merchant list.
         */
        if (user.role === "super_admin") {
          result = await getMerchants(params);
        } else {
          if (!user.branch_id) {
            setRows([]);
            setPagination({
              current: 1,
              pageSize,
              total: 0,
            });

            message.warning(
              "No branch is assigned to your account."
            );

            return;
          }

          result = await getMerchantsByBranchId(
            user.branch_id,
            params
          );
        }

        setRows(result.list || []);

        setPagination({
          current: result.currentPage || page,
          pageSize: result.pageSize || pageSize,
          total: result.total || 0,
        });
      } catch (error) {
        console.error(
          "Could not load merchants:",
          error
        );

        message.error(
          error?.response?.data?.message ||
            "Could not load merchants."
        );
      } finally {
        setLoading(false);
      }
    },
    [user, search]
  );

  /*
   * Load once user is available.
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    load(
      1,
      pagination.pageSize,
      search
    );
  }, [user]);

  const handleSearch = () => {
    const value = searchInput.trim();

    setSearch(value);

    load(
      1,
      pagination.pageSize,
      value
    );
  };

  const handleReset = () => {
    setSearchInput("");
    setSearch("");

    load(
      1,
      pagination.pageSize,
      ""
    );
  };

  const columns = [
    {
      title: "Merchant / Store",
      dataIndex: "name",
      key: "name",

      render: (value, row) => (
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

      render: (value) =>
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

      render: (value) => (
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

      render: (value) => (
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

      render: (_, row) => {
        const branch =
          row.default_branch ||
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
              {branch.name || "—"}
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

      render: (value) => (
        <StatusTag value={value} />
      ),
    },

    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",

      render: (value) => (
        <Text
          type="secondary"
          style={{
            fontSize: 11,
          }}
        >
          {value
            ? new Date(value).toLocaleDateString(
                "en-NP",
                {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                }
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

      render: (_, row) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          style={{
            color: "#6366f1",
          }}
          onClick={(event) => {
            event.stopPropagation();

            router.push(
              `/admin/merchants/${row.id}`
            );
          }}
        />
      ),
    },
  ];

  return (
    <Space
      direction="vertical"
      size={12}
      style={{
        width: "100%",
      }}
    >
      <Card>
        <Space
          style={{
            justifyContent: "space-between",
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
              {user?.role === "super_admin"
                ? "View all merchants and stores."
                : "View merchants assigned to your branch."}
            </Text>
          </div>

          <Button
            icon={<ReloadOutlined />}
            onClick={() =>
              load(
                pagination.current,
                pagination.pageSize,
                search
              )
            }
            loading={loading}
          >
            Refresh
          </Button>
        </Space>

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
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={(event) => {
              setSearchInput(
                event.target.value
              );
            }}
            onPressEnter={handleSearch}
          />

          <Button
            type="primary"
            onClick={handleSearch}
          >
            Search
          </Button>

          <Button onClick={handleReset}>
            Reset
          </Button>
        </Space>
      </Card>

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

            showSizeChanger: true,

            pageSizeOptions: [
              "15",
              "30",
              "50",
            ],

            showTotal: (
              total,
              range
            ) =>
              `${range[0]}–${range[1]} of ${total} merchants`,

            onChange: (
              page,
              pageSize
            ) => {
              load(
                page,
                pageSize,
                search
              );
            },
          }}
          onRow={(row) => ({
            style: {
              cursor: "pointer",
            },

            onClick: () => {
              router.push(
                `/admin/merchants/${row.id}`
              );
            },
          })}
        />
      </Card>
    </Space>
  );
}