"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PlusOutlined, ReloadOutlined, ApiOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import {
  createMarketplace,
  listMarketplaces,
} from "@/services/admin/adminMarketplaceService";
import { usePermissions } from "@/hooks/usePermission";

const { Text } = Typography;

export default function MarketplacesPage() {
  const router = useRouter();
  const { loading: authLoading, isSuperAdmin, can } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const canView = isSuperAdmin || can("marketplaces.view");

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      setRows(await listMarketplaces());
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load marketplaces.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (!authLoading && canView) load();
  }, [authLoading, canView, load]);

  async function onCreate(values) {
    setSaving(true);
    try {
      const row = await createMarketplace(values);
      message.success("Marketplace created.");
      setOpen(false);
      form.resetFields();
      await load();
      if (row?.id) router.push(`/admin/marketplaces/${row.id}`);
    } catch (e) {
      message.error(e?.response?.data?.message || "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return <Card loading />;
  if (!canView) {
    return (
      <Card>
        <Text type="danger">You do not have permission to manage marketplaces.</Text>
      </Card>
    );
  }

  const columns = [
    {
      title: "Marketplace",
      dataIndex: "name",
      render: (v, row) => (
        <div>
          <Text strong>{v}</Text>
          <div>
            <Tag style={{ marginTop: 4 }}>{row.code}</Tag>
            {row.is_default ? <Tag color="blue">default</Tag> : null}
          </div>
        </div>
      ),
    },
    {
      title: "API base",
      dataIndex: "api_base_url",
      render: (v) => <Text style={{ fontSize: 12 }}>{v || "-"}</Text>,
    },
    {
      title: "Callback URL",
      dataIndex: "callback_url",
      ellipsis: true,
      render: (v) => <Text style={{ fontSize: 12 }}>{v || "-"}</Text>,
    },
    {
      title: "Stores",
      dataIndex: "merchants_count",
      width: 90,
      render: (v) => v ?? 0,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 100,
      render: (v) => (v ? <Tag color="green">active</Tag> : <Tag>inactive</Tag>),
    },
    {
      title: "",
      width: 90,
      render: (_, row) => (
        <Button type="link" onClick={() => router.push(`/admin/marketplaces/${row.id}`)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Marketplaces"
        subtitle="Configure each marketplace API/callback base and HamroPay HQ credentials (Tukaatu, FCA, …). POD resolves marketplace + store from the shipment."
        icon={<ApiOutlined />}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Add marketplace
            </Button>
          </Space>
        }
      />

      <Alert
        type="info"
        showIcon
        message="Multi-marketplace POD"
        description="Save HamroPay under each marketplace (API base, gateway URL, client id, api key, secret, HQ merchant id). Assign stores on the marketplace detail or merchant page. Missing .env alone does not block when admin credentials exist."
      />

      <Card>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={rows} pagination={false} />
      </Card>

      <Modal
        title="New marketplace"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onCreate} initialValues={{ is_active: true, is_default: false }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="FCA Marketplace" />
          </Form.Item>
          <Form.Item name="code" label="Code" rules={[{ required: true }]} extra="Stable slug, e.g. fca-marketplace">
            <Input placeholder="fca-marketplace" />
          </Form.Item>
          <Form.Item name="api_base_url" label="API base URL">
            <Input placeholder="https://api.fca.com.np" />
          </Form.Item>
          <Form.Item name="callback_url" label="Callback URL">
            <Input placeholder="https://api.fca.com.np/api/v1/integrations/tukaatu-express/callbacks" />
          </Form.Item>
          <Form.Item name="callback_secret" label="Callback secret">
            <Input.Password placeholder="Shared webhook secret" />
          </Form.Item>
          <Form.Item name="is_default" label="Default marketplace" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}