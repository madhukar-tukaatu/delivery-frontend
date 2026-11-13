"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Row, Space, Statistic, Table, Typography } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { downloadTransferAnalyticsCsv, getTransferAnalytics } from "@/services/admin/transferPlanningService";

const { RangePicker } = DatePicker;
const { Text } = Typography;

export default function TransferAnalyticsPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [range, setRange] = useState([dayjs().subtract(13, "day"), dayjs()]);
  const [data, setData] = useState({ kpis: {}, volume_by_lane: [], volume_by_service: [], runs_per_day: [], volume_by_branch_outbound: [], volume_by_branch_inbound: [], transit_time_by_lane: [] });

  const params = {
    from: range?.[0]?.format("YYYY-MM-DD"),
    to: range?.[1]?.format("YYYY-MM-DD"),
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData((await getTransferAnalytics(params)) || {});
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [params.from, params.to]);

  const kpis = data.kpis || {};

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      {error && <Alert type="error" showIcon message={error} />}
      <Card size="small" title="Reporting & analytics" extra={
        <Space>
          <RangePicker value={range} onChange={setRange} allowClear={false} />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          <Button icon={<DownloadOutlined />} onClick={() => downloadTransferAnalyticsCsv(params)}>CSV</Button>
        </Space>
      }>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6} md={3}><Statistic title="Runs" value={kpis.runs || 0} /></Col>
          <Col xs={12} sm={6} md={3}><Statistic title="Parcels moved" value={kpis.parcels_moved || 0} /></Col>
          <Col xs={12} sm={6} md={3}><Statistic title="Fill rate" value={kpis.fill_rate_pct ?? "—"} suffix={kpis.fill_rate_pct != null ? "%" : ""} /></Col>
          <Col xs={12} sm={6} md={3}><Statistic title="On-time dispatch" value={kpis.on_time_dispatch_pct ?? "—"} suffix={kpis.on_time_dispatch_pct != null ? "%" : ""} /></Col>
          <Col xs={12} sm={6} md={3}><Statistic title="Avg dwell (h)" value={kpis.avg_dwell_hours ?? "—"} /></Col>
          <Col xs={12} sm={6} md={3}><Statistic title="Avg transit (h)" value={kpis.avg_transit_hours ?? "—"} /></Col>
          <Col xs={12} sm={6} md={3}><Statistic title="SLA breaches" value={kpis.sla_breaches || 0} /></Col>
          <Col xs={12} sm={6} md={3}><Statistic title="Cost / parcel" value={kpis.cost_per_parcel ?? "—"} prefix={kpis.cost_per_parcel != null ? "Rs" : ""} /></Col>
        </Row>
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={14}>
          <Card size="small" title="Runs per day" loading={loading}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.runs_per_day || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="runs" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card size="small" title="Volume by service type" loading={loading}>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.volume_by_service || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ea580c" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Volume by lane">
        <Table size="small" rowKey="name" dataSource={data.volume_by_lane || []} pagination={{ pageSize: 8, size: "small" }}
          columns={[{ title: "Lane", dataIndex: "name" }, { title: "Parcels", dataIndex: "count", align: "right" }]} />
      </Card>
      <Card size="small" title="Transit time per lane">
        <Table size="small" rowKey="name" dataSource={data.transit_time_by_lane || []} pagination={{ pageSize: 8, size: "small" }}
          columns={[{ title: "Lane", dataIndex: "name" }, { title: "Avg hours", dataIndex: "avg_hours", align: "right" }, { title: "Runs", dataIndex: "runs", align: "right" }]} />
      </Card>
      <Card size="small" title="Branch outbound / inbound">
        <Table size="small" rowKey="name" dataSource={data.volume_by_branch_outbound || []} pagination={{ pageSize: 8, size: "small" }}
          columns={[{ title: "Branch", dataIndex: "name" }, { title: "Outbound parcels", dataIndex: "count", align: "right" }]} />
      </Card>
    </Space>
  );
}
