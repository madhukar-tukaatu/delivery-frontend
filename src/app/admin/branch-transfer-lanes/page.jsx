"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
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
  Alert,
  Spin,
  List,
  Pagination,
} from "antd";
import {
  ApartmentOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  LinkOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import dynamic from "next/dynamic";
import PermissionGate from "@/components/rate-admin/PermissionGate";
import RouteMap from "@/components/rate-admin/RouteMap";
import { deriveBranchConnectivity } from "@/services/adminRateManagementService";
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
  const c = config[mode] || {
    label: mode?.toUpperCase() || "—",
    color: "default",
    icon: "🚚",
  };
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
    route_status: undefined,
  });
  const [checkpoints, setCheckpoints] = useState([]);
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
    () => branches.map((b) => ({ value: Number(b.id), label: branchLabel(b) })),
    [branches],
  );

  const loadBranches = useCallback(async () => {
    try {
      const payload = await getRateBranches({
        status: "active",
        per_page: 500,
      });
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
    async (
      page = 1,
      pageSize = pagination.pageSize,
      overrideFilters = null,
    ) => {
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
          route_status: active.route_status || undefined,
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

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);
  useEffect(() => {
    if (branches.length > 0) loadRows(1, pagination.pageSize);
  }, [branches.length]);

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
    const cleared = {
      search: "",
      from_branch_id: undefined,
      to_branch_id: undefined,
      service_type: undefined,
      is_active: undefined,
      route_status: undefined,
    };
    setFilters(cleared);
    loadRows(1, pagination.pageSize, cleared);
  }, [loadRows, pagination.pageSize]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.is_active).length;
    const withRoutes = rows.filter((r) => r.route_exists).length;
    const distance = rows.reduce((s, r) => s + Number(r.distance_km || 0), 0);
    return {
      active,
      inactive: rows.length - active,
      distance,
      withRoutes,
      withoutRoutes: rows.length - withRoutes,
    };
  }, [rows]);

  const connectivity = useMemo(() => {
    if (!connBranchId) return null;
    return deriveBranchConnectivity(connBranchId, rows);
  }, [connBranchId, rows]);

  const connBranch = connBranchId
    ? branchesById.get(Number(connBranchId))
    : null;

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
      {
        id: from.id,
        name: from.name,
        code: from.code,
        latitude: toNum(from.latitude),
        longitude: toNum(from.longitude),
        sequence: 0,
      },
      {
        id: to.id,
        name: to.name,
        code: to.code,
        latitude: toNum(to.latitude),
        longitude: toNum(to.longitude),
        sequence: 1,
      },
    ];
  }, [modalFromId, modalToId, branchesById]);

  const openCreate = (prefill = {}) => {
    setEditing(null);
    setCheckpoints([]);
    setModalFromId(
      prefill.from_branch_id ? Number(prefill.from_branch_id) : null,
    );
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
      distance_km:
        row.distance_km == null ? undefined : Number(row.distance_km),
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
    if ("from_branch_id" in changed)
      setModalFromId(
        changed.from_branch_id ? Number(changed.from_branch_id) : null,
      );
    if ("to_branch_id" in changed)
      setModalToId(changed.to_branch_id ? Number(changed.to_branch_id) : null);
    if ("transport_mode" in changed)
      setModalTransportMode(changed.transport_mode || "road");
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
          values.distance_km == null ? null : Number(values.distance_km),
        estimated_hours:
          values.estimated_hours == null ? 1 : Number(values.estimated_hours),
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
      message.success(
        `Transfer lane ${row.is_active ? "disabled" : "enabled"}.`,
      );
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
      message.success(
        `✓ Route created for: ${row.from_branch?.name} → ${row.to_branch?.name}`,
      );
      setRows((prevRows) =>
        prevRows.map((r) =>
          r.id === row.id ? { ...r, route_exists: true } : r,
        ),
      );
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message || "Could not create route.";
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
      const lanesToProcess = rows.filter(
        (r) => selectedRowKeys.includes(r.id) && !r.route_exists,
      );

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
              r.id === lane.id ? { ...r, route_exists: true } : r,
            ),
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
        message.warning(
          `⚠ Created ${successCount} route(s), ${failedCount} failed.`,
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

  const columns = [
    {
      title: "Transfer Lane",
      key: "lane",
      width: 240,
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: "13px" }}>
            {row.from_branch?.name || "Unknown"} →{" "}
            {row.to_branch?.name || "Unknown"}
          </Text>
          <Text type="secondary" style={{ fontSize: "11px" }}>
            Priority {row.priority}
          </Text>
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
      render: (v) => (v ? <TransportBadge mode={v} /> : "—"),
    },
    {
      title: "Distance",
      dataIndex: "distance_km",
      width: 100,
      render: (v) => (v == null ? "—" : `${Number(v).toFixed(2)} km`),
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
      render: (exists) =>
        exists ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Active
          </Tag>
        ) : (
          <Tag icon={<ExclamationCircleOutlined />} color="warning">
            Missing
          </Tag>
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
      width: 320,
      fixed: "right",
      render: (_, row) => (
        <Space wrap size={4} style={{ width: "100%" }}>
          <Tooltip title="Edit">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row);
              }}
            />
          </Tooltip>

          {!row.route_exists && (
            <Tooltip title="Create route">
              <Button
                size="small"
                type="primary"
                icon={<SendOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  createRoute(row);
                }}
                loading={creatingRoutes.has(row.id)}
              />
            </Tooltip>
          )}

          <Tooltip title="Reverse">
            <Button
              size="small"
              type="text"
              disabled={Number(row.from_branch_id) === Number(row.to_branch_id)}
              icon={<SwapOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                createReverse(row);
              }}
            />
          </Tooltip>

          <Tooltip title={row.is_active ? "Disable" : "Enable"}>
            <Button
              size="small"
              type="text"
              onClick={(e) => {
                e.stopPropagation();
                toggleStatus(row);
              }}
            >
              {row.is_active ? "✓" : "○"}
            </Button>
          </Tooltip>

          <Popconfirm
            title="Delete?"
            description="Routes using this lane may stop working."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => removeLane(row)}
          >
            <Button
              danger
              size="small"
              type="text"
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const selectedNodes = selected
    ? [selected.from_branch, selected.to_branch].filter(Boolean)
    : [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f5f7fa",
      }}
    >
      {/* Header Section - Compact */}
      <div
        style={{
          background: "white",
          padding: "12px 16px",
          borderBottom: "1px solid #e8e8e8",
        }}
      >
        <Row
          justify="space-between"
          align="middle"
          gutter={[12, 12]}
          style={{ marginBottom: "12px" }}
        >
          <Col flex="auto">
            <Title
              level={3}
              style={{ margin: 0, color: "#1f2937", fontSize: "18px" }}
            >
              Transfer Lanes
            </Title>
          </Col>
          <Col>
            <Space wrap size="small">
              <Segmented
                value={view}
                onChange={setView}
                size="small"
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
                size="small"
                icon={<ReloadOutlined />}
                onClick={() =>
                  loadRows(pagination.current, pagination.pageSize)
                }
              >
                Refresh
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCreate()}
              >
                Add
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Compact Stat Cards */}
        <Row gutter={[8, 8]}>
          <Col xs={12} sm={6} lg={6}>
            <Card
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: "6px",
                height: "60px",
              }}
              bodyStyle={{ padding: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}
                  >
                    Total
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "white",
                    }}
                  >
                    {rows.length}
                  </div>
                </div>
                <TeamOutlined
                  style={{ color: "white", fontSize: "24px", opacity: 0.6 }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={6}>
            <Card
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "none",
                borderRadius: "6px",
                height: "60px",
              }}
              bodyStyle={{ padding: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}
                  >
                    Active
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "white",
                    }}
                  >
                    {stats.active}
                  </div>
                </div>
                <CheckCircleOutlined
                  style={{ color: "white", fontSize: "24px", opacity: 0.6 }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={6}>
            <Card
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                border: "none",
                borderRadius: "6px",
                height: "60px",
              }}
              bodyStyle={{ padding: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}
                  >
                    Routes
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "white",
                    }}
                  >
                    {stats.withRoutes}
                  </div>
                </div>
                <LinkOutlined
                  style={{ color: "white", fontSize: "24px", opacity: 0.6 }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={6}>
            <Card
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                border: "none",
                borderRadius: "6px",
                height: "60px",
              }}
              bodyStyle={{ padding: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}
                  >
                    Distance
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "white",
                    }}
                  >
                    {Number(stats.distance).toFixed(0)}
                  </div>
                </div>
                <RiseOutlined
                  style={{ color: "white", fontSize: "24px", opacity: 0.6 }}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {view === "connectivity" ? (
        <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
          <LaneConnectivityPanel
            branchOptions={branchOptions}
            connBranchId={connBranchId}
            setConnBranchId={setConnBranchId}
            connectivity={connectivity}
            connBranch={connBranch}
            onAddLane={(prefill) => openCreate(prefill)}
          />
        </div>
      ) : (
        <>
          {/* Compact Bulk Actions Bar */}
          {selectedRowKeys.length > 0 && (
            <div
              style={{
                padding: "6px 12px",
                background: "#e3f2fd",
                borderBottom: "1px solid #bbdefb",
              }}
            >
              <Row justify="space-between" align="middle">
                <Col>
                  <Text style={{ fontSize: "12px" }}>
                    ✓ {selectedRowKeys.length} selected ·{" "}
                    {
                      rows.filter(
                        (r) =>
                          selectedRowKeys.includes(r.id) && !r.route_exists,
                      ).length
                    }{" "}
                    need routes
                  </Text>
                </Col>
                <Col>
                  <Space size="small">
                    <Button size="small" onClick={() => setSelectedRowKeys([])}>
                      Clear
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={bulkCreateRoutes}
                      loading={creatingRoutes.size > 0}
                    >
                      Create
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>
          )}

          {/* Compact Filters */}
          <div
            style={{
              padding: "8px 12px",
              background: "white",
              borderBottom: "1px solid #e8e8e8",
            }}
          >
            <Row gutter={[6, 6]}>
              <Col xs={24} lg={8}>
                <Input.Search
                  allowClear
                  size="small"
                  placeholder="Search lanes..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((c) => ({ ...c, search: e.target.value }))
                  }
                  onSearch={(v) => applyFilter({ search: v })}
                />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="From"
                  size="small"
                  style={{ width: "100%" }}
                  options={branchOptions}
                  value={filters.from_branch_id}
                  onChange={(v) => applyFilter({ from_branch_id: v })}
                />
              </Col>
              <Col xs={24} sm={12} lg={4}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="To"
                  size="small"
                  style={{ width: "100%" }}
                  options={branchOptions}
                  value={filters.to_branch_id}
                  onChange={(v) => applyFilter({ to_branch_id: v })}
                />
              </Col>
              <Col xs={24} sm={12} lg={3}>
                <Select
                  allowClear
                  placeholder="Service"
                  size="small"
                  style={{ width: "100%" }}
                  options={SERVICE_TYPES}
                  value={filters.service_type}
                  onChange={(v) => applyFilter({ service_type: v })}
                />
              </Col>
              <Col xs={24} sm={12} lg={3}>
                <Select
                  allowClear
                  placeholder="Status"
                  size="small"
                  style={{ width: "100%" }}
                  value={filters.is_active}
                  onChange={(v) => applyFilter({ is_active: v })}
                  options={[
                    { label: "Active", value: 1 },
                    { label: "Inactive", value: 0 },
                  ]}
                />
              </Col>
              <Col xs={24} sm={12} lg={3}>
                <Select
                  allowClear
                  placeholder="Route"
                  size="small"
                  style={{ width: "100%" }}
                  value={filters.route_status}
                  onChange={(v) => applyFilter({ route_status: v })}
                  options={[
                    { label: "Has route", value: "active" },
                    { label: "Missing route", value: "missing" },
                  ]}
                />
              </Col>
              <Col xs={24} lg={2}>
                <Button block size="small" onClick={resetFilters}>
                  Reset
                </Button>
              </Col>
            </Row>
          </div>

          {/* Main Content - Scrollable Table + Fixed Map - RESPONSIVE */}
          <div
            className="lane-main-content"
            style={{
              flex: 1,
              display: "flex",
              padding: "8px",
              gap: "12px",
              overflow: "visible",
              flexDirection: "row-reverse",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            {/* Detail Panel RIGHT - 35% desktop, full width mobile */}
            <div
              className="lane-detail-panel"
              style={{
                flex: "1 1 320px",
                minWidth: "300px",
                maxWidth: "420px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                overflow: "visible",
              }}
            >
              <Card
                style={{
                  borderRadius: "12px",
                  height: "300px",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.1)",
                  border: "none",
                  padding: 0,
                }}
                bodyStyle={{ padding: "0", height: "100%", width: "100%" }}
                title={
                  <Text
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#0F172A",
                    }}
                  >
                    🗺️ Route Map
                  </Text>
                }
              >
                {selected ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      position: "relative",
                      background: "#f5f5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected.transport_mode === "road" ||
                    !selected.transport_mode ? (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          position: "relative",
                        }}
                      >
                        <CheckpointMapPicker
                          value={selected.checkpoints || []}
                          onChange={() => {}}
                          pathNodes={selectedNodes}
                          height={280}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          position: "relative",
                        }}
                      >
                        <ArcRouteMap
                          fromNode={selected.from_branch}
                          toNode={selected.to_branch}
                          mode={selected.transport_mode}
                          height={280}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f5f5f5",
                      color: "#94A3B8",
                      fontSize: "12px",
                    }}
                  >
                    Select a lane to view map
                  </div>
                )}
              </Card>

              <Card
                style={{
                  borderRadius: "12px",
                  flex: 1,
                  overflow: "auto",
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.1)",
                  border: "none",
                  padding: 0,
                }}
                bodyStyle={{ padding: "12px" }}
                title={
                  <Text
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#0F172A",
                    }}
                  >
                    📋 Details
                  </Text>
                }
              >
                {selected ? (
                  <Descriptions
                    column={1}
                    size="small"
                    layout="vertical"
                    style={{ fontSize: "11px" }}
                  >
                    <Descriptions.Item
                      label={
                        <Text
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "#64748B",
                          }}
                        >
                          From
                        </Text>
                      }
                    >
                      <Text
                        style={{
                          fontSize: "12px",
                          fontWeight: "500",
                          color: "#0F172A",
                        }}
                      >
                        {selected?.from_branch?.name || "—"}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <Text
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "#64748B",
                          }}
                        >
                          To
                        </Text>
                      }
                    >
                      <Text
                        style={{
                          fontSize: "12px",
                          fontWeight: "500",
                          color: "#0F172A",
                        }}
                      >
                        {selected?.to_branch?.name || "—"}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <Text
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "#64748B",
                          }}
                        >
                          Service
                        </Text>
                      }
                    >
                      <Tag style={{ fontSize: "10px" }} color="blue">
                        {selected?.service_type || "—"}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <Text
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "#64748B",
                          }}
                        >
                          Distance
                        </Text>
                      }
                    >
                      <Text
                        style={{
                          fontSize: "12px",
                          fontWeight: "500",
                          color: "#0F172A",
                        }}
                      >
                        {selected
                          ? selected.distance_km == null
                            ? "—"
                            : `${Number(selected.distance_km).toFixed(1)} km`
                          : "—"}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <Text
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "#64748B",
                          }}
                        >
                          ETA
                        </Text>
                      }
                    >
                      <Text
                        style={{
                          fontSize: "12px",
                          fontWeight: "500",
                          color: "#0F172A",
                        }}
                      >
                        {selected
                          ? `${Number(selected.estimated_hours || 0)} hrs`
                          : "—"}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <Text
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "#64748B",
                          }}
                        >
                          Priority
                        </Text>
                      }
                    >
                      <Text
                        style={{
                          fontSize: "12px",
                          fontWeight: "500",
                          color: "#0F172A",
                        }}
                      >
                        {selected?.priority || "—"}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <Text
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "#64748B",
                          }}
                        >
                          Route Status
                        </Text>
                      }
                    >
                      {selected ? (
                        selected.route_exists ? (
                          <Tag
                            style={{ fontSize: "10px" }}
                            color="success"
                            icon={<CheckCircleOutlined />}
                          >
                            Active Route
                          </Tag>
                        ) : (
                          <Space
                            direction="vertical"
                            size={4}
                            style={{ width: "100%" }}
                          >
                            <Tag
                              style={{ fontSize: "10px" }}
                              color="warning"
                              icon={<ExclamationCircleOutlined />}
                            >
                              No Route
                            </Tag>
                            <Button
                              block
                              size="small"
                              type="primary"
                              onClick={() => createRoute(selected)}
                              loading={creatingRoutes.has(selected.id)}
                              disabled={creatingRoutes.has(selected.id)}
                              style={{
                                fontSize: "10px",
                                height: "24px",
                                lineHeight: "24px",
                              }}
                            >
                              Create Route
                            </Button>
                          </Space>
                        )
                      ) : (
                        "—"
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <Text
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: "#64748B",
                          }}
                        >
                          Status
                        </Text>
                      }
                    >
                      {selected ? statusTag(selected.is_active) : "—"}
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Empty
                    description="Select a lane"
                    style={{ paddingTop: "24px", fontSize: "11px" }}
                  />
                )}
              </Card>
            </div>

            {/* Scrollable Table LEFT - 65% */}
            <div
              className="lane-table-panel"
              style={{
                flex: "2 1 480px",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                background: "white",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  width: "100%",
                }}
              >
                <Spin spinning={loading}>
                  <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={rows}
                    scroll={{ x: 1120, y: "calc(100vh - 340px)" }}
                    rowClassName={(row) =>
                      Number(row.id) === Number(selected?.id)
                        ? "ant-table-row-selected"
                        : ""
                    }
                    onRow={(row) => ({
                      onClick: () => setSelected(row),
                      style: { cursor: "pointer" },
                    })}
                    pagination={false}
                    locale={{ emptyText: <Empty description="No lanes" /> }}
                    size="small"
                    className="compact"
                  />
                </Spin>
              </div>

              {/* Pagination Bar at Bottom */}
              <div
                style={{
                  borderTop: "1px solid #e8e8e8",
                  padding: "6px 8px",
                  background: "#fafafa",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: "11px", color: "#666" }}>
                  {pagination.total > 0
                    ? `${(pagination.current - 1) * pagination.pageSize + 1}-${Math.min(pagination.current * pagination.pageSize, pagination.total)} of ${pagination.total}`
                    : "No data"}
                </Text>
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  onChange={(page) => loadRows(page, pagination.pageSize)}
                  onShowSizeChange={(_, size) => loadRows(1, size)}
                  pageSizeOptions={["10", "25", "50"]}
                  showSizeChanger
                  showQuickJumper
                  size="small"
                  style={{ margin: 0 }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={editing ? "Edit Lane" : "Create Lane"}
        width={780}
        confirmLoading={saving}
        okText={editing ? "Update" : "Create"}
        onOk={saveLane}
        onCancel={closeModal}
        destroyOnClose
        size="small"
        styles={{ body: { maxHeight: "80vh", overflowY: "auto" } }}
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
          size="small"
        >
          <div
            style={{
              border: "1px solid #e8e8e8",
              borderRadius: 6,
              padding: 10,
              background: "#f9fafb",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: "12px", fontWeight: "600" }}>
              Route Preview
            </Text>
            {modalPathNodes.length >= 2 ? (
              modalTransportMode === "road" ? (
                <CheckpointMapPicker
                  value={checkpoints}
                  onChange={setCheckpoints}
                  pathNodes={modalPathNodes}
                  height={240}
                />
              ) : (
                <ArcRouteMap
                  fromNode={modalPathNodes[0]}
                  toNode={modalPathNodes[modalPathNodes.length - 1]}
                  mode={modalTransportMode}
                  height={240}
                />
              )
            ) : (
              <div
                style={{
                  height: 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f5f5f5",
                  borderRadius: 6,
                  color: "#999",
                  fontSize: "12px",
                }}
              >
                Select branches to preview
              </div>
            )}
          </div>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="from_branch_id"
                label="From"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                  size="small"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="to_branch_id"
                label="To"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={branchOptions}
                  size="small"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={6}>
              <Form.Item
                name="service_type"
                label="Service"
                rules={[{ required: true }]}
              >
                <Select options={SERVICE_TYPES} size="small" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="transport_mode" label="Transport">
                <Select allowClear options={TRANSPORT_MODES} size="small" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="distance_km" label="Distance">
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: "100%" }}
                  size="small"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="estimated_hours"
                label="Hours"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} style={{ width: "100%" }} size="small" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} style={{ width: "100%" }} size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="Active"
                valuePropName="checked"
              >
                <Switch size="small" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

