"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
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
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import { Checkbox, Empty, List, Segmented } from "antd";

import dynamic from "next/dynamic";

import PermissionGate from "@/components/rate-admin/PermissionGate";
import RouteMap from "@/components/rate-admin/RouteMap";
import CheckpointMapPicker from "@/components/rate-admin/CheckpointMapPicker";
import { deriveBranchConnectivity } from "@/services/adminRateManagementService";

const BranchNetworkMap = dynamic(
  () => import("@/components/rate-admin/BranchNetworkMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 460,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fa",
          borderRadius: 12,
          color: "#8c8c8c",
        }}
      >
        Loading network map...
      </div>
    ),
  },
);

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
    label: "Flight",
    value: "flight",
  },
  {
    label: "Rail",
    value: "rail",
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

  const [view, setView] = useState("lanes"); // lanes | connectivity
  const [connBranchId, setConnBranchId] = useState(undefined);

  const [filters, setFilters] = useState({
    search: "",
    from_branch_id: undefined,
    to_branch_id: undefined,
    service_type: undefined,
    is_active: undefined,
  });

  const [checkpoints, setCheckpoints] = useState([]);

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
    async (page = 1, pageSize = pagination.pageSize, overrideFilters = null) => {
      try {
        setLoading(true);

        const active = overrideFilters || filters;

        const payload = await getBranchTransferLanes({
          page,
          per_page: pageSize,

          search: active.search?.trim() || undefined,

          from_branch_id: active.from_branch_id || undefined,

          to_branch_id: active.to_branch_id || undefined,

          service_type: active.service_type || undefined,

          is_active:
            active.is_active === undefined ? undefined : active.is_active,
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

  // Update a filter and immediately reload with the new value (page reset to 1).
  const applyFilter = useCallback(
    (patch) => {
      setFilters((current) => {
        const next = { ...current, ...patch };
        loadRows(1, pagination.pageSize, next);
        return next;
      });
    },
    [loadRows, pagination.pageSize],
  );

  const resetFilters = useCallback(() => {
    const cleared = {
      search: "",
      from_branch_id: undefined,
      to_branch_id: undefined,
      service_type: undefined,
      is_active: undefined,
    };
    setFilters(cleared);
    loadRows(1, pagination.pageSize, cleared);
  }, [loadRows, pagination.pageSize]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active).length;
    const inactive = rows.length - active;

    const distance = rows.reduce(
      (sum, row) => sum + Number(row.distance_km || 0),
      0,
    );

    return {
      active,
      inactive,
      distance,
    };
  }, [rows]);

  // Branch-centric connectivity: which branches the selected branch links to.
  const connectivity = useMemo(() => {
    if (!connBranchId) return null;
    return deriveBranchConnectivity(connBranchId, rows);
  }, [connBranchId, rows]);

  const connBranch = connBranchId
    ? branchesById.get(Number(connBranchId))
    : null;

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

      is_active: Boolean(row.is_active),

      variant_name: row.variant_name || "",
    });

    setCheckpoints(Array.isArray(row.checkpoints) ? row.checkpoints : []);

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    setCheckpoints([]);
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

        is_active: Boolean(values.is_active),

        variant_name: values.variant_name?.trim() || null,

        checkpoints: checkpoints,
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
      title: "Variant",
      dataIndex: "variant_name",
      width: 130,

      render: (value) => value || "—",
    },

    {
      title: "Checkpoints",
      dataIndex: "checkpoints",
      width: 130,

      render: (value) => {
        if (!value || value.length === 0) return "—";
        return `${value.length} checkpoints`;
      },
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
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { label: "Lanes", value: "lanes", icon: <SwapOutlined /> },
                  {
                    label: "Connectivity",
                    value: "connectivity",
                    icon: <ApartmentOutlined />,
                  },
                ]}
              />
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
            <Statistic title="Inactive Lanes" value={stats.inactive} />
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

      {view === "connectivity" ? (
        <LaneConnectivityPanel
          branchOptions={branchOptions}
          connBranchId={connBranchId}
          setConnBranchId={setConnBranchId}
          connectivity={connectivity}
          connBranch={connBranch}
          onAddLane={(prefill) => openCreate(prefill)}
        />
      ) : (
        <>
      <Card bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={6}>
            <Input.Search
              allowClear
              placeholder="Search branch name"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              onSearch={(value) => applyFilter({ search: value })}
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="From branch"
              style={{ width: "100%" }}
              options={branchOptions}
              value={filters.from_branch_id}
              onChange={(value) => applyFilter({ from_branch_id: value })}
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="To branch"
              style={{ width: "100%" }}
              options={branchOptions}
              value={filters.to_branch_id}
              onChange={(value) => applyFilter({ to_branch_id: value })}
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Service"
              style={{ width: "100%" }}
              options={SERVICE_TYPES}
              value={filters.service_type}
              onChange={(value) => applyFilter({ service_type: value })}
            />
          </Col>

          <Col xs={24} sm={12} lg={3}>
            <Select
              allowClear
              placeholder="Status"
              style={{ width: "100%" }}
              value={filters.is_active}
              onChange={(value) => applyFilter({ is_active: value })}
              options={[
                { label: "Active", value: 1 },
                { label: "Inactive", value: 0 },
              ]}
            />
          </Col>

          <Col xs={24} lg={3}>
            <Button block onClick={resetFilters}>
              Reset
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
        </>
      )}

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

            <Col span={8}>
              <Form.Item
                name="is_active"
                label="Active"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Path Variant</Divider>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="variant_name"
                label="Variant Name"
                tooltip="e.g., 'Via Khaireni', 'Via Gorkha', 'Direct'"
              >
                <Input placeholder="Enter variant name (optional)" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Road Checkpoints</Divider>
          <Row gutter={16}>
            <Col span={24}>
              <CheckpointMapPicker
                checkpoints={checkpoints}
                onCheckpointsChange={setCheckpoints}
              />
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}

