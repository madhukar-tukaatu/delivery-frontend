"use client";

import { useEffect, useState } from "react";
import {
  Col,
  Row,
  Space,
  Switch,
  Tag,
  Tabs,
  Typography,
  message,
} from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import {
  Button,
  Form,
  Input,
  Select,
  SimpleTablePageWithCRUD,
  StatusTag,
} from "@/components/PageTools";

const { Text } = Typography;

const SECTION_TABS = [
  { key: "admin", label: "Admin / Branch Manager" },
  { key: "staff", label: "Staff Portal" },
  { key: "merchant", label: "Merchant Portal" },
];

const ICON_OPTIONS = [
  "dashboard", "branches", "users", "roles", "menus", "merchants", "customers",
  "rates", "shipments", "pickups", "dispatches", "deliveries", "pod", "money",
  "settlements", "invoices", "webhooks", "reports", "support", "notifications",
  "settings", "refresh", "checklist", "location", "store", "package", "truck",
].map((v) => ({ value: v, label: v }));

export default function MenusPage() {
  const [section, setSection] = useState("admin");
  const [refresh, setRefresh] = useState(0);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    api.get("/admin/roles")
      .then((r) => setRoles(r.data?.data || []))
      .catch(() => {});
  }, []);

  const columns = [
    {
      title: "Label",
      dataIndex: "label",
      render: (v, r) => (
        <Space size={6}>
          <AppstoreOutlined style={{ color: "#6366f1" }} />
          <div>
            <Text strong style={{ fontSize: 13 }}>{v}</Text>
            <Text type="secondary" style={{ display: "block", fontSize: 11 }}>{r.path}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Section",
      dataIndex: "section",
      width: 110,
      render: (v) => <Tag color={v === "admin" ? "blue" : v === "staff" ? "orange" : "green"}>{v}</Tag>,
    },
    {
      title: "Permission",
      dataIndex: "permission",
      width: 180,
      render: (v) => v ? <Tag style={{ fontSize: 11 }}>{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Roles",
      dataIndex: "roles",
      render: (v) => {
        const list = Array.isArray(v) ? v : [];
        if (!list.length) return <Text type="secondary" style={{ fontSize: 11 }}>All</Text>;
        return (
          <Space size={[4, 4]} wrap>
            {list.slice(0, 4).map((r) => (
              <Tag key={r.id || r.name || r} style={{ margin: 0, fontSize: 10 }}>
                {r.label || r.name || r}
              </Tag>
            ))}
            {list.length > 4 && <Tag>+{list.length - 4}</Tag>}
          </Space>
        );
      },
    },
    {
      title: "Order",
      dataIndex: "sort_order",
      width: 70,
      render: (v) => <Text style={{ fontSize: 12 }}>{v ?? "—"}</Text>,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 90,
      render: (v, r) => (
        <Switch
          size="small"
          checked={!!v}
          onChange={(checked) =>
            api.patch(`/admin/menus/${r.id}`, { is_active: checked })
              .then(() => { message.success("Updated."); setRefresh(Date.now()); })
              .catch(() => message.error("Failed."))
          }
        />
      ),
    },
  ];

  const MenuForm = ({ record, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const isEdit = !!record;

    useEffect(() => {
      if (record) {
        form.setFieldsValue({
          ...record,
          role_ids: (record.roles || []).map((r) => r.id ?? r),
        });
      } else {
        form.setFieldsValue({ section, is_active: true, sort_order: 10 });
      }
    }, [record, form]);

    const handleSubmit = async (values) => {
      try {
        if (isEdit) {
          await api.put(`/admin/menus/${record.id}`, values);
          message.success("Menu updated.");
        } else {
          await api.post("/admin/menus", values);
          message.success("Menu created.");
        }
        setRefresh(Date.now());
        onSuccess?.();
      } catch (err) {
        message.error(err?.response?.data?.message || "Operation failed.");
      }
    };

    return (
      <Form layout="vertical" form={form} onFinish={handleSubmit}>
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="section" label="Section" rules={[{ required: true }]}>
              <Select options={SECTION_TABS.map((s) => ({ value: s.key, label: s.label }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="label" label="Label" rules={[{ required: true }]}>
              <Input placeholder="Shipments" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="path" label="Path">
              <Input placeholder="/admin/shipments" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="icon" label="Icon">
              <Select showSearch options={ICON_OPTIONS} placeholder="dashboard" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="permission" label="Required Permission">
              <Input placeholder="shipments.view" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="sort_order" label="Sort Order">
              <Input type="number" placeholder="10" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              name="role_ids"
              label="Visible to Roles"
              extra="Leave empty to show to all roles that have the required permission."
            >
              <Select
                mode="multiple"
                allowClear
                placeholder="All roles (leave empty)"
                options={roles.map((r) => ({ value: r.id, label: r.label || r.name }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Hidden" />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit">{isEdit ? "Update" : "Create"}</Button>
        </div>
      </Form>
    );
  };

  return (
    <div>
      <Tabs
        activeKey={section}
        onChange={(k) => { setSection(k); setRefresh(Date.now()); }}
        items={SECTION_TABS.map((s) => ({ key: s.key, label: s.label }))}
        style={{ marginBottom: 0 }}
      />
      <SimpleTablePageWithCRUD
        key={section}
        title={`Menu Visibility — ${SECTION_TABS.find((s) => s.key === section)?.label}`}
        endpoint={`/admin/menus?section=${section}`}
        columns={columns}
        reloadKey={refresh}
        modalForm={<MenuForm />}
      />
    </div>
  );
}
