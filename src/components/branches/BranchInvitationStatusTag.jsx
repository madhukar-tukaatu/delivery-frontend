"use client";

import {
  Space,
  Tag,
  Typography,
} from "antd";

const {
  Text,
} = Typography;

const STATUS_CONFIG = {
  pending_admin_approval: {
    color: "gold",
    label: "Pending Approval",
  },

  queued: {
    color: "processing",
    label: "Email Queued",
  },

  sent: {
    color: "blue",
    label: "Invitation Sent",
  },

  failed: {
    color: "red",
    label: "Email Failed",
  },

  account_configured: {
    color: "green",
    label: "Account Configured",
  },
};

export default function BranchInvitationStatusTag({
  branch,
  showEmail = false,
}) {
  const status =
    branch
      ?.account_invitation_status ||
    "pending_admin_approval";

  const config =
    STATUS_CONFIG[status] || {
      color: "default",
      label: status,
    };

  return (
    <Space
      direction="vertical"
      size={0}
    >
      <Tag color={config.color}>
        {config.label}
      </Tag>

      {showEmail &&
      branch?.account_invitation_email ? (
        <Text
          type="secondary"
          style={{
            fontSize: 11,
          }}
        >
          {
            branch
              .account_invitation_email
          }
        </Text>
      ) : null}
    </Space>
  );
}