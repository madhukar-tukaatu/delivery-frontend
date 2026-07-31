"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";

import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  GlobalOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShopOutlined,
  StopOutlined,
  TableOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

import {
  activateBranch,
  approveBranch,
  deleteBranch,
  getBranches,
  getCoverageLocations,
  rejectBranch,
  suspendBranch,
} from "@/services/branchAllocationApi";

import BranchInvitationStatusTag from "@/components/branches/BranchInvitationStatusTag";
import BranchInvitationActions from "@/components/branches/BranchInvitationActions";

const CoverageRadiusMapFull = dynamic(
  () => import("@/components/maps/CoverageRadiusMapFull"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 650,
          background: "#f6f8fb",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading Nepal map...
      </div>
    ),
  },
);

const { Paragraph, Text, Title } = Typography;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

const STATUS_COLOR = {
  active: "success",
  approved: "blue",
  pending_review: "warning",
  draft: "default",
  suspended: "orange",
  rejected: "error",
  closed: "default",
};

const SERVICE_TAGS = [
  ["pickup_enabled", "Pickup", "purple"],
  ["delivery_enabled", "Delivery", "orange"],
  ["pod_enabled", "POD", "green"],
  ["return_enabled", "Return", "cyan"],
];

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function normalizePaginated(response) {
  const payload =
    response?.data &&
    !Array.isArray(response.data) &&
    Array.isArray(response.data.data)
      ? response.data
      : response;

  if (Array.isArray(payload?.data)) {
    return {
      rows: payload.data,
      pagination: {
        current: payload.current_page || 1,
        pageSize: payload.per_page || 10,
        total: payload.total || payload.data.length,
      },
    };
  }

  if (Array.isArray(response?.data)) {
    return {
      rows: response.data,
      pagination: {
        current: 1,
        pageSize: response.data.length || 10,
        total: response.data.length,
      },
    };
  }

  return {
    rows: [],
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
    },
  };
}

function apiErrorMessage(error, fallback) {
  const errors = error?.response?.data?.errors;

  if (errors) {
    const firstError = Object.values(errors).flat().find(Boolean);
    if (firstError) return String(firstError);
  }

  return error?.response?.data?.message || fallback;
}

function isApprovedBranch(branch) {
  return ["approved", "active"].includes(branch?.status);
}

function isFranchiseBranch(branch) {
  return ["franchise", "franchise_branch"].includes(
    String(branch?.type || "").toLowerCase(),
  );
}

