"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Space, Typography, message } from "antd";
import { useRouter, useSearchParams } from "next/navigation";

import CoverageLocationForm from "../components/CoverageLocationForm";
import {
  createCoverageLocation,
  getCoverageLocations,
} from "@/services/branchAllocationApi";

const { Title, Text } = Typography;

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

export default function CreateCoverageLocationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  const type = searchParams.get("type") || "main_branch_zone";

  const initialValues = useMemo(
    () => ({
      type,
      country: "Nepal",
      province: "Bagmati",
      district: "Kathmandu",
      city: "Kathmandu",
      coverage_radius_km: type === "sub_branch_zone" ? 3 : 5,
      status: "active",
      is_hq_managed: true,
    }),
    [type]
  );

  const mainZones = useMemo(
    () => rows.filter((item) => item.type === "main_branch_zone"),
    [rows]
  );

  async function loadRows() {
    try {
      const response = await getCoverageLocations({ all: 1 });
      setRows(normalizeRows(response));
    } catch {
      message.error("Could not load existing allocations.");
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  async function handleSubmit(payload) {
    try {
      setSaving(true);
      await createCoverageLocation(payload);
      message.success("Coverage allocation created.");
      router.push("/admin/coverage-locations");
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not create coverage allocation."
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
            Create Branch Allocation
          </Title>
          <Text type="secondary">
            Add a main branch or sub-branch coverage allocation.
          </Text>
        </Card>

        <CoverageLocationForm
          mode="create"
          initialValues={initialValues}
          mainZones={mainZones}
          existingLocations={rows}
          loading={saving}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/coverage-locations")}
        />
      </Space>
    </div>
  );
}