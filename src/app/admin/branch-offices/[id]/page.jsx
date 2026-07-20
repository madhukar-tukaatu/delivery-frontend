"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";

import { getBranch } from "@/services/branchAllocationApi";

const CoverageRadiusMap = dynamic(
  () => import("@/components/maps/CoverageRadiusMap"),
  { ssr: false }
);

const { Title, Text } = Typography;

function getRecord(response) {
  if (response?.data?.data) return response.data.data;
  if (response?.data) return response.data;
  return response;
}

function typeLabel(type) {
  if (type === "franchise_branch") return "Franchise / Main Branch";
  if (type === "sub_branch") return "Sub-Branch";
  return type || "-";
}

function typeColor(type) {
  if (type === "franchise_branch") return "blue";
  if (type === "sub_branch") return "green";
  return "default";
}

export default function ViewBranchOfficePage() {
  const params = useParams();
  const router = useRouter();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadRecord() {
    try {
      setLoading(true);
      const response = await getBranch(params.id);
      setRecord(getRecord(response));
    } catch (error) {
      message.error(error?.response?.data?.message || "Could not load branch.");
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
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} md={14}>
              <Space direction="vertical" size={4}>
                <Title level={3} style={{ margin: 0 }}>
                  Branch / Office Detail
                </Title>

                <Text type="secondary">
                  ID #{params.id} {record?.name ? `- ${record.name}` : ""}
                </Text>
              </Space>
            </Col>

            <Col xs={24} md={10}>
              <Space
                wrap
                style={{
                  width: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => router.push("/admin/branch-offices")}
                >
                  Back
                </Button>

                <Link href={`/admin/branch-offices/${params.id}/edit`}>
                  <Button type="primary" icon={<EditOutlined />}>
                    Edit
                  </Button>
                </Link>
              </Space>
            </Col>
          </Row>
        </Card>

        {record && (
          <>
            <Card title="Assignment Details">
              <Descriptions
                bordered
                column={{ xs: 1, md: 2 }}
                items={[
                  { key: "id", label: "ID", children: record.id },
                  {
                    key: "type",
                    label: "Type",
                    children: (
                      <Tag color={typeColor(record.type)}>
                        {typeLabel(record.type)}
                      </Tag>
                    ),
                  },
                  { key: "name", label: "Name", children: record.name || "-" },
                  { key: "code", label: "Code", children: record.code || "-" },
                  {
                    key: "parent",
                    label: "Parent Branch",
                    children: record.parent?.name || "-",
                  },
                  {
                    key: "allocation",
                    label: "Assigned Allocation",
                    children: record.coverage_location?.name || "-",
                  },
                  {
                    key: "allocation_point",
                    label: "Allocation Latitude / Longitude",
                    children:
                      record.latitude && record.longitude
                        ? `${record.latitude}, ${record.longitude}`
                        : "-",
                  },
                  {
                    key: "coverage_radius",
                    label: "Coverage Radius",
                    children: record.coverage_radius_km
                      ? `${record.coverage_radius_km} km`
                      : "-",
                  },
                  {
                    key: "status",
                    label: "Status",
                    children: (
                      <Tag color={record.status === "active" ? "green" : "orange"}>
                        {record.status || "-"}
                      </Tag>
                    ),
                  },
                ]}
              />
            </Card>

            <Card title="Business Details">
              <Descriptions
                bordered
                column={{ xs: 1, md: 2 }}
                items={[
                  {
                    key: "legal_name",
                    label: "Legal Business Name",
                    children: record.legal_name || "-",
                  },
                  {
                    key: "owner_name",
                    label: "Owner Name",
                    children: record.owner_name || "-",
                  },
                  {
                    key: "contact_person",
                    label: "Contact Person",
                    children: record.contact_person || "-",
                  },
                  { key: "email", label: "Email", children: record.email || "-" },
                  {
                    key: "phone",
                    label: "Primary Phone",
                    children: record.phone || "-",
                  },
                  {
                    key: "alternative_phone",
                    label: "Alternative Phone",
                    children: record.alternative_phone || "-",
                  },
                  {
                    key: "business_type",
                    label: "Business Type",
                    children: record.business_type || "-",
                  },
                  {
                    key: "pan_vat_number",
                    label: "PAN / VAT Number",
                    children: record.pan_vat_number || "-",
                  },
                  {
                    key: "registration_number",
                    label: "Registration Number",
                    children: record.registration_number || "-",
                  },
                ]}
              />
            </Card>

            <Card title="Physical Office / Pickup Location">
              <Descriptions
                bordered
                column={{ xs: 1, md: 2 }}
                style={{ marginBottom: 16 }}
                items={[
                  {
                    key: "office_address",
                    label: "Office / Pickup Address",
                    children: record.office_address || "-",
                  },
                  {
                    key: "office_city",
                    label: "Office City",
                    children: record.office_city || "-",
                  },
                  {
                    key: "office_area",
                    label: "Office Area",
                    children: record.office_area || "-",
                  },
                  {
                    key: "office_street",
                    label: "Office Street",
                    children: record.office_street || "-",
                  },
                  {
                    key: "office_landmark",
                    label: "Office Landmark",
                    children: record.office_landmark || "-",
                  },
                  {
                    key: "office_point",
                    label: "Office Latitude / Longitude",
                    children:
                      record.office_latitude && record.office_longitude
                        ? `${record.office_latitude}, ${record.office_longitude}`
                        : "-",
                  },
                ]}
              />

              <CoverageRadiusMap
                value={{
                  latitude: record.office_latitude,
                  longitude: record.office_longitude,
                }}
                radiusKm={0.5}
                existingLocations={[]}
                existingBranches={[]}
                showExisting={false}
                showBranches={false}
                height={480}
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