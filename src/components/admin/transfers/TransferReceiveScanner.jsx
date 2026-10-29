"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Segmented,
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
  HomeOutlined,
  SwapOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { getContainer, lookupContainer, openTrPrint, receiveContainer, repairContainer, resolveContainerItem } from "@/services/admin/transferService";
import { vehicleLabel } from "@/components/admin/transfers/TransferDispatchModal";

const { Text } = Typography;

export const TR_STATUS_META = {
  open: { color: "default", label: "Open (loading)" },
  dispatched: { color: "processing", label: "Dispatched" },
  in_transit: { color: "processing", label: "In transit" },
  received: { color: "success", label: "Received" },
  partially_received: { color: "warning", label: "Received with discrepancies" },
  cancelled: { color: "error", label: "Cancelled" },
};

/** missing: number of shipments still missing on the TR */
export function TrStatusTag({ status, missing = 0 }) {
  const meta = TR_STATUS_META[status] || { color: "default", label: String(status || "-").replace(/_/g, " ") };
  const n = Number(missing) || 0;
  const label = status === "partially_received" && n > 0 ? `Received — ${n} missing` : meta.label;
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

const SEAL_RESULT_LABEL = { ok: "Intact", mismatch: "Mismatch", tampered: "Broken or missing" };

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

export function sealStatusFor(expected, value, answer) {
  if (!answer || answer === "skip") return null;
  if (answer === "tampered" || answer === false) return "tampered";
  if (answer === "mismatch") return "mismatch";
  const e = String(expected || "").trim().toLowerCase();
  const v = String(value || "").trim().toLowerCase();
  if (e && v && v !== e) return "mismatch";
  return "ok";
}

const SEAL_ANSWER_PARAM = { ok: "intact", tampered: "broken", mismatch: "mismatch" };

const ITEM_STATUS_META = {
  added: { color: "default", label: "Loaded" },
  sent: { color: "processing", label: "In transit" },
  dispatched: { color: "processing", label: "In transit" },
  in_transit: { color: "processing", label: "In transit" },
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
 * Admin "Repair receive" dialog
 */
function RepairReceiveDialog({ tr, open, onClose, onRepaired, params }) {
  const [clearSeal, setClearSeal] = useState(false);
  const [foundAll, setFoundAll] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setClearSeal(false);
    setFoundAll(false);
    setPreview(null);
    setError("");
  }, [open]);

  const runPreview = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await repairContainer(tr.id, clearSeal, foundAll, true, params);
      setPreview(res);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const applyRepair = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await repairContainer(tr.id, clearSeal, foundAll, false, params);
      message.success(res?.message || "Receive repaired");
      onRepaired?.(res);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Repair failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Repair receive · ${tr?.display_number || ""}`}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="preview" onClick={runPreview} loading={busy} disabled={!clearSeal && !foundAll}>
          Preview
        </Button>,
        <Button key="apply" type="primary" onClick={applyRepair} loading={busy} disabled={!preview || !preview.changes?.some((c) => c.action)}>
          Apply repair
        </Button>,
      ]}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="Use this when a TR was checked in with the wrong seal flag or missing parcels that actually arrived."
        />
        <Checkbox checked={clearSeal} onChange={(e) => { setClearSeal(e.target.checked); setPreview(null); }}>
          Clear seal check result
        </Checkbox>
        <Checkbox checked={foundAll} onChange={(e) => { setFoundAll(e.target.checked); setPreview(null); }}>
          Mark missing parcels as found & receive them now
        </Checkbox>
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {preview ? (
          <div style={{ marginTop: 8 }}>
            <Text strong>Proposed changes:</Text>
            <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
              {(preview.changes || []).map((c, i) => (
                <li key={i} style={{ color: c.action ? "#15803d" : "#64748b" }}>
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Space>
    </Modal>
  );
}

/**
 * Receive / inspection drawer for TR transfer containers.
 * Allows branch managers to inspect and triage shipments item by item:
 *  - Success / Intact (Received in good condition)
 *  - Damaged / Broken (Arrived damaged; records discrepancy and condition remarks)
 *  - Missing (Not found in container)
 * Also routes shipments automatically:
 *  - Last-Mile Delivery: for parcels terminating at this branch.
 *  - Onward Transfer: for parcels bound for another branch.
 */
export default function TransferReceiveScanner({
  containerId = null,
  open = true,
  onClose,
  onDone,
  branchId = null,
  inline = false,
}) {
  const [activeId, setActiveId] = useState(containerId);
  const [tr, setTr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trCode, setTrCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [scan, setScan] = useState("");
  const [checked, setChecked] = useState([]);
  const [damagedItems, setDamagedItems] = useState({}); // { [shipment_id]: { note: string } }
  const [extras, setExtras] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [result, setResult] = useState(null);
  const [repairOpen, setRepairOpen] = useState(false);
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'intact' | 'damaged' | 'missing'

  // Damage note dialog state
  const [damageDialog, setDamageDialog] = useState({ open: false, shipmentId: null, trackingNumber: "", note: "" });

  // Seal state
  const [sealValue, setSealValue] = useState("");
  const [sealAnswer, setSealAnswer] = useState("skip");
  const [sealRemark, setSealRemark] = useState("");
  const [serverError, setServerError] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const scanRef = useRef(null);
  const trCodeRef = useRef(null);

  useEffect(() => {
    setActiveId(containerId);
  }, [containerId]);

  const params = useMemo(() => (branchId ? { branch_id: branchId } : {}), [branchId]);

  const load = useCallback(async () => {
    if (!activeId) {
      setTr(null);
      return;
    }
    setLoading(true);
    try {
      const data = await getContainer(activeId, params);
      setTr(data);
      setServerError("");
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load TR");
    } finally {
      setLoading(false);
    }
  }, [activeId, params]);

  useEffect(() => {
    load();
  }, [load]);

  const onLookup = async () => {
    const raw = trCode.trim();
    if (!raw) return;
    setLooking(true);
    setLookupError("");
    try {
      const data = await lookupContainer(raw, params);
      setTr(data);
      setActiveId(data.id);
      if (!data.can_receive && !data.can_resolve) {
        message.info(`${data.display_number} is ${TR_STATUS_META[data.status]?.label || data.status}.`);
      }
    } catch (e) {
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

  // Auto-tick all open items on initial open (1-click receive ready)
  const autoTickedFor = useRef(null);
  useEffect(() => {
    if (!canReceive || !tr?.id || autoTickedFor.current === tr.id) return;
    autoTickedFor.current = tr.id;
    setChecked(openItems.map((i) => i.shipment_id));
    setDamagedItems({});
  }, [canReceive, tr?.id, openItems]);

  const missingNow = useMemo(
    () => openItems.filter((i) => !checked.includes(i.shipment_id)),
    [openItems, checked]
  );

  const damagedNow = useMemo(
    () => openItems.filter((i) => checked.includes(i.shipment_id) && !!damagedItems[i.shipment_id]),
    [openItems, checked, damagedItems]
  );

  const intactNow = useMemo(
    () => openItems.filter((i) => checked.includes(i.shipment_id) && !damagedItems[i.shipment_id]),
    [openItems, checked, damagedItems]
  );

  const sentSeal = String(tr?.seal_number || "").trim();
  const sealState = sentSeal ? sealStatusFor(sentSeal, sealValue, sealAnswer) : null;
  const blockers = [];
  if (canReceive && sealState && sealState !== "ok" && !sealRemark.trim()) {
    blockers.push(
      sealState === "tampered"
        ? "Step 2: add a short remark about the broken / missing seal."
        : "Step 2: add a short remark about the seal number mismatch."
    );
  }

  // Barcode Scan Handler: marks item as intact received
  const onScan = () => {
    const code = scan.trim();
    if (!code) return;
    setScan("");
    const hit = items.find(
      (i) => String(i.tracking_number || "").toLowerCase() === code.toLowerCase() || String(i.shipment_id) === code
    );
    if (hit && OPEN_ITEM.includes(hit.status)) {
      if (checked.includes(hit.shipment_id)) {
        // If it was damaged or ticked, reaffirm intact
        if (damagedItems[hit.shipment_id]) {
          setDamagedItems((prev) => {
            const next = { ...prev };
            delete next[hit.shipment_id];
            return next;
          });
          message.success(`${hit.tracking_number} restored to Intact ✓`);
        } else {
          message.info(`${hit.tracking_number} already verified intact ✓`);
        }
      } else {
        setChecked((p) => [...p, hit.shipment_id]);
        message.success(`${hit.tracking_number} verified ✓`);
      }
      return;
    }
    if (hit) {
      message.info(`${hit.tracking_number}: ${ITEM_STATUS_META[hit.status]?.label || hit.status}`);
      return;
    }
    if (extras.some((x) => x.toLowerCase() === code.toLowerCase())) return;
    setExtras((p) => [...p, code]);
    message.warning(`${code} is not on this TR. Added as extra parcel; checked on confirm.`);
  };

  const setItemTriage = (shipmentId, status, note = "") => {
    if (status === "intact") {
      if (!checked.includes(shipmentId)) setChecked((p) => [...p, shipmentId]);
      setDamagedItems((p) => {
        const next = { ...p };
        delete next[shipmentId];
        return next;
      });
    } else if (status === "damaged") {
      if (!checked.includes(shipmentId)) setChecked((p) => [...p, shipmentId]);
      setDamagedItems((p) => ({ ...p, [shipmentId]: { note: note || "Package damaged on arrival" } }));
    } else if (status === "missing") {
      setChecked((p) => p.filter((id) => id !== shipmentId));
      setDamagedItems((p) => {
        const next = { ...p };
        delete next[shipmentId];
        return next;
      });
    }
  };

  const markAllIntact = () => {
    setChecked(openItems.map((i) => i.shipment_id));
    setDamagedItems({});
    message.success("All parcels marked Intact / Good Condition ✓");
  };

  const markAllMissing = () => {
    setChecked([]);
    setDamagedItems({});
    message.warning("All parcels cleared and marked Missing.");
  };

  const openDamageNoteDialog = (item) => {
    setDamageDialog({
      open: true,
      shipmentId: item.shipment_id,
      trackingNumber: item.tracking_number || `#${item.shipment_id}`,
      note: damagedItems[item.shipment_id]?.note || "Outer packaging crushed / torn",
    });
  };

  const saveDamageNote = () => {
    if (damageDialog.shipmentId) {
      setItemTriage(damageDialog.shipmentId, "damaged", damageDialog.note);
      message.warning(`Marked ${damageDialog.trackingNumber} as Damaged.`);
    }
    setDamageDialog({ open: false, shipmentId: null, trackingNumber: "", note: "" });
  };

  const doReceive = async () => {
    setSaving(true);
    try {
      setServerError("");
      const seal = sealState
        ? { value: sealValue.trim(), intact: sealState !== "tampered", remark: sealRemark.trim(), status: SEAL_ANSWER_PARAM[sealState] }
        : null;

      // Prepare damaged items payload: array of { shipment_id, note }
      const damagedPayload = Object.entries(damagedItems).map(([id, d]) => ({
        shipment_id: Number(id),
        note: d.note || "Damaged condition on arrival",
      }));

      // Scanned includes all physically present parcels (both intact and damaged)
      const scannedPayload = [...checked, ...extras];

      const res = await receiveContainer(activeId, scannedPayload, remarks, params, seal, damagedPayload);
      setResult(res);
      setTr((prev) => ({
        ...(res?.container || prev),
        can_receive: false,
        can_resolve: res?.container?.status === "partially_received",
      }));
      message.success(res?.message || "TR transfer successfully received and sorted!");
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

    if (!missingNow.length && !damagedNow.length && !extras.length) {
      doReceive();
      return;
    }

    Modal.confirm({
      title: `Confirm Arrival & Triage for ${tr?.display_number}`,
      icon: <ExclamationCircleOutlined />,
      width: 540,
      content: (
        <Space direction="vertical" size={6} style={{ width: "100%", marginTop: 8 }}>
          <div style={{ display: "flex", gap: 10, padding: 8, background: "#f8fafc", borderRadius: 6 }}>
            <Tag color="green" style={{ margin: 0, fontWeight: 700 }}>{intactNow.length} Intact</Tag>
            <Tag color="red" style={{ margin: 0, fontWeight: 700 }}>{damagedNow.length} Damaged</Tag>
            <Tag color="orange" style={{ margin: 0, fontWeight: 700 }}>{missingNow.length} Missing</Tag>
            {extras.length ? <Tag color="gold" style={{ margin: 0 }}>{extras.length} Extras</Tag> : null}
          </div>

          {!checked.length && !extras.length ? (
            <Text type="danger" strong>
              No parcel is checked: every parcel on this TR will be marked missing!
            </Text>
          ) : null}

          {damagedNow.length ? (
            <Alert
              type="warning"
              showIcon
              style={{ padding: "6px 10px" }}
              message={
                <span>
                  <strong>{damagedNow.length} parcel(s) arrived damaged:</strong> {damagedNow.map((i) => i.tracking_number).join(", ")}. These will be received into hub custody and flagged for claim inspection.
                </span>
              }
            />
          ) : null}

          {missingNow.length ? (
            <Alert
              type="error"
              showIcon
              style={{ padding: "6px 10px" }}
              message={
                <span>
                  <strong>{missingNow.length} parcel(s) not found:</strong> {missingNow.map((i) => i.tracking_number).join(", ")}. Marked missing; sending hub ({tr?.from_branch?.name || "origin"}) will be notified immediately.
                </span>
              }
            />
          ) : null}

          <Text type="secondary" style={{ fontSize: 12 }}>
            Upon confirmation, terminating parcels will be sorted for local doorstep riders, and onward parcels staged for the next hub leg automatically.
          </Text>
        </Space>
      ),
      okText: "Confirm Intake & Sorting",
      okButtonProps: { style: { fontWeight: 600 } },
      onOk: doReceive,
    });
  };

  const resolve = async (item, action) => {
    setResolving(`${item.item_id}:${action}`);
    try {
      const res = await resolveContainerItem(activeId, item.item_id, action, null, params);
      if (res?.container) {
        setTr((prev) => ({ ...prev, ...res.container, can_resolve: res.container.status === "partially_received" }));
      }
      message.success(action === "found" ? `${item.tracking_number} received and sorted` : `${item.tracking_number} marked lost`);
      onDone?.(res);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to update parcel");
    } finally {
      setResolving(null);
    }
  };

  // Filtered item list for table
  const displayedItems = useMemo(() => {
    const raw = items.filter((i) => !["cancelled"].includes(i.status));
    if (!canReceive || filterMode === "all") return raw;
    if (filterMode === "intact") {
      return raw.filter((i) => checked.includes(i.shipment_id) && !damagedItems[i.shipment_id]);
    }
    if (filterMode === "damaged") {
      return raw.filter((i) => checked.includes(i.shipment_id) && !!damagedItems[i.shipment_id]);
    }
    if (filterMode === "missing") {
      return raw.filter((i) => !checked.includes(i.shipment_id));
    }
    return raw;
  }, [items, canReceive, filterMode, checked, damagedItems]);

  const columns = [
    {
      title: "Parcel",
      key: "parcel",
      render: (_, i) => (
        <Space direction="vertical" size={1}>
          <Text strong style={{ fontSize: 12.5 }}>{i.tracking_number || `#${i.shipment_id}`}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{i.receiver_name || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>Weight: {Number(i.weight || 0).toFixed(2)} kg</Text>
        </Space>
      ),
    },
    {
      title: "Sorting Destination",
      key: "final",
      width: 190,
      render: (_, i) =>
        i.is_final_here ? (
          <Tooltip title="Terminating at this branch: routed for doorstep delivery rider">
            <Tag color="green" icon={<HomeOutlined />} style={{ margin: 0, fontWeight: 600 }}>
              Last-Mile (Local)
            </Tag>
          </Tooltip>
        ) : (
          <Tooltip title={`Passing through: routes to next transit leg toward ${i.destination_name || "destination"}`}>
            <Tag color="purple" icon={<SwapOutlined />} style={{ margin: 0, fontWeight: 600 }}>
              → {i.destination_name || "Onward"}
            </Tag>
          </Tooltip>
        ),
    },
    canReceive
      ? {
          title: "Physical Inspection / Triage",
          key: "triage",
          width: 270,
          render: (_, i) => {
            if (!OPEN_ITEM.includes(i.status)) {
              return <Tag color={(ITEM_STATUS_META[i.status] || { color: "default" }).color}>{i.status}</Tag>;
            }
            const isMissing = !checked.includes(i.shipment_id);
            const isDamaged = checked.includes(i.shipment_id) && !!damagedItems[i.shipment_id];
            const isIntact = checked.includes(i.shipment_id) && !isDamaged;
            const currentTriage = isDamaged ? "damaged" : isIntact ? "intact" : "missing";

            return (
              <Space direction="vertical" size={3}>
                <Segmented
                  size="small"
                  value={currentTriage}
                  onChange={(val) => {
                    if (val === "damaged") {
                      openDamageNoteDialog(i);
                    } else {
                      setItemTriage(i.shipment_id, val);
                    }
                  }}
                  options={[
                    {
                      value: "intact",
                      label: (
                        <span style={{ color: isIntact ? "#16a34a" : undefined, fontWeight: isIntact ? 700 : 500 }}>
                          ✓ Intact
                        </span>
                      ),
                    },
                    {
                      value: "damaged",
                      label: (
                        <span style={{ color: isDamaged ? "#dc2626" : undefined, fontWeight: isDamaged ? 700 : 500 }}>
                          ⚠️ Damaged
                        </span>
                      ),
                    },
                    {
                      value: "missing",
                      label: (
                        <span style={{ color: isMissing ? "#d97706" : undefined, fontWeight: isMissing ? 700 : 500 }}>
                          ✕ Missing
                        </span>
                      ),
                    },
                  ]}
                />
                {isDamaged && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Tag color="error" style={{ margin: 0, fontSize: 10, maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {damagedItems[i.shipment_id]?.note || "Damaged condition"}
                    </Tag>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined style={{ fontSize: 11 }} />}
                      onClick={() => openDamageNoteDialog(i)}
                    />
                  </div>
                )}
              </Space>
            );
          },
        }
      : {
          title: "Status",
          key: "status",
          width: 140,
          render: (_, i) => {
            const meta = ITEM_STATUS_META[i.status] || { color: "default", label: i.status };
            return (
              <Space size={4}>
                <Tag color={meta.color}>{meta.label}</Tag>
                {i.discrepancy === "damaged" && <Tag color="red">Damaged</Tag>}
                {i.is_extra && <Tag color="gold">Extra</Tag>}
              </Space>
            );
          },
        },
    {
      title: "Transport",
      key: "transport",
      align: "center",
      width: 110,
      render: () => (
        <Tooltip title="Line-haul and fleet costs are 100% centrally managed and settled by SuperAdmin / HQ. Zero branch deduction.">
          <Tag color="cyan" style={{ margin: 0, fontSize: 10.5, fontWeight: 600 }}>
            HQ Funded
          </Tag>
        </Tooltip>
      ),
    },
    tr?.can_resolve
      ? {
          title: "Resolve",
          key: "resolve",
          width: 130,
          render: (_, i) =>
            i.status === "missing" ? (
              <Space size={4}>
                <Button size="small" type="primary" ghost loading={resolving === `${i.item_id}:found`} onClick={() => resolve(i, "found")}>
                  Found
                </Button>
                <Popconfirm
                  title={`Mark ${i.tracking_number} lost?`}
                  description="The sending branch will be notified. This parcel will be marked lost."
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

  const titleNode = (
    <Space size={8} wrap align="center">
      <InboxOutlined style={{ fontSize: 18, color: "#16a34a" }} />
      <span style={{ fontWeight: 700 }}>
        {tr ? (tr.can_receive ? `Receive & Inspect ${tr.display_number}` : tr.display_number) : "Receive TR"}
      </span>
      {tr ? <TrStatusTag status={tr.status} missing={tr.missing_count} /> : null}
      {tr ? <SealTag c={tr} /> : null}
      {tr ? (
        <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
          {tr.from_branch?.name} → <strong>{tr.to_branch?.name}</strong>
        </Text>
      ) : null}
    </Space>
  );

  const extraNode = (
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
      {tr?.can_repair ? (
        <Button icon={<ToolOutlined />} onClick={() => setRepairOpen(true)}>
          Repair receive
        </Button>
      ) : null}
      {canReceive ? (
        <Button type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={confirmReceive} style={{ fontWeight: 600 }}>
          Confirm Intake ({checked.length + extras.length})
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
          <Text strong>Step 1: Scan the TR bag label or type the TR number</Text>
          <Input.Search
            ref={trCodeRef}
            size="large"
            prefix={<BarcodeOutlined />}
            placeholder="Scan barcode or type TR number, e.g. TR-KATHM-000004 or 4"
            value={trCode}
            onChange={(e) => {
              setTrCode(e.target.value);
              if (lookupError) setLookupError("");
            }}
            onSearch={onLookup}
            enterButton="Open Transfer"
            loading={looking}
            status={lookupError ? "error" : undefined}
            allowClear
          />
          {lookupError ? <Alert type="error" showIcon style={{ padding: "4px 8px" }} message={lookupError} /> : null}
          <Text type="secondary" style={{ fontSize: 12 }}>
            Accepts full TR tags (TR-KATHM-000004) or short numeric suffixes (4). Only transfers headed to your branch can be checked in.
          </Text>
        </Space>
      ) : loading && !tr ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : !tr ? (
        <Empty description="Transfer container not found" />
      ) : (
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          {/* Transfer Info Header */}
          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
            <Descriptions.Item label="Carrier Vehicle">
              {[vehicleLabel(tr.vehicle_type), tr.vehicle_number].filter(Boolean).join(" · ") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Assigned Rider / Driver">
              {tr.rider?.name || tr.driver_name || "-"}
              {tr.rider?.phone || tr.driver_phone ? ` · ${tr.rider?.phone || tr.driver_phone}` : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Fleet Financing">
              <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>100% HQ Financed (Rs 0 branch cost)</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Dispatched">{fmt(tr.dispatched_at)}</Descriptions.Item>
            <Descriptions.Item label="Received">{fmt(tr.received_at)}</Descriptions.Item>
            <Descriptions.Item label="Security Seal">
              {tr.seal_number ? <Text strong code>{tr.seal_number}</Text> : <Text type="secondary">None recorded</Text>}
            </Descriptions.Item>
            {tr.seal_status ? (
              <Descriptions.Item label="Seal check at receive" span={3}>
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

          {/* Seal Verification Step */}
          {canReceive ? (
            <div style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 8, padding: 10 }}>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space size={6}>
                  <SafetyCertificateOutlined style={{ color: "#2563eb" }} />
                  <Text strong>Seal Verification</Text>
                  {sealState ? <Tag color={SEAL_META[sealState][0]} style={{ margin: 0 }}>{SEAL_META[sealState][1]}</Tag> : null}
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
                          <Text type="secondary" style={{ fontSize: 12 }}> · Proceed without seal inspection</Text>
                        </Radio>
                        <Radio value="ok">
                          <Text strong>Seal intact</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}> · Seal on container is intact with matching number ({sentSeal})</Text>
                        </Radio>
                        <Radio value="tampered">
                          <Text strong>Seal broken or missing</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}> · Seal cut, missing, or bag open</Text>
                        </Radio>
                        <Radio value="mismatch">
                          <Text strong>Number mismatch</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}> · Seal present but number does not match {sentSeal}</Text>
                        </Radio>
                      </Space>
                    </Radio.Group>
                    {sealAnswer !== "skip" ? (
                      <Space size={6} wrap>
                        <Text style={{ fontSize: 12 }}>Entered at receive (optional):</Text>
                        <Input
                          prefix={<BarcodeOutlined />}
                          placeholder="Scan or type seal code"
                          autoComplete="off"
                          value={sealValue}
                          onChange={(e) => setSealValue(e.target.value)}
                          maxLength={50}
                          style={{ width: 260 }}
                          status={sealValue && sealState === "mismatch" ? "warning" : undefined}
                          allowClear
                        />
                      </Space>
                    ) : null}
                  </Space>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>No security seal recorded at dispatch.</Text>
                )}
                {sealState && sealState !== "ok" ? (
                  <>
                    <Alert
                      type="error"
                      showIcon
                      style={{ padding: "4px 8px" }}
                      message={
                        sealState === "tampered"
                          ? "Seal broken or missing: discrepancy logged and sending hub will be alerted. Inspection continues."
                          : `Number mismatch: dispatch sealed ${sentSeal}, entered ${sealValue.trim() || "(none)"}. Discrepancy logged.`
                      }
                    />
                    <Input.TextArea
                      rows={1}
                      maxLength={500}
                      placeholder="Short remark (required): what was observed with the seal / container bag"
                      value={sealRemark}
                      onChange={(e) => setSealRemark(e.target.value)}
                      status={!sealRemark.trim() ? (showErrors ? "error" : "warning") : undefined}
                    />
                  </>
                ) : null}
              </Space>
            </div>
          ) : null}

          {/* Metric Statistics */}
          <Space size={20} wrap style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <Statistic title="Expected Manifest" value={tr.expected_count} valueStyle={{ fontSize: 16 }} />
            <Statistic title="Received Intact" value={canReceive ? intactNow.length : tr.received_count} valueStyle={{ fontSize: 16, color: "#16a34a" }} />
            <Statistic title="Damaged / Broken" value={canReceive ? damagedNow.length : 0} valueStyle={{ fontSize: 16, color: damagedNow.length ? "#dc2626" : "#64748b" }} />
            <Statistic title="Missing" value={canReceive ? missingNow.length : tr.missing_count} valueStyle={{ fontSize: 16, color: missingNow.length ? "#d97706" : "#64748b" }} />
            <Statistic title="Last-Mile Delivery" value={tr.last_mile_count} valueStyle={{ fontSize: 16, color: "#2563eb" }} />
            <Statistic title="Onward Transfer" value={tr.onward_count} valueStyle={{ fontSize: 16, color: "#9333ea" }} />
          </Space>

          {/* Scanner & Quick Triage Controls */}
          {canReceive ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  ref={scanRef}
                  prefix={<BarcodeOutlined style={{ color: "#2563eb" }} />}
                  placeholder="Scan or type parcel tracking number and press Enter to mark intact..."
                  value={scan}
                  onChange={(e) => setScan(e.target.value)}
                  onPressEnter={onScan}
                  allowClear
                />
                <Button type="primary" onClick={onScan} disabled={!scan.trim()}>
                  Verify ✓
                </Button>
                <Button icon={<CheckSquareOutlined />} onClick={markAllIntact}>
                  Mark All Intact
                </Button>
                <Button onClick={markAllMissing}>Clear All</Button>
              </Space.Compact>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <Segmented
                  size="small"
                  value={filterMode}
                  onChange={setFilterMode}
                  options={[
                    { value: "all", label: `All Parcels (${openItems.length})` },
                    { value: "intact", label: `✓ Intact (${intactNow.length})` },
                    { value: "damaged", label: `⚠️ Damaged (${damagedNow.length})` },
                    { value: "missing", label: `✕ Missing (${missingNow.length})` },
                  ]}
                />
                <Space size={6}>
                  <Badge status="success" text={`${intactNow.length} intact`} />
                  {damagedNow.length ? <Badge status="error" text={`${damagedNow.length} damaged`} /> : null}
                  {missingNow.length ? <Badge status="warning" text={`${missingNow.length} missing`} /> : null}
                  {extras.map((code) => (
                    <Tag key={code} color="gold" closable onClose={() => setExtras((p) => p.filter((x) => x !== code))} style={{ margin: 0 }}>
                      Extra: {code}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          ) : null}

          {/* Alerts / Error Notices */}
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

          {/* Post-Intake Completion Summary */}
          {result ? (
            <Alert
              type={result.missing?.length || result.damaged?.length ? "warning" : "success"}
              showIcon
              message={<span style={{ fontWeight: 700 }}>{result.message || "TR Checked In Successfully"}</span>}
              description={
                <Space direction="vertical" size={4} style={{ fontSize: 12.5, marginTop: 4 }}>
                  <div style={{ color: "#15803d", display: "flex", alignItems: "center", gap: 6 }}>
                    <HomeOutlined />
                    <strong>{lastMile.length} parcel(s) sorted for Last-Mile Doorstep Delivery:</strong> moved to local rider delivery queue.
                  </div>
                  <div style={{ color: "#7e22ce", display: "flex", alignItems: "center", gap: 6 }}>
                    <SwapOutlined />
                    <strong>{onward.length} parcel(s) sorted for Onward Hub Transfer:</strong> staged for outbound transfer manifests
                    {Object.keys(onwardByHop).length ? ` (${Object.entries(onwardByHop).map(([k, v]) => `${v} → ${k}`).join(", ")})` : ""}.
                  </div>
                  {result.damaged?.length ? (
                    <div style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
                      <WarningOutlined />
                      <strong>{result.damaged.length} parcel(s) flagged DAMAGED:</strong> condition logged in audit timeline; sending hub notified.
                    </div>
                  ) : null}
                  {result.missing?.length ? (
                    <div style={{ color: "#d97706", display: "flex", alignItems: "center", gap: 6 }}>
                      <WarningOutlined />
                      <strong>{result.missing.length} parcel(s) MISSING:</strong> sending branch notified. Resolve below once located.
                    </div>
                  ) : null}
                  {result.extras?.length ? (
                    <div style={{ color: "#b45309" }}>
                      <strong>{result.extras.length} extra parcel(s) accepted into hub inventory.</strong>
                    </div>
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
              message={`${missingItems.length} parcel(s) missing on this TR. Mark Found when received, or Lost.`}
            />
          ) : null}

          {/* Manifest Shipments Table */}
          <Table
            size="small"
            rowKey="item_id"
            loading={loading}
            dataSource={displayedItems}
            columns={columns}
            pagination={displayedItems.length > 30 ? { pageSize: 30, size: "small" } : false}
            scroll={{ x: 680 }}
          />

          {canReceive ? (
            <Input.TextArea
              rows={1}
              maxLength={500}
              placeholder="Intake remarks (optional, e.g. all 12 boxes checked, container seal intact)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          ) : null}

          {canReceive ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {missingNow.length ? `${missingNow.length} unticked parcels will be flagged missing.` : "All parcels checked."}
              </Text>
              <Button type="primary" size="large" icon={<CheckCircleOutlined />} loading={saving} onClick={confirmReceive} style={{ fontWeight: 700 }}>
                Confirm Intake & Auto-Sort ({checked.length + extras.length} of {openItems.length})
              </Button>
            </div>
          ) : null}
        </Space>
      )}

      {/* Damage Note Modal */}
      <Modal
        open={damageDialog.open}
        title={`Report Damage: ${damageDialog.trackingNumber}`}
        onCancel={() => setDamageDialog({ open: false, shipmentId: null, trackingNumber: "", note: "" })}
        onOk={saveDamageNote}
        okText="Record as Damaged"
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          <Alert
            type="warning"
            showIcon
            message="Damaged parcel will be accepted into hub inventory with condition flag, and the sending branch will be notified."
          />
          <Text strong>Quick Presets:</Text>
          <Space wrap size={4}>
            {[
              "Outer packaging crushed / torn",
              "Security seal broken / opened",
              "Item broken / physical impact",
              "Wet / liquid spill leakage",
              "Defective / damaged box",
            ].map((p) => (
              <Tag
                key={p}
                style={{ cursor: "pointer", margin: 2 }}
                onClick={() => setDamageDialog((d) => ({ ...d, note: p }))}
              >
                {p}
              </Tag>
            ))}
          </Space>
          <Text strong style={{ marginTop: 6, display: "block" }}>Damage Description / Note:</Text>
          <Input.TextArea
            rows={2}
            maxLength={255}
            value={damageDialog.note}
            onChange={(e) => setDamageDialog((d) => ({ ...d, note: e.target.value }))}
            placeholder="Describe the condition or visible defects..."
          />
        </Space>
      </Modal>
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
      width={900}
      destroyOnClose
      title={titleNode}
      extra={extraNode}
      styles={{ body: { padding: 14 } }}
    >
      {bodyNode}
    </Drawer>
  );
}
