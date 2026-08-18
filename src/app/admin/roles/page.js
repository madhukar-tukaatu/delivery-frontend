"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Divider,
  Empty,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CheckSquareOutlined,
  ClearOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Form } from "@/components/PageTools";
import { SimpleTablePageWithCRUD } from "@/components/PageTools";
import api from "@/lib/api";

const { Text } = Typography;

// ─── Role presets ────────────────────────────────────────────────────────────
// Each key matches the role `name` in the DB.
// Values are permission name prefixes/exact names that should be granted.
const ROLE_PRESETS = {
  super_admin: null, // null = all permissions

  main_admin: [
    "dashboard.view",
    "branches.view", "branches.create", "branches.edit", "branches.approve", "branches.reject", "branches.suspend", "branches.activate",
    "branches.documents.view", "branches.documents.manage", "branches.agreements.view", "branches.agreements.manage",
    "branches.team.view", "branches.team.manage", "branches.team.credentials",
    "merchants.view", "merchants.create", "merchants.edit", "merchants.approve", "merchants.reject", "merchants.suspend", "merchants.request_more_info",
    "merchants.documents.view", "merchants.documents.verify", "merchants.locations.view", "merchants.locations.verify",
    "customers.view", "customers.create", "customers.edit",
    "shipments.view", "shipments.create", "shipments.edit", "shipments.cancel", "shipments.status", "shipments.quote",
    "shipments.assign_pickup", "shipments.assign_delivery", "shipments.lifecycle", "shipments.invoice", "shipments.print_label", "shipments.export",
    "shipment_tasks.view", "shipment_tasks.assign", "shipment_tasks.status",
    "pickups.view", "pickups.create", "pickups.assign", "pickups.status", "pickups.accept", "pickups.picked_up", "pickups.failed", "pickups.reschedule",
    "deliveries.view", "deliveries.assign", "deliveries.status", "deliveries.accept", "deliveries.out_for_delivery", "deliveries.delivered", "deliveries.failed",
    "dispatches.view", "dispatches.create", "dispatches.receive", "dispatches.dispatch", "dispatches.transfer_batches", "dispatches.route_workflow",
    "pod.view", "pod.collect", "pod.confirm", "pod.deposit", "pod.rider_deposit", "pod.collections", "pod.settle",
    "rates.view", "rates.calculate", "rates.manage", "rates.service_types", "rates.branch_pricing", "rates.transfer_lanes",
    "pricing.settings.view", "pricing.settings.create", "pricing.settings.update", "pricing.settings.activate",
    "pricing.service_types.view", "pricing.service_types.create", "pricing.service_types.update", "pricing.service_types.status",
    "pricing.branch_rates.view", "pricing.branch_rates.create", "pricing.branch_rates.update", "pricing.branch_rates.status",
    "pricing.simulator.use", "pricing.quotes.view",
    "invoices.view", "invoices.create", "receipts.view", "receipts.create",
    "settlements.view", "settlements.create", "settlements.pay",
    "merchant_settlements.view", "merchant_settlements.create", "merchant_settlements.pay",
    "api_keys.view", "api_keys.manage", "webhooks.view", "webhooks.manage", "webhooks.retry", "webhooks.test",
    "notifications.view", "notifications.manage", "notifications.mark_sent",
    "reports.view", "reports.export", "reports.branches", "reports.pod", "reports.merchants", "reports.revenue", "reports.shipments", "reports.staff",
    "api_logs.view", "audit_logs.view", "sms_logs.view", "email_logs.view", "webhook_logs.view",
    "support.view", "support.manage",
    "users.view", "users.manage",
    "settings.view",
  ],

  pricing_manager: [
    "dashboard.view",
    "branches.view",
    "rates.view", "rates.calculate", "rates.manage", "rates.service_types", "rates.branch_pricing",
    "pricing.settings.view", "pricing.settings.create", "pricing.settings.update", "pricing.settings.activate", "pricing.settings.delete",
    "pricing.service_types.view", "pricing.service_types.create", "pricing.service_types.update", "pricing.service_types.status", "pricing.service_types.delete",
    "pricing.branch_rates.view", "pricing.branch_rates.create", "pricing.branch_rates.update", "pricing.branch_rates.status", "pricing.branch_rates.delete",
    "pricing.simulator.use", "pricing.quotes.view",
    "audit_logs.view", "reports.view", "reports.revenue",
  ],

  branch_manager: [
    "dashboard.view",
    "branches.team.view", "branches.team.manage", "branches.team.credentials",
    "branches.sub_offices.view", "branches.sub_offices.manage",
    "customers.view", "customers.create", "customers.edit",
    "shipments.view", "shipments.create", "shipments.edit", "shipments.status", "shipments.quote",
    "shipments.assign_pickup", "shipments.assign_delivery", "shipments.lifecycle", "shipments.print_label",
    "shipment_tasks.view", "shipment_tasks.assign", "shipment_tasks.status",
    "pickups.view", "pickups.create", "pickups.assign", "pickups.status", "pickups.accept", "pickups.picked_up", "pickups.failed", "pickups.reschedule",
    "deliveries.view", "deliveries.assign", "deliveries.status", "deliveries.accept", "deliveries.out_for_delivery", "deliveries.delivered", "deliveries.failed",
    "dispatches.view", "dispatches.create", "dispatches.receive", "dispatches.dispatch", "dispatches.transfer_batches", "dispatches.route_workflow",
    "pod.view", "pod.collect", "pod.deposit", "pod.collections",
    "rates.view", "rates.calculate",
    "pricing.service_types.view", "pricing.branch_rates.view", "pricing.simulator.use",
    "notifications.view",
    "reports.view", "reports.branches", "reports.shipments", "reports.staff",
    "support.view", "support.manage",
    "staff.dashboard", "staff.pickups", "staff.deliveries", "staff.pod", "staff.rider_location",
  ],

  sub_branch_manager: [
    "dashboard.view",
    "branches.view", "branches.team.view", "branches.team.manage", "branches.team.credentials",
    "customers.view", "customers.create", "customers.edit",
    "shipments.view", "shipments.create", "shipments.status", "shipments.quote", "shipments.lifecycle", "shipments.print_label",
    "shipment_tasks.view", "shipment_tasks.assign", "shipment_tasks.status",
    "pickups.view", "pickups.create", "pickups.assign", "pickups.status", "pickups.accept", "pickups.picked_up", "pickups.failed",
    "deliveries.view", "deliveries.assign", "deliveries.status", "deliveries.accept", "deliveries.out_for_delivery", "deliveries.delivered", "deliveries.failed",
    "dispatches.view", "dispatches.receive", "dispatches.route_workflow",
    "pod.view", "pod.collect", "pod.deposit",
    "rates.calculate",
    "pricing.service_types.view", "pricing.branch_rates.view", "pricing.simulator.use",
    "notifications.view",
    "staff.dashboard", "staff.pickups", "staff.deliveries", "staff.pod", "staff.rider_location",
  ],

  booking_staff: [
    "dashboard.view",
    "customers.view", "customers.create", "customers.edit",
    "shipments.view", "shipments.create", "shipments.edit", "shipments.quote", "shipments.print_label",
    "pickups.view", "pickups.create",
    "rates.view", "rates.calculate",
    "pricing.service_types.view", "pricing.branch_rates.view", "pricing.simulator.use",
    "notifications.view",
  ],

  pickup_staff: [
    "staff.dashboard", "staff.pickups",
    "shipments.view",
    "pickups.view", "pickups.status", "pickups.accept", "pickups.picked_up", "pickups.failed",
    "notifications.view",
  ],

  dispatch_staff: [
    "dashboard.view", "staff.dashboard",
    "branches.view",
    "pricing.branch_rates.view", "rates.transfer_lanes",
    "shipments.view", "shipments.status", "shipments.lifecycle",
    "shipment_tasks.view", "shipment_tasks.assign", "shipment_tasks.status",
    "pickups.view", "pickups.status",
    "deliveries.view", "deliveries.assign", "deliveries.status",
    "dispatches.view", "dispatches.create", "dispatches.receive", "dispatches.dispatch", "dispatches.transfer_batches", "dispatches.route_workflow",
    "notifications.view",
  ],

  support_staff: [
    "dashboard.view", "staff.dashboard",
    "shipments.view",
    "pricing.service_types.view", "pricing.branch_rates.view", "pricing.quotes.view",
    "customers.view",
    "merchants.view", "merchants.documents.view", "merchants.locations.view",
    "pickups.view", "deliveries.view", "dispatches.view",
    "support.view", "support.manage",
    "notifications.view",
    "api_logs.view", "webhook_logs.view", "sms_logs.view", "email_logs.view",
  ],

  accounts_staff: [
    "dashboard.view", "staff.dashboard",
    "merchants.view",
    "shipments.view",
    "pricing.settings.view", "pricing.service_types.view", "pricing.branch_rates.view", "pricing.quotes.view",
    "pod.view", "pod.collect", "pod.confirm", "pod.deposit", "pod.rider_deposit", "pod.collections", "pod.settle",
    "settlements.view", "settlements.create", "settlements.pay",
    "merchant_settlements.view", "merchant_settlements.create", "merchant_settlements.pay",
    "invoices.view", "invoices.create", "receipts.view", "receipts.create",
    "reports.view", "reports.export", "reports.pod", "reports.revenue", "reports.merchants",
    "api_logs.view", "webhook_logs.view",
    "notifications.view",
  ],

  rider: [
    "staff.dashboard", "staff.pickups", "staff.deliveries", "staff.pod", "staff.rider_location",
    "shipments.view",
    "pickups.view", "pickups.status", "pickups.accept", "pickups.picked_up", "pickups.failed",
    "deliveries.view", "deliveries.status", "deliveries.accept", "deliveries.out_for_delivery", "deliveries.delivered", "deliveries.failed",
    "pod.view", "pod.collect",
    "notifications.view",
  ],

  merchant: [
    "merchant.onboarding", "merchant.profile", "merchant.documents", "merchant.locations",
    "merchant.bank_details", "merchant.submit_verification",
    "merchant.dashboard", "merchant.shipments", "merchant.pickups", "merchant.pickup_locations",
    "merchant.customers", "merchant.rates", "merchant.pod", "merchant.settlements", "merchant.invoices",
    "merchant.api_keys", "merchant.api_logs", "merchant.webhooks", "merchant.webhook_logs", "merchant.support",
  ],
};

