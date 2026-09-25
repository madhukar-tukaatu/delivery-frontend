"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import { getBranches } from "@/services/admin/adminBranchService";

const { Text, Paragraph } = Typography;

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

const FALLBACK_GATEWAYS = [
  {
    code: "hamropay",
    label: "HamroPay",
    status: "live",
    description: "Company and branch HamroPay credentials.",
    fields: [
      { key: "api_base_url", label: "API base URL", type: "url", secret: false },
      { key: "gateway_url", label: "Gateway / checkout URL", type: "url", secret: false },
      { key: "merchant_id", label: "Merchant ID", type: "text", secret: false },
      { key: "client_id", label: "Client ID", type: "text", secret: false },
      { key: "client_api_key", label: "Client API key", type: "password", secret: true, placeholder: "Leave blank to keep existing" },
      { key: "secret", label: "Secret", type: "password", secret: true, placeholder: "Leave blank to keep existing" },
      { key: "webhook_secret", label: "Webhook secret", type: "password", secret: true, placeholder: "Leave blank to keep existing" },
      { key: "verify_ssl", label: "Verify SSL", type: "boolean", secret: false, default: true },
    ],
  },
  {
    code: "esewa",
    label: "eSewa",
    status: "ready",
    fields: [
      { key: "merchant_code", label: "Merchant code", type: "text", secret: false },
      { key: "product_code", label: "Product code", type: "text", secret: false },
      { key: "secret_key", label: "Secret key", type: "password", secret: true, placeholder: "Leave blank to keep existing" },
      { key: "api_base_url", label: "API base URL", type: "url", secret: false },
      { key: "success_url", label: "Success URL", type: "url", secret: false },
      { key: "failure_url", label: "Failure URL", type: "url", secret: false },
    ],
  },
  {
    code: "khalti",
    label: "Khalti",
    status: "ready",
    fields: [
      { key: "public_key", label: "Public key", type: "text", secret: false },
      { key: "secret_key", label: "Secret key", type: "password", secret: true, placeholder: "Leave blank to keep existing" },
      { key: "api_base_url", label: "API base URL", type: "url", secret: false },
      { key: "webhook_secret", label: "Webhook secret", type: "password", secret: true, placeholder: "Leave blank to keep existing" },
      { key: "return_url", label: "Return URL", type: "url", secret: false },
      { key: "website_url", label: "Website URL", type: "url", secret: false },
    ],
  },
  {
    code: "connectips",
    label: "ConnectIPS",
    status: "ready",
    fields: [
      { key: "merchant_id", label: "Merchant ID", type: "text", secret: false },
      { key: "app_id", label: "App ID", type: "text", secret: false },
      { key: "app_name", label: "App name", type: "text", secret: false },
      { key: "basic_auth_username", label: "Basic auth username", type: "text", secret: false },
      { key: "basic_auth_password", label: "Basic auth password", type: "password", secret: true, placeholder: "Leave blank to keep existing" },
      { key: "api_base_url", label: "API base URL", type: "url", secret: false },
      { key: "success_url", label: "Success URL", type: "url", secret: false },
      { key: "failure_url", label: "Failure URL", type: "url", secret: false },
    ],
  },
];

function statusColor(status) {
  if (status === "live") return "green";
  if (status === "ready") return "blue";
  return "default";
}

function pickBranchList(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.branches)) return data.branches;
  return [];
}

