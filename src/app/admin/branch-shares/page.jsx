"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  PartitionOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CalculatorOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import BranchScopeNotice, { useIsFinanceHq } from "@/components/admin/billing/BranchScopeNotice";
import api from "@/lib/api";
import { formatRs } from "@/components/admin/billing/financeKit";
import ShipmentSplitTable from "@/components/admin/billing/ShipmentSplitTable";
import ShipmentSettlementDrawer from "@/components/admin/billing/ShipmentSettlementDrawer";
import TransferRulesEditor from "@/components/admin/billing/TransferRulesEditor";
import SettlementSimulator from "@/components/admin/billing/SettlementSimulator";
import BranchWiseReports from "@/components/admin/billing/BranchWiseReports";
import InterBranchPositionTab from "@/components/admin/billing/InterBranchPositionTab";

const { Text, Paragraph } = Typography;

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

function ShareTableEditor({ isHq }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const d = unwrap(await api.get("/admin/branch-shares/config"));
      const table = d?.table || {};
      const loaded = Object.keys(table)
        .map(Number)
        .sort((a, b) => a - b)
        .map((count) => {
          let percents = table[count].map(Number);
          const sum = percents.reduce((a, b) => a + Number(b || 0), 0);
          // Auto-fix if a saved row doesn't add up to 100 (e.g. [25, 20, 35] = 80%)
          if (Math.abs(sum - 100) > 0.001) {
            if (count === 3 && percents[1] === 20) {
              percents = [24, 20, 56];
            } else if (count === 3) {
              percents = [18, 40, 42];
            } else {
              const diff = 100 - sum;
              percents[percents.length - 1] = Number((percents[percents.length - 1] + diff).toFixed(4));
            }
          }
          return { count, percents };
        });
      setRows(loaded);
      setMeta(d || {});
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load the share table.");
    }
  }

  function autoFixAll() {
    setRows((rs) =>
      rs.map((r) => {
        const sum = r.percents.reduce((a, b) => a + Number(b || 0), 0);
        if (Math.abs(sum - 100) <= 0.001) return r;
        if (r.count === 3 && r.percents[1] === 20) {
          return { ...r, percents: [24, 20, 56] };
        }
        if (r.count === 3) {
          return { ...r, percents: [18, 40, 42] };
        }
        const diff = 100 - sum;
        const copy = [...r.percents];
        copy[copy.length - 1] = Number((copy[copy.length - 1] + diff).toFixed(4));
        return { ...r, percents: copy };
      })
    );
    message.success("Rows normalized to 100%. Click Save Table to apply.");
  }

  function resetTo3070Defaults() {
    const defaults = {
      1: [100],
      2: [30, 70],
      3: [18, 40, 42],
      4: [18, 20, 20, 42],
      5: [18, 13.3333, 13.3334, 13.3333, 42],
    };
    setRows(
      Object.keys(defaults)
        .map(Number)
        .sort((a, b) => a - b)
        .map((count) => ({ count, percents: defaults[count] }))
    );
    message.info("Reset to 30/70 Origin/Delivery ratio defaults. Click Save Table to apply.");
  }

  useEffect(() => {
    load();
  }, []);

  function setPercent(count, idx, value) {
    setRows((rs) => rs.map((r) => (r.count === count ? { ...r, percents: r.percents.map((p, i) => (i === idx ? Number(value ?? 0) : p)) } : r)));
  }

  function addRow() {
    const next = (rows[rows.length - 1]?.count || 0) + 1;
    const even = Math.floor(100 / next);
    const percents = Array.from({ length: next }, (_, i) => (i === next - 1 ? 100 - even * (next - 1) : even));
    setRows((rs) => [...rs, { count: next, percents }]);
  }

  function removeLast() {
    setRows((rs) => rs.slice(0, -1));
  }

  async function save() {
    const bad = rows.find((r) => Math.abs(r.percents.reduce((a, b) => a + Number(b || 0), 0) - 100) > 0.0001);
    if (bad) {
      message.error(`Row for ${bad.count} branch(es) must add up to 100.`);
      return;
    }
    setSaving(true);
    try {
      const table = Object.fromEntries(rows.map((r) => [r.count, r.percents]));
      const d = unwrap(await api.post("/admin/branch-shares/config", { table }));
      message.success(
        d?.retried_pending_config ? `Saved. ${d.retried_pending_config} waiting shipment(s) were split.` : "Branch share table saved."
      );
      load();
    } catch (e) {
      const errors = e?.response?.data?.errors;
      message.error((errors && Object.values(errors).flat()[0]) || e?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const label = (count, i) => (count === 1 ? "Only branch" : i === 0 ? "Origin" : i === count - 1 ? "Delivery" : `Transit ${i}`);

  return (
    <Card
      title="Fallback Table: Share Percent by Branch Count"
      size="small"
      extra={
        isHq ? (
          <Space wrap>
            <Button size="small" onClick={resetTo3070Defaults}>30/70 Defaults</Button>
            <Button size="small" onClick={autoFixAll}>Auto-Fix to 100%</Button>
            <Button size="small" icon={<PlusOutlined />} onClick={addRow}>Add row</Button>
            <Button size="small" icon={<DeleteOutlined />} disabled={rows.length <= 1} onClick={removeLast}>Remove last</Button>
            <Button size="small" type="primary" loading={saving} onClick={save}>Save Table</Button>
          </Space>
        ) : null
      }
    >
      <Paragraph type="secondary" style={{ marginTop: 0, fontSize: 13 }}>
        Fallback table (used when dynamic rules are unset). Origin and Delivery maintain the 30:70 ratio, while transit hubs receive their share from the transfer margin. Every row must equal 100%.
      </Paragraph>
      <Space direction="vertical" style={{ width: "100%" }}>
        {rows.map((r) => {
          const sum = r.percents.reduce((a, b) => a + Number(b || 0), 0);
          return (
            <Space key={r.count} wrap align="center">
              <Text strong style={{ width: 90, display: "inline-block" }}>{r.count} branch{r.count > 1 ? "es" : ""}</Text>
              {r.percents.map((p, i) => (
                <Space key={i} direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{label(r.count, i)}</Text>
                  <InputNumber
                    min={0}
                    max={100}
                    step={1}
                    value={p}
                    disabled={!isHq}
                    addonAfter="%"
                    style={{ width: 100 }}
                    onChange={(v) => setPercent(r.count, i, v)}
                  />
                </Space>
              ))}
              <Tag color={Math.abs(sum - 100) < 0.0001 ? "green" : "red"}>= {Number(sum.toFixed(4))}%</Tag>
            </Space>
          );
        })}
      </Space>
    </Card>
  );
}

export default function BranchSharesPage() {
  const isHq = useIsFinanceHq();
  const [activeTab, setActiveTab] = useState("shares");

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [viewerIds, setViewerIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [filters, setFilters] = useState({ status: undefined, role: undefined, search: "", range: null });
  const [settleId, setSettleId] = useState(null);

  // Dynamic config & branches for simulator
  const [branches, setBranches] = useState([]);
  const [activeRules, setActiveRules] = useState(null);

  async function loadConfig() {
    try {
      const d = unwrap(await api.get("/admin/branch-shares/config"));
      if (d?.branches) setBranches(d.branches);
      if (d?.rules) setActiveRules(d.rules);
    } catch {
      // quiet fallback
    }
  }

  async function load(page = 1, pageSize = pagination.pageSize) {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, status: filters.status, role: filters.role, search: filters.search || undefined };
      if (filters.range?.[0]) params.from = filters.range[0].format("YYYY-MM-DD");
      if (filters.range?.[1]) params.to = filters.range[1].format("YYYY-MM-DD");
      let d;
      try {
        d = unwrap(await api.get("/admin/branch-shares", { params }));
      } catch (e) {
        if (e?.response?.status !== 403) throw e;
        d = unwrap(await api.get("/admin/inter-branch-settlements/shipments", { params }));
      }
      const p = d?.shipments || {};
      setRows(p?.data || []);
      setSummary(d?.summary || {});
      setViewerIds((d?.viewer_branch_ids || []).map(Number));
      setPagination({ current: p?.current_page || page, pageSize: p?.per_page || pageSize, total: p?.total || 0 });
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load branch shares.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.role, filters.range]);

  const mine = viewerIds.length > 0;

  const tabItems = [
    {
      key: "shares",
      label: (
        <Space>
          <UnorderedListOutlined />
          <span>Delivered Allocations</span>
        </Space>
      ),
      children: (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><Card><Statistic title="Shipments" value={summary?.shipments || 0} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Fare" prefix="Rs" precision={2} value={summary?.fare || 0} /></Card></Col>
            {mine ? (
              <>
                <Col xs={12} md={6}><Card><Statistic title="Your share" prefix="Rs" precision={2} value={summary?.your_allocation || 0} /></Card></Col>
                <Col xs={12} md={6}>
                  <Card>
                    <Statistic title="Your net (after HQ)" prefix="Rs" precision={2} value={summary?.your_net || 0} />
                    <Text type="secondary" style={{ fontSize: 12 }}>HQ {formatRs(summary?.your_hq_commission)}</Text>
                  </Card>
                </Col>
              </>
            ) : (
              <>
                <Col xs={12} md={6}><Card><Statistic title="HQ commission" prefix="Rs" precision={2} value={summary?.hq_commission || 0} /></Card></Col>
                <Col xs={12} md={6}><Card><Statistic title="Net to branches" prefix="Rs" precision={2} value={summary?.net || 0} /></Card></Col>
              </>
            )}
          </Row>

          <Card title="Per-shipment allocation" extra={<Text type="secondary">Click a row for the per-branch split, the tracking number for the full breakdown</Text>}>
            <Space wrap style={{ marginBottom: 12 }}>
              <Input.Search
                allowClear
                placeholder="Tracking number"
                style={{ width: 220 }}
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                onSearch={() => load(1)}
              />
              <Select
                allowClear
                placeholder={mine ? "Your share status" : "Status"}
                style={{ width: 170 }}
                value={filters.status}
                onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                options={[
                  { label: "Pending", value: "pending" },
                  { label: "On statement", value: "on_statement" },
                  { label: "Settled", value: "settled" },
                ]}
              />
              <Select
                allowClear
                placeholder={mine ? "Your role" : "Role"}
                style={{ width: 140 }}
                value={filters.role}
                onChange={(v) => setFilters((f) => ({ ...f, role: v }))}
                options={[
                  { label: "Origin", value: "origin" },
                  { label: "Transit", value: "transit" },
                  { label: "Delivery", value: "delivery" },
                ]}
              />
              <DatePicker.RangePicker value={filters.range} onChange={(v) => setFilters((f) => ({ ...f, range: v }))} />
            </Space>
            <ShipmentSplitTable
              rows={rows}
              loading={loading}
              pagination={pagination}
              onChange={(p, ps) => load(p, ps)}
              showYours={mine}
              viewerIds={viewerIds}
              onOpen={setSettleId}
            />
          </Card>
        </Space>
      ),
    },
    {
      key: "reports",
      label: (
        <Space>
          <BarChartOutlined />
          <span>Branch-Wise Reports</span>
        </Space>
      ),
      children: (
        <BranchWiseReports branches={branches} />
      ),
    },
    {
      key: "positions",
      label: (
        <Space>
          <SwapOutlined />
          <span>Inter-Branch Balances</span>
        </Space>
      ),
      children: (
        <InterBranchPositionTab branches={branches} />
      ),
    },
    {
      key: "simulator",
      label: (
        <Space>
          <CalculatorOutlined />
          <span>Settlement Simulator</span>
        </Space>
      ),
      children: (
        <SettlementSimulator branches={branches} activeRules={activeRules} />
      ),
    },
    {
      key: "config",
      label: (
        <Space>
          <SettingOutlined />
          <span>Dynamic Rules & Settings</span>
        </Space>
      ),
      children: (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <TransferRulesEditor isHq={isHq} onRulesUpdated={setActiveRules} />
          <ShareTableEditor isHq={isHq} />
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Branch shares"
        subtitle="How each delivered transfer's delivery charge is split between origin, transit, and delivery branches."
        icon={<PartitionOutlined />}
        actions={
          <Button icon={<ReloadOutlined />} onClick={() => { load(pagination.current); loadConfig(); }}>
            Refresh
          </Button>
        }
      />

      <BranchScopeNotice />

      {summary?.pending_config_shipments ? (
        <Alert
          type="warning"
          showIcon
          message={`${summary.pending_config_shipments} delivered shipment(s) passed through more branches than the share table covers.`}
          description="Add a row for that many branches below. Saving splits them automatically."
        />
      ) : null}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />

      <ShipmentSettlementDrawer open={!!settleId} shipmentId={settleId} onClose={() => setSettleId(null)} />
    </Space>
  );
}
