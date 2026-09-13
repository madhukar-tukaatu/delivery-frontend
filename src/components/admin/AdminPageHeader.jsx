"use client";

import { Typography } from "antd";

const { Title, Text } = Typography;

/**
 * Common admin page header used across all admin pages.
 * Renders a luxury gradient bar with the page title, subtitle,
 * and an actions area (buttons, segmented controls, etc.).
 *
 * Usage:
 *   <AdminPageHeader
 *     title="Pricing Settings"
 *     subtitle="Manage global delivery pricing rules."
 *     actions={<Button>Refresh</Button>}
 *   />
 */
export default function AdminPageHeader({ title, subtitle, actions, extra }) {
  return (
    <div className="admin-page-header">
      <div className="admin-page-header-left">
        <Title level={2} style={{ margin: 0 }}>
          {title}
        </Title>
        {subtitle ? <p>{subtitle}</p> : null}
        {extra}
      </div>

      {actions ? (
        <div className="admin-page-header-right">{actions}</div>
      ) : null}
    </div>
  );
}
