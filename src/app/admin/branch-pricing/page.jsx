"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Tabs,
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
import { branchRouteRatesApi } from "@/lib/admin-pricing-api";
import { formatDateTime, money } from "@/lib/pricing-formatters";
import BranchRouteRateModal from "./components/BranchRouteRateModal";

const { Title, Text } = Typography;

export default function BranchPricingPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState("list");
  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [matrix, setMatrix] = useState({ branches: [], rates: {} });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30, total: 0 });
  const [filters, setFilters] = useState({
    search: "",
    pickup_branch_id: undefined,
    delivery_branch_id: undefined,
    is_active: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({
    open: false,
    record: null,
    defaults: null,
  });

  const loadBranches = useCallback(async () => {
    try {
      const response = await branchRouteRatesApi.branches();
      setBranches(response.data || []);
    } catch (error) {
      messageApi.error(error.message);
    }
  }, [messageApi]);

  const loadList = useCallback(async (page = 1, pageSize = pagination.pageSize, nextFilters = filters) => {
    setLoading(true);
    try {
      const response = await branchRouteRatesApi.list({
        page,
        per_page: pageSize,
        ...nextFilters,
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

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const response = await branchRouteRatesApi.matrix();
      setMatrix({
        branches: response.data?.branches || [],
        rates: response.data?.rates || {},
      });
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    loadBranches();
    loadList(1, 30, filters);
  }, []);

  async function refresh() {
    if (activeTab === "matrix") {
      await loadMatrix();
    } else {
      await loadList(pagination.current, pagination.pageSize, filters);
    }
  }

  async function save(values) {
    setSaving(true);
    try {
      let response;
      if (modal.record) {
        response = await branchRouteRatesApi.update(modal.record.id, {
          base_rate: values.base_rate,
          is_active: values.is_active,
        });
      } else {
        response = await branchRouteRatesApi.create({
          pickup_branch_id: values.pickup_branch_id,
          delivery_branch_id: values.delivery_branch_id,
          base_rate: values.base_rate,
          is_active: values.is_active,
          create_reverse_route: Boolean(values.create_reverse_route),
          reverse_base_rate: values.create_reverse_route
            ? values.reverse_base_rate
            : null,
        });
      }

      messageApi.success(response.message || "Branch route rate saved.");
      setModal({ open: false, record: null, defaults: null });
      await loadList(pagination.current, pagination.pageSize, filters);
      if (activeTab === "matrix") await loadMatrix();
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(record, isActive) {
    try {
      const response = await branchRouteRatesApi.setStatus(record.id, isActive);
      messageApi.success(response.message || "Status updated.");
      await refresh();
    } catch (error) {
      messageApi.error(error.message);
    }
  }

  async function remove(record) {
    try {
      const response = await branchRouteRatesApi.remove(record.id);
      messageApi.success(response.message || "Route rate deleted.");
      await refresh();
    } catch (error) {
      messageApi.error(error.message);
    }
  }

  const branchOptions = branches.map((branch) => ({
    value: Number(branch.id),
    label: `${branch.name} (${branch.code})`,
  }));

  const listColumns = [
    {
      title: "Pickup Branch",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.pickup_branch_name}</Text>
          <Text type="secondary">{record.pickup_branch_code}</Text>
        </Space>
      ),
    },
    {
      title: "Delivery Branch",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.delivery_branch_name}</Text>
          <Text type="secondary">{record.delivery_branch_code}</Text>
        </Space>
      ),
    },
    { title: "Base Rate", dataIndex: "base_rate", render: (value) => <Text strong>{money(value)}</Text> },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 110,
      render: (value, record) => (
        <Switch checked={Boolean(value)} onChange={(checked) => setStatus(record, checked)} />
      ),
    },
    { title: "Updated", dataIndex: "updated_at", width: 180, render: formatDateTime },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => setModal({ open: true, record, defaults: null })} />
          <Popconfirm title="Delete this route rate?" onConfirm={() => remove(record)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const matrixColumns = useMemo(() => {
    const first = {
      title: "From / To",
      key: "origin",
      fixed: "left",
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary">{record.code}</Text>
        </Space>
      ),
    };

    return [
      first,
      ...matrix.branches.map((destination) => ({
        title: destination.name,
        key: `destination-${destination.id}`,
        width: 150,
        align: "center",
        render: (_, origin) => {
          const key = `${origin.id}:${destination.id}`;
          const rate = matrix.rates?.[key];

          if (!rate) {
            return (
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() =>
                  setModal({
                    open: true,
                    record: null,
                    defaults: {
                      pickup_branch_id: Number(origin.id),
                      delivery_branch_id: Number(destination.id),
                    },
                  })
                }
              >
                Add
              </Button>
            );
          }

          return (
            <Button
              type="link"
              onClick={() =>
                setModal({
                  open: true,
                  record: {
                    ...rate,
                    pickup_branch_id: Number(origin.id),
                    delivery_branch_id: Number(destination.id),
                  },
                  defaults: null,
                })
              }
            >
              <Space direction="vertical" size={0}>
                <Text strong>{money(rate.base_rate)}</Text>
                <Tag color={rate.is_active ? "green" : "default"}>
                  {rate.is_active ? "Active" : "Inactive"}
                </Tag>
              </Space>
            </Button>
          );
        },
      })),
    ];
  }, [matrix]);

  const tabItems = [
    {
      key: "list",
      label: "List View",
      children: (
        <>
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={24} lg={7}>
              <Input.Search
                allowClear
                placeholder="Search branch name or code"
                onSearch={(search) => {
                  const next = { ...filters, search };
                  setFilters(next);
                  loadList(1, pagination.pageSize, next);
                }}
              />
            </Col>
            <Col xs={24} sm={12} lg={5}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Pickup branch"
                options={branchOptions}
                style={{ width: "100%" }}
                onChange={(pickup_branch_id) => {
                  const next = { ...filters, pickup_branch_id };
                  setFilters(next);
                  loadList(1, pagination.pageSize, next);
                }}
              />
            </Col>
            <Col xs={24} sm={12} lg={5}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Delivery branch"
                options={branchOptions}
                style={{ width: "100%" }}
                onChange={(delivery_branch_id) => {
                  const next = { ...filters, delivery_branch_id };
                  setFilters(next);
                  loadList(1, pagination.pageSize, next);
                }}
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Select
                allowClear
                placeholder="Status"
                style={{ width: "100%" }}
                options={[
                  { value: true, label: "Active" },
                  { value: false, label: "Inactive" },
                ]}
                onChange={(is_active) => {
                  const next = { ...filters, is_active };
                  setFilters(next);
                  loadList(1, pagination.pageSize, next);
                }}
              />
            </Col>
          </Row>

          <Table
            rowKey="id"
            loading={loading}
            columns={listColumns}
            dataSource={rows}
            scroll={{ x: 1100 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `${total} route rates`,
              onChange: (page, pageSize) => loadList(page, pageSize, filters),
            }}
          />
        </>
      ),
    },
    {
      key: "matrix",
      label: "Matrix View",
      children: (
        <Table
          rowKey="id"
          loading={loading}
          columns={matrixColumns}
          dataSource={matrix.branches}
          pagination={false}
          bordered
          size="small"
          scroll={{ x: Math.max(1000, matrix.branches.length * 150 + 220), y: 600 }}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}
      <Row justify="space-between" align="middle" gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Branch Pricing</Title>
          <Text type="secondary">Customer-facing base rates between main branches.</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, record: null, defaults: null })}>
              Add Route Rate
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={async (key) => {
            setActiveTab(key);
            if (key === "matrix") await loadMatrix();
          }}
          items={tabItems}
        />
      </Card>

      <BranchRouteRateModal
        open={modal.open}
        record={modal.record}
        defaults={modal.defaults}
        branches={branches}
        saving={saving}
        onCancel={() => setModal({ open: false, record: null, defaults: null })}
        onSubmit={save}
      />
    </div>
  );
}
