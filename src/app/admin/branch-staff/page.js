"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Avatar, Button, Card, Col, Divider, Empty, Form, Input, Modal, Popconfirm,
  Row, Select, Space, Spin, Switch, Table, Tag, Tooltip, Typography, message,
} from "antd";
import {
  BranchesOutlined, DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined,
  ReloadOutlined, SearchOutlined, UserAddOutlined,
} from "@ant-design/icons";
import { usePermissions } from "@/hooks/usePermission";
import {
  createBranchStaff, getBranchStaff, updateBranchStaff, toggleBranchStaff, deleteBranchStaff, getBranchStaffRoles,
} from "@/services/branchStaffService";

const { Text, Title } = Typography;

// Dynamic staff roles - loaded from backend
function useStaffRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      try {
        const data = await getBranchStaffRoles();
        const mapped = (data || []).map(role => ({
          value: role.name,
          label: role.name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase()),
        }));
        setRoles(mapped);
      } catch (err) {
        console.error('Failed to load staff roles:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRoles();
  }, []);

  return { roles, loading };
}

function getRoleColor(roleName) {
  const roleLower = (roleName || '').toLowerCase();
  if (roleLower === 'rider') return 'green';
  if (roleLower === 'pickup_rider' || roleLower === 'pickup_staff') return 'cyan';
  if (roleLower === 'delivery_staff') return 'blue';
  if (roleLower === 'branch_manager') return 'purple';
  if (roleLower === 'booking_staff') return 'orange';
  if (roleLower === 'dispatch_staff') return 'gold';
  if (roleLower === 'support_staff') return 'magenta';
  if (roleLower === 'accounts_staff') return 'red';
  if (roleLower === 'branch_staff') return 'default';
  return 'default';
}

