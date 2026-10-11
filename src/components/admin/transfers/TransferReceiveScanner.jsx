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
  Radio,
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
  ToolOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { getContainer, lookupContainer, openTrPrint, receiveContainer, repairContainer, resolveContainerItem } from "@/services/admin/transferService";
import { vehicleLabel } from "@/components/admin/transfers/TransferDispatchModal";

const { Text } = Typography;

export const TR_STATUS_META = {
  open: { color: "default", label: "Open (loading)" },
  dispatched: { color: "processing", label: "Dispatched" },
  in_transit: { color: "processing", label: "In transit" },
  received: { color: "success", label: "Received" },
  partially_received: { color: "warning", label: "Received with missing shipments" },
  cancelled: { color: "error", label: "Cancelled" },
};

/** missing: number of shipments still missing on the TR ("Received — 2 shipments missing"). */
export function TrStatusTag({ status, missing = 0 }) {
  const meta = TR_STATUS_META[status] || { color: "default", label: String(status || "-").replace(/_/g, " ") };
  const n = Number(missing) || 0;
  const label = status === "partially_received" && n > 0 ? `Received — ${n} shipment${n === 1 ? "" : "s"} missing` : meta.label;
  return (
    <Tag color={meta.color} style={{ margin: 0 }}>
      {label}
    </Tag>
  );
}

export const SEAL_META = {
  ok: ["green", "Seal OK"],
  mismatch: ["red", "Seal mismatch"],
  tampered: ["red", "Seal tampered"],
};

/** Plain result words for the seal check. */
const SEAL_RESULT_LABEL = { ok: "Intact", mismatch: "Mismatch", tampered: "Broken or missing" };

/** 10/11/2026 11:05 AM (no seconds). */
function fmtShort(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  return Number.isNaN(d.getTime())
    ? String(dt)
    : d.toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" });
}