const PRESET_OPTIONS = [
  { value: "super_admin", label: "Super Admin (all)" },
  { value: "main_admin", label: "Main Admin" },
  { value: "pricing_manager", label: "Pricing Manager" },
  { value: "branch_manager", label: "Branch Manager" },
  { value: "sub_branch_manager", label: "Sub Branch Manager" },
  { value: "booking_staff", label: "Booking Staff" },
  { value: "pickup_staff", label: "Pickup Staff" },
  { value: "dispatch_staff", label: "Dispatch Staff" },
  { value: "support_staff", label: "Support Staff" },
  { value: "accounts_staff", label: "Accounts Staff" },
  { value: "rider", label: "Rider" },
  { value: "merchant", label: "Merchant" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function prettifyLabel(v = "") {
  return v.replaceAll("-", "_").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettifyPermission(p = "") {
  const [mod = "", action = ""] = p.split(".");
  if (!action) return prettifyLabel(mod);
  return `${prettifyLabel(action)} ${prettifyLabel(mod)}`;
}

function getPermissionColor(name = "") {
  if (name.endsWith(".view")) return "blue";
  if (name.endsWith(".create")) return "green";
  if (name.endsWith(".update") || name.endsWith(".edit")) return "orange";
  if (name.endsWith(".delete")) return "red";
  if (name.endsWith(".approve")) return "purple";
  if (name.endsWith(".status")) return "cyan";
  if (name.endsWith(".manage")) return "volcano";
  return "default";
}

function normalizePermissionGroups(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((g) => ({
      key: g.group_key || g.key || g.group || "general",
      label: g.group_label || g.label || prettifyLabel(g.group_key || g.key || "general"),
      permissions: normalizePermissions(g.permissions || []),
    }));
  }
  return Object.entries(raw).map(([k, perms]) => ({
    key: k || "general",
    label: prettifyLabel(k || "general"),
    permissions: normalizePermissions(perms || []),
  }));
}

function normalizePermissions(perms) {
  return perms
    .map((p) => {
      if (typeof p === "string") return { name: p, label: prettifyPermission(p), description: "" };
      return { id: p.id, name: p.name, label: p.label || prettifyPermission(p.name), description: p.description || "" };
    })
    .filter((p) => p.name);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { loadPermissions(); }, []);

  const loadPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const res = await api.get("/admin/permissions");
      setPermissionGroups(normalizePermissionGroups(res.data?.data));
    } catch {
      message.error("Failed to load permissions");
      setPermissionGroups([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const allPermissions = useMemo(
    () => permissionGroups.flatMap((g) => g.permissions),
    [permissionGroups],
  );

  const columns = [
    {
      title: "Role Key",
      dataIndex: "name",
      render: (v) => <Text strong code>{v}</Text>,
    },
    {
      title: "Label",
      dataIndex: "label",
      render: (v, r) => v || prettifyLabel(r.name),
    },
    {
      title: "Permissions",
      render: (_, r) => {
        const perms = r.permissions || [];
        if (!perms.length) return <Tag color="default">No permissions</Tag>;
        return (
          <Space size={[4, 4]} wrap>
            {perms.slice(0, 6).map((p) => {
              const name = p.name || p;
              return (
                <Tooltip key={name} title={prettifyPermission(name)}>
                  <Tag color={getPermissionColor(name)} style={{ margin: 0 }}>{name}</Tag>
                </Tooltip>
              );
            })}
            {perms.length > 6 && <Tag color="default">+{perms.length - 6} more</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Count",
      width: 70,
      render: (_, r) => (
        <Badge
          count={(r.permissions || []).length}
          style={{ backgroundColor: (r.permissions || []).length ? "#1677ff" : "#999" }}
        />
      ),
    },
  ];

  // ─── Role Form ──────────────────────────────────────────────────────────────
  const RoleForm = ({ record, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const [search, setSearch] = useState("");
    const isEdit = !!record;

    const selectedPermissions = Form.useWatch("permissions", form) || [];

    useEffect(() => {
      if (record) {
        form.setFieldsValue({
          name: record.name,
          label: record.label,
          description: record.description,
          permissions: (record.permissions || []).map((p) => p.name ?? p),
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ permissions: [] });
      }
    }, [record, form]);

    const filteredGroups = useMemo(() => {
      const kw = search.trim().toLowerCase();
      if (!kw) return permissionGroups;
      return permissionGroups
        .map((g) => ({
          ...g,
          permissions: g.permissions.filter(
            (p) =>
              g.key.toLowerCase().includes(kw) ||
              g.label.toLowerCase().includes(kw) ||
              p.name.toLowerCase().includes(kw) ||
              p.label.toLowerCase().includes(kw),
          ),
        }))
        .filter((g) => g.permissions.length > 0);
    }, [search]);

    const selectedSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);

    const update = (next) => form.setFieldsValue({ permissions: Array.from(new Set(next)) });
    const selectGroup = (g) => update([...selectedPermissions, ...g.permissions.map((p) => p.name)]);
    const clearGroup = (g) => {
      const names = new Set(g.permissions.map((p) => p.name));
      update(selectedPermissions.filter((p) => !names.has(p)));
    };
    const selectAll = () => update(allPermissions.map((p) => p.name));
    const clearAll = () => update([]);

    const applyPreset = (presetKey) => {
      const preset = ROLE_PRESETS[presetKey];
      if (preset === null) {
        // super_admin = all
        selectAll();
        return;
      }
      if (!preset) return;
      // Match preset entries against actual permission names (exact or prefix)
      const matched = allPermissions
        .map((p) => p.name)
        .filter((name) => preset.includes(name));
      update(matched);
      message.success(`Applied "${prettifyLabel(presetKey)}" preset — ${matched.length} permissions selected.`);
    };

    const handleSubmit = async (values) => {
      try {
        const payload = { ...values, permissions: values.permissions || [] };
        if (isEdit) {
          await api.put(`/admin/roles/${record.id}`, payload);
          message.success("Role updated.");
        } else {
          await api.post("/admin/roles", payload);
          message.success("Role created.");
        }
        setRefresh((v) => v + 1);
        onSuccess?.();
      } catch (err) {
        message.error(err?.response?.data?.message || "Operation failed.");
      }
    };

    const collapseItems = filteredGroups.map((g) => {
      const groupNames = g.permissions.map((p) => p.name);
      const selectedInGroup = groupNames.filter((n) => selectedSet.has(n)).length;
      return {
        key: g.key,
        label: (
          <Space>
            <SafetyCertificateOutlined />
            <Text strong>{g.label}</Text>
            <Badge
              count={`${selectedInGroup}/${g.permissions.length}`}
              style={{ backgroundColor: selectedInGroup ? "#1677ff" : "#999" }}
            />
          </Space>
        ),
        extra: (
          <Space onClick={(e) => e.stopPropagation()}>
            <Button size="small" onClick={() => selectGroup(g)}>All</Button>
            <Button size="small" onClick={() => clearGroup(g)}>Clear</Button>
          </Space>
        ),
        children: (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
            {g.permissions.map((p) => (
              <Card
                key={p.name}
                size="small"
                styles={{ body: { padding: 10 } }}
                style={{ borderColor: selectedSet.has(p.name) ? "#1677ff" : undefined }}
              >
                <Checkbox value={p.name}>
                  <Text strong style={{ fontSize: 12 }}>{p.label}</Text>
                  <div>
                    <Tag color={getPermissionColor(p.name)} style={{ marginTop: 4, fontSize: 10 }}>{p.name}</Tag>
                  </div>
                  {p.description && <Text type="secondary" style={{ fontSize: 11 }}>{p.description}</Text>}
                </Checkbox>
              </Card>
            ))}
          </div>
        ),
      };
    });

    return (
      <Form layout="vertical" form={form} onFinish={handleSubmit}>
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="name" label="Role Key" rules={[{ required: true }]}
              extra="e.g. booking_staff, branch_manager">
              <Input placeholder="booking_staff" disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="label" label="Display Label">
              <Input placeholder="Booking Staff" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} placeholder="Short role description…" />
        </Form.Item>

        <Divider orientation="left">Permissions</Divider>

        {/* Toolbar */}
        <Card size="small" style={{ marginBottom: 12 }}>
          <Row gutter={[8, 8]} align="middle">
            <Col flex="auto">
              <Space wrap>
                <Badge
                  count={`${selectedPermissions.length}/${allPermissions.length}`}
                  style={{ backgroundColor: "#1677ff" }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>selected</Text>
                <Button size="small" icon={<CheckSquareOutlined />} onClick={selectAll}>All</Button>
                <Button size="small" icon={<ClearOutlined />} onClick={clearAll}>Clear</Button>
              </Space>
            </Col>
            <Col>
              <Space wrap>
                <Select
                  size="small"
                  placeholder="Apply preset…"
                  style={{ width: 200 }}
                  options={PRESET_OPTIONS}
                  onChange={applyPreset}
                  suffixIcon={<ThunderboltOutlined />}
                />
                <Input
                  allowClear
                  size="small"
                  prefix={<SearchOutlined />}
                  placeholder="Search permissions…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 200 }}
                />
              </Space>
            </Col>
          </Row>
        </Card>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Use the preset selector to quickly apply standard permissions for a role type, then fine-tune as needed."
        />

        <Form.Item name="permissions" initialValue={[]}>
          <Checkbox.Group style={{ width: "100%" }}>
            {loadingPermissions ? (
              <Card loading />
            ) : collapseItems.length ? (
              <Collapse defaultActiveKey={collapseItems.map((i) => i.key)} items={collapseItems} />
            ) : (
              <Empty description="No permissions found" />
            )}
          </Checkbox.Group>
        </Form.Item>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit">{isEdit ? "Update Role" : "Create Role"}</Button>
        </div>
      </Form>
    );
  };

  return (
    <SimpleTablePageWithCRUD
      title="Roles & Permissions"
      endpoint="/admin/roles"
      columns={columns}
      modalForm={<RoleForm />}
      reloadKey={refresh}
    />
  );
}
