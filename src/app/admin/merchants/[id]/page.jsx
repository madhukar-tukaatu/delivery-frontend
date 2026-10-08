"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import { getMerchant, updateMerchant } from "@/services/merchant/merchantService";
import { listMarketplaces } from "@/services/admin/adminMarketplaceService";

const { Title, Text } = Typography;

export default function MerchantDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [marketplaces, setMarketplaces] = useState([]);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, mps] = await Promise.all([
        getMerchant(id),
        listMarketplaces().catch(() => []),
      ]);
      setMerchant(m);
      setMarketplaces(Array.isArray(mps) ? mps : []);
      form.setFieldsValue({
        name: m?.name,
        code: m?.code,
        owner_name: m?.owner_name,
        contact_person: m?.contact_person,
        phone: m?.phone,
        email: m?.email,
        status: m?.status,
        marketplace_id: m?.marketplace_id || undefined,
        external_store_id: m?.external_store_id,
        external_platform: m?.external_platform,
        hamropay_merchant_id: m?.hamropay_merchant_id,
        hamropay_business_id: m?.hamropay_business_id,
        hamropay_qr_payload: m?.hamropay_qr_payload,
        bulk_pickup_discount_threshold: m?.bulk_pickup_discount_threshold,
        bulk_pickup_discount_amount: m?.bulk_pickup_discount_amount,
      });
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load merchant.");
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave(values) {
    setSaving(true);
    try {
      const updated = await updateMerchant(id, values);
      setMerchant(updated);
      message.success("Merchant / store updated.");
    } catch (e) {
      message.error(e?.response?.data?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/admin/merchants")}>
          Back
        </Button>
        <Title level={3} style={{ margin: 0 }}>
          {merchant?.name || "Merchant / Store"}
        </Title>
      </Space>

      <Alert
        type="info"
        showIcon
        message="HamroPay store sub-merchant"
        description="Set marketplace (Tukaatu / FCA), then hamropay_merchant_id from KYB — or external_store_id (STORE-#####). HQ signing keys are saved on Admin → Marketplaces, not in .env."
      />

      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Space wrap size="large" style={{ width: "100%" }} align="start">
            <Form.Item name="name" label="Name" rules={[{ required: true }]} style={{ minWidth: 260 }}>
              <Input />
            </Form.Item>
            <Form.Item name="code" label="Code" style={{ minWidth: 180 }}>
              <Input />
            </Form.Item>
            <Form.Item name="status" label="Status" style={{ minWidth: 160 }}>
              <Select
                options={[
                  { value: "pending", label: "pending" },
                  { value: "active", label: "active" },
                  { value: "suspended", label: "suspended" },
                  { value: "rejected", label: "rejected" },
                ]}
              />
            </Form.Item>
          </Space>

          <Space wrap size="large" style={{ width: "100%" }} align="start">
            <Form.Item name="owner_name" label="Owner" style={{ minWidth: 220 }}>
              <Input />
            </Form.Item>
            <Form.Item name="contact_person" label="Contact" style={{ minWidth: 220 }}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Phone" style={{ minWidth: 180 }}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email" style={{ minWidth: 240 }}>
              <Input />
            </Form.Item>
          </Space>

          <Card type="inner" title="Marketplace + HamroPay store IDs" style={{ marginBottom: 16 }}>
            <Form.Item
              name="marketplace_id"
              label="Marketplace"
              extra="Online POD calls this marketplace's API (pod-qr). Saving a new marketplace also moves this store's open shipments."
            >
              <Select
                allowClear
                placeholder="Select marketplace"
                options={(marketplaces || []).map((m) => ({
                  value: m.id,
                  label: `${m.name} (${m.code})`,
                }))}
              />
            </Form.Item>
            <Form.Item name="external_platform" label="External platform">
              <Input placeholder="store_manager" />
            </Form.Item>
            <Form.Item
              name="external_store_id"
              label="external_store_id"
              extra="e.g. STORE-00018 — used as sub-merchant when hamropay_merchant_id empty"
            >
              <Input />
            </Form.Item>
            <Form.Item name="hamropay_merchant_id" label="hamropay_merchant_id (KYB sub-merchant)">
              <Input />
            </Form.Item>
            <Form.Item name="hamropay_business_id" label="hamropay_business_id">
              <Input />
            </Form.Item>
            <Form.Item name="hamropay_qr_payload" label="Static HamroPay QR payload (optional fallback)">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Card>

          <Space wrap>
            <Form.Item name="bulk_pickup_discount_threshold" label="Bulk pickup threshold">
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="bulk_pickup_discount_amount" label="Bulk pickup discount amount">
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
          </Space>

          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            Save store
          </Button>
        </Form>
      </Card>
    </Space>
  );
}