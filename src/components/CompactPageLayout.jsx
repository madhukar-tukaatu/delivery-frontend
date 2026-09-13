"use client";

import { Button, Card, Col, Input, Row, Space, Table, Tag, Typography, Pagination, Empty, Spin } from "antd";
import { ReloadOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "@/lib/designTokens";

const { Text, Title } = Typography;

/**
 * CompactPageLayout - Standard admin page with compact 65/35 layout
 */
export function CompactPageLayout({
  title,
  subtitle,
  onRefresh,
  onAdd,
  showAddButton = true,
  showRefresh = true,
  children,
}) {
  return (
    <div style={{ padding: SPACING.lg, background: COLORS.pageBackground, minHeight: "100vh" }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: SPACING.xl }}>
        <Col>
          <Title level={3} style={{ margin: 0, color: COLORS.primaryText }}>
            {title}
          </Title>
          {subtitle && (
            <Text style={{ color: COLORS.secondaryText, fontSize: 13 }}>
              {subtitle}
            </Text>
          )}
        </Col>
        <Col>
          <Space>
            {showRefresh && (
              <Button icon={<ReloadOutlined />} onClick={onRefresh}>
                Refresh
              </Button>
            )}
            {showAddButton && (
              <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
                Add
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Content */}
      {children}
    </div>
  );
}

/**
 * CompactDataPanel - Left side 65% with table/list
 */
export function CompactDataPanel({
  filters,
  onFilterChange,
  stats,
  table,
  pagination,
  onPaginationChange,
  loading = false,
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: SPACING.md }}>
      {/* Stats Row */}
      {stats && stats.length > 0 && (
        <Row gutter={[SPACING.md, SPACING.md]}>
          {stats.map((stat, i) => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card
                style={{
                  border: "none",
                  borderRadius: BORDER_RADIUS.lg,
                  height: 80,
                  padding: SPACING.lg,
                  background: COLORS.cardBackground,
                  boxShadow: SHADOWS.md,
                  transition: "all 0.3s ease",
                }}
                bodyStyle={{ padding: 0 }}
                hoverable
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "100%" }}>
                  <div>
                    <div style={{ fontSize: 11, color: COLORS.secondaryText, marginBottom: 6, fontWeight: 500 }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.primaryText }}>
                      {stat.value}
                    </div>
                  </div>
                  {stat.icon && (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: BORDER_RADIUS.lg,
                        background: `${stat.color || COLORS.primary}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: stat.color || COLORS.primary,
                        fontSize: 24,
                        border: `2px solid ${stat.color || COLORS.primary}30`,
                      }}
                    >
                      {stat.icon}
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Filters */}
      {filters && filters.length > 0 && (
        <div style={{ background: COLORS.cardBackground, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, border: "none", boxShadow: SHADOWS.md }}>
          <Row gutter={[SPACING.sm, SPACING.sm]}>
            {filters.map((filter, i) => (
              <Col key={i} xs={24} sm={12} lg={filter.lg || 6}>
                {filter.component}
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Table */}
      <Card
        style={{
          border: "none",
          borderRadius: BORDER_RADIUS.lg,
          padding: 0,
          background: COLORS.cardBackground,
          boxShadow: SHADOWS.md,
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        bodyStyle={{ padding: 0, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        <Spin spinning={loading} style={{ flex: 1 }}>
          <div style={{ flex: 1, overflow: "auto" }}>
            {table}
          </div>
        </Spin>

        {/* Pagination */}
        {pagination && (
          <div
            style={{
              borderTop: `1px solid ${COLORS.border}`,
              padding: `${SPACING.sm}px ${SPACING.lg}px`,
              background: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 11, color: COLORS.secondaryText }}>
              {pagination.total > 0
                ? `${(pagination.current - 1) * pagination.pageSize + 1}-${Math.min(pagination.current * pagination.pageSize, pagination.total)} of ${pagination.total}`
                : "No data"}
            </Text>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={(page) => onPaginationChange?.(page, pagination.pageSize)}
              onShowSizeChange={(_, size) => onPaginationChange?.(1, size)}
              pageSizeOptions={["10", "25", "50"]}
              showSizeChanger
              showQuickJumper
              size="small"
              style={{ margin: 0 }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * CompactDetailPanel - Right side 35% with preview/details
 */
export function CompactDetailPanel({
  title,
  preview,
  details,
  actions,
  loading = false,
}) {
  return (
    <div style={{ width: "35%", flexShrink: 0, display: "flex", flexDirection: "column", gap: SPACING.md, overflow: "auto", borderLeft: `1px solid ${COLORS.border}`, paddingLeft: SPACING.md }}>
      {/* Preview */}
      {preview && (
        <Card
          style={{
            border: `1px solid ${COLORS.border}`,
            borderRadius: BORDER_RADIUS.lg,
            height: 280,
            overflow: "hidden",
            boxShadow: SHADOWS.sm,
            padding: 0,
          }}
          bodyStyle={{ padding: SPACING.md, height: "100%", overflow: "hidden" }}
          title={title && <Text style={{ fontSize: 12, fontWeight: 600 }}>{title}</Text>}
          loading={loading}
        >
          {preview}
        </Card>
      )}

      {/* Details */}
      {details && (
        <Card
          style={{
            border: `1px solid ${COLORS.border}`,
            borderRadius: BORDER_RADIUS.lg,
            flex: 1,
            overflow: "auto",
            boxShadow: SHADOWS.sm,
            padding: 0,
          }}
          bodyStyle={{ padding: SPACING.md, height: "100%", overflow: "auto" }}
          title={<Text style={{ fontSize: 12, fontWeight: 600 }}>📋 Details</Text>}
        >
          {details}
        </Card>
      )}

      {/* Actions */}
      {actions && (
        <div style={{ paddingBottom: SPACING.lg }}>
          <Space direction="vertical" style={{ width: "100%" }} size="small">
            {actions}
          </Space>
        </div>
      )}
    </div>
  );
}

/**
 * StatCard - Compact stat display
 */
export function StatCard({ label, value, icon: Icon, color = COLORS.primary }) {
  return (
    <Card
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: BORDER_RADIUS.lg,
        height: 60,
        padding: SPACING.md,
        background: COLORS.cardBackground,
        boxShadow: SHADOWS.sm,
      }}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "100%" }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.secondaryText, marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.primaryText }}>
            {value}
          </div>
        </div>
        {Icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: BORDER_RADIUS.md,
              background: `${color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color,
              fontSize: 20,
            }}
          >
            <Icon />
          </div>
        )}
      </div>
    </Card>
  );
}