function formatStatus(value) {
  return String(value || "Unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function exportToCsv(data, filename) {
  const headers = [
    "ID",
    "Name",
    "Code",
    "Type",
    "Parent",
    "Allocation",
    "City",
    "Status",
    "Manager Email",
    "Account Invitation Status",
  ];

  const rows = data.map((record) => [
    record.id,
    record.name,
    record.code || "",
    record.type,
    record.parent?.name || "",
    record.coverage_location?.name || "",
    record.city || record.office_city || "",
    record.status,
    record.account_invitation_email || record.manager?.email || "",
    record.account_invitation_status || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function ServiceTags({ record }) {
  const enabled = SERVICE_TAGS.filter(([field]) => Boolean(record?.[field]));

  if (!enabled.length) {
    return <Text type="secondary">No services</Text>;
  }

  return (
    <Space size={[4, 4]} wrap>
      {enabled.map(([field, label, color]) => (
        <Tag
          key={field}
          color={color}
          style={{
            marginInlineEnd: 0,
            borderRadius: 999,
            fontSize: 11,
            lineHeight: "20px",
            paddingInline: 8,
          }}
        >
          {label}
        </Tag>
      ))}
    </Space>
  );
}

export default function BranchOfficesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterForm] = Form.useForm();

  const [franchiseBranches, setFranchiseBranches] = useState([]);
  const [subBranches, setSubBranches] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);
  const [mapBranches, setMapBranches] = useState([]);

  const [franchiseLoading, setFranchiseLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [viewMode, setViewMode] = useState("table");
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "sub" ? "sub" : "franchise",
  );

  const [franchisePagination, setFranchisePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [subPagination, setSubPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [selectedFranchiseKeys, setSelectedFranchiseKeys] = useState([]);
  const [selectedSubKeys, setSelectedSubKeys] = useState([]);

  const [actionModal, setActionModal] = useState({
    open: false,
    action: null,
    record: null,
    reason: "",
  });

  useEffect(() => {
    filterForm.setFieldsValue({
      q: searchParams.get("q") || undefined,
      status: searchParams.get("status") || undefined,
      parent_id: searchParams.get("parent_id")
        ? Number(searchParams.get("parent_id"))
        : undefined,
      coverage_location_id: searchParams.get("coverage_location_id")
        ? Number(searchParams.get("coverage_location_id"))
        : undefined,
    });
  }, [filterForm, searchParams]);

  const activeCount = useMemo(
    () => allBranches.filter((record) => record.status === "active").length,
    [allBranches],
  );

  const franchiseCount = useMemo(
    () =>
      allBranches.filter((record) =>
        ["franchise", "franchise_branch", "head_branch", "main_branch"].includes(
          String(record.type || "").toLowerCase(),
        ),
      ).length,
    [allBranches],
  );

  const subCount = useMemo(
    () =>
      allBranches.filter((record) =>
        ["sub", "sub_branch", "pickup_point", "delivery_hub"].includes(
          String(record.type || "").toLowerCase(),
        ),
      ).length,
    [allBranches],
  );

  const parentBranchOptions = useMemo(
    () =>
      allBranches
        .filter((record) => isFranchiseBranch(record))
        .map((record) => ({
          value: record.id,
          label: `${record.name} (${record.code || record.type})`,
        })),
    [allBranches],
  );

  const syncUrl = useCallback(
    (values, tab = activeTab) => {
      const params = new URLSearchParams();

      if (values.q) params.set("q", values.q);
      if (values.status) params.set("status", values.status);
      if (values.parent_id) params.set("parent_id", values.parent_id);
      if (values.coverage_location_id) {
        params.set("coverage_location_id", values.coverage_location_id);
      }
      if (tab === "sub") params.set("tab", "sub");

      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [activeTab, router],
  );

  const buildParams = useCallback(
    (overrides = {}) => {
      const values = {
        ...filterForm.getFieldsValue(),
        ...overrides,
      };

      return {
        q: values.q || undefined,
        status: values.status || undefined,
        parent_id: values.parent_id || undefined,
        coverage_location_id: values.coverage_location_id || undefined,
      };
    },
    [filterForm],
  );

  const loadSupportData = useCallback(async () => {
    try {
      const [allResponse, coverageResponse] = await Promise.all([
        getBranches({ all: 1 }),
        getCoverageLocations({ all: 1 }),
      ]);

      setAllBranches(normalizeRows(allResponse));
      setCoverageLocations(normalizeRows(coverageResponse));
    } catch (error) {
      message.error(
        apiErrorMessage(error, "Could not load branch support data."),
      );
    }
  }, []);

  const loadFranchise = useCallback(
    async (page = 1, pageSize = 10, overrides = {}) => {
      try {
        setFranchiseLoading(true);

        const response = await getBranches({
          page,
          per_page: pageSize,
          type: "franchise_branch",
          ...buildParams(overrides),
        });

        const parsed = normalizePaginated(response);
        setFranchiseBranches(parsed.rows);
        setFranchisePagination(parsed.pagination);
      } catch (error) {
        message.error(
          apiErrorMessage(error, "Could not load franchise branches."),
        );
      } finally {
        setFranchiseLoading(false);
      }
    },
    [buildParams],
  );

  const loadSub = useCallback(
    async (page = 1, pageSize = 10, overrides = {}) => {
      try {
        setSubLoading(true);

        const response = await getBranches({
          page,
          per_page: pageSize,
          type: "sub_branch",
          ...buildParams(overrides),
        });

        const parsed = normalizePaginated(response);
        setSubBranches(parsed.rows);
        setSubPagination(parsed.pagination);
      } catch (error) {
        message.error(apiErrorMessage(error, "Could not load sub-branches."));
      } finally {
        setSubLoading(false);
      }
    },
    [buildParams],
  );

  const loadMapData = useCallback(
    async (overrides = {}) => {
      try {
        setMapLoading(true);
        const response = await getBranches({
          all: 1,
          ...buildParams(overrides),
        });
        setMapBranches(normalizeRows(response));
      } catch {
        // Keep the list usable if map data fails.
      } finally {
        setMapLoading(false);
      }
    },
    [buildParams],
  );

  const loadAll = useCallback(
    async (overrides = {}) => {
      await Promise.all([
        loadSupportData(),
        loadFranchise(1, franchisePagination.pageSize, overrides),
        loadSub(1, subPagination.pageSize, overrides),
        loadMapData(overrides),
      ]);
    },
    [
      franchisePagination.pageSize,
      loadFranchise,
      loadMapData,
      loadSub,
      loadSupportData,
      subPagination.pageSize,
    ],
  );

  useEffect(() => {
    loadAll();
    // Run once on initial mount. Reloads are handled explicitly afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = useCallback(() => {
    const values = filterForm.getFieldsValue();
    syncUrl(values);

    loadFranchise(1, franchisePagination.pageSize);
    loadSub(1, subPagination.pageSize);
    loadMapData();
  }, [
    filterForm,
    franchisePagination.pageSize,
    loadFranchise,
    loadMapData,
    loadSub,
    subPagination.pageSize,
    syncUrl,
  ]);

  const resetFilters = useCallback(() => {
    filterForm.resetFields();

    const cleared = {
      q: undefined,
      status: undefined,
      parent_id: undefined,
      coverage_location_id: undefined,
    };

    syncUrl(cleared);
    loadFranchise(1, franchisePagination.pageSize, cleared);
    loadSub(1, subPagination.pageSize, cleared);
    loadMapData(cleared);
  }, [
    filterForm,
    franchisePagination.pageSize,
    loadFranchise,
    loadMapData,
    loadSub,
    subPagination.pageSize,
    syncUrl,
  ]);

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      syncUrl(filterForm.getFieldsValue(), tab);
    },
    [filterForm, syncUrl],
  );

  const removeRecord = useCallback(
    async (id) => {
      try {
        await deleteBranch(id);
        message.success("Branch deleted.");
        await loadAll();
      } catch (error) {
        message.error(apiErrorMessage(error, "Could not delete branch."));
      }
    },
    [loadAll],
  );

  const removeBulk = useCallback(
    async (ids) => {
      try {
        await Promise.all(ids.map((id) => deleteBranch(id)));
        message.success(`${ids.length} branch(es) deleted.`);
        setSelectedFranchiseKeys([]);
        setSelectedSubKeys([]);
        await loadAll();
      } catch (error) {
        message.error(
          apiErrorMessage(error, "Could not delete the selected branches."),
        );
      }
    },
    [loadAll],
  );

  const openAction = useCallback((action, record) => {
    setActionModal({
      open: true,
      action,
      record,
      reason: "",
    });
  }, []);

  const closeAction = useCallback(() => {
    if (actionLoading) return;

    setActionModal({
      open: false,
      action: null,
      record: null,
      reason: "",
    });
  }, [actionLoading]);

  const submitAction = useCallback(async () => {
    const { action, record, reason } = actionModal;
    if (!record?.id) return;

    try {
      setActionLoading(true);

      if (action === "approve") await approveBranch(record.id);
      if (action === "activate") await activateBranch(record.id);
      if (action === "suspend") {
        await suspendBranch(record.id, reason || "Suspended from admin panel.");
      }
      if (action === "reject") {
        await rejectBranch(record.id, reason || "Rejected from admin panel.");
      }

      const messages = {
        approve: "Branch approved successfully.",
        activate: "Branch activated successfully.",
        suspend: "Branch suspended successfully.",
        reject: "Branch rejected successfully.",
      };

      message.success(messages[action] || "Branch updated successfully.");
      setActionModal({
        open: false,
        action: null,
        record: null,
        reason: "",
      });
      await loadAll();
    } catch (error) {
      message.error(apiErrorMessage(error, "Branch action failed."));
    } finally {
      setActionLoading(false);
    }
  }, [actionModal, loadAll]);

  const confirmDelete = useCallback(
    (record) => {
      Modal.confirm({
        title: "Delete branch?",
        content: `Delete ${record.name}? This action cannot be undone.`,
        okText: "Delete",
        okButtonProps: { danger: true },
        onOk: () => removeRecord(record.id),
      });
    },
    [removeRecord],
  );

  const buildActionMenu = useCallback(
    (record) => {
      const franchise = isFranchiseBranch(record);
      const approved = isApprovedBranch(record);
      const canActivate = ["approved", "suspended"].includes(record.status);
      const canSuspend = ["approved", "active"].includes(record.status);

      const items = [];

      if (!franchise && !approved) {
        items.push({
          key: "approve",
          icon: <CheckCircleOutlined />,
          label: "Approve branch",
        });
      }

      if (canActivate && record.status !== "active") {
        items.push({
          key: "activate",
          icon: <ThunderboltOutlined />,
          label: "Activate branch",
        });
      }

      if (canSuspend && record.status !== "suspended") {
        items.push({
          key: "suspend",
          icon: <StopOutlined />,
          label: "Suspend branch",
        });
      }

      if (!["rejected", "closed"].includes(record.status)) {
        items.push({
          key: "reject",
          icon: <StopOutlined />,
          label: "Reject branch",
          danger: true,
        });
      }

      if (items.length) {
        items.push({ type: "divider" });
      }

      items.push({
        key: "delete",
        icon: <DeleteOutlined />,
        label: "Delete branch",
        danger: true,
      });

      return {
        items,
        onClick: ({ key }) => {
          if (key === "delete") {
            confirmDelete(record);
            return;
          }

          openAction(key, record);
        },
      };
    },
    [confirmDelete, openAction],
  );

  const actionColumn = useCallback(
    (record) => (
      <Space size={6}>
        <Link href={`/admin/branch-offices/${record.id}`}>
          <Button
            size="small"
            type="danger"
            ghost
            icon={<EyeOutlined />}
          >
          </Button>
        </Link>

        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          menu={buildActionMenu(record)}
        >
          <Tooltip title="More actions">
            <Button size="small" icon={<MoreOutlined />} />
          </Tooltip>
        </Dropdown>
      </Space>
    ),
    [buildActionMenu],
  );

  const baseColumns = useMemo(
    () => [
      {
        title: "Branch / Office",
        dataIndex: "name",
        key: "name",
        width: 230,
        fixed: "left",
        sorter: (a, b) =>
          String(a.name || "").localeCompare(String(b.name || "")),
        render: (text, record) => (
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            <Link
              href={`/admin/branch-offices/${record.id}`}
              style={{ fontWeight: 600 }}
            >
              {text || "Unnamed branch"}
            </Link>

            <Space size={6} wrap>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.code || "No code"}
              </Text>

              <Tag
                style={{
                  marginInlineEnd: 0,
                  borderRadius: 999,
                  fontSize: 10,
                  lineHeight: "18px",
                }}
              >
                #{record.id}
              </Tag>
            </Space>
          </Space>
        ),
      },
      {
        title: "Allocation",
        key: "allocation",
        width: 190,
        render: (_, record) => {
          const allocation = record.coverage_location;

          if (!allocation) {
            return <Text type="secondary">Not assigned</Text>;
          }

          return (
            <Space direction="vertical" size={1} style={{ width: "100%" }}>
              <Tooltip title={allocation.name}>
                <Text ellipsis style={{ width: "100%" }}>
                  {allocation.name}
                </Text>
              </Tooltip>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {allocation.code || "No allocation code"}
              </Text>
            </Space>
          );
        },
      },
      {
        title: "Office location",
        key: "office_location",
        width: 260,
        render: (_, record) => (
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            <Paragraph
              ellipsis={{ rows: 2, tooltip: record.office_address || "" }}
              style={{ margin: 0, fontSize: 12 }}
            >
              {record.office_address || "Office address not added"}
            </Paragraph>

            {record.office_latitude && record.office_longitude ? (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.office_latitude}, {record.office_longitude}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Map point not set
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: "Services",
        key: "services",
        width: 190,
        render: (_, record) => <ServiceTags record={record} />,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        align: "center",
        render: (value) => (
          <Tag
            color={STATUS_COLOR[value] || "default"}
            style={{
              marginInlineEnd: 0,
              borderRadius: 999,
              minWidth: 82,
              textAlign: "center",
            }}
          >
            {formatStatus(value)}
          </Tag>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        fixed: "right",
        width: 128,
        align: "center",
        render: (_, record) => actionColumn(record),
      },
    ],
    [actionColumn],
  );

  const franchiseColumns = useMemo(
    () => [
      baseColumns[0],
      {
        title: "Sub-branches",
        key: "children_count",
        width: 110,
        align: "center",
        render: (_, record) => (
          <Tag
            color={Number(record.children_count || record.children?.length) ? "blue" : "default"}
            style={{ marginInlineEnd: 0, borderRadius: 999 }}
          >
            {record.children_count ?? record.children?.length ?? 0}
          </Tag>
        ),
      },
      baseColumns[1],
      baseColumns[2],
      baseColumns[3],
      {
        title: "Manager account",
        key: "manager_account",
        width: 250,
        render: (_, record) => (
          <Space direction="vertical" size={6} style={{ width: "100%" }}>
            <BranchInvitationStatusTag branch={record} showEmail />
            <div className="branch-invitation-actions">
              <BranchInvitationActions branch={record} onChanged={loadAll} />
            </div>
          </Space>
        ),
      },
      baseColumns[4],
      baseColumns[5],
    ],
    [baseColumns, loadAll],
  );

  const subColumns = useMemo(
    () => [
      baseColumns[0],
      {
        title: "Parent branch",
        key: "parent",
        width: 190,
        render: (_, record) =>
          record.parent?.name ? (
            <Space direction="vertical" size={1} style={{ width: "100%" }}>
              <Tooltip title={record.parent.name}>
                <Text ellipsis style={{ width: "100%" }}>
                  {record.parent.name}
                </Text>
              </Tooltip>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.parent.code || record.parent.type || "Parent branch"}
              </Text>
            </Space>
          ) : (
            <Text type="secondary">No parent</Text>
          ),
      },
      baseColumns[1],
      baseColumns[2],
      baseColumns[3],
      baseColumns[4],
      baseColumns[5],
    ],
    [baseColumns],
  );

  function TabToolbar({ selectedKeys, onBulkDelete, data, csvFilename }) {
    return (
      <Row
        justify="space-between"
        align="middle"
        gutter={[12, 10]}
        style={{ marginBottom: 12 }}
      >
        <Col>
          {selectedKeys.length ? (
            <Space wrap>
              <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                {selectedKeys.length} selected
              </Tag>

              <Popconfirm
                title={`Delete ${selectedKeys.length} selected branch(es)?`}
                description="This action cannot be undone."
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={() => onBulkDelete(selectedKeys)}
              >
                <Button danger size="small" icon={<DeleteOutlined />}>
                  Delete selected
                </Button>
              </Popconfirm>
            </Space>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Select rows to perform bulk actions.
            </Text>
          )}
        </Col>

        <Col>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => exportToCsv(data, csvFilename)}
          >
            Export current page
          </Button>
        </Col>
      </Row>
    );
  }

  const tabBarExtra = (
    <Space size={8} wrap>
      <Segmented
        size="small"
        value={viewMode}
        onChange={setViewMode}
        options={[
          {
            label: (
              <Space size={4}>
                <TableOutlined />
                Table
              </Space>
            ),
            value: "table",
          },
          {
            label: (
              <Space size={4}>
                <GlobalOutlined />
                Map
              </Space>
            ),
            value: "map",
          },
        ]}
      />

      <Button size="small" icon={<ReloadOutlined />} onClick={() => loadAll()}>
        Refresh
      </Button>
    </Space>
  );

  const tablePagination = (pagination, loader) => ({
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: pagination.total,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50],
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
    onChange: (page, pageSize) => loader(page, pageSize),
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 20,
        background: "linear-gradient(180deg, #f7faff 0%, #f2f6fb 100%)",
      }}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
          }}
        >
          <Row justify="space-between" align="middle" gutter={[16, 14]}>
            <Col>
              <Space direction="vertical" size={3}>
                <Title level={3} style={{ margin: 0 }}>
                  Branch Offices
                </Title>
                <Text type="secondary">
                  Manage branch allocation, operational status and manager access.
                </Text>
              </Space>
            </Col>

            <Col>
              <Space wrap>
                <Link href="/admin/branch-offices/create?type=franchise_branch">
                  <Button type="primary" icon={<PlusOutlined />}>
                    Add Franchise
                  </Button>
                </Link>

                <Link href="/admin/branch-offices/create?type=sub_branch">
                  <Button icon={<PlusOutlined />}>Add Sub-Branch</Button>
                </Link>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={[14, 14]}>
          <Col xs={24} sm={12} xl={6}>
            <Card className="branch-stat-card" bordered={false}>
              <Statistic
                title="Total branches"
                value={allBranches.length}
                prefix={<ShopOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card className="branch-stat-card" bordered={false}>
              <Statistic
                title="Active"
                value={activeCount}
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: "#16a34a" }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card className="branch-stat-card" bordered={false}>
              <Statistic
                title="Franchise / Main"
                value={franchiseCount}
                prefix={<ApartmentOutlined />}
                valueStyle={{ color: "#2563eb" }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card className="branch-stat-card" bordered={false}>
              <Statistic
                title="Sub-branches"
                value={subCount}
                prefix={<ApartmentOutlined />}
                valueStyle={{ color: "#d97706" }}
              />
            </Card>
          </Col>
        </Row>

        <Card bordered={false} className="branch-filter-card">
          <Form form={filterForm} layout="vertical">
            <Row gutter={[12, 4]} align="bottom">
              <Col xs={24} md={12} xl={6}>
                <Form.Item label="Search branch" name="q" style={{ marginBottom: 0 }}>
                  <Input
                    allowClear
                    placeholder="Name, code, city, email or phone"
                    prefix={<SearchOutlined />}
                    onPressEnter={applyFilters}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} xl={5}>
                <Form.Item label="Parent branch" name="parent_id" style={{ marginBottom: 0 }}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="All parents"
                    options={parentBranchOptions}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} xl={5}>
                <Form.Item
                  label="Coverage allocation"
                  name="coverage_location_id"
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="All allocations"
                    options={coverageLocations.map((item) => ({
                      value: item.id,
                      label: `${item.name} (${item.code})`,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} xl={3}>
                <Form.Item label="Status" name="status" style={{ marginBottom: 0 }}>
                  <Select allowClear placeholder="All" options={STATUS_OPTIONS} />
                </Form.Item>
              </Col>

              <Col xs={24} xl={5}>
                <Space wrap style={{ paddingBottom: 1 }}>
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={applyFilters}
                  >
                    Apply
                  </Button>
                  <Button onClick={resetFilters}>Clear</Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card
          bordered={false}
          className="branch-table-card"
          styles={{ body: { padding: "12px 16px 16px" } }}
        >
          {viewMode === "table" ? (
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              tabBarExtraContent={tabBarExtra}
              items={[
                {
                  key: "franchise",
                  label: (
                    <Space size={6}>
                      Franchise / Main
                      <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                        {franchisePagination.total}
                      </Tag>
                    </Space>
                  ),
                  children: (
                    <>
                      <TabToolbar
                        selectedKeys={selectedFranchiseKeys}
                        onBulkDelete={removeBulk}
                        data={franchiseBranches}
                        csvFilename="franchise-branches.csv"
                      />

                      <Table
                        className="branch-office-table"
                        rowKey="id"
                        size="middle"
                        sticky
                        tableLayout="fixed"
                        loading={franchiseLoading}
                        columns={franchiseColumns}
                        dataSource={franchiseBranches}
                        rowSelection={{
                          fixed: true,
                          columnWidth: 44,
                          selectedRowKeys: selectedFranchiseKeys,
                          onChange: setSelectedFranchiseKeys,
                        }}
                        pagination={tablePagination(
                          franchisePagination,
                          loadFranchise,
                        )}
                        scroll={{ x: 1480 }}
                        locale={{
                          emptyText: (
                            <Empty description="No franchise branches found">
                              <Link href="/admin/branch-offices/create?type=franchise_branch">
                                <Button type="primary" icon={<PlusOutlined />}>
                                  Add Franchise
                                </Button>
                              </Link>
                            </Empty>
                          ),
                        }}
                      />
                    </>
                  ),
                },
                {
                  key: "sub",
                  label: (
                    <Space size={6}>
                      Sub-branches
                      <Tag color="gold" style={{ marginInlineEnd: 0 }}>
                        {subPagination.total}
                      </Tag>
                    </Space>
                  ),
                  children: (
                    <>
                      <TabToolbar
                        selectedKeys={selectedSubKeys}
                        onBulkDelete={removeBulk}
                        data={subBranches}
                        csvFilename="sub-branches.csv"
                      />

                      <Table
                        className="branch-office-table"
                        rowKey="id"
                        size="middle"
                        sticky
                        tableLayout="fixed"
                        loading={subLoading}
                        columns={subColumns}
                        dataSource={subBranches}
                        rowSelection={{
                          fixed: true,
                          columnWidth: 44,
                          selectedRowKeys: selectedSubKeys,
                          onChange: setSelectedSubKeys,
                        }}
                        pagination={tablePagination(subPagination, loadSub)}
                        scroll={{ x: 1260 }}
                        locale={{
                          emptyText: (
                            <Empty description="No sub-branches found">
                              <Link href="/admin/branch-offices/create?type=sub_branch">
                                <Button icon={<PlusOutlined />}>Add Sub-Branch</Button>
                              </Link>
                            </Empty>
                          ),
                        }}
                      />
                    </>
                  ),
                },
              ]}
            />
          ) : (
            <>
              <Row justify="end" style={{ marginBottom: 12 }}>
                {tabBarExtra}
              </Row>

              <CoverageRadiusMapFull
                value={{}}
                radiusKm={5}
                existingLocations={coverageLocations}
                existingBranches={mapBranches}
                showExisting
                showBranches
                showCoverageRadius={false}
                height={650}
                clickable={false}
                showSearch={false}
                viewMode="nepal"
                loading={mapLoading}
                onChange={() => {}}
              />
            </>
          )}
        </Card>
      </Space>

      <Modal
        open={actionModal.open}
        title={
          actionModal.action
            ? `${formatStatus(actionModal.action)} Branch`
            : "Branch Action"
        }
        onCancel={closeAction}
        onOk={submitAction}
        confirmLoading={actionLoading}
        okText={
          actionModal.action === "approve"
            ? "Approve"
            : actionModal.action === "activate"
              ? "Activate"
              : "Confirm"
        }
        okButtonProps={{
          danger: ["suspend", "reject"].includes(actionModal.action),
        }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text>
            Branch: <strong>{actionModal.record?.name}</strong>
          </Text>

          {actionModal.action === "approve" ? (
            <Text type="secondary">This will approve the selected branch.</Text>
          ) : null}

          {actionModal.action === "activate" ? (
            <Text type="secondary">
              Franchise activation requires the manager to finish account setup.
            </Text>
          ) : null}

          {["suspend", "reject"].includes(actionModal.action) ? (
            <Input.TextArea
              rows={4}
              value={actionModal.reason}
              onChange={(event) =>
                setActionModal((previous) => ({
                  ...previous,
                  reason: event.target.value,
                }))
              }
              placeholder="Enter the reason"
            />
          ) : null}
        </Space>
      </Modal>

      <style jsx global>{`
        .branch-stat-card,
        .branch-filter-card,
        .branch-table-card {
          border-radius: 16px !important;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
        }

        .branch-office-table .ant-table-container {
          border: 1px solid #edf1f6;
          border-radius: 12px;
          overflow: hidden;
        }

        .branch-office-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          border-bottom: 1px solid #e5eaf1;
        }

        .branch-office-table .ant-table-tbody > tr > td {
          vertical-align: top;
          padding-top: 14px !important;
          padding-bottom: 14px !important;
          border-bottom-color: #eef2f6;
        }

        .branch-office-table .ant-table-tbody > tr:hover > td {
          background: #f8fbff !important;
        }

        .branch-office-table .ant-table-cell-fix-left,
        .branch-office-table .ant-table-cell-fix-right {
          background: #ffffff;
        }

        .branch-office-table .ant-table-tbody > tr:hover > .ant-table-cell-fix-left,
        .branch-office-table .ant-table-tbody > tr:hover > .ant-table-cell-fix-right {
          background: #f8fbff !important;
        }

        .branch-office-table .ant-table-pagination {
          margin-bottom: 0 !important;
        }

        .branch-invitation-actions .ant-space {
          gap: 4px !important;
          flex-wrap: wrap;
        }

        .branch-invitation-actions .ant-btn {
          height: 26px;
          padding-inline: 8px;
          font-size: 11px;
        }

        @media (max-width: 768px) {
          .branch-table-card .ant-tabs-nav {
            align-items: flex-start;
          }

          .branch-table-card .ant-tabs-extra-content {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}