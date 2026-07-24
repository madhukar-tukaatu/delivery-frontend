"use client";

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
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { serviceTypesApi } from "@/lib/admin-pricing-api";
import { formatDateTime } from "@/lib/pricing-formatters";
import ServiceTypeModal from "./components/ServiceTypeModal";

const { Title, Text } = Typography;
const CORE_CODES = ["standard", "express", "same_day"];

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

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          {CORE_CODES.includes(record.code) && <Tag color="blue">Core Service</Tag>}
        </Space>
      ),
    },
    { title: "Code", dataIndex: "code", render: (value) => <Tag>{value}</Tag> },
    { title: "Estimated Hours", dataIndex: "estimated_hours", render: (value) => `${value} hours` },
    { title: "Sort", dataIndex: "sort_order", width: 80 },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 120,
      render: (value, record) => (
        <Switch checked={Boolean(value)} onChange={(checked) => changeStatus(record, checked)} />
      ),
    },
    { title: "Updated", dataIndex: "updated_at", width: 180, render: formatDateTime },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setModal({ open: true, record })} />
          <Popconfirm
            title="Delete service type?"
            description={CORE_CODES.includes(record.code) ? "Core services cannot be deleted. Deactivate them instead." : "This action cannot be undone."}
            disabled={CORE_CODES.includes(record.code)}
            onConfirm={() => remove(record)}
          >
            <Button danger icon={<DeleteOutlined />} disabled={CORE_CODES.includes(record.code)} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Service Types</Title>
          <Text type="secondary">Manage standard, express and same-day delivery services.</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => load(pagination.current, pagination.pageSize, filters)} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, record: null })}>
              Add Service Type
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={12} lg={8}>
            <Input.Search
              allowClear
              placeholder="Search name or code"
              onSearch={(search) => {
                const next = { ...filters, search };
                setFilters(next);
                load(1, pagination.pageSize, next);
              }}
            />
          </Col>
          <Col xs={24} md={8} lg={5}>
            <Select
              allowClear
              placeholder="All statuses"
              style={{ width: "100%" }}
              options={[
                { value: true, label: "Active" },
                { value: false, label: "Inactive" },
              ]}
              onChange={(is_active) => {
                const next = { ...filters, is_active };
                setFilters(next);
                load(1, pagination.pageSize, next);
              }}
            />
          </Col>
        </Row>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 1000 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `${total} service types`,
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
    </div>
  );
}
