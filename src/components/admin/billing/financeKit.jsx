"use client";

import { Empty, Progress, Tag, Tooltip } from "antd";

/**
 * Shared helpers for finance pages (invoices, delivery charges, marketplace bills,
 * settlements, HQ commissions). Money is shown as "Rs 1,234.50"; dates in Nepal time.
 */

const TZ = "Asia/Kathmandu";

const rsFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatRs(value, { blankZero = false } = {}) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || Number.isNaN(n)) return "-";
  if (blankZero && n === 0) return "-";
  return `Rs ${rsFormatter.format(n)}`;
}

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseDate(value) {
  if (!value) return null;
  // "YYYY-MM-DD" alone is a calendar date: show it as-is, no zone shift.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return { calendar: new Date(Date.UTC(y, m - 1, d)) };
  }
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)
    ? value.replace(" ", "T") + "+05:45"
    : value;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : { instant: d };
}

export function formatDate(value) {
  const p = parseDate(value);
  if (!p) return "-";
  if (p.calendar) {
    return p.calendar.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  }
  return p.instant.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });
}

export function formatDateTime(value) {
  const p = parseDate(value);
  if (!p) return "-";
  if (p.calendar) return formatDate(value);
  return p.instant.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  });
}

/** "YYYY-MM-DD" of today in Nepal time. */
export function todayNpt() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

const STATUS_STYLES = {
  draft: { color: "default", label: "Draft" },
  ready: { color: "geekblue", label: "Ready" },
  sent: { color: "blue", label: "Sent, awaiting payment" },
  unpaid: { color: "orange", label: "Unpaid" },
  pending: { color: "orange", label: "Pending" },
  processing: { color: "processing", label: "Processing" },
  approved: { color: "cyan", label: "Approved" },
  reopened: { color: "volcano", label: "Not received" },
  partially_paid: { color: "gold", label: "Partially paid" },
  recorded: { color: "green", label: "Recorded" },
  reversed: { color: "red", label: "Reversed" },
  paid: { color: "green", label: "Paid" },
  completed: { color: "green", label: "Completed" },
  settled: { color: "green", label: "Settled" },
  cancelled: { color: "default", label: "Cancelled" },
  canceled: { color: "default", label: "Cancelled" },
  failed: { color: "red", label: "Failed" },
  rejected: { color: "red", label: "Rejected" },
  overdue: { color: "red", label: "Overdue" },
  pending_verification: { color: "orange", label: "Waiting for branch check" },
  awaiting_gateway: { color: "processing", label: "HamroPay in progress" },
  verified: { color: "green", label: "Verified" },
  queued: { color: "processing", label: "Queued / retrying" },
  delivered: { color: "green", label: "Delivered" },
  skipped: { color: "default", label: "Not sent" },
};

/** Who / what recorded a payment row. */
const SOURCE_STYLES = {
  notice_verified: { color: "cyan", label: "Verified notice" },
  hamropay: { color: "purple", label: "HamroPay" },
  branch: { color: "blue", label: "Branch" },
  admin: { color: "geekblue", label: "HQ" },
  marketplace_api: { color: "magenta", label: "Marketplace API (old)" },
  marketplace_portal: { color: "magenta", label: "Marketplace" },
  merchant_portal: { color: "gold", label: "Store portal" },
};

export function SourceTag({ source }) {
  const key = String(source || "").toLowerCase();
  const s = SOURCE_STYLES[key] || { color: "default", label: key ? key.replace(/_/g, " ") : "-" };
  return (
    <Tag color={s.color} style={{ marginInlineEnd: 0 }}>
      {s.label}
    </Tag>
  );
}

export function StatusTag({ status, label, tooltip }) {
  const key = String(status || "").toLowerCase();
  const s = STATUS_STYLES[key] || { color: "default", label: key ? key.replace(/_/g, " ") : "-" };
  const tag = (
    <Tag color={s.color} style={{ marginInlineEnd: 0, textTransform: s.label === key ? "capitalize" : undefined }}>
      {label || s.label}
    </Tag>
  );
  return tooltip ? <Tooltip title={tooltip}>{tag}</Tooltip> : tag;
}

export function PayerTag({ type }) {
  const t = String(type || "merchant").toLowerCase();
  return t === "company" ? <Tag color="purple">Marketplace</Tag> : <Tag>Store</Tag>;
}

export function apiError(e, fallback = "Something went wrong") {
  const d = e?.response?.data;
  if (d?.errors && typeof d.errors === "object") {
    const first = Object.values(d.errors).flat()[0];
    if (first) return String(first);
  }
  return d?.message || e?.message || fallback;
}

export function unwrap(r) {
  return r?.data?.data ?? r?.data ?? r;
}

export function EmptyState({ title, hint }) {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span>
          <strong>{title}</strong>
          {hint ? (
            <>
              <br />
              <span style={{ color: "#8c8c8c" }}>{hint}</span>
            </>
          ) : null}
        </span>
      }
    />
  );
}

export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "hamropay", label: "HamroPay" },
  { value: "esewa", label: "eSewa" },
  { value: "khalti", label: "Khalti" },
  { value: "connectips", label: "ConnectIPS" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

export function methodLabel(v) {
  const m = PAYMENT_METHODS.find((x) => x.value === v);
  return m ? m.label : v ? String(v).replace(/_/g, " ") : "-";
}

/** Normalise a branches list response (paginated or plain). */
export function branchList(res) {
  const d = unwrap(res);
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.branches)) return d.branches;
  return [];
}

/**
 * Paid / total progress for a bill that can be paid in parts.
 * compact: one-line bar for tables; otherwise bar + numbers.
 */
export function PaymentProgress({ total, paid, outstanding, compact = false }) {
  const t = toNumber(total);
  const p = toNumber(paid);
  const o = outstanding === undefined || outstanding === null ? Math.max(0, t - p) : toNumber(outstanding);
  const pct = t > 0 ? Math.min(100, Math.round((p / t) * 1000) / 10) : 0;
  const status = pct >= 100 ? "success" : "active";
  if (compact) {
    return (
      <Tooltip title={`Paid ${formatRs(p)} of ${formatRs(t)} · Outstanding ${formatRs(o)}`}>
        <div style={{ minWidth: 120 }}>
          <Progress percent={pct} size="small" status={status} showInfo={false} strokeColor={pct >= 100 ? "#52c41a" : "#faad14"} />
          <div style={{ fontSize: 12, color: "#8c8c8c", lineHeight: 1.2 }}>
            {pct >= 100 ? "Fully paid" : `${pct}% paid · ${formatRs(o)} due`}
          </div>
        </div>
      </Tooltip>
    );
  }
  return (
    <div>
      <Progress percent={pct} status={status} strokeColor={pct >= 100 ? "#52c41a" : "#faad14"} />
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
        <span>
          Total <strong>{formatRs(t)}</strong>
        </span>
        <span>
          Paid <strong style={{ color: "#389e0d" }}>{formatRs(p)}</strong>
        </span>
        <span>
          Outstanding <strong style={{ color: o > 0 ? "#d46b08" : undefined }}>{formatRs(o)}</strong>
        </span>
      </div>
    </div>
  );
}

/** Random id for a form submit, so a double click never records a payment twice. */
export function newRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
