"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  EyeOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import api from "@/lib/api";
import { usePermissions } from "@/hooks/usePermission";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import ExportImportToolbar from "@/components/admin/ui/ExportImportToolbar";

const { Text } = Typography;

const CUSTOMER_COLUMNS = [
  { key: "name", label: "Full Name", required: true, sampleValue: "Ram Sharma" },
  { key: "phone", label: "Phone", required: true, sampleValue: "9801234567" },
  { key: "email", label: "Email", required: false, sampleValue: "ram.sharma@example.com" },
  { key: "city", label: "City", required: false, sampleValue: "Kathmandu" },
  { key: "area", label: "Area", required: false, sampleValue: "New Road" },
  { key: "address", label: "Address", required: false, sampleValue: "House 12, Pipalbot" },
  { key: "merchant_id", label: "Merchant ID", required: false, sampleValue: "" },
];

const SAMPLE_ROWS = [
  {
    name: "Ram Sharma",
    phone: "9801234567",
    email: "ram.sharma@example.com",
    city: "Kathmandu",
    area: "New Road",
    address: "House 12, Pipalbot",
    merchant_id: "",
  },
  {
    name: "Sita Thapa",
    phone: "9841987654",
    email: "sita.thapa@example.com",
    city: "Pokhara",
    area: "Lakeside",
    address: "Street 4, Lakeside",
    merchant_id: "",
  },
];

