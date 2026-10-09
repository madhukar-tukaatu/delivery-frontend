"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  BarcodeOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { getContainer, lookupContainer, openTrPrint, receiveContainer, resolveContainerItem } from "@/services/admin/transferService";
import { vehicleLabel } from "@/components/admin/transfers/TransferDispatchModal";

const { Text } = Typography;

export const TR_STATUS_META = {
  open: { color: "default", label: "Open (loading)" },
  dispatched: { color: "processing", label: "Dispatched" },
  in_transit: { color: "processing", label: "In transit" },
  received: { color: "success", label: "Received" },
  partially_received: { color: "warning", label: "Partially received" },
  cancelled: { color: "error", label: "Cancelled" },
};

export function TrStatusTag({ status }) {
  const meta = TR_STATUS_META[status] || { color: "default", label: String(status || "-").replace(/_/g, " ") };
  return (
    <Tag color={meta.color} style={{ margin: 0 }}>
      {meta.label}
    </Tag>
  );
}

export const SEAL_META = {
  ok: ["green", "Seal OK"],
  mismatch: ["red", "Seal mismatch"],
  tampered: ["red", "Seal tampered"],
};

export function SealTag({ c }) {
  if (!c?.seal_status) return null;
  const [color, label] = SEAL_META[c.seal_status] || ["default", `Seal ${c.seal_status}`];
  const tip = [
    c.seal_number ? `Sent: ${c.seal_number}` : "No seal recorded at dispatch",
    c.seal_checked_value ? `Found: ${c.seal_checked_value}` : null,
    c.seal_checked_by_name ? `Checked by ${c.seal_checked_by_name}` : null,
    c.seal_remark ? `Remark: ${c.seal_remark}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Tooltip title={tip}>
      <Tag color={color} style={{ margin: 0 }}>{label}</Tag>
    </Tooltip>
  );
}

/** Client-side preview of the seal result the server will record. */
export function sealStatusFor(expected, value, intact) {
  if (!intact) return "tampered";
  const e = String(expected || "").trim().toLowerCase();
  if (e && String(value || "").trim().toLowerCase() !== e) return "mismatch";
  return "ok";
}

const ITEM_STATUS_META = {
  added: { color: "default", label: "Loaded" },
  sent: { color: "processing", label: "On the way" },
  dispatched: { color: "processing", label: "On the way" },
  in_transit: { color: "processing", label: "On the way" },
  received: { color: "success", label: "Received" },
  missing: { color: "warning", label: "Missing" },
  lost: { color: "error", label: "Lost" },
  moved: { color: "default", label: "Arrived on another TR" },
  cancelled: { color: "default", label: "Removed" },
};

const OPEN_ITEM = ["sent", "dispatched", "in_transit"];

function fmt(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? String(dt) : d.toLocaleString();
}

/**
 * Check-in drawer for one TR at the receiving branch.
 * Step 1: scan the TR bag-label barcode (when opened without a TR).
 * Step 2: check the seal (number + intact). A wrong or broken seal is flagged,
 *         the sending branch is notified and a remark is required; the parcel
 *         check still goes ahead.
 * Step 3: scan or tick the parcels that arrived, review missing / extra, confirm.
 * After confirm: last-mile parcels are sorted for delivery here, onward parcels are
 * sorted for transfer and show up in this branch's next TR. Missing parcels can be
 * resolved later (found / lost).
 *
 * props: open, containerId, branchId (admin override), onClose, onDone(result)
 */
export default function TransferReceiveScanner({ open, containerId, branchId = null, onClose, onDone }) {
  const [activeId, setActiveId] = useState(containerId || null);
  const [trCode, setTrCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [sealValue, setSealValue] = useState("");
  const [sealIntact, setSealIntact] = useState(false);
  const [sealRemark, setSealRemark] = useState("");
  const [bagDamaged, setBagDamaged] = useState(false);
  const trCodeRef = useRef(null);
  const [tr, setTr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState([]); // shipment ids
  const [extras, setExtras] = useState([]); // tracking codes scanned but not on this TR
  const [scan, setScan] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [resolving, setResolving] = useState(null);
  const scanRef = useRef(null);
  const params = useMemo(() => (branchId ? { branch_id: branchId } : {}), [branchId]);

  const load = useCallback(async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      const data = await getContainer(activeId, params);
      setTr(data);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load TR");
      setTr(null);
    } finally {
      setLoading(false);
    }
  }, [activeId, params]);

  useEffect(() => {
    if (open) setActiveId(containerId || null);
  }, [open, containerId]);

  useEffect(() => {
    if (!open) return;
    setChecked([]);
    setExtras([]);
    setScan("");
    setRemarks("");
    setResult(null);
    setSealValue("");
    setSealIntact(false);
    setSealRemark("");
    setBagDamaged(false);
    if (!activeId) {
      setTr(null);
      setTrCode("");
      setTimeout(() => trCodeRef.current?.focus?.(), 150);
      return;
    }
    load();
  }, [open, activeId, load]);

  // Step 1: open the TR from its bag-label barcode.
  const onLookup = async () => {
    const code = trCode.trim();
    if (!code) return;
    setLooking(true);
    try {
      const data = await lookupContainer(code, params);
      if (!data?.id) throw new Error("TR not found");
      setTr(data);
      setActiveId(data.id);
      if (!data.can_receive && !data.can_resolve) message.info(`${data.display_number} is ${TR_STATUS_META[data.status]?.label || data.status}.`);
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || "TR not found");
      setTrCode("");
    } finally {
      setLooking(false);
    }
  };

  useEffect(() => {
    if (open && tr?.can_receive) setTimeout(() => scanRef.current?.focus?.(), 150);
  }, [open, tr?.can_receive]);

  const items = useMemo(() => tr?.items || [], [tr]);
  const openItems = useMemo(() => items.filter((i) => OPEN_ITEM.includes(i.status) && !i.is_extra), [items]);
  const missingItems = useMemo(() => items.filter((i) => i.status === "missing"), [items]);
  const canReceive = !!tr?.can_receive;
  const missingNow = openItems.filter((i) => !checked.includes(i.shipment_id));
  const sentSeal = String(tr?.seal_number || "").trim();
  // With a seal recorded at dispatch the check is mandatory; without one only a damaged bag is reported.
  const sealState = sentSeal ? sealStatusFor(sentSeal, sealValue, sealIntact) : bagDamaged ? "tampered" : null;

  const onScan = () => {
    const code = scan.trim();
    if (!code) return;
    setScan("");
    const hit = items.find(
      (i) => String(i.tracking_number || "").toLowerCase() === code.toLowerCase() || String(i.shipment_id) === code
    );
    if (hit && OPEN_ITEM.includes(hit.status)) {
      if (checked.includes(hit.shipment_id)) {
        message.info(`${hit.tracking_number} already ticked`);
      } else {
        setChecked((p) => [...p, hit.shipment_id]);
        message.success(`${hit.tracking_number} ✓`);
      }
      return;
    }
    if (hit) {
      message.info(`${hit.tracking_number}: ${ITEM_STATUS_META[hit.status]?.label || hit.status}`);
      return;
    }
    if (extras.some((x) => x.toLowerCase() === code.toLowerCase())) return;
    setExtras((p) => [...p, code]);
    message.warning(`${code} is not on ${tr?.display_number}. Added as extra; checked on confirm.`);
  };

  const doReceive = async () => {
    setSaving(true);
    try {
      const seal = sealState
        ? { value: sealValue.trim(), intact: sentSeal ? sealIntact : !bagDamaged, remark: sealRemark.trim() }
        : null;
      const res = await receiveContainer(activeId, [...checked, ...extras], remarks, params, seal);
      setResult(res);
      setTr((prev) => ({ ...(res?.container || prev), can_receive: false, can_resolve: res?.container?.status === "partially_received" }));
      message.success(res?.message || "TR received");
      onDone?.(res);
    } catch (e) {
      const errors = e?.response?.data?.errors;
      const first = errors ? Object.values(errors).flat()?.[0] : null;
      message.error(first || e?.response?.data?.message || "Failed to receive TR");
    } finally {
      setSaving(false);
    }
  };

  const confirmReceive = () => {
    if (sentSeal && !sealValue.trim()) {
      message.warning(`Scan or type the seal number on the bag (sent with seal ${sentSeal}).`);
      return;
    }
    if (sealState && sealState !== "ok" && !sealRemark.trim()) {
      message.warning(sealState === "tampered" ? "Seal not intact: add a remark describing the damage." : "Seal number does not match: add a remark.");
      return;
    }
    if (!checked.length && !extras.length) {
      message.warning("Scan or tick the parcels that arrived.");
      return;
    }
    if (!missingNow.length && !extras.length) {
      doReceive();
      return;
    }
    Modal.confirm({
      title: `Confirm receive of ${tr?.display_number}`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical" size={4}>
          {missingNow.length ? (
            <Text>
              <Text type="warning" strong>{missingNow.length}</Text> parcel(s) not ticked will be flagged{" "}
              <Text strong>missing</Text> and the sending branch notified.
            </Text>
          ) : null}
          {extras.length ? (
            <Text>
              <Text strong>{extras.length}</Text> extra scan(s) will be checked; parcels headed here are taken in, others are
              rejected.
            </Text>
          ) : null}
        </Space>
      ),
      okText: "Confirm receive",
      onOk: doReceive,
    });
  };

  const resolve = async (item, action) => {
    setResolving(`${item.item_id}:${action}`);
    try {
      const res = await resolveContainerItem(activeId, item.item_id, action, null, params);
      if (res?.container) setTr((prev) => ({ ...prev, ...res.container, can_resolve: res.container.status === "partially_received" }));
      message.success(action === "found" ? `${item.tracking_number} received and sorted` : `${item.tracking_number} marked lost`);
      onDone?.(res);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to update parcel");
    } finally {
      setResolving(null);
    }
  };

  const columns = [
    {
      title: "Parcel",
      key: "parcel",
      render: (_, i) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 12 }}>{i.tracking_number || `#${i.shipment_id}`}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{i.receiver_name || ""}</Text>
        </Space>
      ),
    },
    {
      title: "Here",
      key: "final",
      width: 150,
      render: (_, i) =>
        i.is_final_here ? (
          <Tag color="green" style={{ margin: 0 }}>Last mile</Tag>
        ) : (
          <Tag color="purple" style={{ margin: 0 }}>→ {i.destination_name || "onward"}</Tag>
        ),
    },
    {
      title: "Status",
      key: "status",
      width: 170,
      render: (_, i) => {
        const ticked = checked.includes(i.shipment_id) && OPEN_ITEM.includes(i.status);
        const meta = ITEM_STATUS_META[i.status] || { color: "default", label: i.status };
        return (
          <Space size={4} wrap>
            {ticked ? <Tag color="success" style={{ margin: 0 }}>Ticked</Tag> : <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>}
            {i.is_extra ? <Tag color="gold" style={{ margin: 0 }}>Extra</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: "Cost",
      dataIndex: "transport_cost",
      align: "right",
      width: 90,
      render: (v) => (Number(v) ? `Rs ${Number(v).toFixed(2)}` : "-"),
    },
    tr?.can_resolve
      ? {
          title: "",
          key: "resolve",
          width: 150,
          render: (_, i) =>
            i.status === "missing" ? (
              <Space size={4}>
                <Button size="small" type="primary" ghost loading={resolving === `${i.item_id}:found`} onClick={() => resolve(i, "found")}>
                  Found
                </Button>
                <Popconfirm
                  title={`Mark ${i.tracking_number} lost?`}
                  description="The sending branch is notified. The parcel's transport share stays on this TR."
                  okText="Mark lost"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => resolve(i, "lost")}
                >
                  <Button size="small" danger loading={resolving === `${i.item_id}:lost`}>
                    Lost
                  </Button>
                </Popconfirm>
              </Space>
            ) : null,
        }
      : null,
  ].filter(Boolean);

  const lastMile = (result?.received || []).concat(result?.extras || []).filter((r) => r.result === "last_mile");
  const onward = (result?.received || []).concat(result?.extras || []).filter((r) => r.result === "onward");
  const onwardByHop = onward.reduce((acc, r) => {
    const k = r.next_hop_name || r.destination_name || "next hop";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={860}
      destroyOnClose
      title={
        <Space size={8} wrap>
          <InboxOutlined />
          <span>{tr ? `Receive ${tr.display_number}` : "Receive TR"}</span>
          {tr ? <TrStatusTag status={tr.status} /> : null}
          {tr ? (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {tr.from_branch?.name} → {tr.to_branch?.name}
            </Text>
          ) : null}
        </Space>
      }
      extra={
        <Space size={6}>
          {tr?.id ? (
            <>
              <Button icon={<PrinterOutlined />} onClick={() => openTrPrint(tr.id, "manifest", branchId)}>
                Manifest
              </Button>
              <Button icon={<PrinterOutlined />} onClick={() => openTrPrint(tr.id, "label", branchId)}>
                Label
              </Button>
            </>
          ) : null}
          {canReceive ? (
            <Button type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={confirmReceive}>
              Confirm receive ({checked.length + extras.length})
            </Button>
          ) : null}
        </Space>
      }
      styles={{ body: { padding: 12 } }}
    >
      {!activeId ? (
        <Space direction="vertical" size={10} style={{ width: "100%", padding: "24px 0" }}>
          <Text strong>Step 1: scan the TR bag label</Text>
          <Input.Search
            ref={trCodeRef}
            size="large"
            prefix={<BarcodeOutlined />}
            placeholder="Scan or type the TR number, e.g. TR-000001"
            value={trCode}
            onChange={(e) => setTrCode(e.target.value)}
            onSearch={onLookup}
            enterButton="Open TR"
            loading={looking}
            allowClear
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Only TRs headed to your branch open here.
          </Text>
        </Space>
      ) : loading && !tr ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin />
        </div>
      ) : !tr ? (
        <Empty description="TR not found" />
      ) : (
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
            <Descriptions.Item label="Vehicle">
              {[vehicleLabel(tr.vehicle_type), tr.vehicle_number].filter(Boolean).join(" · ") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Carried by">
              {tr.rider?.name || tr.driver_name || "-"}
              {tr.rider?.phone || tr.driver_phone ? ` · ${tr.rider?.phone || tr.driver_phone}` : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Trip cost">
              {Number(tr.transport_cost) ? `Rs ${Number(tr.transport_cost).toFixed(2)} (${tr.transport_cost_split_mode})` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Dispatched">{fmt(tr.dispatched_at)}</Descriptions.Item>
            <Descriptions.Item label="Received">{fmt(tr.received_at)}</Descriptions.Item>
            <Descriptions.Item label="Seal">
              <Space size={4} wrap>
                <span>{tr.seal_number || "-"}</span>
                <SealTag c={tr} />
              </Space>
            </Descriptions.Item>
            {tr.seal_status && tr.seal_status !== "ok" ? (
              <Descriptions.Item label="Seal remark" span={3}>
                {tr.seal_checked_value ? `Found ${tr.seal_checked_value}. ` : ""}
                {tr.seal_remark || "-"}
                {tr.seal_checked_by_name ? ` (${tr.seal_checked_by_name}, ${fmt(tr.seal_checked_at)})` : ""}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          {canReceive ? (
            <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 10 }}>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space size={6}>
                  <SafetyCertificateOutlined />
                  <Text strong>Step 2: check the seal</Text>
                  {sealState ? (
                    <Tag color={SEAL_META[sealState][0]} style={{ margin: 0 }}>{SEAL_META[sealState][1]}</Tag>
                  ) : null}
                </Space>
                {sentSeal ? (
                  <Space wrap>
                    <Input
                      prefix={<BarcodeOutlined />}
                      placeholder={`Scan / type the seal on the bag (sent: ${sentSeal})`}
                      value={sealValue}
                      onChange={(e) => setSealValue(e.target.value)}
                      maxLength={50}
                      style={{ width: 320 }}
                      status={sealValue && sealState === "mismatch" ? "error" : undefined}
                    />
                    <Checkbox checked={sealIntact} onChange={(e) => setSealIntact(e.target.checked)}>
                      Seal intact
                    </Checkbox>
                  </Space>
                ) : (
                  <Space wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>No seal was recorded at dispatch.</Text>
                    <Checkbox checked={bagDamaged} onChange={(e) => setBagDamaged(e.target.checked)}>
                      Bag damaged / opened
                    </Checkbox>
                  </Space>
                )}
                {sealState && sealState !== "ok" ? (
                  <>
                    <Alert
                      type="error"
                      showIcon
                      style={{ padding: "4px 8px" }}
                      message={
                        sealState === "tampered"
                          ? "Seal not intact: the TR is flagged tampered and the sending branch is notified. You can still check the parcels."
                          : `Seal does not match ${sentSeal}: the TR is flagged and the sending branch is notified. You can still check the parcels.`
                      }
                    />
                    <Input.TextArea
                      rows={1}
                      maxLength={500}
                      placeholder="Remark (required): what is wrong with the seal / bag"
                      value={sealRemark}
                      onChange={(e) => setSealRemark(e.target.value)}
                      status={!sealRemark.trim() ? "warning" : undefined}
                    />
                  </>
                ) : null}
              </Space>
            </div>
          ) : null}

          <Space size={24} wrap>
            <Statistic title="Expected" value={tr.expected_count} valueStyle={{ fontSize: 18 }} />
            <Statistic title="Received" value={tr.received_count} valueStyle={{ fontSize: 18, color: "#389e0d" }} />
            <Statistic title="Missing" value={tr.missing_count} valueStyle={{ fontSize: 18, color: tr.missing_count ? "#d46b08" : undefined }} />
            <Statistic title="Extra" value={tr.extra_count} valueStyle={{ fontSize: 18 }} />
            <Statistic title="Last mile" value={tr.last_mile_count} valueStyle={{ fontSize: 18 }} />
            <Statistic title="Onward" value={tr.onward_count} valueStyle={{ fontSize: 18 }} />
          </Space>

          {canReceive ? (
            <Space.Compact style={{ width: "100%" }}>
              <Input
                ref={scanRef}
                prefix={<BarcodeOutlined />}
                placeholder="Scan or type a tracking number, press Enter"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onPressEnter={onScan}
                allowClear
              />
              <Button icon={<CheckSquareOutlined />} onClick={() => setChecked(openItems.map((i) => i.shipment_id))}>
                Tick all
              </Button>
              <Button onClick={() => { setChecked([]); setExtras([]); }}>Clear</Button>
            </Space.Compact>
          ) : null}

          {canReceive ? (
            <Space size={6} wrap>
              <Badge status="success" text={`${checked.length} ticked`} />
              <Badge status={missingNow.length ? "warning" : "default"} text={`${missingNow.length} not ticked (missing on confirm)`} />
              {extras.map((code) => (
                <Tag key={code} color="gold" closable onClose={() => setExtras((p) => p.filter((x) => x !== code))} style={{ margin: 0 }}>
                  Extra: {code}
                </Tag>
              ))}
            </Space>
          ) : null}

          {result ? (
            <Alert
              type={result.missing?.length || result.rejected?.length ? "warning" : "success"}
              showIcon
              message={result.message || "TR received"}
              description={
                <Space direction="vertical" size={2} style={{ fontSize: 12 }}>
                  <span>
                    <CheckCircleOutlined style={{ color: "#389e0d" }} /> {lastMile.length} sorted for last-mile delivery here.
                  </span>
                  <span>
                    <InboxOutlined /> {onward.length} sorted for onward transfer
                    {Object.keys(onwardByHop).length
                      ? ` (${Object.entries(onwardByHop).map(([k, v]) => `${v} → ${k}`).join(", ")})`
                      : ""}
                    ; they appear in Outbound for your next TR.
                  </span>
                  {result.missing?.length ? (
                    <span>
                      <WarningOutlined style={{ color: "#d46b08" }} /> {result.missing.length} missing:{" "}
                      {result.missing.map((m) => m.tracking_number).join(", ")}. Resolve below when found or lost.
                    </span>
                  ) : null}
                  {result.extras?.length ? (
                    <span>
                      {result.extras.length} extra taken in: {result.extras.map((x) => `${x.tracking_number}${x.booked_on ? ` (was on ${x.booked_on})` : ""}`).join(", ")}
                    </span>
                  ) : null}
                  {result.rejected?.length ? (
                    <span>
                      <CloseCircleOutlined style={{ color: "#cf1322" }} /> Rejected:{" "}
                      {result.rejected.map((r) => `${r.tracking_number || r.code}: ${r.reason}`).join("; ")}
                    </span>
                  ) : null}
                </Space>
              }
            />
          ) : null}

          {tr.can_resolve && missingItems.length > 0 && !result ? (
            <Alert
              type="warning"
              showIcon
              style={{ padding: "6px 10px" }}
              message={`${missingItems.length} parcel(s) missing on this TR. Mark Found when it turns up (it is received and sorted), or Lost.`}
            />
          ) : null}

          <Table
            size="small"
            rowKey="item_id"
            loading={loading}
            dataSource={items.filter((i) => !["cancelled"].includes(i.status))}
            columns={columns}
            pagination={items.length > 50 ? { pageSize: 50, size: "small" } : false}
            rowSelection={
              canReceive
                ? {
                    selectedRowKeys: openItems.filter((i) => checked.includes(i.shipment_id)).map((i) => i.item_id),
                    getCheckboxProps: (i) => ({ disabled: !OPEN_ITEM.includes(i.status) || i.is_extra }),
                    onChange: (keys) => {
                      const set = new Set(keys);
                      setChecked(openItems.filter((i) => set.has(i.item_id)).map((i) => i.shipment_id));
                    },
                  }
                : undefined
            }
            rowClassName={(i) => (canReceive && OPEN_ITEM.includes(i.status) && !checked.includes(i.shipment_id) ? "tr-row-pending" : "")}
            scroll={{ x: 640 }}
          />

          {canReceive ? (
            <Input.TextArea
              rows={1}
              maxLength={500}
              placeholder="Remarks (optional, e.g. bag torn, 1 parcel wet)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          ) : null}
        </Space>
      )}
    </Drawer>
  );
}
