"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Avatar, Button, Card, Col, Form, Input, Modal, Row, Select,
  Space, Switch, Table, Tag, Tooltip, Typography, message,
} from "antd";
import { BranchesOutlined, LockOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import { StatusTag } from "@/components/PageTools";

const { Text } = Typography;

const STAFF_ROLES = [
  "booking_staff", "pickup_staff", "dispatch_staff", "support_staff",
  "accounts_staff", "delivery_staff", "warehouse_staff", "rider",
];

const ROLE_COLORS = {
  booking_staff: "blue", pickup_staff: "cyan", dispatch_staff: "orange",
  support_staff: "geekblue", accounts_staff: "gold",
  delivery_staff: "green", warehouse_staff: "lime", rider: "green",
};

function UserAvatar({ name }) {
  const initials = String(name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed"];
  const bg = colors[(name || "").charCodeAt(0) % colors.length];
  return (
    <Avatar size={28} style={{ background: bg, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </Avatar>
  );
}

export default function BranchStaffPage() {
  const { can, branchId, branchName, isSuperAdmin } = usePermissions();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [subBranches, setSubBranches] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Load sub-branches for this branch (branch manager can assign staff to sub-branches)
  useEffect(() => {
    if (!branchId) return;
    api.get(`/admin/branches?parent_id=${branchId}&per_page=100`)
      .then(res => {
        const data = res.data?.data;
        const list = Array.isArray(data) ? data : data?.data || [];
        setSubBranches(list);
      })
      .catch(() => {});
  }, [branchId]);

  const load = useCallback(async (page = 1, pageSize = 15) => {
    setLoading(true);
    try {
      const params = {
        page, per_page: pageSize,
        roles: STAFF_ROLES.join(","),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
      };
      // Always scope to branch — branch managers see their branch only
      // Super admin with no branchId still scopes to staff roles only
      if (branchId) params.branch_id = branchId;

      const res = await api.get("/admin/users", { params });
      const payload = res.data?.data || res.data;
      const list = payload?.data || payload || [];
      setRows(Array.isArray(list) ? list : []);
      setPagination({ current: payload?.current_page || page, pageSize: payload?.per_page || pageSize, total: payload?.total || list.length });
    } catch {
      message.error("Could not load staff.");
    } finally {
      setLoading(false);
    }
  }, [branchId, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ is_active: true, branch_id: branchId }); setModalOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    form.setFieldsValue({
      name: r.name, email: r.email, phone: r.phone,
      role: r.role?.name || r.role,
      branch_id: r.branch_id || r.branch?.id || r.default_branch_id || branchId,
      is_active: r.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = { ...values };
      if (!payload.password?.trim()) delete payload.password;
      // Always lock branch to the manager's branch
      payload.branch_id = values.branch_id || branchId;

      if (editing) {
        await api.put(`/admin/users/${editing.id}`, payload);
        message.success("Staff updated.");
      } else {
        await api.post("/admin/users", payload);
        message.success("Staff created. Login credentials sent to their email.");
      }
      setModalOpen(false);
      form.resetFields();
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (r) => {
    try {
      await api.post(`/admin/users/${r.id}/toggle`);
      message.success("Status updated.");
      load(pagination.current, pagination.pageSize);
    } catch { message.error("Failed."); }
  };

  const resetPassword = async (r) => {
    try {
      await api.post(`/admin/users/${r.id}/reset-password`);
      message.success("Password reset email sent.");
    } catch { message.error("Failed."); }
  };

  // Branch options: own branch + sub-branches
  const branchOptions = [
    ...(branchId && branchName ? [{ value: branchId, label: `${branchName} (Main)` }] : []),
    ...subBranches.map(b => ({ value: b.id, label: b.name })),
  ];

  const columns = [
    {
      title: "Staff Member", key: "user", width: 220,
      render: (_, r) => (
        <Space size={8}>
          <UserAvatar name={r.name} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{r.name || "—"}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.email || "—"}</div>
          </div>
        </Space>
      ),
    },
    { title: "Phone", dataIndex: "phone", width: 130, render: v => <Text style={{ fontSize: 12 }}>{v || "—"}</Text> },
    {
      title: "Role", key: "role", width: 150,
      render: (_, r) => {
        const name = r.role?.name || r.role || "";
        const label = name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        return <Tag color={ROLE_COLORS[name] || "default"} style={{ margin: 0, fontSize: 11 }}>{label || "—"}</Tag>;
      },
    },
    {
      title: "Branch", key: "branch", width: 160,
      render: (_, r) => {
        const name = r.branch?.name || r.default_branch?.name;
        if (!name) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
        return <Space size={4}><BranchesOutlined style={{ color: "#6366f1", fontSize: 11 }} /><Text style={{ fontSize: 12 }}>{name}</Text></Space>;
      },
    },
    { title: "Status", dataIndex: "is_active", width: 90, render: v => <StatusTag value={v ? "active" : "inactive"} /> },
    {
      title: "Actions", key: "actions", width: 130,
      render: (_, r) => (
        <Space size={4}>
          {can("branches.team.manage") && (
            <Button size="small" onClick={() => openEdit(r)}>Edit</Button>
          )}
          <Tooltip title={r.is_active ? "Deactivate" : "Activate"}>
            <Switch size="small" checked={r.is_active} onChange={() => toggleStatus(r)} />
          </Tooltip>
          <Tooltip title="Reset password">
            <Button size="small" type="text" icon={<LockOutlined />} onClick={() => resetPassword(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card>
        <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
          <div>
            <Text style={{ fontSize: 18, fontWeight: 700 }}>
              {branchName ? `Branch Staff — ${branchName}` : "Branch Staff"}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>Manage staff members for your branch.</Text>
          </div>
          <Space>
            {can("branches.team.manage") && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Staff</Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={() => load(1, pagination.pageSize)}>Refresh</Button>
          </Space>
        </Space>
        <Space wrap style={{ marginTop: 12 }}>
          <Input allowClear style={{ width: 220 }} placeholder="Search name / email"
            prefix={<SearchOutlined />} value={search}
            onChange={e => setSearch(e.target.value)}
            onPressEnter={() => load(1, pagination.pageSize)}
          />
          <Select allowClear style={{ width: 180 }} placeholder="Filter by role"
            value={roleFilter || undefined} onChange={v => setRoleFilter(v || "")}
            options={STAFF_ROLES.map(r => ({ value: r, label: r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }))}
          />
          <Button type="primary" onClick={() => load(1, pagination.pageSize)}>Search</Button>
          <Button onClick={() => { setSearch(""); setRoleFilter(""); setTimeout(() => load(1, pagination.pageSize), 0); }}>Reset</Button>
        </Space>
      </Card>

      <Card>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} scroll={{ x: 900 }}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: t => `${t} staff`, onChange: (p, ps) => load(p, ps) }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? "Edit Staff Member" : "Add Staff Member"}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ is_active: true }}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                <Input placeholder="Full name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true }, { type: "email" }]}
                extra={!editing ? "Staff will receive login credentials at this email." : undefined}>
                <Input placeholder="staff@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="+977 98xxxxxxxx" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                <Select placeholder="Select role"
                  options={STAFF_ROLES.map(r => ({ value: r, label: r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) }))}
                />
              </Form.Item>
            </Col>
            {/* Branch assignment: own branch or any sub-branch */}
            <Col xs={24} md={12}>
              <Form.Item name="branch_id" label="Assign to Branch" rules={[{ required: true }]}>
                {branchOptions.length > 1 ? (
                  <Select placeholder="Select branch" options={branchOptions} />
                ) : (
                  <Input disabled value={branchName || branchId} />
                )}
              </Form.Item>
            </Col>
            {!editing && (
              <Col xs={24} md={12}>
                <Form.Item name="password" label="Temporary Password" rules={[{ required: true }]}>
                  <Input.Password placeholder="Set a temporary password" autoComplete="new-password" />
                </Form.Item>
              </Col>
            )}
          </Row>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
