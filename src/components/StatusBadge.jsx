"use client";

import { Tag } from "antd";
import { STATUS_COLORS, BORDER_RADIUS } from "@/lib/designTokens";

export default function StatusBadge({ status, icon: Icon }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.cancelled;

  return (
    <Tag
      style={{
        background: colors.bg,
        color: colors.text,
        border: "none",
        borderRadius: BORDER_RADIUS.md,
        padding: "4px 8px",
        fontSize: 12,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
      icon={Icon}
    >
      {status}
    </Tag>
  );
}