// -------------------- Branch Connectivity Panel --------------------

function LaneConnectivityPanel({
  branchOptions,
  connBranchId,
  setConnBranchId,
  connectivity,
  connBranch,
  onAddLane,
}) {
  const [serviceFilter, setServiceFilter] = useState([
    "standard",
    "express",
    "same_day",
    "flight",
  ]);

  // All lanes touching this branch (outbound + inbound), for the map.
  const connectedLanes = useMemo(() => {
    const out = connectivity?.outbound || [];
    const inb = connectivity?.inbound || [];
    const map = new Map();
    for (const lane of [...out, ...inb]) {
      map.set(Number(lane.id), lane);
    }
    return Array.from(map.values());
  }, [connectivity]);

  const laneRow = (lane, direction) => {
    const other = direction === "out" ? lane.to_branch : lane.from_branch;
    return (
      <List.Item>
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Space size={6}>
            <Tag color={direction === "out" ? "geekblue" : "cyan"}>
              {direction === "out" ? "→ to" : "← from"}
            </Tag>
            <Text strong>{other?.name || "Branch"}</Text>
            <Tag color="blue">{lane.service_type}</Tag>
            {lane.transport_mode ? <Tag>{lane.transport_mode}</Tag> : null}
            {statusTag(lane.is_active)}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {Number(lane.distance_km || 0)} km · ~
            {Number(lane.estimated_hours || 0)} hrs · priority {lane.priority}
          </Text>
        </Space>
      </List.Item>
    );
  };

  const outbound = connectivity?.outbound || [];
  const inbound = connectivity?.inbound || [];

  return (
    <Card bordered={false}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Select
              showSearch
              allowClear
              style={{ width: "100%" }}
              placeholder="Select a branch (e.g. Kathmandu) to see its connections"
              optionFilterProp="label"
              options={branchOptions}
              value={connBranchId}
              onChange={setConnBranchId}
            />
          </Col>
          <Col xs={24} md={14}>
            {connBranch ? (
              <Space wrap>
                <Text type="secondary">
                  <ApartmentOutlined />{" "}
                  <Text strong>{connBranch.name}</Text> connects to{" "}
                  {outbound.length} outbound and {inbound.length} inbound branch
                  {outbound.length + inbound.length === 1 ? "" : "es"}.
                </Text>
                {connBranchId ? (
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      onAddLane({ from_branch_id: Number(connBranchId) })
                    }
                  >
                    Add lane from here
                  </Button>
                ) : null}
              </Space>
            ) : (
              <Text type="secondary">
                Pick a branch to view every direct lane in and out of it.
              </Text>
            )}
          </Col>
        </Row>

        {!connBranchId ? (
          <Empty description="No branch selected" />
        ) : (
          <>
          <Card
            size="small"
            title={
              <Space>
                <ApartmentOutlined />
                Network Map — {connBranch?.name}
              </Space>
            }
            extra={
              <Checkbox.Group
                value={serviceFilter}
                onChange={setServiceFilter}
                options={[
                  { label: "Standard", value: "standard" },
                  { label: "Express", value: "express" },
                  { label: "Same Day", value: "same_day" },
                  { label: "Flight", value: "flight" },
                ]}
              />
            }
          >
            <BranchNetworkMap
              centerBranch={connBranch}
              lanes={connectedLanes}
              activeServices={serviceFilter}
              height={460}
            />
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={
                  <Space>
                    <NodeIndexOutlined />
                    Outbound Lanes ({outbound.length})
                  </Space>
                }
              >
                <List
                  size="small"
                  locale={{ emptyText: "No outbound lanes from this branch" }}
                  dataSource={outbound}
                  renderItem={(lane) => laneRow(lane, "out")}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                size="small"
                title={
                  <Space>
                    <NodeIndexOutlined />
                    Inbound Lanes ({inbound.length})
                  </Space>
                }
              >
                <List
                  size="small"
                  locale={{ emptyText: "No inbound lanes to this branch" }}
                  dataSource={inbound}
                  renderItem={(lane) => laneRow(lane, "in")}
                />
              </Card>
            </Col>
          </Row>
          </>
        )}
      </Space>
    </Card>
  );
}
