"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import {
  getMarketplace,
  saveMarketplaceHamroPay,
  syncMarketplaceStores,
  updateMarketplace,
} from "@/services/admin/adminMarketplaceService";
import { getMerchants } from "@/services/merchant/merchantService";

const { Title, Text, Paragraph } = Typography;

const HAMRO_FIELDS = [
  { key: "api_base_url", label: "API base URL", secret: false },
  { key: "gateway_url", label: "Gateway / checkout URL", secret: false },
  { key: "merchant_id", label: "HQ Merchant ID", secret: false },
  { key: "client_id", label: "Client ID", secret: false },
  { key: "client_api_key", label: "Client API key", secret: true },
  { key: "secret", label: "Secret", secret: true },
  { key: "webhook_secret", label: "Webhook secret", secret: true },
];

export default function MarketplaceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPay, setSavingPay] = useState(false);
  const [payload, setPayload] = useState(null);
  const [allMerchants, setAllMerchants] = useState([]);
  const [attachIds, setAttachIds] = useState([]);
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMarketplace(id);
      setPayload(data);
      const m = data?.marketplace || {};
      form.setFieldsValue({
        name: m.name,
        code: m.code,
        email: m.email,
        api_base_url: m.api_base_url,
        callback_url: m.callback_url,
        is_active: !!m.is_active,
        is_default: !!m.is_default,
        callback_secret: undefined,
      });
      const creds = data?.hamropay_account?.credentials || {};
      const payVals = { is_enabled: data?.hamropay_account?.is_enabled ?? true };
      HAMRO_FIELDS.forEach((f) => {
        if (!f.secret && creds[f.key]?.value !== undefined) payVals[f.key] = creds[f.key].value;
      });
      payForm.setFieldsValue(payVals);
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load marketplace.");
    } finally {
      setLoading(false);
    }
  }, [id, form, payForm]);

  useEffect(() => {
    load();
    getMerchants({ page: 1, per_page: 100 })
      .then((r) => setAllMerchants(r?.list || []))
      .catch(() => setAllMerchants([]));
  }, [load]);

  async function onSaveMeta(values) {
    setSaving(true);
    try {
      const body = { ...values };
      if (!body.callback_secret) delete body.callback_secret;
      await updateMarketplace(id, body);
      message.success("Marketplace saved.");
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveHamro(values) {
    setSavingPay(true);
    try {
      const credentials = {};
      HAMRO_FIELDS.forEach((f) => {
        const v = values[f.key];
        if (v === undefined || v === null || v === "") return;
        credentials[f.key] = v;
      });
      credentials.verify_ssl = values.verify_ssl !== false;
      await saveMarketplaceHamroPay(id, {
        is_enabled: values.is_enabled !== false,
        is_default: true,
        credentials,
      });
      message.success("HamroPay credentials saved for this marketplace.");
      payForm.setFieldsValue({
        client_api_key: undefined,
        secret: undefined,
        webhook_secret: undefined,
      });
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || "HamroPay save failed.");
    } finally {
      setSavingPay(false);
    }
  }

  async function onAttach() {
    if (!attachIds.length) return;
    try {
      await syncMarketplaceStores(id, attachIds, "attach");
      message.success("Stores attached.");
      setAttachIds([]);
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Attach failed.");
    }
  }

  const marketplace = payload?.marketplace;
  const stores = payload?.stores || [];
  const hamro = payload?.hamropay_account;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/admin/marketplaces")}>
          Back
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          {marketplace?.name || "Marketplace"}
        </Title>
        {marketplace?.is_default ? <Tag color="blue">default</Tag> : null}
      </Space>

      <Alert
        type="info"
        showIcon
        message="POD online payment"
        description="Phase 6 POD QR / staff payment-session uses this marketplace HamroPay account first (from the shipment store). Store sub-merchant id is on the merchant (hamropay_merchant_id or external_store_id)."
      />

      <Card title="API / callback" loading={loading}>
        <Form form={form} layout="vertical" onFinish={onSaveMeta}>
          <Space wrap size="large" style={{ width: "100%" }} align="start">
            <Form.Item name="name" label="Name" rules={[{ required: true }]} style={{ minWidth: 260 }}>
              <Input />
            </Form.Item>
            <Form.Item name="code" label="Code" rules={[{ required: true }]} style={{ minWidth: 220 }}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" style={{ minWidth: 260 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="api_base_url" label="API base URL" extra="e.g. https://api.tukaatu.com or https://api.fca.com.np">
            <Input />
          </Form.Item>
          <Form.Item name="callback_url" label="Callback URL" extra="Used when a store has no per-store integration_callback_url">
            <Input />
          </Form.Item>
          <Form.Item
            name="callback_secret"
            label="Callback secret"
            extra={marketplace?.callback_secret_set ? "Set — leave blank to keep" : "Not set"}
          >
            <Input.Password placeholder="Leave blank to keep existing" />
          </Form.Item>
          <Space>
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_default" label="Default" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            Save marketplace
          </Button>
        </Form>
      </Card>

      <Card
        title="HamroPay credentials (marketplace HQ)"
        loading={loading}
        extra={hamro ? <Tag color="green">saved #{hamro.id}</Tag> : <Tag>not configured</Tag>}
      >
        <Paragraph type="secondary">
          api_base_url, gateway_url, client_id, client_api_key, secret, merchant_id — required for POD when .env HAMROPAY_* is empty.
        </Paragraph>
        <Form form={payForm} layout="vertical" onFinish={onSaveHamro} initialValues={{ verify_ssl: true, is_enabled: true }}>
          {HAMRO_FIELDS.map((f) => (
            <Form.Item
              key={f.key}
              name={f.key}
              label={f.label}
              extra={f.secret ? "Leave blank to keep existing" : undefined}
            >
              {f.secret ? <Input.Password autoComplete="new-password" /> : <Input />}
            </Form.Item>
          ))}
          <Form.Item name="verify_ssl" label="Verify SSL" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_enabled" label="Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={savingPay}>
            Save HamroPay
          </Button>
        </Form>
      </Card>

      <Card title={`Stores (${stores.length})`} loading={loading}>
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            mode="multiple"
            style={{ minWidth: 360 }}
            placeholder="Attach merchants / stores"
            value={attachIds}
            onChange={setAttachIds}
            options={(allMerchants || []).map((m) => ({
              value: m.id,
              label: `${m.name} (${m.external_store_id || m.code || m.id})`,
            }))}
            filterOption={(input, opt) =>
              String(opt?.label || "").toLowerCase().includes(input.toLowerCase())
            }
          />
          <Button type="primary" onClick={onAttach} disabled={!attachIds.length}>
            Attach
          </Button>
        </Space>
        <Table
          rowKey="id"
          size="small"
          dataSource={stores}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "Store", dataIndex: "name" },
            { title: "Code", dataIndex: "code", width: 140 },
            { title: "external_store_id", dataIndex: "external_store_id", width: 160 },
            { title: "hamropay_merchant_id", dataIndex: "hamropay_merchant_id", width: 180 },
            {
              title: "",
              width: 90,
              render: (_, row) => (
                <Button type="link" onClick={() => router.push(`/admin/merchants/${row.id}`)}>
                  Edit
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}