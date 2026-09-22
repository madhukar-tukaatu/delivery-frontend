"use client";

import { Avatar, Breadcrumb, Space, Typography } from "antd";

const { Title, Text } = Typography;

/**
 * Shared admin page header - same navy hero used on Staff and Franchise detail.
 *
 * <AdminPageHeader
 *   title="Branch Offices"
 *   subtitle="Manage branch allocation..."
 *   icon={<ShopOutlined />}
 *   breadcrumb={[{ title: "Admin" }, { title: "Branch Offices" }]}
 *   tags={<Tag>Access</Tag>}
 *   actions={<Button>Refresh</Button>}
 * />
 */
export default function AdminPageHeader({
  title,
  subtitle,
  actions,
  extra,
  icon,
  breadcrumb,
  tags,
}) {
  const crumbItems = Array.isArray(breadcrumb)
    ? breadcrumb.map((item, index) => {
        const isLast = index === breadcrumb.length - 1;
        const label = item?.title ?? item;
        return {
          title: (
            <span style={{ color: isLast ? "#ffffff" : "#bfdbfe" }}>
              {label}
            </span>
          ),
        };
      })
    : null;

  return (
    <div className="admin-page-header admin-page-header--hero">
      <div className="admin-page-header-left">
        {crumbItems ? (
          <Breadcrumb
            className="admin-page-header-breadcrumb"
            items={crumbItems}
          />
        ) : null}

        <Space align="start" size={14} wrap>
          {icon ? (
            <Avatar
              size={48}
              icon={icon}
              className="admin-page-header-avatar"
            />
          ) : null}

          <div className="admin-page-header-copy">
            <Space wrap size={[8, 6]} align="center">
              <Title level={2} style={{ margin: 0 }}>
                {title}
              </Title>
              {tags}
            </Space>

            {subtitle ? (
              typeof subtitle === "string" ? (
                <p>{subtitle}</p>
              ) : (
                <div className="admin-page-header-subtitle">{subtitle}</div>
              )
            ) : null}

            {extra}
          </div>
        </Space>
      </div>

      {actions ? (
        <div className="admin-page-header-right">{actions}</div>
      ) : null}
    </div>
  );
}