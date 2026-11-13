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
  Tooltip,
  Alert,
  Tabs,
  Input,
  Progress,
  Switch,
} from "antd";
import {
  CarOutlined,
  CompassOutlined,
  SyncOutlined,
  ArrowRightOutlined,
  WarningOutlined,
  PhoneOutlined,
  LockOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  SendOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  BarChartOutlined,
  InboxOutlined,
  SearchOutlined,
  ClusterOutlined,
  FundOutlined,
} from "@ant-design/icons";
import { getNetworkOverview } from "@/services/admin/transferService";
import { getTransferDemand } from "@/services/admin/transferPlanningService";
import NepalTransferNetworkMap from "@/components/admin/transfers/NepalTransferNetworkMap";
import TransferDemandBoard from "@/components/admin/transfers/TransferDemandBoard";
import TransferRecommendations from "@/components/admin/transfers/TransferRecommendations";
import TransferDispatchBoard from "@/components/admin/transfers/TransferDispatchBoard";
import TransferAnalyticsPanel from "@/components/admin/transfers/TransferAnalyticsPanel";
import BranchTransferRequestModal from "@/components/admin/transfers/BranchTransferRequestModal";
import TransportManagerDispatchModal from "@/components/admin/transfers/TransportManagerDispatchModal";

const { Text, Title } = Typography;

const EMPTY = {
  in_transit_trs: [],
  staged_by_hub: [],
  branches: [],
  pending_requests: [],
  kpis: {
    total_moving_trucks: 0,
    total_moving_parcels: 0,
    total_pending_requests: 0,
    total_parcels_waiting: 0,
    total_branches_active: 0,
  },
  reporting: {
    total_sorted_for_transfer: 0,
    total_in_transit_shipments: 0,
    total_transit_hub_shipments: 0,
    total_destination_received: 0,
    total_delivered_transfers: 0,
    delivered_today: 0,
    total_transfer_freight_kg: 0,
    total_active_containers: 0,
    total_staged_containers: 0,
  },
};

