"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button, Card, Descriptions, Space, Tag, Typography, message } from "antd";
import { EditOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";

import { getCoverageLocation } from "@/services/branchAllocationApi";

const CoverageRadiusMap = dynamic(
  () => import("@/components/maps/CoverageRadiusMap"),
  { ssr: false }
);

const { Title, Text } = Typography;

function getRecord(response) {
  return response?.data || response;
}

export default function ViewCoverageLocationPage() {
  const params = useParams();
  const router = useRouter();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadRecord() {
    try {
      setLoading(true);
      const response = await getCoverageLocation(params.id);
      setRecord(getRecord(response));
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Could not load coverage allocation."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) loadRecord();
  }, [params.id]);

  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", padding: 20 }}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card loading={loading}>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Space direction="vertical" size={4}>
              <Title level={3} style={{ margin: 0 }}>
                Coverage Allocation #{params.id}
              </Title>
              <Text type="secondary">{record?.name}</Text>
            </Space>

            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/admin/coverage-locations")}
              >
                Back
              </Button>

              <Link href={`/admin/coverage-locations/${params.id}/edit`}>
                <Button type="primary" icon={<EditOutlined />}>
                  Edit
                </Button>
              </Link>
            </Space>
          </Space>
        </Card>

        {record && (
          <>
            <Card title="Allocation Details">
              <Descriptions
                bordered
                column={{ xs: 1, md: 2 }}
                items={[
                  { key: "id", label: "ID", children: record.id },
                  { key: "name", label: "Name", children: record.name },
                  { key: "code", label: "Code", children: record.code },
                  {
                    key: "type",
                    label: "Type",
                    children:
                      record.type === "main_branch_zone" ? (
                        <Tag color="blue">Main Branch Allocation</Tag>
                      ) : (
                        <Tag color="green">Sub-Branch Allocation</Tag>
                      ),
                  },
                  {
                    key: "parent",
                    label: "Parent",
                    children: record.parent?.name || "-",
                  },
                  {
                    key: "status",
                    label: "Status",
                    children: (
                      <Tag color={record.status === "active" ? "green" : "red"}>
                        {record.status}
                      </Tag>
                    ),
                  },
                  { key: "country", label: "Country", children: record.country || "-" },
                  { key: "province", label: "Province", children: record.province || "-" },
                  { key: "district", label: "District", children: record.district || "-" },
                  { key: "city", label: "City", children: record.city || "-" },
                  { key: "area", label: "Area", children: record.area || "-" },
                  { key: "address", label: "Address", children: record.address || "-" },
                  { key: "latitude", label: "Latitude", children: record.latitude },
                  { key: "longitude", label: "Longitude", children: record.longitude },
                  {
                    key: "radius",
                    label: "Coverage Radius",
                    children: `${record.coverage_radius_km} km`,
                  },
                  {
                    key: "branch",
                    label: "Assigned Franchise",
                    children: record.branch?.name || "-",
                  },
                  { key: "notes", label: "Notes", children: record.notes || "-" },
                ]}
              />
            </Card>

            <Card title="Map Preview">
              <CoverageRadiusMap
                value={{
                  latitude: record.latitude,
                  longitude: record.longitude,
                }}
                radiusKm={record.coverage_radius_km || 5}
                existingLocations={[record]}
                existingBranches={[]}
                showExisting
                showBranches={false}
                height={520}
                clickable={false}
                showSearch={false}
                onChange={() => {}}
              />
            </Card>
          </>
        )}
      </Space>
    </div>
  );
}