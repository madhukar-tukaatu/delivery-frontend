"use client";

import { useEffect, useState } from "react";
import {
  Alert, Button, Card, Popconfirm, Progress, Space, Table, Tag, Timeline, Typography, message,
} from "antd";
import { ReloadOutlined, SendOutlined, StopOutlined, StepForwardOutlined } from "@ant-design/icons";
import {
  cancelTransferRun, continueTransferRun, dispatchTransferRun, getTransferRuns,
} from "@/services/admin/transferPlanningService";

const { Text } = Typography;

const STATUS_COLOR = {
  planned: "default",
  loading: "blue",
  dispatched: "cyan",
  at_stop: "purple",
  partially_received: "orange",
  completed: "green",
  cancelled: "red",
};

export default function TransferDispatchBoard({ branchId = null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [runs, setRuns] = useState([]);
  const [status, setStatus] = useState("active");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTransferRuns({
        status,
        origin_branch_id: branchId || undefined,
      });
      setRuns(data?.runs || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, branchId]);

  const act = async (fn, ok) => {
    try {
      await fn();
      message.success(ok);
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || e.message || "Action failed");
    }
  };

  const columns = [
    {
      title: "Run",
      render: (_, r) => (
        <div>
          <Text strong>{r.run_number}</Text>
          <div><Tag color={STATUS_COLOR[r.status] || "default"}>{r.status}</Tag>
            {r.tour_code && <Tag>{r.tour_code}</Tag>}
            {r.leg_role && <Tag>{r.leg_role}</Tag>}
          </div>
        </div>
      ),
    },
    {
      title: "Route",
      render: (_, r) => (r.stops || []).map((s) => s.branch_name).filter(Boolean).join(" → "),
    },
    {
      title: "Progress",
      width: 180,
      render: (_, r) => {
        const stops = r.stops || [];
        const done = stops.filter((s) => ["departed", "completed", "arrived"].includes(s.status)).length;
        const pct = stops.length ? Math.round((done / stops.length) * 100) : 0;
        return <Progress percent={r.status === "completed" ? 100 : pct} size="small" />;
      },
    },
    { title: "Parcels", dataIndex: "expected_count", width: 80 },
    { title: "Fill", dataIndex: "fill_pct", width: 80, render: (v) => (v != null ? `${v}%` : "—") },
    { title: "ETA", dataIndex: "eta", width: 160, render: (v, r) => (
      <div>
        <div>{v ? new Date(v).toLocaleString() : "—"}</div>
        {r.delay_minutes > 0 && <Tag color="red">+{r.delay_minutes} min</Tag>}
      </div>
    ) },
    {
      title: "Actions",
      width: 260,
      render: (_, r) => (
        <Space wrap>
          {["planned", "loading"].includes(r.status) && (
            <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => act(() => dispatchTransferRun(r.id), "Dispatched")}>Dispatch</Button>
          )}
          {["dispatched", "at_stop", "partially_received"].includes(r.status) && (
            <Button size="small" icon={<StepForwardOutlined />} onClick={() => act(() => continueTransferRun(r.id), "Continued to next stop")}>Next stop</Button>
          )}
          {r.manifests?.[0]?.id && (
            <Button size="small" href={`/admin/transfers/containers/${r.manifests[0].id}`}>Open TR</Button>
          )}
          {!["completed", "cancelled"].includes(r.status) && (
            <Popconfirm title="Cancel this TR run?" onConfirm={() => act(() => cancelTransferRun(r.id, "Cancelled from dispatch board"), "Cancelled")}>
              <Button size="small" danger icon={<StopOutlined />}>Cancel</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      {error && <Alert type="error" showIcon message={error} />}
      <Card size="small" title="Dispatch board — TR runs" extra={
        <Space>
          <Button type={status === "active" ? "primary" : "default"} size="small" onClick={() => setStatus("active")}>Active</Button>
          <Button type={status === "all" ? "primary" : "default"} size="small" onClick={() => setStatus("all")}>All</Button>
          <Button icon={<ReloadOutlined />} size="small" onClick={load} loading={loading}>Refresh</Button>
        </Space>
      }>
        <Table
          size="small"
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={runs}
          pagination={{ pageSize: 10, size: "small" }}
          locale={{ emptyText: "No TR runs in this view. Accept a fleet plan to create them." }}
          expandable={{
            expandedRowRender: (r) => (
              <div>
                {r.why && <Text type="secondary">{r.why}</Text>}
                <Timeline
                  style={{ marginTop: 12 }}
                  items={(r.stops || []).map((s) => ({
                    color: s.status === "departed" || s.status === "completed" ? "green" : s.status === "arrived" ? "blue" : "gray",
                    children: (
                      <div>
                        <Text strong>{s.branch_name}</Text> <Tag>{s.kind}</Tag> <Tag>{s.status}</Tag>
                        <div><Text type="secondary">{s.expected_parcels || 0} parcels expected
                          {s.planned_arrival_at ? ` · ETA ${new Date(s.planned_arrival_at).toLocaleString()}` : ""}</Text></div>
                      </div>
                    ),
                  }))}
                />
              </div>
            ),
          }}
        />
      </Card>
    </Space>
  );
}
