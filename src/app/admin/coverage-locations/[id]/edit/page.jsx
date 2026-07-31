"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Space, Typography, message } from "antd";
import { useParams, useRouter } from "next/navigation";

import CoverageLocationForm from "../../components/CoverageLocationForm";
import {
  getCoverageLocations,
  getCoverageLocation,
  updateCoverageLocation,
} from "@/services/branchAllocationApi";

const { Title, Text } = Typography;

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function getRecord(response) {
  return response?.data || response;
}

export default function EditCoverageLocationPage() {
  const params = useParams();
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [record, setRecord] = useState(null);
  const [saving, setSaving] = useState(false);

  const mainZones = useMemo(
    () =>
      rows.filter(
        (item) =>
          item.type === "main_branch_zone" &&
          Number(item.id) !== Number(params.id)
      ),
    [rows, params.id]
  );

  async function loadData() {
    try {
      const [listResponse, recordResponse] = await Promise.all([
        getCoverageLocations({ all: 1 }),
        getCoverageLocation(params.id),
      ]);

      setRows(normalizeRows(listResponse));
      setRecord(getRecord(recordResponse));
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not load coverage allocation."
      );
    }
  }

  useEffect(() => {
    if (params.id) loadData();
  }, [params.id]);

  async function handleSubmit(payload) {
    try {
      setSaving(true);
      await updateCoverageLocation(params.id, payload);
      message.success("Coverage allocation updated.");
      router.push(`/admin/coverage-locations/${params.id}`);
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not update coverage allocation."
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
            Edit Branch Allocation
          </Title>
          <Text type="secondary">
            Editing allocation ID #{params.id}
          </Text>
        </Card>

        {record && (
          <CoverageLocationForm
            mode="edit"
            initialValues={record}
            mainZones={mainZones}
            existingLocations={rows}
            loading={saving}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/admin/coverage-locations/${params.id}`)}
          />
        )}
      </Space>
    </div>
  );
}