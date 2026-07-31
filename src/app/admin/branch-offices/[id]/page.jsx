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
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  BranchesOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  PlusOutlined,
  ShopOutlined,
  StopOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";

import {
  activateBranch,
  approveBranch,
  getBranch,
  rejectBranch,
  suspendBranch,
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

const STATUS_COLOR = {
  active: "success",
  approved: "blue",
  pending_review: "warning",
  draft: "default",
  suspended: "orange",
  rejected: "error",
  closed: "default",
};

function getRecord(response) {
  if (response?.data?.data) return response.data.data;
  if (response?.data) return response.data;
  return response;
}

function typeLabel(type) {
  if (type === "franchise_branch") return "Franchise / Main Branch";
  if (type === "sub_branch") return "Sub-Branch";
  if (type === "head_branch") return "Head Branch";
  if (type === "pickup_point") return "Pickup Point";
  if (type === "delivery_hub") return "Delivery Hub";
  return type || "—";
}

function typeColor(type) {
  if (type === "franchise_branch") return "blue";
  if (type === "sub_branch") return "green";
  if (type === "head_branch") return "purple";
  return "default";
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString();
}

export default function ViewBranchOfficePage() {
  const params = useParams();
  const router = useRouter();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState({ open: false, action: null, reason: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const loadRecord = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getBranch(params.id);
      setRecord(getRecord(response));
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load branch.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) loadRecord();
  }, [params.id]);

  const openAction = useCallback((action) => {
    setActionModal({ open: true, action, reason: "" });
  }, []);

  const closeAction = useCallback(() => {
    setActionModal({ open: false, action: null, reason: "" });
  }, []);

  const submitAction = useCallback(async () => {
    const { action, reason } = actionModal;
    if (!record?.id) return;
    setActionLoading(true);
    try {
      if (action === "approve") await approveBranch(record.id);
      if (action === "activate") await activateBranch(record.id);
      if (action === "suspend") await suspendBranch(record.id, reason || "Suspended from admin panel.");
      if (action === "reject") await rejectBranch(record.id, reason || "Rejected from admin panel.");
      message.success(`Branch ${action}d.`);
      closeAction();
      await loadRecord();
    } catch (error) {
      message.error(error?.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  }, [actionModal, record, closeAction, loadRecord]);

  const isFranchise = record?.type === "franchise_branch" || record?.type === "head_branch";

  const childColumns = [
    { title: "ID", dataIndex: "id", width: 60 },
    {
      title: "Name",
      dataIndex: "name",
      render: (text, row) => (
        <Link href={`/admin/branch-offices/${row.id}`}>{text}</Link>
      ),
    },
    { title: "Code", dataIndex: "code", render: (v) => v || "—" },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      align: "center",
      render: (v) => (
        <Badge
          status={STATUS_COLOR[v] === "success" ? "success" : "default"}
          text={<Text style={{ fontSize: 12 }}>{v}</Text>}
        />
      ),
    },
    {
      title: "",
      width: 70,
      align: "center",
      render: (_, row) => (
        <Link href={`/admin/branch-offices/${row.id}`}>
          <Button size="small" type="link">View</Button>
        </Link>
      ),
    },
  ];

  const documentColumns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "Title", dataIndex: "title", render: (v) => v || "—" },
    { title: "Type", dataIndex: "document_type", render: (v) => v || "—" },
    { title: "Notes", dataIndex: "notes", render: (v) => v || "—" },
  ];

  const agreementColumns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "Title", dataIndex: "title", render: (v) => v || "—" },
    { title: "Type", dataIndex: "agreement_type", render: (v) => v || "—" },
    {
      title: "Status",
      dataIndex: "status",
      width: 100,
      align: "center",
      render: (v) => v ? <Tag>{v}</Tag> : "—",
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
        <Alert type="error" showIcon message="Branch not found." />
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
              { title: <Link href="/admin/branch-offices">Branch Offices</Link> },
              { title: record.name },
            ]}
          />

          <Row justify="space-between" align="middle" gutter={[16, 12]}>
            <Col xs={24} md={16}>
              <Space direction="vertical" size={4}>
                <Space align="center" wrap>
                  <Text style={{ fontSize: 20, fontWeight: 600 }}>{record.name}</Text>
                  <Tag color={typeColor(record.type)} style={{ margin: 0 }}>
                    {typeLabel(record.type)}
                  </Tag>
                  <Tag color={STATUS_COLOR[record.status] || "default"} style={{ margin: 0 }}>
                    {record.status}
                  </Tag>
                </Space>
                <Space size={16}>
                  {record.code && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Code: <Text code>{record.code}</Text>
                    </Text>
                  )}
                  {record.parent && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Parent:{" "}
                      <Link href={`/admin/branch-offices/${record.parent.id}`}>
                        {record.parent.name}
                      </Link>
                    </Text>
                  )}
                  {record.coverage_location && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Allocation:{" "}
                      <Link href={`/admin/coverage-locations/${record.coverage_location.id}`}>
                        {record.coverage_location.name}
                      </Link>
                    </Text>
                  )}
                </Space>
              </Space>
            </Col>

            <Col xs={24} md={8}>
              <Row justify="end" gutter={[8, 8]}>
                <Col>
                  <Space size={4}>
                    <Button size="small" icon={<CheckCircleOutlined />} onClick={() => openAction("approve")}>
                      Approve
                    </Button>
                    <Button size="small" type="primary" icon={<ThunderboltOutlined />} onClick={() => openAction("activate")}>
                      Activate
                    </Button>
                    <Button size="small" icon={<StopOutlined />} onClick={() => openAction("suspend")}>
                      Suspend
                    </Button>
                  </Space>
                </Col>
                <Col>
                  <Space size={4}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/admin/branch-offices")}>
                      Back
                    </Button>
                    <Link href={`/admin/branch-offices/${params.id}/edit`}>
                      <Button type="primary" icon={<EditOutlined />}>Edit</Button>
                    </Link>
                  </Space>
                </Col>
              </Row>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* ── Details left + Map right ── */}
      <Row gutter={[16, 16]} align="stretch">

        {/* Left column */}
        <Col xs={24} xl={11}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>

            {/* Branch info */}
            <Card size="small" title={<Space size={6}><ShopOutlined />Branch Info</Space>}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="ID">{record.id}</Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Tag color={typeColor(record.type)}>{typeLabel(record.type)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Coverage Allocation" span={2}>
                  {record.coverage_location ? (
                    <Link href={`/admin/coverage-locations/${record.coverage_location.id}`}>
                      {record.coverage_location.name}
                    </Link>
                  ) : <Text type="secondary">Not assigned</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Coverage Radius">
                  {record.coverage_radius_km ? (
                    <Tag color="purple">{record.coverage_radius_km} km</Tag>
                  ) : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Daily Capacity">
                  {record.daily_shipment_capacity || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Services" span={2}>
                  <Space size={4} wrap>
                    {record.pickup_enabled && <Tag color="purple">Pickup</Tag>}
                    {record.delivery_enabled && <Tag color="orange">Delivery</Tag>}
                    {record.pod_enabled && <Tag color="green">POD</Tag>}
                    {record.return_enabled && <Tag color="cyan">Return</Tag>}
                    {!record.pickup_enabled && !record.delivery_enabled && !record.pod_enabled && !record.return_enabled && (
                      <Text type="secondary">None enabled</Text>
                    )}
                  </Space>
                </Descriptions.Item>
                {record.opening_time && (
                  <Descriptions.Item label="Hours" span={2}>
                    {record.opening_time} – {record.closing_time || "—"}
                  </Descriptions.Item>
                )}
                {record.operating_days?.length > 0 && (
                  <Descriptions.Item label="Operating Days" span={2}>
                    {record.operating_days.join(", ")}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Business info */}
            <Card size="small" title={<Space size={6}><UserOutlined />Business Details</Space>}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Legal Name" span={2}>{record.legal_name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Owner">{record.owner_name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Contact Person">{record.contact_person || "—"}</Descriptions.Item>
                <Descriptions.Item label="Phone">{record.phone || "—"}</Descriptions.Item>
                <Descriptions.Item label="Alt. Phone">{record.alternative_phone || "—"}</Descriptions.Item>
                <Descriptions.Item label="Email" span={2}>{record.email || "—"}</Descriptions.Item>
                <Descriptions.Item label="Business Type">{record.business_type || "—"}</Descriptions.Item>
                <Descriptions.Item label="PAN / VAT">{record.pan_vat_number || "—"}</Descriptions.Item>
                <Descriptions.Item label="Reg. Number" span={2}>{record.registration_number || "—"}</Descriptions.Item>
                {record.manager && (
                  <Descriptions.Item label="Manager" span={2}>
                    {record.manager.name}
                    {record.manager.email && (
                      <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                        {record.manager.email}
                      </Text>
                    )}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* Office location */}
            <Card size="small" title={<Space size={6}><EnvironmentOutlined />Office / Pickup Location</Space>}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="City">{record.office_city || "—"}</Descriptions.Item>
                <Descriptions.Item label="Area">{record.office_area || "—"}</Descriptions.Item>
                <Descriptions.Item label="Street">{record.office_street || "—"}</Descriptions.Item>
                <Descriptions.Item label="Landmark">{record.office_landmark || "—"}</Descriptions.Item>
                <Descriptions.Item label="Address" span={2}>{record.office_address || "—"}</Descriptions.Item>
                <Descriptions.Item label="Lat">{record.office_latitude || "—"}</Descriptions.Item>
                <Descriptions.Item label="Lng">{record.office_longitude || "—"}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Approval info */}
            {(record.approved_at || record.rejected_at || record.rejection_reason) && (
              <Card size="small" title={<Space size={6}><CalendarOutlined />Approval Info</Space>}>
                <Descriptions column={1} size="small">
                  {record.approver && (
                    <Descriptions.Item label="Approved By">{record.approver.name}</Descriptions.Item>
                  )}
                  {record.approved_at && (
                    <Descriptions.Item label="Approved At">{formatDate(record.approved_at)}</Descriptions.Item>
                  )}
                  {record.rejecter && (
                    <Descriptions.Item label="Rejected By">{record.rejecter.name}</Descriptions.Item>
                  )}
                  {record.rejected_at && (
                    <Descriptions.Item label="Rejected At">{formatDate(record.rejected_at)}</Descriptions.Item>
                  )}
                  {record.rejection_reason && (
                    <Descriptions.Item label="Rejection Reason">{record.rejection_reason}</Descriptions.Item>
                  )}
                </Descriptions>
              </Card>
            )}

            {/* Timestamps */}
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
            title={<Space size={6}><EnvironmentOutlined />Office Location Map</Space>}
            style={{ height: "100%" }}
          >
            <CoverageRadiusMap
              value={{
                latitude: record.office_latitude || record.latitude,
                longitude: record.office_longitude || record.longitude,
              }}
              radiusKm={record.coverage_radius_km || 1}
              existingLocations={record.coverage_location ? [record.coverage_location] : []}
              existingBranches={[record]}
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

      {/* ── Sub-branches (franchise/head only) ── */}
      {isFranchise && (
        <Card
          size="small"
          title={<Space size={6}><BranchesOutlined />Sub-Branches ({record.children?.length || 0})</Space>}
          extra={
            <Link href={`/admin/branch-offices/create?type=sub_branch&parent_id=${record.id}`}>
              <Button size="small" type="primary" icon={<PlusOutlined />}>
                Add Sub-Branch
              </Button>
            </Link>
          }
        >
          <Table
            rowKey="id"
            size="small"
            columns={childColumns}
            dataSource={record.children || []}
            pagination={false}
            locale={{ emptyText: "No sub-branches found." }}
          />
        </Card>
      )}

      {/* ── Documents ── */}
      <Card
        size="small"
        title={<Space size={6}><FileTextOutlined />Documents ({record.documents?.length || 0})</Space>}
      >
        <Table
          rowKey="id"
          size="small"
          columns={documentColumns}
          dataSource={record.documents || []}
          pagination={false}
          locale={{ emptyText: "No documents uploaded." }}
        />
      </Card>

      {/* ── Agreements ── */}
      <Card
        size="small"
        title={<Space size={6}><FileTextOutlined />Agreements ({record.agreements?.length || 0})</Space>}
      >
        <Table
          rowKey="id"
          size="small"
          columns={agreementColumns}
          dataSource={record.agreements || []}
          pagination={false}
          locale={{ emptyText: "No agreements found." }}
        />
      </Card>

      {/* ── Action modal ── */}
      <Modal
        open={actionModal.open}
        title={actionModal.action ? `${actionModal.action.charAt(0).toUpperCase() + actionModal.action.slice(1)} Branch` : ""}
        onCancel={closeAction}
        onOk={submitAction}
        okText="Confirm"
        confirmLoading={actionLoading}
        okButtonProps={{ danger: ["suspend", "reject"].includes(actionModal.action) }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text>Branch: <strong>{record.name}</strong></Text>
          {["suspend", "reject"].includes(actionModal.action) && (
            <textarea
              rows={3}
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #d9d9d9", resize: "vertical" }}
              value={actionModal.reason}
              onChange={(e) => setActionModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Enter reason (optional)"
            />
          )}
        </Space>
      </Modal>

    </Space>
  );
}
