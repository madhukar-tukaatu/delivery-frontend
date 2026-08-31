"use client";

import {
  Button,
  Form,
  Input,
  Select,
  Space,
} from "antd";

import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
} from "@ant-design/icons";

import {
  useEffect,
} from "react";

const STAFF_ROLES = [
  {
    value: "staff",
    label: "Pickup Staff",
  },
  {
    value: "rider",
    label: "Rider",
  },
];

export default function StaffForm({
  user = null,
  loading = false,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name:
          user.name ?? "",

        email:
          user.email ?? "",

        phone:
          user.phone ?? "",

        role:
          user.roles?.[0]?.name ??
          user.role ??
          "staff",
      });
    } else {
      form.resetFields();

      form.setFieldsValue({
        role: "staff",
      });
    }
  }, [user, form]);

  async function handleFinish(values) {
    const payload = {
      name:
        values.name.trim(),

      email:
        values.email?.trim() || null,

      phone:
        values.phone?.trim() || null,

      role:
        values.role,
    };

    if (values.password) {
      payload.password =
        values.password;
    }

    await onSubmit(
      payload,
      user
    );
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
    >
      <Form.Item
        label="Full Name"
        name="name"
        rules={[
          {
            required: true,
            message:
              "Please enter staff name.",
          },
          {
            min: 2,
            message:
              "Name must be at least 2 characters.",
          },
        ]}
      >
        <Input
          prefix={
            <UserOutlined />
          }
          placeholder="Staff full name"
        />
      </Form.Item>

      <Form.Item
        label="Email"
        name="email"
        rules={[
          {
            type: "email",
            message:
              "Enter a valid email.",
          },
        ]}
      >
        <Input
          prefix={
            <MailOutlined />
          }
          placeholder="staff@example.com"
        />
      </Form.Item>

      <Form.Item
        label="Phone"
        name="phone"
      >
        <Input
          prefix={
            <PhoneOutlined />
          }
          placeholder="98XXXXXXXX"
        />
      </Form.Item>

      <Form.Item
        label="Role"
        name="role"
        rules={[
          {
            required: true,
            message:
              "Please select a role.",
          },
        ]}
      >
        <Select
          options={STAFF_ROLES}
          placeholder="Select staff role"
        />
      </Form.Item>

      <Form.Item
        label={
          user
            ? "New Password"
            : "Password"
        }
        name="password"
        rules={
          user
            ? []
            : [
                {
                  required: true,
                  message:
                    "Please enter a password.",
                },
                {
                  min: 8,
                  message:
                    "Password must be at least 8 characters.",
                },
              ]
        }
      >
        <Input.Password
          prefix={
            <LockOutlined />
          }
          placeholder={
            user
              ? "Leave empty to keep current password"
              : "Minimum 8 characters"
          }
        />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
          >
            {user
              ? "Update Staff"
              : "Create Staff"}
          </Button>

          <Button
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}