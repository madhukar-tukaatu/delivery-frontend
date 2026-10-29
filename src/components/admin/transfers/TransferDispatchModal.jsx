"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CarOutlined,
  SendOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  BellOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { getTransferRiders } from "@/services/admin/transferService";

const { Text, Title } = Typography;

export const VEHICLE_TYPES = [
  { value: "bike", label: "Bike / Motorcycle", icon: "🏍️", desc: "Light batch (≤ 25 kg / 10 parcels)", maxParcels: 10, maxKg: 25 },
  { value: "van", label: "Delivery Van", icon: "🚐", desc: "Standard batch (25–250 kg)", maxParcels: 50, maxKg: 250 },
  { value: "pickup", label: "Cargo Pickup", icon: "🛻", desc: "Medium cargo (250–600 kg)", maxParcels: 150, maxKg: 600 },
  { value: "truck", label: "Line-Haul Truck", icon: "🚛", desc: "Heavy freight (> 600 kg)", maxParcels: 9999, maxKg: 9999 },
  { value: "bus_cargo", label: "Bus Cargo", icon: "🚌", desc: "Intercity public cargo", maxParcels: 50, maxKg: 200 },
  { value: "other", label: "Other Carrier", icon: "📦", desc: "Custom carrier", maxParcels: 9999, maxKg: 9999 },
];

export function vehicleLabel(value) {
  return VEHICLE_TYPES.find((v) => v.value === value)?.label || value || null;
}

