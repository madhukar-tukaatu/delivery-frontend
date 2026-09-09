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
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import {
  createBranchTransferRoute,
  createReverseBranchTransferRoute,
  deleteBranchTransferRoute,
  getBranchTransferRoutes,
  getRateBranches,
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

const { Title, Text } = Typography;
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
        height: 300,
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

// Move an item within an array by direction (-1 up, +1 down).
function moveItem(items, index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
}

// Build a short, distinguishing code segment from a branch.
// Branch codes look like "TUK-KTM-MAIN" or "TUK-BAN-MAIN-2".
// The distinguishing part is the CITY segment (KTM, BAN), not the shared "TUK" prefix.
function codeSegment(branch) {
  if (!branch) return "UNK";

  const code = String(branch.code || "").trim();

  if (code.includes("-")) {
    // Split "TUK-KTM-MAIN-2" -> ["TUK","KTM","MAIN","2"]
    const parts = code.split("-").filter(Boolean);
    // Drop the shared company prefix (TUK) and the generic "MAIN" word.
    const meaningful = parts.filter(
      (p) => p.toUpperCase() !== "TUK" && p.toUpperCase() !== "MAIN",
    );
    if (meaningful.length) {
      // e.g. ["KTM"] -> "KTM"; ["BAN","2"] -> "BAN2"
      return meaningful.join("").toUpperCase();
    }
    // Fallback: use the second segment if present.
    if (parts.length >= 2) return parts[1].toUpperCase();
  }

  // No structured code — derive 3 letters from the branch name.
  const fromName = String(branch.name || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();

  return fromName || "UNK";
}

// Route code: {FROM}-{TRANSIT...}-{TO}-{SERVICE}
// e.g. KTM-PKR-MNG-STANDARD (KTM -> Pokhara -> Mustang), or KTM-PKR-STANDARD (direct).
function buildRouteCode(fromBranch, toBranch, serviceType, transitBranches = []) {
  if (!fromBranch || !toBranch || !serviceType) return "";
  const segments = [
    codeSegment(fromBranch),
    ...transitBranches.map(codeSegment),
    codeSegment(toBranch),
    String(serviceType).toUpperCase(),
  ];
  return segments.join("-");
}

// Route name: "Origin to Destination" or "Origin to Destination via Transit1, Transit2".
function buildRouteName(fromBranch, toBranch, transitBranches = []) {
  if (!fromBranch || !toBranch) return "";
  const base = `${fromBranch.name} to ${toBranch.name}`;
  const transitNames = transitBranches.map((b) => b?.name).filter(Boolean);
  if (transitNames.length) {
    return `${base} via ${transitNames.join(", ")}`;
  }
  return base;
}

export default function BranchTransferRoutesPage() {
  const [form] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Live values used to build the code, name and preview map inside the modal.
  const [formPreview, setFormPreview] = useState({
    originId: undefined,
    destinationId: undefined,
    serviceType: "standard",
  });

  const [filters, setFilters] = useState({
    search: "",
    origin_branch_id: undefined,
    destination_branch_id: undefined,
    service_type: undefined,
    has_transit: undefined,
    transit_branch_id: undefined,
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
          has_transit: filters.has_transit === undefined ? undefined : filters.has_transit,
          transit_branch_id: filters.transit_branch_id || undefined,
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
    const inactive = rows.length - active;
    return { total: rows.length, active, inactive };
  }, [rows]);

  // ------- Modal helpers -------

  const resetModalState = () => {
    setModalOpen(false);
    setEditing(null);
    setFormPreview({ originId: undefined, destinationId: undefined, serviceType: "standard" });
    form.resetFields();
  };

  const openCreate = () => {
    setEditing(null);
    setFormPreview({ originId: undefined, destinationId: undefined, serviceType: "standard" });
    form.setFieldsValue({
      route_code: "",
      name: "",
      origin_branch_id: undefined,
      destination_branch_id: undefined,
      transit_branch_ids: [],
      service_type: "standard",
      priority: 100,
      is_default: false,
      is_active: true,
      notes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormPreview({
      originId: row.origin_branch_id,
      destinationId: row.destination_branch_id,
      serviceType: row.service_type || "standard",
    });
    form.setFieldsValue({
      route_code: row.route_code,
      name: row.name,
      origin_branch_id: row.origin_branch_id,
      destination_branch_id: row.destination_branch_id,
      transit_branch_ids: row.transit_branch_ids || [],
      service_type: row.service_type || "standard",
      priority: Number(row.priority || 100),
      is_default: Boolean(row.is_default),
      is_active: Boolean(row.is_active),
      notes: row.notes || "",
    });
    setModalOpen(true);
  };

  const moveTransit = (index, direction) => {
    const current = form.getFieldValue("transit_branch_ids") || [];
    const reordered = moveItem(current, index, direction);
    form.setFieldValue("transit_branch_ids", reordered);
    // Regenerate code/name with the new transit order.
    syncGeneratedFields({ transitIds: reordered });
  };

  // Regenerate code + name whenever origin/destination/service/transits change.
  const syncGeneratedFields = useCallback(
    (next = {}) => {
      const originId = next.originId ?? form.getFieldValue("origin_branch_id");
      const destinationId = next.destinationId ?? form.getFieldValue("destination_branch_id");
      const serviceType = next.serviceType ?? form.getFieldValue("service_type");
      const transitIds = next.transitIds ?? form.getFieldValue("transit_branch_ids") ?? [];

      const fromBranch = branchesById.get(Number(originId));
      const toBranch = branchesById.get(Number(destinationId));
      const transitBranches = transitIds
        .map((id) => branchesById.get(Number(id)))
        .filter(Boolean);

      form.setFieldsValue({
        route_code: buildRouteCode(fromBranch, toBranch, serviceType, transitBranches),
        name: buildRouteName(fromBranch, toBranch, transitBranches),
      });

      setFormPreview({ originId, destinationId, serviceType });
    },
    [form, branchesById],
  );

  const saveRoute = async () => {
    try {
      const values = await form.validateFields();

      if (Number(values.origin_branch_id) === Number(values.destination_branch_id)) {
        message.error("Origin and destination must be different branches.");
        return;
      }

      const transitIds = (values.transit_branch_ids || []).map(Number);

      if (
        transitIds.includes(Number(values.origin_branch_id)) ||
        transitIds.includes(Number(values.destination_branch_id))
      ) {
        message.error("Transit branches cannot be the origin or destination.");
        return;
      }

      const routePayload = {
        route_code: values.route_code.trim(),
        name: values.name.trim(),
        origin_branch_id: Number(values.origin_branch_id),
        destination_branch_id: Number(values.destination_branch_id),
        transit_branch_ids: transitIds,
        service_type: values.service_type,
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

      message.success(editing ? "Transfer route updated." : "Transfer route created.");
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
        apiErrorMessage(error, "Could not create reverse route. Confirm the reverse lane exists."),
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

  // ------- Map nodes -------

  // Watch transit selection so the map preview updates live.
  const watchedTransits = Form.useWatch("transit_branch_ids", form) || [];

  // Nodes for the selected row (table -> map on the right): origin -> transits -> destination.
  const selectedNodes = useMemo(() => {
    if (!selected) return [];
    if (Array.isArray(selected.path) && selected.path.length) {
      return selected.path.filter(
        (branch) =>
          branch &&
          Number.isFinite(Number(branch.latitude)) &&
          Number.isFinite(Number(branch.longitude)),
      );
    }
    return [selected.origin_branch, selected.destination_branch].filter(
      (branch) =>
        branch &&
        Number.isFinite(Number(branch.latitude)) &&
        Number.isFinite(Number(branch.longitude)),
    );
  }, [selected]);

  // Nodes for the modal preview: origin -> transits -> destination (as selected in the form).
  const modalNodes = useMemo(() => {
    const from = branchesById.get(Number(formPreview.originId));
    const to = branchesById.get(Number(formPreview.destinationId));
    const transits = watchedTransits
      .map((id) => branchesById.get(Number(id)))
      .filter(Boolean);

    return [from, ...transits, to].filter(
      (branch) =>
        branch &&
        Number.isFinite(Number(branch.latitude)) &&
        Number.isFinite(Number(branch.longitude)),
    );
  }, [branchesById, formPreview.originId, formPreview.destinationId, watchedTransits]);

  // ------- Table -------

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
          {row.path_text ? (
            <Text style={{ fontSize: 12 }}>{row.path_text}</Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Service",
      dataIndex: "service_type",
      width: 110,
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Transits",
      dataIndex: "transit_count",
      width: 90,
      align: "center",
      render: (value) =>
        Number(value) > 0 ? (
          <Tag color="purple">{value}</Tag>
        ) : (
          <Text type="secondary">Direct</Text>
        ),
    },
    {
      title: "Distance",
      dataIndex: "total_distance_km",
      width: 110,
      align: "center",
      render: (value) => `${Number(value || 0).toFixed(1)} km`,
    },
    {
      title: "ETA",
      dataIndex: "total_estimated_hours",
      width: 90,
      align: "center",
      render: (value) => `${Number(value || 0)} hrs`,
    },
    {
      title: "Default",
      dataIndex: "is_default",
      width: 90,
      align: "center",
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
      width: 210,
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

          <Button size="small" onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}>
            {row.is_active ? "Disable" : "Enable"}
          </Button>

          <Popconfirm
            title="Delete this transfer route?"
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

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Transfer Routes
            </Title>
            <Text type="secondary">
              Pick origin, destination and service type. The route code and name are generated
              automatically. Base rates are managed in Branch Pricing.
            </Text>
          </Col>

          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => loadRows()}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
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
            <Statistic title="Total Routes" value={stats.total} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic title="Active" value={stats.active} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card bordered={false}>
            <Statistic title="Inactive" value={stats.inactive} valueStyle={{ color: "#8c8c8c" }} />
          </Card>
        </Col>
      </Row>

      {/* FILTERS */}
      <Card bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={6}>
            <Input.Search
              allowClear
              placeholder="Search route code or name"
              value={filters.search}
              onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
              onSearch={() => loadRows(1)}
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Route Type"
              style={{ width: "100%" }}
              options={[
                { label: "All Routes", value: undefined },
                { label: "Direct Only", value: false },
                { label: "Transit Only", value: true },
              ]}
              value={filters.has_transit}
              onChange={(value) => setFilters((c) => ({ ...c, has_transit: value }))}
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Via Transit Branch"
              style={{ width: "100%" }}
              options={branchOptions}
              value={filters.transit_branch_id}
              onChange={(value) => setFilters((c) => ({ ...c, transit_branch_id: value }))}
            />
          </Col>

          <Col xs={24} sm={12} lg={5}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Origin branch"
              style={{ width: "100%" }}
              options={branchOptions}
              value={filters.origin_branch_id}
              onChange={(value) => setFilters((c) => ({ ...c, origin_branch_id: value }))}
            />
          </Col>

          <Col xs={24} sm={12} lg={5}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Destination branch"
              style={{ width: "100%" }}
              options={branchOptions}
              value={filters.destination_branch_id}
              onChange={(value) => setFilters((c) => ({ ...c, destination_branch_id: value }))}
            />
          </Col>

          <Col xs={24} sm={12} lg={4}>
            <Select
              allowClear
              placeholder="Service"
              style={{ width: "100%" }}
              options={SERVICE_TYPES}
              value={filters.service_type}
              onChange={(value) => setFilters((c) => ({ ...c, service_type: value }))}
            />
          </Col>

          <Col xs={24} lg={3}>
            <Button block type="primary" onClick={() => loadRows(1)}>
              Apply
            </Button>
          </Col>
        </Row>
      </Card>

      {/* TABLE + SELECTED MAP */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card bordered={false}>
            <Table
              rowKey="id"
              loading={loading}
              columns={columns}
              dataSource={rows}
              scroll={{ x: 1100 }}
              rowClassName={(row) =>
                Number(row.id) === Number(selected?.id) ? "ant-table-row-selected" : ""
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
                showTotal: (total) => `Total ${total} routes`,
              }}
              onChange={(next) => loadRows(next.current, next.pageSize)}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card bordered={false} title="Selected Route">
            <RouteMapS nodes={selectedNodes} height={340} selectedLabel="Transfer route" />

            <Descriptions column={1} size="small" style={{ marginTop: 18 }}>
              <Descriptions.Item label="Route">{selected?.name || "—"}</Descriptions.Item>
              <Descriptions.Item label="Code">{selected?.route_code || "—"}</Descriptions.Item>
              <Descriptions.Item label="Path">{selected?.path_text || "—"}</Descriptions.Item>
              <Descriptions.Item label="Transits">
                {selected ? (Number(selected.transit_count) || 0) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Distance">
                {selected ? `${Number(selected.total_distance_km || 0).toFixed(1)} km` : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="ETA">
                {selected ? `${Number(selected.total_estimated_hours || 0)} hrs` : "—"}
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
                        {node.code ? <Text type="secondary">{node.code}</Text> : null}
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
        width={820}
        confirmLoading={saving}
        okText={editing ? "Update Route" : "Create Route"}
        onOk={saveRoute}
        onCancel={resetModalState}
        destroyOnClose
        styles={{ body: { maxHeight: "78vh", overflowY: "auto", paddingRight: 8 } }}
      >
        <Alert
          type="info"
          showIcon
          message="Select origin, destination and service type. The route code and name generate automatically. Transit branches are optional for multi-hop routes."
          style={{ marginBottom: 18 }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            service_type: "standard",
            transit_branch_ids: [],
            priority: 100,
            is_default: false,
            is_active: true,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="origin_branch_id"
                label="Origin Branch"
                rules={[{ required: true, message: "Select origin branch" }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select origin"
                  options={branchOptions}
                  onChange={(value) => syncGeneratedFields({ originId: value })}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="destination_branch_id"
                label="Destination Branch"
                rules={[{ required: true, message: "Select destination branch" }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select destination"
                  options={branchOptions}
                  onChange={(value) => syncGeneratedFields({ destinationId: value })}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="service_type"
                label="Service Type"
                rules={[{ required: true, message: "Select service type" }]}
              >
                <Select
                  options={SERVICE_TYPES}
                  onChange={(value) => syncGeneratedFields({ serviceType: value })}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <Input type="number" min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="transit_branch_ids"
            label="Transit Branches (optional, in order)"
            help="Add intermediate hubs the shipment passes through. Selection order sets the route order — use the arrows to adjust."
          >
            <Select
              mode="multiple"
              showSearch
              allowClear
              optionFilterProp="label"
              options={branchOptions}
              placeholder="e.g. Pokhara (for KTM → Pokhara → Mustang)"
              onChange={(value) => syncGeneratedFields({ transitIds: value })}
            />
          </Form.Item>

          {watchedTransits.length > 0 ? (
            <Card size="small" style={{ marginBottom: 18 }} title="Transit Order">
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
            <Col span={10}>
              <Form.Item name="route_code" label="Route Code (auto)" rules={[{ required: true }]}>
                <Input readOnly placeholder="e.g. KTM-PKR-MNG-STANDARD" />
              </Form.Item>
            </Col>

            <Col span={14}>
              <Form.Item name="name" label="Route Name (auto)" rules={[{ required: true }]}>
                <Input readOnly placeholder="Auto-filled from branches" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_default" label="Default route" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} maxLength={1000} showCount placeholder="Optional operations note" />
          </Form.Item>
        </Form>

        {/* LIVE ROUTE MAP PREVIEW */}
        <Divider orientation="left" plain>
          <Space size={6}>
            <EnvironmentOutlined />
            Route Preview
          </Space>
        </Divider>

        {modalNodes.length >= 2 ? (
          <RouteMapS nodes={modalNodes} height={280} selectedLabel="New transfer route" />
        ) : (
          <Alert
            type="warning"
            showIcon
            message="Select an origin and destination with coordinates to preview the route on the map."
          />
        )}
      </Modal>
    </Space>
  );
}
