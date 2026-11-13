"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Badge,
  Spin,
  Progress,
  Tooltip,
  Alert,
  Tabs,
  Input,
} from "antd";
import {
  CarOutlined,
  CompassOutlined,
  SyncOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PhoneOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  DollarOutlined,
  TeamOutlined,
  SendOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  BarChartOutlined,
  InboxOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { getNetworkOverview } from "@/services/admin/transferService";
import NepalTransferNetworkMap from "@/components/admin/transfers/NepalTransferNetworkMap";
import BranchTransferRequestModal from "@/components/admin/transfers/BranchTransferRequestModal";
import TransportManagerDispatchModal from "@/components/admin/transfers/TransportManagerDispatchModal";

const { Text, Title } = Typography;

export default function NetworkFlowDashboard({ branchId = null, onSelectTr }) {
  const [loading, setLoading] = useState(false);
  const [activeSubView, setActiveSubView] = useState("live_map");
  const [branchSearch, setBranchSearch] = useState("");
  const [data, setData] = useState({
    in_transit_trs: [],
    staged_by_hub: [],
    branches: [],
    real_lanes: [],
    pending_requests: [],
    metrics: {
      total_moving_trucks: 0,
      total_moving_parcels: 0,
      total_pending_requests: 0,
      total_branches_active: 0,
      consolidation_savings_percent: 74.2,
      avg_cost_per_parcel: 0,
    },
    reporting: {
      total_sorted_for_transfer: 0,
      total_in_transit_shipments: 0,
      total_transit_hub_shipments: 0,
      total_destination_received: 0,
      total_delivered_transfers: 0,
      total_transfer_freight_kg: 0,
      total_active_containers: 0,
      total_staged_containers: 0,
    },
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Modals state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedBranchForRequest, setSelectedBranchForRequest] = useState(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedMapBranchId, setSelectedMapBranchId] = useState(branchId);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNetworkOverview(branchId || selectedMapBranchId);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [branchId, selectedMapBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  const {
    in_transit_trs = [],
    staged_by_hub = [],
    branches = [],
    real_lanes: realLanes = [],
    pending_requests = [],
    metrics = {},
    reporting = {},
  } = data || {};

  // Find current scoped branch details if branchId is selected
  const currentBranch = branches.find((b) => Number(b.id) === Number(branchId));

  // Inbound trucks heading towards current branch
  const inboundToCurrentBranch = in_transit_trs.filter(
    (tr) => branchId && Number(tr.to_branch_id) === Number(branchId)
  );

  const handleOpenRequestModal = (branch = null) => {
    setSelectedBranchForRequest(branch || currentBranch);
    setRequestModalOpen(true);
  };

  const handleOpenDispatchModal = (req) => {
    setSelectedRequest(req);
    setDispatchModalOpen(true);
  };

  const trColumns = [
    {
      title: "TR Run",
      key: "tr",
      render: (_, r) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ fontSize: 13, color: "#1d4ed8" }}>
            {r.transfer_number || r.manifest_number}
          </Text>
          <Tag color="processing" style={{ margin: 0, fontSize: 10 }}>
            In Transit
          </Tag>
        </Space>
      ),
    },
    {
      title: "Route & Direction",
      key: "route",
      render: (_, r) => (
        <Space direction="vertical" size={1}>
          <Space size={6} align="center">
            <Text strong>{r.from_branch_name || "Origin"}</Text>
            <ArrowRightOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
            <Text strong style={{ color: "#047857" }}>
              {r.to_branch_name || "Next Hop"}
            </Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Dispatched: {r.dispatched_at ? new Date(r.dispatched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Carrier & Driver",
      key: "driver",
      render: (_, r) => (
        <Space direction="vertical" size={1}>
          <Space size={4}>
            <CarOutlined style={{ color: "#2563eb" }} />
            <Text style={{ fontSize: 12 }}>{r.vehicle_number || r.vehicle_type || "Line-Haul"}</Text>
          </Space>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.driver_name || r.rider_name || "Assigned Driver"}
            </Text>
            {(r.driver_phone || r.rider_phone) ? (
              <a href={`tel:${r.driver_phone || r.rider_phone}`} style={{ fontSize: 11 }}>
                <PhoneOutlined /> {r.driver_phone || r.rider_phone}
              </a>
            ) : null}
          </Space>
        </Space>
      ),
    },
    {
      title: "Security Seal",
      key: "seal",
      render: (_, r) => (
        r.seal_number ? (
          <Tooltip title="Tamper-evident security seal applied at dispatch">
            <Tag color="cyan" icon={<LockOutlined />} style={{ margin: 0, fontWeight: 600 }}>
              {r.seal_number}
            </Tag>
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontSize: 11 }}>Unsealed</Text>
        )
      ),
    },
    {
      title: "Cargo & Limit",
      key: "cargo",
      align: "center",
      render: (_, r) => {
        const maxParcels = r.max_parcels || 800;
        const count = r.expected_count || 0;
        const pct = Math.min(100, Math.round((count / maxParcels) * 100));
        return (
          <Space direction="vertical" size={1} align="center">
            <Badge count={`${count} pkgs`} style={{ backgroundColor: "#0284c7" }} />
            <Text type="secondary" style={{ fontSize: 10 }}>{pct}% of {maxParcels} limit</Text>
          </Space>
        );
      },
    },
    {
      title: "ETA Time",
      key: "eta",
      render: (_, r) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ color: "#059669", fontSize: 12 }}>
            <ClockCircleOutlined /> {r.estimated_arrival_at ? new Date(r.estimated_arrival_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "In ~3-5h"}
          </Text>
          <Text type="secondary" style={{ fontSize: 10 }}>Est. {r.estimated_hours || 4}h run</Text>
        </Space>
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_, r) => (
        <Button
          size="small"
          type="link"
          onClick={() => onSelectTr?.(r)}
        >
          View Live TR &rarr;
        </Button>
      ),
    },
  ];

  const requestColumns = [
    {
      title: "Request ID",
      key: "req_num",
      render: (_, r) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ color: "#2563eb" }}>{r.request_number}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.created_at ? new Date(r.created_at).toLocaleDateString() : "Today"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Branch & Target Hub",
      key: "branches",
      render: (_, r) => (
        <Space size={6} align="center">
          <Text strong>{r.origin_branch?.name || "Branch"}</Text>
          <ArrowRightOutlined style={{ fontSize: 11, color: "#94a3b8" }} />
          <Text strong style={{ color: "#047857" }}>{r.destination_hub?.name || "Target Hub"}</Text>
        </Space>
      ),
    },
    {
      title: "Ready Freight Load",
      key: "load",
      render: (_, r) => (
        <Space direction="vertical" size={1}>
          <Text strong>{r.parcel_count} parcels ({r.total_weight_kg} kg)</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>Vehicle: {r.requested_vehicle_type?.toUpperCase()}</Text>
        </Space>
      ),
    },
    {
      title: "Urgency Status",
      key: "urgency",
      render: (_, r) => (
        r.threshold_exceeded || r.urgency === "critical_capacity_exceeded" ? (
          <Tooltip title="Exceeded 80 kg or 50 parcels threshold. Priority dispatch needed.">
            <Tag color="error" icon={<WarningOutlined />} style={{ fontWeight: 600 }}>
              Threshold Exceeded (&ge;80kg)
            </Tag>
          </Tooltip>
        ) : (
          <Tag color="blue">Standard Request</Tag>
        )
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          icon={<SendOutlined />}
          onClick={() => handleOpenDispatchModal(r)}
        >
          Dispatch Vehicle
        </Button>
      ),
    },
  ];

  // Reporting branch table columns
  const branchTableColumns = [
    {
      title: "Branch",
      key: "branch",
      render: (_, b) => (
        <Space direction="vertical" size={1}>
          <Text strong>{b.name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{b.city}, {b.district} ({b.province})</Text>
        </Space>
      ),
    },
    {
      title: "Pending Outbound",
      key: "outbound",
      render: (_, b) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ color: "#2563eb" }}>{b.pending_parcels || 0} parcels</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{b.pending_weight_kg || 0} kg</Text>
        </Space>
      ),
    },
    {
      title: "Expected Inbound",
      key: "inbound",
      render: (_, b) => (
        <Text strong style={{ color: "#059669" }}>{b.inbound_expected_parcels || 0} parcels</Text>
      ),
    },
    {
      title: "Vehicle Requests",
      key: "requests",
      render: (_, b) => (
        b.transfer_requests_count > 0 ? (
          <Tag color="orange">{b.transfer_requests_count} Pending</Tag>
        ) : (
          <Text type="secondary">0</Text>
        )
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, b) => (
        b.urgency === "critical_capacity_exceeded" ? (
          <Tag color="error">Threshold Exceeded</Tag>
        ) : b.urgency === "high" ? (
          <Tag color="warning">High Demand</Tag>
        ) : (
          <Tag color="success">Normal</Tag>
        )
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_, b) => (
        <Button
          size="small"
          type="primary"
          icon={<SendOutlined />}
          onClick={() => handleOpenRequestModal(b)}
        >
          Request TR
        </Button>
      ),
    },
  ];

  const filteredBranches = branches.filter((b) => {
    if (!branchSearch) return true;
    const q = branchSearch.toLowerCase();
    return (
      (b.name || "").toLowerCase().includes(q) ||
      (b.city || "").toLowerCase().includes(q) ||
      (b.province || "").toLowerCase().includes(q) ||
      (b.code || "").toLowerCase().includes(q)
    );
  });

  const branchCount = branches.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Top Banner & Control Bar */}
      <Card size="small" style={{ borderRadius: 12, background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#fff" }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} md={14}>
            <Space size={10} align="center">
              <Badge status="processing" color="#10b981" />
              <Title level={4} style={{ color: "#fff", margin: 0, fontWeight: 700 }}>
                {branchId && currentBranch
                  ? `Transport Operations — ${currentBranch.name}`
                  : `Transport Control Tower & Nepal Live Network (${branchCount} Branches)`}
              </Title>
              <Tag color={branchId ? "purple" : "blue"} style={{ margin: 0 }}>
                {branchId ? "Branch Mode" : "National Control Tower"}
              </Tag>
            </Space>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              {branchId && currentBranch
                ? `Manage outbound transfer vehicle requests, incoming line-haul trucks, and receiving dock for ${currentBranch.city}.`
                : `Live database monitoring of all ${branchCount} branches across Nepal, active highway line-hauls, and pooled transport efficiency.`}
            </div>
          </Col>
          <Col xs={24} md={10} style={{ textAlign: "right" }}>
            <Space size={8} wrap>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="small"
                style={{ background: "#2563eb", borderColor: "#2563eb", fontWeight: 600 }}
                onClick={() => handleOpenRequestModal()}
              >
                Request Line-Haul Vehicle
              </Button>
              <Button
                size="small"
                icon={<SyncOutlined spin={loading} />}
                onClick={load}
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}
              >
                Refresh Live
              </Button>
              <Button
                size="small"
                onClick={() => setAutoRefresh(!autoRefresh)}
                style={{
                  background: autoRefresh ? "#10b981" : "rgba(255,255,255,0.1)",
                  color: "#fff",
                  borderColor: "transparent",
                  fontWeight: 600,
                }}
              >
                {autoRefresh ? "Auto-refresh: 30s [ON]" : "Auto-refresh: OFF"}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Scoped Branch Manager Notice (When a specific branch is selected) */}
      {branchId && currentBranch && (
        <Card size="small" style={{ borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <Row justify="space-between" align="middle" gutter={[12, 12]}>
            <Col xs={24} md={16}>
              <Space align="center" size={10}>
                <Badge count={`${currentBranch.pending_parcels || 0} pkgs`} style={{ backgroundColor: "#2563eb" }} />
                <div>
                  <Text strong style={{ fontSize: 13, color: "#166534" }}>
                    {currentBranch.name} ({currentBranch.city}, {currentBranch.province})
                  </Text>
                  <div style={{ fontSize: 12, color: "#15803d" }}>
                    Outbound Freight: <strong>{currentBranch.pending_parcels || 0} parcels ({currentBranch.pending_weight_kg || 0} kg)</strong> ready for transfer.
                    {currentBranch.pending_weight_kg >= 80 && (
                      <Tag color="error" style={{ marginLeft: 6 }}>Threshold Exceeded (&ge;80 kg)</Tag>
                    )}
                  </div>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: "right" }}>
              <Space>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => handleOpenRequestModal(currentBranch)}
                >
                  Request Vehicle Now
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Incoming trucks to this branch dock */}
          {inboundToCurrentBranch.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #bbf7d0" }}>
              <Text strong style={{ fontSize: 12, color: "#166534" }}>
                <CarOutlined /> Inbound Trucks En Route to this Dock ({inboundToCurrentBranch.length}):
              </Text>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                {inboundToCurrentBranch.map((tr) => (
                  <Tag key={tr.id} color="cyan" style={{ padding: "4px 8px" }}>
                    <strong>{tr.transfer_number}</strong> from {tr.from_branch_name} | {tr.expected_count} pkgs | Driver: {tr.driver_name} | ETA: {tr.estimated_arrival_at ? new Date(tr.estimated_arrival_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Approaching"}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* KPI Tiles: Real Database Volume & Live Flow */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #2563eb" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Moving Trucks (TR Runs)</span>}
              value={metrics.total_moving_trucks || in_transit_trs.length || 0}
              prefix={<CarOutlined style={{ color: "#2563eb", marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 22 }}
              suffix={<span style={{ fontSize: 12, color: "#94a3b8" }}>on highway</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #059669" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Moving Freight Load</span>}
              value={metrics.total_moving_parcels || 0}
              prefix={<ThunderboltOutlined style={{ color: "#059669", marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 22 }}
              suffix={<span style={{ fontSize: 12, color: "#94a3b8" }}>parcels</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #ea580c" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Branch Transfer Requests</span>}
              value={metrics.total_pending_requests || pending_requests.length || 0}
              prefix={<SendOutlined style={{ color: "#ea580c", marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 22, color: "#ea580c" }}
              suffix={<span style={{ fontSize: 12, color: "#94a3b8" }}>waiting</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #7c3aed" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Active Nepal Branches</span>}
              value={branchCount}
              valueStyle={{ fontWeight: 700, fontSize: 22, color: "#7c3aed" }}
              prefix={<CompassOutlined style={{ color: "#7c3aed", marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 11, color: "#64748b" }}>database live</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Mode View Toggle (Map & Control Tower vs Fleet Management vs Reports) */}
      <Tabs
        activeKey={activeSubView}
        onChange={setActiveSubView}
        type="card"
        items={[
          {
            key: "live_map",
            label: (
              <span>
                <CompassOutlined /> Real-Time Nepal Map & Corridors
              </span>
            ),
          },
          {
            key: "fleet_queue",
            label: (
              <span>
                <SendOutlined /> Branch Transfer Requests ({pending_requests.length})
              </span>
            ),
          },
          {
            key: "moving_trucks",
            label: (
              <span>
                <CarOutlined /> Active Line-Haul Runs ({in_transit_trs.length})
              </span>
            ),
          },
          {
            key: "reports",
            label: (
              <span>
                <BarChartOutlined /> Live Reporting & Branch Breakdown
              </span>
            ),
          },
        ]}
      />

      {/* TAB 1: REAL-TIME NEPAL MAP & CORRIDORS */}
      {activeSubView === "live_map" && (
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Card
            size="small"
            title={
              <Space>
                <CompassOutlined style={{ color: "#2563eb" }} />
                <span style={{ fontWeight: 700 }}>Nepal Real-Time Transport Map ({branchCount} Active Branches)</span>
                <Tag color="blue">Prithvi, East-West, BP Highway & Feeder Lanes</Tag>
              </Space>
            }
            extra={
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenRequestModal()}
              >
                Request Vehicle
              </Button>
            }
            style={{ borderRadius: 10 }}
            styles={{ body: { padding: 4 } }}
          >
            <NepalTransferNetworkMap
              branches={branches}
              realLanes={realLanes}
              inTransitTrs={in_transit_trs}
              onRequestVehicle={(b) => handleOpenRequestModal(b)}
              onSelectBranch={(id) => setSelectedMapBranchId(id)}
              selectedBranchId={selectedMapBranchId}
              height={520}
            />
          </Card>

          {/* Active Multi-Corridor Highway Pipeline Cards */}
          <Card
            size="small"
            title={
              <Space>
                <CarOutlined style={{ color: "#2563eb" }} />
                <span style={{ fontWeight: 600 }}>Active Multi-Corridor Highway Pipeline</span>
              </Space>
            }
            style={{ borderRadius: 10 }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
                  <Space direction="vertical" style={{ width: "100%" }} size={4}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text strong style={{ color: "#1e293b" }}>Central Triangle Corridor</Text>
                      <Tag color="blue">Prithvi & Fast Track</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Kathmandu &harr; Bharatpur (Narayanghat) &harr; Pokhara
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Progress percent={85} size="small" strokeColor="#2563eb" status="active" />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      <span>Core Hub-and-Spoke Gateway</span>
                      <span style={{ fontWeight: 600, color: "#059669" }}>Flow Normal &#10003;</span>
                    </div>
                  </Space>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
                  <Space direction="vertical" style={{ width: "100%" }} size={4}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text strong style={{ color: "#1e293b" }}>Eastern Terai Corridor</Text>
                      <Tag color="cyan">East-West / BP Hwy</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Bharatpur &rarr; Hetauda &rarr; Sindhuli &rarr; Bardibas &rarr; Itahari &rarr; Biratnagar
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Progress percent={92} size="small" strokeColor="#0891b2" status="active" />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      <span>High Volume Eastbound Freight</span>
                      <span style={{ fontWeight: 600, color: "#059669" }}>Consolidated &#10003;</span>
                    </div>
                  </Space>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
                  <Space direction="vertical" style={{ width: "100%" }} size={4}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Text strong style={{ color: "#1e293b" }}>Western Terai Corridor</Text>
                      <Tag color="purple">Mahendra West Trunk</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Bharatpur &rarr; Butwal &rarr; Dang &rarr; Nepalgunj &rarr; Dhangadhi &rarr; Mahendranagar
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Progress percent={78} size="small" strokeColor="#7c3aed" status="active" />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                      <span>Multi-Hop Line-Haul Trunk</span>
                      <span style={{ fontWeight: 600, color: "#059669" }}>Active Legs &#10003;</span>
                    </div>
                  </Space>
                </div>
              </Col>
            </Row>
          </Card>
        </Space>
      )}

      {/* TAB 2: BRANCH TRANSFER REQUESTS QUEUE */}
      {activeSubView === "fleet_queue" && (
        <Card
          size="small"
          title={
            <Space>
              <SendOutlined style={{ color: "#ea580c" }} />
              <span style={{ fontWeight: 700 }}>Incoming Branch Transfer Requests (Fleet Demand Queue)</span>
              <Badge count={pending_requests.length} style={{ backgroundColor: "#ea580c" }} />
            </Space>
          }
          extra={
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenRequestModal()}
            >
              Submit Transfer Request
            </Button>
          }
          style={{ borderRadius: 10 }}
        >
          <Table
            size="small"
            rowKey="id"
            columns={requestColumns}
            dataSource={pending_requests}
            pagination={pending_requests.length > 8 ? { pageSize: 8, size: "small" } : false}
            locale={{ emptyText: "No pending transfer requests from branches" }}
          />
        </Card>
      )}

      {/* TAB 3: ACTIVE LINE-HAUL MOVING TRUCKS */}
      {activeSubView === "moving_trucks" && (
        <Card
          size="small"
          title={
            <Space>
              <CarOutlined style={{ color: "#2563eb" }} />
              <span style={{ fontWeight: 700 }}>Active Line-Haul Trucks in Transit ({in_transit_trs.length})</span>
            </Space>
          }
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              Live GPS stream & vehicle capacity enforcement
            </Text>
          }
          style={{ borderRadius: 10 }}
        >
          <Table
            size="small"
            rowKey="id"
            columns={trColumns}
            dataSource={in_transit_trs}
            pagination={in_transit_trs.length > 8 ? { pageSize: 8, size: "small" } : false}
            locale={{ emptyText: "No line-haul trucks currently on the road" }}
          />
        </Card>
      )}

      {/* TAB 4: LIVE REPORTING & BRANCH BREAKDOWN */}
      {activeSubView === "reports" && (
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          {/* Live Transfer Status Funnel (Database Actuals) */}
          <Card size="small" title="Live Transfer System Reporting (Database Actuals)" style={{ borderRadius: 10 }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Ready for Transfer</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>
                    {reporting.total_sorted_for_transfer ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>parcels staged</Text>
                </div>
              </Col>

              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>In Transit Freight</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#0891b2" }}>
                    {reporting.total_in_transit_shipments ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>parcels moving</Text>
                </div>
              </Col>

              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>At Transit Hubs</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#7c3aed" }}>
                    {reporting.total_transit_hub_shipments ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>cross-docking</Text>
                </div>
              </Col>

              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Arrived at Destination</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>
                    {reporting.total_destination_received ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>ready for last mile</Text>
                </div>
              </Col>

              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Completed Transfers</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>
                    {reporting.total_delivered_transfers ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>delivered</Text>
                </div>
              </Col>

              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Total Transfer Weight</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#ea580c" }}>
                    {reporting.total_transfer_freight_kg ?? 0} kg
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>freight volume</Text>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Branch-by-Branch Demand & Real Database Volume Table */}
          <Card
            size="small"
            title={
              <Space>
                <TeamOutlined style={{ color: "#2563eb" }} />
                <span style={{ fontWeight: 700 }}>Branch Freight Volume & Demand ({branchCount} Active Branches)</span>
              </Space>
            }
            extra={
              <Input
                placeholder="Search branch name, city, province..."
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                style={{ width: 260 }}
                size="small"
                allowClear
              />
            }
            style={{ borderRadius: 10 }}
          >
            <Table
              size="small"
              rowKey="id"
              columns={branchTableColumns}
              dataSource={filteredBranches}
              pagination={{ pageSize: 10, size: "small" }}
            />
          </Card>
        </Space>
      )}

      {/* Modals */}
      <BranchTransferRequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={() => load()}
        branches={branches}
        initialBranch={selectedBranchForRequest}
      />

      <TransportManagerDispatchModal
        open={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        onSuccess={() => load()}
        request={selectedRequest}
      />
    </div>
  );
}
