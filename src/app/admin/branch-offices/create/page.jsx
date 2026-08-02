"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Col,
  Result,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  ShopOutlined,
} from "@ant-design/icons";

import * as branchApi from "@/services/branchAllocationApi";
import BranchAssignmentForm from "@/components/branches/BranchAssignmentForm";

import {
  apiErrorMessage,
  normalizeRows,
  unwrapRecord,
} from "@/components/branches/branch-office/branchOfficeUtils";

const { Text, Title } = Typography;

function normalizeType(value) {
  return value === "sub_branch" ? "sub_branch" : "franchise_branch";
}

// function isUnassignedCoverage(item) {
//   console.log("Checking coverage item:", item);
//   return (
//     String(item?.status || "").toLowerCase() === "inactive" &&
//     !item?.branch_id &&
//     !item?.assigned_branch_id &&
//     !item?.assigned_to_branch_id &&
//     !item?.branch?.id
//   );
// }

function isUnassignedCoverage(item) {
  const assignedBranches = Array.isArray(item?.assigned_branches)
    ? item.assigned_branches
    : Array.isArray(item?.assignedBranches)
      ? item.assignedBranches
      : [];

  const directlyAssignedBranchId =
    item?.branch_id ||
    item?.assigned_branch_id ||
    item?.assigned_to_branch_id ||
    item?.branch?.id ||
    null;

  const status = String(item?.status || "")
    .trim()
    .toLowerCase();

  const isInactive = status === "inactive";
  const hasDirectAssignment = Boolean(directlyAssignedBranchId);
  const hasReverseAssignment = assignedBranches.length > 0;

  console.log("Coverage assignment check:", {
    id: item?.id,
    name: item?.name,
    status,
    branch_id: item?.branch_id,
    branch: item?.branch,
    assigned_branches: item?.assigned_branches,
    assignedBranches: item?.assignedBranches,
    assignedBranchesCount: assignedBranches.length,
    isInactive,
    hasDirectAssignment,
    hasReverseAssignment,
    available: isInactive && !hasDirectAssignment && !hasReverseAssignment,
  });

  return isInactive && !hasDirectAssignment && !hasReverseAssignment;
}

function normalizePayload(values) {
  const managerEmail = String(
    values.email ||
      values.manager_email ||
      values.account_invitation_email ||
      "",
  )
    .trim()
    .toLowerCase();

  const payload = {
    ...values,
    name: String(values.name || values.legal_name || "").trim(),
    legal_name: String(values.legal_name || values.name || "").trim(),
    email: managerEmail || null,
    parent_id:
      values.type === "franchise_branch" ? null : values.parent_id || null,
    operating_days: Array.isArray(values.operating_days)
      ? values.operating_days
      : [],
    pickup_enabled: Boolean(values.pickup_enabled),
    delivery_enabled: Boolean(values.delivery_enabled),
    pod_enabled: Boolean(values.pod_enabled),
    return_enabled: Boolean(values.return_enabled),
  };

  delete payload.manager_email;
  delete payload.account_invitation_email;

  return payload;
}

function LoadingState() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        background: "#f3f6fa",
      }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Card style={{ borderRadius: 16 }}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </Card>

        <Row gutter={[12, 12]}>
          <Col xs={24} xl={16}>
            <Card style={{ borderRadius: 16 }}>
              <Skeleton active paragraph={{ rows: 14 }} />
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Card style={{ borderRadius: 16 }}>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
}

