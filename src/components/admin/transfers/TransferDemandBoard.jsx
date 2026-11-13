"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card, Col, Row, Select, Space, Table, Tag, Typography, Statistic, Alert, Button,
} from "antd";
import { ReloadOutlined, WarningOutlined } from "@ant-design/icons";
import { getTransferDemand } from "@/services/admin/transferPlanningService";

const { Text } = Typography;

const SERVICE_COLOR = { express: "orange", same_day: "magenta", flight: "purple", standard: "default" };

export default function TransferDemandBoard({ branchId = null, onSelectOrigin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ matrix: [], cells: [], requests: [], totals: {}, branches: [] });
  const [origin, setOrigin] = useState(null);
  const [service, setService] = useState(null);
  const [priority, setPriority] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await getTransferDemand({
        origin_branch_id: origin || branchId || undefined,
        service_type: service || undefined,
        priority: priority || undefined,
      });
      setData(payload || {});
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load demand");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [origin, service, priority, branchId]);

  const totals = data.totals || {};
  const branches = data.branches || [];

  const columns = [
    { title: "Origin", dataIndex: "origin_name", render: (v, r) => <span><Text strong>{v}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{r.origin_code}</Text></span> },
    { title: "Destination", dataIndex: "destination_name", render: (v, r) => <span>{v}<br /><Text type="secondary" style={{ fontSize: 11 }}>{r.destination_code}</Text></span> },
    {
      title: "Service",
      dataIndex: "service_type",
      render: (v) => <Tag color={SERVICE_COLOR[v] || "default"}>{String(v || "standard").toUpperCase()}</Tag>,
    },
    { title: "Parcels", dataIndex: "count", align: "right", sorter: (a, b) => a.count - b.count, defaultSortOrder: "descend" },
    { title: "Weight kg", dataIndex: "weight_kg", align: "right" },
    { title: "Oldest (h)", dataIndex: "oldest_age_hours", align: "right" },
    {
      title: "SLA risk",
      dataIndex: "sla_risk_count",
      align: "right",
      render: (v) => (v ? <Tag color="red" icon={<WarningOutlined />}>{v}</Tag> : <Text type="secondary">0</Text>),
    },
  ];

  const requestColumns = [
    { title: "From", dataIndex: "from_branch_name" },
    { title: "To", dataIndex: "to_branch_name" },
    { title: "Service", dataIndex: "service_type", render: (v) => v ? <Tag color={SERVICE_COLOR[v] || "default"}>{String(v).toUpperCase()}</Tag> : "—" },
    { title: "Parcels", dataIndex: "parcel_count" },
    { title: "Vehicle", dataIndex: "vehicle_type" },
    { title: "Status", dataIndex: "status", render: (v) => <Tag>{v}</Tag> },
  ];

  const originOptions = useMemo(
    () => (data.matrix || []).map((r) => ({ value: r.origin_branch_id, label: `${r.origin_name} (${r.count})` })),
    [data.matrix],
  );

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      {error && <Alert type="error" showIcon message={error} />}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Parcels waiting" value={totals.parcels || 0} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="O-D pairs" value={totals.od_pairs || 0} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Origins" value={totals.origins || 0} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="SLA risk" value={totals.sla_risk || 0} valueStyle={{ color: totals.sla_risk ? "#dc2626" : undefined }} /></Card></Col>
      </Row>
      <Card size="small" title="Transfer demand (origin → final destination, by service type)" extra={
        <Space wrap>
          <Select allowClear placeholder="Origin" style={{ minWidth: 200 }} value={origin} onChange={setOrigin} options={originOptions} />
          <Select allowClear placeholder="Service type" style={{ minWidth: 140 }} value={service} onChange={setService}
            options={[{ value: "express", label: "Express" }, { value: "standard", label: "Standard" }, { value: "same_day", label: "Same day" }]} />
          <Select allowClear placeholder="Priority" style={{ minWidth: 140 }} value={priority} onChange={setPriority}
            options={[{ value: "express", label: "Express / same-day" }, { value: "sla_risk", label: "SLA risk only" }]} />
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
        </Space>
      }>
        <Table
          size="small"
          rowKey={(r) => `${r.origin_branch_id}-${r.destination_branch_id}-${r.service_type}`}
          loading={loading}
          columns={columns}
          dataSource={data.cells || []}
          pagination={{ pageSize: 20, size: "small" }}
          onRow={(r) => ({ onClick: () => onSelectOrigin?.(r.origin_branch_id) })}
        />
      </Card>
      <Card size="small" title={`Branch transfer requests (${(data.requests || []).length})`}>
        <Table size="small" rowKey="id" columns={requestColumns} dataSource={data.requests || []} pagination={false}
          locale={{ emptyText: "No pending branch transfer requests" }} />
      </Card>
    </Space>
  );
}
