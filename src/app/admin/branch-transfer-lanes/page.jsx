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
  createBranchTransferLane,
  createReverseBranchTransferLane,
  deleteBranchTransferLane,
  getBranchTransferLanes,
  getRateBranches,
  updateBranchTransferLane,
  updateBranchTransferLaneStatus,
} from "@/services/adminRateManagementService";

import {
  apiErrorMessage,
  branchLabel,
  buildBranchMap,
  extractCollection,
  normalizeBranch,
  normalizeTransferLane,
} from "@/lib/rate-management-page-utils";

const { Title, Text } = Typography;

const SERVICE_TYPES = [
  {
    label: "Standard",
    value: "standard",
  },
  {
    label: "Express",
    value: "express",
  },
  {
    label: "Same Day",
    value: "same_day",
  },
];

const TRANSPORT_MODES = [
  {
    label: "Road",
    value: "road",
  },
  {
    label: "Air",
    value: "air",
  },
  {
    label: "Mixed",
    value: "mixed",
  },
];

function statusTag(active) {
  return (
    <Tag color={active ? "green" : "default"}>
      {active ? "Active" : "Inactive"}
    </Tag>
  );
}

export default function BranchTransferLanesPage() {
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
    from_branch_id: undefined,
    to_branch_id: undefined,
    service_type: undefined,
    is_active: undefined,
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0,
  });

  const branchesById = useMemo(() => buildBranchMap(branches), [branches]);

  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: Number(branch.id),
        label: branchLabel(branch),
      })),
    [branches],
  );

  const loadBranches = useCallback(async () => {
    try {
      const payload = await getRateBranches({
        status: "active",
        per_page: 500,
      });

      const collection = extractCollection(payload);

      const normalizedBranches = collection.rows
        .map(normalizeBranch)
        .filter((branch) => Number.isFinite(Number(branch?.id)));

      setBranches(normalizedBranches);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not load branch options."));
    }
  }, []);

  const loadRows = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      try {
        setLoading(true);

        const payload = await getBranchTransferLanes({
          page,
          per_page: pageSize,

          search: filters.search?.trim() || undefined,

          from_branch_id: filters.from_branch_id || undefined,

          to_branch_id: filters.to_branch_id || undefined,

          service_type: filters.service_type || undefined,

          is_active:
            filters.is_active === undefined ? undefined : filters.is_active,
        });

        const collection = extractCollection(payload);

        const normalized = collection.rows.map((row) =>
          normalizeTransferLane(row, branchesById),
        );

        setRows(normalized);

        setSelected((current) => {
          if (!normalized.length) {
            return null;
          }

          return (
            normalized.find((row) => Number(row.id) === Number(current?.id)) ||
            normalized[0]
          );
        });

        setPagination({
          current: collection.currentPage || page,

          pageSize: collection.pageSize || pageSize,

          total: collection.total ?? normalized.length,
        });
      } catch (error) {
        message.error(apiErrorMessage(error, "Could not load transfer lanes."));
      } finally {
        setLoading(false);
      }
    },
    [branchesById, filters, pagination.current, pagination.pageSize],
  );

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    if (branches.length > 0) {
      loadRows(1, pagination.pageSize);
    }
  }, [branches.length]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active).length;

    const bidirectional = rows.filter((row) => row.is_bidirectional).length;

    const distance = rows.reduce(
      (sum, row) => sum + Number(row.distance_km || 0),
      0,
    );

    return {
      active,
      bidirectional,
      distance,
    };
  }, [rows]);

  const openCreate = (prefill = {}) => {
    setEditing(null);

    form.setFieldsValue({
      from_branch_id: undefined,
      to_branch_id: undefined,
      service_type: "standard",
      transport_mode: "road",
      distance_km: undefined,
      estimated_hours: 1,
      priority: 100,
      is_bidirectional: false,
      is_active: true,
      ...prefill,
    });

    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);

    form.setFieldsValue({
      from_branch_id: Number(row.from_branch_id),

      to_branch_id: Number(row.to_branch_id),

      service_type: row.service_type || "standard",

      transport_mode: row.transport_mode || "road",

      distance_km:
        row.distance_km === null || row.distance_km === undefined
          ? undefined
          : Number(row.distance_km),

      estimated_hours: Number(row.estimated_hours || 1),

      priority: Number(row.priority || 100),

      is_bidirectional: Boolean(row.is_bidirectional),

      is_active: Boolean(row.is_active),
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const saveLane = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        from_branch_id: Number(values.from_branch_id),
        to_branch_id: Number(values.to_branch_id),
        service_type: values.service_type,
        transport_mode: values.transport_mode || null,

        distance_km:
          values.distance_km === undefined || values.distance_km === null
            ? null
            : Number(values.distance_km),

        estimated_hours:
          values.estimated_hours === undefined ||
          values.estimated_hours === null
            ? 1
            : Number(values.estimated_hours),

        priority:
          values.priority === undefined || values.priority === null
            ? 100
            : Number(values.priority),

        is_bidirectional: Boolean(values.is_bidirectional),
        is_active: Boolean(values.is_active),
      };

      setSaving(true);

      if (editing) {
        await updateBranchTransferLane(editing.id, payload);
        message.success("Transfer lane updated.");
      } else {
        await createBranchTransferLane(payload);
        message.success("Transfer lane created.");
      }

      setModalOpen(false);
      setEditing(null);
      form.resetFields();

      await loadRows();
    } catch (error) {
      if (error?.errorFields) return;

      message.error(apiErrorMessage(error, "Could not save transfer lane."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await updateBranchTransferLaneStatus(row.id, !row.is_active);

      message.success(
        `Transfer lane ${row.is_active ? "disabled" : "enabled"}.`,
      );

      await loadRows(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not update lane status."));
    }
  };

  const createReverse = async (row) => {
    try {
      await createReverseBranchTransferLane(row);

      message.success("Reverse transfer lane created.");

      await loadRows(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not create reverse lane."));
    }
  };

  const removeLane = async (row) => {
    try {
      await deleteBranchTransferLane(row.id);

      message.success("Transfer lane deleted.");

      await loadRows(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not delete transfer lane."));
    }
  };

  const columns = [
    {
      title: "Direct Lane",
      key: "lane",
      width: 290,

      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>
            {row.from_branch?.name || "Unknown"}

            {" → "}

            {row.to_branch?.name || "Unknown"}
          </Text>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Priority {row.priority}
          </Text>
        </Space>
      ),
    },

    {
      title: "Service",
      dataIndex: "service_type",
      width: 120,

      render: (value) => <Tag color="blue">{value || "—"}</Tag>,
    },

    {
      title: "Transport",
      dataIndex: "transport_mode",
      width: 110,

      render: (value) => value || "—",
    },

    {
      title: "Distance",
      dataIndex: "distance_km",
      width: 110,

      render: (value) =>
        value === null || value === undefined
          ? "—"
          : `${Number(value).toFixed(2)} km`,
    },

    {
      title: "ETA",
      dataIndex: "estimated_hours",
      width: 90,

      render: (value) => `${Number(value || 0)} hrs`,
    },

    {
      title: "Direction",
      dataIndex: "is_bidirectional",
      width: 130,

      render: (value) => (
        <Tag color={value ? "purple" : "default"}>
          {value ? "Bidirectional" : "One-way"}
        </Tag>
      ),
    },

    {
      title: "Status",
      dataIndex: "is_active",
      width: 110,
      render: statusTag,
    },

    {
      title: "Actions",
      key: "actions",
      width: 250,
      fixed: "right",

      render: (_, row) => (
        <Space wrap>
          {/* <PermissionGate permission="pricing.transfer_lanes.update"> */}
          <Tooltip title="Edit lane">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                openEdit(row);
              }}
            />
          </Tooltip>
          {/* </PermissionGate> */}

          {/* <PermissionGate permission="pricing.transfer_lanes.create"> */}
          <Tooltip
            title={
              Number(row.from_branch_id) === Number(row.to_branch_id)
                ? "Same-branch lane has no reverse route"
                : "Create reverse lane"
            }
          >
            <Button
              size="small"
              disabled={Number(row.from_branch_id) === Number(row.to_branch_id)}
              icon={<SwapOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                createReverse(row);
              }}
            />
          </Tooltip>
          {/* </PermissionGate> */}

          {/* <PermissionGate permission="pricing.transfer_lanes.status"> */}
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              toggleStatus(row);
            }}
          >
            {row.is_active ? "Disable" : "Enable"}
          </Button>
          {/* </PermissionGate> */}

          {/* <PermissionGate permission="pricing.transfer_lanes.delete"> */}
          <Popconfirm
            title="Delete this transfer lane?"
            description="Routes using this lane may stop working."
            okText="Delete"
            okButtonProps={{
              danger: true,
            }}
            onConfirm={() => removeLane(row)}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(event) => event.stopPropagation()}
            />
          </Popconfirm>
          {/* </PermissionGate> */}
        </Space>
      ),
    },
  ];

  const selectedNodes = selected
    ? [selected.from_branch, selected.to_branch].filter(Boolean)
    : [];

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col flex="auto">
            <Title level={3} style={{ margin: 0 }}>
              Transfer Lanes
            </Title>

            <Text type="secondary">
              Manage direct physical network connections between branches.
            </Text>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() =>
                  loadRows(pagination.current, pagination.pageSize)
                }
              >
                Refresh
              </Button>

              {/* <PermissionGate permission="pricing.transfer_lanes.create"> */}
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCreate()}
              >
                Add Transfer Lane
              </Button>
              {/* </PermissionGate> */}
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic title="Loaded Lanes" value={rows.length} />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic title="Active Lanes" value={stats.active} />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic title="Bidirectional" value={stats.bidirectional} />
          </Card>
        </Col>

        <Col xs={24} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Loaded Distance"
              value={stats.distance}
              precision={1}
              suffix="km"
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={6}>
            <Input
              allowClear
              placeholder="Search branch or transport"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="From branch"
              style={{
                width: "100%",
              }}
              options={branchOptions}
              value={filters.from_branch_id}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  from_branch_id: value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="To branch"
              style={{
                width: "100%",
              }}
              options={branchOptions}
              value={filters.to_branch_id}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  to_branch_id: value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Service"
              style={{
                width: "100%",
              }}
              options={SERVICE_TYPES}
              value={filters.service_type}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  service_type: value,
                }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={3}>
            <Select
              allowClear
              placeholder="Status"
              style={{
                width: "100%",
              }}
              value={filters.is_active}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  is_active: value,
                }))
              }
              options={[
                {
                  label: "Active",
                  value: 1,
                },
                {
                  label: "Inactive",
                  value: 0,
                },
              ]}
            />
          </Col>

          <Col xs={24} lg={3}>
            <Button block type="primary" onClick={() => loadRows(1)}>
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
              scroll={{ x: 1250 }}
              rowClassName={(row) =>
                Number(row.id) === Number(selected?.id)
                  ? "ant-table-row-selected"
                  : ""
              }
              onRow={(row) => ({
                onClick: () => setSelected(row),
                style: {
                  cursor: "pointer",
                },
              })}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
              }}
              onChange={(next) => loadRows(next.current, next.pageSize)}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card bordered={false} title="Selected Lane Map">
            <RouteMap
              nodes={selectedNodes}
              height={360}
              selectedLabel="Direct transfer lane"
            />

            <Descriptions
              column={1}
              size="small"
              style={{
                marginTop: 18,
              }}
            >
              <Descriptions.Item label="From">
                {selected?.from_branch?.name || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="To">
                {selected?.to_branch?.name || "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Distance">
                {selected
                  ? selected.distance_km === null
                    ? "—"
                    : `${Number(selected.distance_km).toFixed(2)} km`
                  : "—"}
              </Descriptions.Item>

              <Descriptions.Item label="ETA">
                {selected
                  ? `${Number(selected.estimated_hours || 0)} hrs`
                  : "—"}
              </Descriptions.Item>

              <Descriptions.Item label="Status">
                {selected ? statusTag(selected.is_active) : "—"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Modal
        open={modalOpen}
        title={editing ? "Edit Transfer Lane" : "Create Transfer Lane"}
        width={760}
        confirmLoading={saving}
        okText={editing ? "Update Lane" : "Create Lane"}
        onOk={saveLane}
        onCancel={closeModal}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            service_type: "standard",

            transport_mode: "road",

            estimated_hours: 1,

            priority: 100,

            is_bidirectional: false,

            is_active: true,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="from_branch_id"
                label="From Branch"
                rules={[
                  {
                    required: true,
                    message: "Please select from branch.",
                  },
                ]}
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
                name="to_branch_id"
                label="To Branch"
                rules={[
                  {
                    required: true,
                    message: "Please select to branch.",
                  },
                ]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="service_type"
                label="Service Type"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <Select options={SERVICE_TYPES} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="transport_mode" label="Transport Mode">
                <Select allowClear options={TRANSPORT_MODES} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="distance_km" label="Distance">
                <InputNumber
                  min={0}
                  precision={2}
                  addonAfter="km"
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="estimated_hours"
                label="Estimated Hours"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[
                  {
                    required: true,
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  style={{
                    width: "100%",
                  }}
                />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                name="is_bidirectional"
                label="Bidirectional"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                name="is_active"
                label="Active"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}
