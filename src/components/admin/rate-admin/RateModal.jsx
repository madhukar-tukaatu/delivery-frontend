"use client";

import { useEffect } from "react";
import styles from "./rate-admin.module.css";

export default function RateModal({
  open,
  title,
  subtitle,
  children,
  onClose,
  onSubmit,
  submitting = false,
  submitLabel = "Save",
  width,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const handler = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { width } : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{title}</h2>
            {subtitle ? <p className={styles.modalSubtitle}>{subtitle}</p> : null}
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>{children}</div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.button} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className={styles.buttonPrimary} onClick={onSubmit} disabled={submitting}>
            {submitting ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