function UserAvatar({ name, size = 28 }) {
  const initials = String(name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed"];
  const bg = colors[(name || "").charCodeAt(0) % colors.length];
  return (
    <Avatar size={size} style={{ background: bg, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </Avatar>
  );
}

export default function BranchStaffPage() {
  const { can, branchId, branchName, isSuperAdmin } = usePermissions();

  // Ensure user has permission
  const hasManagePermission = can?.("staff.create") || can?.("staff.update");

  // Dynamic roles from backend
  const { roles: staffRoles, loading: rolesLoading } = useStaffRoles();

  // Data & state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Load staff list
  const load = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: pageSize,
        ...(search && { q: search }),
        ...(roleFilter && { role: roleFilter }),
      };
      const res = await getBranchStaff(params);
      setRows(res.list || []);
      setPagination({
        current: res.currentPage || 1,
        pageSize: res.pageSize || 20,
        total: res.total || 0,
      });
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load staff.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { load(1, 20); }, [load]);

  // Open create modal
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModalOpen(true);
  };

  // Open edit modal
  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role?.name || row.role,
      is_active: row.is_active !== false,
    });
    setModalOpen(true);
  };

  // Handle form submit (create or update)
  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        role: values.role,
      };

      // Only include password on create or if provided during edit
      if (values.password) {
        payload.password = values.password;
        payload.password_confirmation = values.password;
      }

      if (editing) {
        await updateBranchStaff(editing.id, payload);
        message.success("Staff member updated successfully.");
      } else {
        await createBranchStaff(payload);
        message.success("Staff member created. Login credentials sent to their email.");
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

  // Toggle staff active/inactive
  const handleToggleStatus = async (staffId) => {
    try {
      await toggleBranchStaff(staffId);
      message.success("Status updated.");
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to update status.");
    }
  };

  // Delete (deactivate) staff
  const handleDelete = async (staffId) => {
    try {
      await deleteBranchStaff(staffId);
      message.success("Staff member deactivated.");
      load(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete staff.");
    }
  };

  // Table columns
  const columns = [
    {
      title: "Staff Member",
      key: "staff",
      width: 240,
      render: (_, row) => (
        <Space size={12}>
          <UserAvatar name={row.name} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name || "—"}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{row.email || "—"}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      width: 140,
      render: (v) => <Text style={{ fontSize: 12 }}>{v || "—"}</Text>,
    },
    {
      title: "Role",
      key: "role",
      width: 160,
      render: (_, row) => {
        const roleName = typeof row.role === "string" ? row.role : row.role?.name;
        const roleObj = staffRoles.find(r => r.value === roleName);
        return (
          <Tag color={getRoleColor(roleName)} style={{ margin: 0 }}>
            {roleObj?.label || roleName || "—"}
          </Tag>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, row) => (
        <Tag color={row.is_active ? "green" : "red"}>
          {row.is_active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, row) => (
        <Space size="small">
          {hasManagePermission && (
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(row)}
              />
            </Tooltip>
          )}
          <Tooltip title={row.is_active ? "Deactivate" : "Activate"}>
            <Switch
              size="small"
              checked={row.is_active !== false}
              onChange={() => handleToggleStatus(row.id)}
            />
          </Tooltip>
          {hasManagePermission && (
            <Popconfirm
              title="Delete Staff"
              description="Are you sure you want to deactivate this staff member?"
              onConfirm={() => handleDelete(row.id)}
              okText="Yes"
              cancelText="No"
              placement="topRight"
            >
              <Tooltip title="Delete">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: "#f7f8fa", minHeight: "100vh" }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[12, 12]}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <UserAddOutlined /> Staff Management
          </Title>
          <Text type="secondary">
            {branchName ? `Managing staff for ${branchName}` : "Manage branch staff members"}
          </Text>
        </Col>
        <Col>
          <Space>
            {hasManagePermission && (
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={openCreate}>
                Add Staff
              </Button>
            )}
            <Button icon={<ReloadOutlined />} size="large" onClick={() => load(1, pagination.pageSize)}>
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Search & Filter Card */}
      <Card style={{ marginBottom: 16, borderRadius: 14 }}>
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
          <Space wrap>
            <Input
              allowClear
              style={{ width: 260 }}
              placeholder="Search by name or email…"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => load(1, pagination.pageSize)}
            />
            <Select
              allowClear
              style={{ width: 200 }}
              placeholder="Filter by role"
              value={roleFilter || undefined}
              onChange={(v) => setRoleFilter(v || "")}
              options={staffRoles}
              loading={rolesLoading}
            />
            <Button type="primary" onClick={() => load(1, pagination.pageSize)}>
              Search
            </Button>
            <Button
              onClick={() => {
                setSearch("");
                setRoleFilter("");
                setTimeout(() => load(1, pagination.pageSize), 0);
              }}
            >
              Reset
            </Button>
          </Space>
          <Divider style={{ margin: 0 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Total: <strong>{pagination.total}</strong> staff member{pagination.total !== 1 ? "s" : ""}
          </Text>
        </Space>
      </Card>

      {/* Staff List Table */}
      <Card style={{ borderRadius: 14 }}>
        {rows.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No staff members yet. Click 'Add Staff' to create one."
            style={{ padding: "60px 0" }}
          />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows}
            scroll={{ x: 900 }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (t) => `${t} staff member${t !== 1 ? "s" : ""}`,
              onChange: (p, ps) => load(p, ps),
            }}
          />
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        title={
          <Space>
            {editing ? <EditOutlined /> : <PlusOutlined />}
            {editing ? "Edit Staff Member" : "Add New Staff Member"}
          </Space>
        }
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
          setEditing(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
        okText={editing ? "Update" : "Create"}
        cancelText="Cancel"
      >
        <Spin spinning={submitting}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ is_active: true }}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label="Full Name"
                  rules={[
                    { required: true, message: "Please enter staff member's full name" },
                    { min: 2, message: "Name must be at least 2 characters" },
                  ]}
                >
                  <Input placeholder="e.g., John Doe" size="large" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="email"
                  label="Email Address"
                  rules={[
                    { required: true, message: "Please enter an email address" },
                    { type: "email", message: "Invalid email format" },
                  ]}
                >
                  <Input
                    placeholder="staff@example.com"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="phone"
                  label="Phone Number (Optional)"
                  rules={[
                    { pattern: /^[\d+\s\-()]*$/, message: "Invalid phone format" },
                  ]}
                >
                  <Input placeholder="+977 98xxxxxxxx" size="large" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="role"
                  label="Role"
                  rules={[{ required: true, message: "Please select a role" }]}
                >
                  <Select
                    placeholder="Select staff role"
                    size="large"
                    options={staffRoles}
                    loading={rolesLoading}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Divider />
            <Form.Item
              name="password"
              label="New Password (leave blank to keep current)"
              extra="Enter a new password to update it. Leave empty to keep the current password."
            >
              <Input.Password placeholder="Minimum 8 characters (optional)" size="large" />
            </Form.Item>
            <Form.Item name="is_active" valuePropName="checked" label="Status">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  );
}