export function getRecommendedVehicle(totalParcels, totalWeight) {
  if (totalParcels <= 10 && totalWeight <= 25) {
    return { type: "bike", label: "Bike", icon: "🏍️", reason: "Light batch (≤ 10 parcels, ≤ 25 kg) — quick motorcycle transfer" };
  }
  if (totalParcels <= 50 && totalWeight <= 250) {
    return { type: "van", label: "Van", icon: "🚐", reason: "Standard batch (11–50 parcels, 25–250 kg) — delivery van recommended" };
  }
  if (totalParcels <= 150 && totalWeight <= 600) {
    return { type: "pickup", label: "Pickup", icon: "🛻", reason: "Medium volume (51–150 parcels, 250–600 kg) — utility pickup truck" };
  }
  return { type: "truck", label: "Truck", icon: "🚛", reason: "Heavy line-haul (> 150 parcels or > 600 kg) — dedicated freight truck" };
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
 * NOTE: Branch managers DO NOT specify transport cost. Fleet operations and line-haul
 * costs are 100% centrally managed and financed by SuperAdmin / HQ.
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

  const totalCount = (shipments || []).length;
  const totalWeight = useMemo(
    () => (shipments || []).reduce((sum, s) => sum + parcelWeight(s), 0),
    [shipments]
  );

  const recommendation = useMemo(
    () => getRecommendedVehicle(totalCount, totalWeight),
    [totalCount, totalWeight]
  );

  const selectedVehicle = Form.useWatch("vehicle_type", form) || recommendation.type;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setDriverMode("staff");
    setHold(false);

    // Auto-select recommended vehicle based on parcel count & weight
    form.setFieldsValue({
      vehicle_type: recommendation.type,
      transport_cost: 0,
      transport_cost_split_mode: "equal",
    });

    let alive = true;
    setRidersLoading(true);
    getTransferRiders(branchId ? { branch_id: branchId } : {})
      .then((list) => alive && setRiders(list))
      .catch(() => alive && setRiders([]))
      .finally(() => alive && setRidersLoading(false));
    return () => {
      alive = false;
    };
  }, [open, branchId, form, recommendation.type]);

  const parcels = useMemo(
    () =>
      (shipments || []).map((s) => ({
        id: s.id ?? s.shipment_id,
        tracking_number: s.tracking_number || `#${s.id ?? s.shipment_id}`,
        weight: parcelWeight(s),
        service_type: s.service_type || "standard",
        final: Number(s.destination_branch_id || 0) === Number(nextHopId || 0) ? "Last mile" : destinationName(s),
        is_last_mile: Number(s.destination_branch_id || 0) === Number(nextHopId || 0),
        receiver_name: s.receiver_name || s.recipient_name || "-",
      })),
    [shipments, nextHopId]
  );

  const split = useMemo(() => splitByFinal(shipments, nextHopId), [shipments, nextHopId]);

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
      vehicle_type: v.vehicle_type || recommendation.type,
      vehicle_number: v.vehicle_number?.trim() || undefined,
      seal_number: v.seal_number?.trim() || undefined,
      notes: v.notes?.trim() || undefined,
      // Transport costs are managed centrally by SuperAdmin / HQ; branch managers do not enter or incur costs.
      transport_cost: 0,
      transport_cost_split_mode: "equal",
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
    <Space size={8} align="center">
      <CarOutlined style={{ fontSize: 18, color: "#2563eb" }} />
      <span style={{ fontWeight: 700, fontSize: 16 }}>
        {transferNumber ? `Dispatch ${transferNumber}` : "Create Transfer Run (TR)"}
      </span>
      <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
        {fromLabel ? `${fromLabel} → ` : "→ "}
        <span style={{ color: "#1d4ed8", fontWeight: 700 }}>{nextHopName}</span>
      </Text>
    </Space>
  );

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={submit}
      okText={hold ? "Load on TR (hold open)" : "Dispatch to Next Branch"}
      okButtonProps={{
        icon: hold ? <InboxOutlined /> : <SendOutlined />,
        loading: submitting,
        disabled: !parcels.length,
        size: "middle",
        style: { fontWeight: 600 },
      }}
      width={820}
      destroyOnClose
      styles={{ body: { paddingTop: 6, maxHeight: "80vh", overflowY: "auto" } }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {/* Manifest Header & Route Split */}
        <Alert
          type="info"
          showIcon
          style={{ padding: "8px 12px", borderRadius: 8, background: "#f0f9ff", border: "1px solid #bae6fd" }}
          message={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Text strong style={{ fontSize: 13, color: "#0369a1" }}>{trHeadline(nextHopName, split)}</Text>
              <Tag color="blue" style={{ margin: 0, fontWeight: 700 }}>
                {totalCount} parcels · {totalWeight.toFixed(2)} kg
              </Tag>
            </div>
          }
          description={
            <Text type="secondary" style={{ fontSize: 12 }}>
              Parcels ride together to <strong>{nextHopName}</strong>. On arrival, {nextHopName} hub inspects shipments (intact, damaged, missing): last-mile parcels are dispatched for local delivery, and onward parcels join the next transit leg automatically.
            </Text>
          }
        />

        {/* Central Transport Fleet Notice (HQ Managed) */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            padding: "8px 12px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <SafetyCertificateOutlined style={{ color: "#16a34a", fontSize: 18, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Text strong style={{ fontSize: 12.5, color: "#166534" }}>
                HQ Central Transport Fleet Active
              </Text>
              <Tag color="green" style={{ margin: 0, fontSize: 10, fontWeight: 700 }}>
                100% HQ FINANCED
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 11.5, color: "#15803d", display: "block", marginTop: 2 }}>
              Vehicle fuel, maintenance, and line-haul carrier freight are funded centrally by SuperAdmin / HQ. Branch managers do not enter or pay transport costs. Branch trip deduction: <strong>Rs 0.00</strong>.
            </Text>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          size="middle"
          requiredMark={false}
          initialValues={{
            vehicle_type: recommendation.type,
            transport_cost: 0,
            transport_cost_split_mode: "equal",
          }}
        >
          {/* Vehicle Selection with Smart Recommendations */}
          <div style={{ marginBottom: 12, background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CarOutlined style={{ color: "#2563eb" }} />
                <Text strong style={{ fontSize: 13 }}>Choose Branch Vehicle</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  (Select based on volume: {totalCount} parcels, {totalWeight.toFixed(1)} kg)
                </Text>
              </div>
              <Tooltip title={recommendation.reason}>
                <Tag color="cyan" icon={<ThunderboltOutlined />} style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>
                  Suggested: {recommendation.label} ({recommendation.icon})
                </Tag>
              </Tooltip>
            </div>

            <Row gutter={[8, 8]}>
              {VEHICLE_TYPES.map((v) => {
                const isSelected = selectedVehicle === v.value;
                const isRec = recommendation.type === v.value;
                return (
                  <Col xs={12} sm={8} md={4} key={v.value}>
                    <div
                      onClick={() => form.setFieldValue("vehicle_type", v.value)}
                      style={{
                        cursor: "pointer",
                        border: isSelected ? "2px solid #2563eb" : "1px solid #cbd5e1",
                        background: isSelected ? "#eff6ff" : "#ffffff",
                        borderRadius: 8,
                        padding: "8px 6px",
                        textAlign: "center",
                        transition: "all 0.2s ease",
                        position: "relative",
                      }}
                    >
                      {isRec && (
                        <span
                          style={{
                            position: "absolute",
                            top: -6,
                            right: 4,
                            background: "#0284c7",
                            color: "#fff",
                            fontSize: 9,
                            padding: "1px 4px",
                            borderRadius: 4,
                            fontWeight: 700,
                          }}
                        >
                          BEST FIT
                        </span>
                      )}
                      <div style={{ fontSize: 20 }}>{v.icon}</div>
                      <div style={{ fontSize: 11.5, fontWeight: isSelected ? 700 : 600, color: isSelected ? "#1d4ed8" : "#334155" }}>
                        {v.label.split(" / ")[0]}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, lineHeight: 1.1 }}>
                        {v.desc.split(" (")[0]}
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>

            <Form.Item name="vehicle_type" hidden>
              <Input />
            </Form.Item>

            <Row gutter={10} style={{ marginTop: 10 }}>
              <Col xs={24} sm={12}>
                <Form.Item label="Vehicle Plate Number" name="vehicle_number" style={{ marginBottom: 0 }}>
                  <Input placeholder="e.g. Ba 2 Pa 1234 / Na 5 Kha 5678" maxLength={50} prefix={<CarOutlined style={{ color: "#94a3b8" }} />} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Security Seal / Container Bag No." name="seal_number" style={{ marginBottom: 0 }}>
                  <Input placeholder="e.g. SEAL-98421 (Optional)" maxLength={50} prefix={<SafetyCertificateOutlined style={{ color: "#94a3b8" }} />} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* Driver & Rider Assignment */}
          <div style={{ marginBottom: 12, background: "#f8fafc", padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13 }}>Assigned Driver / Rider</Text>
              <Segmented
                size="small"
                value={driverMode}
                onChange={setDriverMode}
                options={[
                  { value: "staff", label: "Branch Rider / Staff" },
                  { value: "outside", label: "Third-Party / Carrier Driver" },
                ]}
              />
            </div>

            {driverMode === "staff" ? (
              <div>
                <Form.Item name="rider_user_id" rules={[{ required: !hold, message: "Please select the rider or staff member carrying this transfer." }]} style={{ marginBottom: 4 }}>
                  <Select
                    showSearch
                    allowClear
                    loading={ridersLoading}
                    placeholder="Search branch rider by name or phone..."
                    optionFilterProp="label"
                    options={riderOptions}
                    notFoundContent={ridersLoading ? "Loading staff..." : "No active riders found at this branch. Switch to Outside Driver."}
                  />
                </Form.Item>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569", marginTop: 2 }}>
                  <BellOutlined style={{ color: "#0284c7" }} />
                  <span>The selected rider will receive an instant transfer assignment notification with all parcel details on dispatch.</span>
                </div>
              </div>
            ) : (
              <Row gutter={10}>
                <Col xs={24} sm={12}>
                  <Form.Item name="driver_name" rules={[{ required: !hold, message: "Driver name is required" }]} style={{ marginBottom: 4 }}>
                    <Input placeholder="Driver full name" maxLength={100} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="driver_phone"
                    rules={[
                      { required: !hold, message: "Driver phone is required" },
                      { pattern: /^[0-9+\-\s]{7,20}$/, message: "Enter a valid phone number" },
                    ]}
                    style={{ marginBottom: 4 }}
                  >
                    <Input placeholder="Driver mobile phone" maxLength={20} />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </div>

          <Form.Item label="Dispatch Notes / Handover Remarks" name="notes" style={{ marginBottom: 8 }}>
            <Input.TextArea rows={1} maxLength={1000} placeholder="Optional instructions for receiving hub manager..." />
          </Form.Item>
        </Form>

        {/* Parcels Manifest Itemized Preview */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Text strong style={{ fontSize: 12.5 }}>Manifest Parcels ({parcels.length})</Text>
            <Space size={6}>
              <Tag color="green" style={{ margin: 0, fontSize: 11 }}>{split.lastMile} Last Mile</Tag>
              <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>{split.onwardCount} Onward Transfer</Tag>
            </Space>
          </div>

          <Table
            size="small"
            rowKey="id"
            dataSource={parcels}
            pagination={parcels.length > 5 ? { pageSize: 5, size: "small" } : false}
            columns={[
              {
                title: "Tracking #",
                dataIndex: "tracking_number",
                render: (v, r) => (
                  <div>
                    <Text strong style={{ fontSize: 12 }}>{v}</Text>
                    <div style={{ fontSize: 11, color: "#64748b" }}>To: {r.receiver_name}</div>
                  </div>
                ),
              },
              {
                title: "Destination / Next Leg",
                dataIndex: "final",
                render: (v, r) =>
                  r.is_last_mile ? (
                    <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>
                      ✓ Last Mile ({nextHopName})
                    </Tag>
                  ) : (
                    <Tag color="purple" style={{ margin: 0, fontWeight: 600 }}>
                      → {v} (via {nextHopName})
                    </Tag>
                  ),
              },
              {
                title: "Weight",
                dataIndex: "weight",
                align: "right",
                render: (v) => (v ? `${Number(v).toFixed(2)} kg` : "-"),
              },
              {
                title: "Service",
                dataIndex: "service_type",
                render: (v) => (
                  <Tag style={{ margin: 0, textTransform: "uppercase", fontSize: 10 }}>
                    {v}
                  </Tag>
                ),
              },
              {
                title: "HQ Transport",
                key: "transport",
                align: "center",
                render: () => (
                  <Tooltip title="100% funded and settled by HQ central transport pool">
                    <Tag color="success" style={{ margin: 0, fontSize: 10.5, fontWeight: 600 }}>
                      Covered (Rs 0)
                    </Tag>
                  </Tooltip>
                ),
              },
            ]}
          />
        </div>

        {allowHold && !transferNumber ? (
          <Checkbox checked={hold} onChange={(e) => setHold(e.target.checked)}>
            <Text style={{ fontSize: 12 }}>
              <strong>Stage only:</strong> Keep TR open for batching (vehicle not leaving yet). You can append more parcels and dispatch when ready.
            </Text>
          </Checkbox>
        ) : null}
      </Space>
    </Modal>
  );
}
