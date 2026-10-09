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
  Tag,
  Typography,
  message,
} from "antd";
import { PartitionOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined } from "@ant-design/icons";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import BranchScopeNotice, { useIsFinanceHq } from "@/components/admin/billing/BranchScopeNotice";
import api from "@/lib/api";

const { Text, Paragraph } = Typography;

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

const money = (v) => `Rs ${Number(v || 0).toFixed(2)}`;
const STATUS_COLORS = { pending: "orange", on_statement: "blue", settled: "green" };
const ROLE_COLORS = { origin: "geekblue", transit: "purple", delivery: "cyan" };

function ShareTableEditor({ isHq }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const d = unwrap(await api.get("/admin/branch-shares/config"));
      const table = d?.table || {};
      setRows(
        Object.keys(table)
          .map(Number)
          .sort((a, b) => a - b)
          .map((count) => ({ count, percents: table[count].map(Number) }))
      );
      setMeta(d || {});
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load the share table.");
    }
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
      title="Share percent by number of branches"
      extra={
        isHq ? (
          <Space>
            <Button icon={<PlusOutlined />} onClick={addRow}>Add row</Button>
            <Button icon={<DeleteOutlined />} disabled={rows.length <= 1} onClick={removeLast}>Remove last</Button>
            <Button type="primary" loading={saving} onClick={save}>Save</Button>
          </Space>
        ) : null
      }
    >
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        After delivery: fare minus extra last-mile distance (to the delivery branch) minus transport cost (back to each
        dispatching branch) is shared by these percents. HQ takes {meta?.hq_percent ?? 5}% of each branch's allocation.
        {meta?.is_default ? " Using the built-in defaults until saved." : ""}
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
                    style={{ width: 110 }}
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
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [filters, setFilters] = useState({ status: undefined, role: undefined, search: "", range: null });

  async function load(page = 1, pageSize = pagination.pageSize) {
    setLoading(true);
    try {
      const params = { page, per_page: pageSize, status: filters.status, role: filters.role, search: filters.search || undefined };
      if (filters.range?.[0]) params.from = filters.range[0].format("YYYY-MM-DD");
      if (filters.range?.[1]) params.to = filters.range[1].format("YYYY-MM-DD");
      const d = unwrap(await api.get("/admin/branch-shares", { params }));
      const p = d?.shares || {};
      setRows(p?.data || []);
      setSummary(d?.summary || {});
      setPagination({ current: p?.current_page || page, pageSize: p?.per_page || pageSize, total: p?.total || 0 });
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load branch shares.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.role, filters.range]);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Branch shares"
        subtitle="How each delivered transfer's delivery charge is split between origin, transit and delivery branches."
        icon={<PartitionOutlined />}
        actions={<Button icon={<ReloadOutlined />} onClick={() => load(pagination.current)}>Refresh</Button>}
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

      <Row gutter={16}>
        <Col xs={12} md={6}><Card><Statistic title="Share rows" value={summary?.rows || 0} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Allocation" prefix="Rs" precision={2} value={summary?.allocation || 0} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="HQ commission" prefix="Rs" precision={2} value={summary?.hq_commission || 0} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Net to branches" prefix="Rs" precision={2} value={summary?.net || 0} /></Card></Col>
      </Row>

      <ShareTableEditor isHq={isHq} />

      <Card title="Per-shipment allocation">
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
            placeholder="Status"
            style={{ width: 150 }}
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
            placeholder="Role"
            style={{ width: 130 }}
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
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          scroll={{ x: 1200 }}
          pagination={{ ...pagination, onChange: (p, ps) => load(p, ps) }}
          columns={[
            {
              title: "Shipment",
              render: (_, r) => (
                <Space direction="vertical" size={0}>
                  <a href={`/admin/shipments/${r.shipment_id}`}>{r.shipment?.tracking_number || `#${r.shipment_id}`}</a>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {r.shipment?.delivered_at ? new Date(r.shipment.delivered_at).toLocaleDateString() : "-"}
                  </Text>
                </Space>
              ),
            },
            { title: "Branch", render: (_, r) => r.branch?.name || `#${r.branch_id}` },
            {
              title: "Role",
              render: (_, r) => (
                <Tag color={ROLE_COLORS[r.role]}>{r.role} {r.position}/{r.branch_count}</Tag>
              ),
            },
            { title: "Fare", dataIndex: "fare_amount", align: "right", render: money },
            { title: "%", dataIndex: "percent", align: "right", render: (v) => `${Number(v)}%` },
            { title: "Share", dataIndex: "share_amount", align: "right", render: money },
            { title: "Transport", dataIndex: "transport_amount", align: "right", render: money },
            { title: "Extra km", dataIndex: "extra_distance_amount", align: "right", render: money },
            { title: "Allocation", dataIndex: "allocation_amount", align: "right", render: (v) => <Text strong>{money(v)}</Text> },
            { title: "HQ", dataIndex: "hq_commission_amount", align: "right", render: money },
            { title: "Net", dataIndex: "net_amount", align: "right", render: money },
            {
              title: "Collected by",
              render: (_, r) => (
                <Space direction="vertical" size={0}>
                  <Text>{r.collecting_branch?.name || (r.collecting_branch_id ? `#${r.collecting_branch_id}` : "-")}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{String(r.collection_mode || "").replace("_", " ")}</Text>
                </Space>
              ),
            },
            {
              title: "Status",
              dataIndex: "status",
              render: (v, r) => (
                <Space direction="vertical" size={0}>
                  <Tag color={STATUS_COLORS[v]}>{v === "on_statement" ? "on statement" : v}</Tag>
                  {(r.flags || []).length ? <Text type="warning" style={{ fontSize: 11 }}>{r.flags.join(", ")}</Text> : null}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
