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
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ApartmentOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  GlobalOutlined,
  HeatMapOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TableOutlined,
} from "@ant-design/icons";

import {
  deleteCoverageLocation,
  getCoverageLocations,
  updateCoverageLocation,
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

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function exportToCsv(data, filename) {
  const headers = ["ID", "Name", "Code", "Type", "Parent", "Radius (km)", "City", "Area", "Franchise", "Status"];
  const csvRows = data.map((r) => [
    r.id, r.name, r.code, r.type,
    r.parent?.name || "", r.coverage_radius_km,
    r.city || "", r.area || "", r.branch?.name || "", r.status,
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

export default function CoverageLocationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterForm] = Form.useForm();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [selectedMainKeys, setSelectedMainKeys] = useState([]);
  const [selectedSubKeys, setSelectedSubKeys] = useState([]);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    filterForm.setFieldsValue({
      q: searchParams.get("q") || undefined,
      parent_id: searchParams.get("parent_id") ? Number(searchParams.get("parent_id")) : undefined,
      status: searchParams.get("status") || undefined,
    });
  }, []);

  const mainZones = useMemo(() => rows.filter((r) => r.type === "main_branch_zone"), [rows]);
  const subZones = useMemo(() => rows.filter((r) => r.type === "sub_branch_zone"), [rows]);

  const subCountByParent = useMemo(() => {
    const map = {};
    subZones.forEach((r) => {
      if (r.parent_id) map[r.parent_id] = (map[r.parent_id] || 0) + 1;
    });
    return map;
  }, [subZones]);

  function syncUrl(values) {
    const params = new URLSearchParams();
    if (values.q) params.set("q", values.q);
    if (values.parent_id) params.set("parent_id", values.parent_id);
    if (values.status) params.set("status", values.status);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const values = filterForm.getFieldsValue();
      syncUrl(values);
      const params = {
        all: 1,
        q: values.q || undefined,
        status: values.status || undefined,
        parent_id: values.parent_id || undefined,
      };
      const response = await getCoverageLocations(params);
      setRows(normalizeRows(response));
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load coverage allocations.");
    } finally {
      setLoading(false);
    }
  }, [filterForm]);

  useEffect(() => { loadRows(); }, []);

  const removeRecord = useCallback(async (id) => {
    try {
      await deleteCoverageLocation(id);
      message.success("Deleted.");
      await loadRows();
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not delete.");
    }
  }, [loadRows]);

  const removeBulk = useCallback(async (ids) => {
    try {
      await Promise.all(ids.map((id) => deleteCoverageLocation(id)));
      message.success(`${ids.length} allocation(s) deleted.`);
      setSelectedMainKeys([]);
      setSelectedSubKeys([]);
      await loadRows();
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not delete.");
    }
  }, [loadRows]);

  const toggleStatus = useCallback(async (record) => {
    setTogglingId(record.id);
    try {
      const newStatus = record.status === "active" ? "inactive" : "active";
      await updateCoverageLocation(record.id, { ...record, status: newStatus });
      message.success(`Status → ${newStatus}.`);
      await loadRows();
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not update status.");
    } finally {
      setTogglingId(null);
    }
  }, [loadRows]);

  const resetFilters = useCallback(() => {
    filterForm.resetFields();
    router.replace("?", { scroll: false });
    loadRows();
  }, [filterForm, loadRows]);

  const actionCol = useCallback((record) => (
    <Space>
      <Link href={`/admin/coverage-locations/${record.id}`}>
        <Button size="small" icon={<EyeOutlined />} />
      </Link>
      <Link href={`/admin/coverage-locations/${record.id}/edit`}>
        <Button size="small" icon={<EditOutlined />} />
      </Link>
      <Popconfirm title="Delete this allocation?" onConfirm={() => removeRecord(record.id)}>
        <Button size="small" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space>
  ), [removeRecord]);

  const statusCol = useCallback((record) => (
    <Switch
      size="small"
      checked={record.status === "active"}
      loading={togglingId === record.id}
      onChange={() => toggleStatus(record)}
      checkedChildren="Active"
      unCheckedChildren="Inactive"
    />
  ), [togglingId, toggleStatus]);

  const mainColumns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 65, sorter: (a, b) => Number(a.id) - Number(b.id) },
    {
      title: "Allocation",
      dataIndex: "name",
      sorter: (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Link href={`/admin/coverage-locations/${record.id}`}>{text}</Link>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
        </Space>
      ),
    },
    {
      title: "Sub-Branches",
      width: 110,
      align: "center",
      sorter: (a, b) => (subCountByParent[a.id] || 0) - (subCountByParent[b.id] || 0),
      render: (_, record) => (
        <Tag color={subCountByParent[record.id] ? "blue" : "default"}>
          {subCountByParent[record.id] || 0}
        </Tag>
      ),
    },
    {
      title: "Radius",
      dataIndex: "coverage_radius_km",
      width: 90,
      align: "right",
      sorter: (a, b) => Number(a.coverage_radius_km || 0) - Number(b.coverage_radius_km || 0),
      render: (v) => `${v} km`,
    },
    {
      title: "City / Area",
      render: (_, record) => <Text>{record.city || "-"} / {record.area || "-"}</Text>,
    },
    {
      title: "Franchise",
      render: (_, record) => record.branch?.name || <Text type="secondary">—</Text>,
    },
    {
      title: "Status",
      width: 110,
      align: "center",
      filters: [{ text: "Active", value: "active" }, { text: "Inactive", value: "inactive" }],
      onFilter: (value, record) => record.status === value,
      render: (_, record) => statusCol(record),
    },
    { title: "", fixed: "right", width: 110, render: (_, record) => actionCol(record) },
  ], [subCountByParent, statusCol, actionCol]);

  const subColumns = useMemo(() => [
    { title: "ID", dataIndex: "id", width: 65, sorter: (a, b) => Number(a.id) - Number(b.id) },
    {
      title: "Allocation",
      dataIndex: "name",
      sorter: (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Link href={`/admin/coverage-locations/${record.id}`}>{text}</Link>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
        </Space>
      ),
    },
    { title: "Parent", render: (_, record) => record.parent?.name || <Text type="secondary">—</Text> },
    {
      title: "Radius",
      dataIndex: "coverage_radius_km",
      width: 90,
      align: "right",
      sorter: (a, b) => Number(a.coverage_radius_km || 0) - Number(b.coverage_radius_km || 0),
      render: (v) => `${v} km`,
    },
    {
      title: "City / Area",
      render: (_, record) => <Text>{record.city || "-"} / {record.area || "-"}</Text>,
    },
    {
      title: "Franchise",
      render: (_, record) => record.branch?.name || <Text type="secondary">—</Text>,
    },
    {
      title: "Status",
      width: 110,
      align: "center",
      filters: [{ text: "Active", value: "active" }, { text: "Inactive", value: "inactive" }],
      onFilter: (value, record) => record.status === value,
      render: (_, record) => statusCol(record),
    },
    { title: "", fixed: "right", width: 110, render: (_, record) => actionCol(record) },
  ], [statusCol, actionCol]);

  function TabToolbar({ selectedKeys, onBulkDelete, data, csvFilename }) {
    return (
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          {selectedKeys.length > 0 && (
            <Popconfirm
              title={`Delete ${selectedKeys.length} allocation(s)?`}
              onConfirm={() => onBulkDelete(selectedKeys)}
            >
              <Button danger size="small" icon={<DeleteOutlined />}>
                Delete selected ({selectedKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Col>
        <Col>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => exportToCsv(data, csvFilename)}
          >
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
      <Button size="small" icon={<ReloadOutlined />} onClick={loadRows}>
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
              <Text style={{ fontSize: 20, fontWeight: 600 }}>
                Branch Allocation
              </Text>
              <Text type="secondary">
                Manage main branch and sub-branch service coverage allocations.
              </Text>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Link href="/admin/coverage-locations/create?type=main_branch_zone">
                <Button type="primary" icon={<PlusOutlined />}>
                  Add Main
                </Button>
              </Link>
              <Link href="/admin/coverage-locations/create?type=sub_branch_zone">
                <Button icon={<PlusOutlined />}>
                  Add Sub-Branch
                </Button>
              </Link>
            </Space>
          </Col>
        </Row>

        {/* Stats */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Total Allocations"
                value={rows.length}
                prefix={<HeatMapOutlined style={{ color: "#6366f1" }} />}
                valueStyle={{ color: "#6366f1" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Main Branch Zones"
                value={mainZones.length}
                prefix={<ApartmentOutlined style={{ color: "#3b82f6" }} />}
                valueStyle={{ color: "#3b82f6" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Sub-Branch Zones"
                value={subZones.length}
                prefix={<ApartmentOutlined style={{ color: "#22c55e" }} />}
                valueStyle={{ color: "#22c55e" }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card size="small">
          <Form form={filterForm} layout="inline" style={{ width: "100%" }}>
            <Row gutter={[12, 8]} style={{ width: "100%" }} align="middle">
              <Col xs={24} sm={12} md={7}>
                <Form.Item name="q" style={{ margin: 0, width: "100%" }}>
                  <Input
                    allowClear
                    placeholder="Search name, code, city, area..."
                    prefix={<SearchOutlined />}
                    onPressEnter={loadRows}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="parent_id" style={{ margin: 0, width: "100%" }}>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Filter by parent"
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    options={mainZones.map((item) => ({
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
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={16} md={7}>
                <Space>
                  <Button type="primary" icon={<SearchOutlined />} onClick={loadRows}>
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
              defaultActiveKey="main"
              tabBarExtraContent={tabBarExtra}
              items={[
                {
                  key: "main",
                  label: `Main Zone Allocation (${mainZones.length})`,
                  children: (
                    <>
                      <TabToolbar
                        selectedKeys={selectedMainKeys}
                        onBulkDelete={removeBulk}
                        data={mainZones}
                        csvFilename="main-allocations.csv"
                      />
                      <Table
                        rowKey="id"
                        size="small"
                        loading={loading}
                        columns={mainColumns}
                        dataSource={mainZones}
                        rowSelection={{ selectedRowKeys: selectedMainKeys, onChange: setSelectedMainKeys }}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        scroll={{ x: 900 }}
                        locale={{
                          emptyText: (
                            <Empty description="No main branch allocations">
                              <Link href="/admin/coverage-locations/create?type=main_branch_zone">
                                <Button type="primary" size="small" icon={<PlusOutlined />}>Add Main Allocation</Button>
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
                  label: `Sub-Branch Allocation (${subZones.length})`,
                  children: (
                    <>
                      <TabToolbar
                        selectedKeys={selectedSubKeys}
                        onBulkDelete={removeBulk}
                        data={subZones}
                        csvFilename="sub-allocations.csv"
                      />
                      <Table
                        rowKey="id"
                        size="small"
                        loading={loading}
                        columns={subColumns}
                        dataSource={subZones}
                        rowSelection={{ selectedRowKeys: selectedSubKeys, onChange: setSelectedSubKeys }}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        scroll={{ x: 900 }}
                        locale={{
                          emptyText: (
                            <Empty description="No sub-branch allocations">
                              <Link href="/admin/coverage-locations/create?type=sub_branch_zone">
                                <Button size="small" icon={<PlusOutlined />}>Add Sub-Branch Allocation</Button>
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
                existingLocations={rows}
                existingBranches={[]}
                showExisting
                showBranches={false}
                showCoverageRadius={false}
                height={650}
                clickable={false}
                showSearch={false}
                viewMode="nepal"
                onChange={() => {}}
              />
            </>
          )}
        </Card>

      </Space>
    </div>
  );
}
