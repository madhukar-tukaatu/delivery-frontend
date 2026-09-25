"use client";

import { Button, Card, Space, Typography } from "antd";
import {
  CloseOutlined,
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export default function EditableSectionCard({
  title,
  description,
  icon,
  editing = false,
  saving = false,
  changedCount = 0,
  editDisabled = false,
  onEdit,
  onCancel,
  onSave,
  children,
}) {
  return (
    <Card
      variant="borderless"
      style={{
        border: "1px solid #e5eaf0",
        borderRadius: 18,
        boxShadow: "0 8px 26px rgba(15, 23, 42, 0.045)",
        overflow: "hidden",
      }}
      styles={{
        header: {
          minHeight: 66,
          padding: "0 20px",
          background: editing ? "#f8fbff" : "#ffffff",
        },
        body: {
          padding: 20,
        },
      }}
      title={
        <Space align="start" size={11}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb",
              background: "#eef4ff",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          <Space direction="vertical" size={1}>
            <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
              {title}
            </Text>
            {description ? (
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                {description}
              </Text>
            ) : null}
          </Space>
        </Space>
      }
      extra={
        editing ? (
          <Space>
            <Button
              icon={<CloseOutlined />}
              disabled={saving}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!saving && changedCount === 0}
              onClick={onSave}
            >
              {changedCount > 0
                ? `Save ${changedCount} change${changedCount === 1 ? "" : "s"}`
                : "No changes"}
            </Button>
          </Space>
        ) : (
          <Button
            icon={<EditOutlined />}
            disabled={editDisabled}
            onClick={onEdit}
          >
            Edit
          </Button>
        )
      }
    >
      {children}
    </Card>
  );
}
