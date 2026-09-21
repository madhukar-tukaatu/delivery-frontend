"use client";

import {
  useEffect,
} from "react";

import {
  Button,
  Form,
  Input,
  Select,
  Space,
} from "antd";

const STAFF_TYPES = [
  {
    value: "pickup_staff",
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
  const [form] =
    Form.useForm();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name:
          user.name ?? "",

        email:
          user.email ?? "",

        phone:
          user.phone ?? "",

        staff_type:
          user.staff_type ??
          user.type ??
          "pickup_staff",
      });
    } else {
      form.resetFields();

      form.setFieldsValue({
        staff_type:
          "pickup_staff",
      });
    }
  }, [user, form]);

  async function handleFinish(values) {
    const payload = {
      name:
        values.name?.trim(),

      email:
        values.email?.trim(),

      phone:
        values.phone?.trim(),

      staff_type:
        values.staff_type,
    };

    /*
     * Password is only sent when creating
     * or when the user explicitly enters one.
     */
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
              "Name must contain at least 2 characters.",
          },
        ]}
      >
        <Input
          placeholder="Enter full name"
          disabled={loading}
        />
      </Form.Item>

      <Form.Item
        label="Email"
        name="email"
        rules={[
          {
            required: true,
            message:
              "Please enter email.",
          },
          {
            type: "email",
            message:
              "Please enter a valid email.",
          },
        ]}
      >
        <Input
          placeholder="staff@example.com"
          disabled={loading}
        />
      </Form.Item>

      <Form.Item
        label="Phone"
        name="phone"
        rules={[
          {
            required: true,
            message:
              "Please enter phone number.",
          },
        ]}
      >
        <Input
          placeholder="98XXXXXXXX"
          disabled={loading}
        />
      </Form.Item>

      <Form.Item
        label="Staff Type"
        name="staff_type"
        rules={[
          {
            required: true,
            message:
              "Please select staff type.",
          },
        ]}
      >
        <Select
          disabled={loading}
          options={STAFF_TYPES}
          placeholder="Select staff type"
        />
      </Form.Item>

      <Form.Item
        label={
          user
            ? "New Password (optional)"
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
                    "Please enter password.",
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
          placeholder={
            user
              ? "Leave empty to keep current password"
              : "Enter password"
          }
          disabled={loading}
        />
      </Form.Item>

      <Space>
        <Button
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
        >
          {user
            ? "Update Staff"
            : "Create Staff"}
        </Button>
      </Space>
    </Form>
  );
}