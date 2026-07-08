"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  deleteBranch,
  getBranches,
} from "@/services/adminBranchService";

const { Title, Text } = Typography;

const BRANCH_TYPES = [
  { value: "head_branch", label: "Head / Main Branch" },
  { value: "branch", label: "Branch" },
  { value: "franchise_branch", label: "Franchise Branch" },
  { value: "sub_branch", label: "Sub-Branch" },
  { value: "pickup_point", label: "Pickup Point" },
  { value: "delivery_hub", label: "Delivery Hub" },
];

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

function getStatusColor(status) {
  const value = String(status || "").toLowerCase();

  if (value === "active" || value === "approved") return "green";
  if (value === "pending_review" || value === "draft") return "blue";
  if (value === "suspended") return "orange";
  if (value === "rejected" || value === "closed") return "red";

  return "default";
}

function getTypeColor(type) {
  const value = String(type || "").toLowerCase();

  if (value === "head_branch" || value === "main_branch") return "purple";
  if (value === "franchise_branch") return "cyan";
  if (value === "branch") return "blue";
  if (value === "sub_branch") return "orange";
  if (value === "pickup_point") return "green";
  if (value === "delivery_hub") return "volcano";

  return "default";
}

function prettify(value) {
  return String(value || "-").replaceAll("_", " ");
}

export default function BranchListPage() {
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [type, setType] = useState(undefined);
  const [status, setStatus] = useState(undefined);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const loadBranches = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      try {
        setLoading(true);

        const response = await getBranches({
          page,
          per_page: pageSize,
          search: search || undefined,
          type,
          status,
        });

        setRows(response?.data || []);
        setPagination({
          current: response?.current_page || page,
          pageSize: response?.per_page || pageSize,
          total: response?.total || 0,
        });
      } catch (error) {
        console.error("Could not load branches:", error);
        message.error("Could not load branches.");
      } finally {
        setLoading(false);
      }
    },
    [pagination.current, pagination.pageSize, search, type, status]
  );

  useEffect(() => {
    loadBranches(1, pagination.pageSize);
  }, [search, type, status]);

  const handleDelete = async (branch) => {
    try {
      await deleteBranch(branch.id);
      message.success("Branch deleted successfully.");
      await loadBranches();
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not delete branch."
      );
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Branch",
        dataIndex: "name",
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{row.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.code || "No code"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Type",
        dataIndex: "type",
        width: 160,
        render: (value) => (
          <Tag color={getTypeColor(value)}>{prettify(value)}</Tag>
        ),
      },
      {
        title: "Parent",
        dataIndex: "parent",
        render: (parent) =>
          parent ? (
            <Space direction="vertical" size={0}>
              <Text>{parent.name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {prettify(parent.type)}
              </Text>
            </Space>
          ) : (
            <Text type="secondary">Main / No parent</Text>
          ),
      },
      {
        title: "Location",
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Text>{[row.area, row.city].filter(Boolean).join(", ") || "-"}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.phone || "-"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        width: 130,
        render: (value) => (
          <Tag color={getStatusColor(value)}>{prettify(value)}</Tag>
        ),
      },
      {
        title: "Services",
        width: 220,
        render: (_, row) => (
          <Space wrap size={4}>
            {row.pickup_enabled ? <Tag color="green">Pickup</Tag> : null}
            {row.delivery_enabled ? <Tag color="blue">Delivery</Tag> : null}
            {row.cod_enabled ? <Tag color="purple">COD</Tag> : null}
            {row.return_enabled ? <Tag color="orange">Return</Tag> : null}
          </Space>
        ),
      },
      {
        title: "Counts",
        width: 160,
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 12 }}>
              Children: {row.children_count || 0}
            </Text>
            <Text style={{ fontSize: 12 }}>
              Docs: {row.documents_count || 0}
            </Text>
            <Text style={{ fontSize: 12 }}>
              Agreements: {row.agreements_count || 0}
            </Text>
          </Space>
        ),
      },
      {
        title: "Actions",
        width: 160,
        fixed: "right",
        render: (_, row) => (
          <Space>
            <Tooltip title="View / Edit">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => router.push(`/admin/branches/${row.id}`)}
              />
            </Tooltip>

            <Tooltip title="Edit">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => router.push(`/admin/branches/${row.id}`)}
              />
            </Tooltip>

            <Popconfirm
              title="Delete branch?"
              description="This cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(row)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [router]
  );

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Branch Management
            </Title>
            <Text type="secondary">
              Branch list is dynamically filtered by user role and branch hierarchy.
            </Text>
          </Col>

          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => loadBranches()}>
                Refresh
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push("/admin/branches/create")}
              >
                Create Branch
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <Input.Search
              allowClear
              placeholder="Search by name, code, phone, city, area..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onSearch={(value) => setSearch(value)}
            />
          </Col>

          <Col xs={24} md={7}>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder="Filter by type"
              options={BRANCH_TYPES}
              value={type}
              onChange={setType}
            />
          </Col>

          <Col xs={24} md={7}>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder="Filter by status"
              options={STATUSES}
              value={status}
              onChange={setStatus}
            />
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
          }}
          onChange={(nextPagination) => {
            loadBranches(nextPagination.current, nextPagination.pageSize);
          }}
        />
      </Card>
    </Space>
  );
}