"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Avatar, Button, Card, Col, Input, Row,
  Select, Space, Table, Tag, Typography, message,
} from "antd";
import { useRouter } from "next/navigation";
import {
  CheckCircleOutlined, ClockCircleOutlined, EyeOutlined,
  InfoCircleOutlined, ReloadOutlined, SearchOutlined,
  ShopOutlined, StopOutlined, SyncOutlined,
} from "@ant-design/icons";
import { getMerchantApplications } from "@/services/merchantRegistrationService";

const { Text } = Typography;

const STATUS_CFG = {
  active:               { bg: "#f0fdf4", text: "#15803d", label: "Active",               icon: <CheckCircleOutlined /> },
  approved:             { bg: "#f0fdf4", text: "#15803d", label: "Approved",             icon: <CheckCircleOutlined /> },
  rejected:             { bg: "#fef2f2", text: "#b91c1c", label: "Rejected",             icon: <StopOutlined /> },
  pending:              { bg: "#eff6ff", text: "#1d4ed8", label: "Pending",              icon: <ClockCircleOutlined /> },
  onboarding:           { bg: "#eff6ff", text: "#1d4ed8", label: "Onboarding",          icon: <SyncOutlined spin /> },
  pending_verification: { bg: "#faf5ff", text: "#7c3aed", label: "Pending Verification", icon: <ClockCircleOutlined /> },
  under_review:         { bg: "#ecfeff", text: "#0e7490", label: "Under Review",         icon: <SyncOutlined spin /> },
  more_info_required:   { bg: "#fff7ed", text: "#c2410c", label: "Info Required",        icon: <InfoCircleOutlined /> },
};