export default function PaymentGatewaysPage() {
  const {
    loading: permsLoading,
    isSuperAdmin,
    isBranchManager,
    branchId: myBranchId,
    branchName,
    roles,
    primaryRole,
  } = usePermissions();

  const [form] = Form.useForm();
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [gateways, setGateways] = useState(FALLBACK_GATEWAYS);
  const [canManageCompany, setCanManageCompany] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeGateway, setActiveGateway] = useState("hamropay");

  const ownerType = Form.useWatch("owner_type", form) || "branch";

  const canCompany = useMemo(() => {
    if (canManageCompany) return true;
    if (isSuperAdmin) return true;
    return (roles || []).some((r) => ["super_admin", "main_admin"].includes(r))
      || ["super_admin", "main_admin"].includes(primaryRole);
  }, [canManageCompany, isSuperAdmin, roles, primaryRole]);

  const gatewayMeta = useMemo(
    () => gateways.find((g) => g.code === activeGateway) || gateways[0],
    [gateways, activeGateway],
  );

  async function loadCatalog() {
    try {
      const res = await api.get("/admin/payment-gateways/catalog");
      const data = unwrap(res) || {};
      if (Array.isArray(data.gateways) && data.gateways.length) {
        setGateways(data.gateways);
      }
      if (typeof data.can_manage_company === "boolean") {
        setCanManageCompany(data.can_manage_company);
      }
    } catch {
      // keep FALLBACK_GATEWAYS
    }
  }

  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await api.get("/admin/payment-gateways/accounts");
      setAccounts(unwrap(res) || []);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load payment accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function loadBranches() {
    if (!canCompany && !isSuperAdmin) return;
    try {
      const res = await getBranches({ per_page: 200, page: 1 });
      setBranches(pickBranchList(res));
    } catch {
      setBranches([]);
    }
  }

  useEffect(() => {
    if (permsLoading) return;

    loadCatalog().then(() => {
      const defaultOwner = canCompany || isSuperAdmin ? "company" : "branch";
      form.setFieldsValue({
        gateway: "hamropay",
        owner_type: defaultOwner,
        is_enabled: true,
        is_default: true,
        branch_id: myBranchId || undefined,
        verify_ssl: true,
      });
    });

    loadAccounts();
    if (canCompany || isSuperAdmin) {
      loadBranches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permsLoading, canCompany, isSuperAdmin, myBranchId]);

  useEffect(() => {
    form.setFieldsValue({ gateway: activeGateway });
    // Clear secret fields when switching gateway; keep non-secrets empty for fresh entry
    const secrets = (gatewayMeta?.fields || [])
      .filter((f) => f.secret || f.type === "password")
      .map((f) => f.key);
    const patch = {};
    secrets.forEach((k) => {
      patch[k] = undefined;
    });
    form.setFieldsValue(patch);
  }, [activeGateway, gatewayMeta, form]);

  function existingForSelection() {
    const branchId = form.getFieldValue("branch_id");
    return accounts.find((a) => {
      if (a.gateway !== activeGateway) return false;
      if (ownerType === "company") return a.owner_type === "company";
      return a.owner_type === "branch" && Number(a.owner_id) === Number(branchId);
    });
  }

  function fillFromExisting() {
    const row = existingForSelection();
    if (!row) {
      message.info("No saved account for this owner + gateway yet.");
      return;
    }
    const patch = {
      is_enabled: !!row.is_enabled,
      is_default: !!row.is_default,
    };
    Object.entries(row.credentials || {}).forEach(([key, meta]) => {
      if (meta?.set && meta?.value !== undefined) {
        patch[key] = meta.value;
      }
    });
    form.setFieldsValue(patch);
    message.success("Loaded non-secret fields from saved account.");
  }

  async function save(values) {
    setSaving(true);
    try {
      const fields = gatewayMeta?.fields || [];
      const credentials = {};
      fields.forEach((f) => {
        const v = values[f.key];
        if (f.type === "boolean") {
          credentials[f.key] = v !== false;
          return;
        }
        if (v === undefined || v === null || v === "") return;
        credentials[f.key] = v;
      });

      if (values.owner_type === "company") {
        await api.post("/admin/payment-gateways/company", {
          gateway: activeGateway,
          is_enabled: values.is_enabled,
          is_default: values.is_default,
          credentials,
        });
      } else {
        const branchId = values.branch_id || myBranchId;
        if (!branchId) {
          message.error("Select a branch.");
          return;
        }
        await api.post(`/admin/payment-gateways/branches/${branchId}`, {
          gateway: activeGateway,
          is_enabled: values.is_enabled,
          is_default: values.is_default,
          credentials,
        });
      }

      message.success("Payment account saved (secrets encrypted).");
      const clearSecrets = {};
      fields.filter((f) => f.secret || f.type === "password").forEach((f) => {
        clearSecrets[f.key] = undefined;
      });
      form.setFieldsValue(clearSecrets);
      await loadAccounts();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors && JSON.stringify(e.response.data.errors)) ||
        "Save failed.";
      message.error(typeof msg === "string" ? msg : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const ownerOptions = useMemo(() => {
    const opts = [];
    if (canCompany) {
      opts.push({ value: "company", label: "Company (Tukaatu Express / super admin)" });
    }
    opts.push({ value: "branch", label: "Branch" });
    return opts;
  }, [canCompany]);

  const branchOptions = useMemo(() => {
    if (isBranchManager && myBranchId && !canCompany) {
      return [
        {
          value: Number(myBranchId),
          label: branchName ? `${branchName} (#${myBranchId})` : `Branch #${myBranchId}`,
        },
      ];
    }
    return (branches || []).map((b) => ({
      value: Number(b.id),
      label: `${b.name || b.code || "Branch"} (#${b.id})`,
    }));
  }, [branches, isBranchManager, myBranchId, branchName, canCompany]);

  const filteredAccounts = useMemo(() => {
    return (accounts || []).filter((a) => a.gateway === activeGateway);
  }, [accounts, activeGateway]);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <Title level={3} style={{ marginBottom: 4 }}>
          Payment Gateways
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Save company (Tukaatu Express) and branch credentials for HamroPay, eSewa, Khalti, and ConnectIPS.
          Settlement, commissions, and payouts will use these accounts after you configure them.
        </Paragraph>
      </div>

      <Alert
        type="info"
        showIcon
        message="Company vs branch"
        description={
          canCompany
            ? "Super admin saves the company account. Each branch can save its own. Secrets stay encrypted; leave password fields blank to keep existing values."
            : `You are scoped to your branch${branchName ? ` (${branchName})` : ""}. Only that branch account can be edited here.`
        }
      />

      <Card>
        <Tabs
          activeKey={activeGateway}
          onChange={setActiveGateway}
          items={gateways.map((g) => ({
            key: g.code,
            label: (
              <Space size={6}>
                <span>{g.label}</span>
                <Tag color={statusColor(g.status)}>{g.status}</Tag>
              </Space>
            ),
          }))}
        />

        {gatewayMeta?.description ? (
          <Paragraph type="secondary" style={{ marginTop: 8 }}>
            {gatewayMeta.description}
          </Paragraph>
        ) : null}

        <Form
          form={form}
          layout="vertical"
          onFinish={save}
          style={{ marginTop: 8 }}
          initialValues={{ owner_type: "branch", is_enabled: true, is_default: true, verify_ssl: true }}
        >
          <Form.Item name="gateway" hidden>
            <Input />
          </Form.Item>

          <Space wrap size="large" style={{ width: "100%" }} align="start">
            <Form.Item
              name="owner_type"
              label="Owner"
              rules={[{ required: true }]}
              style={{ minWidth: 280 }}
            >
              <Select
                options={ownerOptions}
                onChange={(v) => {
                  if (v === "branch" && myBranchId && !canCompany) {
                    form.setFieldsValue({ branch_id: Number(myBranchId) });
                  }
                }}
              />
            </Form.Item>

            {ownerType === "branch" ? (
              <Form.Item
                name="branch_id"
                label="Branch"
                rules={[{ required: true, message: "Select a branch" }]}
                style={{ minWidth: 280 }}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select branch"
                  options={branchOptions}
                  disabled={isBranchManager && !canCompany && !!myBranchId}
                />
              </Form.Item>
            ) : null}
          </Space>

          <Space wrap>
            {(gatewayMeta?.fields || []).map((f) => {
              if (f.type === "boolean") {
                return (
                  <Form.Item
                    key={f.key}
                    name={f.key}
                    label={f.label}
                    valuePropName="checked"
                    initialValue={f.default !== false}
                  >
                    <Switch />
                  </Form.Item>
                );
              }
              if (f.type === "password" || f.secret) {
                return (
                  <Form.Item
                    key={f.key}
                    name={f.key}
                    label={f.label}
                    style={{ minWidth: 280, flex: 1 }}
                  >
                    <Input.Password placeholder={f.placeholder || "Leave blank to keep existing"} />
                  </Form.Item>
                );
              }
              return (
                <Form.Item
                  key={f.key}
                  name={f.key}
                  label={f.label}
                  style={{ minWidth: 280, flex: 1 }}
                >
                  <Input placeholder={f.placeholder || undefined} />
                </Form.Item>
              );
            })}
          </Space>

          <Space size="large">
            <Form.Item name="is_enabled" label="Enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_default" label="Default for this owner" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>

          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save {gatewayMeta?.label || "account"}
            </Button>
            <Button onClick={fillFromExisting}>Load saved non-secrets</Button>
            <Button onClick={loadAccounts}>Refresh list</Button>
          </Space>
        </Form>
      </Card>

      <Card title={`Saved ${gatewayMeta?.label || "gateway"} accounts`} loading={loading}>
        {filteredAccounts.length === 0 && !loading ? (
          <Empty description={`No ${gatewayMeta?.label || "gateway"} accounts saved yet.`} />
        ) : (
          <Table
            rowKey="id"
            dataSource={filteredAccounts}
            pagination={false}
            columns={[
              {
                title: "Owner",
                render: (_, r) =>
                  r.owner_type === "company"
                    ? "Company"
                    : `Branch #${r.owner_id}`,
              },
              { title: "Gateway", dataIndex: "gateway" },
              {
                title: "Enabled",
                dataIndex: "is_enabled",
                render: (v) => (v ? <Tag color="green">yes</Tag> : <Tag>no</Tag>),
              },
              {
                title: "Default",
                dataIndex: "is_default",
                render: (v) => (v ? <Tag color="blue">default</Tag> : "-"),
              },
              {
                title: "Credentials",
                render: (_, r) =>
                  Object.entries(r.credentials || {})
                    .map(([k, meta]) => `${k}:${meta?.set ? (meta.masked || "set") : "-"}`)
                    .join(", ") || "-",
              },
              {
                title: "Updated",
                dataIndex: "updated_at",
                render: (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "-"),
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
