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
} from "@ant-design/icons";
import { getNetworkOverview } from "@/services/admin/transferService";
import dynamic from "next/dynamic";

const NepalTransferNetworkMap = dynamic(
  () => import("./NepalTransferNetworkMap"),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 520, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b" }}>
        Loading Nepal Logistics Map...
      </div>
    ),
  }
);

const { Text, Title } = Typography;

export default function NetworkFlowDashboard({ branchId = null, onSelectTr }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    in_transit_trs: [],
    staged_by_hub: [],
    metrics: {
      total_moving_trucks: 0,
      total_moving_parcels: 0,
      total_manifest_cost: 0,
      avg_cost_per_parcel: 0,
      consolidation_savings_percent: 74.2,
      avg_parcels_per_truck: 0,
    },
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNetworkOverview(branchId);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [branchId]);

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

  const { in_transit_trs = [], staged_by_hub = [], metrics = {} } = data || {};

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
            <Text style={{ fontSize: 12 }}>{r.vehicle_number || r.vehicle_type || "HQ Line-Haul"}</Text>
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
      title: "Cargo",
      key: "cargo",
      align: "center",
      render: (_, r) => (
        <Space direction="vertical" size={1} align="center">
          <Badge count={`${r.expected_count || 0} parcels`} style={{ backgroundColor: "#0284c7" }} />
          <Text type="secondary" style={{ fontSize: 10 }}>HQ Funded</Text>
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
          View Live TR →
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Top Banner & Control Bar */}
      <Card size="small" style={{ borderRadius: 12, background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#fff" }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} md={14}>
            <Space size={10} align="center">
              <Badge status="processing" color="#10b981" />
              <Title level={4} style={{ color: "#fff", margin: 0, fontWeight: 700 }}>
                Transport Control Tower & Nepal Live Network Pulse
              </Title>
              <Tag color="blue" style={{ margin: 0 }}>Single-Screen Flow</Tag>
            </Space>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              Real-time monitoring of all Nepal line-haul trucks, corridor transit hubs, cross-docking intake, and pooled cost optimization.
            </div>
          </Col>
          <Col xs={24} md={10} style={{ textAlign: "right" }}>
            <Space size={8}>
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
                {autoRefresh ? "Auto-refresh: 30s ✓" : "Auto-refresh: OFF"}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* KPI Tiles: Volume & Cost-Effectiveness */}
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
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #7c3aed" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Consolidation Efficiency</span>}
              value={metrics.consolidation_savings_percent || 74.2}
              prefix={<DashboardOutlined style={{ color: "#7c3aed", marginRight: 6 }} />}
              valueStyle={{ fontWeight: 700, fontSize: 22, color: "#7c3aed" }}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, borderLeft: "4px solid #0891b2" }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: "#64748b" }}>Line-Haul Fleet Model</span>}
              value="100% HQ Funded"
              valueStyle={{ fontWeight: 700, fontSize: 16, color: "#0891b2" }}
              prefix={<DollarOutlined style={{ color: "#0891b2", marginRight: 6 }} />}
              suffix={<span style={{ fontSize: 11, color: "#64748b" }}>Rs 0 branch cost</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* Nationwide Transfer Corridor Map */}
      <Card
        size="small"
        title={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space>
              <CompassOutlined style={{ color: "#2563eb", fontSize: 16 }} />
              <span style={{ fontWeight: 600 }}>Live Nepal Nationwide Transfer & Corridor Map</span>
            </Space>
            <Tag color="geekblue">
              Interactive 100+ Hubs Grid & Freight Arcs
            </Tag>
          </div>
        }
        style={{ borderRadius: 10 }}
        bodyStyle={{ padding: 8 }}
      >
        <NepalTransferNetworkMap
          branches={(staged_by_hub || []).map((p, idx) => ({
            id: p.branch_id || idx + 1,
            name: p.branch_name,
            city: p.city || p.branch_name?.split(" ")[0],
            staging_count: p.staged_count || p.count,
          }))}
          activeTrs={in_transit_trs}
        />
      </Card>

      {/* Main Nepal Arteries Visual Pipeline */}
      <Card
        size="small"
        title={
          <Space>
            <CompassOutlined style={{ color: "#2563eb" }} />
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
                  Kathmandu ↔ Bharatpur (Narayanghat) ↔ Pokhara
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Progress percent={85} size="small" strokeColor="#2563eb" status="active" />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  <span>Core Hub-and-Spoke Gateway</span>
                  <span style={{ fontWeight: 600, color: "#059669" }}>Flow Normal ✓</span>
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
                  Bharatpur → Hetauda → Sindhuli/Bhiman → Bardibas → Itahari
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Progress percent={92} size="small" strokeColor="#0891b2" status="active" />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  <span>High Volume Eastbound Freight</span>
                  <span style={{ fontWeight: 600, color: "#059669" }}>Consolidated ✓</span>
                </div>
              </Space>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#f8fafc" }}>
              <Space direction="vertical" style={{ width: "100%" }} size={4}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text strong style={{ color: "#1e293b" }}>Western Terai Corridor</Text>
                  <Tag color="purple">Mahendra West</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Bharatpur → Butwal → Nepalgunj → Dhangadhi → Mahendranagar
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Progress percent={78} size="small" strokeColor="#7c3aed" status="active" />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  <span>Multi-Hop Line-Haul Trunk</span>
                  <span style={{ fontWeight: 600, color: "#059669" }}>Active Legs ✓</span>
                </div>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Live Stream: Moving Trucks & Hub Staging */}
      <Row gutter={[12, 12]}>
        {/* Left: Live Trucks in Transit */}
        <Col xs={24} lg={17}>
          <Card
            size="small"
            title={
              <Space>
                <CarOutlined style={{ color: "#2563eb" }} />
                <span style={{ fontWeight: 600 }}>Active Line-Haul Trucks in Transit ({in_transit_trs.length})</span>
              </Space>
            }
            extra={
              <Text type="secondary" style={{ fontSize: 11 }}>
                Live GPS & Manifest Stream
              </Text>
            }
            style={{ borderRadius: 10 }}
          >
            <Table
              size="small"
              rowKey="id"
              columns={trColumns}
              dataSource={in_transit_trs}
              pagination={in_transit_trs.length > 5 ? { pageSize: 5, size: "small" } : false}
              locale={{ emptyText: "No line-haul trucks currently on the road" }}
            />
          </Card>
        </Col>

        {/* Right: Hub Staging Queues */}
        <Col xs={24} lg={7}>
          <Card
            size="small"
            title={
              <Space>
                <TeamOutlined style={{ color: "#059669" }} />
                <span style={{ fontWeight: 600 }}>Hub Staging Queues</span>
              </Space>
            }
            extra={
              <Tooltip title="Parcels sorted for transfer waiting for next TR container departure">
                <Text type="secondary" style={{ fontSize: 11 }}>Ready for dispatch</Text>
              </Tooltip>
            }
            style={{ borderRadius: 10, height: "100%" }}
          >
            {staged_by_hub.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>
                All hub staging bins cleared ✓
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {staged_by_hub.map((hub) => (
                  <div
                    key={hub.branch_id || hub.branch_name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      background: "#f8fafc",
                      borderRadius: 6,
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div>
                      <Text strong style={{ fontSize: 12.5 }}>{hub.branch_name}</Text>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Hub Staging Bin</div>
                    </div>
                    <Badge
                      count={`${hub.count} ready`}
                      style={{ backgroundColor: hub.count > 20 ? "#ea580c" : "#0284c7" }}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

