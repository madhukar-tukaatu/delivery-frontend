"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Modal,
  Progress,
  Radio,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CarOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  createPickupRun,
  getPickupRun,
  getPickupRunRiders,
  getPickupRunStats,
  getPickupRuns,
  getReadyForPickup,
  runErrorText,
} from "@/services/admin/pickupRunService";
import { VEHICLE_OPTIONS, fmtDate, vehicleText } from "@/components/admin/delivery-runs/runMeta";
import PickupRunDetail from "./PickupRunDetail";
import RunRouteMap from "@/components/maps/RunRouteMap";

const { Text, Title } = Typography;

const STATUS_TAGS = {
  open: { label: "Open", color: "default" },
  assigned: { label: "Assigned", color: "purple" },
  in_progress: { label: "In Progress", color: "blue" },
  completed: { label: "Completed", color: "green" },
  closed: { label: "Closed", color: "gray" },
  cancelled: { label: "Cancelled", color: "red" },
};

export default function PickupRunBoard({ branchId = null, onOpenPickup = null }) {
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [boardLayout, setBoardLayout] = useState("split");
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeRunData, setActiveRunData] = useState(null);
  const [activeRunLoading, setActiveRunLoading] = useState(false);

  // Quick Map Modal
  const [mapRun, setMapRun] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);

  // Create Run Modal
  const [createModal, setCreateModal] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await getPickupRunStats(branchId);
      setStats(data);
    } catch {
      // ignore
    }
  }, [branchId]);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPickupRuns(
        {
          page,
          status: statusFilter,
          search: search.trim() || undefined,
        },
        branchId
      );
      setRuns(data.list);
      setTotal(data.total);
    } catch (e) {
      message.error(runErrorText(e, "Could not load pickup runs."));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, branchId]);

  useEffect(() => {
    loadStats();
    loadRuns();
  }, [loadStats, loadRuns]);

  useEffect(() => {
    if (runs.length > 0 && (!activeRunId || !runs.some((r) => r.id === activeRunId))) {
      setActiveRunId(runs[0].id);
    }
  }, [runs, activeRunId]);

  useEffect(() => {
    if (!activeRunId) {
      setActiveRunData(null);
      return;
    }
    let cancelled = false;
    setActiveRunLoading(true);
    getPickupRun(activeRunId, branchId)
      .then((full) => {
        if (!cancelled) setActiveRunData(full);
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = runs.find((r) => r.id === activeRunId);
          setActiveRunData(fallback || null);
        }
      })
      .finally(() => {
        if (!cancelled) setActiveRunLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRunId, branchId, runs]);

  const openQuickMap = async (runSummary) => {
    setMapLoading(true);
    try {
      const full = await getPickupRun(runSummary.id, branchId);
      setMapRun(full);
    } catch {
      setMapRun(runSummary);
    } finally {
      setMapLoading(false);
    }
  };

  // If a run is selected for detail view
  if (selectedRunId) {
    return (
      <PickupRunDetail
        runId={selectedRunId}
        branchId={branchId}
        onOpenPickup={onOpenPickup}
        onBack={() => {
          setSelectedRunId(null);
          loadStats();
          loadRuns();
        }}
        onRunUpdated={() => {
          loadStats();
          loadRuns();
        }}
      />
    );
  }

  return (
    <div>
      {/* Stats Summary Bar */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Ready for Run"
              value={stats?.ready ?? 0}
              valueStyle={{ color: "#0891b2", fontWeight: 700 }}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Active Runs"
              value={
                (Number(stats?.by_status?.open || 0) +
                  Number(stats?.by_status?.assigned || 0) +
                  Number(stats?.by_status?.in_progress || 0))
              }
              valueStyle={{ color: "#2563eb", fontWeight: 700 }}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Today's Pickups"
              value={stats?.today?.picked_up ?? 0}
              valueStyle={{ color: "#10b981", fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic
              title="Today's Failed"
              value={stats?.today?.failed ?? 0}
              valueStyle={{ color: stats?.today?.failed ? "#ef4444" : undefined }}
            />
          </Card>
        </Col>
      </Row>

      {/* Action and Filter Toolbar */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <Space wrap>
            <Radio.Group
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              buttonStyle="solid"
            >
              <Radio.Button value="active">Active</Radio.Button>
              <Radio.Button value="open">Open</Radio.Button>
              <Radio.Button value="assigned">Assigned</Radio.Button>
              <Radio.Button value="in_progress">In Progress</Radio.Button>
              <Radio.Button value="completed">Completed</Radio.Button>
              <Radio.Button value="closed">Closed</Radio.Button>
              <Radio.Button value="all">All</Radio.Button>
            </Radio.Group>

            <Input
              placeholder="Search run #, rider..."
              allowClear
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => {
                setPage(1);
                loadRuns();
              }}
              style={{ width: 220 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => { loadStats(); loadRuns(); }}>
              Refresh
            </Button>
          </Space>

          <Space size={12}>
            <Segmented
              value={boardLayout}
              onChange={setBoardLayout}
              options={[
                { label: "Split Map View", value: "split" },
                { label: "Cards View", value: "cards" },
              ]}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModal(true)}
              style={{ background: "#0891b2", borderColor: "#0891b2" }}
            >
              Create Pickup Run
            </Button>
          </Space>
        </div>
      </Card>

      {/* Runs Content: Split Map View (default) or Cards View */}
      <Spin spinning={loading}>
        {runs.length === 0 ? (
          <Card style={{ borderRadius: 8 }}>
            <Empty description="No pickup runs found.">
              <Button type="primary" onClick={() => setCreateModal(true)} style={{ background: "#0891b2", borderColor: "#0891b2" }}>
                Create First Pickup Run
              </Button>
            </Empty>
          </Card>
        ) : boardLayout === "split" ? (
          <Row gutter={[16, 16]}>
            {/* Left: Pickup Runs List */}
            <Col xs={24} lg={9}>
              <div style={{ maxHeight: "680px", overflowY: "auto", paddingRight: 4 }}>
                <Space direction="vertical" style={{ width: "100%" }} size={8}>
                  {runs.map((run) => {
                    const isSelected = run.id === activeRunId;
                    const statusTag = STATUS_TAGS[run.status] || { label: run.status, color: "default" };
                    const percent = run.expected_count > 0 ? Math.round((run.picked_up_count / run.expected_count) * 100) : 0;
                    return (
                      <Card
                        key={run.id}
                        size="small"
                        hoverable
                        onClick={() => setActiveRunId(run.id)}
                        style={{
                          borderRadius: 8,
                          border: isSelected ? "2px solid #0891b2" : "1px solid #e2e8f0",
                          background: isSelected ? "#f0fdfa" : "#fff",
                          cursor: "pointer",
                        }}
                        styles={{ body: { padding: "10px 12px" } }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Text strong style={{ fontSize: 14 }}>{run.run_number}</Text>
                          <Tag color={statusTag.color}>{statusTag.label}</Tag>
                        </div>
                        <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <Text type="secondary">Rider:</Text>
                          <Text strong>{run.rider?.name || <Text type="warning">Unassigned</Text>}</Text>
                        </div>
                        {run.vehicle_type && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                            <span>Vehicle:</span>
                            <span>{vehicleText(run.vehicle_type, run.vehicle_number)}</span>
                          </div>
                        )}
                        <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                          <span>Pickups:</span>
                          <span style={{ fontWeight: 600 }}>{run.picked_up_count}/{run.expected_count} collected</span>
                        </div>
                        <Progress percent={percent} size="small" style={{ margin: "4px 0" }} />
                        <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
                          <Button
                            size="small"
                            type="primary"
                            ghost
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRunId(run.id);
                            }}
                          >
                            Manage Run
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </Space>
              </div>
            </Col>

            {/* Right: Route Map of active run */}
            <Col xs={24} lg={15}>
              <Spin spinning={activeRunLoading}>
                {activeRunData ? (
                  <Card
                    size="small"
                    style={{ borderRadius: 8 }}
                    title={
                      <Space>
                        <Text strong style={{ fontSize: 15 }}>{activeRunData.run_number}</Text>
                        <Tag color={STATUS_TAGS[activeRunData.status]?.color || "default"}>
                          {STATUS_TAGS[activeRunData.status]?.label || activeRunData.status}
                        </Tag>
                        {activeRunData.rider?.name && <Text type="secondary">({activeRunData.rider.name})</Text>}
                      </Space>
                    }
                    extra={
                      <Button
                        type="primary"
                        size="small"
                        style={{ background: "#0891b2", borderColor: "#0891b2" }}
                        onClick={() => setSelectedRunId(activeRunData.id)}
                      >
                        Manage Stops & Pickups
                      </Button>
                    }
                    styles={{ body: { padding: 0 } }}
                  >
                    <RunRouteMap run={activeRunData} mode="pickup" onOpenPickup={onOpenPickup} height="600px" />
                  </Card>
                ) : (
                  <Card style={{ borderRadius: 8 }}>
                    <Empty description="Select a run to view its map route." />
                  </Card>
                )}
              </Spin>
            </Col>
          </Row>
        ) : (
          <Row gutter={[16, 16]}>
            {runs.map((run) => {
              const statusTag = STATUS_TAGS[run.status] || { label: run.status, color: "default" };
              const percent = run.expected_count > 0 ? Math.round((run.picked_up_count / run.expected_count) * 100) : 0;
              return (
                <Col xs={24} sm={12} lg={8} key={run.id}>
                  <Card
                    hoverable
                    size="small"
                    style={{ borderRadius: 10, borderTop: "3px solid #0891b2" }}
                    title={
                      <Space>
                        <Text strong style={{ fontSize: 15 }}>{run.run_number}</Text>
                        <Tag color={statusTag.color}>{statusTag.label}</Tag>
                      </Space>
                    }
                    extra={
                      <Button
                        size="small"
                        type="link"
                        icon={<CompassOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          openQuickMap(run);
                        }}
                      >
                        Route Map
                      </Button>
                    }
                    actions={[
                      <Button key="map" type="text" icon={<EnvironmentOutlined />} onClick={() => openQuickMap(run)}>
                        Map View
                      </Button>,
                      <Button key="open" type="primary" ghost onClick={() => setSelectedRunId(run.id)}>
                        Manage Run
                      </Button>,
                    ]}
                  >
                    <Space direction="vertical" style={{ width: "100%" }} size={6}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Text type="secondary">Rider:</Text>
                        <Text strong>
                          {run.rider?.name ? (
                            <>
                              <UserOutlined /> {run.rider.name}
                            </>
                          ) : (
                            <Text type="warning">Unassigned</Text>
                          )}
                        </Text>
                      </div>

                      {run.vehicle_type && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <Text type="secondary">Vehicle:</Text>
                          <Text>{vehicleText(run.vehicle_type, run.vehicle_number)}</Text>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <Text type="secondary">Stops:</Text>
                        <Text>
                          {run.picked_up_count}/{run.expected_count} picked up
                          {run.failed_count ? ` · ${run.failed_count} failed` : ""}
                        </Text>
                      </div>

                      <Progress percent={percent} size="small" status={run.status === "completed" ? "success" : "active"} />

                      <div style={{ fontSize: 11, color: "#94a3b8", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span>Created: {fmtDate(run.created_at)}</span>
                        {run.branch?.name && <span>{run.branch.name}</span>}
                      </div>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Spin>
      {/* Create Pickup Run Modal */}
      <CreatePickupRunModal
        open={createModal}
        branchId={branchId}
        onClose={() => setCreateModal(false)}
        onCreated={(id) => {
          setCreateModal(false);
          loadStats();
          loadRuns();
          if (id) setSelectedRunId(id);
        }}
      />

      {/* Quick Route Map Modal */}
      <Modal
        title={`Route Map · ${mapRun?.run_number || "Pickup Run"}`}
        open={Boolean(mapRun)}
        width={960}
        onCancel={() => setMapRun(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setMapRun(null)}>
            Close Map
          </Button>,
        ]}
        destroyOnHidden
      >
        <Spin spinning={mapLoading}>
          {mapRun && (
            <RunRouteMap
              run={mapRun}
              mode="pickup"
              onOpenPickup={
                onOpenPickup
                  ? (id) => {
                      setMapRun(null);
                      onOpenPickup(id);
                    }
                  : null
              }
              height="520px"
            />
          )}
        </Spin>
      </Modal>
    </div>
  );
}

/**
 * Reusable modal for creating a Pickup Run (PR).
 * Supports pre-selected pickup IDs and rider assignment from map or lists.
 */
export function CreatePickupRunModal({
  open,
  onClose,
  onCreated,
  branchId = null,
  initialSelectedIds = [],
  initialRiderId = null,
  initialItems = [],
}) {
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [readyPickups, setReadyPickups] = useState([]);
  const [readyLoading, setReadyLoading] = useState(false);
  const [selectedPickupIds, setSelectedPickupIds] = useState([]);
  const [riders, setRiders] = useState([]);
  const [createForm, setCreateForm] = useState({
    rider_user_id: null,
    vehicle_type: null,
    vehicle_number: "",
    auto_sequence: true,
    dispatch_now: false,
    notes: "",
  });

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    const initialIds = Array.isArray(initialSelectedIds) ? [...initialSelectedIds] : [];
    setSelectedPickupIds(initialIds);
    setCreateForm({
      rider_user_id: initialRiderId ? Number(initialRiderId) : null,
      vehicle_type: null,
      vehicle_number: "",
      auto_sequence: true,
      dispatch_now: false,
      notes: "",
    });
    const targetBranch = branchId || initialItems?.[0]?.branch_id || null;
    setReadyLoading(true);
    Promise.all([
      getReadyForPickup({}, targetBranch),
      getPickupRunRiders({}, targetBranch),
    ])
      .then(([list, rList]) => {
        if (!alive) return;
        setReadyPickups(list || []);
        setRiders(rList || []);
      })
      .catch(() => {
        if (!alive) return;
        setReadyPickups([]);
        setRiders([]);
      })
      .finally(() => {
        if (alive) setReadyLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, branchId, initialRiderId, initialItems]);

  // Combine fetched readyPickups with any initialSelectedIds / initialItems
  const tableData = useMemo(() => {
    const map = new Map();
    (readyPickups || []).forEach((p) => {
      const id = p.pickup_request_id || p.id;
      map.set(id, { ...p, pickup_request_id: id });
    });
    (initialItems || []).forEach((item) => {
      const id = item.id || item.pickup_request_id;
      if (id && !map.has(id)) {
        map.set(id, {
          ...item,
          pickup_request_id: id,
          request_number: item.request_number || item.title || `REQ-#${id}`,
          pickup_name: item.pickup_name || item.merchant?.name || item.merchant?.business_name || item.subtitle || "Selected Pickup",
          pickup_area: item.pickup_area || item.area || "Map Selected",
          pickup_address: item.pickup_address || item.address || "Selected from map",
          parcel_quantity: item.parcel_quantity || 1,
        });
      }
    });
    (selectedPickupIds || []).forEach((id) => {
      if (!map.has(id)) {
        map.set(id, {
          pickup_request_id: id,
          id,
          request_number: `REQ-#${id}`,
          pickup_name: "Selected Pickup",
          pickup_area: "Map Selected",
          pickup_address: "Selected from map",
          parcel_quantity: 1,
        });
      }
    });
    return Array.from(map.values());
  }, [readyPickups, initialItems, selectedPickupIds]);

  const handleCreate = async () => {
    if (!selectedPickupIds.length) {
      message.warning("Select at least one pickup request.");
      return;
    }
    setCreateSubmitting(true);
    try {
      const targetBranch = branchId || initialItems?.[0]?.branch_id || readyPickups?.[0]?.branch_id || undefined;
      const res = await createPickupRun(
        {
          pickup_request_ids: selectedPickupIds,
          branch_id: targetBranch,
          ...createForm,
        },
        targetBranch
      );
      if (res?.data?.dispatch_error) {
        message.warning(res?.message || `Pickup run created but not dispatched: ${res.data.dispatch_error}`, 6);
      } else {
        message.success(res?.message || "Pickup run created.");
      }
      onCreated?.(res?.data?.run?.id);
    } catch (e) {
      message.error(runErrorText(e, "Failed to create pickup run."));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const count = selectedPickupIds.length;

  return (
    <Modal
      title={
        <Space>
          <CompassOutlined style={{ color: "#0891b2" }} />
          <span>Create New Pickup Run (PR-RUN)</span>
        </Space>
      }
      open={open}
      width={840}
      onCancel={onClose}
      confirmLoading={createSubmitting}
      okText={
        createForm.dispatch_now && createForm.rider_user_id
          ? `Create PR-Run & Dispatch (${count})`
          : createForm.rider_user_id
          ? `Create PR-Run & Assign (${count})`
          : `Create PR-Run (${count})`
      }
      okButtonProps={{ disabled: !count }}
      onOk={handleCreate}
      destroyOnHidden
    >
      <Space direction="vertical" style={{ width: "100%" }} size={14}>
        <Alert
          type="info"
          showIcon
          message="Organize pickups into a structured PR-Run"
          description="Select pickup requests to group. Stops will be sequenced sequentially along the driving route path starting from the branch."
        />

        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Text strong style={{ fontSize: 12 }}>Assign Rider (optional)</Text>
            <Select
              showSearch
              loading={readyLoading}
              placeholder={readyLoading ? "Loading riders..." : "Choose a rider"}
              style={{ width: "100%", marginTop: 4 }}
              value={createForm.rider_user_id}
              onChange={(v) => setCreateForm((f) => ({ ...f, rider_user_id: v }))}
              options={riders.map((r) => ({
                value: r.id,
                label: `${r.name}${r.phone ? ` · ${r.phone}` : ""}`,
              }))}
              allowClear
              optionFilterProp="label"
              notFoundContent={readyLoading ? <Spin size="small" /> : "No riders found for branch"}
            />
          </Col>
          <Col xs={24} md={12}>
            <Text strong style={{ fontSize: 12 }}>Vehicle</Text>
            <Space.Compact style={{ width: "100%", marginTop: 4 }}>
              <Select
                allowClear
                placeholder="Type"
                style={{ width: "40%" }}
                value={createForm.vehicle_type}
                options={VEHICLE_OPTIONS}
                onChange={(v) => setCreateForm((f) => ({ ...f, vehicle_type: v }))}
              />
              <Input
                placeholder="Number plate"
                value={createForm.vehicle_number}
                onChange={(e) => setCreateForm((f) => ({ ...f, vehicle_number: e.target.value }))}
              />
            </Space.Compact>
          </Col>
        </Row>

        <Space wrap size={16}>
          <Space>
            <Switch
              size="small"
              checked={createForm.auto_sequence}
              onChange={(v) => setCreateForm((f) => ({ ...f, auto_sequence: v }))}
            />
            <Text style={{ fontSize: 12 }}>Auto-order stops by area / route</Text>
          </Space>
          {createForm.rider_user_id && (
            <Space>
              <Switch
                size="small"
                checked={createForm.dispatch_now}
                onChange={(v) => setCreateForm((f) => ({ ...f, dispatch_now: v }))}
              />
              <Text style={{ fontSize: 12 }}>Dispatch immediately to rider</Text>
            </Space>
          )}
        </Space>

        <div>
          <Text strong>Select Pickups to Include ({count} selected):</Text>
          <Table
            size="small"
            rowKey="pickup_request_id"
            loading={readyLoading}
            dataSource={tableData}
            pagination={{ pageSize: 6, size: "small" }}
            rowSelection={{
              selectedRowKeys: selectedPickupIds,
              onChange: setSelectedPickupIds,
            }}
            columns={[
              { title: "Req #", dataIndex: "request_number" },
              { title: "Merchant", key: "m", render: (_, r) => r.merchant?.business_name || r.pickup_name },
              { title: "Area", dataIndex: "pickup_area" },
              { title: "Address", dataIndex: "pickup_address", ellipsis: true },
              { title: "Parcels", dataIndex: "parcel_quantity", render: (v) => `${v || 1} pkg` },
            ]}
            locale={{ emptyText: "No pickups are waiting for a run." }}
            style={{ marginTop: 8 }}
          />
        </div>
      </Space>
    </Modal>
  );
}

