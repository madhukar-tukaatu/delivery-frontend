import dayjs from "dayjs";

export const ROUTE_ROUNDING_OPTIONS = [
  { label: "Exact", value: "none" },
  { label: "Nearest", value: "round" },
  { label: "Round up", value: "ceil" },
  { label: "Round down", value: "floor" },
];

export function toBoolean(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  );
}

function numberValue(...values) {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== "",
  );

  const number = Number(found);

  return Number.isFinite(number) ? number : 0;
}

export function toRouteCustomPricingForm(record, route) {
  const cutoff = String(
    record?.same_day_cutoff_time || "12:00",
  ).slice(0, 5);

  return {
    name:
      record?.name ||
      `${route?.route_code || "Route"} Custom Pricing`,

    base_weight_kg: numberValue(
      record?.base_weight_kg,
      record?.included_weight_kg,
      1.5,
    ),

    base_distance_km: numberValue(
      record?.base_distance_km,
      record?.included_delivery_distance_km,
      5,
    ),

    transfer_extra_weight_rate: numberValue(
      record?.transfer_extra_weight_rate,
      record?.transfer_branch_excess_weight_rate,
      record?.other_branch_weight_rate,
      30,
    ),

    extra_distance_rate: numberValue(
      record?.extra_distance_rate,
      record?.extra_distance_rate_per_km,
      6,
    ),

    fragile_multiplier: numberValue(
      record?.fragile_multiplier,
      1.05,
    ),

    transfer_same_day_multiplier: numberValue(
      record?.transfer_same_day_multiplier,
      record?.same_day_transfer_branch_multiplier,
      record?.other_branch_sdd_multiplier,
      2,
    ),

    same_day_cutoff_time: dayjs(cutoff, "HH:mm"),

    minimum_free_pickup_packets: numberValue(
      record?.minimum_free_pickup_packets,
      record?.minimum_pickup_packet_count,
      record?.minimum_pickup_packets,
      3,
    ),

    small_pickup_charge: numberValue(
      record?.small_pickup_charge,
      record?.low_packet_pickup_charge,
      50,
    ),

    vat_percentage: numberValue(record?.vat_percentage, 13),

    weight_rounding: record?.weight_rounding || "none",
    distance_rounding: record?.distance_rounding || "none",
    money_rounding: record?.money_rounding || "round",

    fragile_enabled: toBoolean(record?.fragile_enabled ?? true),
    same_day_enabled: toBoolean(record?.same_day_enabled ?? true),
    pickup_charge_enabled: toBoolean(
      record?.pickup_charge_enabled ?? true,
    ),
    vat_enabled: toBoolean(record?.vat_enabled ?? true),
  };
}

export function buildRoutePricingProfilePayload(values) {
  const mode = values?.pricing_mode || "global";

  if (mode === "global") {
    return {
      mode: "global",
      custom_pricing: null,
    };
  }

  const custom = values?.custom_pricing || {};

  return {
    mode: "custom",

    custom_pricing: {
      name: String(custom.name || "").trim(),

      base_weight_kg: Number(custom.base_weight_kg),
      base_distance_km: Number(custom.base_distance_km),

      transfer_extra_weight_rate: Number(
        custom.transfer_extra_weight_rate,
      ),

      extra_distance_rate: Number(custom.extra_distance_rate),
      fragile_multiplier: Number(custom.fragile_multiplier),

      transfer_same_day_multiplier: Number(
        custom.transfer_same_day_multiplier,
      ),

      same_day_cutoff_time:
        custom.same_day_cutoff_time?.format("HH:mm") || "12:00",

      minimum_free_pickup_packets: Number(
        custom.minimum_free_pickup_packets,
      ),

      small_pickup_charge: Number(custom.small_pickup_charge),
      vat_percentage: Number(custom.vat_percentage),

      weight_rounding: custom.weight_rounding || "none",
      distance_rounding: custom.distance_rounding || "none",
      money_rounding: custom.money_rounding || "round",

      fragile_enabled: Boolean(custom.fragile_enabled),
      same_day_enabled: Boolean(custom.same_day_enabled),
      pickup_charge_enabled: Boolean(
        custom.pickup_charge_enabled,
      ),
      vat_enabled: Boolean(custom.vat_enabled),
    },
  };
}


export async function getTransferRoutePricingProfile(routeId) {
  const response = await api.get(
    `/admin/rate/branch-transfer-routes/${routeId}/pricing-profile`,
  );

  return unwrapData(response);
}

export async function updateTransferRoutePricingProfile(routeId, payload) {
  const response = await api.put(
    `/admin/rate/branch-transfer-routes/${routeId}/pricing-profile`,
    payload,
  );

  return unwrapData(response);
}

export async function getActiveGlobalPricingSettings() {
  const response = await api.get("/admin/pricing-settings", {
    params: {
      page: 1,
      per_page: 1,
    },
  });

  const data = unwrapData(response) ?? {};

  return data?.active ?? null;
}
