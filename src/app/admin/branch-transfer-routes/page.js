"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
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
  EnvironmentOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  ReloadOutlined,
  StarFilled,
  TagsOutlined,
} from "@ant-design/icons";

import {
  createBranchTransferRoute,
  deleteBranchTransferRoute,
  deriveBranchConnectivity,
  getBranchTransferLanes,
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
  normalizeTransferLane,
  normalizeTransferRoute,
} from "@/lib/rate-management-page-utils";

import OrderedLaneBuilder from "@/components/rate-admin/OrderedLaneBuilder";

const CheckpointMapPicker = dynamic(
  () => import("@/components/rate-admin/CheckpointMapPicker"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 360,
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

const { Title, Text } = Typography;
const { TextArea } = Input;

const SERVICE_TYPES = [
  { label: "Standard", value: "standard" },
  { label: "Express", value: "express" },
  { label: "Same Day", value: "same_day" },
  { label: "Flight", value: "flight" },
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
    <Tag color={active ? "green" : "default"}>{active ? "Active" : "Inactive"}</Tag>
  );
}

// Build a short code segment from a branch (e.g. "TUK-KTM-MAIN" -> "KTM").
function codeSegment(branch) {
  if (!branch) return "UNK";
  const code = String(branch.code || "").trim();
  if (code.includes("-")) {
    const parts = code.split("-").filter(Boolean);
    const meaningful = parts.filter(
      (p) => p.toUpperCase() !== "TUK" && p.toUpperCase() !== "MAIN",
    );
    if (meaningful.length) return meaningful.join("").toUpperCase();
    if (parts.length >= 2) return parts[1].toUpperCase();
  }
  return (
    String(branch.name || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 3)
      .toUpperCase() || "UNK"
  );
}

// Route code from ordered branch path + service, e.g. KTM-BHA-BTW-STANDARD.
function buildRouteCode(pathBranches, serviceType) {
  if (!pathBranches || pathBranches.length < 2 || !serviceType) return "";
  const segments = [
    ...pathBranches.map(codeSegment),
    String(serviceType).toUpperCase(),
  ];
  return segments.join("-");
}

// Route name: "Origin to Destination" or "... via Transit1, Transit2".
function buildRouteName(pathBranches) {
  if (!pathBranches || pathBranches.length < 2) return "";
  const origin = pathBranches[0]?.name;
  const destination = pathBranches[pathBranches.length - 1]?.name;
  const transits = pathBranches.slice(1, -1).map((b) => b?.name).filter(Boolean);
  const base = `${origin} to ${destination}`;
  return transits.length ? `${base} via ${transits.join(", ")}` : base;
}

export default function BranchTransferRoutesPage() {
  const [form] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [lanes, setLanes] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Live builder state inside the modal.
  const [laneIds, setLaneIds] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [modalServiceType, setModalServiceType] = useState("standard");
  const [fromBranchId, setFromBranchId] = useState(undefined);
  const [toBranchId, setToBranchId] = useState(undefined);
  // Track whether the user manually overrode the auto-generated code/name.
  const [manualCode, setManualCode] = useState(false);
  const [manualName, setManualName] = useState(false);

  const [view, setView] = useState("routes"); // routes | connectivity
  const [connBranchId, setConnBranchId] = useState(undefined);

  const [filters, setFilters] = useState({
    search: "",
    service_type: undefined,
    has_transit: undefined,
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

  const normalizedLanes = useMemo(
    () => lanes.map((lane) => normalizeTransferLane(lane, branchesById)),
    [lanes, branchesById],
  );

  const loadBranches = useCallback(async () => {
    try {
      const payload = await getRateBranches({ status: "active", per_page: 500 });
      const collection = extractCollection(payload);
      setBranches(collection.rows.map(normalizeBranch));
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not load branches."));
    }
  }, []);

  const loadLanes = useCallback(async () => {
    try {
      const payload = await getBranchTransferLanes({ per_page: 500 });
      const collection = extractCollection(payload);
      setLanes(collection.rows);
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not load transfer lanes."));
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
          service_type: filters.service_type || undefined,
          has_transit: filters.has_transit,
          is_active: filters.is_active,
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
    loadLanes();
  }, [loadBranches, loadLanes]);

  useEffect(() => {
    if (branches.length) {
      loadRows(1, pagination.pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active).length;
    const withTransit = rows.filter(
      (row) => Number(row.transit_count) > 0,
    ).length;
    return {
      total: rows.length,
      active,
      inactive: rows.length - active,
      withTransit,
    };
  }, [rows]);

  // Group routes by origin -> destination so alternatives show together.
  const groupedRoutes = useMemo(() => {
    const groups = new Map();
    for (const row of rows) {
      const originName = row.origin_branch?.name || "Origin";
      const destName = row.destination_branch?.name || "Destination";
      const key = `${row.origin_branch_id}-${row.destination_branch_id}-${row.service_type}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: `${originName} → ${destName}`,
          service: row.service_type,
          routes: [],
        });
      }
      groups.get(key).routes.push(row);
    }
    return Array.from(groups.values()).map((group) => ({
      ...group,
      routes: group.routes.sort(
        (a, b) =>
          Number(b.is_default) - Number(a.is_default) ||
          Number(a.priority) - Number(b.priority),
      ),
    }));
  }, [rows]);

  // ------- Modal helpers -------

  const resetModalState = () => {
    setModalOpen(false);
    setEditing(null);
    setLaneIds([]);
    setCheckpoints([]);
    setModalServiceType("standard");
    setFromBranchId(undefined);
    setToBranchId(undefined);
    setManualCode(false);
    setManualName(false);
    form.resetFields();
  };

  const openCreate = () => {
    setEditing(null);
    setLaneIds([]);
    setCheckpoints([]);
    setModalServiceType("standard");
    setFromBranchId(undefined);
    setToBranchId(undefined);
    setManualCode(false);
    setManualName(false);
    form.setFieldsValue({
      route_code: "",
      name: "",
      service_type: "standard",
      priority: 100,
      base_rate: 0,
      is_default: false,
      is_active: true,
      notes: "",
    });
    setModalOpen(true);
  };

  // Rebuild the ordered lane_ids for an existing route from its lane mappings.
  const laneIdsFromRoute = (row) => {
    const mappings =
      row.lanes ??
      row.route_lanes ??
      row.routeLanes ??
      row.branch_transfer_route_lanes ??
      [];
    if (Array.isArray(mappings) && mappings.length) {
      return [...mappings]
        .sort(
          (a, b) =>
            Number(a.sequence ?? a.sequence_number ?? 0) -
            Number(b.sequence ?? b.sequence_number ?? 0),
        )
        .map((m) =>
          Number(
            m.branch_transfer_lane_id ??
              m.lane?.id ??
              m.branch_transfer_lane?.id ??
              m.transfer_lane?.id,
          ),
        )
        .filter(Number.isFinite);
    }
    // Legacy fallback: single anchor lane.
    if (row.branch_transfer_lane_id) {
      return [Number(row.branch_transfer_lane_id)];
    }
    return [];
  };

  const openEdit = (row) => {
    setEditing(row);
    setModalServiceType(row.service_type || "standard");
    const ids = laneIdsFromRoute(row);
    setLaneIds(ids);
    setCheckpoints(Array.isArray(row.checkpoints) ? row.checkpoints : []);
    // Keep the existing code/name; treat as manual so they aren't overwritten.
    setManualCode(Boolean(row.route_code));
    setManualName(Boolean(row.name));
    // Derive From/To from the route endpoints (or its lane chain).
    setFromBranchId(
      row.origin_branch_id ??
        (ids.length
          ? normalizedLanes.find((l) => Number(l.id) === ids[0])?.from_branch_id
          : undefined),
    );
    setToBranchId(
      row.destination_branch_id ??
        (ids.length
          ? normalizedLanes.find((l) => Number(l.id) === ids[ids.length - 1])
              ?.to_branch_id
          : undefined),
    );
    form.setFieldsValue({
      route_code: row.route_code || "",
      name: row.name || "",
      service_type: row.service_type || "standard",
      priority: Number(row.priority || 100),
      base_rate: Number(row.base_rate || 0),
      is_default: Boolean(row.is_default),
      is_active: Boolean(row.is_active),
      notes: row.notes || "",
    });
    setModalOpen(true);
  };

  // Ordered branch path nodes (with coords) derived from the selected lanes,
  // used for the modal map preview.
  const modalPathNodes = useMemo(() => {
    const selectedLanes = laneIds
      .map((id) => normalizedLanes.find((l) => Number(l.id) === Number(id)))
      .filter(Boolean);
    if (!selectedLanes.length) return [];
    const nodes = [selectedLanes[0].from_branch];
    for (const lane of selectedLanes) {
      nodes.push(lane.to_branch);
    }
    return nodes.filter(
      (b) =>
        b &&
        Number.isFinite(Number(b.latitude)) &&
        Number.isFinite(Number(b.longitude)),
    );
  }, [laneIds, normalizedLanes]);

  // Full ordered branch objects (origin + transits + destination) from the chain,
  // used to auto-generate the route code and name.
  const pathBranchesForCode = useMemo(() => {
    const selectedLanes = laneIds
      .map((id) => normalizedLanes.find((l) => Number(l.id) === Number(id)))
      .filter(Boolean);
    if (!selectedLanes.length) return [];
    const nodes = [selectedLanes[0].from_branch];
    for (const lane of selectedLanes) nodes.push(lane.to_branch);
    return nodes.filter(Boolean);
  }, [laneIds, normalizedLanes]);

  // Live auto-generation of code/name unless the user has manually edited them.
  useEffect(() => {
    if (!modalOpen) return;
    if (manualCode && manualName) return;
    if (pathBranchesForCode.length < 2) return;

    const patch = {};
    if (!manualCode) {
      patch.route_code = buildRouteCode(pathBranchesForCode, modalServiceType);
    }
    if (!manualName) {
      patch.name = buildRouteName(pathBranchesForCode);
    }
    if (Object.keys(patch).length) {
      form.setFieldsValue(patch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathBranchesForCode, modalServiceType, modalOpen, manualCode, manualName]);

  const saveRoute = async () => {
    try {
      const values = await form.validateFields();

      if (!laneIds.length) {
        message.error("Add at least one lane to build the route.");
        return;
      }

      const routePayload = {
        route_code: values.route_code?.trim() || null,
        name: values.name?.trim() || null,
        lane_ids: laneIds,
        checkpoints,
        service_type: values.service_type,
        base_rate: Number(values.base_rate || 0),
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

      message.success(
        editing ? "Transfer route updated." : "Transfer route created.",
      );
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
      message.success(
        `Transfer route ${row.is_active ? "disabled" : "enabled"}.`,
      );
      await loadRows();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not update route status."));
    }
  };

  const removeRoute = async (row) => {
    try {
      await deleteBranchTransferRoute(row.id);
      message.success("Transfer route disabled.");
      await loadRows();
    } catch (error) {
      message.error(apiErrorMessage(error, "Could not delete transfer route."));
    }
  };

  // ------- Selected route map nodes -------

  const selectedNodes = useMemo(() => {
    if (!selected) return [];
    if (Array.isArray(selected.path) && selected.path.length) {
      return selected.path.filter(
        (b) =>
          b &&
          Number.isFinite(Number(b.latitude)) &&
          Number.isFinite(Number(b.longitude)),
      );
    }
    return [selected.origin_branch, selected.destination_branch].filter(
      (b) =>
        b &&
        Number.isFinite(Number(b.latitude)) &&
        Number.isFinite(Number(b.longitude)),
    );
  }, [selected]);

  // ------- Connectivity view -------

  const connectivity = useMemo(() => {
    if (!connBranchId) return null;
    const { outbound, inbound } = deriveBranchConnectivity(
      connBranchId,
      normalizedLanes,
    );
    const originRoutes = rows.filter(
      (r) => Number(r.origin_branch_id) === Number(connBranchId),
    );
    const throughRoutes = rows.filter((r) => {
      const ids = Array.isArray(r.path)
        ? r.path.map((b) => Number(b.id))
        : [];
      return (
        ids.includes(Number(connBranchId)) &&
        Number(r.origin_branch_id) !== Number(connBranchId)
      );
    });
    return { outbound, inbound, originRoutes, throughRoutes };
  }, [connBranchId, normalizedLanes, rows]);

  const connBranch = connBranchId
    ? branchesById.get(Number(connBranchId))
    : null;

  // ------- Table -------

  const columns = [
    {
      title: "Route",
      key: "route",
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Space size={6}>
            <Text strong>{row.name}</Text>
            {row.is_default ? (
              <Tag color="gold" icon={<StarFilled />}>
                Default
              </Tag>
            ) : null}
          </Space>
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
      width: 100,
      align: "center",
      render: (value) =>
        Number(value) > 0 ? (
          <Tag color="purple">{value}</Tag>
        ) : (
          <Tag>Direct</Tag>
        ),
    },
    {
      title: "Distance",
      dataIndex: "total_distance_km",
      width: 110,
      render: (value) => `${Number(value || 0).toFixed(1)} km`,
    },
    {
      title: "ETA",
      dataIndex: "total_estimated_hours",
      width: 90,
      render: (value) => `${Number(value || 0)} hrs`,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      width: 90,
      align: "center",
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 100,
      render: (value) => statusTag(value),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      render: (_, row) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row);
              }}
            />
          </Tooltip>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleStatus(row);
            }}
          >
            {row.is_active ? "Disable" : "Enable"}
          </Button>
          <Popconfirm
            title="Disable this transfer route?"
            okText="Disable"
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
      {/* HEADER */}
      <Card bordered={false}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Transfer Routes
            </Title>
            <Text type="secondary">
              A route is an ordered chain of lanes with optional road
              checkpoints. Build KTM → Itahari via Bardibas from existing lanes —
              no direct lane needed. Customer prices live in Branch Pricing.
            </Text>
          </Col>

          <Col>
            <Space>
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { label: "Routes", value: "routes", icon: <NodeIndexOutlined /> },
                  {
                    label: "Connectivity",
                    value: "connectivity",
                    icon: <ApartmentOutlined />,
                  },
                ]}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadLanes();
                  loadRows();
                }}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreate}
              >
                Add Transfer Route
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* STATS */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card bordered={false}>
            <Statistic title="Total Routes" value={stats.total} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Active"
              value={stats.active}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card bordered={false}>
            <Statistic
              title="Via Transit"
              value={stats.withTransit}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card bordered={false}>
            <Statistic title="Lanes Available" value={normalizedLanes.length} />
          </Card>
        </Col>
      </Row>

      {view === "connectivity" ? (
        <ConnectivityView
          branchOptions={branchOptions}
          connBranchId={connBranchId}
          setConnBranchId={setConnBranchId}
          connectivity={connectivity}
          connBranch={connBranch}
        />
      ) : (
        <>
          {/* FILTERS */}
          <Card bordered={false}>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={8}>
                <Input.Search
                  allowClear
                  placeholder="Search route code or name"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((c) => ({ ...c, search: e.target.value }))
                  }
                  onSearch={() => loadRows(1)}
                />
              </Col>
              <Col xs={12} lg={5}>
                <Select
                  allowClear
                  placeholder="Route Type"
                  style={{ width: "100%" }}
                  options={[
                    { label: "Direct Only", value: false },
                    { label: "Transit Only", value: true },
                  ]}
                  value={filters.has_transit}
                  onChange={(value) =>
                    setFilters((c) => ({ ...c, has_transit: value }))
                  }
                />
              </Col>
              <Col xs={12} lg={5}>
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
              <Col xs={12} lg={3}>
                <Select
                  allowClear
                  placeholder="Status"
                  style={{ width: "100%" }}
                  options={[
                    { label: "Active", value: true },
                    { label: "Inactive", value: false },
                  ]}
                  value={filters.is_active}
                  onChange={(value) =>
                    setFilters((c) => ({ ...c, is_active: value }))
                  }
                />
              </Col>
              <Col xs={12} lg={3}>
                <Button block type="primary" onClick={() => loadRows(1)}>
                  Apply
                </Button>
              </Col>
            </Row>
          </Card>

          {/* ALTERNATIVES OVERVIEW */}
          {groupedRoutes.some((g) => g.routes.length > 1) ? (
            <Card
              bordered={false}
              title="Alternative Routes (same origin → destination)"
              size="small"
            >
              <Collapse
                ghost
                items={groupedRoutes
                  .filter((g) => g.routes.length > 1)
                  .map((group) => ({
                    key: group.key,
                    label: (
                      <Space>
                        <Text strong>{group.label}</Text>
                        <Tag color="blue">{group.service}</Tag>
                        <Tag color="orange">
                          {group.routes.length} alternatives
                        </Tag>
                      </Space>
                    ),
                    children: (
                      <List
                        size="small"
                        dataSource={group.routes}
                        renderItem={(r, i) => (
                          <List.Item
                            actions={[
                              <Button
                                key="edit"
                                size="small"
                                onClick={() => openEdit(r)}
                              >
                                Edit
                              </Button>,
                              <Button
                                key="toggle"
                                size="small"
                                onClick={() => toggleStatus(r)}
                              >
                                {r.is_active ? "Disable" : "Enable"}
                              </Button>,
                            ]}
                          >
                            <Space direction="vertical" size={0}>
                              <Space size={6}>
                                <Tag>{`#${i + 1}`}</Tag>
                                <Text>{r.path_text}</Text>
                                {r.is_default ? (
                                  <Tag color="gold" icon={<StarFilled />}>
                                    Default
                                  </Tag>
                                ) : null}
                                {statusTag(r.is_active)}
                              </Space>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {Number(r.total_distance_km || 0).toFixed(1)} km ·
                                priority {r.priority}
                              </Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    ),
                  }))}
              />
            </Card>
          ) : null}

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
                    showTotal: (total) => `Total ${total} routes`,
                  }}
                  onChange={(next) => loadRows(next.current, next.pageSize)}
                />
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Card bordered={false} title="Selected Route">
                <RouteMapS
                  nodes={selectedNodes}
                  height={320}
                  selectedLabel="Transfer route"
                />

                <Descriptions column={1} size="small" style={{ marginTop: 18 }}>
                  <Descriptions.Item label="Route">
                    {selected?.name || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Code">
                    {selected?.route_code || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Path">
                    {selected?.path_text || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Transits">
                    {selected ? Number(selected.transit_count) || 0 : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Distance">
                    {selected
                      ? `${Number(selected.total_distance_km || 0).toFixed(1)} km`
                      : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="ETA">
                    {selected
                      ? `${Number(selected.total_estimated_hours || 0)} hrs`
                      : "—"}
                  </Descriptions.Item>
                </Descriptions>

                {Array.isArray(selected?.checkpoints) &&
                selected.checkpoints.length ? (
                  <>
                    <Divider plain>Road Checkpoints</Divider>
                    <Space wrap size={6}>
                      {selected.checkpoints.map((cp, i) => (
                        <Tag color="purple" key={i}>
                          <EnvironmentOutlined />{" "}
                          {cp.name || cp.city || `Checkpoint ${i + 1}`}
                        </Tag>
                      ))}
                    </Space>
                  </>
                ) : null}
              </Card>
            </Col>
          </Row>
        </>
      )}

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
        styles={{ body: { maxHeight: "80vh", overflowY: "auto", paddingRight: 8 } }}
      >
        <Alert
          type="info"
          showIcon
          message="Pick the From and To branches, then apply the suggested lane path (or build it manually). No direct lane is needed — routes can chain through transit branches. Optionally drop road checkpoints on the map to describe the exact road taken."
          style={{ marginBottom: 18 }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            service_type: "standard",
            priority: 100,
            base_rate: 0,
            is_default: false,
            is_active: true,
          }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="service_type"
                label="Service Type"
                rules={[{ required: true, message: "Select service type" }]}
                help="Lanes must match this service."
              >
                <Select
                  options={SERVICE_TYPES}
                  onChange={(value) => {
                    setModalServiceType(value);
                    // Service change can invalidate the chain; reset lanes.
                    setLaneIds([]);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="Priority (lower = preferred)">
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="base_rate" label="Base Rate (operational)">
                <InputNumber min={0} style={{ width: "100%" }} addonAfter="NPR" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>
            <Space size={6}>
              <NodeIndexOutlined />
              Route Path
            </Space>
          </Divider>

          <OrderedLaneBuilder
            lanes={normalizedLanes}
            value={laneIds}
            serviceType={modalServiceType}
            fromBranchId={fromBranchId}
            toBranchId={toBranchId}
            branchOptions={branchOptions}
            onChange={setLaneIds}
            onChangeFrom={setFromBranchId}
            onChangeTo={setToBranchId}
          />

          <Divider orientation="left" plain>
            <Space size={6}>
              <EnvironmentOutlined />
              Road Checkpoints (optional)
            </Space>
          </Divider>

          <CheckpointMapPicker
            value={checkpoints}
            onChange={setCheckpoints}
            pathNodes={modalPathNodes}
            height={360}
          />

          <Divider orientation="left" plain>
            <Space size={6}>
              <TagsOutlined />
              Code &amp; Name
            </Space>
          </Divider>

          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="route_code"
                label={
                  <Space size={6}>
                    Route Code
                    {!manualCode ? <Tag color="blue">auto</Tag> : null}
                  </Space>
                }
                help="Auto-generated from the path. Edit to override."
              >
                <Input
                  placeholder="e.g. KTM-BRT-ITA-STANDARD"
                  onChange={() => setManualCode(true)}
                  addonAfter={
                    manualCode ? (
                      <Tooltip title="Reset to auto-generated">
                        <ReloadOutlined
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setManualCode(false);
                            form.setFieldValue(
                              "route_code",
                              buildRouteCode(pathBranchesForCode, modalServiceType),
                            );
                          }}
                        />
                      </Tooltip>
                    ) : null
                  }
                />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item
                name="name"
                label={
                  <Space size={6}>
                    Route Name
                    {!manualName ? <Tag color="blue">auto</Tag> : null}
                  </Space>
                }
                help="Auto-generated from the path. Edit to override."
              >
                <Input
                  placeholder="e.g. Kathmandu to Itahari via Bardibas"
                  onChange={() => setManualName(true)}
                  addonAfter={
                    manualName ? (
                      <Tooltip title="Reset to auto-generated">
                        <ReloadOutlined
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setManualName(false);
                            form.setFieldValue(
                              "name",
                              buildRouteName(pathBranchesForCode),
                            );
                          }}
                        />
                      </Tooltip>
                    ) : null
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="is_default"
                label="Default route"
                valuePropName="checked"
                help="Preferred alternative for this pair."
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
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
      </Modal>
    </Space>
  );
}

