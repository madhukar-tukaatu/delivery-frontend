"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Form, InputNumber, Modal, Radio, Space, Table, Typography } from "antd";

const { Text } = Typography;

/**
 * Same rule as the backend (BranchShareCalculator::allocateTransport):
 * equal = total / count rounded down to paisa, remainder on the last parcel;
 * weight = by parcel weight, falls back to equal when a weight is missing.
 */
export function allocateTransport(total, parcels, mode = "equal") {
  const list = Array.isArray(parcels) ? parcels : [];
  const count = list.length;
  if (!count) return [];
  const totalP = Math.max(0, Math.round(Number(total || 0) * 100));
  const weights = list.map((p) => Math.max(0, Number(p.weight || 0)));
  const sumW = weights.reduce((a, b) => a + b, 0);
  const useWeight = mode === "weight" && sumW > 0 && !weights.includes(0);
  let allocated = 0;
  return list.map((p, i) => {
    let part;
    if (i === count - 1) part = totalP - allocated;
    else {
      part = useWeight
        ? Math.floor((totalP * weights[i] * 1000) / Math.round(sumW * 1000))
        : Math.floor(totalP / count);
      allocated += part;
    }
    return { ...p, transport_cost: part / 100 };
  });
}

function parcelWeight(s) {
  return Number(s?.chargeable_weight || s?.weight || s?.actual_weight || 0);
}

/**
 * Hook: const [askTransportCost, transportCostModal] = useTransportCostPrompt();
 * const extra = await askTransportCost(shipments); if (!extra) return; // cancelled
 * dispatch(..., extra) -> { transport_cost, transport_cost_split_mode }
 */
export function useTransportCostPrompt() {
  const [state, setState] = useState({ open: false, parcels: [], title: "" });
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState("equal");
  const resolver = useRef(null);

  const ask = useCallback((shipments, title = "Transport cost for this trip") => {
    const parcels = (shipments || []).map((s) => ({
      id: s.id,
      tracking_number: s.tracking_number || `#${s.id}`,
      weight: parcelWeight(s),
    }));
    setTotal(0);
    setMode("equal");
    setState({ open: true, parcels, title });
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value) => {
    setState((s) => ({ ...s, open: false }));
    const r = resolver.current;
    resolver.current = null;
    if (r) r(value);
  };

  const preview = useMemo(() => allocateTransport(total, state.parcels, mode), [total, state.parcels, mode]);
  const missingWeight = mode === "weight" && state.parcels.some((p) => !p.weight);

  const modal = (
    <Modal
      open={state.open}
      title={state.title}
      okText="Dispatch"
      onOk={() => close({ transport_cost: Number(total || 0), transport_cost_split_mode: mode })}
      onCancel={() => close(null)}
      width={620}
      destroyOnClose
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Text type="secondary">
          Enter what this trip costs your branch (vehicle, fuel, driver). It is split over the parcels
          below and paid back to your branch from each parcel's delivery charge. Leave 0 if there is no cost.
        </Text>
        <Form layout="inline">
          <Form.Item label="Trip transport cost (Rs)">
            <InputNumber min={0} step={50} value={total} onChange={(v) => setTotal(v ?? 0)} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item label="Split">
            <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
              <Radio.Button value="equal">Equal</Radio.Button>
              <Radio.Button value="weight">By weight</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Form>
        {missingWeight ? (
          <Alert type="warning" showIcon message="Some parcels have no weight, so the cost is split equally." />
        ) : null}
        <Table
          size="small"
          rowKey="id"
          pagination={state.parcels.length > 8 ? { pageSize: 8 } : false}
          dataSource={preview}
          columns={[
            { title: "Parcel", dataIndex: "tracking_number" },
            { title: "Weight (kg)", dataIndex: "weight", render: (v) => (v ? Number(v).toFixed(2) : "-") },
            { title: "Transport share", dataIndex: "transport_cost", align: "right", render: (v) => `Rs ${Number(v || 0).toFixed(2)}` },
          ]}
        />
      </Space>
    </Modal>
  );

  return [ask, modal];
}

export default useTransportCostPrompt;