export default function CustomersPage() {
  const { can, branchId } = usePermissions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async (page = 1, pageSize = 20, currentSearch = search) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: pageSize,
        search: currentSearch || undefined,
        q: currentSearch || undefined,
      };
      if (branchId) params.branch_id = branchId;
      const res = await api.get("/admin/customers", { params });
      const payload = res.data?.data || res.data;
      const list = payload?.data || payload || [];
      setRows(Array.isArray(list) ? list : []);
      setPagination({
        current: payload?.current_page || page,
        pageSize: payload?.per_page || pageSize,
        total: payload?.total || list.length,
      });
    } catch {
      message.error("Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, [branchId, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      await api.post("/admin/customers", values);
      message.success("Customer created.");
      setOpen(false);
      form.resetFields();
      load(1, pagination.pageSize);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to create customer.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Bulk import parsed customer rows from CSV
   */
  const handleImportCustomers = async (validRows) => {
    let successCount = 0;
    const errors = [];

    for (const row of validRows) {
      try {
        const payload = {
          name: row.name?.trim(),
          phone: row.phone?.trim(),
          email: row.email?.trim() || undefined,
          city: row.city?.trim() || undefined,
          area: row.area?.trim() || undefined,
          address: row.address?.trim() || undefined,
          merchant_id: row.merchant_id ? Number(row.merchant_id) : undefined,
        };
        await api.post("/admin/customers", payload);
        successCount++;
      } catch (err) {
        errors.push(`${row.name || "Customer"}: ${err?.response?.data?.message || "Failed"}`);
      }
    }

    if (errors.length > 0 && successCount === 0) {
      throw new Error(`Failed to import customers: ${errors.slice(0, 3).join("; ")}`);
    }

    if (errors.length > 0) {
      message.warning(`Imported ${successCount} customers. ${errors.length} rows had errors.`);
    }
    load(1, pagination.pageSize);
    return { successCount, errors };
  };

  /**
   * Fetch all matching records for full CSV export
   */
  const handleExportAll = async () => {
    try {
      const params = { page: 1, per_page: 1000, search: search || undefined };
      if (branchId) params.branch_id = branchId;
      const res = await api.get("/admin/customers", { params });
      const payload = res.data?.data || res.data;
      return payload?.data || payload || rows;
    } catch {
      return rows;
    }
  };

  const columns = [
    {
      title: "Name & Contact",
      dataIndex: "name",
      key: "name",
      render: (_, r) => (
        <Link
          href={`/admin/shipments?search=${encodeURIComponent(r.phone || r.name || "")}`}
          title="View customer shipments (Ctrl+click / right-click to open in new tab)"
        >
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 13, color: "#0891B2", cursor: "pointer" }}>
              {r.name || "-"}
            </Text>
            {r.email && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {r.email}
              </Text>
            )}
          </Space>
        </Link>
      ),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      render: (v) =>
        v ? (
          <a href={`tel:${v}`} style={{ fontFamily: "monospace", fontSize: 12, color: "#0F172A" }}>
            {v}
          </a>
        ) : (
          "-"
        ),
    },
    {
      title: "City / Area",
      key: "location",
      render: (_, r) => (
        <Space size={2} direction="vertical">
          <Text style={{ fontSize: 12 }}>{r.city || "-"}</Text>
          {r.area && <Text type="secondary" style={{ fontSize: 11 }}>{r.area}</Text>}
        </Space>
      ),
    },
    {
      title: "Associated Merchant",
      key: "merchant",
      render: (_, r) =>
        r.merchant_id ? (
          <Link
            href={`/admin/merchants/${r.merchant_id}`}
            title="View merchant (open in new tab)"
            style={{ fontSize: 12, color: "#0891B2" }}
          >
            {r.merchant?.name || r.merchant?.business_name || `Merchant #${r.merchant_id}`}
          </Link>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.merchant?.name || "-"}
          </Text>
        ),
    },
    {
      title: "Shipments",
      dataIndex: "shipments_count",
      key: "shipments_count",
      align: "center",
      render: (v, r) => (
        <Link
          href={`/admin/shipments?search=${encodeURIComponent(r.phone || r.name || "")}`}
          title="Filter shipments for this customer (open in new tab)"
        >
          <span className="ant-tag ant-tag-blue" style={{ borderRadius: 10, cursor: "pointer" }}>
            {v ?? 0} shipments
          </span>
        </Link>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 75,
      align: "center",
      render: (_, r) => (
        <Tooltip title="View customer shipments (open in new tab)">
          <Link href={`/admin/shipments?search=${encodeURIComponent(r.phone || r.name || "")}`}>
            <Button size="small" type="primary" ghost icon={<EyeOutlined />} />
          </Link>
        </Tooltip>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <AdminPageHeader
        title="Customers"
        subtitle="Manage customer records, search contacts, and bulk import/export customer data."
        icon={<TeamOutlined />}
        breadcrumb={[{ title: "Admin" }, { title: "Customers" }]}
        actions={
          <ExportImportToolbar
            entityTitle="Customers"
            columns={CUSTOMER_COLUMNS}
            data={rows}
            sampleRows={SAMPLE_ROWS}
            onExportAll={handleExportAll}
            onImport={can("customers.create") ? handleImportCustomers : null}
            onRefresh={() => load(pagination.current, pagination.pageSize)}
            onAdd={can("customers.create") ? () => setOpen(true) : null}
            addText="Add Customer"
            loading={loading}
          />
        }
      />

      {/* Compact Search & Filter Bar */}
      <div className="admin-toolbar-row">
        <div className="admin-toolbar-left">
          <Input
            allowClear
            size="small"
            style={{ width: 280 }}
            placeholder="Search name, phone, or email..."
            prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => load(1, pagination.pageSize, search)}
          />
          <Button
            size="small"
            type="primary"
            onClick={() => load(1, pagination.pageSize, search)}
            style={{ background: "#0891B2", borderColor: "#0891B2" }}
          >
            Search
          </Button>
          {search && (
            <Button
              size="small"
              onClick={() => {
                setSearch("");
                load(1, pagination.pageSize, "");
              }}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="admin-toolbar-right">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Total: <strong>{pagination.total}</strong> customers
          </Text>
        </div>
      </div>

      <Card className="admin-card" bodyStyle={{ padding: 0 }} style={{ width: "100%", overflow: "hidden" }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={rows}
          scroll={{ x: 750 }}
          size="small"
          className="admin-table-compact"
          pagination={{
            ...pagination,
            size: "small",
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            onChange: (p, ps) => load(p, ps, search),
          }}
        />
      </Card>

      <Modal
        open={open}
        title="Add New Customer"
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={500}
        okButtonProps={{ style: { background: "#0891B2", borderColor: "#0891B2" } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} size="small" style={{ marginTop: 12 }}>
          <Row gutter={10}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Full Name" rules={[{ required: true, message: "Required" }]}>
                <Input placeholder="Ram Sharma" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: "Required" }]}>
                <Input placeholder="9801234567" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email Address">
                <Input placeholder="ram@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="city" label="City">
                <Input placeholder="Kathmandu" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="area" label="Area / Locality">
                <Input placeholder="New Road" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="merchant_id" label="Merchant ID (Optional)">
                <Input placeholder="e.g. 5" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="address" label="Detailed Address">
                <Input.TextArea rows={2} placeholder="Building, Street, Landmark" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}
