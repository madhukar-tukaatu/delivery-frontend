"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  Col,
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
  Typography,
  message,
} from "antd";
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  GlobalOutlined,
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

const CoverageRadiusMapFull = dynamic(
  () => import("@/components/maps/CoverageRadiusMapFull"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 650,
          background: "#f5f5f5",
          borderRadius: 8,
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

const { Text } = Typography;

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

const STATUS_COLOR = {
  active: "success",
  approved: "blue",
  pending_review: "warning",
  draft: "default",
  suspended: "orange",
  rejected: "error",
  closed: "default",
};

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function normalizePaginated(response) {
  const payload =
    response?.data && !Array.isArray(response.data) && Array.isArray(response.data.data)
      ? response.data
      : response;

  if (Array.isArray(payload?.data)) {
    return {
      rows: payload.data,
      pagination: { current: payload.current_page || 1, pageSize: payload.per_page || 10, total: payload.total || payload.data.length },
    };
  }
  if (Array.isArray(response?.data)) {
    return { rows: response.data, pagination: { current: 1, pageSize: response.data.length, total: response.data.length } };
  }
  return { rows: [], pagination: { current: 1, pageSize: 10, total: 0 } };
}

function exportToCsv(data, filename) {
  const headers = ["ID", "Name", "Code", "Type", "Parent", "Allocation", "City", "Status"];
  const csvRows = data.map((r) => [
    r.id, r.name, r.code || "", r.type,
    r.parent?.name || "", r.coverage_location?.name || "",
    r.city || "", r.status,
  ]);
  const csv = [headers, ...csvRows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table");

  const [franchisePagination, setFranchisePagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [subPagination, setSubPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const [selectedFranchiseKeys, setSelectedFranchiseKeys] = useState([]);
  const [selectedSubKeys, setSelectedSubKeys] = useState([]);

  const [actionModal, setActionModal] = useState({ open: false, action: null, record: null, reason: "" });

  // Sync form from URL on mount
  useEffect(() => {
    filterForm.setFieldsValue({
      q: searchParams.get("q") || undefined,
      status: searchParams.get("status") || undefined,
      parent_id: searchParams.get("parent_id") ? Number(searchParams.get("parent_id")) : undefined,
      coverage_location_id: searchParams.get("coverage_location_id") ? Number(searchParams.get("coverage_location_id")) : undefined,
    });
  }, []);

  const activeCount = useMemo(() => allBranches.filter((r) => r.status === "active").length, [allBranches]);

  const parentBranchOptions = useMemo(
    () => allBranches.filter((r) => r.type === "franchise_branch").map((r) => ({
      value: r.id,
      label: `${r.name} (${r.code || r.type})`,
    })),
    [allBranches],
  );

  function syncUrl(values) {
    const params = new URLSearchParams();
    if (values.q) params.set("q", values.q);
    if (values.status) params.set("status", values.status);
    if (values.parent_id) params.set("parent_id", values.parent_id);
    if (values.coverage_location_id) params.set("coverage_location_id", values.coverage_location_id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function buildParams(extra = {}) {
    const values = { ...filterForm.getFieldsValue(), ...extra };
    return {
      q: values.q || undefined,
      status: values.status || undefined,
      parent_id: values.parent_id || undefined,
      coverage_location_id: values.coverage_location_id || undefined,
    };
  }

  const loadSupportData = useCallback(async () => {
    const [allRes, covRes] = await Promise.all([
      getBranches({ all: 1 }),
      getCoverageLocations({ all: 1 }),
    ]);
    setAllBranches(normalizeRows(allRes));
    setCoverageLocations(normalizeRows(covRes));
  }, []);

  const loadFranchise = useCallback(async (page = 1, pageSize = 10, overrides = {}) => {
    try {
      setLoading(true);
      const res = await getBranches({ page, per_page: pageSize, type: "franchise_branch", ...buildParams(overrides) });
      const parsed = normalizePaginated(res);
      setFranchiseBranches(parsed.rows);
      setFranchisePagination(parsed.pagination);
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load branches.");
    } finally {
      setLoading(false);
    }
  }, [filterForm]);

  const loadSub = useCallback(async (page = 1, pageSize = 10, overrides = {}) => {
    try {
      setLoading(true);
      const res = await getBranches({ page, per_page: pageSize, type: "sub_branch", ...buildParams(overrides) });
      const parsed = normalizePaginated(res);
      setSubBranches(parsed.rows);
      setSubPagination(parsed.pagination);
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load branches.");
    } finally {
      setLoading(false);
    }
  }, [filterForm]);

  const loadMapData = useCallback(async (overrides = {}) => {
    try {
      setMapLoading(true);
      const res = await getBranches({ all: 1, ...buildParams(overrides) });
      setMapBranches(normalizeRows(res));
    } catch {
      // silent
    } finally {
      setMapLoading(false);
    }
  }, [filterForm]);

  const loadAll = useCallback(async (overrides = {}) => {
    await Promise.all([
      loadSupportData(),
      loadFranchise(1, franchisePagination.pageSize, overrides),
      loadSub(1, subPagination.pageSize, overrides),
      loadMapData(overrides),
    ]);
  }, [loadSupportData, loadFranchise, loadSub, loadMapData]);

  useEffect(() => { loadAll(); }, []);

  const applyFilters = useCallback(() => {
    const values = filterForm.getFieldsValue();
    syncUrl(values);
    loadFranchise(1, franchisePagination.pageSize);
    loadSub(1, subPagination.pageSize);
    loadMapData();
  }, [filterForm, loadFranchise, loadSub, loadMapData]);

  const resetFilters = useCallback(() => {
    filterForm.resetFields();
    router.replace("?", { scroll: false });
    const cleared = { q: undefined, status: undefined, parent_id: undefined, coverage_location_id: undefined };
    loadFranchise(1, franchisePagination.pageSize, cleared);
    loadSub(1, subPagination.pageSize, cleared);
    loadMapData(cleared);
  }, [filterForm, loadFranchise, loadSub, loadMapData]);

  const removeRecord = useCallback(async (id) => {
    try {
      await deleteBranch(id);
      message.success("Branch deleted.");
      await loadAll();
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not delete branch.");
    }
  }, [loadAll]);

  const removeBulk = useCallback(async (ids) => {
    try {
      await Promise.all(ids.map((id) => deleteBranch(id)));
      message.success(`${ids.length} branch(es) deleted.`);
      setSelectedFranchiseKeys([]);
      setSelectedSubKeys([]);
      await loadAll();
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not delete.");
    }
  }, [loadAll]);

  const openAction = useCallback((action, record) => {
    setActionModal({ open: true, action, record, reason: "" });
  }, []);

  const closeAction = useCallback(() => {
    setActionModal({ open: false, action: null, record: null, reason: "" });
  }, []);

  const submitAction = useCallback(async () => {
    const { action, record, reason } = actionModal;
    if (!record?.id) return;
    try {
      if (action === "approve") await approveBranch(record.id);
      if (action === "activate") await activateBranch(record.id);
      if (action === "suspend") await suspendBranch(record.id, reason || "Suspended from admin panel.");
      if (action === "reject") await rejectBranch(record.id, reason || "Rejected from admin panel.");
      message.success(`Branch ${action}d.`);
      closeAction();
      await loadAll();
    } catch (error) {
      message.error(error?.response?.data?.message || "Action failed.");
    }
  }, [actionModal, closeAction, loadAll]);

  const actionCol = useCallback((record) => (
    <Space size={4}>
      <Link href={`/admin/branch-offices/${record.id}`}>
        <Button size="small" icon={<EyeOutlined />} />
      </Link>
      <Link href={`/admin/branch-offices/${record.id}/edit`}>
        <Button size="small" icon={<EditOutlined />} />
      </Link>
      <Button size="small" icon={<CheckCircleOutlined />} onClick={() => openAction("approve", record)} />
      <Button size="small" type="primary" icon={<ThunderboltOutlined />} onClick={() => openAction("activate", record)} />
      <Button size="small" icon={<StopOutlined />} onClick={() => openAction("suspend", record)} />
      <Popconfirm title="Delete this branch?" onConfirm={() => removeRecord(record.id)}>
        <Button size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space>
  ), [openAction, removeRecord]);

  const sharedColumns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 65, sorter: (a, b) => Number(a.id) - Number(b.id) },
    {
      title: "Branch / Office",
      dataIndex: "name",
      sorter: (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Link href={`/admin/branch-offices/${record.id}`}>{text}</Link>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.code || "—"}</Text>
        </Space>
      ),
    },
    {
      title: "Allocation",
      render: (_, record) => record.coverage_location?.name || <Text type="secondary">—</Text>,
    },
    {
      title: "Office Location",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{record.office_address || "—"}</Text>
          {record.office_latitude && record.office_longitude && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.office_latitude}, {record.office_longitude}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Services",
      width: 160,
      render: (_, record) => (
        <Space size={4} wrap>
          {record.pickup_enabled && <Tag color="purple" style={{ fontSize: 11, padding: "0 4px" }}>Pickup</Tag>}
          {record.delivery_enabled && <Tag color="orange" style={{ fontSize: 11, padding: "0 4px" }}>Delivery</Tag>}
          {record.pod_enabled && <Tag color="green" style={{ fontSize: 11, padding: "0 4px" }}>POD</Tag>}
          {record.return_enabled && <Tag color="cyan" style={{ fontSize: 11, padding: "0 4px" }}>Return</Tag>}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      align: "center",
      filters: STATUS_OPTIONS.map((s) => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.status === value,
      render: (v) => <Tag color={STATUS_COLOR[v] || "default"} style={{ fontSize: 11 }}>{v}</Tag>,
    },
    { title: "", fixed: "right", width: 200, render: (_, record) => actionCol(record) },
  ], [actionCol]);

  const franchiseColumns = useMemo(() => [
    ...sharedColumns.slice(0, 2),
    {
      title: "Sub-Branches",
      width: 110,
      align: "center",
      render: (_, record) => (
        <Tag color={record.children?.length ? "blue" : "default"}>
          {record.children?.length || 0}
        </Tag>
      ),
    },
    ...sharedColumns.slice(2),
  ], [sharedColumns]);

  const subColumns = useMemo(() => [
    ...sharedColumns.slice(0, 2),
    {
      title: "Parent",
      render: (_, record) => record.parent?.name || <Text type="secondary">—</Text>,
    },
    ...sharedColumns.slice(2),
  ], [sharedColumns]);

  function TabToolbar({ selectedKeys, onBulkDelete, data, csvFilename }) {
    return (
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          {selectedKeys.length > 0 && (
            <Popconfirm
              title={`Delete ${selectedKeys.length} branch(es)?`}
              onConfirm={() => onBulkDelete(selectedKeys)}
            >
              <Button danger size="small" icon={<DeleteOutlined />}>
                Delete selected ({selectedKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Col>
        <Col>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => exportToCsv(data, csvFilename)}>
            Export CSV
          </Button>
        </Col>
      </Row>
    );
  }

  const tabBarExtra = (
    <Space>
      <Segmented
        size="small"
        value={viewMode}
        onChange={setViewMode}
        options={[
          { label: <Space size={4}><TableOutlined />Table</Space>, value: "table" },
          { label: <Space size={4}><GlobalOutlined />Map</Space>, value: "map" },
        ]}
      />
      <Button size="small" icon={<ReloadOutlined />} onClick={() => loadAll()}>
        Refresh
      </Button>
    </Space>
  );

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", padding: 20 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>

        {/* Header */}
        <Row justify="space-between" align="middle" gutter={[16, 12]}>
          <Col>
            <Space direction="vertical" size={2}>
              <Text style={{ fontSize: 20, fontWeight: 600 }}>Branch Offices</Text>
              <Text type="secondary">
                Manage franchise / main branches and sub-branches.
              </Text>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Link href="/admin/branch-offices/create?type=franchise_branch">
                <Button type="primary" icon={<PlusOutlined />}>Add Franchise</Button>
              </Link>
              <Link href="/admin/branch-offices/create?type=sub_branch">
                <Button icon={<PlusOutlined />}>Add Sub-Branch</Button>
              </Link>
            </Space>
          </Col>
        </Row>

        {/* Stats */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Total Branches"
                value={allBranches.length}
                prefix={<ShopOutlined style={{ color: "#6366f1" }} />}
                valueStyle={{ color: "#6366f1" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Active"
                value={activeCount}
                prefix={<ThunderboltOutlined style={{ color: "#22c55e" }} />}
                valueStyle={{ color: "#22c55e" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Franchise / Main"
                value={allBranches.filter((r) => r.type === "franchise_branch").length}
                prefix={<ApartmentOutlined style={{ color: "#3b82f6" }} />}
                valueStyle={{ color: "#3b82f6" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small">
              <Statistic
                title="Sub-Branches"
                value={allBranches.filter((r) => r.type === "sub_branch").length}
                prefix={<ApartmentOutlined style={{ color: "#f59e0b" }} />}
                valueStyle={{ color: "#f59e0b" }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card size="small">
          <Form form={filterForm} layout="inline" style={{ width: "100%" }}>
            <Row gutter={[12, 8]} style={{ width: "100%" }} align="middle">
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="q" style={{ margin: 0, width: "100%" }}>
                  <Input
                    allowClear
                    placeholder="Search name, code, city..."
                    prefix={<SearchOutlined />}
                    onPressEnter={applyFilters}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={5}>
                <Form.Item name="parent_id" style={{ margin: 0, width: "100%" }}>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Filter by parent"
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    options={parentBranchOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={5}>
                <Form.Item name="coverage_location_id" style={{ margin: 0, width: "100%" }}>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Filter by allocation"
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    options={coverageLocations.map((item) => ({
                      value: item.id,
                      label: `${item.name} (${item.code})`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8} md={4}>
                <Form.Item name="status" style={{ margin: 0, width: "100%" }}>
                  <Select
                    allowClear
                    placeholder="Status"
                    style={{ width: "100%" }}
                    options={STATUS_OPTIONS}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={16} md={4}>
                <Space>
                  <Button type="primary" icon={<SearchOutlined />} onClick={applyFilters}>
                    Search
                  </Button>
                  <Button onClick={resetFilters}>Reset</Button>
                </Space>
              </Col>
            </Row>
          </Form>
        </Card>

        {/* Table / Map */}
        <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
          {viewMode === "table" ? (
            <Tabs
              defaultActiveKey="franchise"
              tabBarExtraContent={tabBarExtra}
              items={[
                {
                  key: "franchise",
                  label: `Franchise / Main (${franchisePagination.total})`,
                  children: (
                    <>
                      <TabToolbar
                        selectedKeys={selectedFranchiseKeys}
                        onBulkDelete={removeBulk}
                        data={franchiseBranches}
                        csvFilename="franchise-branches.csv"
                      />
                      <Table
                        rowKey="id"
                        size="small"
                        loading={loading}
                        columns={franchiseColumns}
                        dataSource={franchiseBranches}
                        rowSelection={{ selectedRowKeys: selectedFranchiseKeys, onChange: setSelectedFranchiseKeys }}
                        pagination={{
                          current: franchisePagination.current,
                          pageSize: franchisePagination.pageSize,
                          total: franchisePagination.total,
                          showSizeChanger: false,
                          onChange: (page, pageSize) => loadFranchise(page, pageSize),
                        }}
                        scroll={{ x: 1100 }}
                        locale={{
                          emptyText: (
                            <Empty description="No franchise branches found">
                              <Link href="/admin/branch-offices/create?type=franchise_branch">
                                <Button type="primary" size="small" icon={<PlusOutlined />}>Add Franchise</Button>
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
                  label: `Sub-Branches (${subPagination.total})`,
                  children: (
                    <>
                      <TabToolbar
                        selectedKeys={selectedSubKeys}
                        onBulkDelete={removeBulk}
                        data={subBranches}
                        csvFilename="sub-branches.csv"
                      />
                      <Table
                        rowKey="id"
                        size="small"
                        loading={loading}
                        columns={subColumns}
                        dataSource={subBranches}
                        rowSelection={{ selectedRowKeys: selectedSubKeys, onChange: setSelectedSubKeys }}
                        pagination={{
                          current: subPagination.current,
                          pageSize: subPagination.pageSize,
                          total: subPagination.total,
                          showSizeChanger: false,
                          onChange: (page, pageSize) => loadSub(page, pageSize),
                        }}
                        scroll={{ x: 1100 }}
                        locale={{
                          emptyText: (
                            <Empty description="No sub-branches found">
                              <Link href="/admin/branch-offices/create?type=sub_branch">
                                <Button size="small" icon={<PlusOutlined />}>Add Sub-Branch</Button>
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

      {/* Action modal */}
      <Modal
        open={actionModal.open}
        title={actionModal.action ? `${actionModal.action.charAt(0).toUpperCase() + actionModal.action.slice(1)} Branch` : "Branch Action"}
        onCancel={closeAction}
        onOk={submitAction}
        okText="Confirm"
        okButtonProps={{ danger: ["suspend", "reject"].includes(actionModal.action) }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text>Branch: <strong>{actionModal.record?.name}</strong></Text>
          {["suspend", "reject"].includes(actionModal.action) && (
            <Input.TextArea
              rows={3}
              value={actionModal.reason}
              onChange={(e) => setActionModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Enter reason (optional)"
            />
          )}
        </Space>
      </Modal>
    </div>
  );
}
