"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  List,
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
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import RouteMap from "@/components/rate-admin/RouteMap";

import {
  createBranchTransferRoute,
  createReverseBranchTransferRoute,
  deleteBranchTransferRoute,
  getBranchTransferRoutes,
  getRateBranches,
  previewBranchTransferRoute,
  updateBranchTransferRoute,
  updateBranchTransferRouteStatus,
} from "@/services/adminRateManagementService";

import {
  apiErrorMessage,
  branchLabel,
  buildBranchMap,
  extractCollection,
  normalizeBranch,
  normalizeTransferRoute,
} from "@/lib/rate-management-page-utils";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const SERVICE_TYPES = [
  { label: "Standard", value: "standard" },
  { label: "Express", value: "express" },
  { label: "Same Day", value: "same_day" },
];

const RouteMapS = dynamic(() => import("@/components/rate-admin/RouteMapS"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 340,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fa",
        borderRadius: 8,
        color: "#8c8c8c",
      }}
    >
      Loading map...
    </div>
  ),
});

function statusTag(active) {
  return (
    <Tag color={active ? "green" : "default"}>
      {active ? "Active" : "Inactive"}
    </Tag>
  );
}

function moveItem(items, index, direction) {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

export default function BranchTransferRoutesPage() {
  const [form] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    origin_branch_id: undefined,
    destination_branch_id: undefined,
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
      const payload = await getRateBranches({ status: "active", per_page: 500 });
      const collection = extractCollection(payload);
      setBranches(
        collection.rows
          .map(normalizeBranch)
          .filter((branch) => Number.isFinite(Number(branch?.id))),
      );
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not load branch options."));
    }
  }, []);

  const loadRows = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      try {
        setLoading(true);

        const payload = await getBranchTransferRoutes({
          page,
          per_page: pageSize,
          search: filters.search || undefined,
          origin_branch_id: filters.origin_branch_id || undefined,
          destination_branch_id: filters.destination_branch_id || undefined,
          service_type: filters.service_type || undefined,
          is_active: filters.is_active === undefined ? undefined : filters.is_active,
        });

        const collection = extractCollection(payload);
        const normalized = collection.rows.map((row) =>
          normalizeTransferRoute(row, branchesById),
        );

        setRows(normalized);
        setSelected((current) => {
          if (!normalized.length) return null;
          return (
            normalized.find((row) => Number(row.id) === Number(current?.id)) ||
            normalized[0]
          );
        });

        setPagination({
          current: collection.currentPage || page,
          pageSize: collection.pageSize || pageSize,
          total: collection.total,
        });
      } catch (error) {
        message.error(apiErrorMessage(error, "Could not load transfer routes."));
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
    if (branches.length) {
      loadRows(1, pagination.pageSize);
    }
  }, [branches.length]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active).length;
    const averageTransfers = rows.length
      ? rows.reduce((sum, row) => sum + Number(row.transfer_count || 0), 0) /
        rows.length
      : 0;
    return { active, averageTransfers };
  }, [rows]);

  const resetModalState = () => {
    setModalOpen(false);
    setEditing(null);
    setPreview(null);
    form.resetFields();
  };

  const openCreate = () => {
    setEditing(null);
    setPreview(null);
    form.setFieldsValue({
      route_code: "",
      name: "",
      origin_branch_id: undefined,
      transit_branch_ids: [],
      destination_branch_id: undefined,
      service_type: "standard",
      priority: 100,
      is_default: true,
      is_active: true,
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      route_code: row.route_code,
      name: row.name,
      origin_branch_id: row.origin_branch_id,
      transit_branch_ids: row.transit_branch_ids || [],
      destination_branch_id: row.destination_branch_id,
      service_type: row.service_type || "standard",
      priority: Number(row.priority || 100),
      is_default: Boolean(row.is_default),
      is_active: Boolean(row.is_active),
      notes: row.notes || "",
    });
    setPreview({
      path: row.path,
      path_text: row.path_text,
      transfer_count: row.transfer_count,
      transit_count: row.transit_count,
      total_distance_km: row.total_distance_km,
      total_estimated_hours: row.total_estimated_hours,
    });
    setModalOpen(true);
  };

  const buildRouteDefinition = async () => {
    const values = await form.validateFields([
      "origin_branch_id",
      "transit_branch_ids",
      "destination_branch_id",
      "service_type",
    ]);

    const ids = [
      Number(values.origin_branch_id),
      ...(values.transit_branch_ids || []).map(Number),
      Number(values.destination_branch_id),
    ];

    if (new Set(ids).size !== ids.length) {
      throw new Error("Origin, transit, and destination branches must not repeat.");
    }

    return {
      origin_branch_id: Number(values.origin_branch_id),
      transit_branch_ids: values.transit_branch_ids?.map(Number) || [],
      destination_branch_id: Number(values.destination_branch_id),
      service_type: values.service_type,
    };
  };

  const previewRoute = async () => {
    try {
      setPreviewing(true);
      const definition = await buildRouteDefinition();
      const result = await previewBranchTransferRoute(definition);
      setPreview(result);
      message.success("Route preview generated.");
    } catch (error) {
      if (error?.errorFields) return;
      message.error(apiErrorMessage(error, "Could not preview transfer route."));
    } finally {
      setPreviewing(false);
    }
  };

  const saveRoute = async () => {
    try {
      const values = await form.validateFields();
      const definition = await buildRouteDefinition();

      const routePayload = {
        route_code: values.route_code.trim(),
        name: values.name.trim(),
        ...definition,
        priority: Number(values.priority || 100),
        is_default: Boolean(values.is_default),
        is_active: Boolean(values.is_active),
        notes: values.notes?.trim() || null,
      };

      setSaving(true);

      if (editing) {
        await updateBranchTransferRoute(editing.id, routePayload);
      } else {
        await createBranchTransferRoute(routePayload);
      }

      message.success("Transfer route saved.");
      resetModalState();
      await loadRows();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(apiErrorMessage(error, "Could not save transfer route."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await updateBranchTransferRouteStatus(row.id, !row.is_active);
      message.success(`Transfer route ${row.is_active ? "disabled" : "enabled"}.`);
      await loadRows();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not update route status."));
    }
  };

  const createReverse = async (row) => {
    try {
      await createReverseBranchTransferRoute(row);
      message.success("Reverse transfer route created.");
      await loadRows();
    } catch (error) {
      message.error(
        apiErrorMessage(
          error,
          "Could not create reverse route. Confirm that every reverse direct lane exists.",
        ),
      );
    }
  };

  const removeRoute = async (row) => {
    try {
      await deleteBranchTransferRoute(row.id);
      message.success("Transfer route deleted.");
      await loadRows();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not delete transfer route."));
    }
  };

  const moveTransit = (index, direction) => {
    const current = form.getFieldValue("transit_branch_ids") || [];
    form.setFieldValue("transit_branch_ids", moveItem(current, index, direction));
  };

  const columns = [
    {
      title: "Route",
      key: "route",
      width: 320,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>{row.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.route_code}
          </Text>
          <Text style={{ fontSize: 12 }}>{row.path_text || "No path"}</Text>
        </Space>
      ),
    },
    {
      title: "Type",
      key: "route_type",
      width: 120,
      render: (_, row) =>
        row.origin_branch_id === row.destination_branch_id && !row.transit_count ? (
          <Tag color="orange">Local</Tag>
        ) : (
          <Tag color="blue">Transfer</Tag>
        ),
    },
    {
      title: "Service",
      dataIndex: "service_type",
      width: 110,
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Transfers",
      dataIndex: "transfer_count",
      width: 95,
      align: "center",
      render: (value) => <Tag color="purple">{value}</Tag>,
    },
    {
      title: "Transits",
      dataIndex: "transit_count",
      width: 85,
      align: "center",
    },
    {
      title: "Distance",
      dataIndex: "total_distance_km",
      width: 110,
      render: (value) => `${Number(value || 0).toFixed(2)} km`,
    },
    {
      title: "ETA",
      dataIndex: "total_estimated_hours",
      width: 90,
      render: (value) => `${Number(value || 0)} hrs`,
    },
    {
      title: "Default",
      dataIndex: "is_default",
      width: 90,
      render: (value) => (value ? <Tag color="gold">Default</Tag> : "—"),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 100,
      render: statusTag,
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_, row) => (
        <Space wrap>
          <Tooltip title="Edit route">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            />
          </Tooltip>

          <Tooltip title="Create reverse route">
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={(e) => { e.stopPropagation(); createReverse(row); }}
            />
          </Tooltip>

          <Button
            size="small"
            onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}
          >
            {row.is_active ? "Disable" : "Enable"}
          </Button>

          <Popconfirm
            title="Delete this transfer route?"
            description="Saved pricing quotes keep their route snapshot."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => removeRoute(row)}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const selectedNodes = Array.isArray(selected?.path)
    ? selected.path.filter(
        (branch) =>
          Number.isFinite(Number(branch.latitude)) &&
          Number.isFinite(Number(branch.longitude)),
      )
    : [];

  const watchedTransits = Form.useWatch("transit_branch_ids", form) || [];

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Transfer Routes
            </Title>
            <Text type="secondary">
              Manage complete ordered routes. Base rates are configured in Branch
              Pricing.
            </Text>
          </Col>

          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => loadRows()}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCreate()}
              >
                Add Transfer Route
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* STATS */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic title="Loaded Routes" value={rows.length} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic title="Active Routes" value={stats.active} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Average Transfers"
              value={stats.averageTransfers}
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      {/* FILTERS */}
      <Card bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={6}>
            <Input.Search
              allowClear
              placeholder="Search route code, name or branch"
              value={filters.search}
              onChange={(e) =>
                setFilters((c) => ({ ...c, search: e.target.value }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Origin branch"
              style={{ width: "100%" }}
              options={branchOptions}
              value={filters.origin_branch_id}
              onChange={(value) =>
                setFilters((c) => ({ ...c, origin_branch_id: value }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Destination branch"
              style={{ width: "100%" }}
              options={branchOptions}
              value={filters.destination_branch_id}
              onChange={(value) =>
                setFilters((c) => ({ ...c, destination_branch_id: value }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Service"
              style={{ width: "100%" }}
              options={SERVICE_TYPES}
              value={filters.service_type}
              onChange={(value) =>
                setFilters((c) => ({ ...c, service_type: value }))
              }
            />
          </Col>

          <Col xs={24} sm={12} lg={3}>
            <Select
              allowClear
              placeholder="Status"
              style={{ width: "100%" }}
              value={filters.is_active}
              onChange={(value) =>
                setFilters((c) => ({ ...c, is_active: value }))
              }
              options={[
                { label: "Active", value: 1 },
                { label: "Inactive", value: 0 },
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

      {/* TABLE + MAP */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card bordered={false}>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={rows}
              scroll={{ x: 1300 }}
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
              onChange={(next) => loadRows(next.current, next.pageSize)}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card bordered={false} title="Selected Route Map">
            <RouteMap
              nodes={selectedNodes}
              height={390}
              selectedLabel="Complete transfer route"
            />

            <Descriptions column={1} size="small" style={{ marginTop: 18 }}>
              <Descriptions.Item label="Route">
                {selected?.path_text || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Transfers">
                {selected?.transfer_count ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Transit Branches">
                {selected?.transit_count ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Distance">
                {selected
                  ? `${Number(selected.total_distance_km || 0).toFixed(2)} km`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="ETA">
                {selected
                  ? `${Number(selected.total_estimated_hours || 0)} hrs`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                {selected ? statusTag(selected.is_active) : "—"}
              </Descriptions.Item>
            </Descriptions>

            {selectedNodes.length > 0 ? (
              <>
                <Divider />
                <Text strong>Route Path</Text>
                <List
                  size="small"
                  style={{ marginTop: 10 }}
                  dataSource={selectedNodes}
                  renderItem={(node, index) => (
                    <List.Item>
                      <Space>
                        <Tag color="purple">{index + 1}</Tag>
                        <Text>{node.name}</Text>
                        {node.code ? (
                          <Text type="secondary">{node.code}</Text>
                        ) : null}
                      </Space>
                    </List.Item>
                  )}
                />
              </>
            ) : null}
          </Card>
        </Col>
      </Row>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={modalOpen}
        title={editing ? "Edit Transfer Route" : "Create Transfer Route"}
        width={900}
        confirmLoading={saving}
        okText={editing ? "Update Route" : "Create Route"}
        onOk={saveRoute}
        onCancel={resetModalState}
        destroyOnClose
        styles={{ body: { maxHeight: "76vh", overflowY: "auto", paddingRight: 8 } }}
      >
        <Alert
          type="info"
          showIcon
          message="The backend validates that every direct lane in the selected sequence exists and is active."
          style={{ marginBottom: 18 }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            service_type: "standard",
            transit_branch_ids: [],
            priority: 100,
            is_default: true,
            is_active: true,
          }}
        >
          <Row gutter={16}>
            <Col span={9}>
              <Form.Item
                name="route_code"
                label="Route Code"
                rules={[{ required: true }, { max: 100 }]}
              >
                <Input placeholder="KTM-PKR-MUG-STANDARD" />
              </Form.Item>
            </Col>

            <Col span={15}>
              <Form.Item
                name="name"
                label="Route Name"
                rules={[{ required: true }, { max: 255 }]}
              >
                <Input placeholder="Kathmandu to Mustang via Pokhara" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="origin_branch_id"
                label="Origin Branch"
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
                name="destination_branch_id"
                label="Destination Branch"
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
            name="transit_branch_ids"
            label="Transit Branches in Route Order"
            help="Selection order is used as the route order. Use the arrows below to correct it."
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              options={branchOptions}
              placeholder="Example: Pokhara"
            />
          </Form.Item>

          {watchedTransits.length > 0 ? (
            <Card size="small" style={{ marginBottom: 18 }}>
              <List
                size="small"
                dataSource={watchedTransits}
                renderItem={(branchId, index) => {
                  const branch = branchesById.get(Number(branchId));
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="up"
                          size="small"
                          icon={<ArrowUpOutlined />}
                          disabled={index === 0}
                          onClick={() => moveTransit(index, -1)}
                        />,
                        <Button
                          key="down"
                          size="small"
                          icon={<ArrowDownOutlined />}
                          disabled={index === watchedTransits.length - 1}
                          onClick={() => moveTransit(index, 1)}
                        />,
                      ]}
                    >
                      <Space>
                        <Tag color="purple">{index + 1}</Tag>
                        <Text>{branch?.name || `Branch ${branchId}`}</Text>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            </Card>
          ) : null}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="service_type"
                label="Service Type"
                rules={[{ required: true }]}
              >
                <Select options={SERVICE_TYPES} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true }]}
              >
                <Input type="number" min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item name="is_default" label="Default" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item name="is_active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Space style={{ marginBottom: 18 }}>
                <Button
                  icon={<EyeOutlined />}
                  loading={previewing}
                  onClick={previewRoute}
                >
                  Preview and Validate Route
                </Button>
              </Space>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <TextArea
              rows={2}
              maxLength={1000}
              showCount
              placeholder="Optional operations note"
            />
          </Form.Item>
        </Form>

        {preview && (
          <>
            <Divider />
            <Card size="small" title="Validated Route Preview">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Path" span={2}>
                  {preview.path_text ||
                    preview.route_text ||
                    preview.path?.map((b) => b.name).join(" → ") ||
                    "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Transfer Count">
                  {preview.transfer_count ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Transit Count">
                  {preview.transit_count ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Distance">
                  {preview.total_distance_km !== undefined
                    ? `${Number(preview.total_distance_km).toFixed(2)} km`
                    : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Estimated Hours">
                  {preview.total_estimated_hours ?? "—"}
                </Descriptions.Item>
              </Descriptions>

              <Paragraph
                type="secondary"
                style={{ marginTop: 12, marginBottom: 0 }}
              >
                Base rates are configured per origin→destination pair in Branch
                Pricing. Global Pricing Settings apply additional charges on top.
              </Paragraph>
            </Card>
          </>
        )}
      </Modal>
    </Space>
  );
}
