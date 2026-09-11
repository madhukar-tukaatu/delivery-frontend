"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Segmented,
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
  SendOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import dynamic from "next/dynamic";

import PermissionGate from "@/components/rate-admin/PermissionGate";
import RouteMap from "@/components/rate-admin/RouteMap";
import { deriveBranchConnectivity } from "@/services/adminRateManagementService";

const CheckpointMapPicker = dynamic(
  () => import("@/components/rate-admin/CheckpointMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fa",
          borderRadius: 12,
          color: "#8c8c8c",
        }}
      >
        Loading map...
      </div>
    ),
  },
);

const ArcRouteMap = dynamic(
  () => import("@/components/rate-admin/ArcRouteMap"),
  {
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
  },
);

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
  createRouteForBranchTransferLane,
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
  { label: "Standard", value: "standard" },
  { label: "Express", value: "express" },
  { label: "Same Day", value: "same_day" },
];

const TRANSPORT_MODES = [
  { label: "Road", value: "road" },
  { label: "Flight", value: "flight" },
  { label: "Rail", value: "rail" },
];

// Transport mode icon as a simple emoji/text badge
function TransportBadge({ mode }) {
  const config = {
    road:   { label: "ROAD",   color: "blue",   icon: "🛣️" },
    flight: { label: "FLIGHT", color: "cyan",   icon: "✈️" },
    rail:   { label: "RAIL",   color: "orange", icon: "🚂" },
  };
  const c = config[mode] || { label: mode?.toUpperCase() || "—", color: "default", icon: "🚚" };
  return (
    <Tag color={c.color}>
      {c.icon} {c.label}
    </Tag>
  );
}

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
  const [creatingRoutes, setCreatingRoutes] = useState(new Set()); // Track which lanes are being processed

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [view, setView] = useState("lanes"); // lanes | connectivity
  const [connBranchId, setConnBranchId] = useState(undefined);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]); // For bulk operations

  const [filters, setFilters] = useState({
    search: "",
    from_branch_id: undefined,
    to_branch_id: undefined,
    service_type: undefined,
    is_active: undefined,
  });

  const [checkpoints, setCheckpoints] = useState([]);

  // Tracks what the form currently holds so the map preview reacts
  const [modalFromId, setModalFromId] = useState(null);
  const [modalToId, setModalToId] = useState(null);
  const [modalTransportMode, setModalTransportMode] = useState("road");

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0,
  });

  const branchesById = useMemo(() => buildBranchMap(branches), [branches]);

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({ value: Number(b.id), label: branchLabel(b) })),
    [branches],
  );

  const loadBranches = useCallback(async () => {
    try {
      const payload = await getRateBranches({ status: "active", per_page: 500 });
      const collection = extractCollection(payload);
      const normalized = collection.rows
        .map(normalizeBranch)
        .filter((b) => Number.isFinite(Number(b?.id)));
      setBranches(normalized);
    } catch (err) {
      message.error(apiErrorMessage(err, "Could not load branch options."));
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
          is_active: active.is_active === undefined ? undefined : active.is_active,
        });
        const collection = extractCollection(payload);
        const normalized = collection.rows.map((r) =>
          normalizeTransferLane(r, branchesById),
        );
        setRows(normalized);
        setSelected((current) => {
          if (!normalized.length) return null;
          return (
            normalized.find((r) => Number(r.id) === Number(current?.id)) ||
            normalized[0]
          );
        });
        setPagination({
          current: collection.currentPage || page,
          pageSize: collection.pageSize || pageSize,
          total: collection.total ?? normalized.length,
        });
      } catch (err) {
        message.error(apiErrorMessage(err, "Could not load transfer lanes."));
      } finally {
        setLoading(false);
      }
    },
    [branchesById, filters, pagination.pageSize],
  );

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { if (branches.length > 0) loadRows(1, pagination.pageSize); }, [branches.length]);

  const applyFilter = useCallback(
    (patch) => {
      setFilters((cur) => {
        const next = { ...cur, ...patch };
        loadRows(1, pagination.pageSize, next);
        return next;
      });
    },
    [loadRows, pagination.pageSize],
  );

  const resetFilters = useCallback(() => {
    const cleared = { search: "", from_branch_id: undefined, to_branch_id: undefined, service_type: undefined, is_active: undefined };
    setFilters(cleared);
    loadRows(1, pagination.pageSize, cleared);
  }, [loadRows, pagination.pageSize]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.is_active).length;
    const distance = rows.reduce((s, r) => s + Number(r.distance_km || 0), 0);
    return { active, inactive: rows.length - active, distance };
  }, [rows]);

  const connectivity = useMemo(() => {
    if (!connBranchId) return null;
    return deriveBranchConnectivity(connBranchId, rows);
  }, [connBranchId, rows]);

  const connBranch = connBranchId ? branchesById.get(Number(connBranchId)) : null;

  // Map preview path nodes derived from modal branch selections
  const modalPathNodes = useMemo(() => {
    if (!modalFromId || !modalToId) return [];
    const from = branchesById.get(Number(modalFromId));
    const to   = branchesById.get(Number(modalToId));
    if (!from || !to) return [];
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    if (!toNum(from.latitude) || !toNum(from.longitude)) return [];
    if (!toNum(to.latitude)   || !toNum(to.longitude))   return [];
    return [
      { id: from.id, name: from.name, code: from.code, latitude: toNum(from.latitude), longitude: toNum(from.longitude), sequence: 0 },
      { id: to.id,   name: to.name,   code: to.code,   latitude: toNum(to.latitude),   longitude: toNum(to.longitude),   sequence: 1 },
    ];
  }, [modalFromId, modalToId, branchesById]);

  // ------------------------------------------------------------------
  // Modal helpers
  // ------------------------------------------------------------------
  const openCreate = (prefill = {}) => {
    setEditing(null);
    setCheckpoints([]);
    setModalFromId(prefill.from_branch_id ? Number(prefill.from_branch_id) : null);
    setModalToId(null);
    setModalTransportMode("road");

    form.resetFields();
    form.setFieldsValue({
      service_type: "standard",
      transport_mode: "road",
      estimated_hours: 1,
      priority: 100,
      is_active: true,
      ...prefill,
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setCheckpoints(Array.isArray(row.checkpoints) ? row.checkpoints : []);
    setModalFromId(Number(row.from_branch_id));
    setModalToId(Number(row.to_branch_id));
    setModalTransportMode(row.transport_mode || "road");

    form.resetFields();
    form.setFieldsValue({
      from_branch_id:  Number(row.from_branch_id),
      to_branch_id:    Number(row.to_branch_id),
      service_type:    row.service_type || "standard",
      transport_mode:  row.transport_mode || "road",
      distance_km:     row.distance_km == null ? undefined : Number(row.distance_km),
      estimated_hours: Number(row.estimated_hours || 1),
      priority:        Number(row.priority || 100),
      is_active:       Boolean(row.is_active),
      variant_name:    row.variant_name || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    setCheckpoints([]);
    setModalFromId(null);
    setModalToId(null);
    setModalTransportMode("road");
  };

  const onFormValuesChange = (changed) => {
    if ("from_branch_id"  in changed) setModalFromId(changed.from_branch_id ? Number(changed.from_branch_id) : null);
    if ("to_branch_id"    in changed) setModalToId(changed.to_branch_id ? Number(changed.to_branch_id) : null);
    if ("transport_mode"  in changed) setModalTransportMode(changed.transport_mode || "road");
  };

  const saveLane = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        from_branch_id:  Number(values.from_branch_id),
        to_branch_id:    Number(values.to_branch_id),
        service_type:    values.service_type,
        transport_mode:  values.transport_mode || null,
        distance_km:     values.distance_km == null ? null : Number(values.distance_km),
        estimated_hours: values.estimated_hours == null ? 1 : Number(values.estimated_hours),
        priority:        values.priority == null ? 100 : Number(values.priority),
        is_active:       Boolean(values.is_active),
        variant_name:    values.variant_name?.trim() || null,
        checkpoints,
      };
      setSaving(true);
      if (editing) {
        await updateBranchTransferLane(editing.id, payload);
        message.success("Transfer lane updated.");
      } else {
        await createBranchTransferLane(payload);
        message.success("Transfer lane created.");
      }
      closeModal();
      await loadRows();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(apiErrorMessage(err, "Could not save transfer lane."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await updateBranchTransferLaneStatus(row.id, !row.is_active);
      message.success(`Transfer lane ${row.is_active ? "disabled" : "enabled"}.`);
      await loadRows(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(apiErrorMessage(err, "Could not update lane status."));
    }
  };

  const createReverse = async (row) => {
    try {
      await createReverseBranchTransferLane(row);
      message.success("Reverse transfer lane created.");
      await loadRows(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(apiErrorMessage(err, "Could not create reverse lane."));
    }
  };

  const removeLane = async (row) => {
    try {
      await deleteBranchTransferLane(row.id);
      message.success("Transfer lane deleted.");
      await loadRows(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(apiErrorMessage(err, "Could not delete transfer lane."));
    }
  };

  const createRoute = async (row) => {
    try {
      setCreatingRoutes((prev) => new Set([...prev, row.id]));
      await createRouteForBranchTransferLane(row.id);
      message.success("Route created successfully for this lane.");
      
      // Update only that specific row
      setRows((prevRows) =>
        prevRows.map((r) =>
          r.id === row.id ? { ...r, route_exists: true } : r
        )
      );
    } catch (err) {
      message.error(apiErrorMessage(err, "Could not create route for this lane."));
    } finally {
      setCreatingRoutes((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  const bulkCreateRoutes = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select lanes to create routes for.");
      return;
    }

    try {
      setCreatingRoutes((prev) => new Set([...prev, ...selectedRowKeys]));
      
      // Create routes for all selected lanes that don't have one
      const lanesToProcess = rows.filter(
        (r) => selectedRowKeys.includes(r.id) && !r.route_exists
      );

      if (lanesToProcess.length === 0) {
        message.info("All selected lanes already have routes.");
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      for (const lane of lanesToProcess) {
        try {
          await createRouteForBranchTransferLane(lane.id);
          successCount++;
          
          // Update the row
          setRows((prevRows) =>
            prevRows.map((r) =>
              r.id === lane.id ? { ...r, route_exists: true } : r
            )
          );
        } catch (err) {
          failedCount++;
        }
      }

      if (failedCount === 0) {
        message.success(`Routes created for ${successCount} lane(s).`);
      } else {
        message.warning(
          `Created routes for ${successCount} lane(s). ${failedCount} failed.`
        );
      }

      setSelectedRowKeys([]);
    } finally {
      setCreatingRoutes((prev) => {
        const next = new Set(prev);
        selectedRowKeys.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  // ------------------------------------------------------------------
  // Table columns
  // ------------------------------------------------------------------
  const columns = [
    {
      title: "Direct Lane",
      key: "lane",
      width: 260,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>
            {row.from_branch?.name || "Unknown"} {" → "} {row.to_branch?.name || "Unknown"}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>Priority {row.priority}</Text>
        </Space>
      ),
    },
    {
      title: "Service",
      dataIndex: "service_type",
      width: 110,
      render: (v) => <Tag color="blue">{v || "—"}</Tag>,
    },
    {
      title: "Transport",
      dataIndex: "transport_mode",
      width: 110,
      render: (v) => v ? <TransportBadge mode={v} /> : "—",
    },
    {
      title: "Distance",
      dataIndex: "distance_km",
      width: 110,
      render: (v) => v == null ? "—" : `${Number(v).toFixed(2)} km`,
    },
    {
      title: "ETA",
      dataIndex: "estimated_hours",
      width: 80,
      render: (v) => `${Number(v || 0)} hrs`,
    },
    {
      title: "Variant",
      dataIndex: "variant_name",
      width: 130,
      render: (v) => v || "—",
    },
    {
      title: "Checkpoints",
      dataIndex: "checkpoints",
      width: 120,
      render: (v) => (!v || v.length === 0) ? "—" : `${v.length} pts`,
    },
    {
      title: "Route Status",
      dataIndex: "route_exists",
      width: 130,
      render: (exists, row) => exists ? (
        <Tag color="green">
          ✓ Route exists
        </Tag>
      ) : (
        <Tag color="orange">No route</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 90,
      render: statusTag,
    },
    {
      title: "Actions",
      key: "actions",
      width: 300,
      fixed: "right",
      render: (_, row) => (
        <Space wrap>
          <Tooltip title="Edit lane">
            <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(row); }} />
          </Tooltip>
          {!row.route_exists && (
            <Tooltip title="Create route for this lane">
              <Button 
                size="small" 
                type="primary" 
                ghost
                icon={<SendOutlined />} 
                onClick={(e) => { e.stopPropagation(); createRoute(row); }}
                loading={creatingRoutes.has(row.id)}
              >
                Create Route
              </Button>
            </Tooltip>
          )}
          <Tooltip title={Number(row.from_branch_id) === Number(row.to_branch_id) ? "Same-branch lane has no reverse" : "Create reverse lane"}>
            <Button
              size="small"
              disabled={Number(row.from_branch_id) === Number(row.to_branch_id)}
              icon={<SwapOutlined />}
              onClick={(e) => { e.stopPropagation(); createReverse(row); }}
            />
          </Tooltip>
          <Button size="small" onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}>
            {row.is_active ? "Disable" : "Enable"}
          </Button>
          <Popconfirm
            title="Delete this transfer lane?"
            description="Routes using this lane may stop working."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => removeLane(row)}
          >
            <Button danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const selectedNodes = selected
    ? [selected.from_branch, selected.to_branch].filter(Boolean)
    : [];

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      {/* Header */}
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col flex="auto">
            <Title level={3} style={{ margin: 0 }}>Transfer Lanes</Title>
            <Text type="secondary">Manage direct physical network connections between branches.</Text>
          </Col>
          <Col>
            <Space>
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { label: "Lanes", value: "lanes", icon: <SwapOutlined /> },
                  { label: "Connectivity", value: "connectivity", icon: <ApartmentOutlined /> },
                ]}
              />
              <Button icon={<ReloadOutlined />} onClick={() => loadRows(pagination.current, pagination.pageSize)}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>Add Transfer Lane</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}><Card bordered={false}><Statistic title="Loaded Lanes" value={rows.length} /></Card></Col>
        <Col xs={24} md={6}><Card bordered={false}><Statistic title="Active Lanes" value={stats.active} /></Card></Col>
        <Col xs={24} md={6}><Card bordered={false}><Statistic title="Inactive Lanes" value={stats.inactive} /></Card></Col>
        <Col xs={24} md={6}><Card bordered={false}><Statistic title="Loaded Distance" value={stats.distance} precision={1} suffix="km" /></Card></Col>
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
          {/* Bulk actions bar */}
          {selectedRowKeys.length > 0 && (
            <Card
              bordered={false}
              style={{
                background: "#e6f7ff",
                borderLeft: "4px solid #1890ff",
              }}
            >
              <Row justify="space-between" align="middle">
                <Col>
                  <Text>
                    <strong>{selectedRowKeys.length}</strong> lane(s) selected
                  </Text>
                </Col>
                <Col>
                  <Space>
                    <Button onClick={() => setSelectedRowKeys([])}>Clear</Button>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={bulkCreateRoutes}
                      loading={creatingRoutes.size > 0}
                    >
                      Bulk Create Routes
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          )}

          {/* Filters */}
          <Card bordered={false}>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={6}>
                <Input.Search
                  allowClear
                  placeholder="Search branch name"
                  value={filters.search}
                  onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
                  onSearch={(v) => applyFilter({ search: v })}
                />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <Select allowClear showSearch optionFilterProp="label" placeholder="From branch" style={{ width: "100%" }} options={branchOptions} value={filters.from_branch_id} onChange={(v) => applyFilter({ from_branch_id: v })} />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <Select allowClear showSearch optionFilterProp="label" placeholder="To branch" style={{ width: "100%" }} options={branchOptions} value={filters.to_branch_id} onChange={(v) => applyFilter({ to_branch_id: v })} />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <Select allowClear placeholder="Service" style={{ width: "100%" }} options={SERVICE_TYPES} value={filters.service_type} onChange={(v) => applyFilter({ service_type: v })} />
              </Col>
              <Col xs={24} sm={12} lg={3}>
                <Select allowClear placeholder="Status" style={{ width: "100%" }} value={filters.is_active} onChange={(v) => applyFilter({ is_active: v })} options={[{ label: "Active", value: 1 }, { label: "Inactive", value: 0 }]} />
              </Col>
              <Col xs={24} lg={3}><Button block onClick={resetFilters}>Reset</Button></Col>
            </Row>
          </Card>

          {/* Table + detail */}
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card bordered={false}>
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={columns}
                  dataSource={rows}
                  scroll={{ x: 1200 }}
                  rowClassName={(row) => Number(row.id) === Number(selected?.id) ? "ant-table-row-selected" : ""}
                  onRow={(row) => ({ onClick: () => setSelected(row), style: { cursor: "pointer" } })}
                  pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                  }}
                  onChange={(next) => loadRows(next.current, next.pageSize)}
                  rowSelection={{
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                    selections: [
                      Table.SELECTION_ALL,
                      Table.SELECTION_INVERT,
                      {
                        key: "no-routes",
                        text: "Lanes without routes",
                        onSelect: () => {
                          const noRouteIds = rows
                            .filter((r) => !r.route_exists)
                            .map((r) => r.id);
                          setSelectedRowKeys(noRouteIds);
                        },
                      },
                    ],
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card
                bordered={false}
                title={
                  <Space>
                    Selected Lane Map
                    {selected?.transport_mode && <TransportBadge mode={selected.transport_mode} />}
                  </Space>
                }
              >
                {selected ? (
                  selected.transport_mode === "road" || !selected.transport_mode ? (
                    <CheckpointMapPicker
                      value={selected.checkpoints || []}
                      onChange={() => {}} // Read-only in preview
                      pathNodes={selectedNodes}
                      height={360}
                    />
                  ) : (
                    <ArcRouteMap
                      fromNode={selected.from_branch}
                      toNode={selected.to_branch}
                      mode={selected.transport_mode}
                      height={360}
                    />
                  )
                ) : (
                  <div
                    style={{
                      height: 360,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f5f5f5",
                      borderRadius: 8,
                      color: "#bbb",
                    }}
                  >
                    Select a lane to preview
                  </div>
                )}
                <Descriptions column={1} size="small" style={{ marginTop: 18 }}>
                  <Descriptions.Item label="From">{selected?.from_branch?.name || "—"}</Descriptions.Item>
                  <Descriptions.Item label="To">{selected?.to_branch?.name || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Transport">{selected?.transport_mode ? <TransportBadge mode={selected.transport_mode} /> : "—"}</Descriptions.Item>
                  <Descriptions.Item label="Distance">{selected ? (selected.distance_km == null ? "—" : `${Number(selected.distance_km).toFixed(2)} km`) : "—"}</Descriptions.Item>
                  <Descriptions.Item label="ETA">{selected ? `${Number(selected.estimated_hours || 0)} hrs` : "—"}</Descriptions.Item>
                  <Descriptions.Item label="Variant">{selected?.variant_name || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Checkpoints">{selected?.checkpoints?.length ? `${selected.checkpoints.length} checkpoint(s)` : "—"}</Descriptions.Item>
                  <Descriptions.Item label="Route Status">
                    {selected ? (
                      selected.route_exists ? (
                        <Tag color="green">✓ Route exists</Tag>
                      ) : (
                        <Tag color="orange">No route</Tag>
                      )
                    ) : (
                      "—"
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">{selected ? statusTag(selected.is_active) : "—"}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={modalOpen}
        title={editing ? "Edit Transfer Lane" : "Create Transfer Lane"}
        width={860}
        confirmLoading={saving}
        okText={editing ? "Update Lane" : "Create Lane"}
        onOk={saveLane}
        onCancel={closeModal}
        destroyOnClose
        styles={{ body: { maxHeight: "82vh", overflowY: "auto", paddingRight: 6 } }}
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={onFormValuesChange}
          initialValues={{
            service_type: "standard",
            transport_mode: "road",
            estimated_hours: 1,
            priority: 100,
            is_active: true,
          }}
        >
          {/* Map preview — road: checkpoint picker; flight/rail: visual indicator */}
          <div
            style={{
              border: "1px solid #f0f0f0",
              borderRadius: 12,
              padding: 12,
              background: "#fafafa",
              marginBottom: 20,
            }}
          >
            <Space style={{ marginBottom: 8 }}>
              <Text strong>Route Preview</Text>
              <TransportBadge mode={modalTransportMode} />
              {modalPathNodes.length >= 2 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {modalPathNodes[0]?.name} → {modalPathNodes[modalPathNodes.length - 1]?.name}
                </Text>
              )}
            </Space>

            {modalPathNodes.length >= 2 ? (
              modalTransportMode === "road" ? (
                <CheckpointMapPicker
                  value={checkpoints}
                  onChange={setCheckpoints}
                  pathNodes={modalPathNodes}
                  height={300}
                />
              ) : (
                <ArcRouteMap
                  fromNode={modalPathNodes[0]}
                  toNode={modalPathNodes[modalPathNodes.length - 1]}
                  mode={modalTransportMode}
                  height={300}
                />
              )
            ) : (
              <div
                style={{
                  height: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f5f5f5",
                  borderRadius: 8,
                  color: "#bbb",
                  fontSize: 14,
                }}
              >
                Select From and To branches below to preview the route
              </div>
            )}
          </div>

          {/* Form fields */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="from_branch_id"
                label="From Branch"
                rules={[{ required: true, message: "Please select from branch." }]}
              >
                <Select showSearch optionFilterProp="label" options={branchOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="to_branch_id"
                label="To Branch"
                rules={[{ required: true, message: "Please select to branch." }]}
              >
                <Select showSearch optionFilterProp="label" options={branchOptions} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="service_type" label="Service Type" rules={[{ required: true }]}>
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
                <InputNumber min={0} precision={2} addonAfter="km" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="estimated_hours" label="Estimated Hours" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

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
        </Form>
      </Modal>
    </Space>
  );
}

// ─────────────────────────────────────────────
// Branch Connectivity Panel
// ─────────────────────────────────────────────
function LaneConnectivityPanel({ branchOptions, connBranchId, setConnBranchId, connectivity, connBranch, onAddLane }) {
  const [serviceFilter, setServiceFilter] = useState(["standard", "express", "same_day", "flight"]);

  const connectedLanes = useMemo(() => {
    const out = connectivity?.outbound || [];
    const inb = connectivity?.inbound || [];
    const map = new Map();
    for (const lane of [...out, ...inb]) map.set(Number(lane.id), lane);
    return Array.from(map.values());
  }, [connectivity]);

  const laneRow = (lane, direction) => {
    const other = direction === "out" ? lane.to_branch : lane.from_branch;
    return (
      <List.Item>
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Space size={6}>
            <Tag color={direction === "out" ? "geekblue" : "cyan"}>{direction === "out" ? "→ to" : "← from"}</Tag>
            <Text strong>{other?.name || "Branch"}</Text>
            <Tag color="blue">{lane.service_type}</Tag>
            {lane.transport_mode ? <Tag>{lane.transport_mode}</Tag> : null}
            {statusTag(lane.is_active)}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {Number(lane.distance_km || 0)} km · ~{Number(lane.estimated_hours || 0)} hrs · priority {lane.priority}
          </Text>
        </Space>
      </List.Item>
    );
  };

  const outbound = connectivity?.outbound || [];
  const inbound  = connectivity?.inbound  || [];

  return (
    <Card bordered={false}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Select
              showSearch allowClear
              style={{ width: "100%" }}
              placeholder="Select a branch to see its connections"
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
                  <Text strong>{connBranch.name}</Text> connects to {outbound.length} outbound and {inbound.length} inbound branch{outbound.length + inbound.length === 1 ? "" : "es"}.
                </Text>
                {connBranchId ? (
                  <Button size="small" icon={<PlusOutlined />} onClick={() => onAddLane({ from_branch_id: Number(connBranchId) })}>
                    Add lane from here
                  </Button>
                ) : null}
              </Space>
            ) : (
              <Text type="secondary">Pick a branch to view every direct lane in and out of it.</Text>
            )}
          </Col>
        </Row>

        {!connBranchId ? (
          <Empty description="No branch selected" />
        ) : (
          <>
            <Card
              size="small"
              title={<Space><ApartmentOutlined />Network Map — {connBranch?.name}</Space>}
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
              <BranchNetworkMap centerBranch={connBranch} lanes={connectedLanes} activeServices={serviceFilter} height={460} />
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" title={<Space><NodeIndexOutlined />Outbound Lanes ({outbound.length})</Space>}>
                  <List size="small" locale={{ emptyText: "No outbound lanes from this branch" }} dataSource={outbound} renderItem={(lane) => laneRow(lane, "out")} />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card size="small" title={<Space><NodeIndexOutlined />Inbound Lanes ({inbound.length})</Space>}>
                  <List size="small" locale={{ emptyText: "No inbound lanes to this branch" }} dataSource={inbound} renderItem={(lane) => laneRow(lane, "in")} />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Space>
    </Card>
  );
}
