"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  InputNumber,
  Progress,
  Radio,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ControlOutlined,
  DollarCircleOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { formatRs } from "@/components/admin/billing/financeKit";

const { Text, Paragraph, Title } = Typography;

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

export default function TransferRulesEditor({ isHq, onRulesUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState(null);
  const [meta, setMeta] = useState({});
  const [editorMode, setEditorMode] = useState("detailed"); // 'detailed' | 'compact'

  async function load() {
    setLoading(true);
    try {
      const d = unwrap(await api.get("/admin/branch-shares/config"));
      setMeta(d || {});
      setRules(d?.rules || d?.default_rules || null);
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load settlement rules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateField(path, value) {
    setRules((prev) => {
      const copy = JSON.parse(JSON.stringify(prev || {}));
      let target = copy;
      for (let i = 0; i < path.length - 1; i++) {
        if (!target[path[i]]) target[path[i]] = {};
        target = target[path[i]];
      }
      target[path[path.length - 1]] = typeof value === "string" ? value : Number(value ?? 0);
      return copy;
    });
  }

  function applyPreset(type) {
    if (!rules) return;
    const copy = JSON.parse(JSON.stringify(rules));
    if (!copy.transfer_delivery) copy.transfer_delivery = {};

    if (type === "standard_30_70") {
      copy.transfer_delivery.base_rate_split = { origin_percent: 30, destination_percent: 70 };
      copy.transfer_delivery.dest_local_base_share = { origin_percent: 30, delivery_percent: 70 };
      copy.transfer_delivery.transit_handling_fee = { mode: "fixed", fixed_amount_per_branch: 10, transit_percent: 40, hq_percent: 60 };
      copy.transfer_delivery.transfer_margin_split = { mode: "fixed", fixed_amount_per_branch: 10, transit_percent: 40, hq_percent: 60 };
      copy.transfer_delivery.extra_weight_split = { hq_percent: 50, branch_origin_percent: 30, branch_destination_percent: 70 };
      copy.transfer_delivery.hq_commission_percent = 5.0;
      message.success("Applied Standard Preset: 30% Origin / 70% Delivery | Rs 10 Transit Fee | 5% HQ Comm.");
    } else if (type === "balanced_50_50") {
      copy.transfer_delivery.base_rate_split = { origin_percent: 50, destination_percent: 50 };
      copy.transfer_delivery.dest_local_base_share = { origin_percent: 50, delivery_percent: 50 };
      copy.transfer_delivery.transit_handling_fee = { mode: "fixed", fixed_amount_per_branch: 10, transit_percent: 40, hq_percent: 60 };
      copy.transfer_delivery.transfer_margin_split = { mode: "fixed", fixed_amount_per_branch: 10, transit_percent: 40, hq_percent: 60 };
      copy.transfer_delivery.extra_weight_split = { hq_percent: 50, branch_origin_percent: 50, branch_destination_percent: 50 };
      copy.transfer_delivery.hq_commission_percent = 5.0;
      message.success("Applied Balanced Preset: 50% Origin / 50% Delivery | Rs 10 Transit Fee.");
    } else if (type === "origin_favored_40_60") {
      copy.transfer_delivery.base_rate_split = { origin_percent: 40, destination_percent: 60 };
      copy.transfer_delivery.dest_local_base_share = { origin_percent: 40, delivery_percent: 60 };
      copy.transfer_delivery.transit_handling_fee = { mode: "fixed", fixed_amount_per_branch: 15, transit_percent: 40, hq_percent: 60 };
      copy.transfer_delivery.transfer_margin_split = { mode: "fixed", fixed_amount_per_branch: 15, transit_percent: 40, hq_percent: 60 };
      copy.transfer_delivery.extra_weight_split = { hq_percent: 40, branch_origin_percent: 40, branch_destination_percent: 60 };
      copy.transfer_delivery.hq_commission_percent = 5.0;
      message.success("Applied Origin-Favored Preset: 40% Origin / 60% Delivery | Rs 15 Transit Fee.");
    }

    setRules(copy);
  }

  function updateTransitHandlingMode(mode) {
    setRules((prev) => {
      const copy = JSON.parse(JSON.stringify(prev || {}));
      if (!copy.transfer_delivery) copy.transfer_delivery = {};
      if (!copy.transfer_delivery.transit_handling_fee) copy.transfer_delivery.transit_handling_fee = {};
      if (!copy.transfer_delivery.transfer_margin_split) copy.transfer_delivery.transfer_margin_split = {};
      copy.transfer_delivery.transit_handling_fee.mode = mode;
      copy.transfer_delivery.transfer_margin_split.mode = mode;
      return copy;
    });
  }

  function updateFixedTransitFee(val) {
    setRules((prev) => {
      const copy = JSON.parse(JSON.stringify(prev || {}));
      if (!copy.transfer_delivery) copy.transfer_delivery = {};
      if (!copy.transfer_delivery.transit_handling_fee) copy.transfer_delivery.transit_handling_fee = {};
      if (!copy.transfer_delivery.transfer_margin_split) copy.transfer_delivery.transfer_margin_split = {};
      const num = Math.max(0, Number(val ?? 0));
      copy.transfer_delivery.transit_handling_fee.fixed_amount_per_branch = num;
      copy.transfer_delivery.transfer_margin_split.fixed_amount_per_branch = num;
      return copy;
    });
  }

  async function save() {
    if (!rules) return;

    // Validate Base Rate split = 100%
    const baseOrigin = Number(rules?.transfer_delivery?.base_rate_split?.origin_percent ?? rules?.transfer_delivery?.dest_local_base_share?.origin_percent ?? 0);
    const baseDest = Number(rules?.transfer_delivery?.base_rate_split?.destination_percent ?? rules?.transfer_delivery?.dest_local_base_share?.delivery_percent ?? 0);
    if (Math.abs(baseOrigin + baseDest - 100) > 0.001) {
      message.error(`Base rate split must add up to 100% (currently ${baseOrigin + baseDest}%).`);
      return;
    }

    // Keep dest_local_base_share in sync
    rules.transfer_delivery.dest_local_base_share = {
      origin_percent: baseOrigin,
      delivery_percent: baseDest,
    };

    // Validate Weight branch split = 100%
    const wOrigin = Number(rules?.transfer_delivery?.extra_weight_split?.branch_origin_percent || 0);
    const wDest = Number(rules?.transfer_delivery?.extra_weight_split?.branch_destination_percent || 0);
    if (Math.abs(wOrigin + wDest - 100) > 0.001) {
      message.error(`Extra weight branch split must add up to 100% (currently ${wOrigin + wDest}%).`);
      return;
    }

    // Validate Margin split only if mode is percent
    const transitMode = rules?.transfer_delivery?.transit_handling_fee?.mode || rules?.transfer_delivery?.transfer_margin_split?.mode || "fixed";
    if (transitMode === "percent") {
      const mTransit = Number(rules?.transfer_delivery?.transit_handling_fee?.transit_percent ?? rules?.transfer_delivery?.transfer_margin_split?.transit_percent ?? 0);
      const mHq = Number(rules?.transfer_delivery?.transit_handling_fee?.hq_percent ?? rules?.transfer_delivery?.transfer_margin_split?.hq_percent ?? 0);
      if (Math.abs(mTransit + mHq - 100) > 0.001) {
        message.error(`Transfer margin percentage split must add up to 100% (currently ${mTransit + mHq}%).`);
        return;
      }
    }

    setSaving(true);
    try {
      const d = unwrap(await api.post("/admin/branch-shares/config", { rules }));
      message.success("Dynamic settlement rules saved successfully.");
      if (onRulesUpdated) onRulesUpdated(d?.rules || rules);
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to save settlement rules.");
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    if (meta?.default_rules) {
      setRules(JSON.parse(JSON.stringify(meta.default_rules)));
      message.info("Reset to system defaults. Click Save Rules to apply.");
    }
  }

  if (loading && !rules) {
    return <Card loading title="Dynamic Transfer Share & Settlement Rules" />;
  }

  const baseOrigin = rules?.transfer_delivery?.base_rate_split?.origin_percent ?? rules?.transfer_delivery?.dest_local_base_share?.origin_percent ?? 30;
  const baseDest = rules?.transfer_delivery?.base_rate_split?.destination_percent ?? rules?.transfer_delivery?.dest_local_base_share?.delivery_percent ?? 70;
  const baseSum = Number(baseOrigin) + Number(baseDest);

  const wHq = rules?.transfer_delivery?.extra_weight_split?.hq_percent ?? 50;
  const wOrigin = rules?.transfer_delivery?.extra_weight_split?.branch_origin_percent ?? 30;
  const wDest = rules?.transfer_delivery?.extra_weight_split?.branch_destination_percent ?? 70;
  const wSum = Number(wOrigin) + Number(wDest);

  const transitMode = rules?.transfer_delivery?.transit_handling_fee?.mode || rules?.transfer_delivery?.transfer_margin_split?.mode || "fixed";
  const fixedTransitFee = rules?.transfer_delivery?.transit_handling_fee?.fixed_amount_per_branch ?? rules?.transfer_delivery?.transfer_margin_split?.fixed_amount_per_branch ?? 10.0;
  const mTransit = rules?.transfer_delivery?.transit_handling_fee?.transit_percent ?? rules?.transfer_delivery?.transfer_margin_split?.transit_percent ?? 40;
  const mHq = rules?.transfer_delivery?.transit_handling_fee?.hq_percent ?? rules?.transfer_delivery?.transfer_margin_split?.hq_percent ?? 60;
  const mSum = Number(mTransit) + Number(mHq);

  const hqComm = rules?.transfer_delivery?.hq_commission_percent ?? 5;

  return (
    <Card
      title={
        <Row justify="space-between" align="middle" style={{ width: "100%" }}>
          <Col>
            <Space>
              <ControlOutlined style={{ color: "#1677ff", fontSize: 18 }} />
              <span style={{ fontSize: 16, fontWeight: "bold" }}>
                Dynamic Transfer Share & Settlement Rules
              </span>
              <Tag color={meta?.rules_is_default ? "blue" : "purple"}>
                {meta?.rules_is_default ? "Default System Presets" : "Custom Rules Active"}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space wrap>
              <Segmented
                size="small"
                value={editorMode}
                onChange={setEditorMode}
                options={[
                  { label: <Space><ControlOutlined /><span>Detailed Form</span></Space>, value: "detailed" },
                  { label: <Space><AppstoreOutlined /><span>Compact Policy Matrix</span></Space>, value: "compact" },
                ]}
              />
              {isHq && (
                <>
                  <Button size="small" icon={<UndoOutlined />} onClick={resetToDefaults}>
                    Reset Defaults
                  </Button>
                  <Button type="primary" size="small" icon={<SaveOutlined />} loading={saving} onClick={save}>
                    Save Rules
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      }
    >
      <Paragraph type="secondary" style={{ marginTop: 0, fontSize: 13 }}>
        Configure how each delivered transfer shipment's fare components (base rate, extra weight, distance, surcharges, and transfer margins)
        are dynamically distributed between Origin, Transit, Destination branches, and HQ.
      </Paragraph>

      {/* Preset Fast-Loader Bar */}
      {isHq && (
        <Card size="small" style={{ marginBottom: 16, background: "#fafafa" }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <ThunderboltOutlined style={{ color: "#fa8c16" }} />
                <Text strong style={{ fontSize: 12 }}>Quick Configuration Presets:</Text>
              </Space>
            </Col>
            <Col>
              <Space wrap>
                <Button size="small" onClick={() => applyPreset("standard_30_70")}>
                  ⚡ Standard (30% Origin / 70% Delivery, Rs 10 Transit)
                </Button>
                <Button size="small" onClick={() => applyPreset("balanced_50_50")}>
                  Equal Endpoints (50% / 50%)
                </Button>
                <Button size="small" onClick={() => applyPreset("origin_favored_40_60")}>
                  Origin-Favored (40% / 60%, Rs 15 Transit)
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* ===================== DETAILED FORM VIEW ===================== */}
      {editorMode === "detailed" && (
        <Row gutter={[20, 20]}>
          {/* 1. Base Rate Split */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              title={<Space><CheckCircleOutlined style={{ color: "#1677ff" }} /><span>1. Destination Local Base Rate Split</span></Space>}
              style={{ height: "100%", background: "#fcfdff" }}
            >
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                The destination branch's local base rate (e.g. NPR 99) is divided between the endpoint branches:
              </Text>

              {/* Visual Split Bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", background: "#f0f0f0" }}>
                  <div style={{ width: `${Math.min(100, baseOrigin)}%`, background: "#1677ff", transition: "width 0.3s" }} />
                  <div style={{ width: `${Math.min(100, baseDest)}%`, background: "#13c2c2", transition: "width 0.3s" }} />
                </div>
                <Row justify="space-between" style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: "#1677ff" }}>Origin: {baseOrigin}%</Text>
                  <Text style={{ fontSize: 11, color: "#13c2c2" }}>Destination: {baseDest}%</Text>
                </Row>
              </div>

              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <Row align="middle" justify="space-between">
                  <Col><Text strong>Origin Branch Share:</Text></Col>
                  <Col>
                    <InputNumber
                      min={0}
                      max={100}
                      step={1}
                      value={baseOrigin}
                      disabled={!isHq}
                      addonAfter="%"
                      style={{ width: 130 }}
                      onChange={(v) => {
                        const num = Number(v ?? 0);
                        updateField(["transfer_delivery", "base_rate_split", "origin_percent"], num);
                        updateField(["transfer_delivery", "base_rate_split", "destination_percent"], 100 - num);
                      }}
                    />
                  </Col>
                </Row>
                <Row align="middle" justify="space-between">
                  <Col><Text strong>Destination Branch Share:</Text></Col>
                  <Col>
                    <InputNumber
                      min={0}
                      max={100}
                      step={1}
                      value={baseDest}
                      disabled={!isHq}
                      addonAfter="%"
                      style={{ width: 130 }}
                      onChange={(v) => {
                        const num = Number(v ?? 0);
                        updateField(["transfer_delivery", "base_rate_split", "destination_percent"], num);
                        updateField(["transfer_delivery", "base_rate_split", "origin_percent"], 100 - num);
                      }}
                    />
                  </Col>
                </Row>
                <Row justify="end">
                  <Tag color={Math.abs(baseSum - 100) < 0.001 ? "green" : "red"}>
                    Sum = {baseSum}%
                  </Tag>
                </Row>
              </Space>
            </Card>
          </Col>

          {/* 2. Transit Handling Fee Policy */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              title={<Space><DollarCircleOutlined style={{ color: "#722ed1" }} /><span>2. Transit Hub Handling Fee Policy</span></Space>}
              style={{ height: "100%", background: "#fcfdff" }}
            >
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                How intermediate transit hubs (e.g. Bharatpur) are remunerated by HQ per shipment:
              </Text>

              <Radio.Group
                value={transitMode}
                disabled={!isHq}
                onChange={(e) => updateTransitHandlingMode(e.target.value)}
                style={{ marginBottom: 14 }}
              >
                <Space direction="vertical">
                  <Radio value="fixed">
                    <Text strong>Fixed Fee per Transit Hub (Recommended)</Text>
                    <Text type="secondary" style={{ display: "block", fontSize: 11, marginLeft: 24 }}>
                      HQ pays a fixed amount (default NPR 10.00) directly to each intermediate hub.
                    </Text>
                  </Radio>
                  <Radio value="percent">
                    <Text strong>Percentage of Residual Transfer Margin Pool</Text>
                    <Text type="secondary" style={{ display: "block", fontSize: 11, marginLeft: 24 }}>
                      Transit hubs split an allocated percent of the margin pool.
                    </Text>
                  </Radio>
                </Space>
              </Radio.Group>

              {transitMode === "fixed" ? (
                <Row align="middle" justify="space-between" style={{ background: "#f9f0ff", padding: "8px 12px", borderRadius: 6 }}>
                  <Col>
                    <Text strong style={{ color: "#722ed1" }}>Fixed Handling Fee per Hub:</Text>
                    <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                      Disbursed directly by HQ from residual margin pool
                    </Text>
                  </Col>
                  <Col>
                    <InputNumber
                      min={0}
                      step={5}
                      prefix="Rs"
                      value={fixedTransitFee}
                      disabled={!isHq}
                      addonAfter="per hub"
                      style={{ width: 140 }}
                      onChange={updateFixedTransitFee}
                    />
                  </Col>
                </Row>
              ) : (
                <Space direction="vertical" style={{ width: "100%" }} size={8}>
                  <Row align="middle" justify="space-between">
                    <Col><Text>Transit Hubs Margin Share:</Text></Col>
                    <Col>
                      <InputNumber
                        min={0}
                        max={100}
                        value={mTransit}
                        disabled={!isHq}
                        addonAfter="%"
                        style={{ width: 120 }}
                        onChange={(v) => {
                          updateField(["transfer_delivery", "transit_handling_fee", "transit_percent"], v);
                          updateField(["transfer_delivery", "transfer_margin_split", "transit_percent"], v);
                        }}
                      />
                    </Col>
                  </Row>
                  <Row align="middle" justify="space-between">
                    <Col><Text>HQ Retained Margin Share:</Text></Col>
                    <Col>
                      <InputNumber
                        min={0}
                        max={100}
                        value={mHq}
                        disabled={!isHq}
                        addonAfter="%"
                        style={{ width: 120 }}
                        onChange={(v) => {
                          updateField(["transfer_delivery", "transit_handling_fee", "hq_percent"], v);
                          updateField(["transfer_delivery", "transfer_margin_split", "hq_percent"], v);
                        }}
                      />
                    </Col>
                  </Row>
                  <Row justify="end">
                    <Tag color={Math.abs(mSum - 100) < 0.001 ? "green" : "red"}>Sum = {mSum}%</Tag>
                  </Row>
                </Space>
              )}
            </Card>
          </Col>

          {/* 3. Extra Weight Split */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              title="3. Extra Weight Charge Split"
              style={{ height: "100%", background: "#fcfdff" }}
            >
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12 }}>
                Excess weight fees are shared between HQ and the two endpoint branches:
              </Text>
              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <Row align="middle" justify="space-between">
                  <Col><Text strong>HQ Retained Share:</Text></Col>
                  <Col>
                    <InputNumber
                      min={0}
                      max={100}
                      step={1}
                      value={wHq}
                      disabled={!isHq}
                      addonAfter="%"
                      style={{ width: 130 }}
                      onChange={(v) => updateField(["transfer_delivery", "extra_weight_split", "hq_percent"], v)}
                    />
                  </Col>
                </Row>
                <Row align="middle" justify="space-between">
                  <Col><Text>Remaining Origin Share:</Text></Col>
                  <Col>
                    <InputNumber
                      min={0}
                      max={100}
                      step={1}
                      value={wOrigin}
                      disabled={!isHq}
                      addonAfter="%"
                      style={{ width: 130 }}
                      onChange={(v) => updateField(["transfer_delivery", "extra_weight_split", "branch_origin_percent"], v)}
                    />
                  </Col>
                </Row>
                <Row align="middle" justify="space-between">
                  <Col><Text>Remaining Destination Share:</Text></Col>
                  <Col>
                    <InputNumber
                      min={0}
                      max={100}
                      step={1}
                      value={wDest}
                      disabled={!isHq}
                      addonAfter="%"
                      style={{ width: 130 }}
                      onChange={(v) => updateField(["transfer_delivery", "extra_weight_split", "branch_destination_percent"], v)}
                    />
                  </Col>
                </Row>
                <Row justify="end">
                  <Tag color={Math.abs(wSum - 100) < 0.001 ? "green" : "red"}>Branch Sum = {wSum}%</Tag>
                </Row>
              </Space>
            </Card>
          </Col>

          {/* 4. HQ Commission & Transport Management Notice */}
          <Col xs={24} md={12}>
            <Card
              size="small"
              title="4. HQ Commission & Fleet Transportation Policy"
              style={{ height: "100%", background: "#fcfdff" }}
            >
              <Space direction="vertical" style={{ width: "100%" }} size={12}>
                <Row align="middle" justify="space-between">
                  <Col>
                    <Text strong>HQ Commission Rate %:</Text>
                    <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                      Deducted from branch operational earnings (base, distance, weight, transit fee)
                    </Text>
                  </Col>
                  <Col>
                    <InputNumber
                      min={0}
                      max={30}
                      step={0.5}
                      value={hqComm}
                      disabled={!isHq}
                      addonAfter="%"
                      style={{ width: 130 }}
                      onChange={(v) => updateField(["transfer_delivery", "hq_commission_percent"], v)}
                    />
                  </Col>
                </Row>

                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 8 }}
                  message="Centralized Fleet Management"
                  description="Vehicle fuel, TR trip manifests, and line-haul logistics are financed directly by HQ from its retained transfer margin. Branches do not receive transport reimbursements."
                />
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* ===================== COMPACT POLICY MATRIX VIEW ===================== */}
      {editorMode === "compact" && (
        <Card size="small" title="Dynamic Transfer Settlement Policy Matrix">
          <Table
            size="small"
            pagination={false}
            dataSource={[
              {
                key: "base",
                component: "Destination Local Base Rate",
                formula: "e.g. NPR 99 local delivery rate",
                origin: `${baseOrigin}%`,
                transit: "-",
                dest: `${baseDest}%`,
                hq: "-",
                rule: "Shared 30:70 between Origin booking branch and Delivering branch.",
              },
              {
                key: "distance",
                component: "Extra Last-Mile Distance",
                formula: "Rate per km beyond branch threshold",
                origin: "-",
                transit: "-",
                dest: "100%",
                hq: "-",
                rule: "Delivering branch performs all doorstep delivery mileage.",
              },
              {
                key: "weight",
                component: "Extra Weight Charge",
                formula: "Rate per kg excess weight",
                origin: `${Math.round((100 - wHq) * (wOrigin / 100))}%`,
                transit: "-",
                dest: `${Math.round((100 - wHq) * (wDest / 100))}%`,
                hq: `${wHq}%`,
                rule: `50% to HQ central clearinghouse; remainder shared ${wOrigin}:${wDest} by endpoints.`,
              },
              {
                key: "transit",
                component: "Transit Hub Handling Fee",
                formula: transitMode === "fixed" ? `Fixed Rs ${fixedTransitFee} / hub` : `${mTransit}% margin pool`,
                origin: "-",
                transit: transitMode === "fixed" ? `Rs ${fixedTransitFee} net` : `${mTransit}%`,
                dest: "-",
                hq: transitMode === "fixed" ? "Paid by HQ" : `${mHq}%`,
                rule: "Paid directly by HQ to each transit hub handling the parcel.",
              },
              {
                key: "transport",
                component: "Line-Haul TR Transport",
                formula: "TR container trip manifest costs",
                origin: "Rs 0",
                transit: "Rs 0",
                dest: "Rs 0",
                hq: "100% Absorbed",
                rule: "Centrally managed by HQ. Branches receive zero transport refund.",
              },
              {
                key: "surcharges",
                component: "Fragile / Express Surcharges",
                formula: "Special service add-ons",
                origin: "-",
                transit: "-",
                dest: "-",
                hq: "100%",
                rule: "Risk and express priority coverage retained by SuperAdmin / HQ.",
              },
              {
                key: "commission",
                component: "HQ Platform Commission",
                formula: `${hqComm}% on operational revenue`,
                origin: `-${hqComm}%`,
                transit: `-${hqComm}%`,
                dest: `-${hqComm}%`,
                hq: `+${hqComm}%`,
                rule: "Applied uniformly across all participating branches.",
              },
            ]}
            columns={[
              { title: "Fare Component", dataIndex: "component", key: "component", render: (v) => <Text strong>{v}</Text> },
              { title: "Basis / Formula", dataIndex: "formula", key: "formula", render: (v) => <Tag color="geekblue">{v}</Tag> },
              { title: "Origin Share", dataIndex: "origin", key: "origin", align: "center" },
              { title: "Transit Share", dataIndex: "transit", key: "transit", align: "center" },
              { title: "Delivery Share", dataIndex: "dest", key: "dest", align: "center" },
              { title: "HQ Share", dataIndex: "hq", key: "hq", align: "center" },
              { title: "Operational Rule Description", dataIndex: "rule", key: "rule", render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
            ]}
          />
        </Card>
      )}
    </Card>
  );
}
