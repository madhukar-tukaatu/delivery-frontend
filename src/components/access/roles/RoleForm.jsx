"use client";

import { useEffect, useState } from "react";

import {
  Alert,
  Button,
  Col,
  Divider,
  Input,
  Row,
  message,
} from "antd";

import { Form } from "@/components/PageTools";

import {
  createRole,
  updateRole,
} from "@/services/accessApi";

import PermissionSelector from "./PermissionSelector";

import {
  getRolePermissionNames,
} from "./roleUtils";

export default function RoleForm({
  record = null,
  permissionGroups = [],
  loadingPermissions = false,
  onSuccess,
  onCancel,
}) {
  const [form] = Form.useForm();

  const [saving, setSaving] =
    useState(false);

  const [
    selectedPermissions,
    setSelectedPermissions,
  ] = useState([]);

  const isEdit = Boolean(record);

  useEffect(() => {
    if (record) {
      const permissions =
        getRolePermissionNames(record);

      form.setFieldsValue({
        name: record.name,
        label: record.label,
        description:
          record.description || "",
      });

      setSelectedPermissions(
        permissions
      );

      return;
    }

    form.resetFields();

    setSelectedPermissions([]);
  }, [record, form]);

  async function handleSubmit(values) {
    try {
      setSaving(true);

      const payload = {
        name: values.name,
        label: values.label || null,
        description:
          values.description || null,
        permissions:
          selectedPermissions,
      };

      if (isEdit) {
        await updateRole(
          record.id,
          payload
        );

        message.success(
          "Role updated successfully."
        );
      } else {
        await createRole(payload);

        message.success(
          "Role created successfully."
        );
      }

      onSuccess?.();
    } catch (error) {
      console.error(error);

      const errors =
        error?.response?.data?.errors;

      if (errors) {
        const firstError =
          Object.values(errors)
            .flat()
            .find(Boolean);

        message.error(
          firstError ||
            "Validation failed."
        );
      } else {
        message.error(
          error?.response?.data?.message ||
            "Failed to save role."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="name"
            label="Role Key"
            rules={[
              {
                required: true,
                message:
                  "Role key is required.",
              },
              {
                pattern:
                  /^[a-z0-9_]+$/,
                message:
                  "Use lowercase letters, numbers and underscores only.",
              },
            ]}
            extra={
              isEdit
                ? "Role key cannot be changed after creation."
                : "Example: branch_manager"
            }
          >
            <Input
              placeholder="branch_manager"
              disabled={isEdit}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            name="label"
            label="Display Label"
          >
            <Input
              placeholder="Branch Manager"
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="description"
        label="Description"
      >
        <Input.TextArea
          rows={3}
          placeholder="Describe the responsibility of this role..."
          maxLength={500}
          showCount
        />
      </Form.Item>

      <Divider orientation="left">
        Role Permissions
      </Divider>

      <Alert
        type="info"
        showIcon
        style={{
          marginBottom: 16,
        }}
        message="Permissions come from the backend."
        description={
          "Permissions are generated and synchronized from Laravel routes. " +
          "Use this section only to decide which permissions this role receives."
        }
      />

      <PermissionSelector
        groups={permissionGroups}
        value={selectedPermissions}
        onChange={
          setSelectedPermissions
        }
        loading={
          loadingPermissions
        }
      />

      <Divider />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <Button
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>

        <Button
          type="primary"
          htmlType="submit"
          loading={saving}
        >
          {isEdit
            ? "Update Role"
            : "Create Role"}
        </Button>
      </div>
    </Form>
  );
}