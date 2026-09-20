"use client";

import { useEffect, useState } from "react";
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
  message,
} from "antd";
import api from "@/lib/api";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

export default function PaymentGatewaysPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const gateway = Form.useWatch("gateway", form) || "hamropay";

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/admin/payment-gateways/accounts");
      setAccounts(unwrap(res) || []);
    } catch (e) {
      message.error(e?.response?.data?.message || "Load failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    form.setFieldsValue({ gateway: "hamropay", owner_type: "company", is_enabled: true, is_default: true });
  }, []);

  async function save(values) {
    try {
      const credentials = {
        api_base_url: values.api_base_url,
        gateway_url: values.gateway_url,
        client_id: values.client_id,
        client_api_key: values.client_api_key,
        secret: values.secret,
        merchant_id: values.merchant_id,
        webhook_secret: values.webhook_secret,
        verify_ssl: values.verify_ssl !== false,
      };
      if (values.owner_type === "company") {
        await api.post("/admin/payment-gateways/company", {
          gateway: values.gateway,
          is_enabled: values.is_enabled,
          is_default: values.is_default,
          credentials,
        });
      } else {
        await api.post(`/admin/payment-gateways/branches/${values.branch_id}`, {
          gateway: values.gateway,
          is_enabled: values.is_enabled,
          is_default: values.is_default,
          credentials,
        });
      }
      message.success("Payment account saved (encrypted).");
      form.setFieldsValue({ secret: undefined, client_api_key: undefined, webhook_secret: undefined });
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Save failed.");
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Company vs branch payment accounts"
        description="Superadmin saves the Tukaatu Express company HamroPay account. Each branch saves its own. Leave secret fields blank to keep existing values. eSewa / Khalti / ConnectIPS use the same account shape later."
      />

      <Card title="Save gateway account">
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="owner_type" label="Owner" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "company", label: "Company (Tukaatu Express / superadmin)" },
                { value: "branch", label: "Branch" },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {() =>
              form.getFieldValue("owner_type") === "branch" ? (
                <Form.Item name="branch_id" label="Branch ID" rules={[{ required: true }]}>
                  <Input type="number" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="gateway" label="Gateway" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "hamropay", label: "HamroPay" },
                { value: "esewa", label: "eSewa (soon)" },
                { value: "khalti", label: "Khalti (soon)" },
                { value: "connectips", label: "ConnectIPS (soon)" },
              ]}
            />
          </Form.Item>
          {gateway === "hamropay" ? (
            <>
              <Form.Item name="api_base_url" label="API base URL">
                <Input placeholder="https://..." />
              </Form.Item>
              <Form.Item name="gateway_url" label="Gateway URL">
                <Input />
              </Form.Item>
              <Form.Item name="merchant_id" label="Merchant ID">
                <Input />
              </Form.Item>
              <Form.Item name="client_id" label="Client ID">
                <Input />
              </Form.Item>
              <Form.Item name="client_api_key" label="Client API Key (secret)">
                <Input.Password placeholder="Leave blank to keep existing" />
              </Form.Item>
              <Form.Item name="secret" label="Secret (secret)">
                <Input.Password placeholder="Leave blank to keep existing" />
              </Form.Item>
              <Form.Item name="webhook_secret" label="Webhook secret">
                <Input.Password placeholder="Leave blank to keep existing" />
              </Form.Item>
            </>
          ) : (
            <Alert type="warning" message={`${gateway} driver credentials UI is ready; payout API wiring comes next.`} />
          )}
          <Space>
            <Form.Item name="is_enabled" label="Enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="is_default" label="Default" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <div>
            <Button type="primary" htmlType="submit">
              Save account
            </Button>
          </div>
        </Form>
      </Card>

      <Card title="Saved accounts" loading={loading}>
        <Table
          rowKey="id"
          dataSource={accounts}
          columns={[
            { title: "Owner", render: (_, r) => `${r.owner_type}${r.owner_id ? `#${r.owner_id}` : ""}` },
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
                Object.keys(r.credentials || {})
                  .map((k) => `${k}:${r.credentials[k].set ? "set" : "-"}`)
                  .join(", "),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
