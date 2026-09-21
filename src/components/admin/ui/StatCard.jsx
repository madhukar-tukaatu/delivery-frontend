"use client";

/**
 * Compact stat card with a colored left border accent.
 * Small, clean design that shows a label and a value.
 *
 * variant: "primary" | "accent" | "success" | "danger" | "warning"
 *
 * Usage:
 *   <StatCard label="Active" value={25} variant="success" />
 *   <StatCard label="Per KM Charge" value="NPR 6.00" hint="current rate" />
 */
export default function StatCard({
  label,
  value,
  hint,
  variant = "primary",
  icon,
}) {
  return (
    <div className={`admin-stat-card ${variant}`}>
      <div className="stat-card-inner">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="stat-label">{label}</div>
          <div className="stat-value" title={String(value ?? "")}>
            {value ?? "—"}
          </div>
          {hint ? <div className="stat-hint">{hint}</div> : null}
        </div>
        {icon ? <div className="stat-icon">{icon}</div> : null}
      </div>
    </div>
  );
}

/**
 * Grid wrapper for a row of stat cards. Responsive: 4 per row on desktop,
 * 2 on tablet, 1 on mobile.
 */
export function StatCardGrid({ children }) {
  return <div className="admin-stat-grid">{children}</div>;
}
