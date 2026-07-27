"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import PermissionGate from "@/components/rate-admin/PermissionGate";
import RouteMap from "@/components/rate-admin/RouteMap";

import {
  createBranchRouteRate,
  createReverseBranchRouteRate,
  deleteBranchRouteRate,
  getBranchRouteRates,
  getRateBranches,
  updateBranchRouteRate,
  updateBranchRouteRateStatus,
} from "@/services/adminRateManagementService";

import {
  apiErrorMessage,
  branchLabel,
  buildBranchMap,
  extractCollection,
  formatDate,
  formatMoney,
  normalizeBranch,
  normalizeBranchRate,
} from "@/lib/rate-management-page-utils";

const { Title, Text } = Typography;

function statusTag(active) {
  return (
    <Tag color={active ? "green" : "default"}>
      {active ? "Active" : "Inactive"}
    </Tag>
  );
}

export default function BranchPricingPage() {
  const [form] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    pickup_branch_id: undefined,
    delivery_branch_id: undefined,
    is_active: undefined,
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0,
  });

  const branchesById = useMemo(
    () => buildBranchMap(branches),
    [branches]
  );

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: Number(branch.id),
        label: branchLabel(branch),
      })),
    [branches]
  );

  const loadBranches = useCallback(async () => {
    try {
      const payload = await getRateBranches({
        status: "active",
        per_page: 500,
      });

      const collection = extractCollection(payload);

      setBranches(
        collection.rows
          .map(normalizeBranch)
          .filter((branch) => Number.isFinite(Number(branch?.id)))
      );
    } catch (error) {
      message.error(
        apiErrorMessage(error, "Could not load branch options.")
      );
    }
  }, []);

  const loadRows = useCallback(
    async (
      page = pagination.current,
      pageSize = pagination.pageSize
    ) => {
      try {
        setLoading(true);

        const payload = await getBranchRouteRates({
          page,
          per_page: pageSize,
          search: filters.search || undefined,
          pickup_branch_id:
            filters.pickup_branch_id || undefined,
          delivery_branch_id:
            filters.delivery_branch_id || undefined,
          is_active:
            filters.is_active === undefined
              ? undefined
              : filters.is_active,
        });

        const collection = extractCollection(payload);

        const normalized = collection.rows.map((row) =>
          normalizeBranchRate(row, branchesById)
        );

        setRows(normalized);

        setSelected((current) => {
          if (!normalized.length) return null;

          return (
            normalized.find(
              (row) => Number(row.id) === Number(current?.id)
            ) || normalized[0]
          );
        });

        setPagination({
          current: collection.currentPage || page,
          pageSize: collection.pageSize || pageSize,
          total: collection.total,
        });
      } catch (error) {
        message.error(
          apiErrorMessage(error, "Could not load branch pricing.")
        );
      } finally {
        setLoading(false);
      }
    },
    [
      branchesById,
      filters,
      pagination.current,
      pagination.pageSize,
    ]
  );

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (branches.length) {
      loadRows(1, pagination.pageSize);
    }
  }, [branches.length]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active).length;
    const average = rows.length
      ? rows.reduce(
          (sum, row) => sum + Number(row.base_rate || 0),
          0
        ) / rows.length
      : 0;

    return {
      active,
      inactive: rows.length - active,
      average,
    };
  }, [rows]);

  const openCreate = (prefill = {}) => {
    setEditing(null);

    form.setFieldsValue({
      pickup_branch_id: undefined,
      delivery_branch_id: undefined,
      base_rate: undefined,
      is_active: true,
      ...prefill,
    });

    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);

    form.setFieldsValue({
      pickup_branch_id: row.pickup_branch_id,
      delivery_branch_id: row.delivery_branch_id,
      base_rate: Number(row.base_rate),
      is_active: Boolean(row.is_active),
    });

    setModalOpen(true);
  };

  const saveRate = async () => {
    try {
      const values = await form.validateFields();

      if (
        Number(values.pickup_branch_id) ===
        Number(values.delivery_branch_id)
      ) {
        message.error(
          "Pickup and delivery branches must be different."
        );
        return;
      }

      const payload = {
        pickup_branch_id: Number(values.pickup_branch_id),
        delivery_branch_id: Number(values.delivery_branch_id),
        base_rate: Number(values.base_rate),
        is_active: Boolean(values.is_active),
      };

      setSaving(true);

      if (editing) {
        await updateBranchRouteRate(editing.id, payload);
        message.success("Branch rate updated.");
      } else {
        await createBranchRouteRate(payload);
        message.success("Branch rate created.");
      }

      setModalOpen(false);
      setEditing(null);
      form.resetFields();

      await loadRows();
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        apiErrorMessage(error, "Could not save branch rate.")
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await updateBranchRouteRateStatus(
        row.id,
        !row.is_active
      );

      message.success(
        `Branch rate ${row.is_active ? "disabled" : "enabled"}.`
      );

      await loadRows();
    } catch (error) {
      message.error(
        apiErrorMessage(error, "Could not update rate status.")
      );
    }
  };

  const createReverse = async (row) => {
    try {
      await createReverseBranchRouteRate(row);

      message.success("Reverse branch rate created.");
      await loadRows();
    } catch (error) {
      message.error(
        apiErrorMessage(error, "Could not create reverse rate.")
      );
    }
  };

  const removeRate = async (row) => {
    try {
      await deleteBranchRouteRate(row.id);

      message.success("Branch rate deleted.");
      await loadRows();
    } catch (error) {
      message.error(
        apiErrorMessage(error, "Could not delete branch rate.")
      );
    }
  };

  const columns = [
    {
      title: "Route",
      key: "route",
      width: 300,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>
            {row.pickup_branch?.name || "Unknown"}
            {" → "}
            {row.delivery_branch?.name || "Unknown"}
          </Text>

          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.pickup_branch?.code || row.pickup_branch_id}
            {" → "}
            {row.delivery_branch?.code || row.delivery_branch_id}
          </Text>
        </Space>
      ),
    },
    {
      title: "Base Rate",
      dataIndex: "base_rate",
      width: 150,
      render: (value) => (
        <Text strong>{formatMoney(value)}</Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 110,
      render: statusTag,
    },
    {
      title: "Last Updated",
      dataIndex: "updated_at",
      width: 180,
      render: formatDate,
    },
    {
      title: "Actions",
      key: "actions",
      width: 250,
      fixed: "right",
      render: (_, row) => (
        <Space wrap>
          <PermissionGate permission="pricing.branch_rates.update">
            <Tooltip title="Edit rate">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  openEdit(row);
                }}
              />
            </Tooltip>
          </PermissionGate>

          <PermissionGate permission="pricing.branch_rates.create">
            <Tooltip title="Create reverse rate">
              <Button
                size="small"
                icon={<SwapOutlined />}
                onClick={(event) => {
                  event.stopPropagation();
                  createReverse(row);
                }}
              />
            </Tooltip>
          </PermissionGate>

          <PermissionGate permission="pricing.branch_rates.status">
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                toggleStatus(row);
              }}
            >
              {row.is_active ? "Disable" : "Enable"}
            </Button>
          </PermissionGate>

          <PermissionGate permission="pricing.branch_rates.delete">
            <Popconfirm
              title="Delete this branch rate?"
              description="This action cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => removeRate(row)}
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(event) => event.stopPropagation()}
              />
            </Popconfirm>
          </PermissionGate>
        </Space>
      ),
    },
  ];

  const selectedNodes = selected
    ? [
        selected.pickup_branch,
        selected.delivery_branch,
      ].filter(Boolean)
    : [];

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Branch Pricing
            </Title>
            <Text type="secondary">
              Manage directional legacy or simple branch-to-branch base rates.
              Complete multi-lane marketplace base rates are managed under
              Transfer Routes.
            </Text>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadRows()}
              >
                Refresh
              </Button>

              <PermissionGate permission="pricing.branch_rates.create">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openCreate()}
                >
                  Add Branch Rate
                </Button>
              </PermissionGate>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Loaded Rates"
              value={rows.length}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Active Rates"
              value={stats.active}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Average Base Rate"
              value={stats.average}
              precision={2}
              prefix="NPR"
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={7}>
            <Input
              allowClear
              placeholder="Search route or amount"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={5}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Pickup branch"
              style={{ width: "100%" }}
              options={branchOptions}
              value={filters.pickup_branch_id}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  pickup_branch_id: value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={5}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Delivery branch"
              style={{ width: "100%" }}
              options={branchOptions}
              value={filters.delivery_branch_id}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  delivery_branch_id: value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Status"
              style={{ width: "100%" }}
              value={filters.is_active}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  is_active: value,
                }))
              }
              options={[
                { label: "Active", value: 1 },
                { label: "Inactive", value: 0 },
              ]}
            />
          </Col>

          <Col xs={24} sm={12} lg={3}>
            <Button
              block
              type="primary"
              onClick={() => loadRows(1)}
            >
              Apply
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card bordered={false}>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={rows}
              scroll={{ x: 1050 }}
              rowClassName={(row) =>
                Number(row.id) === Number(selected?.id)
                  ? "ant-table-row-selected"
                  : ""
              }
              onRow={(row) => ({
                onClick: () => setSelected(row),
                style: { cursor: "pointer" },
              })}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
              }}
              onChange={(next) =>
                loadRows(next.current, next.pageSize)
              }
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card
            bordered={false}
            title="Selected Rate Map"
          >
            <RouteMap
              nodes={selectedNodes}
              height={360}
              selectedLabel="Branch route rate"
            />

            <Descriptions
              column={1}
              size="small"
              style={{ marginTop: 18 }}
            >
              <Descriptions.Item label="Pickup">
                {selected?.pickup_branch?.name || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Delivery">
                {selected?.delivery_branch?.name || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Base Rate">
                {selected
                  ? formatMoney(selected.base_rate)
                  : "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Status">
                {selected
                  ? statusTag(selected.is_active)
                  : "—"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Modal
        open={modalOpen}
        title={editing ? "Edit Branch Rate" : "Create Branch Rate"}
        width={640}
        confirmLoading={saving}
        okText={editing ? "Update Rate" : "Create Rate"}
        onOk={saveRate}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ is_active: true }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="pickup_branch_id"
                label="Pickup Branch"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="delivery_branch_id"
                label="Delivery Branch"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="base_rate"
            label="Base Rate"
            rules={[
              { required: true },
              {
                type: "number",
                min: 0,
                message: "Base rate must be zero or greater.",
              },
            ]}
          >
            <InputNumber
              min={0}
              precision={2}
              addonBefore="NPR"
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Active for Pricing"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
