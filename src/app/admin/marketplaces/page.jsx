"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
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
import { PlusOutlined, ReloadOutlined, ApiOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import {
  createMarketplace,
  deleteMarketplace,
  listMarketplaces,
} from "@/services/admin/adminMarketplaceService";
import { usePermissions } from "@/hooks/usePermission";

const { Text } = Typography;

export default function MarketplacesPage() {
  const router = useRouter();
  const { loading: authLoading, can } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [urlFilter, setUrlFilter] = useState("all");
  const [form] = Form.useForm();

  const canView = can("marketplaces.view");
  const canCreate = can("marketplaces.create");
  const canDelete = can("marketplaces.delete");

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (activeFilter === "active") params.is_active = 1;
      if (activeFilter === "inactive") params.is_active = 0;
      if (urlFilter === "yes") params.has_api_url = 1;
      if (urlFilter === "no") params.has_api_url = 0;
      setRows(await listMarketplaces(params));
    } catch (e) {
      message.error(e?.response?.data?.message || "Could not load marketplaces.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canView, search, activeFilter, urlFilter]);

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

  function onDelete(row) {
    Modal.confirm({
      title: `Delete ${row.name}?`,
      content:
        "This removes the marketplace and its issued API keys. Delete is blocked while stores or shipments are still attached.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteMarketplace(row.id);
          message.success("Marketplace deleted.");
          await load();
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

  if (authLoading) return <Card loading />;
  if (!canView) {
    return (
      <Card>
        <Text type="danger">You do not have marketplaces.view.</Text>
      </Card>
    );
  }

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (value, row) => (
        <div>
          <Text strong>{value}</Text>
          <div>
            {row.is_default ? <Tag color="blue">default</Tag> : null}
            {row.is_active ? <Tag color="green">active</Tag> : <Tag>inactive</Tag>}
          </div>
        </div>
      ),
    },
    {
      title: "Code",
      dataIndex: "code",
      width: 200,
      render: (value) => <Text code>{value}</Text>,
    },
    {
      title: "API base URL",
      dataIndex: "api_base_url",
      render: (value) => value || "-",
    },
    {
      title: "Active key prefix",
      dataIndex: "issued_key_prefix",
      width: 200,
      render: (value) => (value ? <Text code>{value}</Text> : <Tag>no key</Tag>),
    },
    {
      title: "Stores",
      dataIndex: "merchants_count",
      width: 90,
      render: (value) => value ?? 0,
    },
    {
      title: "",
      width: 160,
      render: (_, row) => (
        <Space size={0}>
          <Button type="link" onClick={() => router.push(`/admin/marketplaces/${row.id}`)}>
            View
          </Button>
          {canDelete ? (
            <Button type="link" danger onClick={() => onDelete(row)}>
              Delete
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Marketplaces"
        subtitle="api.tukaatu.com and api.fca.com.np. Online POD uses each marketplace API base URL and the issued key prefix shown here. Secrets are never listed."
        icon={<ApiOutlined />}
        actions={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
              Refresh
            </Button>
            {canCreate ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
                Add marketplace
              </Button>
            ) : null}
          </Space>
        }
      />

      <Card>
        <Space wrap style={{ marginBottom: 12 }}>
          <Input.Search
            allowClear
            placeholder="Search name or code"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => setSearch(value || "")}
            style={{ width: 280 }}
          />
          <Select
            value={activeFilter}
            onChange={setActiveFilter}
            style={{ width: 160 }}
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <Select
            value={urlFilter}
            onChange={setUrlFilter}
            style={{ width: 180 }}
            options={[
              { value: "all", label: "API URL: any" },
              { value: "yes", label: "Has API URL" },
              { value: "no", label: "No API URL" },
            ]}
          />
        </Space>
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
          <Form.Item name="code" label="Code" rules={[{ required: true }]} extra="Stable slug, for example fca-marketplace">
            <Input placeholder="fca-marketplace" />
          </Form.Item>
          <Form.Item name="email" label="Billing email">
            <Input placeholder="billing@example.com" />
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
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="After create, open the marketplace and reissue the API key. That issued key is what the partner and Online POD use."
          />
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
