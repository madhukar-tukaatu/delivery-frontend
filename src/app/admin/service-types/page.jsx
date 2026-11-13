"use client";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import ExportImportToolbar from "@/components/admin/ui/ExportImportToolbar";

import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { serviceTypesApi } from "@/lib/admin-pricing-api";
import { formatDateTime } from "@/lib/pricing-formatters";
import ServiceTypeModal from "./components/ServiceTypeModal";

const { Title, Text } = Typography;
const CORE_CODES = ["standard", "express", "same_day"];

const SERVICE_TYPE_COLUMNS = [
  { key: "name", label: "Service Name", required: true, sampleValue: "Express Delivery" },
  { key: "code", label: "Service Code", required: true, sampleValue: "express_plus" },
  { key: "estimated_hours", label: "Estimated Hours", required: true, sampleValue: "12" },
  { key: "description", label: "Description", required: false, sampleValue: "Guaranteed same-day or next-morning" },
  { key: "sort_order", label: "Sort Order", required: false, sampleValue: "2" },
  { key: "is_active", label: "Active (true/false)", required: false, sampleValue: "true" },
];

const SAMPLE_SERVICE_TYPE_ROWS = [
  {
    name: "Express Delivery",
    code: "express_plus",
    estimated_hours: "12",
    description: "Guaranteed same-day or next-morning",
    sort_order: "2",
    is_active: "true",
  },
  {
    name: "Overnight Cargo",
    code: "overnight_cargo",
    estimated_hours: "18",
    description: "Heavy parcel overnight transit",
    sort_order: "4",
    is_active: "true",
  },
];

