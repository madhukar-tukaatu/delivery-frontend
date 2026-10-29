"use client";

import { useMemo, useState } from "react";
import {
  Card,
  Col,
  Divider,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  CalculatorOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  CarOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  FieldTimeOutlined,
} from "@ant-design/icons";
import { toBoolean } from "@/lib/pricing-settings-utils";

const { Text, Paragraph } = Typography;

function formatNpr(val) {
  const num = Number(val || 0);
  return `NPR ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PricingCalculationExampleCard({ pricingSetting, title = "Live Pricing Calculation Example & Audit" }) {
  if (!pricingSetting) return null;

  const s = pricingSetting;

  // Rule parameters from active/viewed version
  const baseWeightKg = Number(s.base_weight_kg ?? 1.5);
  const baseDistanceKm = Number(s.base_distance_km ?? 5.0);
  const localExtraWtRate = Number(s.local_extra_weight_rate ?? 20.0);
  const transferExtraWtRate = Number(s.transfer_extra_weight_rate ?? 30.0);
  const extraDistRate = Number(s.extra_distance_rate ?? 6.0);

  const fragileEnabled = toBoolean(s.fragile_enabled);
  const fragileMultiplier = fragileEnabled ? Number(s.fragile_multiplier ?? 1.5) : 1.0;

  const expressEnabled = toBoolean(s.express_enabled);
  const localExpressMultiplier = expressEnabled ? Number(s.local_express_multiplier ?? 1.25) : 1.0;
  const transferExpressMultiplier = expressEnabled ? Number(s.transfer_express_multiplier ?? 1.5) : 1.0;

  const sameDayEnabled = toBoolean(s.same_day_enabled);
  const localSameDayMultiplier = sameDayEnabled ? Number(s.local_same_day_multiplier ?? 1.5) : 1.0;
  const transferSameDayMultiplier = sameDayEnabled ? Number(s.transfer_same_day_multiplier ?? 2.0) : 1.0;
  const sameDayCutoff = s.same_day_cutoff_time || "12:00:00";

  const pickupEnabled = toBoolean(s.pickup_charge_enabled);
  const minFreePackets = Number(s.minimum_free_pickup_packets ?? 3);
  const smallPickupCharge = pickupEnabled ? Number(s.small_pickup_charge ?? 50.0) : 0.0;

  const vatEnabled = toBoolean(s.vat_enabled ?? false);
  const vatPercentage = vatEnabled ? Number(s.vat_percentage ?? 0) : 0;
  const vatInclusive = vatEnabled && s.vat_inclusive !== undefined ? toBoolean(s.vat_inclusive) : false;
  const moneyRounding = s.money_rounding || "round";

  // Simulation inputs
  const [routeType, setRouteType] = useState("transfer"); // 'local' | 'transfer'
  const [baseRate, setBaseRate] = useState(299);
  const [parcelWeight, setParcelWeight] = useState(3.5);
  const [deliveryDistance, setDeliveryDistance] = useState(12.0);
  const [serviceType, setServiceType] = useState("standard"); // 'standard' | 'express' | 'same_day'
  const [isFragile, setIsFragile] = useState(false);
  const [packetCount, setPacketCount] = useState(5);

  // Quick Presets
  const applyPreset = (preset) => {
    if (preset === "standard_transfer") {
      setRouteType("transfer");
      setBaseRate(299);
      setParcelWeight(3.5);
      setDeliveryDistance(12.0);
      setServiceType("standard");
      setIsFragile(false);
      setPacketCount(5);
    } else if (preset === "express_fragile") {
      setRouteType("transfer");
      setBaseRate(350);
      setParcelWeight(2.5);
      setDeliveryDistance(8.0);
      setServiceType("express");
      setIsFragile(true);
      setPacketCount(4);
    } else if (preset === "local_sameday") {
      setRouteType("local");
      setBaseRate(99);
      setParcelWeight(1.2);
      setDeliveryDistance(4.0);
      setServiceType("same_day");
      setIsFragile(false);
      setPacketCount(6);
    } else if (preset === "heavy_cargo") {
      setRouteType("transfer");
      setBaseRate(299);
      setParcelWeight(6.0);
      setDeliveryDistance(20.0);
      setServiceType("standard");
      setIsFragile(false);
      setPacketCount(2);
    }
  };

  // Step-by-Step Calculation Engine
  const calc = useMemo(() => {
    const isSameBranch = routeType === "local";

    // 1. Excess Weight
    const excessWeightKg = Math.max(0, parcelWeight - baseWeightKg);
    const weightRate = isSameBranch ? localExtraWtRate : transferExtraWtRate;
    const weightCharge = excessWeightKg * weightRate;
    const afterWeight = baseRate + weightCharge;

    // 2. Fragile Multiplier
    const fragileApplied = fragileEnabled && isFragile;
    const effectiveFragileMultiplier = fragileApplied ? fragileMultiplier : 1.0;
    const afterFragile = afterWeight * effectiveFragileMultiplier;
    const fragileCharge = afterFragile - afterWeight;

    // 3. Extra Distance
    const extraDistanceKm = Math.max(0, deliveryDistance - baseDistanceKm);
    const distanceCharge = extraDistanceKm * extraDistRate;
    const beforeService = afterFragile + distanceCharge;

    // 4. Speed Multipliers (Same Day or Express)
    let serviceMultiplier = 1.0;
    let serviceSurchargeName = "Standard Delivery";
    if (serviceType === "same_day" && sameDayEnabled) {
      serviceMultiplier = isSameBranch ? localSameDayMultiplier : transferSameDayMultiplier;
      serviceSurchargeName = `Same Day (Cutoff ${sameDayCutoff})`;
    } else if (serviceType === "express" && expressEnabled) {
      serviceMultiplier = isSameBranch ? localExpressMultiplier : transferExpressMultiplier;
      serviceSurchargeName = "Express Delivery";
    }

    const afterService = beforeService * serviceMultiplier;
    const serviceSurcharge = afterService - beforeService;

    // 5. Small Pickup Surcharge
    const pickupApplied = pickupEnabled && packetCount < minFreePackets;
    const pickupCharge = pickupApplied ? smallPickupCharge : 0.0;

    const subtotalBeforeVat = afterService + pickupCharge;

    // 6. VAT & Rounding
    let vatAmount = 0;
    let finalFare = subtotalBeforeVat;
    if (vatEnabled && vatPercentage > 0) {
      if (vatInclusive) {
        // VAT is already included inside finalFare
        vatAmount = subtotalBeforeVat - subtotalBeforeVat / (1 + vatPercentage / 100);
        finalFare = subtotalBeforeVat;
      } else {
        vatAmount = subtotalBeforeVat * (vatPercentage / 100);
        finalFare = subtotalBeforeVat + vatAmount;
      }
    } else {
      vatAmount = 0;
      finalFare = subtotalBeforeVat;
    }

    // Apply Rounding
    let roundedFare = finalFare;
    if (moneyRounding === "round") roundedFare = Math.round(finalFare);
    else if (moneyRounding === "ceil") roundedFare = Math.ceil(finalFare);
    else if (moneyRounding === "floor") roundedFare = Math.floor(finalFare);

    return {
      isSameBranch,
      excessWeightKg,
      weightRate,
      weightCharge,
      afterWeight,
      fragileApplied,
      effectiveFragileMultiplier,
      fragileCharge,
      afterFragile,
      extraDistanceKm,
      distanceCharge,
      beforeService,
      serviceMultiplier,
      serviceSurchargeName,
      serviceSurcharge,
      afterService,
      pickupApplied,
      pickupCharge,
      subtotalBeforeVat,
      vatAmount,
      finalFare,
      roundedFare,
    };
  }, [
    routeType,
    baseRate,
    parcelWeight,
    deliveryDistance,
    serviceType,
    isFragile,
    packetCount,
    baseWeightKg,
    baseDistanceKm,
    localExtraWtRate,
    transferExtraWtRate,
    extraDistRate,
    fragileEnabled,
    fragileMultiplier,
    expressEnabled,
    localExpressMultiplier,
    transferExpressMultiplier,
    sameDayEnabled,
    localSameDayMultiplier,
    transferSameDayMultiplier,
    sameDayCutoff,
    pickupEnabled,
    minFreePackets,
    smallPickupCharge,
    vatPercentage,
    vatInclusive,
    moneyRounding,
  ]);

  return (
    <Card
      size="small"
      title={
        <Row justify="space-between" align="middle" style={{ width: "100%" }}>
          <Col>
            <Space>
              <CalculatorOutlined style={{ color: "#2563eb", fontSize: 16 }} />
              <Text strong style={{ fontSize: 14 }}>
                {title}
              </Text>
              <Tag color="blue">{s.name || `Version #${s.id}`}</Tag>
            </Space>
          </Col>
          <Col>
            <Space wrap size={4}>
              <Text type="secondary" style={{ fontSize: 11 }}>1-Click Presets:</Text>
              <Tag
                color="geekblue"
                style={{ cursor: "pointer" }}
                onClick={() => applyPreset("standard_transfer")}
              >
                Standard Transfer (3.5kg)
              </Tag>
              <Tag
                color="orange"
                style={{ cursor: "pointer" }}
                onClick={() => applyPreset("express_fragile")}
              >
                Express Fragile (2.5kg)
              </Tag>
              <Tag
                color="purple"
                style={{ cursor: "pointer" }}
                onClick={() => applyPreset("local_sameday")}
              >
                Local Same-Day (1.2kg)
              </Tag>
              <Tag
                color="cyan"
                style={{ cursor: "pointer" }}
                onClick={() => applyPreset("heavy_cargo")}
              >
                Heavy Cargo (6kg, 20km)
              </Tag>
            </Space>
          </Col>
        </Row>
      }
      style={{
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
      }}
    >
      {/* Interactive Controls Bar */}
      <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 6, border: "1px solid #e2e8f0", marginBottom: 14 }}>
        <Row gutter={[12, 10]} align="middle">
          <Col xs={24} sm={12} md={4}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Route Type:</Text>
            <Radio.Group
              size="small"
              value={routeType}
              onChange={(e) => {
                setRouteType(e.target.value);
                setBaseRate(e.target.value === "local" ? 99 : 299);
              }}
            >
              <Radio.Button value="local">Local</Radio.Button>
              <Radio.Button value="transfer">Transfer</Radio.Button>
            </Radio.Group>
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Route Base Rate:</Text>
            <InputNumber
              size="small"
              min={0}
              step={10}
              prefix="NPR"
              value={baseRate}
              onChange={(v) => setBaseRate(Number(v || 0))}
              style={{ width: "100%" }}
            />
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Parcel Weight:</Text>
            <InputNumber
              size="small"
              min={0.1}
              step={0.5}
              addonAfter="kg"
              value={parcelWeight}
              onChange={(v) => setParcelWeight(Number(v || 0.1))}
              style={{ width: "100%" }}
            />
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Delivery Distance:</Text>
            <InputNumber
              size="small"
              min={0}
              step={1}
              addonAfter="km"
              value={deliveryDistance}
              onChange={(v) => setDeliveryDistance(Number(v || 0))}
              style={{ width: "100%" }}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Service Speed:</Text>
            <Select
              size="small"
              value={serviceType}
              onChange={setServiceType}
              style={{ width: "100%" }}
              options={[
                { label: "Standard", value: "standard" },
                { label: `Express (x${calc.isSameBranch ? localExpressMultiplier : transferExpressMultiplier})`, value: "express", disabled: !expressEnabled },
                { label: `Same Day (x${calc.isSameBranch ? localSameDayMultiplier : transferSameDayMultiplier})`, value: "same_day", disabled: !sameDayEnabled },
              ]}
            />
          </Col>

          <Col xs={12} sm={6} md={3}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Fragile Item:</Text>
            <Switch
              size="small"
              checked={isFragile}
              onChange={setIsFragile}
              checkedChildren="Yes"
              unCheckedChildren="No"
              disabled={!fragileEnabled}
            />
            {fragileEnabled ? (
              <span style={{ fontSize: 10, color: "#64748b", marginLeft: 6 }}>
                x{fragileMultiplier}
              </span>
            ) : null}
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>Pickup Packets:</Text>
            <InputNumber
              size="small"
              min={1}
              max={50}
              addonAfter="pkts"
              value={packetCount}
              onChange={(v) => setPacketCount(Number(v || 1))}
              style={{ width: "100%" }}
            />
          </Col>
        </Row>
      </div>

      {/* Step-by-Step Educational Breakdown */}
      <Row gutter={[16, 16]}>
        {/* Left Column: Mathematical Steps */}
        <Col xs={24} lg={15}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "12px 14px" }}>
            <Text strong style={{ fontSize: 13, color: "#0f172a", display: "block", marginBottom: 8 }}>
              Mathematical Step-by-Step Breakdown:
            </Text>

            <Space direction="vertical" size={6} style={{ width: "100%" }}>
              {/* Step 1: Base Rate */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span>
                  <strong>1. Route Base Rate</strong> ({routeType === "local" ? "Local Intra-Branch" : "Transfer Inter-Branch"} corridor rate):
                </span>
                <strong style={{ color: "#0f172a" }}>{formatNpr(baseRate)}</strong>
              </div>

              {/* Step 2: Weight */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <div>
                  <span><strong>2. Weight Add-on:</strong> </span>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {parcelWeight.toFixed(2)} kg &minus; {baseWeightKg.toFixed(2)} kg included = {calc.excessWeightKg.toFixed(2)} kg excess &times; NPR {calc.weightRate}/kg
                  </Text>
                </div>
                <strong style={{ color: calc.weightCharge > 0 ? "#2563eb" : "#64748b" }}>
                  +{formatNpr(calc.weightCharge)}
                </strong>
              </div>

              {/* Step 3: Fragile */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <div>
                  <span><strong>3. Fragile Multiplier:</strong> </span>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {calc.fragileApplied
                      ? `Applied x${fragileMultiplier.toFixed(4)} (+${((fragileMultiplier - 1) * 100).toFixed(0)}% on NPR ${calc.afterWeight.toFixed(2)})`
                      : "Not applicable (Standard parcel)"}
                  </Text>
                </div>
                <strong style={{ color: calc.fragileCharge > 0 ? "#ea580c" : "#64748b" }}>
                  +{formatNpr(calc.fragileCharge)}
                </strong>
              </div>

              {/* Step 4: Distance */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <div>
                  <span><strong>4. Extra Distance Charge:</strong> </span>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {deliveryDistance.toFixed(2)} km &minus; {baseDistanceKm.toFixed(2)} km included = {calc.extraDistanceKm.toFixed(2)} km extra &times; NPR {extraDistRate}/km
                  </Text>
                </div>
                <strong style={{ color: calc.distanceCharge > 0 ? "#0284c7" : "#64748b" }}>
                  +{formatNpr(calc.distanceCharge)}
                </strong>
              </div>

              {/* Step 5: Service Multipliers */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <div>
                  <span><strong>5. Service Speed Multiplier:</strong> </span>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {calc.serviceMultiplier > 1
                      ? `${calc.serviceSurchargeName}: x${calc.serviceMultiplier.toFixed(4)} (+${((calc.serviceMultiplier - 1) * 100).toFixed(0)}% on NPR ${calc.beforeService.toFixed(2)})`
                      : "Standard Delivery (x1.0000)"}
                  </Text>
                </div>
                <strong style={{ color: calc.serviceSurcharge > 0 ? "#7c3aed" : "#64748b" }}>
                  +{formatNpr(calc.serviceSurcharge)}
                </strong>
              </div>

              {/* Step 6: Pickup Fee */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <div>
                  <span><strong>6. First-Mile Pickup Fee:</strong> </span>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {calc.pickupApplied
                      ? `${packetCount} packets < ${minFreePackets} minimum free packets threshold`
                      : `${packetCount} packets &ge; ${minFreePackets} minimum (Free Pickup)`}
                  </Text>
                </div>
                <strong style={{ color: calc.pickupCharge > 0 ? "#ea580c" : "#64748b" }}>
                  +{formatNpr(calc.pickupCharge)}
                </strong>
              </div>

              <Divider style={{ margin: "4px 0" }} />

              {/* Step 7: VAT Breakdown */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <div>
                  <span><strong>7. Tax / VAT:</strong> </span>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {vatEnabled && vatPercentage > 0
                      ? `${vatPercentage.toFixed(2)}% ${vatInclusive ? "VAT Included in price" : "VAT added on top"}`
                      : "VAT Disabled (No tax calculated or added)"}
                  </Text>
                </div>
                <span style={{ color: vatEnabled && vatPercentage > 0 ? "#166534" : "#64748b", fontWeight: "bold" }}>
                  {vatEnabled && vatPercentage > 0
                    ? (vatInclusive ? `Includes ${formatNpr(calc.vatAmount)} VAT` : `+${formatNpr(calc.vatAmount)} VAT`)
                    : "NPR 0.00"}
                </span>
              </div>
            </Space>
          </div>
        </Col>

        {/* Right Column: Final Price Summary Box */}
        <Col xs={24} lg={9}>
          <div
            style={{
              background: "linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 100%)",
              border: "1px solid #86efac",
              borderRadius: 6,
              padding: "14px 16px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <Row justify="space-between" align="middle">
                <Text type="secondary" style={{ fontSize: 12 }}>Calculated Final Delivery Fare</Text>
                <Tag color={vatEnabled && vatPercentage > 0 ? "green" : "default"}>
                  {vatEnabled && vatPercentage > 0
                    ? `${vatPercentage.toFixed(0)}% VAT ${vatInclusive ? "Inclusive" : "Added"}`
                    : "No VAT Calculated"}
                </Tag>
              </Row>
              <div style={{ fontSize: 26, fontWeight: "bold", color: "#15803d", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                {formatNpr(calc.roundedFare)}
              </div>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
                Exact calculated: NPR {calc.finalFare.toFixed(2)} ({moneyRounding} rounding applied)
              </Text>

              <Divider style={{ margin: "10px 0" }} />

              <Space orientation="vertical" direction="vertical" size={4} style={{ width: "100%", fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#475569" }}>{vatEnabled && vatPercentage > 0 ? "Taxable Subtotal (excl. VAT):" : "Net Delivery Fare:"}</span>
                  <strong>{formatNpr(vatEnabled && vatPercentage > 0 ? calc.subtotalBeforeVat - calc.vatAmount : calc.subtotalBeforeVat)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#475569" }}>Tax / VAT ({vatEnabled && vatPercentage > 0 ? `${vatPercentage.toFixed(2)}%` : "Disabled"}):</span>
                  <strong style={{ color: vatEnabled && calc.vatAmount > 0 ? "#16a34a" : "#64748b" }}>
                    {vatEnabled && calc.vatAmount > 0 ? formatNpr(calc.vatAmount) : "NPR 0.00"}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#475569" }}>Small Pickup Surcharge:</span>
                  <span>{calc.pickupCharge > 0 ? formatNpr(calc.pickupCharge) : "NPR 0.00"}</span>
                </div>
              </Space>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #bbf7d0", borderRadius: 4, padding: "6px 10px", marginTop: 10 }}>
              <Text strong style={{ fontSize: 11, color: "#166534", display: "block" }}>
                ✓ Formula Verified with PricingRuleCalculator
              </Text>
              <span style={{ fontSize: 10.5, color: "#475569" }}>
                Base Fare + Excess Weight ({calc.excessWeightKg}kg &times; NPR {calc.weightRate}) + Excess Distance ({calc.extraDistanceKm}km &times; NPR {extraDistRate}) + Multipliers.
              </span>
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
}

