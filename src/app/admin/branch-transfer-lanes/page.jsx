"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Card, Col, Descriptions, Empty, Form, Input, InputNumber, Modal, Popconfirm, Row, Segmented, Select, Space, Statistic, Switch, Table, Tag, Tooltip, Typography, message, Alert, Spin,
} from "antd";
import {
  ApartmentOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SendOutlined, SwapOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
} from "@ant-design/icons";
import dynamic from "next/dynamic";
import PermissionGate from "@/components/rate-admin/PermissionGate";
import RouteMap from "@/components/rate-admin/RouteMap";
import { deriveBranchConnectivity } from "@/services/adminRateManagementService";
import {
  createBranchTransferLane, createReverseBranchTransferLane, createRouteForBranchTransferLane, deleteBranchTransferLane, getBranchTransferLanes, getRateBranches, updateBranchTransferLane, updateBranchTransferLaneStatus,
} from "@/services/adminRateManagementService";
import {
  apiErrorMessage, branchLabel, buildBranchMap, extractCollection, normalizeBranch, normalizeTransferLane,
} from "@/lib/rate-management-page-utils";

const { Title, Text } = Typography;

const CheckpointMapPicker = dynamic(() => import("@/components/rate-admin/CheckpointMapPicker"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", borderRadius: 12, color: "#8c8c8c" }}>
      Loading map...
    </div>
  ),
});

const ArcRouteMap = dynamic(() => import("@/components/rate-admin/ArcRouteMap"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", borderRadius: 8, color: "#8c8c8c" }}>
      Loading map...
    </div>
  ),
});

const BranchNetworkMap = dynamic(() => import("@/components/rate-admin/BranchNetworkMap"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 460, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", borderRadius: 12, color: "#8c8c8c" }}>
      Loading network map...
    </div>
  ),
});

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

function TransportBadge({ mode }) {
  const config = {
    road: { label: "ROAD", color: "blue", icon: "🛣️" },
    flight: { label: "FLIGHT", color: "cyan", icon: "✈️" },
    rail: { label: "RAIL", color: "orange", icon: "🚂" },
  };
  const c = config[mode] || { label: mode?.toUpperCase() || "—", color: "default", icon: "🚚" };
  return <Tag color={c.color}>{c.icon} {c.label}</Tag>;
}

function statusTag(active) {
  return <Tag color={active ? "green" : "default"}>{active ? "Active" : "Inactive"}</Tag>;
}

const styles = {
  pageWrapper: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    minHeight: "100vh",
    padding: "24px",
  },
  headerCard: {
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    marginBottom: "24px",
  },
  statCard: {
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
    border: "none",
  },
  tableCard: {
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "none",
  },
};