export function SealTag({ c }) {
  if (!c?.seal_status) return null;
  const [color, label] = SEAL_META[c.seal_status] || ["default", `Seal ${c.seal_status}`];
  const tip = [
    c.seal_number ? `Sealed at dispatch: ${c.seal_number}` : "No seal recorded at dispatch",
    `Entered at receive: ${c.seal_checked_value || "not typed"}`,
    c.seal_remark ? `Remark: ${c.seal_remark}` : null,
    `Result: ${SEAL_RESULT_LABEL[c.seal_status] || c.seal_status}`,
    c.seal_checked_by_name ? `Checked by ${c.seal_checked_by_name}${c.seal_checked_at ? ` · ${fmtShort(c.seal_checked_at)}` : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Tooltip title={tip}>
      <Tag color={color} style={{ margin: 0 }}>{label}</Tag>
    </Tooltip>
  );
}

/**
 * Client-side preview of the seal result the server will record.
 * answer: "ok" (intact) | "tampered" (broken or missing) | "mismatch" | null (not answered).
 * Typing the number is optional; a typed number that differs from the one sent is a mismatch.
 */
export function sealStatusFor(expected, value, answer) {
  if (!answer || answer === "skip") return null;
  if (answer === "tampered" || answer === false) return "tampered";
  if (answer === "mismatch") return "mismatch";
  const e = String(expected || "").trim().toLowerCase();
  const v = String(value || "").trim().toLowerCase();
  if (e && v && v !== e) return "mismatch";
  return "ok";
}

/** What the server expects for each answer (seal_status). */
const SEAL_ANSWER_PARAM = { ok: "intact", tampered: "broken", mismatch: "mismatch" };

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
 * Admin "Repair receive" for a TR checked in wrongly: clear a wrong seal flag and/or
 * receive + sort the parcels still marked missing. Preview (dry run) first, then Apply.
 */
function RepairReceiveDialog({ tr, open, onClose, onRepaired, params }) {
  const [clearSeal, setClearSeal] = useState(false);
  const [foundAll, setFoundAll] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setClearSeal(!!tr?.seal_status);
    setFoundAll(Number(tr?.missing_count || 0) > 0);
    setPreview(null);
    setError("");
  }, [open, tr?.id, tr?.seal_status, tr?.missing_count]);

  const run = async (dryRun) => {
    if (!clearSeal && !foundAll) {
      setError("Pick at least one repair.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await repairContainer(tr.id, { clearSeal, foundAll, dryRun }, params);
      if (dryRun) {
        setPreview(res);
      } else {
        message.success(res?.message || "TR repaired");
        onRepaired?.(res);
        onClose?.();
      }
    } catch (e) {
      const errors = e?.response?.data?.errors;
      setError((errors ? Object.values(errors).flat()[0] : null) || e?.response?.data?.message || "Repair failed");
    } finally {
      setBusy(false);
    }
  };

  const actionable = (preview?.changes || []).some((c) => c.action);
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space size={6}>
          <ToolOutlined />
          <span>Repair receive · {tr?.display_number}</span>
        </Space>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button key="preview" loading={busy && !preview} onClick={() => run(true)}>
          Preview
        </Button>,
        <Button key="apply" type="primary" danger disabled={!preview || !actionable} loading={busy && !!preview} onClick={() => run(false)}>
          Apply
        </Button>,
      ]}
      destroyOnHidden
    >
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          For a TR checked in wrongly. Preview shows exactly what will change; nothing is written until Apply. Every repair is
          recorded in the audit log with your name.
        </Text>
        <Checkbox
          checked={clearSeal}
          onChange={(e) => {
            setClearSeal(e.target.checked);
            setPreview(null);
          }}
        >
          Clear wrong seal flag {tr?.seal_status ? <Text type="secondary">(now: {SEAL_RESULT_LABEL[tr.seal_status] || tr.seal_status})</Text> : null}
        </Checkbox>
        <Checkbox
          checked={foundAll}
          onChange={(e) => {
            setFoundAll(e.target.checked);
            setPreview(null);
          }}
        >
          Receive &amp; sort missing parcels (mark found){" "}
          <Text type="secondary">({Number(tr?.missing_count || 0)} missing)</Text>
        </Checkbox>
        {error ? <Alert type="error" showIcon message={error} style={{ padding: "4px 8px" }} /> : null}
        {preview ? (
          <Alert
            type={actionable ? "info" : "warning"}
            showIcon
            message={actionable ? "Apply will:" : "Nothing to change"}
            description={
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                {(preview.changes || []).map((c, i) => (
                  <li key={i} style={{ color: c.action ? undefined : "#8c8c8c" }}>
                    {c.label}
                  </li>
                ))}
                {(preview.errors || []).map((e) => (
                  <li key={e} style={{ color: "#cf1322" }}>
                    {e}
                  </li>
                ))}
              </ul>
            }
          />
        ) : null}
      </Space>
    </Modal>
  );
}

/**
 * Check-in drawer / panel for one TR at the receiving branch. Works without a scanner.
 * Step 1: type the TR number (TR-000004, 4, 000004, tr-4) or scan the bag label
 *         (only when opened without a TR; picking a TR card skips this step).
 * Step 2: seal check, only when a seal was recorded at dispatch: Seal intact /
 *         Seal broken or missing / Number mismatch. Typing the number is optional.
 *         Broken or mismatch needs a short remark; the TR is flagged, the sending
 *         branch is notified and the receive goes ahead normally.
 * Step 3: type / scan tracking numbers, tick rows or "Tick all", review missing / extra, confirm.
 * After confirm: last-mile parcels are sorted for delivery here, onward parcels are
 * sorted for transfer and show up in this branch's next TR. Missing parcels can be
 * resolved later (found / lost).
 *
 * props: open, containerId, branchId (admin override), onClose, onDone(result),
 *        inline (render in a detail panel instead of a drawer; pass open={true})
 */
export default function TransferReceiveScanner({ open, containerId, branchId = null, onClose, onDone, inline = false }) {
  const [activeId, setActiveId] = useState(containerId || null);
  const [trCode, setTrCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [sealValue, setSealValue] = useState("");
  // skip = not checked (default): nothing is sent, nothing is flagged. Only an explicit choice records a seal result.
  const [sealAnswer, setSealAnswer] = useState("skip"); // skip | ok | tampered | mismatch
  const [sealRemark, setSealRemark] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState("");
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
  const [repairOpen, setRepairOpen] = useState(false);
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
    setSealAnswer("skip");
    setSealRemark("");
    setShowErrors(false);
    setServerError("");
    setLookupError("");
    if (!activeId) {
      setTr(null);
      setTrCode("");
      setTimeout(() => trCodeRef.current?.focus?.(), 150);
      return;
    }
    load();
  }, [open, activeId, load]);

  // Step 1: open the TR from its number (typed or scanned; the server accepts 4, 000004, tr-4 ...).
  const onLookup = async () => {
    const code = trCode.trim();
    if (!code) {
      setLookupError("Type the TR number from the bag label, e.g. TR-000004 or just 4.");
      return;
    }
    setLooking(true);
    setLookupError("");
    try {
      const data = await lookupContainer(code, params);
      if (!data?.id) throw new Error("TR not found");
      setTr(data);
      setActiveId(data.id);
      if (!data.can_receive && !data.can_resolve) message.info(`${data.display_number} is ${TR_STATUS_META[data.status]?.label || data.status}.`);
    } catch (e) {
      // Keep what was typed so it can be corrected; selected so the next barcode scan replaces it.
      setLookupError(e?.response?.data?.message || e?.message || "TR not found");
      setTimeout(() => {
        trCodeRef.current?.focus?.();
        trCodeRef.current?.select?.();
      }, 50);
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

  // Opening a TR to receive ticks every parcel on it: one click on Confirm receives the
  // whole TR (no scanner needed). Untick or Clear the ones that did not arrive.
  const autoTickedFor = useRef(null);
  useEffect(() => {
    if (!canReceive || !tr?.id || autoTickedFor.current === tr.id) return;
    autoTickedFor.current = tr.id;
    setChecked(openItems.map((i) => i.shipment_id));
  }, [canReceive, tr?.id, openItems]);
  const sentSeal = String(tr?.seal_number || "").trim();
  // Seal step only when a seal was recorded at dispatch; otherwise it is skipped.
  const sealState = sentSeal ? sealStatusFor(sentSeal, sealValue, sealAnswer) : null;
  const blockers = [];
  if (canReceive && sealState && sealState !== "ok" && !sealRemark.trim())
    blockers.push(sealState === "tampered" ? "Step 2: add a short remark about the broken / missing seal." : "Step 2: add a short remark about the seal number mismatch.");

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
      setServerError("");
      const seal = sealState
        ? { value: sealValue.trim(), intact: sealState !== "tampered", remark: sealRemark.trim(), status: SEAL_ANSWER_PARAM[sealState] }
        : null;
      const res = await receiveContainer(activeId, [...checked, ...extras], remarks, params, seal);
      setResult(res);
      setTr((prev) => ({ ...(res?.container || prev), can_receive: false, can_resolve: res?.container?.status === "partially_received" }));
      message.success(res?.message || "TR received");
      onDone?.(res);
    } catch (e) {
      const errors = e?.response?.data?.errors;
      const first = errors ? Object.values(errors).flat()?.[0] : null;
      const msg = first || e?.response?.data?.message || "Failed to receive TR";
      setServerError(msg);
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmReceive = () => {
    if (blockers.length) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (!missingNow.length && !extras.length) {
      doReceive();
      return;
    }
    Modal.confirm({
      title: `Confirm receive of ${tr?.display_number}`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical" size={4}>
          {!checked.length && !extras.length ? (
            <Text type="danger">No parcel is ticked: every parcel on this TR will be flagged missing.</Text>
          ) : null}
          {missingNow.length ? (
            <Text>
              The TR is received with <Text type="warning" strong>{missingNow.length}</Text> shipment(s) missing:{" "}
              {missingNow.map((i) => i.tracking_number).join(", ")}. They are marked missing on this TR and{" "}
              {tr?.from_branch?.name || "the sending branch"} is notified. Present parcels are received and sorted; resolve
              the missing ones later (Found / Lost).
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

  const titleNode = (<Space size={8} wrap>
          <InboxOutlined />
          <span>{tr ? (tr.can_receive ? `Receive ${tr.display_number}` : tr.display_number) : "Receive TR"}</span>
          {tr ? <TrStatusTag status={tr.status} missing={tr.missing_count} /> : null}
          {tr ? <SealTag c={tr} /> : null}
          {tr ? (
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {tr.from_branch?.name} → {tr.to_branch?.name}
            </Text>
          ) : null}
        </Space>
  );
  const extraNode = (<Space size={6}>
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
          {tr?.can_repair ? (
            <Button icon={<ToolOutlined />} onClick={() => setRepairOpen(true)}>
              Repair receive
            </Button>
          ) : null}
          {canReceive ? (
            <Button type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={confirmReceive}>
              Confirm receive ({checked.length + extras.length})
            </Button>
          ) : null}
        </Space>
  );
  const repairNode = tr?.can_repair ? (
    <RepairReceiveDialog
      tr={tr}
      open={repairOpen}
      params={params}
      onClose={() => setRepairOpen(false)}
      onRepaired={(res) => {
        setResult(null);
        load();
        onDone?.(res);
      }}
    />
  ) : null;
  const bodyNode = (
    <>
      {repairNode}
      {!activeId ? (
        <Space direction="vertical" size={10} style={{ width: "100%", padding: "24px 0" }}>
          <Text strong>Step 1: scan the TR bag label, or type the TR number</Text>
          <Input.Search
            ref={trCodeRef}
            size="large"
            prefix={<BarcodeOutlined />}
            placeholder="Scan the label or type the TR number, e.g. TR-000004 or 4"
            value={trCode}
            onChange={(e) => {
              setTrCode(e.target.value);
              if (lookupError) setLookupError("");
            }}
            onSearch={onLookup}
            enterButton="Open TR"
            loading={looking}
            status={lookupError ? "error" : undefined}
            allowClear
          />
          {lookupError ? <Alert type="error" showIcon style={{ padding: "4px 8px" }} message={lookupError} /> : null}
          <Text type="secondary" style={{ fontSize: 12 }}>
            Scanner or keyboard: 4, 000004, tr-4 and TR-000004 all work. Only TRs headed to your branch open here.
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
            <Descriptions.Item label="Sealed at dispatch">
              {tr.seal_number ? <Text strong>{tr.seal_number}</Text> : <Text type="secondary">None recorded</Text>}
            </Descriptions.Item>
            {tr.seal_status ? (
              <Descriptions.Item label="Seal check at receive" span={3}>
                {/* Each part is its own field: entered value, result, remark (only what was typed), who / when. */}
                <Space direction="vertical" size={2}>
                  <span>
                    Entered at receive:{" "}
                    {tr.seal_checked_value ? <Text strong>{tr.seal_checked_value}</Text> : <Text type="secondary">not typed</Text>}
                  </span>
                  <Space size={6}>
                    <span>Result:</span>
                    <Tag color={(SEAL_META[tr.seal_status] || ["default"])[0]} style={{ margin: 0 }}>
                      {SEAL_RESULT_LABEL[tr.seal_status] || tr.seal_status}
                    </Tag>
                  </Space>
                  {tr.seal_remark ? <span>Remark: {tr.seal_remark}</span> : null}
                  {tr.seal_checked_by_name || tr.seal_checked_at ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Checked by {tr.seal_checked_by_name || "-"}
                      {tr.seal_checked_at ? ` · ${fmtShort(tr.seal_checked_at)}` : ""}
                    </Text>
                  ) : null}
                </Space>
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
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Text>
                      Sealed at dispatch: <Text strong code>{sentSeal}</Text>
                    </Text>
                    <Radio.Group value={sealAnswer} onChange={(e) => setSealAnswer(e.target.value)}>
                      <Space direction="vertical" size={2}>
                        <Radio value="skip">
                          <Text strong>Not checked</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}> · receive without a seal result (default)</Text>
                        </Radio>
                        <Radio value="ok">
                          <Text strong>Seal intact</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}> · seal on the bag, unbroken, number {sentSeal}</Text>
                        </Radio>
                        <Radio value="tampered">
                          <Text strong>Seal broken or missing</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}> · seal cut / torn, bag opened, or no seal on the bag</Text>
                        </Radio>
                        <Radio value="mismatch">
                          <Text strong>Number mismatch</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}> · a seal is on the bag but its number is not {sentSeal}</Text>
                        </Radio>
                      </Space>
                    </Radio.Group>
                    {sealAnswer !== "skip" ? (
                    <Space size={6} wrap>
                      <Text style={{ fontSize: 12 }}>Entered at receive (optional):</Text>
                      <Input
                        prefix={<BarcodeOutlined />}
                        placeholder="Scan or type the number on the bag's seal"
                        autoComplete="off"
                        name="tr-seal-entered"
                        value={sealValue}
                        onChange={(e) => setSealValue(e.target.value)}
                        maxLength={50}
                        style={{ width: 300 }}
                        status={sealValue && sealState === "mismatch" ? "warning" : undefined}
                        allowClear
                      />
                    </Space>
                    ) : null}
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>No seal was recorded at dispatch: seal check skipped.</Text>
                )}
                {sealState && sealState !== "ok" ? (
                  <>
                    <Alert
                      type="error"
                      showIcon
                      style={{ padding: "4px 8px" }}
                      message={
                        sealState === "tampered"
                          ? "Seal broken or missing: the TR is flagged and the sending branch is notified. Receiving continues normally."
                          : `Number mismatch: sealed at dispatch ${sentSeal}, entered at receive ${sealValue.trim() || "(not typed)"}. The TR is flagged and the sending branch is notified. Receiving continues normally.`
                      }
                    />
                    <Input.TextArea
                      rows={1}
                      maxLength={500}
                      placeholder="Short remark (required): what is wrong with the seal / bag"
                      autoComplete="off"
                      value={sealRemark}
                      onChange={(e) => setSealRemark(e.target.value)}
                      status={!sealRemark.trim() ? (showErrors ? "error" : "warning") : undefined}
                    />
                    {showErrors && !sealRemark.trim() ? (
                      <Text type="danger" style={{ fontSize: 12 }}>A short remark is required when the seal is not intact.</Text>
                    ) : null}
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
                placeholder="Type or scan a tracking number, press Enter (or tick rows below)"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onPressEnter={onScan}
                allowClear
              />
              <Button onClick={onScan} disabled={!scan.trim()}>
                Tick
              </Button>
              <Button icon={<CheckSquareOutlined />} onClick={() => setChecked(openItems.map((i) => i.shipment_id))}>
                All parcels present
              </Button>
              <Button onClick={() => { setChecked([]); setExtras([]); }}>Clear</Button>
            </Space.Compact>
          ) : null}

          {canReceive ? (
            <Space size={6} wrap>
              <Badge status="success" text={`${checked.length} ticked`} />
              <Badge
                status={missingNow.length ? "warning" : "success"}
                text={missingNow.length ? `${missingNow.length} not ticked: marked missing on confirm` : "All parcels present"}
              />
              {extras.map((code) => (
                <Tag key={code} color="gold" closable onClose={() => setExtras((p) => p.filter((x) => x !== code))} style={{ margin: 0 }}>
                  Extra: {code}
                </Tag>
              ))}
            </Space>
          ) : null}

          {canReceive && showErrors && blockers.length ? (
            <Alert
              type="error"
              showIcon
              style={{ padding: "6px 10px" }}
              message="Cannot confirm yet"
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              }
            />
          ) : null}
          {canReceive && serverError ? (
            <Alert type="error" showIcon closable onClose={() => setServerError("")} style={{ padding: "6px 10px" }} message={serverError} />
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
              autoComplete="off"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          ) : null}
          {canReceive ? (
            <Space wrap style={{ justifyContent: "flex-end", width: "100%" }}>
              {blockers.length ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <WarningOutlined /> {blockers[0]}
                </Text>
              ) : null}
              <Button type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={confirmReceive}>
                Confirm receive ({checked.length + extras.length} of {openItems.length})
              </Button>
            </Space>
          ) : null}
        </Space>
      )}
    </>
  );

  if (inline) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 600 }}>{titleNode}</div>
          {extraNode}
        </div>
        {bodyNode}
      </div>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={860}
      destroyOnClose
      title={titleNode}
      extra={extraNode}
      styles={{ body: { padding: 12 } }}
    >
      {bodyNode}
    </Drawer>
  );
}
