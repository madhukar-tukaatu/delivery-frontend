"use client";

import {
  Button,
  Form,
  Input,
  Select,
  Space,
} from "antd";

import { useEffect } from "react";

function normalizeRole(role) {
  if (
    typeof role === "string"
  ) {
    return {
      label: role,
      value: role,
    };
  }

  return {
    label:
      role.label ||
      role.name ||
      role.title ||
      String(role.id),
    value:
      role.value ||
      role.name ||
      role.id,
  };
}

export default function BranchStaffForm({
  user,
  roles = [],
  loading,
  onSubmit,
  onCancel,
}) {
  const [form] =
    Form.useForm();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name:
          user.name ||
          `${user.first_name || ""} ${
            user.last_name || ""
          }`.trim(),

        email:
          user.email || "",

        phone:
          user.phone || "",

        role:
          user.roles?.[0]
            ?.name ||
          user.role ||
          user.role_name ||
          undefined,
      });
    } else {
      form.resetFields();
    }
  }, [user, form]);

  async function handleFinish(values) {
    const payload = {
      name:
        values.name.trim(),

      email:
        values.email.trim(),

      phone:
        values.phone.trim(),

      role:
        values.role,
    };

    /*
     * Password is only sent when creating
     * a new staff account or when the user
     * explicitly enters a new password.
     */
    if (
      values.password
    ) {
      payload.password =
        values.password;
    }

    await onSubmit(
      payload
    );
  }

  const roleOptions =
    roles.map(
      normalizeRole
    );

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={
        handleFinish
      }
    >
      <Form.Item
        label="Full Name"
        name="name"
        rules={[
          {
            required: true,
            message:
              "Please enter the staff name.",
          },
        ]}
      >
        <Input
          placeholder="Staff full name"
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
        />
      </Form.Item>

      <Form.Item
        label="Staff Role"
        name="role"
        rules={[
          {
            required: true,
            message:
              "Please select a staff role.",
          },
        ]}
      >
        <Select
          placeholder="Select role"
          options={roleOptions}
        />
      </Form.Item>

      {!user && (
        <Form.Item
          label="Password"
          name="password"
          rules={[
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
          ]}
        >
          <Input.Password />
        </Form.Item>
      )}

      {user && (
        <Form.Item
          label="New Password"
          name="password"
          extra="Leave empty to keep the current password."
        >
          <Input.Password />
        </Form.Item>
      )}

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