export default function BranchTransferLanesPage() {
  const [form] = Form.useForm();
  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingRoutes, setCreatingRoutes] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState("lanes");
  const [connBranchId, setConnBranchId] = useState(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    from_branch_id: undefined,
    to_branch_id: undefined,
    service_type: undefined,
    is_active: undefined,
  });
  const [checkpoints, setCheckpoints] = useState([]);
  const [modalFromId, setModalFromId] = useState(null);
  const [modalToId, setModalToId] = useState(null);
  const [modalTransportMode, setModalTransportMode] = useState("road");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 });

  const branchesById = useMemo(() => buildBranchMap(branches), [branches]);
  const branchOptions = useMemo(() => branches.map((b) => ({ value: Number(b.id), label: branchLabel(b) })), [branches]);

  const loadBranches = useCallback(async () => {
    try {
      const payload = await getRateBranches({ status: "active", per_page: 500 });
      const collection = extractCollection(payload);
      const normalized = collection.rows.map(normalizeBranch).filter((b) => Number.isFinite(Number(b?.id)));
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
        const normalized = collection.rows.map((r) => normalizeTransferLane(r, branchesById));
        setRows(normalized);
        setSelected((current) => {
          if (!normalized.length) return null;
          return normalized.find((r) => Number(r.id) === Number(current?.id)) || normalized[0];
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
    const withRoutes = rows.filter((r) => r.route_exists).length;
    const distance = rows.reduce((s, r) => s + Number(r.distance_km || 0), 0);
    return { active, inactive: rows.length - active, distance, withRoutes, withoutRoutes: rows.length - withRoutes };
  }, [rows]);

  const connectivity = useMemo(() => {
    if (!connBranchId) return null;
    return deriveBranchConnectivity(connBranchId, rows);
  }, [connBranchId, rows]);

  const connBranch = connBranchId ? branchesById.get(Number(connBranchId)) : null;

  const modalPathNodes = useMemo(() => {
    if (!modalFromId || !modalToId) return [];
    const from = branchesById.get(Number(modalFromId));
    const to = branchesById.get(Number(modalToId));
    if (!from || !to) return [];
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    if (!toNum(from.latitude) || !toNum(from.longitude)) return [];
    if (!toNum(to.latitude) || !toNum(to.longitude)) return [];
    return [
      { id: from.id, name: from.name, code: from.code, latitude: toNum(from.latitude), longitude: toNum(from.longitude), sequence: 0 },
      { id: to.id, name: to.name, code: to.code, latitude: toNum(to.latitude), longitude: toNum(to.longitude), sequence: 1 },
    ];
  }, [modalFromId, modalToId, branchesById]);

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
      from_branch_id: Number(row.from_branch_id),
      to_branch_id: Number(row.to_branch_id),
      service_type: row.service_type || "standard",
      transport_mode: row.transport_mode || "road",
      distance_km: row.distance_km == null ? undefined : Number(row.distance_km),
      estimated_hours: Number(row.estimated_hours || 1),
      priority: Number(row.priority || 100),
      is_active: Boolean(row.is_active),
      variant_name: row.variant_name || "",
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
    if ("from_branch_id" in changed) setModalFromId(changed.from_branch_id ? Number(changed.from_branch_id) : null);
    if ("to_branch_id" in changed) setModalToId(changed.to_branch_id ? Number(changed.to_branch_id) : null);
    if ("transport_mode" in changed) setModalTransportMode(changed.transport_mode || "road");
  };

  const saveLane = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        from_branch_id: Number(values.from_branch_id),
        to_branch_id: Number(values.to_branch_id),
        service_type: values.service_type,
        transport_mode: values.transport_mode || null,
        distance_km: values.distance_km == null ? null : Number(values.distance_km),
        estimated_hours: values.estimated_hours == null ? 1 : Number(values.estimated_hours),
        priority: values.priority == null ? 100 : Number(values.priority),
        is_active: Boolean(values.is_active),
        variant_name: values.variant_name?.trim() || null,
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
      message.success(`✓ Route created for: ${row.from_branch?.name} → ${row.to_branch?.name}`);
      setRows((prevRows) =>
        prevRows.map((r) =>
          r.id === row.id ? { ...r, route_exists: true } : r
        )
      );
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "Could not create route.";
      message.error(`✗ Failed: ${errorMsg}`);
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
      const lanesToProcess = rows.filter((r) => selectedRowKeys.includes(r.id) && !r.route_exists);

      if (lanesToProcess.length === 0) {
        message.info("All selected lanes already have routes.");
        setSelectedRowKeys([]);
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      for (const lane of lanesToProcess) {
        try {
          await createRouteForBranchTransferLane(lane.id);
          successCount++;
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
        message.success(`✓ Routes created for ${successCount} lane(s).`);
      } else if (successCount === 0) {
        message.error(`✗ Failed to create routes.`);
      } else {
        message.warning(`⚠ Created ${successCount} route(s), ${failedCount} failed.`);
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

  const columns = [
    {
      title: "Transfer Lane",
      key: "lane",
      width: 240,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: "13px" }}>{row.from_branch?.name || "Unknown"} → {row.to_branch?.name || "Unknown"}</Text>
          <Text type="secondary" style={{ fontSize: "11px" }}>Priority {row.priority}</Text>
        </Space>
      ),
    },
    {
      title: "Service",
      dataIndex: "service_type",
      width: 100,
      render: (v) => <Tag color="blue">{v || "—"}</Tag>,
    },
    {
      title: "Transport",
      dataIndex: "transport_mode",
      width: 100,
      render: (v) => v ? <TransportBadge mode={v} /> : "—",
    },
    {
      title: "Distance",
      dataIndex: "distance_km",
      width: 100,
      render: (v) => v == null ? "—" : `${Number(v).toFixed(2)} km`,
    },
    {
      title: "ETA",
      dataIndex: "estimated_hours",
      width: 70,
      render: (v) => `${Number(v || 0)} hrs`,
    },
    {
      title: "Route",
      dataIndex: "route_exists",
      width: 110,
      render: (exists) => exists ? (
        <Tag icon={<CheckCircleOutlined />} color="success">Active</Tag>
      ) : (
        <Tag icon={<ExclamationCircleOutlined />} color="warning">Missing</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 80,
      render: statusTag,
    },
    {
      title: "Actions",
      key: "actions",
      width: 280,
      fixed: "right",
      render: (_, row) => (
        <Space wrap size="small">
          <Tooltip title="Edit lane">
            <Button size="small" type="text" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(row); }} />
          </Tooltip>

          {!row.route_exists && (
            <Tooltip title="Create route for this lane">
              <Button
                size="small"
                type="primary"
                icon={<SendOutlined />}
                onClick={(e) => { e.stopPropagation(); createRoute(row); }}
                loading={creatingRoutes.has(row.id)}
              >
                Create
              </Button>
            </Tooltip>
          )}

          <Tooltip title={Number(row.from_branch_id) === Number(row.to_branch_id) ? "Same-branch lane has no reverse" : "Create reverse lane"}>
            <Button
              size="small"
              type="text"
              disabled={Number(row.from_branch_id) === Number(row.to_branch_id)}
              icon={<SwapOutlined />}
              onClick={(e) => { e.stopPropagation(); createReverse(row); }}
            />
          </Tooltip>

          <Button
            size="small"
            type="text"
            onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}
          >
            {row.is_active ? "Disable" : "Enable"}
          </Button>

          <Popconfirm
            title="Delete this transfer lane?"
            description="Routes using this lane may stop working."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => removeLane(row)}
          >
            <Button danger size="small" type="text" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const selectedNodes = selected ? [selected.from_branch, selected.to_branch].filter(Boolean) : [];

  return (
    <div style={styles.pageWrapper}>
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        <Card style={styles.headerCard}>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col flex="auto">
              <Space direction="vertical" size={4}>
                <Title level={2} style={{ margin: 0, color: "#1f2937" }}>🚀 Transfer Lanes Network</Title>
                <Text type="secondary">Manage direct physical connections between branches. Each lane requires a route to be active.</Text>
              </Space>
            </Col>
            <Col>
              <Space wrap>
                <Segmented
                  value={view}
                  onChange={setView}
                  options={[
                    { label: "Lanes", value: "lanes", icon: <SwapOutlined /> },
                    { label: "Connectivity", value: "connectivity", icon: <ApartmentOutlined /> },
                  ]}
                />
                <Button icon={<ReloadOutlined />} onClick={() => loadRows(pagination.current, pagination.pageSize)}>Refresh</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>Add Lane</Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card style={styles.statCard}>
              <Statistic title="Total Lanes" value={rows.length} prefix={<span style={{ color: "#667eea", marginRight: "8px" }}>📍</span>} valueStyle={{ color: "#667eea", fontSize: "24px", fontWeight: "bold" }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={styles.statCard}>
              <Statistic title="Active Lanes" value={stats.active} prefix={<span style={{ color: "#10b981", marginRight: "8px" }}>✓</span>} valueStyle={{ color: "#10b981", fontSize: "24px", fontWeight: "bold" }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={styles.statCard}>
              <Statistic title="With Routes" value={stats.withRoutes} prefix={<span style={{ color: "#8b5cf6", marginRight: "8px" }}>🔗</span>} valueStyle={{ color: "#8b5cf6", fontSize: "24px", fontWeight: "bold" }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={styles.statCard}>
              <Statistic title="Total Distance" value={stats.distance} precision={0} suffix=" km" prefix={<span style={{ color: "#f59e0b", marginRight: "8px" }}>📏</span>} valueStyle={{ color: "#f59e0b", fontSize: "24px", fontWeight: "bold" }} />
            </Card>
          </Col>
        </Row>

        {view === "connectivity" ? (
          <LaneConnectivityPanel branchOptions={branchOptions} connBranchId={connBranchId} setConnBranchId={setConnBranchId} connectivity={connectivity} connBranch={connBranch} onAddLane={(prefill) => openCreate(prefill)} />
        ) : (
          <>
            {rows.length > 0 && stats.withoutRoutes > 0 && (
              <Alert
                message={`⚠️ ${stats.withoutRoutes} lane(s) missing route(s)`}
                description="Transfer lanes need routes to be used for shipment transfers. Create routes to enable their functionality."
                type="warning"
                showIcon
                action={
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      const noRouteIds = rows.filter(r => !r.route_exists).map(r => r.id);
                      setSelectedRowKeys(noRouteIds);
                    }}
                  >
                    Select All
                  </Button>
                }
                style={{ marginBottom: "16px", borderRadius: "8px" }}
              />
            )}

            {selectedRowKeys.length > 0 && (
              <Card style={{ background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)", border: "2px solid #667eea", borderRadius: "12px" }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space direction="vertical" size={0}>
                      <Text style={{ fontWeight: "600", color: "#1f2937" }}>✓ {selectedRowKeys.length} lane(s) selected</Text>
                      <Text type="secondary" style={{ fontSize: "12px" }}>{rows.filter(r => selectedRowKeys.includes(r.id) && !r.route_exists).length} need routes</Text>
                    </Space>
                  </Col>
                  <Col>
                    <Space>
                      <Button onClick={() => setSelectedRowKeys([])}>Clear</Button>
                      <Button type="primary" icon={<SendOutlined />} onClick={bulkCreateRoutes} loading={creatingRoutes.size > 0}>
                        Create Routes
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>
            )}

            <Card style={styles.tableCard}>
              <Row gutter={[12, 12]}>
                <Col xs={24} lg={6}>
                  <Input.Search allowClear placeholder="Search branches..." value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} onSearch={(v) => applyFilter({ search: v })} />
                </Col>
                <Col xs={24} sm={12} lg={4}>
                  <Select allowClear showSearch optionFilterProp="label" placeholder="From branch" style={{ width: "100%" }} options={branchOptions} value={filters.from_branch_id} onChange={(v) => applyFilter({ from_branch_id: v })} />
                </Col>
                <Col xs={24} sm={12} lg={4}>
                  <Select allowClear showSearch optionFilterProp="label" placeholder="To branch" style={{ width: "100%" }} options={branchOptions} value={filters.to_branch_id} onChange={(v) => applyFilter({ to_branch_id: v })} />
                </Col>
                <Col xs={24} sm={12} lg={3}>
                  <Select allowClear placeholder="Service" style={{ width: "100%" }} options={SERVICE_TYPES} value={filters.service_type} onChange={(v) => applyFilter({ service_type: v })} />
                </Col>
                <Col xs={24} sm={12} lg={3}>
                  <Select allowClear placeholder="Status" style={{ width: "100%" }} value={filters.is_active} onChange={(v) => applyFilter({ is_active: v })} options={[{ label: "Active", value: 1 }, { label: "Inactive", value: 0 }]} />
                </Col>
                <Col xs={24} lg={4}>
                  <Button block onClick={resetFilters} style={{ borderRadius: "6px" }}>Reset Filters</Button>
                </Col>
              </Row>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} xl={16}>
                <Card style={styles.tableCard}>
                  <Spin spinning={loading}>
                    <Table
                      rowKey="id"
                      columns={columns}
                      dataSource={rows}
                      scroll={{ x: 1200 }}
                      rowClassName={(row) => Number(row.id) === Number(selected?.id) ? "ant-table-row-selected" : ""}
                      onRow={(row) => ({ onClick: () => setSelected(row), style: { cursor: "pointer" } })}
                      pagination={{ current: pagination.current, pageSize: pagination.pageSize, total: pagination.total, showSizeChanger: true }}
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
                              const noRouteIds = rows.filter((r) => !r.route_exists).map((r) => r.id);
                              setSelectedRowKeys(noRouteIds);
                            },
                          },
                        ],
                      }}
                      locale={{ emptyText: <Empty description="No transfer lanes found" /> }}
                    />
                  </Spin>
                </Card>
              </Col>

              <Col xs={24} xl={8}>
                <Card style={styles.tableCard} title={<Space>🗺️ Lane Details{selected?.transport_mode && <TransportBadge mode={selected.transport_mode} />}</Space>}>
                  {selected ? (
                    <Spin spinning={loading}>
                      <Space direction="vertical" size={16} style={{ width: "100%" }}>
                        {selected.transport_mode === "road" || !selected.transport_mode ? (
                          <CheckpointMapPicker value={selected.checkpoints || []} onChange={() => {}} pathNodes={selectedNodes} height={280} />
                        ) : (
                          <ArcRouteMap fromNode={selected.from_branch} toNode={selected.to_branch} mode={selected.transport_mode} height={280} />
                        )}

                        <Descriptions column={1} size="small" bordered>
                          <Descriptions.Item label="From Branch">{selected?.from_branch?.name || "—"}</Descriptions.Item>
                          <Descriptions.Item label="To Branch">{selected?.to_branch?.name || "—"}</Descriptions.Item>
                          <Descriptions.Item label="Service Type"><Tag color="blue">{selected?.service_type || "—"}</Tag></Descriptions.Item>
                          <Descriptions.Item label="Transport">{selected?.transport_mode ? <TransportBadge mode={selected.transport_mode} /> : "—"}</Descriptions.Item>
                          <Descriptions.Item label="Distance">{selected ? (selected.distance_km == null ? "—" : `${Number(selected.distance_km).toFixed(2)} km`) : "—"}</Descriptions.Item>
                          <Descriptions.Item label="ETA">{selected ? `${Number(selected.estimated_hours || 0)} hours` : "—"}</Descriptions.Item>
                          <Descriptions.Item label="Priority">{selected?.priority || "—"}</Descriptions.Item>
                          <Descriptions.Item label="Checkpoints">{selected?.checkpoints?.length ? `${selected.checkpoints.length}` : "—"}</Descriptions.Item>
                          <Descriptions.Item label="Route Status">
                            {selected ? (
                              selected.route_exists ? (
                                <Space>
                                  <Tag color="success" icon={<CheckCircleOutlined />}>Active</Tag>
                                </Space>
                              ) : (
                                <Space direction="vertical">
                                  <Tag color="warning" icon={<ExclamationCircleOutlined />}>No Route</Tag>
                                  <Button block size="small" type="primary" icon={<SendOutlined />} onClick={() => createRoute(selected)} loading={creatingRoutes.has(selected.id)}>
                                    Create Route
                                  </Button>
                                </Space>
                              )
                            ) : (
                              "—"
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="Status">{selected ? statusTag(selected.is_active) : "—"}</Descriptions.Item>
                        </Descriptions>
                      </Space>
                    </Spin>
                  ) : (
                    <Empty description="Select a lane to see details" style={{ marginTop: "40px" }} />
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}

        <Modal open={modalOpen} title={editing ? "✏️ Edit Transfer Lane" : "➕ Create Transfer Lane"} width={860} confirmLoading={saving} okText={editing ? "Update Lane" : "Create Lane"} onOk={saveLane} onCancel={closeModal} destroyOnClose styles={{ body: { maxHeight: "82vh", overflowY: "auto", paddingRight: 6 } }}>
          <Form form={form} layout="vertical" onValuesChange={onFormValuesChange} initialValues={{ service_type: "standard", transport_mode: "road", estimated_hours: 1, priority: 100, is_active: true }}>
            <div style={{ border: "2px solid #667eea", borderRadius: 12, padding: 12, background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)", marginBottom: 20 }}>
              <Space style={{ marginBottom: 8 }}>
                <Text strong>Route Preview</Text>
                {modalTransportMode && <TransportBadge mode={modalTransportMode} />}
                {modalPathNodes.length >= 2 && <Text type="secondary" style={{ fontSize: 12 }}>{modalPathNodes[0]?.name} → {modalPathNodes[modalPathNodes.length - 1]?.name}</Text>}
              </Space>

              {modalPathNodes.length >= 2 ? (
                modalTransportMode === "road" ? (
                  <CheckpointMapPicker value={checkpoints} onChange={setCheckpoints} pathNodes={modalPathNodes} height={300} />
                ) : (
                  <ArcRouteMap fromNode={modalPathNodes[0]} toNode={modalPathNodes[modalPathNodes.length - 1]} mode={modalTransportMode} height={300} />
                )
              ) : (
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", borderRadius: 8, color: "#bbb", fontSize: 14 }}>
                  Select From and To branches below to preview the route
                </div>
              )}
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="from_branch_id" label="From Branch" rules={[{ required: true, message: "Please select from branch." }]}>
                  <Select showSearch optionFilterProp="label" placeholder="Select branch" options={branchOptions} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="to_branch_id" label="To Branch" rules={[{ required: true, message: "Please select to branch." }]}>
                  <Select showSearch optionFilterProp="label" placeholder="Select branch" options={branchOptions} />
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
                <Form.Item name="variant_name" label="Variant Name" tooltip="e.g., 'Via Khaireni', 'Via Gorkha', 'Direct'">
                  <Input placeholder="Enter variant name (optional)" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </Space>
    </div>
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
  const inbound = connectivity?.inbound || [];

  return (
    <Card>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Select showSearch allowClear style={{ width: "100%" }} placeholder="Select a branch to see its connections" optionFilterProp="label" options={branchOptions} value={connBranchId} onChange={setConnBranchId} />
          </Col>
          <Col xs={24} md={14}>
            {connBranch ? (
              <Space wrap>
                <Text type="secondary">
                  <ApartmentOutlined /> <Text strong>{connBranch.name}</Text> connects to {outbound.length} outbound and {inbound.length} inbound branch{outbound.length + inbound.length === 1 ? "" : "es"}.
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
          <Card size="small" title={<Space><ApartmentOutlined />Network Map — {connBranch?.name}</Space>}>
            {outbound.length > 0 && (
              <div>
                <Text strong style={{ color: "#1890ff" }}>Outbound Lanes:</Text>
                <List size="small" dataSource={outbound} renderItem={(lane) => laneRow(lane, "out")} />
              </div>
            )}

            {inbound.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <Text strong style={{ color: "#13c2c2" }}>Inbound Lanes:</Text>
                <List size="small" dataSource={inbound} renderItem={(lane) => laneRow(lane, "in")} />
              </div>
            )}

            {outbound.length === 0 && inbound.length === 0 && (
              <Empty description="No lanes connected to this branch" />
            )}
          </Card>
        )}
      </Space>
    </Card>
  );
}
