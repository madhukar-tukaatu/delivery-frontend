"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Input,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
  Collapse,
  Radio,
  Spin,
  message,
} from "antd";
import {
  CalculatorOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  CarOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  CopyOutlined,
  TableOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
  ApartmentOutlined,
  CarFilled,
} from "@ant-design/icons";
import Link from "next/link";
import api from "@/lib/api";
import { formatRs } from "@/components/admin/billing/financeKit";
import SettlementDiagram from "@/components/admin/billing/SettlementDiagram";

const { Text, Paragraph } = Typography;

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

export default function SettlementSimulator({ branches = [], activeRules }) {
  const [loading, setLoading] = useState(false);

  // Form State
  const [originId, setOriginId] = useState(null);
  const [destId, setDestId] = useState(null);
  const [transitIds, setTransitIds] = useState([]);

  // System Configured Routes for the Corridor
  const [routesList, setRoutesList] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [customTransitOverride, setCustomTransitOverride] = useState(false);

  const [weightKg, setWeightKg] = useState(2.5);
  const [isFragile, setIsFragile] = useState(false);
  const [serviceType, setServiceType] = useState("standard");
  const [distanceKm, setDistanceKm] = useState(10.0);
  const [productPricePod, setProductPricePod] = useState(2400);

  // Transfer Hops
  const [hops, setHops] = useState([]);

  // Simulation Result
  const [result, setResult] = useState(null);
  const [roleView, setRoleView] = useState("hq");

  // View Mode: 'diagram' | 'table' | 'compact'
  const [viewMode, setViewMode] = useState("diagram");

  // Dynamic Rule Overrides
  const [transitFeeMode, setTransitFeeMode] = useState("fixed");
  const [transitFeeAmount, setTransitFeeAmount] = useState(10.0);
  const [originBasePct, setOriginBasePct] = useState(30.0);
  const [destBasePct, setDestBasePct] = useState(70.0);
  const [hqCommPct, setHqCommPct] = useState(5.0);
  const [weightHqPct, setWeightHqPct] = useState(50.0);

  // Helper to build direct transfer hops
  const syncDirectHops = useCallback((oId, dId) => {
    if (!oId || !dId || oId === dId) {
      setHops([]);
      return;
    }
    setHops([
      {
        transfer_number: "TR-001",
        from_branch_id: oId,
        to_branch_id: dId,
        trip_transport_cost: 900,
        total_shipments_on_tr: 20,
        distance_km: null,
        transport_mode: "road",
      },
    ]);
  }, []);

  // Helper to apply a route from the system
  const applyRoute = useCallback((route, oId, dId) => {
    if (!route) {
      syncDirectHops(oId, dId);
      return;
    }

    const tIds = Array.isArray(route.transit_branch_ids) ? route.transit_branch_ids : [];
    setTransitIds(tIds);

    // Build hops from route.lanes or route.path
    if (route.lanes && route.lanes.length > 0) {
      const newHops = route.lanes.map((lm, idx) => {
        const lane = lm.lane || {};
        return {
          transfer_number: `TR-00${idx + 1}`,
          from_branch_id: lane.from_branch_id,
          to_branch_id: lane.to_branch_id,
          trip_transport_cost: idx === 0 ? 900 : 600,
          total_shipments_on_tr: idx === 0 ? 20 : 10,
          distance_km: lane.distance_km,
          transport_mode: lane.transport_mode || "road",
        };
      });
      setHops(newHops);
    } else if (route.path && route.path.length > 1) {
      const newHops = [];
      for (let i = 0; i < route.path.length - 1; i++) {
        newHops.push({
          transfer_number: `TR-00${i + 1}`,
          from_branch_id: route.path[i].id,
          to_branch_id: route.path[i + 1].id,
          trip_transport_cost: i === 0 ? 900 : 600,
          total_shipments_on_tr: i === 0 ? 20 : 10,
          distance_km: null,
          transport_mode: route.path[i + 1]?.transport_mode || "road",
        });
      }
      setHops(newHops);
    } else {
      const chain = [oId, ...tIds, dId].filter(Boolean);
      const newHops = [];
      for (let i = 0; i < chain.length - 1; i++) {
        newHops.push({
          transfer_number: `TR-00${i + 1}`,
          from_branch_id: chain[i],
          to_branch_id: chain[i + 1],
          trip_transport_cost: i === 0 ? 900 : 600,
          total_shipments_on_tr: i === 0 ? 20 : 10,
          distance_km: null,
          transport_mode: "road",
        });
      }
      setHops(newHops);
    }
  }, [syncDirectHops]);

  // Query system routes for the selected corridor
  const fetchCorridorRoutes = useCallback(
    async (oId, dId, sType) => {
      if (!oId || !dId || oId === dId) {
        setRoutesList([]);
        setSelectedRouteId(null);
        setSelectedRoute(null);
        setTransitIds([]);
        setHops([]);
        return;
      }

      setRoutesLoading(true);
      try {
        const res = unwrap(
          await api.get("/admin/branch-shares/routes", {
            params: {
              origin_branch_id: oId,
              destination_branch_id: dId,
              service_type: sType !== "all" ? sType : undefined,
            },
          })
        );

        const rList = res?.routes || [];
        setRoutesList(rList);

        const defaultRt = res?.default_route || rList.find((r) => r.is_default) || rList[0] || null;
        if (defaultRt) {
          setSelectedRouteId(defaultRt.id || defaultRt.route_id);
          setSelectedRoute(defaultRt);
          applyRoute(defaultRt, oId, dId);
        } else {
          setSelectedRouteId(null);
          setSelectedRoute(null);
          setTransitIds([]);
          syncDirectHops(oId, dId);
        }
      } catch (err) {
        console.error("Could not fetch transfer routes:", err);
        syncDirectHops(oId, dId);
      } finally {
        setRoutesLoading(false);
      }
    },
    [applyRoute, syncDirectHops]
  );

  // Auto-init origin and dest when branches load
  useEffect(() => {
    if (branches && branches.length > 0) {
      let oId = originId;
      let dId = destId;
      if (!oId) {
        const ktm = branches.find((b) => /ktm|kathmandu/i.test(b.name || b.code)) || branches[0];
        oId = ktm?.id || branches[0]?.id;
        setOriginId(oId);
      }
      if (!dId) {
        const other = branches.find((b) => b.id !== oId) || branches[1] || branches[0];
        dId = other?.id || oId;
        setDestId(dId);
      }
      fetchCorridorRoutes(oId, dId, serviceType);
    }
  }, [branches]);

  function handleOriginChange(id) {
    setOriginId(id);
    setCustomTransitOverride(false);
    fetchCorridorRoutes(id, destId, serviceType);
  }

  function handleDestChange(id) {
    setDestId(id);
    setCustomTransitOverride(false);
    fetchCorridorRoutes(originId, id, serviceType);
  }

  function handleServiceTypeChange(type) {
    setServiceType(type);
    fetchCorridorRoutes(originId, destId, type);
  }

  function handleRouteChange(routeId) {
    setSelectedRouteId(routeId);
    const rt = routesList.find((r) => (r.id || r.route_id) === routeId);
    if (rt) {
      setSelectedRoute(rt);
      applyRoute(rt, originId, destId);
      message.success(`Applied transfer route: ${rt.name || rt.route_code}`);
    }
  }

  function handleTransitChange(ids) {
    setTransitIds(ids);
    const chain = [originId, ...(ids || []).filter(Boolean), destId].filter(Boolean);
    const newHops = [];
    for (let i = 0; i < chain.length - 1; i++) {
      newHops.push({
        transfer_number: `TR-00${i + 1}`,
        from_branch_id: chain[i],
        to_branch_id: chain[i + 1],
        trip_transport_cost: i === 0 ? 900 : 600,
        total_shipments_on_tr: i === 0 ? 20 : 10,
        distance_km: null,
        transport_mode: "road",
      });
    }
    setHops(newHops);
  }

  function updateHop(idx, key, val) {
    setHops((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: val };
      return copy;
    });
  }

  function addHop() {
    setHops((prev) => [
      ...prev,
      {
        transfer_number: `TR-00${prev.length + 1}`,
        from_branch_id: prev[prev.length - 1]?.to_branch_id || originId,
        to_branch_id: destId,
        trip_transport_cost: 500,
        total_shipments_on_tr: 10,
      },
    ]);
  }

  function removeHop(idx) {
    setHops((prev) => prev.filter((_, i) => i !== idx));
  }

  function resetDynamicSettings() {
    setTransitFeeMode("fixed");
    setTransitFeeAmount(10.0);
    setOriginBasePct(30.0);
    setDestBasePct(70.0);
    setHqCommPct(5.0);
    setWeightHqPct(50.0);
    message.info("Dynamic settings reset to system defaults.");
  }

  async function runSimulation() {
    if (!originId || !destId) {
      message.error("Please select both origin and destination branches.");
      return;
    }

    setLoading(true);
    try {
      const validHops = (hops || []).filter(
        (h) => h && h.from_branch_id && h.to_branch_id && Number(h.from_branch_id) > 0 && Number(h.to_branch_id) > 0
      );

      // Build merged custom rules payload
      const customRules = {
        ...(activeRules || {}),
        transfer_delivery: {
          ...((activeRules && activeRules.transfer_delivery) || {}),
          dest_local_base_share: {
            origin_percent: originBasePct,
            delivery_percent: destBasePct,
          },
          extra_weight_split: {
            hq_percent: weightHqPct,
            branch_origin_percent: 30.0,
            branch_delivery_percent: 70.0,
          },
          transit_handling_fee: {
            mode: transitFeeMode,
            fixed_amount_per_branch: transitFeeAmount,
          },
          hq_commission_percent: hqCommPct,
        },
      };

      const payload = {
        origin_branch_id: originId,
        destination_branch_id: destId,
        transfer_route_id: selectedRouteId || undefined,
        transit_branch_ids: transitIds || [],
        weight_kg: weightKg,
        is_fragile: isFragile,
        service_type: serviceType,
        delivery_distance_km: distanceKm,
        product_price_pod: productPricePod,
        transfer_hops: validHops,
        rules: customRules,
        hq_commission_percent: hqCommPct,
      };

      const d = unwrap(await api.post("/admin/branch-shares/simulate", payload));
      setResult(d);
      message.success("Simulation calculated successfully.");
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to calculate simulation.");
    } finally {
      setLoading(false);
    }
  }

  const branchOptions = useMemo(
    () =>
      (branches || []).map((b) => ({
        label: `${b.name} (${b.code || `#${b.id}`})`,
        value: b.id,
      })),
    [branches]
  );

  const originBranchObj = useMemo(() => branches.find((b) => b.id === originId), [branches, originId]);
  const destBranchObj = useMemo(() => branches.find((b) => b.id === destId), [branches, destId]);

  // Derived transit branches from IDs
  const transitBranchesList = useMemo(() => {
    return (transitIds || [])
      .map((tid) => branches.find((b) => b.id === tid))
      .filter(Boolean);
  }, [branches, transitIds]);

  const ledgerCols = [
    {
      title: "Branch",
      dataIndex: "branch_name",
      key: "branch_name",
      render: (v, r) => (
        <Space>
          <Text strong style={{ fontSize: 13 }}>{v}</Text>
          <Tag color={r.role === "origin" ? "purple" : r.role === "transit" ? "cyan" : "blue"}>
            {r.role ? r.role.toUpperCase() : "BRANCH"}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Operation / Role",
      dataIndex: "role",
      key: "role",
      render: (v) => {
        if (v === "origin") return <Text type="secondary" style={{ fontSize: 12 }}>Booking, Manifesting & Invoicing</Text>;
        if (v === "transit") return <Text type="secondary" style={{ fontSize: 12 }}>Mid-Hub Cross-Docking & Sorting</Text>;
        return <Text type="secondary" style={{ fontSize: 12 }}>Last-Mile Handover & POD Cash Collection</Text>;
      },
    },
    {
      title: "Gross Share",
      dataIndex: "allocation_amount",
      key: "allocation_amount",
      align: "right",
      render: (v) => <Text strong style={{ fontSize: 13 }}>{formatRs(v)}</Text>,
    },
    {
      title: "5% HQ Commission",
      dataIndex: "hq_commission_amount",
      key: "hq_commission_amount",
      align: "right",
      render: (v, r) => (
        <Space direction="vertical" size={0} align="end">
          <Text type="danger">-{formatRs(v)}</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>{r.hq_rate}%</Text>
        </Space>
      ),
    },
    {
      title: "Net Branch Payout",
      dataIndex: "net_amount",
      key: "net_amount",
      align: "right",
      render: (v) => (
        <Text strong style={{ color: "#389e0d", fontSize: 14 }}>
          {formatRs(v)}
        </Text>
      ),
    },
  ];

  function copyExecutiveSummary() {
    if (!result) return;
    const cf = result.cash_flow || {};
    const p = result.pricing || {};
    const s = result.settlement || {};
    const originR = s.rows?.find((r) => r.role === "origin");
    const destR = s.rows?.find((r) => r.role === "delivery");
    const transits = s.rows?.filter((r) => r.role === "transit") || [];

    const summaryText = `DELIVERY SETTLEMENT SUMMARY:
Route: ${cf.delivery_invoice_by} -> ${transits.map((t) => t.branch_name).join(" -> ") || "Direct"} -> ${cf.doorstep_collected_by}
Doorstep Cash: Rs ${cf.doorstep_collected_amount} (Product COD: Rs ${p.product_price_pod} + Fare: Rs ${p.total_delivery_fare})
--------------------------------------------------
1. Destination Branch (${destR?.branch_name}): Receives Rs ${destR?.net_amount} Net Delivery Share
2. Origin Branch (${originR?.branch_name}): Invoices Rs ${p.total_delivery_fare}, keeps Rs ${originR?.net_amount} Net, remits Rs ${cf.inter_branch_transfers?.find((t) => t.role === "hq")?.amount} to HQ
3. Transit Hubs: ${transits.length > 0 ? transits.map((t) => `${t.branch_name} gets Rs ${t.net_amount}`).join(", ") : "0 Transit (Rs 0)"}
4. SuperAdmin / HQ: Retains Rs ${s.hq_total} Net (finances line-haul fleet and driver logistics)
--------------------------------------------------
Status: 100% Balanced. Total Disbursed: Rs ${p.total_delivery_fare}`;

    navigator.clipboard?.writeText(summaryText);
    message.success("Executive settlement summary copied to clipboard.");
  }

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      {/* Input Form Card */}
      <Card
        title={
          <Row justify="space-between" align="middle" style={{ width: "100%" }}>
            <Col>
              <Space>
                <CalculatorOutlined style={{ color: "#1677ff", fontSize: 18 }} />
                <span style={{ fontWeight: "bold", fontSize: 16 }}>Delivery Settlement Simulator & Real-Time Engine</span>
              </Space>
            </Col>
            <Col>
              <Button type="primary" size="large" icon={<PlayCircleOutlined />} loading={loading} onClick={runSimulation}>
                Run Simulation
              </Button>
            </Col>
          </Row>
        }
      >
        <Row gutter={[20, 20]}>
          {/* Column 1: Route Selection & Configured Transfer Routes */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              title={
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space>
                      <NodeIndexOutlined style={{ color: "#1677ff" }} />
                      <Text strong>1. Route & Corridor Selection</Text>
                    </Space>
                  </Col>
                  <Col>
                    <Link href="/admin/branch-transfer-routes" target="_blank" style={{ fontSize: 11 }}>
                      Manage Admin Routes →
                    </Link>
                  </Col>
                </Row>
              }
              style={{ height: "100%", background: "#fafafa" }}
            >
              <Space direction="vertical" size={14} style={{ width: "100%" }}>
                {/* Origin Branch */}
                <div>
                  <Text strong style={{ fontSize: 12 }}>Origin Branch (Booking & Invoicing):</Text>
                  <Select
                    showSearch
                    placeholder="Select origin branch"
                    style={{ width: "100%", marginTop: 4 }}
                    options={branchOptions}
                    value={originId}
                    onChange={handleOriginChange}
                    filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                  />
                </div>

                {/* Destination Branch */}
                <div>
                  <Text strong style={{ fontSize: 12 }}>Destination (Delivering) Branch:</Text>
                  <Select
                    showSearch
                    placeholder="Select destination branch"
                    style={{ width: "100%", marginTop: 4 }}
                    options={branchOptions}
                    value={destId}
                    onChange={handleDestChange}
                    filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                  />
                </div>

                {/* System Configured Routes for the corridor */}
                <div style={{ marginTop: 4 }}>
                  <Row justify="space-between" align="middle" style={{ marginBottom: 6 }}>
                    <Col>
                      <Space>
                        <ApartmentOutlined style={{ color: "#0958d9" }} />
                        <Text strong style={{ fontSize: 12 }}>
                          System Transfer Routes ({routesLoading ? "Loading..." : routesList.length}):
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      {routesList.length > 1 && (
                        <Tag color="blue">{routesList.length} Options Configured</Tag>
                      )}
                      {routesList.length === 1 && (
                        <Tag color="green">1 Active Route</Tag>
                      )}
                    </Col>
                  </Row>

                  {routesLoading ? (
                    <div style={{ padding: "16px 0", textAlign: "center", background: "#f8fafc", borderRadius: 6 }}>
                      <Spin size="small" tip="Resolving system transfer routes for this corridor..." />
                    </div>
                  ) : routesList.length > 0 ? (
                    <Radio.Group
                      value={selectedRouteId}
                      onChange={(e) => handleRouteChange(e.target.value)}
                      style={{ width: "100%" }}
                    >
                      <Space direction="vertical" style={{ width: "100%" }} size={8}>
                        {routesList.map((rt) => {
                          const rId = rt.id || rt.route_id;
                          const isSelected = selectedRouteId === rId;
                          const isDef = Boolean(rt.is_default);

                          return (
                            <div
                              key={rId}
                              onClick={() => handleRouteChange(rId)}
                              style={{
                                cursor: "pointer",
                                border: `1.5px solid ${isSelected ? "#2563eb" : "#e2e8f0"}`,
                                background: isSelected ? "#eff6ff" : "#ffffff",
                                borderRadius: 6,
                                padding: "8px 12px",
                                transition: "all 0.2s",
                              }}
                            >
                              <Row justify="space-between" align="middle">
                                <Col>
                                  <Space>
                                    <Radio value={rId} />
                                    <Text strong style={{ fontSize: 13, color: isSelected ? "#1d4ed8" : "#1e293b" }}>
                                      {rt.name || rt.route_code}
                                    </Text>
                                    {isDef && <Tag color="green">★ Primary (Default)</Tag>}
                                    {!isDef && <Tag color="default">Optional Route</Tag>}
                                    <Tag color={rt.service_type === "express" ? "orange" : rt.service_type === "same_day" ? "red" : "blue"}>
                                      {(rt.service_type || "standard").toUpperCase()}
                                    </Tag>
                                  </Space>
                                </Col>
                                <Col>
                                  <Space size={8}>
                                    {rt.total_distance_km && (
                                      <Text type="secondary" style={{ fontSize: 11 }}>
                                        {Number(rt.total_distance_km).toFixed(1)} km
                                      </Text>
                                    )}
                                    {rt.total_estimated_hours && (
                                      <Text type="secondary" style={{ fontSize: 11 }}>
                                        ~{rt.total_estimated_hours}h
                                      </Text>
                                    )}
                                    <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
                                      {rt.transit_count > 0 ? `${rt.transit_count} Transit Hub(s)` : "Direct Transfer"}
                                    </Tag>
                                  </Space>
                                </Col>
                              </Row>

                              <div style={{ marginTop: 4, paddingLeft: 24, fontSize: 11.5, color: "#475569" }}>
                                <Text type="secondary">Corridor: </Text>
                                <span>{rt.path_text || rt.name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </Space>
                    </Radio.Group>
                  ) : (
                    <Alert
                      type="info"
                      showIcon
                      style={{ fontSize: 12 }}
                      message="Direct Inter-Branch Corridor (No Multi-Hub Route Configured)"
                      description={
                        <div>
                          <span>
                            No multi-lane transfer route is configured in <strong>Admin → Transfer Routes</strong> for this branch pair. The simulator defaults to a direct 2-branch corridor.
                          </span>
                          <div style={{ marginTop: 6 }}>
                            <Space>
                              <Button
                                size="small"
                                type="dashed"
                                onClick={() => setCustomTransitOverride(!customTransitOverride)}
                              >
                                {customTransitOverride ? "Hide Custom Transit Hubs" : "+ Simulate Custom Transit Hubs"}
                              </Button>
                              <Link href="/admin/branch-transfer-routes" target="_blank">
                                <Button size="small" type="link">Configure New Transfer Route →</Button>
                              </Link>
                            </Space>
                          </div>
                        </div>
                      }
                    />
                  )}
                </div>

                {/* Custom Transit Hubs Override (Only if explicitly toggled) */}
                {customTransitOverride && (
                  <div style={{ background: "#fefce8", border: "1px dashed #fde047", padding: 10, borderRadius: 6 }}>
                    <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                      <Col><Text strong style={{ fontSize: 12 }}>Custom Transit Hub(s) in Sequence:</Text></Col>
                      <Col>
                        <Button size="small" type="text" danger onClick={() => setCustomTransitOverride(false)}>
                          Cancel Override
                        </Button>
                      </Col>
                    </Row>
                    <Select
                      mode="multiple"
                      showSearch
                      placeholder="Select intermediate transit hubs"
                      style={{ width: "100%" }}
                      options={branchOptions.filter((b) => b.value !== originId && b.value !== destId)}
                      value={transitIds}
                      onChange={handleTransitChange}
                      filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                    />
                    <Text type="secondary" style={{ fontSize: 10.5, display: "block", marginTop: 2 }}>
                      Overrides the system transfer route with manual ad-hoc transit hubs.
                    </Text>
                  </div>
                )}
              </Space>
            </Card>
          </Col>

          {/* Column 2: Package & Pricing Specs */}
          <Col xs={24} md={12}>
            <Card size="small" title="2. Package & Pricing Specs" style={{ height: "100%", background: "#fafafa" }}>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Row align="middle" justify="space-between">
                  <Col><Text strong>Product COD / POD Amount:</Text></Col>
                  <Col>
                    <InputNumber
                      min={0}
                      step={500}
                      prefix="Rs"
                      value={productPricePod}
                      onChange={setProductPricePod}
                      style={{ width: 160 }}
                    />
                  </Col>
                </Row>

                <Row align="middle" justify="space-between">
                  <Col><Text strong>Weight (kg):</Text></Col>
                  <Col>
                    <InputNumber
                      min={0.1}
                      max={100}
                      step={0.5}
                      value={weightKg}
                      addonAfter="kg"
                      onChange={setWeightKg}
                      style={{ width: 160 }}
                    />
                  </Col>
                </Row>

                <Row align="middle" justify="space-between">
                  <Col>
                    <Text strong>Delivery Distance from Branch:</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                      First 5.0 km included free; excess distance billed @ NPR 6.00/km (from active pricing settings).
                    </Text>
                  </Col>
                  <Col>
                    <InputNumber
                      min={0}
                      max={200}
                      step={1}
                      value={distanceKm}
                      addonAfter="km"
                      onChange={setDistanceKm}
                      style={{ width: 160 }}
                    />
                  </Col>
                </Row>

                <Row align="middle" justify="space-between">
                  <Col><Text strong>Service Type:</Text></Col>
                  <Col>
                    <Select
                      style={{ width: 160 }}
                      value={serviceType}
                      onChange={handleServiceTypeChange}
                      options={[
                        { label: "Standard", value: "standard" },
                        { label: "Express", value: "express" },
                        { label: "Same Day", value: "same_day" },
                      ]}
                    />
                  </Col>
                </Row>

                <Row align="middle" justify="space-between">
                  <Col>
                    <Text strong>Fragile Parcel:</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                      Applies fragile handling multiplier (x1.05)
                    </Text>
                  </Col>
                  <Col>
                    <Switch checked={isFragile} onChange={setIsFragile} />
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* ================= SHIPMENT FLOW PIPELINE VISUALIZATION ================= */}
        <Divider style={{ margin: "16px 0 12px 0" }} />
        <Card
          size="small"
          styles={{ body: { padding: "12px 16px" } }}
          style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8 }}
        >
          <Row justify="space-between" align="middle" style={{ marginBottom: 10 }}>
            <Col>
              <Space>
                <ApartmentOutlined style={{ color: "#2563eb", fontSize: 16 }} />
                <Text strong style={{ fontSize: 13, color: "#1e293b" }}>
                  Operational Shipment & Line-Haul Flow:
                </Text>
                {selectedRoute && (
                  <Tag color="blue">{selectedRoute.name || selectedRoute.route_code}</Tag>
                )}
                {selectedRoute?.service_type && (
                  <Tag color="cyan">{selectedRoute.service_type.toUpperCase()}</Tag>
                )}
              </Space>
            </Col>
            <Col>
              <Space size={12}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Total Corridor: <strong>{hops.length} Leg(s) / TR Manifest(s)</strong>
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Transit Stops: <strong>{transitIds.length} Mid-Hub(s)</strong>
                </Text>
              </Space>
            </Col>
          </Row>

          {/* Step Pipeline */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            {/* 1. Origin Node */}
            <div
              style={{
                flex: "1 1 200px",
                background: "#faf5ff",
                border: "1.5px solid #d8b4fe",
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>
                1. BOOKING & INVOICING
              </Tag>
              <div style={{ fontWeight: "bold", fontSize: 13, color: "#6b21a8", marginTop: 4 }}>
                {originBranchObj?.name || "Origin Branch"}
              </div>
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                Packages parcel & invoices merchant
              </Text>
            </div>

            {/* In-Between Legs and Transit Hubs */}
            {hops.map((hop, idx) => {
              const toBranch = branches.find((b) => b.id === hop.to_branch_id);
              const isFinal = idx === hops.length - 1;

              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto" }}>
                  {/* Line-haul Arrow / Manifest */}
                  <div style={{ textAlign: "center", minWidth: 100, padding: "0 4px" }}>
                    <div style={{ fontSize: 10.5, fontWeight: "bold", color: "#7c3aed" }}>
                      <CarFilled /> {hop.transfer_number}
                    </div>
                    <ArrowRightOutlined style={{ color: "#94a3b8", fontSize: 14 }} />
                    <div style={{ fontSize: 9.5, color: "#64748b" }}>
                      Line-Haul Fleet
                    </div>
                  </div>

                  {/* If not final, it's a Transit Hub */}
                  {!isFinal && (
                    <div
                      style={{
                        flex: "1 1 180px",
                        background: "#ecfeff",
                        border: "1.5px solid #a5f3fc",
                        borderRadius: 6,
                        padding: "8px 12px",
                      }}
                    >
                      <Row justify="space-between" align="middle">
                        <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>
                          TRANSIT HUB #{idx + 1}
                        </Tag>
                        <Tag color="geekblue" style={{ margin: 0, fontSize: 9.5 }}>
                          Rs 10 Handling Fee
                        </Tag>
                      </Row>
                      <div style={{ fontWeight: "bold", fontSize: 13, color: "#0e7490", marginTop: 4 }}>
                        {toBranch?.name || `Branch #${hop.to_branch_id}`}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        Inbound scan, sorting & cross-docking
                      </Text>
                    </div>
                  )}

                  {/* If final, it's Destination Hub */}
                  {isFinal && (
                    <div
                      style={{
                        flex: "1 1 200px",
                        background: "#eff6ff",
                        border: "1.5px solid #93c5fd",
                        borderRadius: 6,
                        padding: "8px 12px",
                      }}
                    >
                      <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
                        {hops.length + 1}. DELIVERY & CASH POD
                      </Tag>
                      <div style={{ fontWeight: "bold", fontSize: 13, color: "#1d4ed8", marginTop: 4 }}>
                        {destBranchObj?.name || "Delivery Branch"}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        Last-mile rider handover & cash collect
                      </Text>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Dynamic Rules Override Accordion */}
        <Collapse
          ghost
          style={{ marginTop: 12 }}
          items={[
            {
              key: "1",
              label: (
                <Row justify="space-between" align="middle" style={{ width: "100%" }}>
                  <Col>
                    <Space>
                      <ThunderboltOutlined style={{ color: "#1677ff" }} />
                      <Text strong style={{ color: "#0958d9" }}>
                        ⚡ Quick Dynamic Rules & Commission Settings (Live Overrides)
                      </Text>
                      <Tag color="blue">Transit Fee: Rs {transitFeeAmount}</Tag>
                      <Tag color="cyan">Base: {originBasePct}/{destBasePct}%</Tag>
                      <Tag color="purple">HQ Comm: {hqCommPct}%</Tag>
                    </Space>
                  </Col>
                  <Col>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetDynamicSettings();
                      }}
                    >
                      Reset Defaults
                    </Button>
                  </Col>
                </Row>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={6}>
                    <Text strong style={{ fontSize: 12, display: "block" }}>Transit Hub Handling Fee:</Text>
                    <InputNumber
                      prefix="Rs"
                      min={0}
                      step={5}
                      value={transitFeeAmount}
                      onChange={setTransitFeeAmount}
                      addonAfter="per hub"
                      style={{ width: "100%", marginTop: 4 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Paid directly by HQ per transit hub</Text>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
                    <Text strong style={{ fontSize: 12, display: "block" }}>Origin Base Share %:</Text>
                    <InputNumber
                      min={0}
                      max={100}
                      value={originBasePct}
                      onChange={(v) => {
                        setOriginBasePct(v);
                        setDestBasePct(100 - Number(v || 0));
                      }}
                      addonAfter="%"
                      style={{ width: "100%", marginTop: 4 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Standard ratio is 30% Origin</Text>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
                    <Text strong style={{ fontSize: 12, display: "block" }}>Delivery Base Share %:</Text>
                    <InputNumber
                      min={0}
                      max={100}
                      value={destBasePct}
                      onChange={(v) => {
                        setDestBasePct(v);
                        setOriginBasePct(100 - Number(v || 0));
                      }}
                      addonAfter="%"
                      style={{ width: "100%", marginTop: 4 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Standard ratio is 70% Delivery</Text>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
                    <Text strong style={{ fontSize: 12, display: "block" }}>HQ Commission Rate %:</Text>
                    <InputNumber
                      min={0}
                      max={30}
                      step={0.5}
                      value={hqCommPct}
                      onChange={setHqCommPct}
                      addonAfter="%"
                      style={{ width: "100%", marginTop: 4 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Deducted on branch operational shares</Text>
                  </Col>
                </Row>
              ),
            },
          ]}
        />

        {/* Section 3: TR Manifest Fleet Hops */}
        <Divider style={{ margin: "16px 0" }} />
        <Row>
          <Col span={24}>
            <Card
              size="small"
              title={
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space>
                      <CarOutlined style={{ color: "#722ed1" }} />
                      <Text strong>3. Transfer Hops & Manifest Trip Costs (HQ Central Fleet Operations)</Text>
                    </Space>
                  </Col>
                  <Col>
                    <Button size="small" icon={<PlusOutlined />} onClick={addHop}>
                      Add Hop
                    </Button>
                  </Col>
                </Row>
              }
              style={{ background: "#fdfaff", borderColor: "#d3adf7" }}
            >
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="HQ Fleet Management: Zero Transport Refund to Branches"
                description="Line-haul fuel, drivers, and TR manifests are managed centrally by SuperAdmin / HQ. Branches do not receive transport reimbursements. HQ finances these logistics operations out of its residual transfer margin pool."
              />

              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                {hops.map((hop, idx) => {
                  const tripCost = Number(hop.trip_transport_cost || 0);
                  const pkts = Math.max(1, Number(hop.total_shipments_on_tr || 1));
                  const perPkt = (tripCost / pkts).toFixed(2);

                  return (
                    <Card key={idx} size="small" styles={{ body: { padding: 8 } }} style={{ background: "#fff" }}>
                      <Row gutter={[8, 8]} align="middle">
                        <Col xs={24} sm={4}>
                          <Space direction="vertical" size={2} style={{ width: "100%" }}>
                            <Text strong style={{ fontSize: 12 }}>TR Code / Number:</Text>
                            <Input
                              placeholder="TR-001"
                              value={hop.transfer_number}
                              onChange={(e) => updateHop(idx, "transfer_number", e.target.value)}
                            />
                          </Space>
                        </Col>

                        <Col xs={24} sm={8}>
                          <Space direction="vertical" size={2} style={{ width: "100%" }}>
                            <Text strong style={{ fontSize: 12 }}>
                              From Hub <ArrowRightOutlined style={{ fontSize: 10 }} /> To Hub:
                            </Text>
                            <Row gutter={4} align="middle">
                              <Col span={11}>
                                <Select
                                  size="small"
                                  style={{ width: "100%" }}
                                  options={branchOptions}
                                  value={hop.from_branch_id}
                                  onChange={(v) => updateHop(idx, "from_branch_id", v)}
                                />
                              </Col>
                              <Col span={2} style={{ textAlign: "center" }}>→</Col>
                              <Col span={11}>
                                <Select
                                  size="small"
                                  style={{ width: "100%" }}
                                  options={branchOptions}
                                  value={hop.to_branch_id}
                                  onChange={(v) => updateHop(idx, "to_branch_id", v)}
                                />
                              </Col>
                            </Row>
                          </Space>
                        </Col>

                        <Col xs={12} sm={4}>
                          <Space direction="vertical" size={2} style={{ width: "100%" }}>
                            <Text strong style={{ fontSize: 12 }}>TR Trip Cost:</Text>
                            <InputNumber
                              prefix="Rs"
                              min={0}
                              value={hop.trip_transport_cost}
                              placeholder="900"
                              onChange={(v) => updateHop(idx, "trip_transport_cost", v)}
                              style={{ width: "100%" }}
                            />
                          </Space>
                        </Col>

                        <Col xs={10} sm={3}>
                          <Space direction="vertical" size={2} style={{ width: "100%" }}>
                            <Text strong style={{ fontSize: 12 }}>Total Pkts on TR:</Text>
                            <InputNumber
                              addonAfter="pkts"
                              min={1}
                              value={hop.total_shipments_on_tr}
                              placeholder="20"
                              onChange={(v) => updateHop(idx, "total_shipments_on_tr", v)}
                              style={{ width: "100%" }}
                            />
                          </Space>
                        </Col>

                        <Col xs={2} sm={1} style={{ textAlign: "right" }}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={hops.length <= 1}
                            onClick={() => removeHop(idx)}
                          />
                        </Col>
                      </Row>

                      <Divider style={{ margin: "8px 0" }} />

                      <Row justify="space-between" align="middle">
                        <Col>
                          <Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>Fleet Allocation:</Text>
                            <Text style={{ fontSize: 12 }}>
                              Rs {tripCost} total trip expense ÷ {pkts} packets =
                            </Text>
                            <Tag color="purple" style={{ fontSize: 12, fontWeight: "bold" }}>
                              Rs {perPkt} / shipment
                            </Tag>
                          </Space>
                        </Col>
                        <Col>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Financed directly by: <strong style={{ color: "#722ed1" }}>HQ Central Fleet</strong> (Branches do not bear/receive transport costs)
                          </Text>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </Space>

              <Divider style={{ margin: "12px 0" }} />

              <Row justify="space-between" align="middle" style={{ background: "#f9f0ff", border: "1px solid #d3adf7", padding: "8px 12px", borderRadius: 6 }}>
                <Col>
                  <Text strong>Accumulated Transport Allocation for This Shipment:</Text>
                  <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    Absorbed centrally by HQ out of residual transfer margin
                  </Text>
                </Col>
                <Col>
                  <Text strong style={{ fontSize: 16, color: "#722ed1" }}>
                    Rs {hops.reduce((sum, h) => sum + (Number(h.trip_transport_cost || 0) / Math.max(1, Number(h.total_shipments_on_tr || 1))), 0).toFixed(2)}
                  </Text>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ======================= SIMULATION RESULTS SECTION ======================= */}
      {result ? (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {/* Top Results Header with View Mode Switcher */}
          <Card
            styles={{ body: { padding: "12px 16px" } }}
            style={{
              background: "linear-gradient(90deg, #f0f5ff 0%, #ffffff 100%)",
              border: "1px solid #adc6ff",
            }}
          >
            <Row justify="space-between" align="middle" gutter={[12, 12]}>
              <Col xs={24} md={10}>
                <Space>
                  <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />
                  <div>
                    <Text strong style={{ fontSize: 16, color: "#0958d9", display: "block" }}>
                      Simulation Completed Successfully
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Delivery Fare: {formatRs(result?.pricing?.total_delivery_fare)} | Cash at Door: {formatRs(result?.pricing?.total_doorstep_collection)}
                    </Text>
                  </div>
                </Space>
              </Col>

              <Col xs={24} md={14} style={{ textAlign: "right" }}>
                <Space wrap>
                  <Segmented
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                      {
                        label: (
                          <Space>
                            <NodeIndexOutlined />
                            <span>Visual Diagram & Flow</span>
                          </Space>
                        ),
                        value: "diagram",
                      },
                      {
                        label: (
                          <Space>
                            <TableOutlined />
                            <span>Accounting Table & Ledger</span>
                          </Space>
                        ),
                        value: "table",
                      },
                      {
                        label: (
                          <Space>
                            <AppstoreOutlined />
                            <span>Compact Executive View</span>
                          </Space>
                        ),
                        value: "compact",
                      },
                    ]}
                  />
                  <Button icon={<CopyOutlined />} onClick={copyExecutiveSummary}>
                    Copy Summary
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Sleek Compact Pricing & Cashflow KPI Bar */}
          <Card
            size="small"
            styles={{ body: { padding: "10px 16px" } }}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <Row gutter={[12, 12]} align="middle" justify="space-between">
              <Col xs={12} sm={8} md={3}>
                <div style={{ borderLeft: "3px solid #6366f1", paddingLeft: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Route Base</Text>
                  <Text strong style={{ fontSize: 14, color: "#1e293b" }}>{formatRs(result?.pricing?.route_base_rate)}</Text>
                  <Text type="secondary" style={{ fontSize: 10, display: "block" }}>Origin → Dest</Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={3}>
                <div style={{ borderLeft: "3px solid #3b82f6", paddingLeft: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Local Base</Text>
                  <Text strong style={{ fontSize: 14, color: "#1e293b" }}>{formatRs(result?.pricing?.dest_local_base_rate)}</Text>
                  <Text type="secondary" style={{ fontSize: 10, display: "block" }}>Split 30% / 70%</Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={3}>
                <div style={{ borderLeft: "3px solid #0284c7", paddingLeft: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Extra Distance</Text>
                  <Text strong style={{ fontSize: 14, color: "#0284c7" }}>+{formatRs(result?.pricing?.distance_charge)}</Text>
                  <Text type="secondary" style={{ fontSize: 10, display: "block" }}>+{result?.pricing?.excess_distance_km || 0} km @ NPR {result?.pricing?.distance_rate_per_km || 6}/km</Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={3}>
                <div style={{ borderLeft: "3px solid #8b5cf6", paddingLeft: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Weight Add-on</Text>
                  <Text strong style={{ fontSize: 14, color: "#1e293b" }}>+{formatRs(result?.pricing?.weight_charge)}</Text>
                  <Text type="secondary" style={{ fontSize: 10, display: "block" }}>+{result?.pricing?.excess_weight_kg || 0} kg excess</Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={3}>
                <div style={{ borderLeft: "3px solid #ea580c", paddingLeft: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Merchant COD</Text>
                  <Text strong style={{ fontSize: 14, color: "#ea580c" }}>{formatRs(result?.pricing?.product_price_pod)}</Text>
                  <Text type="secondary" style={{ fontSize: 10, display: "block" }}>Direct Bank Remit</Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <div style={{ background: "#f8fafc", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  <Text type="secondary" style={{ fontSize: 10, display: "block" }}>Total Delivery Fare</Text>
                  <Text strong style={{ fontSize: 15, color: "#2563eb" }}>{formatRs(result?.pricing?.total_delivery_fare)}</Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>Invoiced to Merchant</Text>
                </div>
              </Col>
              <Col xs={24} sm={12} md={5}>
                <div style={{ background: "#f0fdf4", padding: "6px 10px", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                  <Text type="secondary" style={{ fontSize: 10, display: "block" }}>Total Cash at Door</Text>
                  <Text strong style={{ fontSize: 15, color: "#16a34a" }}>{formatRs(result?.pricing?.total_doorstep_collection)}</Text>
                  <Text type="secondary" style={{ fontSize: 10 }}>COD Rs {result?.pricing?.product_price_pod} + Fare Rs {result?.pricing?.total_delivery_fare}</Text>
                </div>
              </Col>
            </Row>
          </Card>

          {/* ==================== VIEW 1: DIAGRAM & OPERATIONS FLOW ==================== */}
          {viewMode === "diagram" && (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {/* Whiteboard Interactive SVG Diagram */}
              <SettlementDiagram result={result} />

              {/* Decoupled Branch Financial Visibility Switcher */}
              <Card
                size="small"
                title={
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <SafetyCertificateOutlined style={{ color: "#722ed1" }} />
                        <Text strong>Decoupled Branch Financial Visibility (HQ Central Clearinghouse)</Text>
                      </Space>
                    </Col>
                    <Col>
                      <Segmented
                        size="small"
                        value={roleView}
                        onChange={setRoleView}
                        options={[
                          { label: "🏛️ HQ Master View", value: "hq" },
                          { label: `🏢 Origin (${result?.cash_flow?.delivery_invoice_by})`, value: "origin" },
                          ...(result?.cash_flow?.has_transit
                            ? [{ label: "🚚 Transit Hub View", value: "transit" }]
                            : []),
                          { label: `🏢 Delivery (${result?.cash_flow?.doorstep_collected_by})`, value: "destination" },
                        ]}
                      />
                    </Col>
                  </Row>
                }
              >
                {roleView === "hq" && (
                  <div style={{ background: "#f0f5ff", padding: "12px 16px", borderRadius: 6 }}>
                    <Text strong style={{ color: "#1677ff", fontSize: 13, display: "block", marginBottom: 6 }}>
                      🏛️ SuperAdmin / HQ Master Clearinghouse View:
                    </Text>
                    <Paragraph style={{ margin: 0, fontSize: 12 }}>
                      HQ manages the entire transfer corridor. Origin forwards the transfer margin pool ({formatRs(result?.cash_flow?.inter_branch_transfers?.find((t) => t.role === "hq")?.amount || 0)}).
                      HQ directly pays the transit handling fee ({formatRs(result?.settlement?.rows?.find((r) => r.role === "transit")?.net_amount || 9.5)}) to each transit hub,
                      manages all TR vehicle fleet line-haul costs, and retains net earnings of {formatRs(result?.settlement?.hq_total)}.
                    </Paragraph>
                  </div>
                )}

                {roleView === "origin" && (
                  <div style={{ background: "#f9f0ff", padding: "12px 16px", borderRadius: 6 }}>
                    <Text strong style={{ color: "#722ed1", fontSize: 13, display: "block", marginBottom: 6 }}>
                      🏢 Origin Branch Portal View ({result?.cash_flow?.delivery_invoice_by}):
                    </Text>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} sm={8}>
                        <Statistic title="Delivery Fee Collected" prefix="Rs" value={result?.cash_flow?.delivery_invoice_amount || 0} precision={2} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Invoiced to Merchant</Text>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic title="Transferred to Delivery Branch" prefix="Rs" value={result?.cash_flow?.inter_branch_transfers?.find((t) => t.role === "delivery")?.amount || 0} precision={2} valueStyle={{ color: "#1677ff" }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Destination Delivery Share</Text>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic title="Origin Net Income" prefix="Rs" value={result?.settlement?.rows?.find((r) => r.role === "origin")?.net_amount || 0} precision={2} valueStyle={{ color: "#389e0d" }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>30% Base + 15% Weight (Net)</Text>
                      </Col>
                    </Row>
                  </div>
                )}

                {roleView === "transit" && (
                  <div style={{ background: "#f6ffed", padding: "12px 16px", borderRadius: 6 }}>
                    <Text strong style={{ color: "#389e0d", fontSize: 13, display: "block", marginBottom: 6 }}>
                      🚚 Transit Hub Portal View ({result?.settlement?.rows?.find((r) => r.role === "transit")?.branch_name || "Transit Hub"}):
                    </Text>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} sm={8}>
                        <Statistic title="Transit Handling Fee" prefix="Rs" value={result?.settlement?.rows?.find((r) => r.role === "transit")?.transit_fee_amount || 10} precision={2} valueStyle={{ color: "#722ed1" }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Fixed handling fee per shipment</Text>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic title="5% HQ Commission" prefix="-Rs" value={result?.settlement?.rows?.find((r) => r.role === "transit")?.hq_commission_amount || 0.5} precision={2} valueStyle={{ color: "#cf1322" }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Deducted on operational income</Text>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic title="Net Payout from HQ" prefix="Rs" value={result?.settlement?.rows?.find((r) => r.role === "transit")?.net_amount || 9.5} precision={2} valueStyle={{ color: "#389e0d" }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Disbursed directly by HQ</Text>
                      </Col>
                    </Row>
                  </div>
                )}

                {roleView === "destination" && (
                  <div style={{ background: "#e6f4ff", padding: "12px 16px", borderRadius: 6 }}>
                    <Text strong style={{ color: "#1677ff", fontSize: 13, display: "block", marginBottom: 6 }}>
                      🏢 Delivering Branch Portal View ({result?.cash_flow?.doorstep_collected_by}):
                    </Text>
                    <Row gutter={[16, 8]}>
                      <Col xs={24} sm={8}>
                        <Statistic title="Doorstep Cash Collected" prefix="Rs" value={result?.cash_flow?.doorstep_collected_amount || 0} precision={2} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Product COD + Delivery Fare</Text>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic title="Deposited to Merchant" prefix="Rs" value={result?.cash_flow?.merchant_remittance_amount || 0} precision={2} valueStyle={{ color: "#fa8c16" }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>Direct Bank Remittance</Text>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Statistic title="Net Delivery Share" prefix="Rs" value={result?.cash_flow?.inter_branch_transfers?.find((t) => t.role === "delivery")?.amount || 0} precision={2} valueStyle={{ color: "#389e0d" }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>70% Base + Distance + Weight (Net)</Text>
                      </Col>
                    </Row>
                  </div>
                )}
              </Card>

              {/* Step-by-Step Chronological Actions */}
              <Card size="small" title="Step-by-Step Settlement Actions">
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  {(result?.cash_flow?.steps || []).map((step) => (
                    <Card
                      key={step.step_number}
                      size="small"
                      styles={{ body: { padding: "10px 14px" } }}
                      style={{
                        background: step.step_number <= 3 ? "#fafafa" : step.title?.includes("Transit") ? "#f9f0ff" : "#f0f5ff",
                        borderLeft: `4px solid ${step.step_number <= 3 ? "#52c41a" : step.title?.includes("Transit") ? "#722ed1" : "#1677ff"}`,
                      }}
                    >
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Space>
                            <Tag color={step.step_number <= 3 ? "green" : step.title?.includes("Transit") ? "purple" : "blue"}>
                              Step {step.step_number}
                            </Tag>
                            <Text strong style={{ fontSize: 13 }}>{step.title}</Text>
                          </Space>
                        </Col>
                        <Col>
                          {step.amount > 0 && (
                            <Text strong style={{ color: "#0958d9", fontSize: 13 }}>
                              {formatRs(step.amount)}
                            </Text>
                          )}
                        </Col>
                      </Row>
                      <Paragraph style={{ margin: "6px 0 0 0", fontSize: 12, color: "#475569" }}>
                        {step.description}
                      </Paragraph>
                    </Card>
                  ))}
                </Space>
              </Card>
            </Space>
          )}

          {/* ==================== VIEW 2: ACCOUNTING TABLE & LEDGER ==================== */}
          {viewMode === "table" && (
            <Card
              size="small"
              title={
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space>
                      <TableOutlined style={{ color: "#1677ff" }} />
                      <Text strong>Audited Accounting Ledger & Branch Payout Schedule</Text>
                    </Space>
                  </Col>
                  <Col>
                    <Tag color="green">100% Mathematically Balanced</Tag>
                  </Col>
                </Row>
              }
            >
              <Table
                rowKey="branch_id"
                columns={ledgerCols}
                dataSource={result?.settlement?.rows || []}
                pagination={false}
                size="middle"
                summary={() => {
                  const rows = result?.settlement?.rows || [];
                  const totalGross = rows.reduce((a, b) => a + Number(b.allocation_amount || 0), 0);
                  const totalComm = rows.reduce((a, b) => a + Number(b.hq_commission_amount || 0), 0);
                  const totalNet = rows.reduce((a, b) => a + Number(b.net_amount || 0), 0);

                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ background: "#fafafa", fontWeight: "bold" }}>
                        <Table.Summary.Cell index={0} colSpan={2}>
                          Total Branch Operational Allocations
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          {formatRs(totalGross)}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          <Text type="danger">-{formatRs(totalComm)}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          <Text strong style={{ color: "#389e0d", fontSize: 14 }}>
                            {formatRs(totalNet)}
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            </Card>
          )}

          {/* ==================== VIEW 3: COMPACT EXECUTIVE VIEW ==================== */}
          {viewMode === "compact" && (
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" title="Executive Summary & Settlement Flow">
                  <Descriptions size="small" column={1} bordered>
                    <Descriptions.Item label="Corridor">
                      <strong>{result?.cash_flow?.delivery_invoice_by}</strong> → {transitBranchesList.map((t) => t.name).join(" → ") || "Direct"} → <strong>{result?.cash_flow?.doorstep_collected_by}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Customer Doorstep Cash">
                      <strong style={{ color: "#164e63", fontSize: 14 }}>{formatRs(result?.pricing?.total_doorstep_collection)}</strong>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        Product COD: {formatRs(result?.pricing?.product_price_pod)} | Fare: {formatRs(result?.pricing?.total_delivery_fare)}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Merchant Remittance">
                      <strong>{formatRs(result?.pricing?.product_price_pod)}</strong> (Direct bank payout)
                    </Descriptions.Item>
                    <Descriptions.Item label="Origin Retains (Net)">
                      <strong>{formatRs(result?.settlement?.rows?.find((r) => r.role === "origin")?.net_amount)}</strong> (30% local base + weight)
                    </Descriptions.Item>
                    <Descriptions.Item label="Delivery Receives (Net)">
                      <strong style={{ color: "#2563eb" }}>{formatRs(result?.settlement?.rows?.find((r) => r.role === "delivery")?.net_amount)}</strong> (70% base + extra distance + weight)
                    </Descriptions.Item>
                    <Descriptions.Item label="Transit Hub Handling">
                      {result?.cash_flow?.has_transit ? (
                        <span>
                          {result?.settlement?.rows?.filter((r) => r.role === "transit").map((t) => `${t.branch_name}: ${formatRs(t.net_amount)}`).join(", ")}
                        </span>
                      ) : (
                        <Text type="secondary">0 Transit Hubs (Direct corridor)</Text>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="SuperAdmin / HQ Retained">
                      <strong style={{ color: "#722ed1", fontSize: 14 }}>{formatRs(result?.settlement?.hq_total)}</strong>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        Covers line-haul fleet operations and platform margins
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card size="small" title="Itemized Fare Component Derivation">
                  <Descriptions size="small" column={1} bordered>
                    <Descriptions.Item label="Route Base Rate">
                      <strong>{formatRs(result?.pricing?.route_base_rate)}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Local Base Rate (Destination)">
                      <strong>{formatRs(result?.pricing?.dest_local_base_rate)}</strong> (Basis for 30%/70% branch shares)
                    </Descriptions.Item>
                    <Descriptions.Item label="Excess Weight Surcharge">
                      <strong>+{formatRs(result?.pricing?.weight_charge)}</strong> ({result?.pricing?.excess_weight_kg || 0} kg excess)
                    </Descriptions.Item>
                    <Descriptions.Item label="Extra Destination Distance">
                      <strong>+{formatRs(result?.pricing?.distance_charge)}</strong> (+{result?.pricing?.excess_distance_km || 0} km beyond 5km)
                    </Descriptions.Item>
                    <Descriptions.Item label="Speed Multiplier">
                      {serviceType.toUpperCase()} ({serviceType === "standard" ? "x1.0" : serviceType === "express" ? "x1.3" : "x2.0"})
                    </Descriptions.Item>
                    <Descriptions.Item label="Total Delivery Fare (Billed to Merchant)">
                      <strong style={{ color: "#2563eb", fontSize: 15 }}>{formatRs(result?.pricing?.total_delivery_fare)}</strong>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          )}
        </Space>
      ) : null}
    </Space>
  );
}
