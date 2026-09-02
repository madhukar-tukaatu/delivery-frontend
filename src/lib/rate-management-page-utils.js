// src/lib/rate-management-page-utils.js

/**
 * Extract a collection from common Laravel API response formats.
 */
export function extractCollection(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
}

/**
 * Convert Laravel / API boolean values safely.
 *
 * Handles:
 * true
 * false
 * 1
 * 0
 * "1"
 * "0"
 * "true"
 * "false"
 * "TRUE"
 * "FALSE"
 */
export function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes" ||
      normalized === "on"
    ) {
      return true;
    }

    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "no" ||
      normalized === "off" ||
      normalized === ""
    ) {
      return false;
    }
  }

  return false;
}

/**
 * Convert a value to number.
 */
export function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

/**
 * Convert a value to nullable number.
 */
export function nullableNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/**
 * Normalize a branch object.
 */
export function normalizeBranch(row = {}) {
  if (!row || typeof row !== "object") {
    return null;
  }

  return {
    ...row,

    id: nullableNumber(row.id),

    name:
      row.name ??
      row.branch_name ??
      row.coverage_location_name ??
      `Zone ${row.id ?? ""}`,

    code:
      row.code ??
      row.branch_code ??
      row.coverage_location_code ??
      (row.id !== undefined && row.id !== null
        ? String(row.id)
        : ""),
  };
}

/**
 * Enrich a branch object with normalized fields.
 */
export function enrichBranch(row = {}) {
  if (!row || typeof row !== "object") {
    return null;
  }

  return {
    ...row,
    id: nullableNumber(row.id),
    name: row.name ?? row.branch_name ?? `Zone ${row.id ?? ""}`,
    code:
      row.code ??
      row.branch_code ??
      (row.id !== undefined && row.id !== null
        ? String(row.id)
        : ""),
  };
}

/**
 * Normalize a branch route rate.
 *
 * IMPORTANT:
 * express_enabled and same_day_enabled are explicitly
 * normalized here because Laravel/MySQL may return them as:
 *
 * 0 / 1
 * "0" / "1"
 * true / false
 * "true" / "false"
 */
export function normalizeBranchRate(row = {}) {
  if (!row || typeof row !== "object") {
    return {
      id: null,
      pickup_branch_id: null,
      delivery_branch_id: null,
      pickup_coverage_location_id: null,
      delivery_coverage_location_id: null,
      pickup_branch: null,
      delivery_branch: null,
      base_rate: 0,
      is_active: false,
      express_enabled: false,
      same_day_enabled: false,
    };
  }

  const pickupId = nullableNumber(
    row.pickup_coverage_location_id ??
      row.pickup_branch_id ??
      row.pickup_branch?.id,
  );

  const deliveryId = nullableNumber(
    row.delivery_coverage_location_id ??
      row.delivery_branch_id ??
      row.delivery_branch?.id,
  );

  const pickupBranch =
    row.pickup_branch ??
    (pickupId !== null
      ? {
          id: pickupId,
          name:
            row.pickup_branch_name ??
            row.pickup_coverage_location_name ??
            `Zone ${pickupId}`,
          code:
            row.pickup_branch_code ??
            row.pickup_coverage_location_code ??
            String(pickupId),
        }
      : null);

  const deliveryBranch =
    row.delivery_branch ??
    (deliveryId !== null
      ? {
          id: deliveryId,
          name:
            row.delivery_branch_name ??
            row.delivery_coverage_location_name ??
            `Zone ${deliveryId}`,
          code:
            row.delivery_branch_code ??
            row.delivery_coverage_location_code ??
            String(deliveryId),
        }
      : null);

  return {
    ...row,

    id: nullableNumber(row.id),

    pickup_branch_id: pickupId,
    delivery_branch_id: deliveryId,

    pickup_coverage_location_id: pickupId,
    delivery_coverage_location_id: deliveryId,

    pickup_branch: pickupBranch
      ? normalizeBranch(pickupBranch)
      : null,

    delivery_branch: deliveryBranch
      ? normalizeBranch(deliveryBranch)
      : null,

    base_rate: toNumber(row.base_rate),

    is_active: toBoolean(row.is_active),

    /**
     * NEVER use:
     *
     * row.same_day_enabled !== false
     *
     * because:
     *
     * 0 !== false -> true
     *
     * Instead normalize the actual API value.
     */
    express_enabled: toBoolean(row.express_enabled),

    same_day_enabled: toBoolean(row.same_day_enabled),
  };
}

/**
 * Normalize a collection of branch rates.
 */
export function normalizeBranchRates(payload) {
  return extractCollection(payload).map(normalizeBranchRate);
}

/**
 * Format money.
 */
export function formatMoney(value, currency = "NPR") {
  const amount = toNumber(value);

  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date.
 */
export function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Extract a readable API error message.
 */
export function apiErrorMessage(error, fallback = "Something went wrong.") {
  const responseData = error?.response?.data;

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  if (responseData?.errors) {
    const errors = responseData.errors;

    if (typeof errors === "object") {
      const messages = Object.values(errors)
        .flat()
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(", ");
      }
    }
  }

  if (typeof error?.message === "string") {
    return error.message;
  }

  return fallback;
}