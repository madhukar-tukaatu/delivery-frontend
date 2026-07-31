"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Space, Typography, message } from "antd";
import { useParams, useRouter } from "next/navigation";

import {
  getBranch,
  getBranchParentOptions,
  getBranches,
  getCoverageLocations,
  updateBranch,
} from "@/services/branchAllocationApi";
import BranchAssignmentForm from "@/components/BranchAssignmentForm";

const { Title, Text } = Typography;

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function getRecord(response) {
  if (response?.data?.data) return response.data.data;
  if (response?.data) return response.data;
  return response;
}

export default function EditBranchOfficePage() {
  const params = useParams();
  const router = useRouter();

  const [record, setRecord] = useState(null);
  const [branches, setBranches] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);
  const [parentOptions, setParentOptions] = useState([]);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      const [branchResponse, branchesResponse, coverageResponse] =
        await Promise.all([
          getBranch(params.id),
          getBranches({ all: 1 }),
          getCoverageLocations({ all: 1 }),
        ]);

      const branch = getRecord(branchResponse);

      setRecord(branch);
      setBranches(normalizeRows(branchesResponse));
      setCoverageLocations(normalizeRows(coverageResponse));

      if (branch.type === "sub_branch") {
        const parentResponse = await getBranchParentOptions(branch.type);
        setParentOptions(normalizeRows(parentResponse));
      } else {
        setParentOptions([]);
      }
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load branch.");
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
    if (params.id) loadData();
  }, [params.id]);

  async function handleSubmit(payload) {
    try {
      setSaving(true);
      await updateBranch(params.id, payload);

      message.success("Branch / franchise updated.");
      router.push(`/admin/branch-offices/${params.id}`);
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not update branch.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", padding: 20 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card>
          <Title level={3} style={{ margin: 0 }}>
            Edit Franchise / Branch Assignment
          </Title>

          <Text type="secondary">Editing branch ID #{params.id}</Text>
        </Card>

        {record && (
          <BranchAssignmentForm
            mode="edit"
            initialValues={record}
            parentOptions={parentOptions}
            coverageLocations={coverageLocations}
            existingBranches={branches}
            loading={saving}
            onTypeChange={handleTypeChange}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/admin/branch-offices/${params.id}`)}
          />
        )}
      </Space>
    </div>
  );
}