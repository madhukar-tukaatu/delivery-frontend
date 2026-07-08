"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { EyeOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { getMerchantApplications } from "@/services/merchantRegistrationService";

const { Text, Title } = Typography;

const STATUS_MAP = {
  active: { color: "green", label: "Active" },
  approved: { color: "green", label: "Approved" },
  rejected: { color: "red", label: "Rejected" },
  pending: { color: "blue", label: "Pending" },
  pending_verification: { color: "blue", label: "Pending Verification" },
  under_review: { color: "blue", label: "Under Review" },
  more_info_required: { color: "orange", label: "More Info Required" },
};

function getStatusTag(status) {
  const norm = String(status || "").toLowerCase();
  const config = STATUS_MAP[norm] || { color: "default", label: status || "Unknown" };
  return <Tag color={config.color}>{config.label}</Tag>;
}

export default function MerchantApplicationsPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ q: "", status: undefined });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "" && v !== undefined)
      );
      const res = await getMerchantApplications(cleanFilters);
      setData(res?.data || res || []);
    } catch (error) {
      message.error("Could not load merchant applications.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      title: "Merchant Details",
      dataIndex: "name",
      key: "name",
      render: (name, row) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 14 }}>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>Owner: {row.owner_name || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Contact Info",
      dataIndex: "email",
      key: "email",
      render: (email, row) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{email}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.phone || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Allocation",
      key: "allocation",
      render: (_, row) => {
        const assigned = row.default_branch?.name;
        const suggested = row.suggested_branch?.name;
        return assigned ? (
          <Space direction="vertical" size={0}>
            <Text strong type="success">{assigned}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>Assigned</Text>
          </Space>
        ) : (
          <Space direction="vertical" size={0}>
            <Text>{suggested || "-"}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>Suggested</Text>
          </Space>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status, row) => (
        <Space direction="vertical" size={4}>
          {getStatusTag(status)}
          {row.verification_status && row.verification_status !== status && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Verification: {row.verification_status}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 110,
      align: "center",
      render: (_, row) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/admin/merchant-applications/${row.id}`)}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <Card 
      bordered={false}
      title={
        <div style={{ padding: "4px 0" }}>
          <Title level={4} style={{ margin: 0 }}>Merchant Applications</Title>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
            Review, verify registrations, and allocate branches
          </Text>
        </div>
      }
    >
      <Space style={{ marginBottom: 20 }} wrap size={12}>
        <Input
          placeholder="Search name, email, phone..."
          allowClear
          prefix={<SearchOutlined style={{ color: "rgba(0,0,0,0.25)" }} />}
          style={{ width: 260 }}
          value={filters.q}
          onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
        />
        <Select
          allowClear
          value={filters.status}
          placeholder="Filter by Status"
          style={{ width: 200 }}
          onChange={(status) => setFilters((prev) => ({ ...prev, status }))}
          options={[
            { value: "pending", label: "Pending" },
            { value: "under_review", label: "Under Review" },
            { value: "more_info_required", label: "More Info Required" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          Refresh
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} applications`,
        }}
      />
    </Card>
  );
}