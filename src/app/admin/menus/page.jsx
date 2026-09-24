"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tabs,
  Tree,
  Typography,
  message,
} from "antd";
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";

const { Text } = Typography;

const SECTION_TABS = [
  { key: "all", label: "All menus" },
  { key: "admin", label: "Admin / Branch Manager" },
  { key: "staff", label: "Staff Portal" },
  { key: "merchant", label: "Merchant Portal" },
];

const REAL_SECTIONS = SECTION_TABS.filter((s) => s.key !== "all");

const SECTION_ROOT_PREFIX = "section-";

function isSectionRootKey(key) {
  return String(key || "").startsWith(SECTION_ROOT_PREFIX);
}

function sectionFromRootKey(key) {
  return String(key || "").slice(SECTION_ROOT_PREFIX.length);
}

function buildAllForest(flat = []) {
  return REAL_SECTIONS.map((s) => {
    const sectionRows = flat.filter((r) => r.section === s.key);
    return {
      key: SECTION_ROOT_PREFIX + s.key,
      id: SECTION_ROOT_PREFIX + s.key,
      label: s.label,
      path: null,
      section: s.key,
      isSectionRoot: true,
      is_active: true,
      permission: null,
      children: buildTree(sectionRows),
    };
  });
}

function findNodeSection(tree, key, inherited = null) {
  for (const node of tree) {
    const here = node.isSectionRoot ? node.section : (node.section ?? inherited);
    if (String(node.key) === String(key)) return here;
    if (node.children?.length) {
      const found = findNodeSection(node.children, key, here);
      if (found) return found;
    }
  }
  return null;
}

const ICON_OPTIONS = [
  "dashboard", "branches", "users", "roles", "menus", "merchants", "customers",
  "rates", "shipments", "pickups", "dispatches", "deliveries", "pod", "money",
  "settlements", "invoices", "webhooks", "reports", "support", "notifications",
  "settings", "refresh", "checklist", "location", "store", "package", "truck",
  "transfer", "api",
].map((v) => ({ value: v, label: v }));

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function buildTree(flat = []) {
  const byId = new Map();
  flat.forEach((row) => {
    byId.set(row.id, {
      ...row,
      key: String(row.id),
      children: [],
    });
  });

  const roots = [];
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (nodes) => {
    nodes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
    nodes.forEach((n) => {
      if (n.children?.length) sortRec(n.children);
      else delete n.children;
    });
  };
  sortRec(roots);
  return roots;
}

function flattenWithMeta(nodes, parentId = null, acc = []) {
  nodes.forEach((node, index) => {
    acc.push({
      id: Number(node.key ?? node.id),
      parent_id: parentId,
      sort_order: index * 10,
    });
    if (node.children?.length) {
      flattenWithMeta(node.children, Number(node.key ?? node.id), acc);
    }
  });
  return acc;
}

