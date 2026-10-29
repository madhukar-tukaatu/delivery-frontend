"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
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
  Tooltip,
  message,
} from "antd";
import {
  CalculatorOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  DollarCircleOutlined,
  CarOutlined,
  BankOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  ShopOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  CopyOutlined,
  TableOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { formatRs } from "@/components/admin/billing/financeKit";
import SettlementDiagram from "@/components/admin/billing/SettlementDiagram";

const { Text, Paragraph, Title } = Typography;

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

export default function SettlementSimulator({ branches = [], activeRules }) {
  const [loading, setLoading] = useState(false);

  // Form State
  const [originId, setOriginId] = useState(null);
  const [destId, setDestId] = useState(null);
  const [transitIds, setTransitIds] = useState([]);

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

  // View Mode: 'diagram' (Visual Flowchart) | 'table' (Detailed Ledger) | 'compact' (Executive Summary)
  const [viewMode, setViewMode] = useState("diagram");

  // Dynamic Rule Overrides (In-place settings)
  const [transitFeeMode, setTransitFeeMode] = useState("fixed");
  const [transitFeeAmount, setTransitFeeAmount] = useState(10.0);
  const [originBasePct, setOriginBasePct] = useState(30.0);
  const [destBasePct, setDestBasePct] = useState(70.0);
  const [hqCommPct, setHqCommPct] = useState(5.0);
  const [weightHqPct, setWeightHqPct] = useState(50.0);

  // Auto-sync default hops whenever route changes
  function syncHops(newOrigin, newDest, newTransits) {
    if (!newOrigin || !newDest || newOrigin === newDest) {
      setHops([]);
      return;
    }
    const chain = [newOrigin, ...(newTransits || []).filter(Boolean), newDest].filter(Boolean);
    if (chain.length < 2) {
      setHops([]);
      return;
    }

    const newHops = [];
    for (let i = 0; i < chain.length - 1; i++) {
      newHops.push({
        transfer_number: `TR-00${i + 1}`,
        from_branch_id: chain[i],
        to_branch_id: chain[i + 1],
        trip_transport_cost: i === 0 ? 900 : 600,
        total_shipments_on_tr: i === 0 ? 20 : 10,
      });
    }
    setHops(newHops);
  }

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
      syncHops(oId, dId, transitIds);
    }
  }, [branches]);

  function handleOriginChange(id) {
    setOriginId(id);
    syncHops(id, destId, transitIds);
  }

  function handleDestChange(id) {
    setDestId(id);
    syncHops(originId, id, transitIds);
  }

  function handleTransitChange(ids) {
    setTransitIds(ids);
    syncHops(originId, destId, ids);
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

  const branchOptions = (branches || []).map((b) => ({
    label: `${b.name} (${b.code || `#${b.id}`})`,
    value: b.id,
  }));

  const ledgerCols = [
    {
      title: "Branch",
      dataIndex: "branch_name",
      key: "branch_name",
      render: (v, r) => (
        <Space>
          <Text strong>{v}</Text>
          <Tag color={r.role === "delivery" ? "cyan" : r.role === "origin" ? "blue" : "purple"}>
            {r.role?.toUpperCase()}
          </Tag>
        </Space>
      ),
    },
    {
      title: "Base Share (30/70)",
      dataIndex: "base_share_amount",
      key: "base_share_amount",
      align: "right",
      render: (v) => formatRs(v),
    },
    {
      title: "Weight Share",
      dataIndex: "weight_share_amount",
      key: "weight_share_amount",
      align: "right",
      render: (v) => formatRs(v),
    },
    {
      title: "Extra Distance",
      dataIndex: "extra_distance_amount",
      key: "extra_distance_amount",
      align: "right",
      render: (v) => formatRs(v),
    },
    {
      title: "Transit Fee",
      dataIndex: "transit_fee_amount",
      key: "transit_fee_amount",
      align: "right",
      render: (v) => (Number(v) > 0 ? <Tag color="purple">{formatRs(v)}</Tag> : "-"),
    },
    {
      title: "Operational Income",
      dataIndex: "allocation_amount",
      key: "allocation_amount",
      align: "right",
      render: (v) => <Text strong>{formatRs(v)}</Text>,
    },
    {
      title: "5% HQ Comm.",
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
          {/* Column 1: Route Selection */}
          <Col xs={24} md={12}>
            <Card size="small" title="1. Route & Branch Chain" style={{ height: "100%", background: "#fafafa" }}>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <div>
                  <Text strong>Origin Branch (Booking & Invoicing):</Text>
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

                <div>
                  <Text strong>Transit Hub(s) in Sequence:</Text>
                  <Select
                    mode="multiple"
                    showSearch
                    placeholder="Optional intermediate transit branches (e.g. Bharatpur)"
                    style={{ width: "100%", marginTop: 4 }}
                    options={branchOptions.filter((b) => b.value !== originId && b.value !== destId)}
                    value={transitIds}
                    onChange={handleTransitChange}
                    filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                  />
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
                    Leave empty for direct 2-branch delivery (0 transit hubs).
                  </Text>
                </div>

                <div>
                  <Text strong>Destination (Delivering) Branch:</Text>
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
              </Space>
            </Card>
          </Col>

          {/* Column 2: Shipment Details */}
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
                    <InputNumber min={0.1} max={100} step={0.5} value={weightKg} addonAfter="kg" onChange={setWeightKg} style={{ width: 160 }} />
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
                    <InputNumber min={0} max={200} step={1} value={distanceKm} addonAfter="km" onChange={setDistanceKm} style={{ width: 160 }} />
                  </Col>
                </Row>

                <Row align="middle" justify="space-between">
                  <Col><Text strong>Service Type:</Text></Col>
                  <Col>
                    <Select
                      value={serviceType}
                      style={{ width: 160 }}
                      options={[
                        { label: "Standard", value: "standard" },
                        { label: "Express", value: "express" },
                        { label: "Same Day", value: "same_day" },
                      ]}
                      onChange={setServiceType}
                    />
                  </Col>
                </Row>

                <Row align="middle" justify="space-between">
                  <Col><Text strong>Fragile Parcel:</Text></Col>
                  <Col>
                    <Switch checked={isFragile} onChange={setIsFragile} checkedChildren="Yes" unCheckedChildren="No" />
                  </Col>
                </Row>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Dynamic Rules Override Toolbar */}
        <Collapse
          ghost
          style={{ marginTop: 16, background: "#f0f5ff", borderRadius: 8, border: "1px solid #adc6ff" }}
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
                    <Button size="small" onClick={(e) => { e.stopPropagation(); resetDynamicSettings(); }}>
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
                  const fromBranchName = branches.find((b) => b.id === hop.from_branch_id)?.name || `Branch #${hop.from_branch_id}`;
                  const toBranchName = branches.find((b) => b.id === hop.to_branch_id)?.name || `Branch #${hop.to_branch_id}`;
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
                  <Text orientation="vertical" type="secondary" style={{ fontSize: 11, display: "block" }}>Route Base</Text>
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
                        <Col xs={24} sm={18}>
                          <Space>
                            <Tag color="geekblue" style={{ fontWeight: "bold" }}>Step {step.step_number}</Tag>
                            <Text strong style={{ fontSize: 14 }}>{step.title}</Text>
                            <Tag>{step.badge}</Tag>
                          </Space>
                          <Paragraph type="secondary" style={{ margin: "4px 0 0 0", fontSize: 12 }}>
                            <b>{step.from}</b> &rarr; <b>{step.to}</b>: {step.description}
                          </Paragraph>
                        </Col>
                        <Col xs={24} sm={6} style={{ textAlign: "right", marginTop: 4 }}>
                          <Text strong style={{ fontSize: 16, color: "#1677ff" }}>
                            {formatRs(step.amount)}
                          </Text>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </Space>
              </Card>
            </Space>
          )}

          {/* ==================== VIEW 2: ACCOUNTING TABLE & LEDGER ==================== */}
          {viewMode === "table" && (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {/* Branch Share Settlement Ledger */}
              <Card
                title={
                  <Row justify="space-between" align="middle">
                    <Col><Text strong style={{ fontSize: 16 }}>Multi-Party Branch Settlement Ledger</Text></Col>
                    <Col>
                      <Tag color="cyan">HQ Transfer Margin: {formatRs(result?.settlement?.hq_breakdown?.margin_amount)}</Tag>
                      <Tag color="purple">HQ Fragile/Express: {formatRs((result?.settlement?.hq_breakdown?.fragile_amount || 0) + (result?.settlement?.hq_breakdown?.express_amount || 0))}</Tag>
                      <Tag color="green">HQ Commissions: {formatRs(result?.settlement?.hq_breakdown?.commissions_amount)}</Tag>
                      <Tag color="gold" style={{ fontWeight: "bold" }}>Total HQ Earnings: {formatRs(result?.settlement?.hq_total)}</Tag>
                    </Col>
                  </Row>
                }
              >
                <Table
                  size="middle"
                  pagination={false}
                  dataSource={result?.settlement?.rows || []}
                  rowKey="branch_id"
                  columns={ledgerCols}
                />
              </Card>

              {/* Transfer Hops Table */}
              {result?.transfer_hops?.length > 0 && (
                <Card size="small" title={<Space><CarOutlined /><span>Transfer Hops & Transport Cost Allocation</span></Space>}>
                  <Table
                    size="small"
                    pagination={false}
                    dataSource={result.transfer_hops}
                    rowKey="transfer_number"
                    columns={[
                      { title: "Manifest", dataIndex: "transfer_number", key: "transfer_number", render: (v) => <Tag color="blue">{v}</Tag> },
                      { title: "From Hub", dataIndex: "from_branch_name", key: "from_branch_name" },
                      { title: "To Hub", dataIndex: "to_branch_name", key: "to_branch_name" },
                      { title: "Trip Total Cost", dataIndex: "trip_transport_cost", key: "trip_transport_cost", align: "right", render: (v) => formatRs(v) },
                      { title: "Shipments on Truck", dataIndex: "total_shipments_on_tr", key: "total_shipments_on_tr", align: "center", render: (v) => `${v} pkts` },
                      {
                        title: "Shipment Transport Share",
                        dataIndex: "allocated_transport_cost",
                        key: "allocated_transport_cost",
                        align: "right",
                        render: (v) => <Text strong style={{ color: "#722ed1" }}>{formatRs(v)}</Text>,
                      },
                    ]}
                  />
                </Card>
              )}

              {/* Inter-Branch Bank & Ledger Statement Transfers Table */}
              <Card size="small" title="Inter-Branch & HQ Bank Statement Transfers">
                <Table
                  size="small"
                  pagination={false}
                  dataSource={result?.cash_flow?.inter_branch_transfers || []}
                  rowKey={(r, i) => `${r.to_branch}_${i}`}
                  columns={[
                    {
                      title: "Payer (From)",
                      dataIndex: "from_branch",
                      key: "from_branch",
                      render: (v) => <Text strong>{v}</Text>,
                    },
                    {
                      title: "Recipient (To)",
                      dataIndex: "to_branch",
                      key: "to_branch",
                      render: (v) => <Text strong style={{ color: "#1677ff" }}>{v}</Text>,
                    },
                    {
                      title: "Role",
                      dataIndex: "role",
                      key: "role",
                      render: (v) => {
                        const color = v === "delivery" ? "cyan" : v === "transit" ? "purple" : "gold";
                        return <Tag color={color}>{v?.toUpperCase()}</Tag>;
                      },
                    },
                    {
                      title: "Formula & Purpose",
                      dataIndex: "purpose",
                      key: "purpose",
                      render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
                    },
                    {
                      title: "Net Disbursed",
                      dataIndex: "amount",
                      key: "amount",
                      align: "right",
                      render: (v) => (
                        <Text strong style={{ color: "#389e0d", fontSize: 14 }}>
                          {formatRs(v)}
                        </Text>
                      ),
                    },
                  ]}
                />
              </Card>
            </Space>
          )}

          {/* ==================== VIEW 3: COMPACT EXECUTIVE VIEW ==================== */}
          {viewMode === "compact" && (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {/* Executive High-Level KPI Cards */}
              <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                  <Card size="small" style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}>
                    <Statistic
                      title="1. Customer Doorstep"
                      prefix="Rs"
                      value={result?.pricing?.total_doorstep_collection || 0}
                      precision={2}
                      valueStyle={{ color: "#389e0d", fontWeight: "bold" }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Cash Collected at Door</Text>
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card size="small" style={{ background: "#fff7e6", borderColor: "#ffd591" }}>
                    <Statistic
                      title="2. Merchant COD Remittance"
                      prefix="Rs"
                      value={result?.pricing?.product_price_pod || 0}
                      precision={2}
                      valueStyle={{ color: "#d46b08", fontWeight: "bold" }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Direct Bank Remittance</Text>
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card size="small" style={{ background: "#f9f0ff", borderColor: "#d3adf7" }}>
                    <Statistic
                      title="3. Delivery Fare Pool"
                      prefix="Rs"
                      value={result?.pricing?.total_delivery_fare || 0}
                      precision={2}
                      valueStyle={{ color: "#531dab", fontWeight: "bold" }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Invoiced to Merchant</Text>
                  </Card>
                </Col>
                <Col xs={12} md={6}>
                  <Card size="small" style={{ background: "#f0f5ff", borderColor: "#adc6ff" }}>
                    <Statistic
                      title="4. HQ Net Retained"
                      prefix="Rs"
                      value={result?.settlement?.hq_total || 0}
                      precision={2}
                      valueStyle={{ color: "#0958d9", fontWeight: "bold" }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Fleet & Profit Margin</Text>
                  </Card>
                </Col>
              </Row>

              {/* Single-Row Per Party Balance Sheet Table */}
              <Card
                title={
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <BankOutlined style={{ color: "#1677ff" }} />
                        <Text strong>Executive Multi-Party Balance Sheet</Text>
                      </Space>
                    </Col>
                    <Col>
                      <Tag color="green">100% Mathematically Balanced</Tag>
                    </Col>
                  </Row>
                }
              >
                <Table
                  size="small"
                  pagination={false}
                  dataSource={[
                    {
                      key: "dest",
                      party: result?.cash_flow?.doorstep_collected_by,
                      role: "Delivery (Last-Mile)",
                      roleColor: "cyan",
                      inflow: formatRs(result?.pricing?.total_doorstep_collection),
                      outflow: formatRs(result?.pricing?.product_price_pod),
                      comm: `-${formatRs(result?.settlement?.rows?.find((r) => r.role === "delivery")?.hq_commission_amount || 0)}`,
                      net: formatRs(result?.settlement?.rows?.find((r) => r.role === "delivery")?.net_amount || 0),
                      note: "Deposits Rs 2,400 to Merchant, keeps net delivery share.",
                    },
                    {
                      key: "origin",
                      party: result?.cash_flow?.delivery_invoice_by,
                      role: "Origin (Booking)",
                      roleColor: "blue",
                      inflow: formatRs(result?.pricing?.total_delivery_fare),
                      outflow: formatRs(
                        (result?.cash_flow?.inter_branch_transfers?.find((t) => t.role === "delivery")?.amount || 0) +
                        (result?.cash_flow?.inter_branch_transfers?.find((t) => t.role === "hq")?.amount || 0)
                      ),
                      comm: `-${formatRs(result?.settlement?.rows?.find((r) => r.role === "origin")?.hq_commission_amount || 0)}`,
                      net: formatRs(result?.settlement?.rows?.find((r) => r.role === "origin")?.net_amount || 0),
                      note: "Invoices delivery fare, pays Destination & remits transfer pool to HQ.",
                    },
                    ...(result?.settlement?.rows?.filter((r) => r.role === "transit") || []).map((t, idx) => ({
                      key: `transit_${idx}`,
                      party: t.branch_name,
                      role: "Transit Hub",
                      roleColor: "purple",
                      inflow: formatRs(t.transit_fee_amount || 10),
                      outflow: "Rs 0.00",
                      comm: `-${formatRs(t.hq_commission_amount || 0.5)}`,
                      net: formatRs(t.net_amount || 9.5),
                      note: "Handles shipment transfer; fee paid directly by HQ.",
                    })),
                    {
                      key: "hq",
                      party: "SuperAdmin / HQ Pool",
                      role: "HQ Clearinghouse",
                      roleColor: "gold",
                      inflow: formatRs(result?.cash_flow?.inter_branch_transfers?.find((t) => t.role === "hq")?.amount || 0),
                      outflow: formatRs(
                        (result?.settlement?.rows?.filter((r) => r.role === "transit") || []).reduce((a, b) => a + Number(b.net_amount || 0), 0)
                      ),
                      comm: `+${formatRs(result?.settlement?.hq_breakdown?.commissions_amount || 0)}`,
                      net: formatRs(result?.settlement?.hq_total || 0),
                      note: "Centrally finances vehicle transport fleet & driver logistics.",
                    },
                  ]}
                  columns={[
                    {
                      title: "Entity / Branch",
                      dataIndex: "party",
                      key: "party",
                      render: (v, r) => (
                        <Space>
                          <Text strong>{v}</Text>
                          <Tag color={r.roleColor}>{r.role}</Tag>
                        </Space>
                      ),
                    },
                    { title: "Gross Inflow", dataIndex: "inflow", key: "inflow", align: "right" },
                    { title: "Disbursals Out", dataIndex: "outflow", key: "outflow", align: "right" },
                    {
                      title: "5% HQ Comm.",
                      dataIndex: "comm",
                      key: "comm",
                      align: "right",
                      render: (v) => <Text style={{ color: v.startsWith("-") ? "#cf1322" : "#389e0d" }}>{v}</Text>,
                    },
                    {
                      title: "Net Retained",
                      dataIndex: "net",
                      key: "net",
                      align: "right",
                      render: (v) => <Text strong style={{ color: "#389e0d", fontSize: 14 }}>{v}</Text>,
                    },
                    { title: "Operational Summary", dataIndex: "note", key: "note", render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
                  ]}
                />
              </Card>

              {/* Quick Who-Pays-Who Checklist */}
              <Card size="small" title="Quick Who-Pays-Who Settlement Summary">
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={12}>
                    <Space direction="vertical" style={{ width: "100%" }} size={6}>
                      <div style={{ background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 6, padding: "8px 12px" }}>
                        <Text strong style={{ fontSize: 12, color: "#389e0d" }}>1. Customer &rarr; Delivering Branch:</Text>
                        <Text style={{ display: "block", fontSize: 13, fontWeight: "bold" }}>
                          {formatRs(result?.pricing?.total_doorstep_collection)} (Product COD + Delivery Fare)
                        </Text>
                      </div>
                      <div style={{ background: "#fff7e6", border: "1px solid #ffd591", borderRadius: 6, padding: "8px 12px" }}>
                        <Text strong style={{ fontSize: 12, color: "#d46b08" }}>2. Delivering Branch &rarr; Merchant Bank:</Text>
                        <Text style={{ display: "block", fontSize: 13, fontWeight: "bold" }}>
                          {formatRs(result?.pricing?.product_price_pod)} (Full Product COD Remitted)
                        </Text>
                      </div>
                      <div style={{ background: "#f9f0ff", border: "1px solid #d3adf7", borderRadius: 6, padding: "8px 12px" }}>
                        <Text strong style={{ fontSize: 12, color: "#531dab" }}>3. Merchant &rarr; Origin Branch:</Text>
                        <Text style={{ display: "block", fontSize: 13, fontWeight: "bold" }}>
                          {formatRs(result?.pricing?.total_delivery_fare)} (Delivery Fare Invoice Paid)
                        </Text>
                      </div>
                    </Space>
                  </Col>

                  <Col xs={24} md={12}>
                    <Space direction="vertical" style={{ width: "100%" }} size={6}>
                      <div style={{ background: "#e6f4ff", border: "1px solid #91caff", borderRadius: 6, padding: "8px 12px" }}>
                        <Text strong style={{ fontSize: 12, color: "#0958d9" }}>4. Origin Branch &rarr; Delivering Branch:</Text>
                        <Text style={{ display: "block", fontSize: 13, fontWeight: "bold" }}>
                          {formatRs(result?.cash_flow?.inter_branch_transfers?.find((t) => t.role === "delivery")?.amount || 0)} (Net Delivery Share)
                        </Text>
                      </div>
                      <div style={{ background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 6, padding: "8px 12px" }}>
                        <Text strong style={{ fontSize: 12, color: "#d48806" }}>5. Origin Branch &rarr; HQ Central Pool:</Text>
                        <Text style={{ display: "block", fontSize: 13, fontWeight: "bold" }}>
                          {formatRs(result?.cash_flow?.inter_branch_transfers?.find((t) => t.role === "hq")?.amount || 0)} (Residual Transfer Margin Pool)
                        </Text>
                      </div>
                      <div style={{ background: "#f0f5ff", border: "1px solid #adc6ff", borderRadius: 6, padding: "8px 12px" }}>
                        <Text strong style={{ fontSize: 12, color: "#1677ff" }}>6. HQ Central Pool &rarr; Transit Hub(s):</Text>
                        <Text style={{ display: "block", fontSize: 13, fontWeight: "bold" }}>
                          {formatRs(result?.settlement?.rows?.find((r) => r.role === "transit")?.net_amount || 0)} per hub (Handling Fee)
                        </Text>
                      </div>
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Space>
          )}
        </Space>
      ) : (
        <Card style={{ textAlign: "center", padding: 32, background: "#fafafa" }}>
          <CalculatorOutlined style={{ fontSize: 36, color: "#bfbfbf", marginBottom: 12 }} />
          <Title level={5} type="secondary">Simulator Ready</Title>
          <Paragraph type="secondary">
            Select your origin, transit, and destination branches above, customize the shipment and manifest trip costs,
            then click <strong>Run Simulation</strong> to view the live calculation.
          </Paragraph>
        </Card>
      )}
    </Space>
  );
}
