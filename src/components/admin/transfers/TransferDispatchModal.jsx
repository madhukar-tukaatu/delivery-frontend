"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { CarOutlined, SendOutlined, InboxOutlined } from "@ant-design/icons";
import { allocateTransport } from "@/components/admin/transfers/TransportCostPrompt";
import { getTransferRiders } from "@/services/admin/transferService";

const { Text } = Typography;

export const VEHICLE_TYPES = [
  { value: "bike", label: "Bike" },
  { value: "van", label: "Van" },
  { value: "pickup", label: "Pickup" },
  { value: "truck", label: "Truck" },
  { value: "bus_cargo", label: "Bus cargo" },
  { value: "other", label: "Other" },
];

export function vehicleLabel(value) {
  return VEHICLE_TYPES.find((v) => v.value === value)?.label || value || null;
}

function parcelWeight(s) {
  return Number(s?.chargeable_weight || s?.weight || s?.actual_weight || 0);
}

function destinationName(s) {
  return (
    s?.destination_sub_branch?.name ||
    s?.destination_branch?.name ||
    s?.hop_meta?.destination_name ||
    s?.destination_name ||
    (s?.destination_branch_id ? `Branch #${s.destination_branch_id}` : "Final")
  );
}

/**
 * Split parcels bound for one next hop into "last mile there" and "onward" (by final branch).
 * A parcel is last mile when its final destination branch is the next hop.
 */
export function splitByFinal(shipments, nextHopId) {
  const hop = Number(nextHopId || 0);
  let lastMile = 0;
  const onward = new Map();
  (shipments || []).forEach((s) => {
    const dest = Number(s?.destination_branch_id || 0);
    if (hop && dest === hop) {
      lastMile += 1;
      return;
    }
    const key = String(dest || destinationName(s));
    const row = onward.get(key) || { key, name: destinationName(s), count: 0 };
    row.count += 1;
    onward.set(key, row);
  });
  const onwardList = Array.from(onward.values()).sort((a, b) => b.count - a.count);
  return {
    total: (shipments || []).length,
    lastMile,
    onwardCount: onwardList.reduce((a, r) => a + r.count, 0),
    onward: onwardList,
  };
}

/** "TR to Butwal: 30 parcels (20 last mile, 10 onward to Dhangadi)" */
export function trHeadline(hopName, split) {
  const parts = [];
  if (split.lastMile) parts.push(`${split.lastMile} last mile`);
  if (split.onwardCount) {
    const names = split.onward.map((o) => (split.onward.length > 1 ? `${o.name} ${o.count}` : o.name));
    parts.push(`${split.onwardCount} onward to ${names.join(", ")}`);
  }
  const n = split.total;
  return `TR to ${hopName || "next hop"}: ${n} parcel${n === 1 ? "" : "s"}${parts.length ? ` (${parts.join(", ")})` : ""}`;
}

/**
 * Dispatch modal for a TR (transfer container): one trip from this branch to the next hop.
 *
 * props:
 *  - open, onCancel
 *  - nextHopName, nextHopId, fromLabel
 *  - shipments: parcels going on this TR (for the per-parcel cost preview and the header split)
 *  - transferNumber: set when sending an already open (held) TR
 *  - allowHold: show "Load only (hold TR open)"
 *  - branchId: dispatching branch for the rider list (admin override)
 *  - submitting
 *  - onSubmit(meta): meta = { vehicle_type, vehicle_number, rider_user_id, driver_name, driver_phone,
 *      seal_number, notes, transport_cost, transport_cost_split_mode, hold }
 */
