import dayjs from "dayjs";

export const ROUNDING_OPTIONS = [
  { label: "Exact", value: "none" },
  { label: "Nearest", value: "round" },
  { label: "Round up", value: "ceil" },
  { label: "Round down", value: "floor" },
];

export const DEFAULT_PRICING_VALUES = {
  name: "Kathmandu Pricing Rules",
  base_weight_kg: 1.5,
  base_distance_km: 5,
  local_extra_weight_rate: 20,
  transfer_extra_weight_rate: 30,
  extra_distance_rate: 6,
  fragile_multiplier: 1.05,
  local_same_day_multiplier: 1.5,
  transfer_same_day_multiplier: 2,
  same_day_cutoff_time: dayjs("12:00", "HH:mm"),
  minimum_free_pickup_packets: 3,
  small_pickup_charge: 50,
  vat_percentage: 13,
  weight_rounding: "none",
  distance_rounding: "none",
  money_rounding: "round",
  fragile_enabled: true,
  same_day_enabled: true,
  pickup_charge_enabled: true,
  vat_enabled: true,
};

export function toBoolean(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  );
}

export function toPricingFormValues(record) {
  if (!record) {
    return { ...DEFAULT_PRICING_VALUES };
  }

  const cutoff = String(
    record.same_day_cutoff_time || "12:00",
  ).slice(0, 5);

  return {
    ...DEFAULT_PRICING_VALUES,
    ...record,
    name:
      record.name ||
      `Pricing Version ${record.id || ""}`.trim(),
    base_weight_kg: Number(
      record.base_weight_kg ??
        record.included_weight_kg ??
        1.5,
    ),
    base_distance_km: Number(
      record.base_distance_km ??
        record.included_delivery_distance_km ??
        5,
    ),
    local_extra_weight_rate: Number(
      record.local_extra_weight_rate ??
        record.same_branch_excess_weight_rate ??
        record.same_branch_weight_rate ??
        20,
    ),
    transfer_extra_weight_rate: Number(
      record.transfer_extra_weight_rate ??
        record.transfer_branch_excess_weight_rate ??
        record.other_branch_weight_rate ??
        30,
    ),
    extra_distance_rate: Number(
      record.extra_distance_rate ??
        record.extra_distance_rate_per_km ??
        6,
    ),
    fragile_multiplier: Number(
      record.fragile_multiplier ?? 1.05,
    ),
    local_same_day_multiplier: Number(
      record.local_same_day_multiplier ??
        record.same_day_same_branch_multiplier ??
        record.same_branch_sdd_multiplier ??
        1.5,
    ),
    transfer_same_day_multiplier: Number(
      record.transfer_same_day_multiplier ??
        record.same_day_transfer_branch_multiplier ??
        record.other_branch_sdd_multiplier ??
        2,
    ),
    same_day_cutoff_time: dayjs(cutoff, "HH:mm"),
    minimum_free_pickup_packets: Number(
      record.minimum_free_pickup_packets ??
        record.minimum_pickup_packet_count ??
        record.minimum_pickup_packets ??
        3,
    ),
    small_pickup_charge: Number(
      record.small_pickup_charge ??
        record.low_packet_pickup_charge ??
        50,
    ),
    vat_percentage: Number(record.vat_percentage ?? 13),
    fragile_enabled: toBoolean(
      record.fragile_enabled ?? true,
    ),
    same_day_enabled: toBoolean(
      record.same_day_enabled ?? true,
    ),
    pickup_charge_enabled: toBoolean(
      record.pickup_charge_enabled ?? true,
    ),
    vat_enabled: toBoolean(record.vat_enabled ?? true),
  };
}

export function buildPricingPayload(
  values,
  activate = false,
) {
  return {
    name: String(values.name || "").trim(),
    base_weight_kg: Number(values.base_weight_kg),
    base_distance_km: Number(values.base_distance_km),
    local_extra_weight_rate: Number(
      values.local_extra_weight_rate,
    ),
    transfer_extra_weight_rate: Number(
      values.transfer_extra_weight_rate,
    ),
    extra_distance_rate: Number(
      values.extra_distance_rate,
    ),
    fragile_multiplier: Number(
      values.fragile_multiplier,
    ),
    local_same_day_multiplier: Number(
      values.local_same_day_multiplier,
    ),
    transfer_same_day_multiplier: Number(
      values.transfer_same_day_multiplier,
    ),
    same_day_cutoff_time:
      values.same_day_cutoff_time?.format("HH:mm") ||
      "12:00",
    minimum_free_pickup_packets: Number(
      values.minimum_free_pickup_packets,
    ),
    small_pickup_charge: Number(
      values.small_pickup_charge,
    ),
    vat_percentage: Number(values.vat_percentage),
    vat_inclusive: true,
    weight_rounding: values.weight_rounding || "none",
    distance_rounding:
      values.distance_rounding || "none",
    money_rounding: values.money_rounding || "round",
    fragile_enabled: Boolean(values.fragile_enabled),
    same_day_enabled: Boolean(values.same_day_enabled),
    pickup_charge_enabled: Boolean(
      values.pickup_charge_enabled,
    ),
    vat_enabled: Boolean(values.vat_enabled),
    activate: Boolean(activate),
  };
}

export function pricingErrorMessage(
  error,
  fallback = "The request could not be completed.",
) {
  const errors = error?.response?.data?.errors;

  if (errors && typeof errors === "object") {
    const first = Object.values(errors)
      .flat()
      .find(Boolean);

    if (first) {
      return String(first);
    }
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}
