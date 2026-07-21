"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  BranchesOutlined,
  CalendarOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";

import {
  getCoverageLocation,
  updateCoverageLocation,
} from "@/services/branchAllocationApi";

const CoverageRadiusMap = dynamic(
  () => import("@/components/maps/CoverageRadiusMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 460,
          background: "#f5f5f5",
          borderRadius: 8,
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

const { Text } = Typography;

function getRecord(response) {
  return response?.data || response;
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString();
}

export default function ViewCoverageLocationPage() {
  const params = useParams();
  const router = useRouter();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const loadRecord = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getCoverageLocation(params.id);
      setRecord(getRecord(response));
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load coverage allocation.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) loadRecord();
  }, [params.id]);

  const toggleStatus = useCallback(async () => {
    if (!record) return;
    setTogglingStatus(true);
    try {
      const newStatus = record.status === "active" ? "inactive" : "active";
      await updateCoverageLocation(record.id, { ...record, status: newStatus });
      message.success(`Status updated to ${newStatus}.`);
      await loadRecord();
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not update status.");
    } finally {
      setTogglingStatus(false);
    }
  }, [record, loadRecord]);

  const isMain = record?.type === "main_branch_zone";

  const subBranchColumns = [
    { title: "ID", dataIndex: "id", width: 60 },
    {
      title: "Name",
      dataIndex: "name",
      render: (text, row) => (
        <Link href={`/admin/coverage-locations/${row.id}`}>{text}</Link>
      ),
    },
    { title: "Code", dataIndex: "code" },
    {
      title: "Radius",
      dataIndex: "coverage_radius_km",
      width: 90,
      align: "right",
      render: (v) => `${v} km`,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 90,
      align: "center",
      render: (v) => (
        <Badge
          status={v === "active" ? "success" : "default"}
          text={<Text style={{ fontSize: 12 }}>{v}</Text>}
        />
      ),
    },
    {
      title: "",
      width: 70,
      align: "center",
      render: (_, row) => (
        <Link href={`/admin/coverage-locations/${row.id}`}>
          <Button size="small" type="link">View</Button>
        </Link>
      ),
    },
  ];

  const franchiseColumns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "Name", dataIndex: "name" },
    { title: "Code", dataIndex: "code" },
    { title: "Type", dataIndex: "type", render: (v) => <Text style={{ fontSize: 12 }}>{v}</Text> },
    {
      title: "Status",
      dataIndex: "status",
      width: 90,
      align: "center",
      render: (v) => (
        <Badge
          status={v === "active" ? "success" : "default"}
          text={<Text style={{ fontSize: 12 }}>{v}</Text>}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <Space direction="vertical" size={16} style={{ width: "100%", padding: 20 }}>
        <Card loading style={{ minHeight: 120 }} />
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}><Card loading style={{ minHeight: 300 }} /></Col>
          <Col xs={24} xl={12}><Card loading style={{ minHeight: 300 }} /></Col>
        </Row>
      </Space>
    );
  }

  if (!record) {
    return (
      <div style={{ padding: 20 }}>
        <Alert type="error" showIcon message="Coverage allocation not found." />
      </div>
    );
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%", padding: 20 }}>

      {/* ── Header ── */}
      <Card bordered={false} styles={{ body: { paddingBottom: 16 } }}>
        <Space direction="vertical" size={10} style={{ width: "100%" }}>

          <Breadcrumb
            items={[
              { title: <Link href="/admin/coverage-locations">Coverage Locations</Link> },
              { title: record.name },
            ]}
          />

          <Row justify="space-between" align="middle" gutter={[16, 12]}>
            <Col xs={24} md={16}>
              <Space direction="vertical" size={4}>
                <Space align="center" wrap>
                  <Text style={{ fontSize: 20, fontWeight: 600 }}>{record.name}</Text>
                  <Tag color={isMain ? "blue" : "green"} style={{ margin: 0 }}>
                    {isMain ? "Main Branch Zone" : "Sub-Branch Zone"}
                  </Tag>
                  <Tag color={record.status === "active" ? "success" : "error"} style={{ margin: 0 }}>
                    {record.status}
                  </Tag>
                </Space>
                <Space size={16}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Code: <Text code>{record.code}</Text>
                  </Text>
                  {!isMain && record.parent && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Parent:{" "}
                      <Link href={`/admin/coverage-locations/${record.parent.id}`}>
                        {record.parent.name}
                      </Link>
                    </Text>
                  )}
                </Space>
              </Space>
            </Col>

            <Col xs={24} md={8}>
              <Row justify="end" gutter={8}>
                <Col>
                  <Space align="center">
                    <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                    <Switch
                      size="small"
                      checked={record.status === "active"}
                      loading={togglingStatus}
                      onChange={toggleStatus}
                      checkedChildren="Active"
                      unCheckedChildren="Inactive"
                    />
                  </Space>
                </Col>
                <Col>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => router.push("/admin/coverage-locations")}
                  >
                    Back
                  </Button>
                </Col>
                <Col>
                  <Link href={`/admin/coverage-locations/${params.id}/edit`}>
                    <Button type="primary" icon={<EditOutlined />}>Edit</Button>
                  </Link>
                </Col>
              </Row>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* ── Main content: details left, map right ── */}
      <Row gutter={[16, 16]} align="stretch">

        {/* Left column */}
        <Col xs={24} xl={11}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>

            {/* Core info */}
            <Card size="small" title="Allocation Info">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="ID">{record.id}</Descriptions.Item>
                <Descriptions.Item label="HQ Managed">
                  {record.is_hq_managed ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Franchise" span={2}>
                  {record.branch?.name || <Text type="secondary">Not assigned</Text>}
                </Descriptions.Item>
                {record.notes && (
                  <Descriptions.Item label="Notes" span={2}>
                    {record.notes}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Location */}
            <Card
              size="small"
              title={<Space size={6}><EnvironmentOutlined />Location</Space>}
            >
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Country">{record.country || "—"}</Descriptions.Item>
                <Descriptions.Item label="Province">{record.province || "—"}</Descriptions.Item>
                <Descriptions.Item label="District">{record.district || "—"}</Descriptions.Item>
                <Descriptions.Item label="City">{record.city || "—"}</Descriptions.Item>
                <Descriptions.Item label="Area">{record.area || "—"}</Descriptions.Item>
                <Descriptions.Item label="Street">{record.street || "—"}</Descriptions.Item>
                {record.landmark && (
                  <Descriptions.Item label="Landmark" span={2}>{record.landmark}</Descriptions.Item>
                )}
                {record.address && (
                  <Descriptions.Item label="Address" span={2}>{record.address}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Coordinates */}
            <Card size="small" title="Coordinates & Coverage">
              <Descriptions column={3} size="small">
                <Descriptions.Item label="Lat">{record.latitude}</Descriptions.Item>
                <Descriptions.Item label="Lng">{record.longitude}</Descriptions.Item>
                <Descriptions.Item label="Radius">
                  <Tag color="purple">{record.coverage_radius_km} km</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Metadata */}
            <Card size="small" title={<Space size={6}><CalendarOutlined />Timestamps</Space>}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Created">{formatDate(record.created_at)}</Descriptions.Item>
                <Descriptions.Item label="Updated">{formatDate(record.updated_at)}</Descriptions.Item>
              </Descriptions>
            </Card>

          </Space>
        </Col>

        {/* Right column — map */}
        <Col xs={24} xl={13}>
          <Card
            size="small"
            title={<Space size={6}><EnvironmentOutlined />Map Preview</Space>}
            style={{ height: "100%" }}
          >
            <CoverageRadiusMap
              value={{ latitude: record.latitude, longitude: record.longitude }}
              radiusKm={record.coverage_radius_km || 5}
              existingLocations={[record, ...(record.children || [])]}
              existingBranches={record.assignedBranches || []}
              showExisting
              showBranches
              height={460}
              clickable={false}
              showSearch={false}
              onChange={() => {}}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Sub-branches (main zones only) ── */}
      {isMain && (
        <Card
          size="small"
          title={<Space size={6}><BranchesOutlined />Sub-Branch Zones ({record.children?.length || 0})</Space>}
          extra={
            <Link href={`/admin/coverage-locations/create?type=sub_branch_zone&parent_id=${record.id}`}>
              <Button size="small" type="primary" icon={<PlusOutlined />}>
                Add Sub-Branch
              </Button>
            </Link>
          }
        >
          <Table
            rowKey="id"
            size="small"
            columns={subBranchColumns}
            dataSource={record.children || []}
            pagination={false}
            locale={{ emptyText: "No sub-branch zones assigned." }}
          />
        </Card>
      )}

      {/* ── Assigned Franchises ── */}
      <Card
        size="small"
        title={<Space size={6}><ShopOutlined />Assigned Franchises ({record.assignedBranches?.length || 0})</Space>}
      >
        <Table
          rowKey="id"
          size="small"
          columns={franchiseColumns}
          dataSource={record.assignedBranches || []}
          pagination={false}
          locale={{ emptyText: "No franchises assigned to this zone." }}
        />
      </Card>

    </Space>
  );
}
