"use client";

import styles from "./rate-admin.module.css";

export default function BranchSelect({
  value,
  onChange,
  branches = [],
  placeholder = "Select branch",
  disabled = false,
  excludeIds = [],
}) {
  const excluded = new Set((excludeIds ?? []).filter(Boolean).map(Number));

  return (
    <select
      className={styles.select}
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value ? Number(event.target.value) : "")}
    >
      <option value="">{placeholder}</option>
      {branches
        .filter((branch) => !excluded.has(Number(branch.id)))
        .map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}{branch.code ? ` (${branch.code})` : ""}
          </option>
        ))}
    </select>
  );
}
