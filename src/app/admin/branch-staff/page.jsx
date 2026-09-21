"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Avatar, Breadcrumb, Button, Card, Col, Divider, Empty, Form, Input, Modal, Popconfirm,
  Row, Select, Space, Spin, Switch, Table, Tag, Tooltip, Typography, message,
} from "antd";
import {
  BranchesOutlined, DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined,
  ReloadOutlined, SearchOutlined, ShopOutlined,
  TeamOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { usePermissions } from "@/hooks/usePermission";
import {
  createBranchStaff, getBranchStaff, updateBranchStaff, toggleBranchStaff, deleteBranchStaff, getBranchStaffRoles,
} from "@/services/admin/branchStaffService";
import StatCard, { StatCardGrid } from "@/components/admin/ui/StatCard";

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
            <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name || "-"}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{row.email || "-"}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      width: 140,
      render: (v) => <Text style={{ fontSize: 12 }}>{v || "-"}</Text>,
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
            {roleObj?.label || roleName || "-"}
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

  const activeCount = rows.filter((r) => r.is_active !== false).length;
  const inactiveCount = rows.filter((r) => r.is_active === false).length;
  const riderCount = rows.filter((r) => {
    const roleName = typeof r.role === "string" ? r.role : r.role?.name;
    return String(roleName || "").toLowerCase() === "rider";
  }).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "22px clamp(14px, 2vw, 28px) 40px",
        background: "#f4f7fb",
      }}
    >
      <Space direction="vertical" size={18} style={{ width: "100%" }}>
        <Card
          variant="borderless"
          style={{
            borderRadius: 22,
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #0f172a 0%, #172554 55%, #1d4ed8 135%)",
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)",
          }}
          styles={{ body: { padding: "26px clamp(20px, 3vw, 34px)" } }}
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Breadcrumb
              items={[
                { title: <span style={{ color: "#bfdbfe" }}>Admin</span> },
                { title: <span style={{ color: "#ffffff" }}>Branch Staff</span> },
              ]}
            />

            <Row gutter={[20, 20]} align="middle" justify="space-between">
              <Col xs={24} xl={15}>
                <Space align="start" size={15}>
                  <Avatar
                    size={54}
                    icon={<TeamOutlined />}
                    style={{ background: "rgba(255,255,255,0.16)" }}
                  />
                  <Space direction="vertical" size={7}>
                    <Space wrap>
                      <Title level={2} style={{ margin: 0, color: "#ffffff" }}>
                        Branch Staff
                      </Title>
                      {branchName ? (
                        <Tag color="blue">{branchName}</Tag>
                      ) : isSuperAdmin ? (
                        <Tag color="geekblue">All branches</Tag>
                      ) : null}
                    </Space>
                    <Text style={{ color: "#cbd5e1" }}>
                      Manage pickup staff, delivery staff, and riders
                      {branchName ? ` for ${branchName}` : " across your branches"}.
                    </Text>
                  </Space>
                </Space>
              </Col>

              <Col xs={24} xl={9}>
                <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => load(1, pagination.pageSize)}
                  >
                    Refresh
                  </Button>
                  {hasManagePermission ? (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openCreate}
                    >
                      Add Staff
                    </Button>
                  ) : null}
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>

        <StatCardGrid>
          <StatCard
            label="Total Staff"
            value={pagination.total}
            hint="All matching members"
            variant="primary"
            icon={<TeamOutlined />}
          />
          <StatCard
            label="Active (page)"
            value={activeCount}
            hint="Currently listed active"
            variant="success"
          />
          <StatCard
            label="Inactive (page)"
            value={inactiveCount}
            hint="Currently listed inactive"
            variant="danger"
          />
          <StatCard
            label="Riders (page)"
            value={riderCount}
            hint="Rider role on this page"
            variant="accent"
            icon={<ShopOutlined />}
          />
        </StatCardGrid>

        <Card
          style={{
            borderRadius: 18,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: 18 } }}
        >
          <Space wrap style={{ width: "100%", marginBottom: 4 }}>
            <Input
              allowClear
              style={{ width: 280 }}
              placeholder="Search by name or email..."
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
        </Card>

        <Card
          title={
            <Space>
              <TeamOutlined style={{ color: "#1d4ed8" }} />
              <span>Staff directory</span>
            </Space>
          }
          style={{
            borderRadius: 18,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
          }}
        >
          {rows.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No staff members yet. Click Add Staff to create one."
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
      </Space>
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
