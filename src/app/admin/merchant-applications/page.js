"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  GlobalOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  StopOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { getMerchantApplications } from "@/services/merchantRegistrationService";
import { getEcho } from "@/lib/echo";

const { Text } = Typography;

const STATUS_CFG = {
  active: {
    bg: "#f0fdf4",
    text: "#15803d",
    label: "Active",
    icon: <CheckCircleOutlined />,
  },

  approved: {
    bg: "#f0fdf4",
    text: "#15803d",
    label: "Approved",
    icon: <CheckCircleOutlined />,
  },

  rejected: {
    bg: "#fef2f2",
    text: "#b91c1c",
    label: "Rejected",
    icon: <StopOutlined />,
  },

  pending: {
    bg: "#eff6ff",
    text: "#1d4ed8",
    label: "Pending",
    icon: <ClockCircleOutlined />,
  },

  onboarding: {
    bg: "#eff6ff",
    text: "#1d4ed8",
    label: "Onboarding",
    icon: <SyncOutlined spin />,
  },

  pending_verification: {
    bg: "#faf5ff",
    text: "#7c3aed",
    label: "Pending Verification",
    icon: <ClockCircleOutlined />,
  },

  under_review: {
    bg: "#ecfeff",
    text: "#0e7490",
    label: "Under Review",
    icon: <SyncOutlined spin />,
  },

  more_info_required: {
    bg: "#fff7ed",
    text: "#c2410c",
    label: "Info Required",
    icon: <InfoCircleOutlined />,
  },
};

const SOURCE_CFG = {
  public_website: {
    label: "Public Website",
    color: "blue",
    icon: <GlobalOutlined />,
  },

  store_manager: {
    label: "Store Integration",
    color: "purple",
    icon: <ApiOutlined />,
  },

  admin: {
    label: "Admin Created",
    color: "gold",
    icon: <ShopOutlined />,
  },
};

const AVATAR_COLORS = [
  "#6366f1",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
];

const STAT_STRIP = [
  {
    key: "all",
    status: undefined,
    label: "All",
    color: "#6366f1",
  },
  {
    key: "onboarding",
    status: "onboarding",
    label: "Onboarding",
    color: "#3b82f6",
  },
  {
    key: "pending",
    status: "pending",
    label: "Pending",
    color: "#2563eb",
  },
  {
    key: "pending_verification",
    status: "pending_verification",
    label: "Verification",
    color: "#7c3aed",
  },
  {
    key: "under_review",
    status: "under_review",
    label: "Review",
    color: "#0891b2",
  },
  {
    key: "more_info_required",
    status: "more_info_required",
    label: "Info Needed",
    color: "#f59e0b",
  },
  {
    key: "active",
    status: "active",
    label: "Approved",
    color: "#22c55e",
  },
  {
    key: "rejected",
    status: "rejected",
    label: "Rejected",
    color: "#ef4444",
  },
];

