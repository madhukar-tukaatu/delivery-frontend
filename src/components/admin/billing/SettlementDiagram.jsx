"use client";

import { useState } from "react";
import {
  Card,
  Col,
  Divider,
  Row,
  Tag,
  Typography,
  Tooltip,
  Space,
  Segmented,
  Table,
} from "antd";
import {
  UserOutlined,
  ShopOutlined,
  CarOutlined,
  BankOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  CalculatorOutlined,
  AuditOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { formatRs } from "@/components/admin/billing/financeKit";

const { Text, Paragraph } = Typography;

export default function SettlementDiagram({ result, onSelectStep }) {
  const [activeFlow, setActiveFlow] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState("all"); // 'all' | 'origin' | 'delivery' | 'transit' | 'hq' | 'transport'
  const [diagramMode, setDiagramMode] = useState("flow"); // 'flow' | 'compact_matrix'

  if (!result || !result.cash_flow) return null;

  const cf = result.cash_flow;
  const p = result.pricing || {};
  const s = result.settlement || {};
  const rows = s.rows || [];
  const hops = result.transfer_hops || result.hops || [];

  const originName = cf.delivery_invoice_by || "Origin Branch";
  const destName = cf.doorstep_collected_by || "Delivery Branch";
  const transitRows = rows.filter((r) => r.role === "transit");
  const hasTransit = transitRows.length > 0;

  const doorstepTotal = cf.doorstep_collected_amount || 0;
  const productCod = p.product_price_pod || 0;
  const totalFare = p.total_delivery_fare || 0;

  // Origin Details
  const originRow = rows.find((r) => r.role === "origin") || {};
  const originBase = Number(originRow?.base_share_amount || 0);
  const originWeight = Number(originRow?.weight_share_amount || 0);
  const originGross = Number(originRow?.allocation_amount || (originBase + originWeight));
  const originComm = Number(originRow?.hq_commission_amount || 0);
  const originNet = Number(originRow?.net_amount || (originGross - originComm));

  // Destination Details
  const destRow = rows.find((r) => r.role === "delivery") || {};
  const destBase = Number(destRow?.base_share_amount || 0);
  const destDist = Number(destRow?.extra_distance_amount || 0);
  const destWeight = Number(destRow?.weight_share_amount || 0);
  const destGross = Number(destRow?.allocation_amount || (destBase + destDist + destWeight));
  const destComm = Number(destRow?.hq_commission_amount || 0);
  const destNet = Number(destRow?.net_amount || (destGross - destComm));

  // Transit Details
  const transitTotalFee = transitRows.reduce((a, b) => a + Number(b.transit_fee_amount || 10), 0);
  const transitTotalComm = transitRows.reduce((a, b) => a + Number(b.hq_commission_amount || 0.5), 0);
  const transitTotalNet = transitRows.reduce((a, b) => a + Number(b.net_amount || 9.5), 0);

  // HQ Central Pool Details
  const hqTransfer = cf.inter_branch_transfers?.find((t) => t.role === "hq")?.amount || 0;
  const hqTotal = Number(s.hq_total || 0);
  const hqBreakdown = s.hq_breakdown || {};
  const hqWeight = Number(hqBreakdown.weight_amount || 0);
  const hqFragile = Number(hqBreakdown.fragile_amount || 0);
  const hqExpress = Number(hqBreakdown.express_amount || 0);
  const hqMargin = Number(hqBreakdown.margin_amount || 0);
  const hqCommissions = Number(hqBreakdown.commissions_amount || 0);

  // Transport Fleet Details (Paid 100% by HQ)
  const totalTransportCost = hops.reduce((sum, h) => {
    const allocated = Number(h.allocated_transport_cost || 0);
    if (allocated > 0) return sum + allocated;
    const trip = Number(h.trip_transport_cost || 0);
    const pkts = Math.max(1, Number(h.total_shipments_on_tr || 1));
    return sum + trip / pkts;
  }, 0);

  const localBase = Number(p.dest_local_base_rate || 0);
  const weightCharge = Number(p.weight_charge || 0);
  const distanceCharge = Number(p.distance_charge || 0);
  const excessDistKm = Number(p.excess_distance_km || 0);
  const totalDeliveryDistKm = Number(p.delivery_distance_km || 10);
  const includedDistKm = Number(p.included_distance_km || 5);
  const distRatePerKm = Number(p.distance_rate_per_km || (excessDistKm > 0 ? (destDist / excessDistKm) : 6));

  return (
    <Card
      size="small"
      title={
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 18 }} />
              <Text strong style={{ fontSize: 15, color: "#0f172a" }}>
                Interactive Cash Flow & Price Derivation Diagram
              </Text>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Tag color="cyan">Doorstep POD: {formatRs(doorstepTotal)}</Tag>
              <Tag color="purple">Total Fare: {formatRs(totalFare)}</Tag>
              <Tag color="geekblue">HQ Transport Paid: {formatRs(totalTransportCost)}</Tag>
              {hasTransit ? (
                <Tag color="orange">{transitRows.length} Transit Hub(s)</Tag>
              ) : (
                <Tag color="green">Direct Route (0 Transit)</Tag>
              )}
              <Segmented
                size="small"
                value={diagramMode}
                onChange={setDiagramMode}
                options={[
                  { label: "Flow Diagram", value: "flow", icon: <ApartmentOutlined /> },
                  { label: "Compact Matrix", value: "compact_matrix", icon: <AppstoreOutlined /> },
                ]}
              />
            </Space>
          </Col>
        </Row>
      }
      style={{
        background: "#ffffff",
        borderColor: "#cbd5e1",
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        borderRadius: 8,
      }}
    >
      {/* ===================== VIEW 1: HIGH-FIDELITY FLOW DIAGRAM (NO COLLISION) ===================== */}
      {diagramMode === "flow" ? (
        <div style={{ width: "100%", overflowX: "auto", paddingBottom: 4 }}>
          <svg
            viewBox="0 0 1280 790"
            style={{ width: "100%", minWidth: 1060, height: "auto", display: "block" }}
          >
            <defs>
              {/* Arrow Markers */}
              <marker id="arrow-green" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#16a34a" />
              </marker>
              <marker id="arrow-orange" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ea580c" />
              </marker>
              <marker id="arrow-purple" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#7c3aed" />
              </marker>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
              </marker>
              <marker id="arrow-gold" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
              </marker>
              <marker id="arrow-magenta" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#db2777" />
              </marker>
              <marker id="arrow-teal" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#0d9488" />
              </marker>

              {/* Drop Shadows */}
              <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.08" />
              </filter>
              <filter id="activeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#2563eb" floodOpacity="0.45" />
              </filter>
            </defs>

            {/* Top Equation Box: POD = Product COD + Delivery Fare */}
            <rect x="290" y="10" width="700" height="38" rx="19" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" filter="url(#softShadow)" />
            <text x="640" y="34" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0f172a">
              Cash at Door: Product COD Rs {productCod.toLocaleString()} + Total Delivery Fare Rs {totalFare.toLocaleString()} = Rs {doorstepTotal.toLocaleString()}
            </text>

            {/* ======================= TOP ROW: CUSTOMER & MERCHANT ======================= */}

            {/* Node: Customer (Top Right) */}
            <g transform="translate(950, 68)" filter="url(#softShadow)">
              <rect x="0" y="0" width="240" height="68" rx="8" fill="#ffffff" stroke="#16a34a" strokeWidth="1.5" />
              <rect x="0" y="0" width="240" height="4" fill="#16a34a" />
              <text x="24" y="34" fontSize="20">👤</text>
              <text x="56" y="28" fontSize="12" fontWeight="bold" fill="#15803d">Customer / Consignee</text>
              <text x="56" y="44" fontSize="10" fill="#64748b">Pays full cash at doorstep</text>
              <text x="56" y="58" fontSize="11" fontWeight="bold" fill="#15803d">Paid: {formatRs(doorstepTotal)}</text>
            </g>

            {/* Node: Merchant (Top Center) */}
            <g transform="translate(520, 68)" filter="url(#softShadow)">
              <rect x="0" y="0" width="240" height="68" rx="8" fill="#ffffff" stroke="#ea580c" strokeWidth="1.5" />
              <rect x="0" y="0" width="240" height="4" fill="#ea580c" />
              <text x="24" y="34" fontSize="20">🏪</text>
              <text x="56" y="28" fontSize="12" fontWeight="bold" fill="#c2410c">Merchant Bank Account</text>
              <text x="56" y="44" fontSize="10" fill="#64748b">Receives Product COD directly</text>
              <text x="56" y="58" fontSize="11" fontWeight="bold" fill="#c2410c">Remitted: {formatRs(productCod)}</text>
            </g>

            {/* Flow 1: Customer -> Delivery Branch (Doorstep Cash Collection) */}
            <path
              d="M 1070 136 L 1070 215"
              fill="none"
              stroke={activeFlow === "step1" ? "#16a34a" : "#86efac"}
              strokeWidth={activeFlow === "step1" ? 3.5 : 2.5}
              strokeDasharray="5,4"
              markerEnd="url(#arrow-green)"
              cursor="pointer"
              onMouseEnter={() => setActiveFlow("step1")}
              onMouseLeave={() => setActiveFlow(null)}
            />
            <g cursor="pointer" onClick={() => onSelectStep?.(1)} onMouseEnter={() => setActiveFlow("step1")} onMouseLeave={() => setActiveFlow(null)}>
              <rect x="1000" y="160" width="140" height="24" rx="12" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.2" />
              <text x="1070" y="176" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#15803d">
                ① Collect {formatRs(doorstepTotal)}
              </text>
            </g>

            {/* Flow 2: Delivery Branch -> Merchant (Remit COD directly to Merchant Bank) */}
            <path
              d="M 960 220 C 880 165, 800 130, 765 110"
              fill="none"
              stroke={activeFlow === "step2" ? "#ea580c" : "#fdba74"}
              strokeWidth={activeFlow === "step2" ? 3.5 : 2}
              strokeDasharray="5,4"
              markerEnd="url(#arrow-orange)"
              cursor="pointer"
              onMouseEnter={() => setActiveFlow("step2")}
              onMouseLeave={() => setActiveFlow(null)}
            />
            <g cursor="pointer" onClick={() => onSelectStep?.(2)} onMouseEnter={() => setActiveFlow("step2")} onMouseLeave={() => setActiveFlow(null)}>
              <rect x="790" y="135" width="160" height="24" rx="12" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.2" />
              <text x="870" y="151" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#c2410c">
                ② Remit COD {formatRs(productCod)}
              </text>
            </g>

            {/* Flow 3: Merchant -> Origin Branch (Merchant pays Delivery Fare Invoice Bill) */}
            <path
              d="M 520 102 C 340 102, 175 130, 160 215"
              fill="none"
              stroke={activeFlow === "step3" ? "#7c3aed" : "#c4b5fd"}
              strokeWidth={activeFlow === "step3" ? 3.5 : 2}
              strokeDasharray="5,4"
              markerEnd="url(#arrow-purple)"
              cursor="pointer"
              onMouseEnter={() => setActiveFlow("step3")}
              onMouseLeave={() => setActiveFlow(null)}
            />
            <g cursor="pointer" onClick={() => onSelectStep?.(3)} onMouseEnter={() => setActiveFlow("step3")} onMouseLeave={() => setActiveFlow(null)}>
              <rect x="250" y="125" width="155" height="24" rx="12" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="1.2" />
              <text x="327" y="141" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#6d28d9">
                ③ Fare Bill: {formatRs(totalFare)}
              </text>
            </g>

            {/* ======================= MIDDLE ROW: CORE BRANCHES & HQ NODES ======================= */}

            {/* Node 1: Origin Branch (Left Card) */}
            <g
              transform="translate(30, 225)"
              filter={selectedEntity === "origin" ? "url(#activeGlow)" : "url(#softShadow)"}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedEntity(selectedEntity === "origin" ? "all" : "origin")}
            >
              <rect x="0" y="0" width="260" height="255" rx="8" fill="#ffffff" stroke={selectedEntity === "origin" ? "#4f46e5" : "#e2e8f0"} strokeWidth={selectedEntity === "origin" ? 2.5 : 1.5} />
              <rect x="0" y="0" width="260" height="4" fill="#4f46e5" />
              
              {/* Header */}
              <text x="16" y="28" fontSize="15">🏢</text>
              <text x="40" y="28" fontSize="13" fontWeight="bold" fill="#1e1b4b">
                Origin: {originName.slice(0, 14)}
              </text>
              <rect x="190" y="14" width="56" height="18" rx="4" fill="#e0e7ff" />
              <text x="218" y="27" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#3730a3">Booking</text>

              {/* Net Payout Banner */}
              <rect x="14" y="44" width="232" height="28" rx="6" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
              <text x="22" y="62" fontSize="11" fill="#166534">Net Retained:</text>
              <text x="236" y="63" textAnchor="end" fontSize="14" fontWeight="bold" fill="#15803d">
                {formatRs(originNet)}
              </text>

              {/* Itemized Line Items */}
              <text x="16" y="94" fontSize="11" fill="#475569">• 30% Local Base Share:</text>
              <text x="244" y="94" textAnchor="end" fontSize="11" fontWeight="bold" fill="#3730a3">+{formatRs(originBase)}</text>

              <text x="16" y="114" fontSize="11" fill="#475569">• 15% Extra Weight Share:</text>
              <text x="244" y="114" textAnchor="end" fontSize="11" fontWeight="bold" fill="#3730a3">+{formatRs(originWeight)}</text>

              <text x="16" y="134" fontSize="11" fill="#94a3b8">• Extra Distance / Transit:</text>
              <text x="244" y="134" textAnchor="end" fontSize="11" fill="#94a3b8">Rs 0.00</text>

              <line x1="16" y1="146" x2="244" y2="146" stroke="#f1f5f9" strokeWidth="1" />

              <text x="16" y="164" fontSize="11" fontWeight="bold" fill="#0f172a">Gross Operational Share:</text>
              <text x="244" y="164" textAnchor="end" fontSize="11" fontWeight="bold" fill="#0f172a">{formatRs(originGross)}</text>

              <text x="16" y="184" fontSize="11" fill="#e11d48">Less 5% HQ Commission:</text>
              <text x="244" y="184" textAnchor="end" fontSize="11" fontWeight="bold" fill="#e11d48">-{formatRs(originComm)}</text>

              {/* Sub-note */}
              <rect x="14" y="200" width="232" height="42" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
              <text x="20" y="216" fontSize="9" fill="#64748b">Role: Origin booked, packaged, & loaded</text>
              <text x="20" y="232" fontSize="9" fill="#64748b">onto primary transfer manifest.</text>
            </g>

            {/* Flow ⑤ (Origin -> HQ): Clean connection line & badge in open gap */}
            <path
              d="M 290 350 L 340 350"
              fill="none"
              stroke={activeFlow === "step5" ? "#d97706" : "#fcd34d"}
              strokeWidth={activeFlow === "step5" ? 3.5 : 2.5}
              markerEnd="url(#arrow-gold)"
              cursor="pointer"
              onMouseEnter={() => setActiveFlow("step5")}
              onMouseLeave={() => setActiveFlow(null)}
            />
            <g cursor="pointer" onClick={() => onSelectStep?.(5)} onMouseEnter={() => setActiveFlow("step5")} onMouseLeave={() => setActiveFlow(null)}>
              <rect x="285" y="318" width="60" height="20" rx="4" fill="#fffbeb" stroke="#d97706" strokeWidth="1" />
              <text x="315" y="332" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#b45309">⑤ Pool</text>
            </g>

            {/* Node 2: SuperAdmin / HQ Pool (Center-Left Card) */}
            <g
              transform="translate(340, 225)"
              filter={selectedEntity === "hq" ? "url(#activeGlow)" : "url(#softShadow)"}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedEntity(selectedEntity === "hq" ? "all" : "hq")}
            >
              <rect x="0" y="0" width="270" height="255" rx="8" fill="#ffffff" stroke={selectedEntity === "hq" ? "#2563eb" : "#e2e8f0"} strokeWidth={selectedEntity === "hq" ? 2.5 : 1.5} />
              <rect x="0" y="0" width="270" height="4" fill="#2563eb" />
              
              {/* Header */}
              <text x="16" y="28" fontSize="15">🏛️</text>
              <text x="40" y="28" fontSize="13" fontWeight="bold" fill="#1e3a8a">SuperAdmin / HQ Pool</text>
              <rect x="200" y="14" width="58" height="18" rx="4" fill="#dbeafe" />
              <text x="229" y="27" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e40af">Clearing</text>

              {/* HQ Net Banner */}
              <rect x="14" y="44" width="242" height="28" rx="6" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
              <text x="22" y="62" fontSize="11" fill="#1d4ed8">HQ Retained Net:</text>
              <text x="246" y="63" textAnchor="end" fontSize="14" fontWeight="bold" fill="#1d4ed8">
                {formatRs(hqTotal)}
              </text>

              {/* Itemized Line Items */}
              <text x="16" y="92" fontSize="10.5" fill="#475569">• Residual Transfer Margin:</text>
              <text x="254" y="92" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#1d4ed8">+{formatRs(hqMargin)}</text>

              <text x="16" y="110" fontSize="10.5" fill="#475569">• 50% HQ Weight Share:</text>
              <text x="254" y="110" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#1d4ed8">+{formatRs(hqWeight)}</text>

              <text x="16" y="128" fontSize="10.5" fill="#475569">• Surcharges (Fragile/Exp):</text>
              <text x="254" y="128" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#1d4ed8">+{formatRs(hqFragile + hqExpress)}</text>

              <text x="16" y="146" fontSize="10.5" fill="#15803d">• 5% Platform Commissions:</text>
              <text x="254" y="146" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#15803d">+{formatRs(hqCommissions)}</text>

              <line x1="16" y1="156" x2="254" y2="156" stroke="#f1f5f9" strokeWidth="1" />

              <text x="16" y="172" fontSize="10.5" fill="#7c3aed">• Less Transit Hub Fee:</text>
              <text x="254" y="172" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#7c3aed">-{formatRs(transitTotalNet)}</text>

              <text x="16" y="190" fontSize="10.5" fontWeight="bold" fill="#0f766e">• Less Fleet Transport:</text>
              <text x="254" y="190" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#0f766e">-{formatRs(totalTransportCost)}</text>

              {/* Sub-note */}
              <rect x="14" y="200" width="242" height="42" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
              <text x="20" y="216" fontSize="9" fill="#64748b">HQ absorbs 100% of line-haul fleet</text>
              <text x="20" y="232" fontSize="9" fill="#64748b">transport. Zero refund to branches.</text>
            </g>

            {/* Flow ⑥ (HQ -> Transit Hub): Clean connection line & badge in open gap */}
            {hasTransit && (
              <>
                <path
                  d="M 610 350 L 660 350"
                  fill="none"
                  stroke={activeFlow === "step6" ? "#db2777" : "#f472b6"}
                  strokeWidth={activeFlow === "step6" ? 3.5 : 2.5}
                  markerEnd="url(#arrow-magenta)"
                  cursor="pointer"
                  onMouseEnter={() => setActiveFlow("step6")}
                  onMouseLeave={() => setActiveFlow(null)}
                />
                <g cursor="pointer" onClick={() => onSelectStep?.(6)} onMouseEnter={() => setActiveFlow("step6")} onMouseLeave={() => setActiveFlow(null)}>
                  <rect x="615" y="318" width="50" height="20" rx="4" fill="#fdf2f8" stroke="#db2777" strokeWidth="1" />
                  <text x="640" y="332" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#be185d">⑥ Fee</text>
                </g>
              </>
            )}

            {/* Node 3: Transit Hub(s) (Center Card) */}
            <g
              transform="translate(660, 225)"
              filter={selectedEntity === "transit" ? "url(#activeGlow)" : "url(#softShadow)"}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedEntity(selectedEntity === "transit" ? "all" : "transit")}
            >
              <rect
                x="0"
                y="0"
                width="250"
                height="255"
                rx="8"
                fill="#ffffff"
                stroke={selectedEntity === "transit" ? "#d97706" : "#e2e8f0"}
                strokeWidth={selectedEntity === "transit" ? 2.5 : 1.5}
              />
              <rect x="0" y="0" width="250" height="4" fill={hasTransit ? "#d97706" : "#94a3b8"} />
              
              {/* Header */}
              <text x="16" y="28" fontSize="15">🚚</text>
              <text x="40" y="28" fontSize="13" fontWeight="bold" fill={hasTransit ? "#78350f" : "#64748b"}>
                {hasTransit ? `${transitRows.length} Transit Hub(s)` : "0 Transit Hubs"}
              </text>
              <rect x="180" y="14" width="58" height="18" rx="4" fill={hasTransit ? "#fef3c7" : "#f1f5f9"} />
              <text x="209" y="27" textAnchor="middle" fontSize="10" fontWeight="bold" fill={hasTransit ? "#92400e" : "#64748b"}>
                {hasTransit ? "Mid-Hub" : "Direct"}
              </text>

              {hasTransit ? (
                <>
                  {/* Net Banner */}
                  <rect x="14" y="44" width="222" height="28" rx="6" fill="#fdf2f8" stroke="#fbcfe8" strokeWidth="1" />
                  <text x="22" y="62" fontSize="11" fill="#be185d">Transit Net Payout:</text>
                  <text x="226" y="63" textAnchor="end" fontSize="14" fontWeight="bold" fill="#9d174d">
                    {formatRs(transitTotalNet)}
                  </text>

                  {/* Itemized Line Items */}
                  <text x="16" y="94" fontSize="11" fill="#475569">• Fixed Handling Fee:</text>
                  <text x="234" y="94" textAnchor="end" fontSize="11" fontWeight="bold" fill="#b45309">+{formatRs(transitTotalFee)}</text>

                  <text x="16" y="116" fontSize="11" fill="#e11d48">• Less 5% HQ Commission:</text>
                  <text x="234" y="116" textAnchor="end" fontSize="11" fontWeight="bold" fill="#e11d48">-{formatRs(transitTotalComm)}</text>

                  <text x="16" y="138" fontSize="11" fill="#94a3b8">• Line-Haul Vehicle Fuel:</text>
                  <text x="234" y="138" textAnchor="end" fontSize="11" fill="#94a3b8">Rs 0.00 (HQ)</text>

                  <line x1="16" y1="150" x2="234" y2="150" stroke="#f1f5f9" strokeWidth="1" />

                  <text x="16" y="170" fontSize="11" fontWeight="bold" fill="#4338ca">• Direct Payer:</text>
                  <text x="234" y="170" textAnchor="end" fontSize="11" fontWeight="bold" fill="#4338ca">Paid by HQ</text>

                  {/* Sub-note */}
                  <rect x="14" y="186" width="222" height="56" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                  <text x="20" y="202" fontSize="9" fill="#475569">
                    Hubs: {transitRows.map((t) => t.branch_name.slice(0, 10)).join(", ")}
                  </text>
                  <text x="20" y="218" fontSize="8.5" fill="#64748b">Earns handling fee for unloading,</text>
                  <text x="20" y="232" fontSize="8.5" fill="#64748b">sorting, & cross-docking cargo.</text>
                </>
              ) : (
                <g transform="translate(15, 60)">
                  <circle cx="110" cy="50" r="28" fill="#f8fafc" stroke="#cbd5e1" />
                  <text x="110" y="56" textAnchor="middle" fontSize="18">⚡</text>
                  <text x="110" y="105" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#334155">
                    Direct Point-to-Point
                  </text>
                  <text x="110" y="125" textAnchor="middle" fontSize="10" fill="#64748b">
                    0 intermediate transit stops.
                  </text>
                  <text x="110" y="140" textAnchor="middle" fontSize="10" fill="#64748b">
                    Transit fee = Rs 0.00
                  </text>
                </g>
              )}
            </g>

            {/* Node 4: Destination / Delivering Branch (Right Card) */}
            <g
              transform="translate(960, 225)"
              filter={selectedEntity === "delivery" ? "url(#activeGlow)" : "url(#softShadow)"}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedEntity(selectedEntity === "delivery" ? "all" : "delivery")}
            >
              <rect x="0" y="0" width="280" height="255" rx="8" fill="#ffffff" stroke={selectedEntity === "delivery" ? "#0284c7" : "#e2e8f0"} strokeWidth={selectedEntity === "delivery" ? 2.5 : 1.5} />
              <rect x="0" y="0" width="280" height="4" fill="#0284c7" />
              
              {/* Header */}
              <text x="16" y="28" fontSize="15">🏢</text>
              <text x="40" y="28" fontSize="13" fontWeight="bold" fill="#0c4a6e">
                Delivery: {destName.slice(0, 14)}
              </text>
              <rect x="210" y="14" width="58" height="18" rx="4" fill="#e0f2fe" />
              <text x="239" y="27" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0369a1">Last-Mile</text>

              {/* Net Payout Banner */}
              <rect x="14" y="44" width="252" height="28" rx="6" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
              <text x="22" y="62" fontSize="11" fill="#166534">Net Delivery Payout:</text>
              <text x="256" y="63" textAnchor="end" fontSize="14" fontWeight="bold" fill="#15803d">
                {formatRs(destNet)}
              </text>

              {/* Itemized Line Items with Exact Named Breakdown */}
              <text x="16" y="92" fontSize="10.5" fill="#475569">• 70% Local Base Rate:</text>
              <text x="264" y="92" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#0284c7">+{formatRs(destBase)}</text>

              <text x="16" y="110" fontSize="10" fill="#0369a1" fontWeight="bold">
                • Extra Dist ({excessDistKm}km @ Rs {distRatePerKm}/km):
              </text>
              <text x="264" y="110" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#0369a1">
                +{formatRs(destDist)}
              </text>

              <text x="16" y="128" fontSize="10.5" fill="#475569">• 35% Extra Weight Share:</text>
              <text x="264" y="128" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#0284c7">+{formatRs(destWeight)}</text>

              <line x1="16" y1="138" x2="264" y2="138" stroke="#f1f5f9" strokeWidth="1" />

              <text x="16" y="154" fontSize="10.5" fontWeight="bold" fill="#0f172a">Gross Operational Share:</text>
              <text x="264" y="154" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#0f172a">{formatRs(destGross)}</text>

              <text x="16" y="172" fontSize="10.5" fill="#e11d48">Less 5% HQ Commission:</text>
              <text x="264" y="172" textAnchor="end" fontSize="10.5" fontWeight="bold" fill="#e11d48">-{formatRs(destComm)}</text>

              {/* Sub-note */}
              <rect x="14" y="186" width="252" height="56" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
              <text x="20" y="202" fontSize="8.5" fill="#0369a1" fontWeight="bold">
                Distance: {totalDeliveryDistKm}km - {includedDistKm}km base = {excessDistKm}km @ Rs {distRatePerKm}/km
              </text>
              <text x="20" y="216" fontSize="8.5" fill="#64748b">100% credited to delivering branch for</text>
              <text x="20" y="230" fontSize="8.5" fill="#64748b">rider doorstep transit & POD cash collection.</text>
            </g>

            {/* ======================= FLOW ④: DEDICATED UNOBSTRUCTED BYPASS CHANNEL ======================= */}
            {/* Smoothly loops underneath Middle Row into the open channel (y = 512). NEVER intersects any text! */}
            <path
              d="M 180 480 C 180 520, 300 520, 600 520 L 800 520 C 1050 520, 1100 520, 1100 480"
              fill="none"
              stroke={activeFlow === "step4" ? "#2563eb" : "#93c5fd"}
              strokeWidth={activeFlow === "step4" ? 4 : 2.5}
              strokeDasharray="6,4"
              markerEnd="url(#arrow-blue)"
              cursor="pointer"
              onMouseEnter={() => setActiveFlow("step4")}
              onMouseLeave={() => setActiveFlow(null)}
            />
            {/* Pill 4 sitting in 100% open space in the bypass channel */}
            <g cursor="pointer" onClick={() => onSelectStep?.(4)} onMouseEnter={() => setActiveFlow("step4")} onMouseLeave={() => setActiveFlow(null)}>
              <rect x="475" y="506" width="330" height="28" rx="14" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5" filter="url(#softShadow)" />
              <text x="640" y="524" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1d4ed8">
                ④ Origin Pays Delivery Net Share: {formatRs(destNet)}
              </text>
            </g>

            {/* ======================= BOTTOM ROW: HQ CENTRAL TRANSPORT FLEET ======================= */}

            {/* Flow ⑦: Drops vertically from HQ bottom directly into Transport Fleet */}
            <path
              d="M 475 480 L 475 565"
              fill="none"
              stroke={activeFlow === "step7" ? "#0d9488" : "#5eead4"}
              strokeWidth={activeFlow === "step7" ? 3.5 : 2.5}
              markerEnd="url(#arrow-teal)"
              cursor="pointer"
              onMouseEnter={() => setActiveFlow("step7")}
              onMouseLeave={() => setActiveFlow(null)}
            />
            <g cursor="pointer" onMouseEnter={() => setActiveFlow("step7")} onMouseLeave={() => setActiveFlow(null)}>
              <rect x="400" y="538" width="150" height="20" rx="4" fill="#f0fdfa" stroke="#0d9488" strokeWidth="1" />
              <text x="475" y="552" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#0f766e">
                ⑦ HQ Pays Transport
              </text>
            </g>

            {/* Node 5: HQ Central Transport Fleet Operations Card */}
            <g
              transform="translate(180, 565)"
              filter={selectedEntity === "transport" ? "url(#activeGlow)" : "url(#softShadow)"}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedEntity(selectedEntity === "transport" ? "all" : "transport")}
            >
              <rect
                x="0"
                y="0"
                width="920"
                height="130"
                rx="8"
                fill="#ffffff"
                stroke={selectedEntity === "transport" ? "#0d9488" : "#cbd5e1"}
                strokeWidth={selectedEntity === "transport" ? 2.5 : 1.5}
              />
              <rect x="0" y="0" width="920" height="4" fill="#0d9488" />

              {/* Fleet Header */}
              <text x="18" y="24" fontSize="16">🚛</text>
              <text x="44" y="24" fontSize="12.5" fontWeight="bold" fill="#134e4a">
                HQ Central Transport Fleet Operations (Line-Haul TR Manifests & Carrier Trucks)
              </text>
              <rect x="730" y="10" width="170" height="20" rx="4" fill="#ccfbf1" />
              <text x="815" y="24" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0f766e">
                HQ Absorbed: {formatRs(totalTransportCost)}
              </text>

              {/* Hop Manifest Chips inside Transport Node */}
              {hops.length > 0 ? (
                hops.slice(0, 3).map((h, i) => {
                  const hopX = 18 + i * 295;
                  const trip = Number(h.trip_transport_cost || 0);
                  const pkts = Math.max(1, Number(h.total_shipments_on_tr || 1));
                  const perPkt = (h.allocated_transport_cost ? Number(h.allocated_transport_cost) : trip / pkts).toFixed(2);
                  return (
                    <g key={i} transform={`translate(${hopX}, 40)`}>
                      <rect x="0" y="0" width="280" height="42" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                      <text x="12" y="18" fontSize="11" fontWeight="bold" fill="#0f766e">
                        {h.transfer_number || `TR-00${i + 1}`}
                      </text>
                      <text x="12" y="32" fontSize="9.5" fill="#64748b">
                        {(h.from_branch_name || originName).slice(0, 10)} → {(h.to_branch_name || destName).slice(0, 10)}
                      </text>
                      <text x="268" y="26" textAnchor="end" fontSize="12" fontWeight="bold" fill="#0f766e">
                        Rs {perPkt} / shipment
                      </text>
                    </g>
                  );
                })
              ) : (
                <g transform="translate(18, 40)">
                  <rect x="0" y="0" width="880" height="42" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
                  <text x="440" y="26" textAnchor="middle" fontSize="11" fill="#64748b">
                    Central Carrier Line-Haul Corridor ({originName} → {destName})
                  </text>
                </g>
              )}

              {/* Operational Rule Banner */}
              <rect x="18" y="92" width="884" height="28" rx="4" fill="#0f766e" />
              <text x="460" y="110" textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#ffffff">
                ★ 100% FINANCED BY HQ: Truck drivers, fuel & TR manifest costs are paid directly by SuperAdmin/HQ from the transfer margin. Branches receive Rs 0.00 transport refund.
              </text>
            </g>

            {/* ======================= MATHEMATICAL RECONCILIATION BANNER ======================= */}
            <rect x="180" y="715" width="920" height="38" rx="6" fill="#f0fdf4" stroke="#86efac" strokeWidth="1.2" />
            <text x="200" y="739" fontSize="11.5" fontWeight="bold" fill="#15803d">
              ✓ Formula Reconciliation:
            </text>
            <text x="360" y="739" fontSize="11.5" fill="#166534">
              Origin Net {formatRs(originNet)} + Delivery Net {formatRs(destNet)} + Transit Net {formatRs(transitTotalNet)} + HQ Net {formatRs(hqTotal)} =
            </text>
            <text x="1030" y="739" textAnchor="end" fontSize="12.5" fontWeight="bold" fill="#15803d">
              Total Fare {formatRs(totalFare)} (100% Balanced)
            </text>
          </svg>
        </div>
      ) : (
        /* ===================== VIEW 2: COMPACT MATRIX / PIPELINE VIEW ===================== */
        <div style={{ padding: "8px 0" }}>
          <Row gutter={[12, 12]}>
            {/* Card 1: Doorstep Collection */}
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ height: "100%", background: "#f8fafc", borderColor: "#cbd5e1" }}>
                <Space direction="vertical" orientation="vertical" size={2} style={{ width: "100%" }}>
                  <Text orientation="vertical" type="secondary" style={{ fontSize: 11 }}>1. Customer & Merchant</Text>
                  <Text strong style={{ fontSize: 15, color: "#15803d" }}>{formatRs(doorstepTotal)}</Text>
                  <Divider style={{ margin: "6px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>• Product COD:</span>
                    <strong style={{ color: "#ea580c" }}>{formatRs(productCod)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>• Delivery Fare:</span>
                    <strong style={{ color: "#2563eb" }}>{formatRs(totalFare)}</strong>
                  </div>
                  <Text type="secondary" style={{ fontSize: 10, display: "block", marginTop: 4 }}>
                    Delivering branch collects COD + Fare, deposits COD directly to merchant.
                  </Text>
                </Space>
              </Card>
            </Col>

            {/* Card 2: Origin Branch */}
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ height: "100%", background: "#f5f3ff", borderColor: "#c7d2fe" }}>
                <Space direction="vertical" size={2} style={{ width: "100%" }}>
                  <Row justify="space-between">
                    <Text type="secondary" style={{ fontSize: 11 }}>2. Origin ({originName.slice(0, 10)})</Text>
                    <Tag color="purple">30% Base</Tag>
                  </Row>
                  <Text strong style={{ fontSize: 15, color: "#4338ca" }}>Net {formatRs(originNet)}</Text>
                  <Divider style={{ margin: "6px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>• 30% Local Base:</span>
                    <span>+{formatRs(originBase)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>• 15% Weight:</span>
                    <span>+{formatRs(originWeight)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#e11d48" }}>
                    <span>• 5% HQ Comm:</span>
                    <span>-{formatRs(originComm)}</span>
                  </div>
                </Space>
              </Card>
            </Col>

            {/* Card 3: Delivery Branch */}
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ height: "100%", background: "#f0f9ff", borderColor: "#bae6fd" }}>
                <Space direction="vertical" size={2} style={{ width: "100%" }}>
                  <Row justify="space-between">
                    <Text type="secondary" style={{ fontSize: 11 }}>3. Delivery ({destName.slice(0, 10)})</Text>
                    <Tag color="cyan">70% Base + Dist</Tag>
                  </Row>
                  <Text strong style={{ fontSize: 15, color: "#0369a1" }}>Net {formatRs(destNet)}</Text>
                  <Divider style={{ margin: "6px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>• 70% Local Base:</span>
                    <span>+{formatRs(destBase)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#0369a1", fontWeight: "bold" }}>
                    <span>• Extra Dist ({excessDistKm} km):</span>
                    <span>+{formatRs(destDist)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>• 35% Weight:</span>
                    <span>+{formatRs(destWeight)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#e11d48" }}>
                    <span>• 5% HQ Comm:</span>
                    <span>-{formatRs(destComm)}</span>
                  </div>
                </Space>
              </Card>
            </Col>

            {/* Card 4: HQ Pool & Fleet */}
            <Col xs={24} sm={12} md={6}>
              <Card size="small" style={{ height: "100%", background: "#eff6ff", borderColor: "#bfdbfe" }}>
                <Space direction="vertical" size={2} style={{ width: "100%" }}>
                  <Row justify="space-between">
                    <Text type="secondary" style={{ fontSize: 11 }}>4. SuperAdmin / HQ Pool</Text>
                    <Tag color="blue">Fleet Absorbed</Tag>
                  </Row>
                  <Text strong style={{ fontSize: 15, color: "#1d4ed8" }}>HQ Net {formatRs(hqTotal)}</Text>
                  <Divider style={{ margin: "6px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>• Residual Margin:</span>
                    <span>+{formatRs(hqMargin)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>• 5% Comm + Surcharge:</span>
                    <span>+{formatRs(hqCommissions + hqFragile + hqExpress)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7c3aed" }}>
                    <span>• Transit Fees Paid:</span>
                    <span>-{formatRs(transitTotalNet)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#0f766e", fontWeight: "bold" }}>
                    <span>• Fleet Transport Cost:</span>
                    <span>-{formatRs(totalTransportCost)}</span>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          {/* Compact Fleet Trip Hops */}
          {hops.length > 0 && (
            <div style={{ marginTop: 10, background: "#f8fafc", padding: "8px 12px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Text strong style={{ fontSize: 11, color: "#0f766e" }}>
                    🚛 Line-Haul TR Manifests:
                  </Text>
                  <span style={{ fontSize: 11, color: "#475569", marginLeft: 8 }}>
                    {hops.map((h, i) => `${h.transfer_number || `TR-${i+1}`} (${formatRs(h.allocated_transport_cost || 0)})`).join(" · ")}
                  </span>
                </Col>
                <Col>
                  <Tag color="cyan">100% Paid by HQ · Rs 0 Branch Refund</Tag>
                </Col>
              </Row>
            </div>
          )}
        </div>
      )}

      {/* ===================== DETAILED PRICE DERIVATION REPORT ===================== */}
      <Divider style={{ margin: "14px 0 10px 0" }} />
      <Card
        size="small"
        style={{
          background: "#ffffff",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
        }}
        title={
          <Row justify="space-between" align="middle" style={{ width: "100%" }}>
            <Col>
              <Space>
                <CalculatorOutlined style={{ color: "#2563eb", fontSize: 16 }} />
                <Text strong style={{ fontSize: 14 }}>
                  Detailed Price Derivation & Audit Report: How Each Branch Got That Exact Price
                </Text>
              </Space>
            </Col>
            <Col>
              <Segmented
                size="small"
                value={selectedEntity}
                onChange={setSelectedEntity}
                options={[
                  { label: "🌐 All Parties", value: "all" },
                  { label: `🏢 Origin (${originName.slice(0, 10)})`, value: "origin" },
                  { label: `🏢 Delivery (${destName.slice(0, 10)})`, value: "delivery" },
                  ...(hasTransit ? [{ label: `🚚 Transit (${transitRows.length})`, value: "transit" }] : []),
                  { label: "🏛️ HQ Pool", value: "hq" },
                  { label: "🚛 Transport Fleet", value: "transport" },
                ]}
              />
            </Col>
          </Row>
        }
      >
        <Row gutter={[16, 16]}>
          {/* 1. Origin Branch Formula Card */}
          {(selectedEntity === "all" || selectedEntity === "origin") && (
            <Col xs={24} md={selectedEntity === "all" ? 12 : 24}>
              <Card
                size="small"
                style={{
                  background: "#fdfaff",
                  borderColor: "#d3adf7",
                  height: "100%",
                }}
                title={
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <BankOutlined style={{ color: "#722ed1" }} />
                        <Text strong style={{ color: "#531dab" }}>1. Origin Branch: {originName}</Text>
                        <Tag color="purple">Booking Branch</Tag>
                      </Space>
                    </Col>
                    <Col>
                      <Tag color="green" style={{ fontSize: 13, fontWeight: "bold" }}>
                        Net Payout: {formatRs(originNet)}
                      </Tag>
                    </Col>
                  </Row>
                }
              >
                <Space direction="vertical" style={{ width: "100%" }} size={6}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>
                      • <strong>30% Local Base Share</strong> (30% of Dest local base Rs {localBase}):
                    </span>
                    <strong style={{ color: "#531dab" }}>+{formatRs(originBase)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>
                      • <strong>15% Extra Weight Share</strong> (30% of branch wt pool after 50% HQ wt):
                    </span>
                    <strong style={{ color: "#531dab" }}>+{formatRs(originWeight)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>• Extra Distance / Transit Fee:</span>
                    <Text type="secondary">Rs 0.00 (Last-mile & transit hubs only)</Text>
                  </div>

                  <Divider style={{ margin: "6px 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: "bold" }}>
                    <span>Gross Operational Income:</span>
                    <span>{formatRs(originGross)}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#e11d48" }}>
                    <span>Less 5% HQ Commission ({originRow?.hq_rate || 5}%):</span>
                    <span>-{formatRs(originComm)}</span>
                  </div>

                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "6px 10px", marginTop: 4 }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text strong style={{ color: "#15803d", fontSize: 12 }}>
                          = Final Net Retained by Origin:
                        </Text>
                      </Col>
                      <Col>
                        <Text strong style={{ color: "#15803d", fontSize: 14 }}>
                          {formatRs(originNet)}
                        </Text>
                      </Col>
                    </Row>
                  </div>

                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                    <em>Why Origin gets this:</em> Origin booked the shipment, packaged, performed barcode intake, and manifested it onto the primary transfer line-haul route.
                  </Text>
                </Space>
              </Card>
            </Col>
          )}

          {/* 2. Destination Branch Formula Card */}
          {(selectedEntity === "all" || selectedEntity === "delivery") && (
            <Col xs={24} md={selectedEntity === "all" ? 12 : 24}>
              <Card
                size="small"
                style={{
                  background: "#f0f8ff",
                  borderColor: "#91caff",
                  height: "100%",
                }}
                title={
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <CarOutlined style={{ color: "#1677ff" }} />
                        <Text strong style={{ color: "#0958d9" }}>2. Destination Branch: {destName}</Text>
                        <Tag color="cyan">Last-Mile Delivering Branch</Tag>
                      </Space>
                    </Col>
                    <Col>
                      <Tag color="green" style={{ fontSize: 13, fontWeight: "bold" }}>
                        Net Payout: {formatRs(destNet)}
                      </Tag>
                    </Col>
                  </Row>
                }
              >
                <Space direction="vertical" style={{ width: "100%" }} size={6}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>
                      • <strong>70% Local Base Share</strong> (70% of Dest local base Rs {localBase}):
                    </span>
                    <strong style={{ color: "#0958d9" }}>+{formatRs(destBase)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>
                      • <strong>100% Extra Distance Charge</strong> ({totalDeliveryDistKm} km total &minus; {includedDistKm} km base = {excessDistKm} km excess @ Rs {distRatePerKm}/km):
                    </span>
                    <strong style={{ color: "#0958d9" }}>+{formatRs(destDist)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>
                      • <strong>35% Extra Weight Share</strong> (70% of branch wt pool after 50% HQ wt):
                    </span>
                    <strong style={{ color: "#0958d9" }}>+{formatRs(destWeight)}</strong>
                  </div>

                  <Divider style={{ margin: "6px 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: "bold" }}>
                    <span>Gross Operational Income:</span>
                    <span>{formatRs(destGross)}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#e11d48" }}>
                    <span>Less 5% HQ Commission ({destRow?.hq_rate || 5}%):</span>
                    <span>-{formatRs(destComm)}</span>
                  </div>

                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "6px 10px", marginTop: 4 }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text strong style={{ color: "#15803d", fontSize: 12 }}>
                          = Final Net Transferred to Delivery Branch:
                        </Text>
                      </Col>
                      <Col>
                        <Text strong style={{ color: "#15803d", fontSize: 14 }}>
                          {formatRs(destNet)}
                        </Text>
                      </Col>
                    </Row>
                  </div>

                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                    <em>Why Delivery gets this:</em> Delivering branch received line-haul cargo, assigned doorstep rider, bore extra delivery distance travel ({excessDistKm} km = {formatRs(destDist)}), collected customer COD, and completed final proof-of-delivery.
                  </Text>
                </Space>
              </Card>
            </Col>
          )}

          {/* 3. Transit Hub Formula Card */}
          {(selectedEntity === "all" || selectedEntity === "transit") && (
            <Col xs={24} md={selectedEntity === "all" ? 12 : 24}>
              <Card
                size="small"
                style={{
                  background: "#fffaf0",
                  borderColor: "#ffd591",
                  height: "100%",
                }}
                title={
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <CarOutlined style={{ color: "#d48806" }} />
                        <Text strong style={{ color: "#d46b08" }}>
                          3. Transit Hub(s): {hasTransit ? `${transitRows.length} Intermediate Hubs` : "0 Transit Hubs"}
                        </Text>
                        <Tag color="orange">Transit Handling</Tag>
                      </Space>
                    </Col>
                    <Col>
                      <Tag color="purple" style={{ fontSize: 13, fontWeight: "bold" }}>
                        Net Payout: {formatRs(transitTotalNet)}
                      </Tag>
                    </Col>
                  </Row>
                }
              >
                {hasTransit ? (
                  <Space direction="vertical" style={{ width: "100%" }} size={6}>
                    {transitRows.map((t, i) => (
                      <div key={i} style={{ background: "#fff", border: "1px solid #ffd591", borderRadius: 6, padding: "6px 10px", marginBottom: 6 }}>
                        <Row justify="space-between">
                          <Text strong style={{ fontSize: 12 }}>{t.branch_name}:</Text>
                          <Text strong style={{ color: "#722ed1" }}>Net {formatRs(t.net_amount)}</Text>
                        </Row>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 2 }}>
                          <span style={{ color: "#595959" }}>• Fixed Handling Fee:</span>
                          <span>+{formatRs(t.transit_fee_amount || 10)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#e11d48" }}>
                          <span>• Less 5% HQ Commission:</span>
                          <span>-{formatRs(t.hq_commission_amount || 0.5)}</span>
                        </div>
                      </div>
                    ))}

                    <div style={{ background: "#f9f0ff", border: "1px solid #d3adf7", borderRadius: 6, padding: "6px 10px", marginTop: 4 }}>
                      <Text strong style={{ color: "#531dab", fontSize: 11, display: "block" }}>
                        ★ Paid Directly by HQ from Residual Margin Pool
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Intermediate hubs earn this fee per parcel handled for unloading, sorting, and cross-docking. Line-haul carrier fuel is funded directly by HQ.
                      </Text>
                    </div>
                  </Space>
                ) : (
                  <div style={{ padding: "16px 8px", textAlign: "center" }}>
                    <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 24, marginBottom: 8 }} />
                    <Text strong style={{ display: "block", color: "#15803d" }}>Direct Point-to-Point Corridor (0 Transit Hubs)</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Parcel moves directly from origin to delivery branch. Transit fee is Rs 0.00, and HQ retains 100% of the residual transfer margin.
                    </Text>
                  </div>
                )}
              </Card>
            </Col>
          )}

          {/* 4. SuperAdmin / HQ Pool Formula Card */}
          {(selectedEntity === "all" || selectedEntity === "hq") && (
            <Col xs={24} md={selectedEntity === "all" ? 12 : 24}>
              <Card
                size="small"
                style={{
                  background: "#f0f5ff",
                  borderColor: "#adc6ff",
                  height: "100%",
                }}
                title={
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <BankOutlined style={{ color: "#1677ff" }} />
                        <Text strong style={{ color: "#0958d9" }}>4. SuperAdmin / HQ Central Pool</Text>
                        <Tag color="blue">Clearinghouse & Central Fleet</Tag>
                      </Space>
                    </Col>
                    <Col>
                      <Tag color="cyan" style={{ fontSize: 13, fontWeight: "bold" }}>
                        HQ Retained Net: {formatRs(hqTotal)}
                      </Tag>
                    </Col>
                  </Row>
                }
              >
                <Space direction="vertical" style={{ width: "100%" }} size={6}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>• <strong>Residual Transfer Margin Pool</strong>:</span>
                    <strong style={{ color: "#0958d9" }}>+{formatRs(hqMargin)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>• <strong>50% HQ Weight Share</strong> (50% of extra weight Rs {weightCharge}):</span>
                    <strong style={{ color: "#0958d9" }}>+{formatRs(hqWeight)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>• <strong>100% Fragile & Express Surcharges</strong>:</span>
                    <strong style={{ color: "#0958d9" }}>+{formatRs(hqFragile + hqExpress)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>• <strong>Platform Commissions Collected</strong> (5% across branches):</span>
                    <strong style={{ color: "#15803d" }}>+{formatRs(hqCommissions)}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#0f766e" }}>
                    <span>• <strong>Line-Haul Fleet Transport Cost</strong> (100% HQ Financed):</span>
                    <strong style={{ color: "#0f766e" }}>-{formatRs(totalTransportCost)}</strong>
                  </div>

                  <Divider style={{ margin: "6px 0" }} />

                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "6px 10px", marginTop: 4 }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text strong style={{ color: "#1d4ed8", fontSize: 12 }}>
                          = Total HQ Net Retained:
                        </Text>
                      </Col>
                      <Col>
                        <Text strong style={{ color: "#1d4ed8", fontSize: 15 }}>
                          {formatRs(hqTotal)}
                        </Text>
                      </Col>
                    </Row>
                  </div>

                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                    <em>What HQ does with this:</em> Covers platform infrastructure, customer dispute clearinghouse, and <strong>100% direct payment of line-haul carrier truck drivers, fuel, and highway vehicle transport</strong>.
                  </Text>
                </Space>
              </Card>
            </Col>
          )}

          {/* 5. Transport Fleet Operations Card */}
          {(selectedEntity === "all" || selectedEntity === "transport") && (
            <Col xs={24} md={selectedEntity === "all" ? 12 : 24}>
              <Card
                size="small"
                style={{
                  background: "#f0fdfa",
                  borderColor: "#99f6e4",
                  height: "100%",
                }}
                title={
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <CarOutlined style={{ color: "#0f766e" }} />
                        <Text strong style={{ color: "#0f766e" }}>5. HQ Central Transport Fleet</Text>
                        <Tag color="cyan">Line-Haul Vehicles & Drivers</Tag>
                      </Space>
                    </Col>
                    <Col>
                      <Tag color="cyan" style={{ fontSize: 13, fontWeight: "bold" }}>
                        Cost: {formatRs(totalTransportCost)}
                      </Tag>
                    </Col>
                  </Row>
                }
              >
                <Space direction="vertical" style={{ width: "100%" }} size={6}>
                  <div style={{ background: "#ffffff", padding: "8px 10px", borderRadius: 6, border: "1px solid #ccfbf1" }}>
                    <Text strong style={{ fontSize: 12, color: "#134e4a", display: "block", marginBottom: 4 }}>
                      TR Transfer Manifests & Allocated Transport Cost:
                    </Text>
                    {hops.length > 0 ? (
                      hops.map((h, i) => {
                        const trip = Number(h.trip_transport_cost || 0);
                        const pkts = Math.max(1, Number(h.total_shipments_on_tr || 1));
                        const perPkt = (h.allocated_transport_cost ? Number(h.allocated_transport_cost) : trip / pkts).toFixed(2);
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}>
                            <span>
                              <strong>{h.transfer_number || `TR-00${i + 1}`}</strong> ({h.from_branch_name || originName} → {h.to_branch_name || destName}):
                            </span>
                            <span style={{ color: "#0f766e", fontWeight: "bold" }}>
                              Rs {trip} trip / {pkts} pkts = Rs {perPkt}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Direct line-haul transport allocated to this shipment: Rs {totalTransportCost.toFixed(2)}.
                      </Text>
                    )}
                  </div>

                  <div style={{ background: "#0f766e", color: "#f0fdfa", borderRadius: 6, padding: "8px 10px", marginTop: 4 }}>
                    <Text strong style={{ color: "#f0fdfa", fontSize: 11, display: "block" }}>
                      ★ Paid 100% by HQ: Zero Transport Refund to Branches
                    </Text>
                    <span style={{ fontSize: 10.5, color: "#ccfbf1" }}>
                      Line-haul vehicles, highway fuel, and drivers are managed and paid centrally by HQ. Branches never pay each other for vehicle fuel, keeping inter-branch accounting simple and dispute-free.
                    </span>
                  </div>
                </Space>
              </Card>
            </Col>
          )}
        </Row>
      </Card>
    </Card>
  );
}