export default function ServiceTypesPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ search: "", is_active: undefined });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, record: null });

  const load = useCallback(async (page = 1, pageSize = pagination.pageSize, nextFilters = filters) => {
    setLoading(true);
    try {
      const response = await serviceTypesApi.list({
        page,
        per_page: pageSize,
        search: nextFilters.search || undefined,
        is_active: nextFilters.is_active,
      });
      const data = response.data || {};
      setRows(data.data || []);
      setPagination({
        current: data.current_page || page,
        pageSize: data.per_page || pageSize,
        total: data.total || 0,
      });
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters, messageApi, pagination.pageSize]);

  useEffect(() => {
    load(1, 20, filters);
  }, []);

  async function save(values) {
    setSaving(true);
    try {
      const response = modal.record
        ? await serviceTypesApi.update(modal.record.id, {
            ...values,
            code: modal.record.code,
          })
        : await serviceTypesApi.create(values);

      messageApi.success(response.message || "Service type saved.");
      setModal({ open: false, record: null });
      await load(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(record, value) {
    try {
      const response = await serviceTypesApi.setStatus(record.id, value);
      messageApi.success(response.message || "Status updated.");
      await load(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      messageApi.error(error.message);
    }
  }

  async function remove(record) {
    try {
      const response = await serviceTypesApi.remove(record.id);
      messageApi.success(response.message || "Service type deleted.");
      await load(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      messageApi.error(error.message);
    }
  }

  const handleImportServiceTypes = async (validRows) => {
    let successCount = 0;
    const errors = [];
    for (const row of validRows) {
      try {
        const payload = {
          name: row.name?.trim(),
          code: row.code?.trim().toLowerCase().replace(/\s+/g, "_"),
          estimated_hours: Number(row.estimated_hours) || 24,
          description: row.description?.trim() || "",
          sort_order: row.sort_order ? Number(row.sort_order) : 0,
          is_active: row.is_active ? String(row.is_active).toLowerCase() !== "false" : true,
        };
        await serviceTypesApi.create(payload);
        successCount++;
      } catch (err) {
        errors.push(`${row.name || "Service"}: ${err?.response?.data?.message || err.message}`);
      }
    }
    if (errors.length > 0 && successCount === 0) {
      throw new Error(`Failed to import service types: ${errors.slice(0, 3).join("; ")}`);
    }
    if (errors.length > 0) {
      message.warning(`Imported ${successCount} service types. ${errors.length} failed.`);
    }
    load(1, pagination.pageSize, filters);
    return { successCount, errors };
  };

  const handleExportAll = async () => {
    try {
      const response = await serviceTypesApi.list({ page: 1, per_page: 500 });
      return response?.data?.data || rows;
    } catch {
      return rows;
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13, color: "#0F172A" }}>{value}</Text>
          {CORE_CODES.includes(record.code) && <Tag color="blue" style={{ fontSize: 10 }}>Core Service</Tag>}
        </Space>
      ),
    },
    {
      title: "Code",
      dataIndex: "code",
      render: (value) => <Tag color="cyan" style={{ fontFamily: "monospace", fontSize: 11 }}>{value}</Tag>,
    },
    {
      title: "Estimated Hours",
      dataIndex: "estimated_hours",
      render: (value) => `${value} hrs`,
    },
    { title: "Sort", dataIndex: "sort_order", width: 70, align: "center" },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 110,
      render: (value, record) => (
        <Switch size="small" checked={Boolean(value)} onChange={(checked) => changeStatus(record, checked)} />
      ),
    },
    { title: "Updated", dataIndex: "updated_at", width: 160, render: formatDateTime },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => setModal({ open: true, record })} />
          <Popconfirm
            title="Delete service type?"
            description={CORE_CODES.includes(record.code) ? "Core services cannot be deleted. Deactivate them instead." : "This action cannot be undone."}
            disabled={CORE_CODES.includes(record.code)}
            onConfirm={() => remove(record)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} disabled={CORE_CODES.includes(record.code)} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      {contextHolder}
      <AdminPageHeader
        title="Service Types"
        subtitle="Manage standard, express and same-day delivery service tiers with bulk import and export."
        icon={<AppstoreOutlined />}
        breadcrumb={[{ title: "Admin" }, { title: "Service Types" }]}
        actions={
          <ExportImportToolbar
            entityTitle="Service Types"
            columns={SERVICE_TYPE_COLUMNS}
            data={rows}
            sampleRows={SAMPLE_SERVICE_TYPE_ROWS}
            onExportAll={handleExportAll}
            onImport={handleImportServiceTypes}
            onRefresh={() => load(pagination.current, pagination.pageSize, filters)}
            onAdd={() => setModal({ open: true, record: null })}
            addText="Add Service Type"
            loading={loading}
          />
        }
      />

      {/* Compact Filter Bar */}
      <div className="admin-toolbar-row">
        <div className="admin-toolbar-left">
          <Input.Search
            allowClear
            size="small"
            style={{ width: 240 }}
            placeholder="Search name or code..."
            onSearch={(search) => {
              const next = { ...filters, search };
              setFilters(next);
              load(1, pagination.pageSize, next);
            }}
          />
          <Select
            allowClear
            size="small"
            placeholder="Status: All"
            style={{ width: 130 }}
            options={[
              { value: true, label: "Active Only" },
              { value: false, label: "Inactive Only" },
            ]}
            onChange={(is_active) => {
              const next = { ...filters, is_active };
              setFilters(next);
              load(1, pagination.pageSize, next);
            }}
          />
        </div>
        <div className="admin-toolbar-right">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Total: <strong>{pagination.total}</strong> service types
          </Text>
        </div>
      </div>

      <Card className="admin-card" bodyStyle={{ padding: 0 }} style={{ width: "100%", overflow: "hidden" }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          size="small"
          className="admin-table-compact"
          scroll={{ x: 800 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            size: "small",
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            onChange: (page, pageSize) => load(page, pageSize, filters),
          }}
        />
      </Card>

      <ServiceTypeModal
        open={modal.open}
        record={modal.record}
        saving={saving}
        onCancel={() => setModal({ open: false, record: null })}
        onSubmit={save}
      />
    </Space>
  );
}