export default function MenusPage() {
  const [section, setSection] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const isAll = section === "all";

  const loadMenus = useCallback(async () => {
    setLoading(true);
    try {
      const url = isAll
        ? "/admin/menus?per_page=500"
        : `/admin/menus?section=${section}&per_page=200`;
      const res = await api.get(url);
      const list = unwrapList(res.data);
      setRows(list);
      setTreeData(isAll ? buildAllForest(list) : buildTree(list));
    } catch {
      message.error("Failed to load menus.");
      setRows([]);
      setTreeData([]);
    } finally {
      setLoading(false);
    }
  }, [section, isAll]);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const parentOptions = useMemo(() => {
    const scopeSection = editing?.section || (isAll ? null : section);
    return rows
      .filter((r) => !editing || r.id !== editing.id)
      .filter((r) => !r.parent_id)
      .filter((r) => !scopeSection || r.section === scopeSection)
      .map((r) => ({
        value: r.id,
        label: r.path
          ? `${r.label} (${r.path})`
          : (isAll ? `${r.label} [${r.section}]` : r.label),
      }));
  }, [rows, editing, isAll, section]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      section: isAll ? "admin" : section,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      section: record.section,
      label: record.label,
      path: record.path,
      icon: record.icon,
      permission: record.permission,
      parent_id: record.parent_id ?? undefined,
      is_active: !!record.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        parent_id: values.parent_id || null,
        path: values.path || null,
        permission: values.permission || null,
        icon: values.icon || null,
      };
      if (editing) {
        await api.put(`/admin/menus/${editing.id}`, payload);
        message.success("Menu updated.");
      } else {
        await api.post("/admin/menus", payload);
        message.success("Menu created.");
      }
      setModalOpen(false);
      loadMenus();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || "Save failed.");
    }
  };

  const handleDelete = async (record) => {
    try {
      await api.delete(`/admin/menus/${record.id}`);
      message.success("Menu deleted.");
      loadMenus();
    } catch (err) {
      message.error(err?.response?.data?.message || "Delete failed.");
    }
  };

  const toggleActive = async (record, checked) => {
    try {
      await api.put(`/admin/menus/${record.id}`, {
        section: record.section,
        label: record.label,
        path: record.path || null,
        icon: record.icon || null,
        permission: record.permission || null,
        parent_id: record.parent_id || null,
        sort_order: record.sort_order ?? 0,
        is_active: checked,
      });
      message.success("Updated.");
      loadMenus();
    } catch {
      message.error("Failed to update status.");
    }
  };

  const onDrop = async (info) => {
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split("-");
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const loop = (data, key, callback) => {
      for (let i = 0; i < data.length; i += 1) {
        if (data[i].key === key) {
          callback(data[i], i, data);
          return;
        }
        if (data[i].children) {
          loop(data[i].children, key, callback);
        }
      }
    };

    const data = structuredClone(treeData);
    let dragObj;
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj);
      });
    } else if (
      (info.node.children || []).length > 0 &&
      info.node.expanded &&
      dropPosition === 1
    ) {
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        item.children.unshift(dragObj);
      });
    } else {
      let ar = [];
      let i = 0;
      loop(data, dropKey, (_item, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj);
      } else {
        ar.splice(i + 1, 0, dragObj);
      }
    }

    // All tab: virtual section roots are not DB parents; reorder only within one section.
    if (isAll) {
      if (isSectionRootKey(dragKey)) {
        message.warning("Section headers cannot be moved.");
        loadMenus();
        return;
      }
      const dragSection = findNodeSection(treeData, dragKey);
      const dropSection = isSectionRootKey(dropKey)
        ? sectionFromRootKey(dropKey)
        : findNodeSection(treeData, dropKey);
      if (!dragSection || !dropSection || dragSection !== dropSection) {
        message.warning("Drag within the same section only.");
        loadMenus();
        return;
      }
      const sectionRoot = data.find((n) => n.key === SECTION_ROOT_PREFIX + dragSection);
      if (!sectionRoot) {
        loadMenus();
        return;
      }
      setTreeData(data);
      const payload = flattenWithMeta(sectionRoot.children || []);
      setSaving(true);
      try {
        await api.post("/admin/menus/reorder", {
          section: dragSection,
          items: payload,
        });
        message.success("Order saved.");
        loadMenus();
      } catch (err) {
        message.error(err?.response?.data?.message || "Reorder failed.");
        loadMenus();
      } finally {
        setSaving(false);
      }
      return;
    }

    setTreeData(data);
    const payload = flattenWithMeta(data);
    setSaving(true);
    try {
      await api.post("/admin/menus/reorder", { section, items: payload });
      message.success("Order saved.");
      loadMenus();
    } catch (err) {
      message.error(err?.response?.data?.message || "Reorder failed.");
      loadMenus();
    } finally {
      setSaving(false);
    }
  };

  const titleRender = (node) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
        paddingRight: 8,
      }}
    >
      <Space size={8} style={{ minWidth: 0 }}>
        <AppstoreOutlined style={{ color: node.isSectionRoot ? "#0f766e" : "#6366f1" }} />
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: 13 }}>{node.label}</Text>
          {node.isSectionRoot ? (
            <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
              Section overview (virtual root)
            </Text>
          ) : node.path ? (
            <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
              {node.path}
            </Text>
          ) : (
            <Text type="secondary" style={{ display: "block", fontSize: 11 }}>
              Group (no path)
            </Text>
          )}
        </div>
        {node.permission ? (
          <Tag style={{ fontSize: 11 }}>{node.permission}</Tag>
        ) : null}
        {isAll && !node.isSectionRoot && node.section ? (
          <Tag color="blue" style={{ fontSize: 11 }}>{node.section}</Tag>
        ) : null}
      </Space>
      {node.isSectionRoot ? (
        <Button
          type="link"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setSection(node.section);
          }}
        >
          Open section
        </Button>
      ) : (
      <Space size={6} onClick={(e) => e.stopPropagation()}>
        <Switch
          size="small"
          checked={!!node.is_active}
          onChange={(checked) => toggleActive(node, checked)}
        />
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => openEdit(node)}
        />
        <Popconfirm
          title="Delete this menu?"
          description="Parents with children cannot be deleted."
          onConfirm={() => handleDelete(node)}
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
      )}
    </div>
  );

  return (
    <div>
      <Tabs
        activeKey={section}
        onChange={(k) => setSection(k)}
        items={SECTION_TABS.map((s) => ({ key: s.key, label: s.label }))}
        style={{ marginBottom: 12 }}
      />

      <Card
        title={`Menu tree — ${SECTION_TABS.find((s) => s.key === section)?.label}`}
        extra={
          <Space>
            <Button onClick={loadMenus} loading={loading || saving}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add menu
            </Button>
          </Space>
        }
        styles={{ body: { paddingTop: 12 } }}
      >
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          {isAll
            ? "All sections shown as collapsible roots. Drag within a section only; reorder posts with that item's real section."
            : "Drag items to reorder or nest under a parent. Pathless parents act as groups in the sidebar."}
        </Text>
        <Tree
          className="menu-admin-tree"
          treeData={treeData}
          draggable
          blockNode
          defaultExpandAll
          allowDrop={({ dragNode, dropNode }) => {
            if (!isAll) return true;
            if (isSectionRootKey(dragNode.key)) return false;
            const dragSec = findNodeSection(treeData, dragNode.key);
            const dropSec = isSectionRootKey(dropNode.key)
              ? sectionFromRootKey(dropNode.key)
              : findNodeSection(treeData, dropNode.key);
            return !!(dragSec && dropSec && dragSec === dropSec);
          }}
          onDrop={onDrop}
          titleRender={titleRender}
          style={{ background: "#fff" }}
        />
        {!loading && treeData.length === 0 ? (
          <Text type="secondary">No menus in this section yet.</Text>
        ) : null}
      </Card>

      <Modal
        title={editing ? "Edit menu" : "Create menu"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? "Update" : "Create"}
        destroyOnClose
        width={640}
      >
        <Form layout="vertical" form={form}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="section" label="Section" rules={[{ required: true }]}>
                <Select options={REAL_SECTIONS.map((s) => ({ value: s.key, label: s.label }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="label" label="Label" rules={[{ required: true }]}>
                <Input placeholder="Shipments" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="path"
                label="Path"
                extra="Leave empty for parent group menus."
              >
                <Input placeholder="/admin/shipments" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="icon" label="Icon">
                <Select showSearch allowClear options={ICON_OPTIONS} placeholder="dashboard" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="permission" label="Required Permission">
                <Input placeholder="shipments.view" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="parent_id"
                label="Parent"
                extra="Roots only. Leave empty for a top-level item."
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="None (root)"
                  options={parentOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="is_active" label="Active" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Hidden" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

    </div>
  );
}
