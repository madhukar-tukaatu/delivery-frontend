"use client";

import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from "@/lib/designTokens";

/**
 * CompactAdminLayout - Two-panel layout with 35% left (preview/map) and 65% right (table/list)
 * @param {React.ReactNode} leftPanel - Preview/Map/Details section (35% width)
 * @param {React.ReactNode} rightPanel - Table/List section (65% width)
 * @param {Object} options - Layout options
 * @returns {React.ReactNode}
 */
export default function CompactAdminLayout({
  leftPanel,
  rightPanel,
  leftPanelWidth = "35%",
  showBorder = true,
}) {
  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 120px)",
        gap: SPACING.md,
        padding: SPACING.md,
        background: COLORS.pageBackground,
      }}
    >
      {/* Left Panel - Preview/Map/Details */}
      <div
        style={{
          width: leftPanelWidth,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: SPACING.md,
          overflow: "auto",
          borderRight: showBorder ? `1px solid ${COLORS.border}` : "none",
          paddingRight: showBorder ? SPACING.md : 0,
        }}
      >
        {leftPanel}
      </div>

      {/* Right Panel - Table/List */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {rightPanel}
      </div>
    </div>
  );
}

/**
 * CompactCard - Reusable card for left panel (map, details, stats)
 * @param {Object} props - Card properties
 * @returns {React.ReactNode}
 */
export function CompactCard({
  title,
  icon,
  children,
  height = "auto",
  isScrollable = false,
  loading = false,
}) {
  return (
    <div
      style={{
        background: COLORS.cardBackground,
        border: `1px solid ${COLORS.border}`,
        borderRadius: BORDER_RADIUS.lg,
        overflow: isScrollable ? "auto" : "hidden",
        height,
        display: "flex",
        flexDirection: "column",
        boxShadow: SHADOWS.sm,
      }}
    >
      {title && (
        <div
          style={{
            padding: `${SPACING.md}px ${SPACING.lg}px`,
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            alignItems: "center",
            gap: SPACING.sm,
            flexShrink: 0,
          }}
        >
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.primaryText }}>
            {title}
          </span>
        </div>
      )}
      <div
        style={{
          flex: 1,
          overflow: isScrollable ? "auto" : "hidden",
          padding: SPACING.lg,
        }}
      >
        {loading ? <span style={{ color: COLORS.secondaryText }}>Loading...</span> : children}
      </div>
    </div>
  );
}

/**
 * CompactTableContainer - Wrapper for scrollable table with pagination
 */
export function CompactTableContainer({ children, withPagination = true }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: COLORS.cardBackground,
        border: `1px solid ${COLORS.border}`,
        borderRadius: BORDER_RADIUS.lg,
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
    </div>
  );
}