export default function CreateBranchOfficePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedType = normalizeType(searchParams.get("type"));
  const requestedParentId = searchParams.get("parent_id")
    ? Number(searchParams.get("parent_id"))
    : null;

  const [allBranches, setAllBranches] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const parentOptions = useMemo(
    () =>
      allBranches
        .filter((item) =>
          ["franchise_branch", "head_branch", "main_branch", "branch"].includes(
            String(item?.type || "").toLowerCase(),
          ),
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          type: item.type,
          status: item.status,
          coverage_location_id:
            item.coverage_location_id || item.coverage_location?.id || null,
          coverage_location:
            item.coverage_location || item.coverageLocation || null,
          label: `${item.name} (${item.code || item.type})`,
        })),
    [allBranches],
  );

  const unassignedCoverageLocations = useMemo(
    () => coverageLocations.filter(isUnassignedCoverage),
    [coverageLocations],
  );

  const mainAllocationCount = useMemo(
    () =>
      unassignedCoverageLocations.filter(
        (item) => item.type === "main_branch_zone",
      ).length,
    [unassignedCoverageLocations],
  );

  const subAllocationCount = useMemo(
    () =>
      unassignedCoverageLocations.filter(
        (item) => item.type === "sub_branch_zone",
      ).length,
    [unassignedCoverageLocations],
  );

  const availableCoverageCount =
    requestedType === "franchise_branch"
      ? mainAllocationCount
      : subAllocationCount;

  const loadSupportData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const [branchesResponse, coverageResponse] = await Promise.all([
        branchApi.getBranches({ all: 1 }),
        branchApi.getCoverageLocations({ all: 1 }),
      ]);

      setAllBranches(normalizeRows(branchesResponse));
      setCoverageLocations(normalizeRows(coverageResponse));
    } catch (error) {
      setLoadError(apiErrorMessage(error, "Could not load branch setup data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSupportData();
  }, [loadSupportData]);

  const handleSubmit = useCallback(
    async (values) => {
      const createRequest =
        branchApi.createBranch ||
        branchApi.storeBranch ||
        branchApi.createBranchOffice;

      if (typeof createRequest !== "function") {
        message.error(
          "branchAllocationApi must export createBranch, storeBranch, or createBranchOffice.",
        );
        return;
      }

      try {
        setSaving(true);

        const response = await createRequest(normalizePayload(values));
        const createdBranch = unwrapRecord(response);

        message.success(
          response?.data?.message || "Branch office created successfully.",
        );

        router.replace(
          createdBranch?.id
            ? `/admin/branch-offices/${createdBranch.id}`
            : "/admin/branch-offices",
        );
      } catch (error) {
        message.error(
          apiErrorMessage(error, "Could not create branch office."),
        );
      } finally {
        setSaving(false);
      }
    },
    [router],
  );

  if (loading) {
    return <LoadingState />;
  }

  if (loadError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 16,
          background: "#f3f6fa",
        }}
      >
        <Result
          status="error"
          title="Branch form could not be prepared"
          subTitle={loadError}
          extra={[
            <Button
              key="back"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/admin/branch-offices")}
            >
              Back to branches
            </Button>,
            <Button
              key="retry"
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadSupportData}
            >
              Retry
            </Button>,
          ]}
        />
      </div>
    );
  }

  const isSubBranch = requestedType === "sub_branch";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f6fa",
        padding: 14,
      }}
    >
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
        <Card
          style={{
            borderRadius: 18,
            border: 0,
            overflow: "hidden",
            marginBottom: 12,
            boxShadow: "0 8px 28px rgba(15, 23, 42, 0.07)",
          }}
          styles={{
            body: {
              padding: "16px 18px",
              background: "linear-gradient(135deg, #10224f 0%, #1d4ed8 100%)",
            },
          }}
        >
          <Row align="middle" justify="space-between" gutter={[14, 12]}>
            <Col flex="auto">
              <Space size={12} align="start">
                <Button
                  shape="circle"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => router.push("/admin/branch-offices")}
                />

                <div>
                  <Space size={8} wrap>
                    <Title
                      level={3}
                      style={{
                        margin: 0,
                        color: "#ffffff",
                        fontSize: 23,
                      }}
                    >
                      {isSubBranch
                        ? "Create Sub-Branch"
                        : "Create Franchise / Main Branch"}
                    </Title>

                    <Tag
                      color={isSubBranch ? "gold" : "cyan"}
                      style={{ margin: 0, borderRadius: 999 }}
                    >
                      Draft on creation
                    </Tag>
                  </Space>

                  <Text
                    style={{
                      display: "block",
                      marginTop: 4,
                      color: "rgba(255,255,255,0.76)",
                    }}
                  >
                    {isSubBranch
                      ? "Choose the parent branch first. Only its available sub-branch allocations will be shown."
                      : "Only inactive and unassigned main-branch allocations are available for selection."}
                  </Text>
                </div>
              </Space>
            </Col>

            <Col>
              <Space size={8} wrap>
                <Tag
                  icon={<ApartmentOutlined />}
                  color="blue"
                  style={{ margin: 0, padding: "5px 10px" }}
                >
                  {parentOptions.length} main branches
                </Tag>

                <Tag
                  icon={<EnvironmentOutlined />}
                  color={availableCoverageCount ? "green" : "red"}
                  style={{ margin: 0, padding: "5px 10px" }}
                >
                  {availableCoverageCount} available allocations
                </Tag>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={12} md={6}>
            <Card
              size="small"
              style={{
                borderRadius: 14,
                border: "1px solid #e4eaf1",
              }}
              styles={{ body: { padding: "12px 14px" } }}
            >
              <Statistic
                title="Main allocations"
                value={mainAllocationCount}
                prefix={<ShopOutlined />}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card
              size="small"
              style={{
                borderRadius: 14,
                border: "1px solid #e4eaf1",
              }}
              styles={{ body: { padding: "12px 14px" } }}
            >
              <Statistic
                title="Sub allocations"
                value={subAllocationCount}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card
              size="small"
              style={{
                borderRadius: 14,
                border: "1px solid #e4eaf1",
              }}
              styles={{ body: { padding: "12px 14px" } }}
            >
              <Statistic
                title="Parent branches"
                value={parentOptions.length}
                prefix={<ApartmentOutlined />}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>

          <Col xs={12} md={6}>
            <Card
              size="small"
              style={{
                borderRadius: 14,
                border: "1px solid #e4eaf1",
              }}
              styles={{ body: { padding: "12px 14px" } }}
            >
              <Statistic
                title="Creating"
                value={isSubBranch ? "Sub" : "Main"}
                prefix={<ShopOutlined />}
                valueStyle={{ fontSize: 22 }}
              />
            </Card>
          </Col>
        </Row>

        {!availableCoverageCount ? (
          <Alert
            type="warning"
            showIcon
            message={
              isSubBranch
                ? "No unassigned sub-branch allocation is currently available."
                : "No unassigned main-branch allocation is currently available."
            }
            description={
              isSubBranch
                ? "Create or release an inactive sub-branch allocation under the selected main branch."
                : "Create or release an inactive main-branch allocation before saving this branch."
            }
            style={{ marginBottom: 12, borderRadius: 12 }}
          />
        ) : null}

        <BranchAssignmentForm
          mode="create"
          compact
          showHeader={false}
          loading={saving}
          initialValues={{
            type: requestedType,
            parent_id: isSubBranch ? requestedParentId : null,
            status: "draft",
            country: "Nepal",
            province: "Bagmati",
            district: "Kathmandu",
            pickup_enabled: true,
            delivery_enabled: true,
            pod_enabled: true,
            return_enabled: true,
            operating_days: [
              "sunday",
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
            ],
          }}
          parentOptions={parentOptions}
          coverageLocations={unassignedCoverageLocations}
          existingBranches={allBranches}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/branch-offices")}
        />
      </div>
    </div>
  );
}