export default function TransferDispatchModal({
  open,
  onCancel,
  onSubmit,
  nextHopName,
  nextHopId,
  fromLabel,
  shipments = [],
  transferNumber = null,
  allowHold = true,
  branchId = null,
  submitting = false,
}) {
  const [form] = Form.useForm();
  const [driverMode, setDriverMode] = useState("staff");
  const [riders, setRiders] = useState([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [hold, setHold] = useState(false);
  const cost = Form.useWatch("transport_cost", form) || 0;
  const mode = Form.useWatch("transport_cost_split_mode", form) || "equal";

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setDriverMode("staff");
    setHold(false);
    let alive = true;
    setRidersLoading(true);
    getTransferRiders(branchId ? { branch_id: branchId } : {})
      .then((list) => alive && setRiders(list))
      .catch(() => alive && setRiders([]))
      .finally(() => alive && setRidersLoading(false));
    return () => {
      alive = false;
    };
  }, [open, branchId, form]);

  const parcels = useMemo(
    () =>
      (shipments || []).map((s) => ({
        id: s.id ?? s.shipment_id,
        tracking_number: s.tracking_number || `#${s.id ?? s.shipment_id}`,
        weight: parcelWeight(s),
        final: Number(s.destination_branch_id || 0) === Number(nextHopId || 0) ? "Last mile" : destinationName(s),
      })),
    [shipments, nextHopId]
  );
  const preview = useMemo(() => allocateTransport(cost, parcels, mode), [cost, parcels, mode]);
  const split = useMemo(() => splitByFinal(shipments, nextHopId), [shipments, nextHopId]);
  const missingWeight = mode === "weight" && parcels.some((p) => !p.weight);

  const riderOptions = useMemo(
    () =>
      riders.map((r) => ({
        value: r.id,
        label: `${r.name}${r.phone ? ` · ${r.phone}` : ""}${r.role ? ` (${String(r.role).replace(/_/g, " ")})` : ""}`,
        rider: r,
      })),
    [riders]
  );

  const submit = async () => {
    const v = await form.validateFields();
    const meta = {
      vehicle_type: v.vehicle_type || undefined,
      vehicle_number: v.vehicle_number?.trim() || undefined,
      seal_number: v.seal_number?.trim() || undefined,
      notes: v.notes?.trim() || undefined,
      transport_cost: Number(v.transport_cost || 0),
      transport_cost_split_mode: v.transport_cost_split_mode || "equal",
    };
    if (driverMode === "staff") {
      const r = riders.find((x) => x.id === v.rider_user_id);
      meta.rider_user_id = v.rider_user_id || undefined;
      if (r) {
        meta.driver_name = r.name;
        meta.driver_phone = r.phone || undefined;
      }
    } else {
      meta.driver_name = v.driver_name?.trim() || undefined;
      meta.driver_phone = v.driver_phone?.trim() || undefined;
    }
    if (allowHold && hold) meta.hold = true;
    onSubmit?.(meta);
  };

  const title = (
    <Space size={6}>
      <CarOutlined />
      <span>{transferNumber ? `Dispatch ${transferNumber}` : "Create TR"}</span>
      <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
        {fromLabel ? `${fromLabel} → ` : "→ "}
        {nextHopName}
      </Text>
    </Space>
  );

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={submit}
      okText={hold ? "Load on TR (hold)" : "Dispatch TR"}
      okButtonProps={{ icon: hold ? <InboxOutlined /> : <SendOutlined />, loading: submitting, disabled: !parcels.length }}
      width={760}
      destroyOnClose
      styles={{ body: { paddingTop: 4 } }}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          style={{ padding: "6px 10px" }}
          message={<Text strong>{trHeadline(nextHopName, split)}</Text>}
          description={
            <Text type="secondary" style={{ fontSize: 12 }}>
              One TR per trip. {nextHopName} checks it in: last-mile parcels go to delivery there, onward parcels
              join {nextHopName}&apos;s next TR automatically.
            </Text>
          }
        />

        <Form
          form={form}
          layout="vertical"
          size="small"
          requiredMark={false}
          initialValues={{ vehicle_type: "bike", transport_cost: 0, transport_cost_split_mode: "equal" }}
        >
          <Row gutter={10}>
            <Col xs={24} sm={8}>
              <Form.Item label="Vehicle type" name="vehicle_type" rules={[{ required: !hold, message: "Pick a vehicle" }]}>
                <Select options={VEHICLE_TYPES} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Vehicle number" name="vehicle_number">
                <Input placeholder="e.g. Ba 2 Pa 1234" maxLength={50} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Seal / bag no." name="seal_number">
                <Input placeholder="Optional" maxLength={50} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Who carries it" style={{ marginBottom: 6 }}>
            <Segmented
              size="small"
              value={driverMode}
              onChange={setDriverMode}
              options={[
                { value: "staff", label: "Our rider / staff" },
                { value: "outside", label: "Outside driver" },
              ]}
            />
          </Form.Item>
          {driverMode === "staff" ? (
            <Form.Item name="rider_user_id" rules={[{ required: !hold, message: "Pick the rider carrying this TR" }]}>
              <Select
                showSearch
                allowClear
                loading={ridersLoading}
                placeholder="Search rider or staff"
                optionFilterProp="label"
                options={riderOptions}
                notFoundContent={ridersLoading ? "Loading…" : "No staff at this branch. Use Outside driver."}
              />
            </Form.Item>
          ) : (
            <Row gutter={10}>
              <Col xs={24} sm={12}>
                <Form.Item name="driver_name" rules={[{ required: !hold, message: "Driver name is required" }]}>
                  <Input placeholder="Driver name" maxLength={100} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="driver_phone"
                  rules={[
                    { required: !hold, message: "Driver phone is required" },
                    { pattern: /^[0-9+\-\s]{7,20}$/, message: "Enter a valid phone" },
                  ]}
                >
                  <Input placeholder="Driver phone" maxLength={20} />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={10} align="bottom">
            <Col xs={24} sm={10}>
              <Form.Item
                label="Trip transport cost (Rs)"
                name="transport_cost"
                tooltip="Vehicle, fuel, driver for this trip. Split over the parcels and paid back to your branch from each parcel's delivery charge. Leave 0 if none."
              >
                <InputNumber min={0} step={50} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={14}>
              <Form.Item label="Split" name="transport_cost_split_mode">
                <Radio.Group size="small">
                  <Radio.Button value="equal">Equal</Radio.Button>
                  <Radio.Button value="weight">By weight</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Notes" name="notes" style={{ marginBottom: 6 }}>
            <Input.TextArea rows={1} maxLength={1000} placeholder="Optional" />
          </Form.Item>
        </Form>

        {missingWeight ? (
          <Alert type="warning" showIcon style={{ padding: "4px 10px" }} message="Some parcels have no weight, so the cost is split equally." />
        ) : null}

        <Table
          size="small"
          rowKey="id"
          dataSource={preview}
          pagination={preview.length > 6 ? { pageSize: 6, size: "small" } : false}
          columns={[
            { title: "Parcel", dataIndex: "tracking_number" },
            {
              title: "Final",
              dataIndex: "final",
              render: (v) => (v === "Last mile" ? <Tag color="green" style={{ margin: 0 }}>Last mile</Tag> : <Tag color="purple" style={{ margin: 0 }}>→ {v}</Tag>),
            },
            { title: "Weight", dataIndex: "weight", align: "right", render: (v) => (v ? `${Number(v).toFixed(2)} kg` : "-") },
            { title: "Cost share", dataIndex: "transport_cost", align: "right", render: (v) => `Rs ${Number(v || 0).toFixed(2)}` },
          ]}
        />

        {allowHold && !transferNumber ? (
          <Checkbox checked={hold} onChange={(e) => setHold(e.target.checked)}>
            <Text style={{ fontSize: 12 }}>
              Load only: keep the TR open (vehicle not leaving yet). Dispatch it later from the Sent tab.
            </Text>
          </Checkbox>
        ) : null}
      </Space>
    </Modal>
  );
}
