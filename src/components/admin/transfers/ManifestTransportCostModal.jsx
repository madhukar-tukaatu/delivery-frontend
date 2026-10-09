"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Descriptions, Form, Input, InputNumber, Modal, Radio, Space, Table, Typography, message } from "antd";
import api from "@/lib/api";
import { allocateTransport } from "@/components/admin/transfers/TransportCostPrompt";

const { Text } = Typography;

function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

/**
 * Manifest transport cost: per-shipment allocation and a manager edit
 * (dispatching branch or HQ, until the shipments are on an inter-branch statement).
 */
export default function ManifestTransportCostModal({ manifestId, open, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState("equal");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open || !manifestId) return;
    setLoading(true);
    api
      .get(`/admin/dispatches/${manifestId}/transport-cost`)
      .then((res) => {
        const d = unwrap(res);
        setData(d);
        setTotal(Number(d?.transport_cost || 0));
        setMode(d?.transport_cost_split_mode || "equal");
        setReason("");
      })
      .catch((e) => message.error(e?.response?.data?.message || "Could not load transport cost."))
      .finally(() => setLoading(false));
  }, [open, manifestId]);

  const preview = useMemo(
    () => allocateTransport(total, (data?.items || []).map((i) => ({ ...i, id: i.item_id })), mode),
    [total, mode, data]
  );

  async function save() {
    setSaving(true);
    try {
      await api.post(`/admin/dispatches/${manifestId}/transport-cost`, {
        transport_cost: Number(total || 0),
        transport_cost_split_mode: mode,
        reason: reason || undefined,
      });
      message.success("Transport cost saved and re-split.");
      onSaved?.();
      onClose?.();
    } catch (e) {
      const errors = e?.response?.data?.errors;
      message.error((errors && Object.values(errors).flat()[0]) || e?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const canEdit = Boolean(data?.can_edit);

  return (
    <Modal
      open={open}
      title={`Transport cost ${data?.manifest_number ? `- ${data.manifest_number}` : ""}`}
      onCancel={onClose}
      onOk={canEdit ? save : onClose}
      okText={canEdit ? "Save" : "Close"}
      confirmLoading={saving}
      width={680}
      destroyOnClose
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {!canEdit && data ? (
          <Alert type="info" showIcon message="Only a manager of the dispatching branch or HQ can change this cost." />
        ) : null}
        <Descriptions size="small" column={2} bordered>
          <Descriptions.Item label="Saved cost">Rs {Number(data?.transport_cost || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Split">{data?.transport_cost_split_mode || "equal"}</Descriptions.Item>
          <Descriptions.Item label="Entered">{data?.transport_cost_entered_at ? new Date(data.transport_cost_entered_at).toLocaleString() : "-"}</Descriptions.Item>
          <Descriptions.Item label="Last change">{data?.transport_cost_updated_at ? new Date(data.transport_cost_updated_at).toLocaleString() : "-"}</Descriptions.Item>
        </Descriptions>
        {canEdit ? (
          <Form layout="inline">
            <Form.Item label="Trip cost (Rs)">
              <InputNumber min={0} step={50} value={total} onChange={(v) => setTotal(v ?? 0)} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item label="Split">
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
                <Radio.Button value="equal">Equal</Radio.Button>
                <Radio.Button value="weight">By weight</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="Reason">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why it changed" style={{ width: 180 }} />
            </Form.Item>
          </Form>
        ) : null}
        <Table
          size="small"
          rowKey="item_id"
          loading={loading}
          pagination={false}
          dataSource={(data?.items || []).map((i, idx) => ({ ...i, preview: preview[idx]?.transport_cost }))}
          columns={[
            { title: "Parcel", dataIndex: "tracking_number", render: (v, r) => v || `#${r.shipment_id}` },
            { title: "Weight", dataIndex: "weight", render: (v) => (v ? `${Number(v).toFixed(2)} kg` : "-") },
            { title: "Status", dataIndex: "status" },
            { title: "Saved share", dataIndex: "transport_cost", align: "right", render: (v) => `Rs ${Number(v || 0).toFixed(2)}` },
            ...(canEdit
              ? [{ title: "New share", dataIndex: "preview", align: "right", render: (v) => <Text strong>Rs {Number(v || 0).toFixed(2)}</Text> }]
              : []),
          ]}
        />
        {(data?.transport_cost_log || []).length ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Changes: {(data.transport_cost_log || [])
              .map((l) => `${l.from ?? "-"} -> ${l.to} (${l.mode}, user #${l.by ?? "?"}, ${l.at ? new Date(l.at).toLocaleString() : ""}${l.reason ? `, ${l.reason}` : ""})`)
              .join("; ")}
          </Text>
        ) : null}
      </Space>
    </Modal>
  );
}
