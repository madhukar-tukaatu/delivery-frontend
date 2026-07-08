"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Button,
  Form,
  Input,
  Select,
  SimpleTablePageWithCRUD,
  StatusTag,
  message,
} from "@/components/PageTools";
import { PlusOutlined } from "@ant-design/icons";

export default function UsersPage() {
  const [refresh, setRefresh] = useState(0);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [merchants, setMerchants] = useState([]);

  // Fetch supporting data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, branchesRes, merchantsRes] = await Promise.all([
          api.get("/admin/roles"),
          api.get("/admin/branches?per_page=100"),     // Increased limit
          api.get("/admin/merchants?per_page=100"),    // Increased limit
        ]);

        // FIXED: Handle consistent API response structure
        setRoles(rolesRes.data?.data || []);
        
        // Branches & Merchants may return { success, data, message }
        setBranches(branchesRes.data?.data.data || branchesRes.data.data || []);
        setMerchants(merchantsRes.data?.data.data || merchantsRes.data.data || []);

      } catch (err) {
        console.error("Failed to load supporting data", err);
        message.error("Failed to load roles/branches/merchants");
      }
    };

    fetchData();
  }, []);

  console.log("Roles:", roles);
  console.log("Branches:", branches);
  console.log("Merchants:", merchants);

  const columns = [
    { title: "Name", dataIndex: "name", sorter: true },
    { title: "Email", dataIndex: "email", sorter: true },
    { title: "Phone", dataIndex: "phone" },
    { 
      title: "Role", 
      dataIndex: "role",
      render: (role) => role?.label || role?.name || role 
    },
    { 
      title: "Branch", 
      render: (_, r) => r.branch?.name || r.branch_id || "-" 
    },
    { 
      title: "Merchant", 
      render: (_, r) => r.merchant?.name || r.merchant_id || "-" 
    },
    {
      title: "Active",
      dataIndex: "is_active",
      render: (v) => <StatusTag value={v ? "active" : "inactive"} />,
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
    },
    {
      title: "Action",
      width: 180,
      render: (_, row) => (
        <div className="flex gap-2">
          <Button 
            size="small"
            onClick={() => api.post(`/admin/users/${row.id}/toggle`).then(() => {
              message.success("Status toggled successfully");
              setRefresh(Date.now());
            })}
          >
            Toggle
          </Button>
        </div>
      ),
    },
  ];

  // Enhanced User Form Component
  const UserForm = ({ record, onSuccess, onCancel }) => {
    const [form] = Form.useForm();
    const isEdit = !!record;

    useEffect(() => {
      if (record) {
        form.setFieldsValue({
          ...record,
          role: record.role?.name || record.role,
          branch_id: record.branch_id || record.branch?.id,
          merchant_id: record.merchant_id || record.merchant?.id,
        });
      } else {
        form.setFieldsValue({
          is_active: true,
          password: "password",
        });
      }
    }, [record, form]);

    const handleSubmit = async (values) => {
      try {
        const payload = { ...values };
        
        if (!payload.password?.trim()) delete payload.password;
        if (!payload.branch_id) delete payload.branch_id;
        if (!payload.merchant_id) delete payload.merchant_id;

        if (isEdit) {
          await api.put(`/admin/users/${record.id}`, payload);
          message.success("User updated successfully");
        } else {
          await api.post("/admin/users", payload);
          message.success("User created successfully");
        }

        onSuccess?.();
        form.resetFields();
      } catch (err) {
        const errorMsg = err?.response?.data?.message || 
                        err?.response?.data?.error || 
                        "Operation failed";
        message.error(errorMsg);
      }
    };

    return (
      <Form
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
        initialValues={{ is_active: true }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item 
            name="email" 
            label="Email Address" 
            rules={[
              { required: true },
              { type: "email" }
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>

          <Form.Item name="phone" label="Phone Number">
            <Input placeholder="+977 98xxxxxxxx" />
          </Form.Item>

          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              placeholder="Select role"
              options={roles.map((r) => ({
                value: r.name,
                label: r.label || r.name,
              }))}
            />
          </Form.Item>

          <Form.Item name="branch_id" label="Branch">
            <Select
              placeholder="Select branch"
              allowClear
              options={branches.map((b) => ({
                value: b.id,
                label: b.name,
              }))}
            />
          </Form.Item>

          <Form.Item name="merchant_id" label="Merchant">
            <Select
              placeholder="Select merchant"
              allowClear
              options={merchants.map((m) => ({
                value: m.id,
                label: m.name,
              }))}
            />
          </Form.Item>
        </div>

        <Form.Item 
          name="password" 
          label={isEdit ? "New Password (leave blank to keep current)" : "Password"}
          rules={isEdit ? [] : [{ required: true }]}
        >
          <Input.Password 
            placeholder={isEdit ? "Enter new password if changing" : "Enter password"} 
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item name="is_active" label="Status" valuePropName="checked">
          <input type="checkbox" /> Active
        </Form.Item>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" htmlType="submit">
            {isEdit ? "Update User" : "Create User"}
          </Button>
        </div>
      </Form>
    );
  };

  return (
    <SimpleTablePageWithCRUD
      title="Users Management"
      endpoint="/admin/users"
      columns={columns}
      modalForm={<UserForm />}
      reloadKey={refresh}
      resource="users" // ← This is the key line
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          Add New User
        </Button>
      }
      searchPlaceholder="Search by name or email..."
      pageSizeOptions={[10, 20, 50, 100]}
    />
  );
}