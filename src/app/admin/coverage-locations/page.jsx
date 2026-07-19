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
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TableOutlined,
} from "@ant-design/icons";

import {
  deleteCoverageLocation,
  getCoverageLocations,
} from "@/services/branchAllocationApi";

const CoverageRadiusMap = dynamic(
  () => import("@/components/maps/CoverageRadiusMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 520,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading map...
      </div>
    ),
  },
);

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
  },
);

const { Title, Text } = Typography;

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

export default function CoverageLocationsPage() {
  const [filterForm] = Form.useForm();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table");

  const mainZones = useMemo(
    () => rows.filter((item) => item.type === "main_branch_zone"),
    [rows],
  );

  const mainCount = useMemo(
    () => rows.filter((item) => item.type === "main_branch_zone").length,
    [rows],
  );

  const subCount = useMemo(
    () => rows.filter((item) => item.type === "sub_branch_zone").length,
    [rows],
  );

  async function loadRows(extraFilters = {}) {
    try {
      setLoading(true);

      const values = filterForm.getFieldsValue();

      const params = {
        all: 1,
        q: values.q || undefined,
        type: values.type || undefined,
        status: values.status || undefined,
        parent_id: values.parent_id || undefined,
        ...extraFilters,
      };

      const response = await getCoverageLocations(params);
      setRows(normalizeRows(response));
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          "Could not load coverage allocations.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  async function removeRecord(id) {
    try {
      await deleteCoverageLocation(id);
      message.success("Coverage allocation deleted.");
      await loadRows();
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          "Could not delete coverage allocation.",
      );
    }
  }

  function resetFilters() {
    filterForm.resetFields();
    loadRows({
      q: undefined,
      type: undefined,
      status: undefined,
      parent_id: undefined,
    });
  }

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      sorter: (a, b) => Number(a.id) - Number(b.id),
    },
    {
      title: "Allocation",
      dataIndex: "name",
      sorter: (a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Link href={`/admin/coverage-locations/${record.id}`}>{text}</Link>
          <Text type="secondary">{record.code}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      filters: [
        { text: "Main Branch Allocation", value: "main_branch_zone" },
        { text: "Sub-Branch Allocation", value: "sub_branch_zone" },
      ],
      onFilter: (value, record) => record.type === value,
      render: (value) =>
        value === "main_branch_zone" ? (
          <Tag color="blue">Main Branch Allocation</Tag>
        ) : (
          <Tag color="green">Sub-Branch Allocation</Tag>
        ),
    },
    {
      title: "Parent",
      render: (_, record) => record.parent?.name || "-",
    },
    {
      title: "Radius",
      dataIndex: "coverage_radius_km",
      sorter: (a, b) =>
        Number(a.coverage_radius_km || 0) - Number(b.coverage_radius_km || 0),
      render: (value) => `${value} km`,
    },
    {
      title: "City / Area",
      render: (_, record) => (
        <Text>
          {record.city || "-"} / {record.area || "-"}
        </Text>
      ),
    },
    {
      title: "Assigned Franchise",
      render: (_, record) => record.branch?.name || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      filters: [
        { text: "Active", value: "active" },
        { text: "Inactive", value: "inactive" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (value) => (
        <Tag color={value === "active" ? "green" : "red"}>{value}</Tag>
      ),
    },
    {
      title: "Action",
      fixed: "right",
      width: 230,
      render: (_, record) => (
        <Space wrap>
          <Link href={`/admin/coverage-locations/${record.id}`}>
            <Button size="small" icon={<EyeOutlined />}>
              View
            </Button>
          </Link>

          <Link href={`/admin/coverage-locations/${record.id}/edit`}>
            <Button size="small" icon={<EditOutlined />}>
              Edit
            </Button>
          </Link>

          <Popconfirm
            title="Delete allocation?"
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
        <Card style={{ background: "#ffffff" }}>
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} lg={14}>
              <Space direction="vertical" size={4}>
                <Title level={3} style={{ margin: 0 }}>
                  Kathmandu Head Office - Branch Allocation
                </Title>

                <Text type="secondary">
                  Manage main branch and sub-branch service coverage
                  allocations.
                </Text>
              </Space>
            </Col>

            <Col xs={24} lg={10}>
              <Space
                wrap
                style={{
                  width: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <Link href="/admin/coverage-locations/create?type=main_branch_zone">
                  <Button type="primary" icon={<PlusOutlined />}>
                    Add Main Allocation
                  </Button>
                </Link>

                <Link href="/admin/coverage-locations/create?type=sub_branch_zone">
                  <Button icon={<PlusOutlined />}>
                    Add Sub-Branch Allocation
                  </Button>
                </Link>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card>
              <Text type="secondary">Total Allocations</Text>
              <Title level={3} style={{ margin: 0 }}>
                {rows.length}
              </Title>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card>
              <Text type="secondary">Main Branch Allocations</Text>
              <Title level={3} style={{ margin: 0 }}>
                {mainCount}
              </Title>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card>
              <Text type="secondary">Sub-Branch Allocations</Text>
              <Title level={3} style={{ margin: 0 }}>
                {subCount}
              </Title>
            </Card>
          </Col>
        </Row>

        <Card title="Filters" style={{ background: "#ffffff" }}>
          <Form form={filterForm} layout="vertical">
            <Row gutter={[12, 12]}>
              <Col xs={24} md={6}>
                <Form.Item label="Search" name="q">
                  <Input
                    allowClear
                    placeholder="Name, code, city, area..."
                    prefix={<SearchOutlined />}
                    onPressEnter={() => loadRows()}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={5}>
                <Form.Item label="Type" name="type">
                  <Select
                    allowClear
                    placeholder="All types"
                    options={[
                      {
                        value: "main_branch_zone",
                        label: "Main Branch Allocation",
                      },
                      {
                        value: "sub_branch_zone",
                        label: "Sub-Branch Allocation",
                      },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={5}>
                <Form.Item label="Parent" name="parent_id">
                  <Select
                    allowClear
                    showSearch
                    placeholder="All parents"
                    optionFilterProp="label"
                    options={mainZones.map((item) => ({
                      value: item.id,
                      label: `${item.name} (${item.code})`,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item label="Status" name="status">
                  <Select
                    allowClear
                    placeholder="All status"
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={4}>
                <Form.Item label=" ">
                  <Space>
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={() => loadRows()}
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

        <Card style={{ background: "#ffffff" }}>
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
                <Button onClick={() => loadRows()} icon={<ReloadOutlined />}>
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {viewMode === "table" && (
          <Card title="Allocation List" style={{ background: "#ffffff" }}>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={rows}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1300 }}
            />
          </Card>
        )}

        {viewMode === "map" && (
          <Card
            title="Overall Nepal Branch Allocation Map"
            style={{ background: "#ffffff" }}
          >
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
          </Card>
        )}
      </Space>
    </div>
  );
}
