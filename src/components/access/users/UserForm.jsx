"use client";

import React, { useEffect, useMemo } from "react";

import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";

const { Text } = Typography;

function getRoleName(user) {
  if (!user) return undefined;

  if (user.role) {
    return user.role;
  }

  if (Array.isArray(user.roles) && user.roles.length) {
    return user.roles[0]?.name;
  }

  return undefined;
}

export default function UserForm({
  open,
  user,
  roles = [],
  loading = false,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();

  const isEdit = Boolean(user?.id);

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: role.name,
        label:
          role.label ||
          role.name
            ?.replaceAll("_", " ")
            .replace(/\b\w/g, (char) => char.toUpperCase()),
      })),
    [roles]
  );

  useEffect(() => {
    if (!open) return;

    if (user) {
      form.setFieldsValue({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: getRoleName(user),
        branch_id: user.branch_id ?? user.branch?.id ?? undefined,
        merchant_id:
          user.merchant_id ??
          user.merchant?.id ??
          undefined,
        is_active:
          user.is_active === undefined
            ? true
            : Boolean(user.is_active),
        password: "",
      });

      return;
    }

    form.resetFields();

    form.setFieldsValue({
      is_active: true,
    });
  }, [open, user, form]);

  const handleFinish = async (values) => {
    const payload = {
      name: values.name,
      email: values.email,
      phone: values.phone || null,
      role: values.role,
      branch_id:
        values.branch_id === undefined ||
        values.branch_id === null ||
        values.branch_id === ""
          ? null
          : Number(values.branch_id),
      merchant_id:
        values.merchant_id === undefined ||
        values.merchant_id === null ||
        values.merchant_id === ""
          ? null
          : Number(values.merchant_id),
      is_active: Boolean(values.is_active),
    };

    if (values.password) {
      payload.password = values.password;
    }

    await onSubmit?.(payload, user);
  };

  if (!open) {
    return null;
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        is_active: true,
      }}
    >
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[
              {
                required: true,
                message: "Please enter the user's name.",
              },
            ]}
          >
            <Input
              placeholder="Full name"
              size="large"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              {
                required: true,
                message: "Please enter an email.",
              },
              {
                type: "email",
                message: "Enter a valid email.",
              },
            ]}
          >
            <Input
              placeholder="user@example.com"
              size="large"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="phone"
            label="Phone"
          >
            <Input
              placeholder="Optional phone number"
              size="large"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            name="role"
            label="Role"
            rules={[
              {
                required: true,
                message: "Please select a role.",
              },
            ]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select role"
              size="large"
              options={roleOptions}
            />
          </Form.Item>
        </Col>
      </Row>

      <Alert
        type="info"
        showIcon
        message="Role permissions"
        description="Permissions are inherited from the selected role. Do not assign permissions directly to individual users."
        style={{
          marginBottom: 20,
        }}
      />

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="branch_id"
            label="Branch ID"
          >
            <Input
              type="number"
              placeholder="Optional branch ID"
              size="large"
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            name="merchant_id"
            label="Merchant ID"
          >
            <Input
              type="number"
              placeholder="Optional merchant ID"
              size="large"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="password"
        label="Password"
      >
        <Input.Password
          placeholder={
            isEdit
              ? "Leave empty to keep current password"
              : "Leave empty to use default password"
          }
          size="large"
        />
      </Form.Item>

      <Text
        type="secondary"
        style={{
          display: "block",
          marginBottom: 20,
        }}
      >
        {isEdit
          ? "Leave the password empty if you do not want to change it."
          : "If you leave the password empty, the backend will use its configured default password."}
      </Text>

      <Form.Item
        name="is_active"
        label="Account Status"
        valuePropName="checked"
      >
        <Switch
          checkedChildren="Active"
          unCheckedChildren="Disabled"
        />
      </Form.Item>

      <Space
        style={{
          width: "100%",
          justifyContent: "flex-end",
        }}
      >
        <Button onClick={onCancel}>
          Cancel
        </Button>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
        >
          {isEdit ? "Update User" : "Create User"}
        </Button>
      </Space>
    </Form>
  );
}