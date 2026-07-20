"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  TableOutlined,
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

const CoverageRadiusMapFull = dynamic(
  () => import("@/components/maps/CoverageRadiusMapFull"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 650,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading Nepal map...
      </div>
    ),
  }
);

const { Title, Text } = Typography;

const BRANCH_TYPES = [
  { value: "franchise_branch", label: "Franchise / Main Branch" },
  { value: "sub_branch", label: "Sub-Branch" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function normalizePaginatedResponse(response) {
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
        pageSize: response.data.length,
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

function typeLabel(type) {
  return BRANCH_TYPES.find((item) => item.value === type)?.label || type || "-";
}

function typeColor(type) {
  if (type === "franchise_branch") return "blue";
  if (type === "sub_branch") return "green";
  return "default";
}

export default function BranchOfficesPage() {
  const [filterForm] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [mapBranches, setMapBranches] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table");

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [actionModal, setActionModal] = useState({
    open: false,
    action: null,
    record: null,
    reason: "",
  });

  const franchiseCount = useMemo(
    () => allBranches.filter((item) => item.type === "franchise_branch").length,
    [allBranches]
  );

  const subBranchCount = useMemo(
    () => allBranches.filter((item) => item.type === "sub_branch").length,
    [allBranches]
  );

  const activeCount = useMemo(
    () => allBranches.filter((item) => item.status === "active").length,
    [allBranches]
  );

  const parentBranchOptions = useMemo(
    () =>
      allBranches
        .filter((item) => item.type === "franchise_branch")
        .map((item) => ({
          value: item.id,
          label: `${item.name} (${item.code || item.type})`,
        })),
    [allBranches]
  );

  function buildFilterParams(extra = {}) {
    const values = {
      ...filterForm.getFieldsValue(),
      ...extra,
    };

    return {
      q: values.q || undefined,
      search: values.q || undefined,
      type: values.type || undefined,
      status: values.status || undefined,
      parent_id: values.parent_id || undefined,
      coverage_location_id: values.coverage_location_id || undefined,
    };
  }

  async function loadSupportData() {
    const [allBranchesResponse, coverageResponse] = await Promise.all([
      getBranches({ all: 1 }),
      getCoverageLocations({ all: 1 }),
    ]);

    setAllBranches(normalizeRows(allBranchesResponse));
    setCoverageLocations(normalizeRows(coverageResponse));
  }

  async function loadTableData(
    page = pagination.current,
    pageSize = pagination.pageSize,
    filterOverrides = {}
  ) {
    try {
      setLoading(true);

      const params = {
        page,
        per_page: pageSize,
        ...buildFilterParams(filterOverrides),
      };

      const branchResponse = await getBranches(params);
      const parsed = normalizePaginatedResponse(branchResponse);

      setBranches(parsed.rows);
      setPagination(parsed.pagination);
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not load branch offices."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMapData(filterOverrides = {}) {
    try {
      setMapLoading(true);

      const response = await getBranches({
        all: 1,
        ...buildFilterParams(filterOverrides),
      });

      setMapBranches(normalizeRows(response));
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not load branch map."
      );
    } finally {
      setMapLoading(false);
    }
  }

  async function loadInitialData() {
    try {
      await Promise.all([
        loadSupportData(),
        loadTableData(1, pagination.pageSize),
        loadMapData(),
      ]);
    } catch {
      message.error("Could not load branch office data.");
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function applyFilters() {
    await loadTableData(1, pagination.pageSize);
    await loadMapData();
  }

  async function resetFilters() {
    filterForm.resetFields();

    const cleared = {
      q: undefined,
      type: undefined,
      status: undefined,
      parent_id: undefined,
      coverage_location_id: undefined,
    };

    await loadTableData(1, pagination.pageSize, cleared);
    await loadMapData(cleared);
  }

  async function refreshAll() {
    await Promise.all([
      loadSupportData(),
      loadTableData(pagination.current, pagination.pageSize),
      loadMapData(),
    ]);
  }

  async function removeRecord(id) {
    try {
      await deleteBranch(id);
      message.success("Branch deleted.");
      await refreshAll();
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not delete branch.");
    }
  }

  function openAction(action, record) {
    setActionModal({
      open: true,
      action,
      record,
      reason: "",
    });
  }

  function closeAction() {
    setActionModal({
      open: false,
      action: null,
      record: null,
      reason: "",
    });
  }

  async function submitAction() {
    try {
      const { action, record, reason } = actionModal;

      if (!record?.id) return;

      if (action === "approve") {
        await approveBranch(record.id);
        message.success("Branch approved.");
      }

      if (action === "activate") {
        await activateBranch(record.id);
        message.success("Branch activated.");
      }

      if (action === "suspend") {
        await suspendBranch(record.id, reason || "Suspended from admin panel.");
        message.success("Branch suspended.");
      }

      if (action === "reject") {
        await rejectBranch(record.id, reason || "Rejected from admin panel.");
        message.success("Branch rejected.");
      }

      closeAction();
      await refreshAll();
    } catch (error) {
      message.error(error?.response?.data?.message || "Action failed.");
    }
  }

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      sorter: (a, b) => Number(a.id) - Number(b.id),
    },
    {
      title: "Branch / Office",
      dataIndex: "name",
      width: 260,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Link href={`/admin/branch-offices/${record.id}`}>{text}</Link>
          <Text type="secondary">{record.code || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      width: 190,
      render: (value) => (
        <Tag color={typeColor(value)}>{typeLabel(value)}</Tag>
      ),
    },
    {
      title: "Parent",
      width: 220,
      render: (_, record) => record.parent?.name || "-",
    },
    {
      title: "Assigned Allocation",
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.coverage_location?.name || "-"}</Text>
          <Text type="secondary">
            {record.latitude && record.longitude
              ? `${record.latitude}, ${record.longitude}`
              : "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Office / Pickup Location",
      width: 300,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.office_address || "-"}</Text>
          <Text type="secondary">
            {record.office_latitude && record.office_longitude
              ? `${record.office_latitude}, ${record.office_longitude}`
              : "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Service",
      width: 240,
      render: (_, record) => (
        <Space wrap>
          {record.pickup_enabled && <Tag color="purple">Pickup</Tag>}
          {record.delivery_enabled && <Tag color="orange">Delivery</Tag>}
          {record.pod_enabled && <Tag color="green">POD</Tag>}
          {record.return_enabled && <Tag color="cyan">Return</Tag>}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 140,
      render: (value) => (
        <Tag color={value === "active" ? "green" : "orange"}>{value}</Tag>
      ),
    },
    {
      title: "Action",
      fixed: "right",
      width: 360,
      render: (_, record) => (
        <Space wrap>
          <Link href={`/admin/branch-offices/${record.id}`}>
            <Button size="small" icon={<EyeOutlined />}>
              View
            </Button>
          </Link>

          <Link href={`/admin/branch-offices/${record.id}/edit`}>
            <Button size="small" icon={<EditOutlined />}>
              Edit
            </Button>
          </Link>

          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => openAction("approve", record)}
          >
            Approve
          </Button>

          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => openAction("activate", record)}
          >
            Activate
          </Button>

          <Button
            size="small"
            icon={<StopOutlined />}
            onClick={() => openAction("suspend", record)}
          >
            Suspend
          </Button>

          <Popconfirm
            title="Delete branch?"
            onConfirm={() => removeRecord(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", padding: 20 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card>
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} xl={12}>
              <Space direction="vertical" size={4}>
                <Title level={3} style={{ margin: 0 }}>
                  Franchise / Branch Office Assignment
                </Title>
                <Text type="secondary">
                  Manage franchise/main branches and sub-branches. Pickup and
                  delivery are handled from the physical office latitude and
                  longitude.
                </Text>
              </Space>
            </Col>

            <Col xs={24} xl={12}>
              <Space
                wrap
                style={{
                  width: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <Link href="/admin/branch-offices/create?type=franchise_branch">
                  <Button type="primary" icon={<PlusOutlined />}>
                    Add Franchise / Main Branch
                  </Button>
                </Link>

                <Link href="/admin/branch-offices/create?type=sub_branch">
                  <Button icon={<PlusOutlined />}>
                    Add Sub-Branch
                  </Button>
                </Link>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={3}>
            <Card>
              <Text type="secondary">Total</Text>
              <Title level={3} style={{ margin: 0 }}>
                {allBranches.length}
              </Title>
            </Card>
          </Col>

          <Col xs={24} md={3}>
            <Card>
              <Text type="secondary">Active</Text>
              <Title level={3} style={{ margin: 0 }}>
                {activeCount}
              </Title>
            </Card>
          </Col>

          <Col xs={24} md={6}>
            <Card>
              <Text type="secondary">Franchise / Main Branch</Text>
              <Title level={3} style={{ margin: 0 }}>
                {franchiseCount}
              </Title>
            </Card>
          </Col>

          <Col xs={24} md={6}>
            <Card>
              <Text type="secondary">Sub-Branches</Text>
              <Title level={3} style={{ margin: 0 }}>
                {subBranchCount}
              </Title>
            </Card>
          </Col>

          <Col xs={24} md={6}>
            <Card>
              <Text type="secondary">Table Records</Text>
              <Title level={3} style={{ margin: 0 }}>
                {pagination.total}
              </Title>
            </Card>
          </Col>
        </Row>

        <Card title="Filters">
          <Form form={filterForm} layout="vertical">
            <Row gutter={[12, 12]}>
              <Col xs={24} md={5}>
                <Form.Item label="Search" name="q">
                  <Input
                    allowClear
                    placeholder="Name, code, phone, city..."
                    prefix={<SearchOutlined />}
                    onPressEnter={applyFilters}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item label="Type" name="type">
                  <Select
                    allowClear
                    placeholder="All types"
                    options={BRANCH_TYPES}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item label="Parent Branch" name="parent_id">
                  <Select
                    allowClear
                    showSearch
                    placeholder="All parents"
                    optionFilterProp="label"
                    options={parentBranchOptions}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={5}>
                <Form.Item label="Allocation" name="coverage_location_id">
                  <Select
                    allowClear
                    showSearch
                    placeholder="All allocations"
                    optionFilterProp="label"
                    options={coverageLocations.map((item) => ({
                      value: item.id,
                      label: `${item.name} (${item.code})`,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={3}>
                <Form.Item label="Status" name="status">
                  <Select
                    allowClear
                    placeholder="All"
                    options={STATUS_OPTIONS}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={3}>
                <Form.Item label=" ">
                  <Space>
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={applyFilters}
                    >
                      Apply
                    </Button>

                    <Button onClick={resetFilters}>Reset</Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card>
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} md={12}>
              <Segmented
                value={viewMode}
                onChange={setViewMode}
                options={[
                  {
                    label: (
                      <Space>
                        <TableOutlined />
                        <span>Table View</span>
                      </Space>
                    ),
                    value: "table",
                  },
                  {
                    label: (
                      <Space>
                        <GlobalOutlined />
                        <span>Nepal Map View</span>
                      </Space>
                    ),
                    value: "map",
                  },
                ]}
              />
            </Col>

            <Col xs={24} md={12}>
              <Space
                style={{
                  width: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <Button icon={<ReloadOutlined />} onClick={refreshAll}>
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {viewMode === "table" && (
          <Card title="Branch / Office List">
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={branches}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
              }}
              onChange={(nextPagination) => {
                loadTableData(
                  nextPagination.current,
                  nextPagination.pageSize
                );
              }}
              scroll={{ x: 1800 }}
            />
          </Card>
        )}

        {viewMode === "map" && (
          <Card title="Overall Nepal Branch / Office Map" loading={mapLoading}>
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
              onChange={() => {}}
            />
          </Card>
        )}
      </Space>

      <Modal
        open={actionModal.open}
        title={
          actionModal.action
            ? `${actionModal.action.toUpperCase()} Branch`
            : "Branch Action"
        }
        onCancel={closeAction}
        onOk={submitAction}
        okText="Confirm"
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text>
            Branch: <strong>{actionModal.record?.name}</strong>
          </Text>

          {["suspend", "reject"].includes(actionModal.action) && (
            <Input.TextArea
              rows={4}
              value={actionModal.reason}
              onChange={(event) =>
                setActionModal((prev) => ({
                  ...prev,
                  reason: event.target.value,
                }))
              }
              placeholder="Enter reason"
            />
          )}
        </Space>
      </Modal>
    </div>
  );
}