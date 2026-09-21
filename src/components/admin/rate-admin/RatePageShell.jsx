"use client";

import styles from "./rate-admin.module.css";

export function RatePageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerCopy}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {hint ? <div className={styles.statHint}>{hint}</div> : null}
    </div>
  );
}

export function StatusBadge({ active, children }) {
  return (
    <span className={active ? styles.badgeGreen : styles.badgeRed}>
      {children ?? (active ? "Active" : "Inactive")}
    </span>
  );
}

export function PathView({ nodes = [] }) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return <span className={styles.cellSubtle}>No route path</span>;
  }

  return (
    <div className={styles.path}>
      {nodes.map((node, index) => (
        <span key={`${node.id ?? node.name ?? index}-${index}`} className={styles.path}>
          <span className={styles.pathNode}>{node.name ?? node.label ?? `Branch ${node.id}`}</span>
          {index < nodes.length - 1 ? <span className={styles.pathArrow}>→</span> : null}
        </span>
      ))}
    </div>
  );
}

export function Pagination({ page, totalPages, total, onPageChange }) {
  if (!totalPages || totalPages <= 1) {
    return null;
  }

  return (
    <div className={styles.pagination}>
      <span>
        Page {page} of {totalPages} · {total} records
      </span>
      <div className={styles.inlineActions}>
        <button
          type="button"
          className={styles.button}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
