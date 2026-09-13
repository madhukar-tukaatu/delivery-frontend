"use client";

import { Card, Row, Col, Space } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import { COLORS, SPACING, SHADOWS, BORDER_RADIUS, TYPOGRAPHY } from "@/lib/designTokens";

export default function KPICard({
  icon: Icon,
  label,
  value,
  trend,
  trendPercent,
  comparison,
  color = COLORS.primary,
  isMoney = false,
  loading = false,
}) {
  const isPositive = trend === "up";

  return (
    <Card
      loading={loading}
      style={{
        border: "none",
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        background: COLORS.cardBackground,
        boxShadow: SHADOWS.md,
        height: "100%",
        cursor: "default",
        transition: "all 0.3s ease",
      }}
      bodyStyle={{ padding: 0 }}
      hoverable
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = SHADOWS.lg;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = SHADOWS.md;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <Row justify="space-between" align="start" gutter={[0, SPACING.md]}>
        <Col flex="auto">
          <div
            style={{
              ...TYPOGRAPHY.kpiLabel,
              marginBottom: SPACING.md,
              fontWeight: 500,
            }}
          >
            {label}
          </div>
          <div
            style={{
              ...TYPOGRAPHY.kpiNumber,
              color: COLORS.primaryText,
              marginBottom: SPACING.lg,
              fontSize: 32,
            }}
          >
            {isMoney ? `Rs. ${Number(value).toLocaleString("en-NP")}` : value}
          </div>

          {trendPercent && (
            <Space size={4} style={{ fontSize: 12 }}>
              <span
                style={{
                  color: isPositive ? COLORS.success : COLORS.danger,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {trendPercent}%
              </span>
              {comparison && (
                <span style={{ color: COLORS.tertiaryText, fontSize: 11 }}>
                  {comparison}
                </span>
              )}
            </Space>
          )}
        </Col>
        {Icon && (
          <Col>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: BORDER_RADIUS.lg,
                background: `${color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${color}30`,
              }}
            >
              <Icon style={{ fontSize: 24, color }} />
            </div>
          </Col>
        )}
      </Row>
    </Card>
  );
}
