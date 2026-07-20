"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Card, Space, Typography, message } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createBranch,
  getBranchParentOptions,
  getBranches,
  getCoverageLocations,
} from "@/services/branchAllocationApi";
import BranchAssignmentForm from "@/components/BranchAssignmentForm";

const { Title, Text } = Typography;

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function sanitizeType(type) {
  return ["franchise_branch", "sub_branch"].includes(type)
    ? type
    : "franchise_branch";
}

function CreateBranchOfficeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [branches, setBranches] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [saving, setSaving] = useState(false);

  const type = sanitizeType(searchParams.get("type"));

  const initialValues = useMemo(
    () => ({
      type,
      status: "active",
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
    }),
    [type],
  );

  async function loadData(branchType = type) {
    try {
      const [branchesResponse, coverageResponse] = await Promise.all([
        getBranches({ all: 1 }),
        getCoverageLocations({ all: 1 }),
      ]);

      setBranches(normalizeRows(branchesResponse));
      setCoverageLocations(normalizeRows(coverageResponse));

      if (branchType === "sub_branch") {
        const parentResponse = await getBranchParentOptions(branchType);
        setParentOptions(normalizeRows(parentResponse));
      } else {
        setParentOptions([]);
      }
    } catch {
      message.error("Could not load branch assignment data.");
    }
  }

  const handleTypeChange = useCallback(async (branchType) => {
    if (branchType === "sub_branch") {
      try {
        const response = await getBranchParentOptions(branchType);
        setParentOptions(normalizeRows(response));
      } catch {
        setParentOptions([]);
      }
    } else {
      setParentOptions([]);
    }
  }, []);

  useEffect(() => {
    loadData(type);
  }, [type]);

  async function handleSubmit(payload) {
    try {
      setSaving(true);
      await createBranch(payload);
      message.success("Branch / franchise created.");
      router.push("/admin/branch-offices");
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not create branch.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", padding: 20 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card>
          <Title level={3} style={{ margin: 0 }}>
            Create Franchise / Branch Assignment
          </Title>
          <Text type="secondary">
            Assign a franchise/main branch or sub-branch to a coverage
            allocation.
          </Text>
        </Card>

        <BranchAssignmentForm
          mode="create"
          initialValues={initialValues}
          parentOptions={parentOptions}
          coverageLocations={coverageLocations}
          existingBranches={branches}
          loading={saving}
          onTypeChange={handleTypeChange}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/branch-offices")}
        />
      </Space>
    </div>
  );
}

export default function CreateBranchOfficePage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <CreateBranchOfficeInner />
    </Suspense>
  );
}