function formatClock(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function NetworkFlowDashboard({ branchId = null, onSelectTr }) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [activeSubView, setActiveSubView] = useState("live_map");
  const [branchSearch, setBranchSearch] = useState("");
  const [data, setData] = useState(EMPTY);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedBranchForRequest, setSelectedBranchForRequest] = useState(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedMapBranchId, setSelectedMapBranchId] = useState(branchId);
  const [showDemandArcs, setShowDemandArcs] = useState(true);
  const [demand, setDemand] = useState({ flows: [], matrix: [], branches: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNetworkOverview(branchId || selectedMapBranchId);
      setData({ ...EMPTY, ...(res || {}) });
      try {
        const demandRes = await getTransferDemand({ origin_branch_id: branchId || undefined });
        setDemand(demandRes || { flows: [], matrix: [], branches: [] });
      } catch {
        // Demand board has its own error state; don't fail the live tower.
      }
      setLoadError(null);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load live transfer data.";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [branchId, selectedMapBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  const {
    in_transit_trs = [],
    branches = [],
    pending_requests = [],
    kpis = {},
    metrics = {},
    reporting = {},
  } = data || {};

  const demandFlows = demand?.flows || [];
  const outboundByBranch = {};
  (demand?.matrix || []).forEach((row) => {
    outboundByBranch[row.origin_branch_id] = row.destinations || [];
  });

  const totals = { ...metrics, ...kpis };
  const currentBranch = branches.find((b) => Number(b.id) === Number(branchId));
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
            {r.code || r.transfer_number || r.manifest_number}
          </Text>
          <Tag color="processing" style={{ margin: 0, fontSize: 10 }}>
            {r.status || "In Transit"}
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
            Dispatched: {formatClock(r.dispatched_at)}
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
            <Text style={{ fontSize: 12 }}>{r.vehicle_number || r.vehicle_type || "Line-haul"}</Text>
          </Space>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.driver_name || "Unassigned"}
            </Text>
            {r.driver_phone || r.rider_phone ? (
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
      title: "Cargo",
      key: "cargo",
      align: "center",
      render: (_, r) => {
        const maxParcels = r.max_parcels || 800;
        const count = r.expected_count || r.parcel_count || 0;
        const pct = Math.min(100, Math.round((count / maxParcels) * 100));
        return (
          <Space direction="vertical" size={1} align="center">
            <Badge count={`${count} pkgs`} style={{ backgroundColor: "#0284c7" }} />
            <Text type="secondary" style={{ fontSize: 10 }}>
              {r.weight_kg ? `${r.weight_kg} kg · ` : ""}{pct}% of {maxParcels}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Progress / ETA",
      key: "eta",
      render: (_, r) => (
        <Space direction="vertical" size={1} style={{ minWidth: 120 }}>
          <Progress
            percent={Math.round((Number(r.progress) || 0) * 100)}
            size="small"
            strokeColor="#0284c7"
          />
          <Text strong style={{ color: "#059669", fontSize: 12 }}>
            <ClockCircleOutlined /> {formatClock(r.estimated_arrival_at)}
          </Text>
          <Text type="secondary" style={{ fontSize: 10 }}>
            Est. from dispatch time &amp; ETA
          </Text>
        </Space>
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_, r) => (
        <Button size="small" type="link" onClick={() => onSelectTr?.(r)}>
          View TR
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
            {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
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
          <Text strong>{r.parcel_count || 0} parcels ({r.total_weight_kg || 0} kg)</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>Vehicle: {(r.requested_vehicle_type || "van").toUpperCase()}</Text>
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
              Threshold Exceeded
            </Tag>
          </Tooltip>
        ) : r.urgency === "high" ? (
          <Tag color="warning">High</Tag>
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

  const branchTableColumns = [
    {
      title: "Branch",
      key: "branch",
      render: (_, b) => (
        <Space direction="vertical" size={1}>
          <Text strong>{b.name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{[b.city, b.district, b.province].filter(Boolean).join(", ")}</Text>
        </Space>
      ),
    },
    {
      title: "Waiting to Transfer",
      key: "outbound",
      render: (_, b) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ color: "#2563eb" }}>{b.pending_parcels || 0} parcels</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{b.pending_weight_kg || 0} kg</Text>
        </Space>
      ),
    },
    {
      title: "Inbound",
      key: "inbound",
      render: (_, b) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ color: "#059669" }}>{b.inbound_parcels || b.inbound_expected_parcels || 0} parcels</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{b.inbound_trs || 0} TR runs</Text>
        </Space>
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

  const branchCount = branches.length || Number(totals.total_branches_active || 0);
  const waitingCount = Number(totals.total_parcels_waiting || 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                ? `Outbound parcels waiting, incoming line-haul trucks, and dock activity for ${currentBranch.city || currentBranch.name}.`
                : "Live view of parcels waiting to transfer and line-haul TR runs currently on the road."}
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

      {loadError && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setLoadError(null)}
          message="Could not load live transfer data"
          description={loadError}
          action={<Button size="small" onClick={load}>Retry</Button>}
        />
      )}

      {branchId && currentBranch && (
        <Card size="small" style={{ borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <Row justify="space-between" align="middle" gutter={[12, 12]}>
            <Col xs={24} md={16}>
              <Space align="center" size={10}>
                <Badge count={`${currentBranch.pending_parcels || 0} pkgs`} style={{ backgroundColor: "#2563eb" }} />
                <div>
                  <Text strong style={{ fontSize: 13, color: "#166534" }}>
                    {currentBranch.name} ({[currentBranch.city, currentBranch.province].filter(Boolean).join(", ")})
                  </Text>
                  <div style={{ fontSize: 12, color: "#15803d" }}>
                    Outbound freight: <strong>{currentBranch.pending_parcels || 0} parcels ({currentBranch.pending_weight_kg || 0} kg)</strong> waiting to transfer.
                    {currentBranch.pending_weight_kg >= 80 && (
                      <Tag color="error" style={{ marginLeft: 6 }}>Threshold Exceeded (≥80 kg)</Tag>
                    )}
                  </div>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: "right" }}>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleOpenRequestModal(currentBranch)}
              >
                Request Vehicle Now
              </Button>
            </Col>
          </Row>

          {inboundToCurrentBranch.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #bbf7d0" }}>
              <Text strong style={{ fontSize: 12, color: "#166534" }}>
                <CarOutlined /> Inbound trucks en route to this dock ({inboundToCurrentBranch.length}):
              </Text>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                {inboundToCurrentBranch.map((tr) => (
                  <Tag key={tr.id} color="cyan" style={{ padding: "4px 8px" }}>
                    <strong>{tr.code || tr.transfer_number}</strong> from {tr.from_branch_name} | {tr.expected_count || tr.parcel_count || 0} pkgs | ETA: {formatClock(tr.estimated_arrival_at)}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #2563eb" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Moving Trucks (TR Runs)</span>}
              value={totals.total_moving_trucks || in_transit_trs.length || 0}
              prefix={<CarOutlined style={{ color: "#2563eb", marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 22 }}
              suffix={<span style={{ fontSize: 11, color: "#94a3b8" }}>on road</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #059669" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Moving Freight Load</span>}
              value={totals.total_moving_parcels || 0}
              prefix={<ThunderboltOutlined style={{ color: "#059669", marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 22 }}
              suffix={<span style={{ fontSize: 11, color: "#94a3b8" }}>parcels</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #0284c7" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Parcels waiting to transfer</span>}
              value={waitingCount}
              prefix={<InboxOutlined style={{ color: "#0284c7", marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 22, color: "#0284c7" }}
              suffix={<span style={{ fontSize: 11, color: "#94a3b8" }}>at branches</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #ea580c" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Branch Transfer Requests</span>}
              value={totals.total_pending_requests || pending_requests.length || 0}
              prefix={<SendOutlined style={{ color: "#ea580c", marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 22, color: "#ea580c" }}
              suffix={<span style={{ fontSize: 11, color: "#94a3b8" }}>waiting</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #7c3aed" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Active Nepal Branches</span>}
              value={branchCount}
              valueStyle={{ fontWeight: 700, fontSize: 22, color: "#7c3aed" }}
              prefix={<CompassOutlined style={{ color: "#7c3aed", marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 11, color: "#64748b" }}>live</span>}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeSubView}
        onChange={setActiveSubView}
        type="card"
        items={[
          {
            key: "live_map",
            label: (
              <span>
                <CompassOutlined /> Real-Time Nepal Map
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
            key: "demand",
            label: (
              <span>
                <InboxOutlined /> Transfer Demand
              </span>
            ),
          },
          {
            key: "recommendations",
            label: (
              <span>
                <ThunderboltOutlined /> Fleet recommendations
              </span>
            ),
          },
          {
            key: "dispatch_board",
            label: (
              <span>
                <ClusterOutlined /> Dispatch board
              </span>
            ),
          },
          {
            key: "reports",
            label: (
              <span>
                <BarChartOutlined /> Reporting & analytics
              </span>
            ),
          },
        ]}
      />

      {activeSubView === "live_map" && (
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Card
            size="small"
            title={
              <Space>
                <CompassOutlined style={{ color: "#2563eb" }} />
                <span style={{ fontWeight: 700 }}>Live line-haul runs ({in_transit_trs.length} on the road)</span>
                <Tag color="blue">Estimated position from dispatch time &amp; ETA</Tag>
              </Space>
            }
            extra={
              <Space>
                <span style={{ fontSize: 12, color: "#64748b" }}>Demand flows</span>
                <Switch size="small" checked={showDemandArcs} onChange={setShowDemandArcs} />
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => handleOpenRequestModal()}
                >
                  Request Vehicle
                </Button>
              </Space>
            }
            style={{ borderRadius: 10 }}
            styles={{ body: { padding: 4 } }}
          >
            <NepalTransferNetworkMap
              branches={branches}
              inTransitTrs={in_transit_trs}
              demandFlows={demandFlows}
              showDemandArcs={showDemandArcs}
              outboundByBranch={outboundByBranch}
              onRequestVehicle={(b) => handleOpenRequestModal(b)}
              onSelectBranch={(id) => setSelectedMapBranchId(id)}
              onSelectTr={onSelectTr}
              selectedBranchId={selectedMapBranchId}
              height={520}
            />
          </Card>

          <Card
            size="small"
            title={
              <Space>
                <CarOutlined style={{ color: "#2563eb" }} />
                <span style={{ fontWeight: 600 }}>Active line-haul runs</span>
              </Space>
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
        </Space>
      )}

      {activeSubView === "fleet_queue" && (
        <Card
          size="small"
          title={
            <Space>
              <SendOutlined style={{ color: "#ea580c" }} />
              <span style={{ fontWeight: 700 }}>Incoming Branch Transfer Requests</span>
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
              Estimated position from dispatch time &amp; ETA
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

      {activeSubView === "demand" && (
        <TransferDemandBoard branchId={branchId} onSelectOrigin={setSelectedMapBranchId} />
      )}

      {activeSubView === "recommendations" && (
        <TransferRecommendations branchId={branchId} onCreated={load} />
      )}

      {activeSubView === "dispatch_board" && (
        <TransferDispatchBoard branchId={branchId} />
      )}

      {activeSubView === "reports" && (

        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Card size="small" title="Live Transfer System Reporting" style={{ borderRadius: 10 }}>
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Ready for Transfer</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>
                    {reporting.ready_for_transfer ?? reporting.total_sorted_for_transfer ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>parcels waiting</Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>In Transit Freight</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#0891b2" }}>
                    {reporting.in_transit ?? reporting.total_in_transit_shipments ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>parcels moving</Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>At Transit Hubs</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#7c3aed" }}>
                    {reporting.at_hub ?? reporting.total_transit_hub_shipments ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>cross-docking</Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Arrived at Destination</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>
                    {reporting.arrived_at_destination ?? reporting.total_destination_received ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>ready for last mile</Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Delivered Today</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>
                    {reporting.delivered_today ?? reporting.total_delivered_transfers ?? 0}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>completed transfers</Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: "center", padding: "10px 6px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Transfer Weight</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#ea580c" }}>
                    {reporting.total_transfer_freight_kg ?? 0} kg
                  </div>
                  <Text type="secondary" style={{ fontSize: 10 }}>waiting + moving</Text>
                </div>
              </Col>
            </Row>
          </Card>

          <TransferAnalyticsPanel />

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