function StatusPill({ status }) {
  const normalized = String(status || "").toLowerCase();

  const config =
    STATUS_CFG[normalized] || {
      bg: "#f3f4f6",
      text: "#374151",
      label: status || "—",
      icon: null,
    };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: config.bg,
        color: config.text,
        whiteSpace: "nowrap",
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function SourceTag({ source }) {
  const normalized =
    String(source || "public_website").toLowerCase();

  const config =
    SOURCE_CFG[normalized] || {
      label: source || "Public Website",
      color: "default",
      icon: <GlobalOutlined />,
    };

  return (
    <Tag
      color={config.color}
      icon={config.icon}
      style={{
        margin: 0,
        fontSize: 11,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </Tag>
  );
}

function initials(name = "") {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function avatarBg(name = "") {
  const firstCharacter =
    String(name || "?").charCodeAt(0);

  return AVATAR_COLORS[
    firstCharacter % AVATAR_COLORS.length
  ];
}

function notifyRealtimeAction(payload) {
  const action = payload?.action;
  const source = payload?.source;

  const messages = {
    registered:
      "A merchant registered through the public website.",

    submitted:
      "A merchant submitted an application for verification.",

    created:
      "A new Store integration application was received.",

    resubmitted:
      "A Store integration application was resubmitted.",

    approved:
      "A merchant application was approved.",

    rejected:
      "A merchant application was rejected.",

    more_info_required:
      "More information was requested from a merchant.",
  };

  const text = messages[action];

  if (!text) {
    return;
  }

  if (action === "approved") {
    message.success(text);
    return;
  }

  if (action === "rejected") {
    message.warning(text);
    return;
  }

  if (
    source === "store_manager" &&
    ["created", "resubmitted"].includes(action)
  ) {
    message.info(text);
    return;
  }

  message.info(text);
}

export default function MerchantApplicationsPage() {
  const router = useRouter();

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [realtimeConnected, setRealtimeConnected] =
    useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState("");

  const [filters, setFilters] = useState({
    q: "",
    status: undefined,
    source: undefined,
  });

  /*
   * The websocket listener is registered only once.
   * This ref always contains the latest table query.
   */
  const queryRef = useRef({
    page: 1,
    pageSize: 20,
    filters: {
      q: "",
      status: undefined,
      source: undefined,
    },
  });

  useEffect(() => {
    queryRef.current = {
      page,
      pageSize,
      filters,
    };
  }, [page, pageSize, filters]);

  const load = useCallback(
    async (currentPage, currentPageSize, currentFilters) => {
      try {
        setLoading(true);

        const params = {
          page: currentPage,
          per_page: currentPageSize,
        };

        if (currentFilters.q) {
          params.q = currentFilters.q;
        }

        if (currentFilters.status) {
          params.status = currentFilters.status;
        }

        if (currentFilters.source) {
          params.source = currentFilters.source;
        }

        const result =
          await getMerchantApplications(params);

        setData(result.list || []);
        setTotal(Number(result.total || 0));
      } catch (error) {
        console.error(
          "Could not load merchant applications:",
          error,
        );

        message.error(
          error?.response?.data?.message ||
            "Could not load merchant applications.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /*
   * Accurate counters are loaded from server totals instead
   * of counting only the first visible page.
   */
  const loadCounts = useCallback(async () => {
    const requests = STAT_STRIP.map((item) => ({
      key: item.key,

      promise: getMerchantApplications({
        page: 1,
        per_page: 1,
        ...(item.status
          ? {
              status: item.status,
            }
          : {}),
      }),
    }));

    const results = await Promise.allSettled(
      requests.map((item) => item.promise),
    );

    const nextCounts = {};

    results.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        return;
      }

      nextCounts[requests[index].key] = Number(
        result.value?.total || 0,
      );
    });

    setCounts((current) => ({
      ...current,
      ...nextCounts,
    }));
  }, []);

  const refreshCurrent = useCallback(async () => {
    const current = queryRef.current;

    await Promise.allSettled([
      load(
        current.page,
        current.pageSize,
        current.filters,
      ),
      loadCounts(),
    ]);
  }, [load, loadCounts]);

  /*
   * Debounced search.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = searchText.trim();

      setPage(1);

      setFilters((current) => {
        if (current.q === normalized) {
          return current;
        }

        return {
          ...current,
          q: normalized,
        };
      });
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchText]);

  /*
   * Normal REST loading.
   */
  useEffect(() => {
    load(page, pageSize, filters);
  }, [page, pageSize, filters, load]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  /*
   * Realtime subscription for both registration flows:
   *
   * - public website registration/onboarding
   * - Store Manager direct integration
   */
  useEffect(() => {
    const echo = getEcho();

    if (!echo) {
      return undefined;
    }

    const connection =
      echo?.connector?.pusher?.connection;

    const connectedHandler = () => {
      setRealtimeConnected(true);
    };

    const disconnectedHandler = () => {
      setRealtimeConnected(false);
    };

    connection?.bind(
      "connected",
      connectedHandler,
    );

    connection?.bind(
      "disconnected",
      disconnectedHandler,
    );

    setRealtimeConnected(
      connection?.state === "connected",
    );

    const channel = echo.private(
      "admin.merchant-applications",
    );

    const handleMerchantChange = (payload) => {
      console.info(
        "[Merchant Applications] realtime event",
        payload,
      );

      const current = queryRef.current;

      Promise.allSettled([
        load(
          current.page,
          current.pageSize,
          current.filters,
        ),
        loadCounts(),
      ]);

      notifyRealtimeAction(payload);
    };

    channel.listen(
      ".merchant.application.changed",
      handleMerchantChange,
    );

    return () => {
      channel.stopListening(
        ".merchant.application.changed",
        handleMerchantChange,
      );

      echo.leave(
        "admin.merchant-applications",
      );

      connection?.unbind(
        "connected",
        connectedHandler,
      );

      connection?.unbind(
        "disconnected",
        disconnectedHandler,
      );
    };
  }, [load, loadCounts]);

  const columns = [
    {
      title: "Merchant",
      key: "merchant",
      width: 220,

      render: (_, row) => (
        <Space size={8}>
          <Avatar
            size={28}
            style={{
              background: avatarBg(row.name),
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials(row.name)}
          </Avatar>

          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                lineHeight: 1.3,
              }}
            >
              {row.name || "—"}
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                lineHeight: 1.3,
              }}
            >
              {row.owner_name || "—"}
            </div>
          </div>
        </Space>
      ),
    },

    {
      title: "Contact",
      key: "contact",
      width: 190,

      render: (_, row) => (
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#334155",
            }}
          >
            {row.email || "—"}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            {row.phone || "—"}
          </div>
        </div>
      ),
    },

    {
      title: "Source",
      dataIndex: "application_source",
      key: "application_source",
      width: 145,

      render: (source) => (
        <SourceTag source={source} />
      ),
    },

    {
      title: "Type",
      dataIndex: "business_type",
      key: "business_type",
      width: 115,

      render: (value) =>
        value ? (
          <Tag
            style={{
              fontSize: 11,
              padding: "0 6px",
              margin: 0,
            }}
          >
            {value}
          </Tag>
        ) : (
          <Text
            type="secondary"
            style={{
              fontSize: 11,
            }}
          >
            —
          </Text>
        ),
    },

    {
      title: "Branch",
      key: "branch",
      width: 170,

      render: (_, row) => {
        const name =
          row.default_branch?.name ||
          row.suggested_branch?.name;

        const label =
          row.default_branch?.name
            ? "assigned"
            : "suggested";

        if (!name) {
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
                color: row.default_branch?.name
                  ? "#15803d"
                  : "#334155",
              }}
            >
              {name}
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
              }}
            >
              {label}
            </div>
          </div>
        );
      },
    },

    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 155,

      render: (status) => (
        <StatusPill status={status} />
      ),
    },

    {
      title: "Callback",
      key: "callback_status",
      width: 100,

      render: (_, row) => {
        if (row.application_source !== "store_manager") return null;
        const s = String(row.integration_callback_status || "pending").toLowerCase();
        const color = s === "delivered" ? "#15803d" : s === "failed" ? "#b91c1c" : "#94a3b8";
        return (
          <span style={{ fontSize: 11, fontWeight: 600, color }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
        );
      },
    },

    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 100,

      render: (value) => (
        <Text
          style={{
            fontSize: 11,
            color: "#94a3b8",
          }}
        >
          {value
            ? new Date(value).toLocaleDateString(
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
              `/admin/merchant-applications/${row.id}`,
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
      <Row
        justify="space-between"
        align="middle"
        gutter={[8, 8]}
      >
        <Col>
          <Space size={8} wrap>
            <Text
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Merchant Applications
            </Text>

            <Text
              type="secondary"
              style={{
                fontSize: 12,
              }}
            >
              Review registrations, verify KYC and
              allocate branches
            </Text>

            <Tag
              color={
                realtimeConnected
                  ? "success"
                  : "default"
              }
              style={{
                margin: 0,
                fontSize: 10,
              }}
            >
              {realtimeConnected
                ? "Live"
                : "Connecting"}
            </Tag>
          </Space>
        </Col>

        <Col>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={refreshCurrent}
            loading={loading}
          >
            Refresh
          </Button>
        </Col>
      </Row>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {STAT_STRIP.map(
          ({
            key,
            status,
            label,
            color,
          }) => {
            const active =
              status === undefined
                ? !filters.status
                : filters.status === status;

            return (
              <button
                type="button"
                key={key}
                onClick={() => {
                  setPage(1);

                  setFilters((current) => ({
                    ...current,
                    status,
                  }));
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 20,

                  border: `1px solid ${
                    active
                      ? color
                      : "#e2e8f0"
                  }`,

                  background: active
                    ? color
                    : "#fff",

                  color: active
                    ? "#fff"
                    : "#475569",

                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,

                    background: active
                      ? "rgba(255,255,255,.25)"
                      : `${color}18`,

                    color: active
                      ? "#fff"
                      : color,

                    fontSize: 11,
                    fontWeight: 700,

                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {counts[key] || 0}
                </span>

                {label}
              </button>
            );
          },
        )}
      </div>

      <Card
        bordered={false}
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            borderBottom:
              "1px solid #f1f5f9",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Input
            size="small"
            placeholder="Search name, email, phone…"
            allowClear
            prefix={
              <SearchOutlined
                style={{
                  color: "#94a3b8",
                  fontSize: 12,
                }}
              />
            }
            style={{
              width: 230,
              fontSize: 12,
            }}
            value={searchText}
            onChange={(event) => {
              setSearchText(
                event.target.value,
              );
            }}
          />

          <Select
            size="small"
            allowClear
            value={filters.status}
            placeholder="All statuses"
            style={{
              width: 185,
              fontSize: 12,
            }}
            onChange={(status) => {
              setPage(1);

              setFilters((current) => ({
                ...current,
                status,
              }));
            }}
            options={[
              {
                value: "onboarding",
                label: "Onboarding",
              },
              {
                value: "pending",
                label: "Pending",
              },
              {
                value:
                  "pending_verification",
                label:
                  "Pending Verification",
              },
              {
                value: "under_review",
                label: "Under Review",
              },
              {
                value:
                  "more_info_required",
                label: "Info Required",
              },
              {
                value: "active",
                label: "Approved",
              },
              {
                value: "rejected",
                label: "Rejected",
              },
            ]}
          />

          <Select
            size="small"
            allowClear
            value={filters.source}
            placeholder="All sources"
            style={{
              width: 175,
              fontSize: 12,
            }}
            onChange={(source) => {
              setPage(1);

              setFilters((current) => ({
                ...current,
                source,
              }));
            }}
            options={[
              {
                value: "public_website",
                label: "Public Website",
              },
              {
                value: "store_manager",
                label: "Store Integration",
              },
              {
                value: "admin",
                label: "Admin Created",
              },
            ]}
          />

          {(searchText ||
            filters.status ||
            filters.source) && (
            <Button
              size="small"
              onClick={() => {
                setPage(1);
                setSearchText("");

                setFilters({
                  q: "",
                  status: undefined,
                  source: undefined,
                });
              }}
            >
              Clear
            </Button>
          )}

          <Text
            type="secondary"
            style={{
              marginLeft: "auto",
              fontSize: 12,
            }}
          >
            {total} result
            {total !== 1 ? "s" : ""}
          </Text>
        </div>

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={data}
          columns={columns}
          scroll={{
            x: 1200,
          }}
          onRow={(row) => ({
            style: {
              cursor: "pointer",
            },

            onClick: () => {
              router.push(
                `/admin/merchant-applications/${row.id}`,
              );
            },
          })}
          pagination={{
            size: "small",
            current: page,
            pageSize,
            total,
            showSizeChanger: true,

            pageSizeOptions: [
              "10",
              "20",
              "50",
            ],

            showTotal: (count, range) =>
              `${range[0]}–${range[1]} of ${count}`,

            onChange: (
              nextPage,
              nextPageSize,
            ) => {
              if (
                Number(nextPageSize) !==
                Number(pageSize)
              ) {
                setPage(1);
                setPageSize(nextPageSize);
                return;
              }

              setPage(nextPage);
            },
          }}
          locale={{
            emptyText: (
              <div
                style={{
                  padding: "32px 0",
                  textAlign: "center",
                }}
              >
                <ShopOutlined
                  style={{
                    fontSize: 28,
                    color: "#cbd5e1",
                    display: "block",
                    marginBottom: 8,
                  }}
                />

                <Text
                  type="secondary"
                  style={{
                    fontSize: 12,
                  }}
                >
                  No applications found
                </Text>
              </div>
            ),
          }}
        />
      </Card>
    </Space>
  );
}