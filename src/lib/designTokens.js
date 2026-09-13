// Design System Tokens - Tukaatu Express Branding (Modern SaaS Style)
export const COLORS = {
  primary: "#0891B2",           // Teal/Cyan (logo main color)
  primaryAccent: "#FBBF24",      // Yellow (logo accent)
  darkNavy: "#0F172A",           // Dark sidebar - like SwiftDelivery
  darkCard: "#1A2744",           // Dark card background
  pageBackground: "#F0F2F5",     // Light gray background
  cardBackground: "#FFFFFF",
  border: "#E2E8F0",
  darkBorder: "#2D3E5F",
  primaryText: "#0F172A",
  secondaryText: "#64748B",
  tertiaryText: "#94A3B8",
  success: "#10B981",            // Green
  warning: "#F59E0B",            // Amber
  danger: "#EF4444",             // Red
  info: "#0891B2",               // Cyan
  purple: "#8B5CF6",
};

export const STATUS_COLORS = {
  pending: { bg: "#FEF3C7", text: "#92400E", icon: "#FBBF24", darkBg: "#4F3519" },
  assigned: { bg: "#E0F2FE", text: "#0C4A6E", icon: "#0891B2", darkBg: "#1A3A52" },
  pickedUp: { bg: "#DBEAFE", text: "#1D4ED8", icon: "#0891B2", darkBg: "#1E3A5F" },
  inTransit: { bg: "#E0F2FE", text: "#0369A1", icon: "#0891B2", darkBg: "#1A3A52" },
  delivered: { bg: "#D1FAE5", text: "#065F46", icon: "#10B981", darkBg: "#1F4D3D" },
  failed: { bg: "#FEE2E2", text: "#991B1B", icon: "#EF4444", darkBg: "#4F1919" },
  cancelled: { bg: "#F1F5F9", text: "#475569", icon: "#64748B", darkBg: "#2D3E5F" },
};

export const TYPOGRAPHY = {
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  headingBold: { fontWeight: 700, letterSpacing: "-0.5px" },
  headingSemibold: { fontWeight: 600 },
  bodyRegular: { fontSize: 14, fontWeight: 400 },
  bodySmall: { fontSize: 12, fontWeight: 400 },
  kpiNumber: { fontSize: 28, fontWeight: 700 },
  kpiLabel: { fontSize: 12, fontWeight: 500, color: "#64748B" },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const SHADOWS = {
  sm: "0 1px 2px rgba(15, 23, 42, 0.08)",
  md: "0 4px 12px rgba(15, 23, 42, 0.12)",
  lg: "0 10px 25px rgba(15, 23, 42, 0.15)",
  xl: "0 20px 40px rgba(15, 23, 42, 0.2)",
  dark: "0 4px 12px rgba(0, 0, 0, 0.3)",
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 14,
  xxl: 16,
};

// Tukaatu Express Logo Colors
export const TUKAATU_BRAND = {
  teal: "#0891B2",        // Primary - main brand color
  yellow: "#FBBF24",      // Accent - secondary color
  darkTeal: "#0e7490",    // Darker teal for hover states
};
