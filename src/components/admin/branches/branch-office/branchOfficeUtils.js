export const SECTION_FIELDS = {
  identity: [
    "name",
    "legal_name",
    "code",
    "type",
    "parent_id",
    "coverage_location_id",
  ],
  business: [
    "owner_name",
    "contact_person",
    "email",
    "phone",
    "alternative_phone",
    "pan_vat_number",
    "registration_number",
    "business_type",
  ],
  office: [
    "office_address",
    "office_city",
    "office_area",
    "office_street",
    "office_landmark",
    "office_latitude",
    "office_longitude",
  ],
  operations: [
    "opening_time",
    "closing_time",
    "operating_days",
    "daily_shipment_capacity",
    "pickup_enabled",
    "delivery_enabled",
    "pod_enabled",
    "return_enabled",
  ],
};

export const SECTION_TITLES = {
  identity: "Branch information",
  business: "Business and manager details",
  office: "Office location",
  operations: "Operations and services",
};

function normalizeScalar(value) {
  if (value === undefined) return undefined;
  if (value === "") return null;
  if (typeof value === "string") return value.trim();
  return value;
}

function normalizeComparable(value) {
  if (Array.isArray(value)) {
    return [...value].map(normalizeScalar).sort();
  }

  if (typeof value === "boolean") {
    return Boolean(value);
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  return String(value).trim();
}

function equalValues(first, second) {
  return (
    JSON.stringify(normalizeComparable(first)) ===
    JSON.stringify(normalizeComparable(second))
  );
}

export function getManagerEmail(branch) {
  return (
    branch?.manager?.email ||
    branch?.account_invitation_email ||
    branch?.email ||
    ""
  );
}

export function getSectionInitialValues(section, branch) {
  const values = {
    ...branch,
    email: getManagerEmail(branch),
    parent_id: branch?.parent_id || branch?.parent?.id || null,
    coverage_location_id:
      branch?.coverage_location_id || branch?.coverage_location?.id || null,
    opening_time: branch?.opening_time
      ? String(branch.opening_time).slice(0, 5)
      : null,
    closing_time: branch?.closing_time
      ? String(branch.closing_time).slice(0, 5)
      : null,
    operating_days: Array.isArray(branch?.operating_days)
      ? branch.operating_days
      : [],
    pickup_enabled: Boolean(branch?.pickup_enabled),
    delivery_enabled: Boolean(branch?.delivery_enabled),
    pod_enabled: Boolean(branch?.pod_enabled),
    return_enabled: Boolean(branch?.return_enabled),
  };

  return (SECTION_FIELDS[section] || []).reduce((result, field) => {
    result[field] = values[field];
    return result;
  }, {});
}

function normalizeField(field, value) {
  if (field === "email") {
    const email = String(value || "").trim().toLowerCase();
    return email || null;
  }

  if (["parent_id", "coverage_location_id"].includes(field)) {
    return value ? Number(value) : null;
  }

  if (["office_latitude", "office_longitude"].includes(field)) {
    if (value === "" || value === null || value === undefined) return null;
    return Number(value);
  }

  if (field === "daily_shipment_capacity") {
    if (value === "" || value === null || value === undefined) return null;
    return Number(value);
  }

  if (field === "operating_days") {
    return Array.isArray(value) ? value : [];
  }

  if (
    [
      "pickup_enabled",
      "delivery_enabled",
      "pod_enabled",
      "return_enabled",
    ].includes(field)
  ) {
    return Boolean(value);
  }

  return normalizeScalar(value);
}

export function buildChangedPayload(section, branch, currentValues) {
  const allowedFields = SECTION_FIELDS[section] || [];
  const originalValues = getSectionInitialValues(section, branch);

  const changed = allowedFields.reduce((payload, field) => {
    const currentValue = normalizeField(field, currentValues?.[field]);
    const originalValue = normalizeField(field, originalValues?.[field]);

    if (!equalValues(originalValue, currentValue)) {
      payload[field] = currentValue;
    }

    return payload;
  }, {});

  if (changed.type === "franchise_branch") {
    changed.parent_id = null;
  }

  return changed;
}

export function unwrapRecord(response) {
  if (response?.data?.data) return response.data.data;
  if (response?.data && !Array.isArray(response.data)) return response.data;
  return response;
}

export function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

export function apiErrorMessage(error, fallback) {
  const validationErrors = error?.response?.data?.errors;
  const firstValidationError = validationErrors
    ? Object.values(validationErrors).flat().find(Boolean)
    : null;

  return String(
    firstValidationError || error?.response?.data?.message || fallback,
  );
}

export function typeLabel(type) {
  if (["franchise_branch", "main_branch"].includes(type)) {
    return "Franchise / Main Branch";
  }
  if (type === "head_branch") return "Head Branch";
  if (type === "sub_branch") return "Sub-Branch";
  if (type === "pickup_point") return "Pickup Point";
  if (type === "delivery_hub") return "Delivery Hub";
  return type || "—";
}

export function typeColor(type) {
  if (["franchise_branch", "main_branch"].includes(type)) return "blue";
  if (type === "head_branch") return "purple";
  if (type === "sub_branch") return "green";
  if (type === "pickup_point") return "gold";
  if (type === "delivery_hub") return "cyan";
  return "default";
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}
