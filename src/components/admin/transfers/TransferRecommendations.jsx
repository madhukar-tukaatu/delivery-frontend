"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert, Button, Card, Checkbox, Col, Descriptions, Drawer, Form, Input, InputNumber,
  Modal, Progress, Row, Select, Space, Table, Tag, Typography, message, Statistic,
} from "antd";
import {
  CheckOutlined, EditOutlined, ReloadOutlined, ThunderboltOutlined, CarOutlined,
} from "@ant-design/icons";
import {
  acceptTransferPlan, createTransferRun, getTransferRecommendations,
} from "@/services/admin/transferPlanningService";

const { Text, Paragraph } = Typography;

const ROLE_COLOR = { feeder: "blue", onward: "purple", outbound: "cyan", return: "green", one_way: "default" };

function stopLine(run) {
  return (run.stops || []).map((s) => s.name || s.code).filter(Boolean).join(" → ");
}

export default function TransferRecommendations({ branchId = null, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState({ recommendations: [], tours: [], plan: {}, unassigned: [] });
  const [selected, setSelected] = useState([]);
  const [editRun, setEditRun] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTransferRecommendations({
        origin_branch_id: branchId || undefined,
      });
      setPayload(data || {});
      setSelected((data?.recommendations || []).map((r) => r.key));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [branchId]);

  const runs = payload.recommendations || [];
  const tours = payload.tours || [];
  const plan = payload.plan || {};

  const selectedRuns = useMemo(() => runs.filter((r) => selected.includes(r.key)), [runs, selected]);

  const accept = async (items) => {
    if (!items.length) {
      message.warning("Select at least one run");
      return;
    }
    setSaving(true);
    try {
      const body = items.map((r) => ({
        recommendation_key: r.key,
        origin_branch_id: r.origin_branch_id,
        stop_branch_ids: r.stop_branch_ids,
        shipment_ids: r.shipment_ids,
        vehicle_type: r.vehicle_type,
        corridor_code: r.corridor_code,
        tour_code: r.tour_code,
        leg_role: r.leg_role || r.tour_role,
        planned_ahead: !!r.planned_ahead,
        why: r.why,
        estimated_km: r.estimated_km,
        estimated_hours: r.estimated_hours,
      }));
      const result = await acceptTransferPlan(body);
      const n = result?.created?.length || 0;
      const skipped = Object.keys(result?.errors || {}).length;
      if (n) message.success(`${n} TR run(s) created${skipped ? `, ${skipped} skipped` : ""}`);
      if (skipped) message.warning(Object.values(result.errors).slice(0, 3).join(" "));
      onCreated?.();
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || e.message || "Could not create runs");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (values) => {
    setSaving(true);
    try {
      await createTransferRun({
        ...editRun,
        ...values,
        recommendation_key: editRun.key,
        origin_branch_id: editRun.origin_branch_id,
        shipment_ids: editRun.shipment_ids,
        stop_branch_ids: values.stop_branch_ids || editRun.stop_branch_ids,
      });
      message.success("TR run created from edited plan");
      setEditRun(null);
      onCreated?.();
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || e.message || "Could not create run");
    } finally {
      setSaving(false);
    }
  };

  const runColumns = [
    {
      title: "",
      width: 36,
      render: (_, r) => (
        <Checkbox
          checked={selected.includes(r.key)}
          onChange={(e) => setSelected((cur) => e.target.checked ? [...cur, r.key] : cur.filter((k) => k !== r.key))}
        />
      ),
    },
    { title: "Key", dataIndex: "key", width: 90 },
    {
      title: "Role",
      width: 110,
      render: (_, r) => <Tag color={ROLE_COLOR[r.leg_role || r.tour_role] || "default"}>{(r.leg_role || r.tour_role || r.mode || "run").replace("_", " ")}</Tag>,
    },
    {
      title: "Route",
      render: (_, r) => (
        <div>
          <Text strong>{stopLine(r)}</Text>
          <div><Text type="secondary" style={{ fontSize: 11 }}>{r.corridor_name || r.corridor_code}{r.highway ? ` · ${r.highway}` : ""}</Text></div>
          {r.tour_code && <Tag style={{ marginTop: 4 }}>{r.tour_code}{r.tour_role ? ` · ${r.tour_role}` : ""}</Tag>}
          {r.planned_ahead && <Tag color="gold">Load after feeders arrive</Tag>}
        </div>
      ),
    },
    { title: "Parcels", dataIndex: "parcels", width: 80, align: "right" },
    {
      title: "Vehicle",
      width: 140,
      render: (_, r) => (
        <div>
          <Text>{r.vehicle_type}</Text>
          <Progress percent={Number(r.fill_pct) || 0} size="small" />
        </div>
      ),
    },
    { title: "Est.", width: 110, render: (_, r) => <Text>{r.estimated_km} km · {r.estimated_hours} h</Text> },
    {
      title: "",
      width: 80,
      render: (_, r) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditRun(r)}>Edit</Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      {error && <Alert type="error" showIcon message={error} />}
      <Card size="small" title={<Space><ThunderboltOutlined /> Daily fleet plan</Space>} extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Recompute</Button>
          <Button onClick={() => accept(selectedRuns)} loading={saving}>Accept selected ({selected.length})</Button>
          <Button type="primary" icon={<CheckOutlined />} onClick={() => accept(runs)} loading={saving}>Accept all</Button>
        </Space>
      }>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6} md={4}><Statistic title="Vehicles needed" value={plan.vehicles_needed || 0} prefix={<CarOutlined />} /></Col>
          <Col xs={12} sm={6} md={4}><Statistic title="Round trips" value={plan.round_trips || 0} /></Col>
          <Col xs={12} sm={6} md={4}><Statistic title="Avg fill" value={plan.avg_fill_pct || 0} suffix="%" /></Col>
          <Col xs={12} sm={6} md={4}><Statistic title="Empty-km avoided" value={plan.empty_km_avoided || 0} suffix="km" /></Col>
          <Col xs={12} sm={6} md={4}><Statistic title="Parcels covered" value={plan.parcels_covered || 0} suffix={`/ ${plan.demand_parcels || 0}`} /></Col>
          <Col xs={12} sm={6} md={4}><Statistic title="Left over" value={plan.parcels_left || 0} valueStyle={{ color: plan.parcels_left ? "#dc2626" : "#16a34a" }} /></Col>
        </Row>
        {plan.vehicles_by_type && (
          <div style={{ marginTop: 12 }}>
            {Object.entries(plan.vehicles_by_type).map(([k, v]) => <Tag key={k}>{v}× {k}</Tag>)}
            {plan.cross_dock_legs ? <Tag color="purple">{plan.cross_dock_legs} cross-dock legs</Tag> : null}
            <Text type="secondary" style={{ marginLeft: 8 }}>{plan.coverage_pct || 0}% of waiting demand is planned</Text>
          </div>
        )}
      </Card>

      <Card size="small" title="Vehicle tours (round trips and one-way)">
        <Table
          size="small"
          rowKey="tour_code"
          loading={loading}
          pagination={false}
          dataSource={tours}
          columns={[
            { title: "Tour", dataIndex: "tour_code", width: 110 },
            { title: "Kind", dataIndex: "kind", width: 110, render: (v) => <Tag color={v === "round_trip" ? "green" : "default"}>{v === "round_trip" ? "Round trip" : "One way"}</Tag> },
            { title: "Vehicle", dataIndex: "vehicle_type", width: 90 },
            { title: "Outbound", dataIndex: "outbound" },
            { title: "Return / backhaul", dataIndex: "return", render: (v) => v || <Text type="secondary">—</Text> },
            { title: "Empty-km saved", dataIndex: "empty_km_avoided", width: 130, render: (v) => (v ? `${v} km` : "—") },
          ]}
          expandable={{ expandedRowRender: (t) => <Paragraph style={{ margin: 0 }}>{t.why}</Paragraph> }}
        />
      </Card>

      <Card size="small" title={`Suggested TR runs (${runs.length})`}>
        <Table
          size="small"
          rowKey="key"
          loading={loading}
          columns={runColumns}
          dataSource={runs}
          pagination={false}
          expandable={{
            expandedRowRender: (r) => (
              <div>
                <Paragraph style={{ marginBottom: 8 }}>{r.why}</Paragraph>
                <Space wrap>{(r.why_points || []).map((p) => <Tag key={p}>{p}</Tag>)}</Space>
                {(r.by_stop || []).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {r.by_stop.map((s) => <Tag key={s.branch_id}>{s.name}: {s.count}</Tag>)}
                  </div>
                )}
              </div>
            ),
          }}
        />
      </Card>

      {(payload.unassigned || []).length > 0 && (
        <Alert type="warning" showIcon message={`${payload.unassigned.length} leftover O-D group(s) were not planned`} />
      )}

      <Drawer title={editRun ? `Edit ${editRun.key}` : "Edit run"} open={!!editRun} onClose={() => setEditRun(null)} width={480}>
        {editRun && (
          <Form layout="vertical" initialValues={{ vehicle_type: editRun.vehicle_type, vehicle_number: editRun.vehicle_number, seal_number: editRun.seal_number, notes: editRun.notes }} onFinish={saveEdit}>
            <Paragraph type="secondary">{stopLine(editRun)} · {editRun.parcels} parcels</Paragraph>
            <Form.Item name="vehicle_type" label="Vehicle">
              <Select options={["van", "pickup", "truck", "bus_cargo"].map((v) => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item name="vehicle_number" label="Vehicle number"><Input /></Form.Item>
            <Form.Item name="driver_name" label="Driver name"><Input /></Form.Item>
            <Form.Item name="driver_phone" label="Driver phone"><Input /></Form.Item>
            <Form.Item name="seal_number" label="Seal"><Input /></Form.Item>
            <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} block>Create this TR run</Button>
          </Form>
        )}
      </Drawer>
    </Space>
  );
}
