"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, KeyOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import {
  deleteMarketplace,
  getMarketplace,
  reissueMarketplaceApiKey,
  saveMarketplaceHamroPay,
  syncMarketplaceStores,
  updateMarketplace,
} from "@/services/admin/adminMarketplaceService";
import { getMerchants } from "@/services/merchant/merchantService";
import { usePermissions } from "@/hooks/usePermission";

const { Title, Text } = Typography;

const HAMRO_FIELDS = [
  { key: "api_base_url", label: "API base URL", secret: false },
  { key: "gateway_url", label: "Gateway / checkout URL", secret: false },
  { key: "merchant_id", label: "HQ Merchant ID", secret: false },
  { key: "client_id", label: "Client ID", secret: false },
  { key: "client_api_key", label: "Client API key", secret: true },
  { key: "secret", label: "Secret", secret: true },
  { key: "webhook_secret", label: "Webhook secret", secret: true },
];

function yesNo(value) {
  return value ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>;
}

function copyText(label, value) {
  if (!value) return;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(
      () => message.success(`${label} copied`),
      () => message.info(value)
    );
  } else {
    message.info(value);
  }
}

/* Compact marketplace read view — fits in one viewport */
export default function MarketplaceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading: authLoading, can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPay, setSavingPay] = useState(false);
  const [reissuing, setReissuing] = useState(false);
  const [payload, setPayload] = useState(null);
  const [allMerchants, setAllMerchants] = useState([]);
  const [attachIds, setAttachIds] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [revealedCreds, setRevealedCreds] = useState(null);
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();

  const canUpdate = can("marketplaces.update");
  const canDelete = can("marketplaces.delete");
  const canHamro = can("marketplaces.hamropay");
  const canStores = can("marketplaces.stores");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMarketplace(id);
      setPayload(data);
      const marketplace = data?.marketplace || {};
      form.setFieldsValue({
        name: marketplace.name,
        code: marketplace.code,
        email: marketplace.email,
        api_base_url: marketplace.api_base_url,
        callback_url: marketplace.callback_url,
        is_active: !!marketplace.is_active,
        is_default: !!marketplace.is_default,
        callback_secret: undefined,
      });
      const creds = data?.hamropay_account?.credentials || {};
      const payVals = { is_enabled: data?.hamropay_account?.is_enabled ?? true, verify_ssl: true };
      HAMRO_FIELDS.forEach((field) => {
        if (!field.secret && creds[field.key]?.value !== undefined) {
          payVals[field.key] = creds[field.key].value;
        }
      });
      payForm.setFieldsValue(payVals);
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load marketplace.");
    } finally {
      setLoading(false);
    }
  }, [id, form, payForm]);

  useEffect(() => {
    if (authLoading || !can("marketplaces.view")) return;
    load();
    getMerchants({ page: 1, per_page: 100 })
      .then((result) => setAllMerchants(result?.list || []))
      .catch(() => setAllMerchants([]));
  }, [authLoading, can, load]);

  async function onSaveMeta(values) {
    setSaving(true);
    try {
      const body = { ...values };
      if (!body.callback_secret) delete body.callback_secret;
      await updateMarketplace(id, body);
      message.success("Marketplace saved.");
      setEditOpen(false);
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
      HAMRO_FIELDS.forEach((field) => {
        const value = values[field.key];
        if (value === undefined || value === null || value === "") return;
        credentials[field.key] = value;
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
      setPayOpen(false);
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

  async function onDetach(merchantId) {
    try {
      await syncMarketplaceStores(id, [merchantId], "detach");
      message.success("Store detached.");
      await load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Detach failed.");
    }
  }

  function onReissue() {
    Modal.confirm({
      title: "Reissue marketplace API key?",
      content:
        "The current active key will be revoked. Share the new key and secret with the marketplace partner right away, or their shipment and pickup calls will fail.",
      okText: "Reissue key",
      okButtonProps: { danger: true },
      onOk: async () => {
        setReissuing(true);
        try {
          const result = await reissueMarketplaceApiKey(id, { environment: "test" });
          setRevealedCreds(result);
          message.success("API key reissued. Copy credentials now.");
          await load();
        } catch (e) {
          message.error(e?.response?.data?.message || "Reissue failed.");
          throw e;
        } finally {
          setReissuing(false);
        }
      },
    });
  }

  function onDelete() {
    const name = payload?.marketplace?.name || "this marketplace";
    Modal.confirm({
      title: `Delete ${name}?`,
      content:
        "Delete is blocked while stores or shipments are still attached. Issued API keys for this marketplace are removed with it.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteMarketplace(id);
          message.success("Marketplace deleted.");
          router.push("/admin/marketplaces");
        } catch (e) {
          const extra = e?.response?.data?.errors;
          const detail =
            extra && (extra.merchants || extra.shipments)
              ? ` Stores: ${extra.merchants ?? 0}. Shipments: ${extra.shipments ?? 0}.`
              : "";
          message.error((e?.response?.data?.message || "Delete failed.") + detail);
          throw e;
        }
      },
    });
  }

  if (authLoading) {
    return (
      <div style={{ height: "calc(100vh - 120px)", padding: 12 }}>
        <Card loading size="small" />
      </div>
    );
  }

  if (!can("marketplaces.view")) {
    return (
      <div style={{ height: "calc(100vh - 120px)", padding: 12 }}>
        <Alert type="error" showIcon message="You do not have marketplaces.view." />
      </div>
    );
  }

  const marketplace = payload?.marketplace;
  const stores = payload?.stores || [];
  const hamro = payload?.hamropay_account;
  const keyPrefix = marketplace?.issued_key_prefix || marketplace?.issued_api_key?.key_prefix;
  const canSendKey = marketplace?.issued_key_sendable ?? marketplace?.issued_api_key?.key_encrypted_set;

  return (
    <div
      style={{
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 12,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Dense header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <Space size={8} wrap>
          <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => router.push("/admin/marketplaces")} />
          <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>
            {marketplace?.name || "Marketplace"}
          </Title>
          {marketplace?.code ? (
            <Text code style={{ fontSize: 12 }}>
              {marketplace.code}
            </Text>
          ) : null}
          {marketplace?.is_default ? <Tag color="blue">default</Tag> : null}
          {marketplace?.is_active ? <Tag color="green">active</Tag> : <Tag>inactive</Tag>}
          {keyPrefix ? (
            <Tag color={canSendKey === false ? "orange" : "geekblue"}>key {keyPrefix}</Tag>
          ) : (
            <Tag>no API key</Tag>
          )}
          <Tag>{stores.length} stores</Tag>
          <Tag>{payload?.shipments_count ?? 0} shipments</Tag>
        </Space>
        <Space size={6} wrap>
          {canUpdate ? (
            <Button size="small" icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          ) : null}
          {canUpdate ? (
            <Button size="small" icon={<KeyOutlined />} loading={reissuing} onClick={onReissue}>
              Reissue key
            </Button>
          ) : null}
          {canHamro ? (
            <Button size="small" onClick={() => setPayOpen(true)}>
              HamroPay
            </Button>
          ) : null}
          {canDelete ? (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete}>
              Delete
            </Button>
          ) : null}
        </Space>
      </div>

      {canSendKey === false ? (
        <Alert
          type="info"
          showIcon
          style={{ flexShrink: 0, padding: "4px 12px" }}
          message="Online POD still works: the current key is hash-only, so pod-qr is called without X-Tukaatu-Key. Reissue the key only if this marketplace requires it."
        />
      ) : null}

      {/* Details grid — 2 columns, compact */}
      <Card
        size="small"
        loading={loading}
        title="Details"
        styles={{ body: { padding: "8px 12px" }, header: { minHeight: 36, padding: "0 12px" } }}
        style={{ flexShrink: 0 }}
      >
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 2 }}
          bordered
          labelStyle={{ width: 140, padding: "4px 8px", fontSize: 12 }}
          contentStyle={{ padding: "4px 8px", fontSize: 12 }}
        >
          <Descriptions.Item label="API base URL">
            {marketplace?.api_base_url ? (
              <Text
                copyable={{ text: marketplace.api_base_url }}
                style={{ fontSize: 12 }}
                ellipsis={{ tooltip: marketplace.api_base_url }}
              >
                {marketplace.api_base_url}
              </Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Callback URL">
            {marketplace?.callback_url ? (
              <Text
                copyable={{ text: marketplace.callback_url }}
                style={{ fontSize: 12 }}
                ellipsis={{ tooltip: marketplace.callback_url }}
              >
                {marketplace.callback_url}
              </Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="POD request URL">
            {marketplace?.pod_payment_request_url ? (
              <Text
                copyable={{ text: marketplace.pod_payment_request_url }}
                style={{ fontSize: 12 }}
                ellipsis={{ tooltip: marketplace.pod_payment_request_url }}
              >
                {marketplace.pod_payment_request_url}
              </Text>
            ) : (
              <Text type="secondary">Set an API base URL</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Billing email">{marketplace?.email || "—"}</Descriptions.Item>
          <Descriptions.Item label="Active">{yesNo(marketplace?.is_active)}</Descriptions.Item>
          <Descriptions.Item label="Default">{yesNo(marketplace?.is_default)}</Descriptions.Item>
          <Descriptions.Item label="Key prefix">
            {keyPrefix ? <Text code style={{ fontSize: 12 }}>{keyPrefix}</Text> : <Text type="secondary">No active key</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Callback secret">{yesNo(marketplace?.callback_secret_set)}</Descriptions.Item>
          <Descriptions.Item label="Stores">{stores.length}</Descriptions.Item>
          <Descriptions.Item label="Shipments">{payload?.shipments_count ?? 0}</Descriptions.Item>
        </Descriptions>
        <Text type="secondary" style={{ display: "block", marginTop: 6, fontSize: 11 }}>
          Online POD POSTs to the POD URL for every linked store. The issued key and secret are sent when available; a key is optional (marketplaces without a key, e.g. FCA, still work). Shipments are counted by the store&apos;s current marketplace. Full key/secret are never shown here.
        </Text>
      </Card>

      {/* Linked stores — fills remaining height; scroll inside table only */}
      <Card
        size="small"
        loading={loading}
        title={`Linked stores (${stores.length})`}
        styles={{
          body: {
            padding: 8,
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
          header: { minHeight: 36, padding: "0 12px", flexShrink: 0 },
        }}
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        {canStores ? (
          <Space wrap size={6} style={{ marginBottom: 8, flexShrink: 0 }}>
            <Select
              mode="multiple"
              size="small"
              style={{ minWidth: 280 }}
              placeholder="Attach stores"
              value={attachIds}
              onChange={setAttachIds}
              options={(allMerchants || []).map((merchant) => ({
                value: merchant.id,
                label: `${merchant.name} (${merchant.external_store_id || merchant.code || merchant.id})`,
              }))}
              filterOption={(input, option) =>
                String(option?.label || "").toLowerCase().includes(input.toLowerCase())
              }
            />
            <Button size="small" type="primary" onClick={onAttach} disabled={!attachIds.length}>
              Attach
            </Button>
          </Space>
        ) : null}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Table
            rowKey="id"
            size="small"
            dataSource={stores}
            pagination={false}
            sticky
            locale={{ emptyText: "No stores linked." }}
            columns={[
              {
                title: "Name",
                dataIndex: "name",
                ellipsis: true,
              },
              {
                title: "Store ID",
                dataIndex: "external_store_id",
                width: 140,
                render: (value) => value || "—",
              },
              {
                title: "Code",
                dataIndex: "code",
                width: 120,
                render: (value) => value || "—",
              },
              {
                title: "",
                width: 140,
                render: (_, row) => (
                  <Space size={0}>
                    <Button type="link" size="small" onClick={() => router.push(`/admin/merchants/${row.id}`)}>
                      Open
                    </Button>
                    {canStores ? (
                      <Button type="link" size="small" danger onClick={() => onDetach(row.id)}>
                        Detach
                      </Button>
                    ) : null}
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Modal
        title="Edit marketplace"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnClose={false}
      >
        <Form form={form} layout="vertical" size="small" onFinish={onSaveMeta}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Billing email">
            <Input />
          </Form.Item>
          <Form.Item name="api_base_url" label="API base URL">
            <Input placeholder="https://api.tukaatu.com" />
          </Form.Item>
          <Form.Item name="callback_url" label="Callback URL">
            <Input />
          </Form.Item>
          <Form.Item
            name="callback_secret"
            label="Callback secret"
            extra={marketplace?.callback_secret_set ? "Saved. Leave blank to keep." : "Not set."}
          >
            <Input.Password placeholder="Leave blank to keep existing" />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_default" label="Default" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="HamroPay credentials"
        open={payOpen}
        onCancel={() => setPayOpen(false)}
        onOk={() => payForm.submit()}
        confirmLoading={savingPay}
        okText="Save HamroPay"
      >
        {hamro ? (
          <Alert type="success" showIcon style={{ marginBottom: 12 }} message={`Saved account #${hamro.id}`} />
        ) : (
          <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="HamroPay is not configured for this marketplace." />
        )}
        <Form form={payForm} layout="vertical" size="small" onFinish={onSaveHamro}>
          {HAMRO_FIELDS.map((field) => (
            <Form.Item
              key={field.key}
              name={field.key}
              label={field.label}
              extra={field.secret ? "Leave blank to keep existing" : undefined}
            >
              {field.secret ? <Input.Password autoComplete="new-password" /> : <Input />}
            </Form.Item>
          ))}
          <Form.Item name="verify_ssl" label="Verify SSL" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_enabled" label="Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Copy marketplace credentials now"
        open={!!revealedCreds}
        onCancel={() => setRevealedCreds(null)}
        onOk={() => setRevealedCreds(null)}
        okText="I copied them"
        cancelButtonProps={{ style: { display: "none" } }}
        width={640}
        destroyOnClose
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={revealedCreds?.warning || "These values are shown only once."}
        />
        <Form layout="vertical" size="small">
          <Form.Item label="Public key (X-Tukaatu-Key)">
            <Input.TextArea
              value={revealedCreds?.public_key || ""}
              autoSize
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <Button
              size="small"
              style={{ marginTop: 4 }}
              onClick={() => copyText("Public key", revealedCreds?.public_key)}
            >
              Copy key
            </Button>
          </Form.Item>
          <Form.Item label="Secret (X-Tukaatu-Secret)">
            <Input.TextArea
              value={revealedCreds?.secret || ""}
              autoSize
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <Button
              size="small"
              style={{ marginTop: 4 }}
              onClick={() => copyText("Secret", revealedCreds?.secret)}
            >
              Copy secret
            </Button>
          </Form.Item>
          <Text type="secondary">Prefix: {revealedCreds?.key_prefix || "-"}</Text>
        </Form>
      </Modal>
    </div>
  );
}
