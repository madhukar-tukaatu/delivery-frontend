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

import * as adminBranchService from "@/services/adminBranchService";
import { getCoverageLocations } from "@/services/coverageLocationApi";
import BranchAssignmentForm from "@/components/branches/BranchAssignmentForm";

import {
  apiErrorMessage,
  normalizeRows,
} from "@/components/branches/branch-office/branchOfficeUtils";

const { Text, Title } = Typography;

function normalizeType(value) {
  return value === "sub_branch" ? "sub_branch" : "franchise_branch";
}

function normalizeCoverageType(value) {
  const type = String(value || "")
    .trim()
    .toLowerCase();

  if (
    [
      "main_branch_zone",
      "main_zone",
      "main_branch",
      "franchise_branch_zone",
      "franchise_zone",
    ].includes(type)
  ) {
    return "main_branch_zone";
  }

  if (
    [
      "sub_branch_zone",
      "sub_zone",
      "sub_branch",
    ].includes(type)
  ) {
    return "sub_branch_zone";
  }

  return type;
}

function normalizeId(value) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0
    ? number
    : null;
}

function getAssignedBranchCount(item) {
  const assignedBranches = Array.isArray(item?.assigned_branches)
    ? item.assigned_branches
    : Array.isArray(item?.assignedBranches)
      ? item.assignedBranches
      : [];

  const rawCount =
    item?.assigned_branches_count ??
    item?.assignedBranchesCount ??
    item?.branch_assignments_count ??
    assignedBranches.length ??
    0;

  const count = Number(rawCount);

  return Number.isFinite(count) ? count : 0;
}

function isUnassignedCoverage(item) {
  const status = String(item?.status || "")
    .trim()
    .toLowerCase();

  if (status !== "active") {
    return false;
  }

  const directlyAssignedBranchId =
    item?.branch_id ||
    item?.assigned_branch_id ||
    item?.assigned_to_branch_id ||
    item?.branch_office_id ||
    item?.franchise_id ||
    item?.franchise_branch_id ||
    item?.assigned_franchise_id ||
    item?.branch?.id ||
    item?.assigned_branch?.id ||
    item?.assignedBranch?.id ||
    item?.franchise?.id ||
    null;

  return (
    !directlyAssignedBranchId &&
    getAssignedBranchCount(item) === 0
  );
}

function selectedParentCoverageId(parent) {
  return normalizeId(
    parent?.coverage_location_id ||
      parent?.coverage_location?.id ||
      parent?.coverageLocation?.id,
  );
}

function getCoverageParentRelationIds(item) {
  return [
    item?.parent_branch_id,
    item?.main_branch_id,
    item?.owner_branch_id,
    item?.branch_parent_id,
    item?.parent_branch?.id,
    item?.parentBranch?.id,
    item?.main_branch?.id,
    item?.mainBranch?.id,

    item?.parent_id,
    item?.parent_location_id,
    item?.parent_coverage_location_id,
    item?.parentCoverageLocationId,
    item?.main_branch_zone_id,
    item?.main_coverage_location_id,
    item?.parent_zone_id,
    item?.parent?.id,
    item?.parent_location?.id,
    item?.parentLocation?.id,
    item?.parent_coverage_location?.id,
    item?.parentCoverageLocation?.id,
    item?.main_branch_zone?.id,
    item?.mainBranchZone?.id,
  ]
    .map(normalizeId)
    .filter(Boolean);
}

function coverageBelongsToParent(location, parentBranch) {
  if (!parentBranch) {
    return false;
  }

  const parentBranchId = normalizeId(parentBranch.id);
  const parentCoverageId = selectedParentCoverageId(parentBranch);
  const relationIds = getCoverageParentRelationIds(location);

  return (
    (parentBranchId && relationIds.includes(parentBranchId)) ||
    (parentCoverageId && relationIds.includes(parentCoverageId))
  );
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
    name: String(values.name || "").trim(),
    legal_name: String(values.legal_name || "").trim(),
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

  const isSubBranch = requestedType === "sub_branch";

  const [allBranches, setAllBranches] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(
    isSubBranch ? requestedParentId : null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setSelectedParentId(
      requestedType === "sub_branch" ? requestedParentId : null,
    );
  }, [requestedType, requestedParentId]);

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
            item.coverage_location_id ||
            item.coverage_location?.id ||
            item.coverageLocation?.id ||
            null,
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

  const unassignedMainAllocations = useMemo(
    () =>
      unassignedCoverageLocations.filter(
        (item) =>
          normalizeCoverageType(item?.type) === "main_branch_zone",
      ),
    [unassignedCoverageLocations],
  );

  const unassignedSubAllocations = useMemo(
    () =>
      unassignedCoverageLocations.filter(
        (item) => normalizeCoverageType(item?.type) === "sub_branch_zone",
      ),
    [unassignedCoverageLocations],
  );

  const selectedParentBranch = useMemo(() => {
    if (!selectedParentId) {
      return null;
    }

    return (
      parentOptions.find(
        (item) => Number(item.id) === Number(selectedParentId),
      ) || null
    );
  }, [parentOptions, selectedParentId]);

  const availableSubAllocations = useMemo(() => {
    if (!isSubBranch || !selectedParentBranch) {
      return [];
    }

    return unassignedSubAllocations.filter((location) =>
      coverageBelongsToParent(location, selectedParentBranch),
    );
  }, [isSubBranch, selectedParentBranch, unassignedSubAllocations]);

  const availableCoverageLocations = useMemo(
    () =>
      requestedType === "franchise_branch"
        ? unassignedMainAllocations
        : availableSubAllocations,
    [requestedType, unassignedMainAllocations, availableSubAllocations],
  );

  const mainAllocationCount = unassignedMainAllocations.length;
  const subAllocationCount = unassignedSubAllocations.length;
  const availableCoverageCount = availableCoverageLocations.length;

  const loadSupportData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const [branchesResponse, coverageResponse] = await Promise.all([
        adminBranchService.getBranches({ all: 1 }),
        getCoverageLocations({ all: 1 }),
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
      try {
        setSaving(true);

        /*
         * One atomic multipart request:
         * branch + coverage assignment + team + documents.
         * There is no second document-upload request during creation.
         */
        const createdBranch = await adminBranchService.createBranch(
          normalizePayload(values),
        );

        const branchId =
          createdBranch?.id ||
          createdBranch?.branch?.id ||
          createdBranch?.data?.id ||
          null;

        message.success(
          "Branch, coverage assignment and documents created successfully.",
        );

        router.replace(
          branchId
            ? `/admin/branch-offices/${branchId}`
            : "/admin/branch-offices",
        );
      } catch (error) {
        console.error("Branch creation failed:", error);

        message.error(
          apiErrorMessage(
            error,
            "Could not create the branch. No branch was saved.",
          ),
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
                      : "Only active main coverage locations that are not assigned to any franchise are available for selection."}
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
                ? selectedParentId
                  ? "No unassigned sub-branch allocation is available for the selected parent branch."
                  : "Select a parent branch to view its available sub-branch allocations."
                : "No active, unassigned main-branch allocation is currently available."
            }
            description={
              isSubBranch
                ? selectedParentId
                  ? "Create an active sub-branch coverage location under the selected parent, or release one that is already assigned."
                  : "Select a parent branch first to load its unassigned sub-branch allocations."
                : "Create an active main coverage location, or release one that is already assigned to a franchise."
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
          coverageLocations={availableCoverageLocations}
          existingBranches={allBranches}
          onParentChange={(parentId) => {
            setSelectedParentId(parentId ? Number(parentId) : null);
          }}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/branch-offices")}
        />
      </div>
    </div>
  );
}