function StatusPill({ status }) {
  const norm = String(status || "").toLowerCase();
  const cfg  = STATUS_CFG[norm] || { bg: "#f3f4f6", text: "#374151", label: status || "—", icon: null };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.text, whiteSpace: "nowrap",
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

const AVATAR_COLORS = ["#6366f1","#0891b2","#059669","#d97706","#dc2626","#7c3aed"];
function initials(name = "") {
  return (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function avatarBg(name = "") {
  return AVATAR_COLORS[(name || "").charCodeAt(0) % AVATAR_COLORS.length];
}

const STAT_STRIP = [
  { key: undefined,              label: "All",          color: "#6366f1" },
  { key: "onboarding",           label: "Onboarding",   color: "#3b82f6" },
  { key: "pending_verification", label: "Pending",      color: "#7c3aed" },
  { key: "more_info_required",   label: "Info Needed",  color: "#f59e0b" },
  { key: "active",               label: "Approved",     color: "#22c55e" },
  { key: "rejected",             label: "Rejected",     color: "#ef4444" },
];

export default function MerchantApplicationsPage() {
  const router = useRouter();

  const [data, setData]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [counts, setCounts]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters]   = useState({ q: "", status: undefined });

  const load = useCallback(async (pg, ps, f) => {
    try {
      setLoading(true);
      const params = { page: pg, per_page: ps };
      if (f.q)      params.q      = f.q;
      if (f.status) params.status = f.status;

      const res = await getMerchantApplications(params);
      setData(res.list);
      setTotal(res.total);

      // build counts from unfiltered first page
      if (!f.q && !f.status && pg === 1) {
        const c = {};
        res.list.forEach(r => {
          const k = String(r.status || "").toLowerCase();
          c[k] = (c[k] || 0) + 1;
        });
        setCounts(c);
      }
    } catch {
      message.error("Could not load merchant applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setPage(1); load(1, pageSize, filters); }, [filters]);
  useEffect(() => { load(page, pageSize, filters); }, [page, pageSize]);

  const columns = [
    {
      title: "Merchant",
      key: "merchant",
      width: 220,
      render: (_, row) => (
        <Space size={8}>
          <Avatar size={28} style={{ background: avatarBg(row.name), fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {initials(row.name)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{row.name || "—"}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.3 }}>{row.owner_name || "—"}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Contact",
      key: "contact",
      width: 190,
      render: (_, row) => (
        <div>
          <div style={{ fontSize: 12, color: "#334155" }}>{row.email || "—"}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{row.phone || "—"}</div>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "business_type",
      key: "business_type",
      width: 110,
      render: v => v
        ? <Tag style={{ fontSize: 11, padding: "0 6px", margin: 0 }}>{v}</Tag>
        : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
    },
    {
      title: "Branch",
      key: "branch",
      width: 160,
      render: (_, row) => {
        const name = row.default_branch?.name || row.suggested_branch?.name;
        const label = row.default_branch?.name ? "assigned" : "suggested";
        if (!name) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
        return (
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: row.default_branch?.name ? "#15803d" : "#334155" }}>
              {name}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{label}</div>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: status => <StatusPill status={status} />,
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 90,
      render: v => (
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>
          {v ? new Date(v).toLocaleDateString("en-NP", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
        </Text>
      ),
    },
    {
      key: "action",
      width: 70,
      align: "center",
      render: (_, row) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          style={{ color: "#6366f1" }}
          onClick={e => { e.stopPropagation(); router.push(`/admin/merchant-applications/${row.id}`); }}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>

      {/* ── Header row ── */}
      <Row justify="space-between" align="middle">
        <Col>
          <Text style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Merchant Applications</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            Review registrations, verify KYC and allocate branches
          </Text>
        </Col>
        <Col>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => load(page, pageSize, filters)} loading={loading}>
            Refresh
          </Button>
        </Col>
      </Row>

      {/* ── Stat strip ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {STAT_STRIP.map(({ key, label, color }) => {
          const count = key === undefined
            ? total
            : (counts[key] || 0);
          const active = filters.status === key;
          return (
            <button
              key={label}
              onClick={() => setFilters(f => ({ ...f, status: key }))}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 20, border: `1px solid ${active ? color : "#e2e8f0"}`,
                background: active ? color : "#fff", color: active ? "#fff" : "#475569",
                fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all .15s",
              }}
            >
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9, background: active ? "rgba(255,255,255,.25)" : color + "18",
                color: active ? "#fff" : color, fontSize: 11, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                {count}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Table card ── */}
      <Card bordered={false} styles={{ body: { padding: 0 } }}>
        {/* Toolbar */}
        <div style={{
          padding: "10px 16px", borderBottom: "1px solid #f1f5f9",
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
        }}>
          <Input
            size="small"
            placeholder="Search name, email, phone…"
            allowClear
            prefix={<SearchOutlined style={{ color: "#94a3b8", fontSize: 12 }} />}
            style={{ width: 220, fontSize: 12 }}
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
          />
          <Select
            size="small"
            allowClear
            value={filters.status}
            placeholder="All statuses"
            style={{ width: 180, fontSize: 12 }}
            onChange={status => setFilters(f => ({ ...f, status }))}
            options={[
              { value: "onboarding",           label: "Onboarding" },
              { value: "pending_verification", label: "Pending Verification" },
              { value: "under_review",         label: "Under Review" },
              { value: "more_info_required",   label: "Info Required" },
              { value: "active",               label: "Approved" },
              { value: "rejected",             label: "Rejected" },
            ]}
          />
          {(filters.q || filters.status) && (
            <Button size="small" onClick={() => setFilters({ q: "", status: undefined })}>
              Clear
            </Button>
          )}
          <Text type="secondary" style={{ marginLeft: "auto", fontSize: 12 }}>
            {total} result{total !== 1 ? "s" : ""}
          </Text>
        </div>

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={data}
          columns={columns}
          scroll={{ x: 800 }}
          onRow={row => ({
            style: { cursor: "pointer" },
            onClick: () => router.push(`/admin/merchant-applications/${row.id}`),
          })}
          pagination={{
            size: "small",
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (t, range) => `${range[0]}–${range[1]} of ${t}`,
            onChange: (pg, ps) => { setPage(pg); setPageSize(ps); },
          }}
          locale={{
            emptyText: (
              <div style={{ padding: "32px 0", textAlign: "center" }}>
                <ShopOutlined style={{ fontSize: 28, color: "#cbd5e1", display: "block", marginBottom: 8 }} />
                <Text type="secondary" style={{ fontSize: 12 }}>No applications found</Text>
              </div>
            ),
          }}
        />
      </Card>
    </Space>
  );
}