function LaneConnectivityPanel({
  branchOptions,
  connBranchId,
  setConnBranchId,
  connectivity,
  connBranch,
  onAddLane,
}) {
  const outbound = connectivity?.outbound || [];
  const inbound = connectivity?.inbound || [];

  return (
    <Card>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Select
          showSearch
          allowClear
          style={{ width: "100%" }}
          placeholder="Select branch"
          optionFilterProp="label"
          options={branchOptions}
          value={connBranchId}
          onChange={setConnBranchId}
        />

        {!connBranchId ? (
          <Empty description="Select a branch" />
        ) : (
          <Card size="small" title={`${connBranch?.name} Network`}>
            {outbound.length > 0 && (
              <div>
                <Text strong>Outbound:</Text>
                <List
                  size="small"
                  dataSource={outbound}
                  renderItem={(lane) => (
                    <List.Item>
                      <Space size={6}>
                        <Tag color="blue">{lane.to_branch?.name}</Tag>
                        <Text>
                          {Number(lane.distance_km || 0).toFixed(1)} km
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}

            {inbound.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <Text strong>Inbound:</Text>
                <List
                  size="small"
                  dataSource={inbound}
                  renderItem={(lane) => (
                    <List.Item>
                      <Space size={6}>
                        <Tag color="cyan">{lane.from_branch?.name}</Tag>
                        <Text>
                          {Number(lane.distance_km || 0).toFixed(1)} km
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Card>
        )}
      </Space>
    </Card>
  );
}