// -------------------- Connectivity View --------------------

function ConnectivityView({
  branchOptions,
  connBranchId,
  setConnBranchId,
  connectivity,
  connBranch,
}) {
  const [serviceFilter, setServiceFilter] = useState([
    "standard",
    "express",
    "same_day",
    "flight",
  ]);

  const connectedLanes = useMemo(() => {
    const out = connectivity?.outbound || [];
    const inb = connectivity?.inbound || [];
    const map = new Map();
    for (const lane of [...out, ...inb]) {
      map.set(Number(lane.id), lane);
    }
    return Array.from(map.values());
  }, [connectivity]);

  const laneItem = (lane, direction) => {
    const other =
      direction === "out" ? lane.to_branch : lane.from_branch;
    return (
      <List.Item>
        <Space direction="vertical" size={0}>
          <Space size={6}>
            <Tag color={direction === "out" ? "geekblue" : "cyan"}>
              {direction === "out" ? "→" : "←"}
            </Tag>
            <Text strong>{other?.name || "Branch"}</Text>
            <Tag color="blue">{lane.service_type}</Tag>
            {lane.is_active ? null : <Tag>inactive</Tag>}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {Number(lane.distance_km || 0)} km · ~
            {Number(lane.estimated_hours || 0)} hrs
          </Text>
        </Space>
      </List.Item>
    );
  };

  return (
    <Card bordered={false}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Select
              showSearch
              allowClear
              style={{ width: "100%" }}
              placeholder="Select a branch (e.g. Kathmandu) to see its network"
              optionFilterProp="label"
              options={branchOptions}
              value={connBranchId}
              onChange={setConnBranchId}
            />
          </Col>
          <Col xs={24} md={14}>
            {connBranch ? (
              <Text type="secondary">
                Showing connected lanes and routes for{" "}
                <Text strong>{connBranch.name}</Text>.
              </Text>
            ) : (
              <Text type="secondary">
                Pick a branch to view its directly connected branches and the
                routes that pass through it.
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
            style={{ marginBottom: 16 }}
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
                    <ApartmentOutlined />
                    Connected Lanes
                  </Space>
                }
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Outbound ({connectivity?.outbound.length || 0})
                </Text>
                <List
                  size="small"
                  locale={{ emptyText: "No outbound lanes" }}
                  dataSource={connectivity?.outbound || []}
                  renderItem={(lane) => laneItem(lane, "out")}
                />
                <Divider plain style={{ margin: "8px 0" }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Inbound ({connectivity?.inbound.length || 0})
                </Text>
                <List
                  size="small"
                  locale={{ emptyText: "No inbound lanes" }}
                  dataSource={connectivity?.inbound || []}
                  renderItem={(lane) => laneItem(lane, "in")}
                />
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card
                size="small"
                title={
                  <Space>
                    <NodeIndexOutlined />
                    Routes
                  </Space>
                }
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Originating here ({connectivity?.originRoutes.length || 0})
                </Text>
                <List
                  size="small"
                  locale={{ emptyText: "No routes start here" }}
                  dataSource={connectivity?.originRoutes || []}
                  renderItem={(r) => (
                    <List.Item>
                      <Space direction="vertical" size={0}>
                        <Space size={6}>
                          <Text strong>{r.path_text}</Text>
                          <Tag color="blue">{r.service_type}</Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {Number(r.total_distance_km || 0).toFixed(1)} km
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Divider plain style={{ margin: "8px 0" }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Passing through ({connectivity?.throughRoutes.length || 0})
                </Text>
                <List
                  size="small"
                  locale={{ emptyText: "No routes pass through" }}
                  dataSource={connectivity?.throughRoutes || []}
                  renderItem={(r) => (
                    <List.Item>
                      <Space size={6}>
                        <Text>{r.path_text}</Text>
                        <Tag color="blue">{r.service_type}</Tag>
                      </Space>
                    </List.Item>
                  )}
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
