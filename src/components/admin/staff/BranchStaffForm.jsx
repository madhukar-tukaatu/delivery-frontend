"use client";

import React, {
  useEffect,
} from "react";

import {
  Button,
  Form,
  Input,
  Select,
  Space,
} from "antd";

export default function BranchStaffForm({
  user,
  roles,
  loading,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();

  const editing = Boolean(
    user?.id
  );

  useEffect(() => {
    if (user) {
      const roleName =
        user?.roles?.[0]?.name ||
        user?.role ||
        user?.role_name ||
        undefined;

      form.setFieldsValue({
        name:
          user.name ||
          user.full_name ||
          "",

        email:
          user.email || "",

        phone:
          user.phone ||
          user.mobile ||
          "",

        role: roleName,
      });
    } else {
      form.resetFields();
    }
  }, [user, form]);

  const handleFinish = async (
    values
  ) => {
    const payload = {
      name:
        values.name.trim(),

      email:
        values.email?.trim() ||
        null,

      phone:
        values.phone.trim(),

      role:
        values.role,
    };

    /*
     * Only send password when creating
     * or when user explicitly entered one.
     */
    if (values.password) {
      payload.password =
        values.password;
    }

    await onSubmit(
      payload,
      user
    );
  };

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
        ]}
      >
        <Input
          placeholder="Ram Thapa"
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
          placeholder="9800000000"
        />
      </Form.Item>

      <Form.Item
        label="Email"
        name="email"
        rules={[
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
        label="Staff Role"
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
          placeholder="Select staff role"
          options={roles.map(
            (role) => ({
              label:
                role?.display_name ||
                role?.label ||
                role?.name ||
                String(role),

              value:
                role?.name ||
                String(role),
            })
          )}
        />
      </Form.Item>

      <Form.Item
        label={
          editing
            ? "New Password"
            : "Password"
        }
        name="password"
        rules={
          editing
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
          placeholder={
            editing
              ? "Leave empty to keep current password"
              : "Password"
          }
        />
      </Form.Item>

      <Space>
        <Button
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
        >
          {editing
            ? "Update Staff"
            : "Create Staff"}
        </Button>
      </Space>
    </Form>
  );
}