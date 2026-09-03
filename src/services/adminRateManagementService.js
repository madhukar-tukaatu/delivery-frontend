import api from "@/lib/api";

/*
|--------------------------------------------------------------------------
| Endpoint configuration
|--------------------------------------------------------------------------
|
| api.js already contains:
|
|   https://api.tukaatuexpress.com/api/v1
|
| Therefore we ONLY use:
|
|   /admin/...
|
|--------------------------------------------------------------------------
*/

const ADMIN_PREFIX = "/admin";

const ENDPOINTS = Object.freeze({
  branches: `${ADMIN_PREFIX}/branches`,
  serviceTypes: `${ADMIN_PREFIX}/service-types`,

  /*
   * Commercial branch-to-branch pricing.
   */
  branchRouteRates: `${ADMIN_PREFIX}/branch-route-rates`,

  /*
   * Kept for backward compatibility.
   *
   * Your current operational routing architecture should prefer
   * branch-transfer-routes.
   */
  transferLanes: `${ADMIN_PREFIX}/branch-transfer-lanes`,

  /*
   * Operational transfer routes.
   */
  transferRoutes: `${ADMIN_PREFIX}/rate/branch-transfer-routes`,

  pricingQuotes: `${ADMIN_PREFIX}/pricing-quotes`,
});

/*
|--------------------------------------------------------------------------
| Response helpers
|--------------------------------------------------------------------------
*/

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function unwrapList(response) {
  const payload = unwrapData(response);

  if (Array.isArray(payload)) {
    return {
      data: payload,
      current_page: 1,
      per_page: payload.length,
      total: payload.length,
      last_page: 1,
    };
  }

  if (payload && typeof payload === "object") {
    return {
      data: Array.isArray(payload.data) ? payload.data : [],
      current_page: payload.current_page ?? 1,
      per_page:
        payload.per_page ??
        (Array.isArray(payload.data) ? payload.data.length : 0),
      total:
        payload.total ??
        (Array.isArray(payload.data) ? payload.data.length : 0),
      last_page: payload.last_page ?? 1,
      ...payload,
    };
  }

  return {
    data: [],
    current_page: 1,
    per_page: 0,
    total: 0,
    last_page: 1,
  };
}

function resolveId(value, nestedKey = null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number" || typeof value === "string") {
    const id = Number(value);

    return Number.isFinite(id) ? id : null;
  }

  if (typeof value === "object") {
    const possibleValue = value.id ?? (nestedKey ? value[nestedKey]?.id : null);

    const id = Number(possibleValue);

    return Number.isFinite(id) ? id : null;
  }

  return null;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }

  return Boolean(value);
}

function numberOrFallback(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function stringOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const valueString = String(value).trim();

  return valueString || null;
}

/*
|--------------------------------------------------------------------------
| Branches
|--------------------------------------------------------------------------
*/

export async function getRateBranches(params = {}) {
  const response = await api.get(
    `${ENDPOINTS.branchRouteRates}/coverage-locations`,
    {
      params,
    },
  );

  return response.data;
}

export async function getRateBranch(id) {
  const response = await api.get(`${ENDPOINTS.branches}/${id}`);

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Service types
|--------------------------------------------------------------------------
*/

export async function getRateServiceTypes(params = {}) {
  const response = await api.get(ENDPOINTS.serviceTypes, {
    params: {
      status: "active",
      per_page: 100,
      ...params,
    },
  });

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Branch route rates
|--------------------------------------------------------------------------
|
| This is the COMMERCIAL pricing layer.
|
| Branch transfer routes are operational.
|
|--------------------------------------------------------------------------
*/

export async function getBranchRouteRates(params = {}) {
  const response = await api.get(ENDPOINTS.branchRouteRates, {
    params,
  });

  return response.data;
}

export async function getBranchRouteRateMatrix() {
  const response = await api.get(`${ENDPOINTS.branchRouteRates}/matrix`);

  return response.data;
}

export async function getBranchRouteRate(id) {
  const response = await api.get(`${ENDPOINTS.branchRouteRates}/${id}`);

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Create branch route rate
|--------------------------------------------------------------------------
|
| Fresh-create defaults:
|
|   is_active       = true
|   express_enabled = false
|   same_day_enabled = false
|
| Explicit payload values always win.
|
|--------------------------------------------------------------------------
*/

export async function createBranchRouteRate(payload = {}) {
  const requestPayload = {
    /*
     * Prefer coverage locations because branch pricing operates
     * on the pricing coverage layer.
     */
    pickup_coverage_location_id:
      payload.pickup_coverage_location_id !== undefined
        ? Number(payload.pickup_coverage_location_id)
        : undefined,

    delivery_coverage_location_id:
      payload.delivery_coverage_location_id !== undefined
        ? Number(payload.delivery_coverage_location_id)
        : undefined,

    /*
     * Keep branch IDs as compatibility fallback.
     */
    pickup_branch_id:
      payload.pickup_branch_id !== undefined
        ? Number(payload.pickup_branch_id)
        : undefined,

    delivery_branch_id:
      payload.delivery_branch_id !== undefined
        ? Number(payload.delivery_branch_id)
        : undefined,

    base_rate: numberOrFallback(payload.base_rate, 0),

    is_active: normalizeBoolean(payload.is_active, true),

    /*
     * IMPORTANT:
     *
     * Fresh branch pricing defaults to Express OFF.
     *
     * Explicit false remains false.
     */
    express_enabled: normalizeBoolean(payload.express_enabled, false),

    /*
     * Fresh branch pricing defaults to Same Day OFF.
     *
     * Explicit false remains false.
     */
    same_day_enabled: normalizeBoolean(payload.same_day_enabled, false),
  };

  /*
   * Remove undefined properties so Axios does not send
   * misleading undefined values.
   */
  Object.keys(requestPayload).forEach((key) => {
    if (requestPayload[key] === undefined) {
      delete requestPayload[key];
    }
  });

  const response = await api.post(ENDPOINTS.branchRouteRates, requestPayload);

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Update branch route rate
|--------------------------------------------------------------------------
|
| Explicit toggle values are preserved.
|
| Missing Express/Same Day values default to OFF.
|
| This does NOT change normal edit behavior because:
|
|   false -> false
|   true  -> true
|
|--------------------------------------------------------------------------
*/

export async function updateBranchRouteRate(id, payload = {}) {
  if (!id) {
    throw new Error("Branch route rate ID is required.");
  }

  const requestPayload = {
    pickup_coverage_location_id:
      payload.pickup_coverage_location_id !== undefined
        ? Number(payload.pickup_coverage_location_id)
        : undefined,

    delivery_coverage_location_id:
      payload.delivery_coverage_location_id !== undefined
        ? Number(payload.delivery_coverage_location_id)
        : undefined,

    pickup_branch_id:
      payload.pickup_branch_id !== undefined
        ? Number(payload.pickup_branch_id)
        : undefined,

    delivery_branch_id:
      payload.delivery_branch_id !== undefined
        ? Number(payload.delivery_branch_id)
        : undefined,

    base_rate: numberOrFallback(payload.base_rate, 0),

    is_active: normalizeBoolean(payload.is_active, true),

    /*
     * Explicit boolean values.
     *
     * false remains false.
     */
    express_enabled: normalizeBoolean(payload.express_enabled, false),

    same_day_enabled: normalizeBoolean(payload.same_day_enabled, false),
  };

  Object.keys(requestPayload).forEach((key) => {
    if (requestPayload[key] === undefined) {
      delete requestPayload[key];
    }
  });

  const response = await api.put(
    `${ENDPOINTS.branchRouteRates}/${id}`,
    requestPayload,
  );

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Branch route rate active status
|--------------------------------------------------------------------------
*/

export async function updateBranchRouteRateStatus(id, isActive) {
  if (!id) {
    throw new Error("Branch route rate ID is required.");
  }

  const active = normalizeBoolean(isActive, false);

  const response = await api.patch(
    `${ENDPOINTS.branchRouteRates}/${id}/status`,
    {
      is_active: active,
    },
  );

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Delete branch route rate
|--------------------------------------------------------------------------
*/

export async function deleteBranchRouteRate(id) {
  const response = await api.delete(`${ENDPOINTS.branchRouteRates}/${id}`);

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Reverse branch route rate
|--------------------------------------------------------------------------
|
| Example:
|
| KTM -> Kavre
|
| becomes:
|
| Kavre -> KTM
|
| The ORIGINAL price is preserved.
|
| Express / Same Day settings are also preserved.
|
|--------------------------------------------------------------------------
*/

export async function createReverseBranchRouteRate(routeRate, overrides = {}) {
  if (!routeRate) {
    throw new Error("Branch route rate is required.");
  }

  /*
   * Prefer coverage-location IDs.
   */
  const pickupCoverageLocationId = resolveId(
    routeRate?.pickup_coverage_location_id,
  );

  const deliveryCoverageLocationId = resolveId(
    routeRate?.delivery_coverage_location_id,
  );

  /*
   * Fallback to branch IDs.
   */
  const pickupBranchId = resolveId(
    routeRate?.pickup_branch_id ?? routeRate?.pickup_branch,
  );

  const deliveryBranchId = resolveId(
    routeRate?.delivery_branch_id ?? routeRate?.delivery_branch,
  );

  const reversePickupId = deliveryCoverageLocationId ?? deliveryBranchId;

  const reverseDeliveryId = pickupCoverageLocationId ?? pickupBranchId;

  if (!reversePickupId || !reverseDeliveryId) {
    throw new Error(
      "Pickup and delivery branch/coverage IDs are required to create the reverse rate.",
    );
  }

  /*
   * Preserve original values first.
   *
   * Explicit overrides win.
   */
  const baseRate = numberOrFallback(
    overrides.base_rate ?? routeRate?.base_rate,
    0,
  );

  const isActive = normalizeBoolean(
    overrides.is_active ?? routeRate?.is_active,
    true,
  );

  /*
   * IMPORTANT:
   *
   * Reverse creation should preserve the
   * original route's setting.
   *
   * Existing route values are therefore
   * used before the fallback.
   */
  const expressEnabled = normalizeBoolean(
    overrides.express_enabled ?? routeRate?.express_enabled,
    false,
  );

  const sameDayEnabled = normalizeBoolean(
    overrides.same_day_enabled ?? routeRate?.same_day_enabled,
    false,
  );

  const requestPayload = {
    /*
     * Reverse direction.
     */
    pickup_coverage_location_id: reversePickupId,

    delivery_coverage_location_id: reverseDeliveryId,

    /*
     * Branch IDs are included as well when available.
     */
    ...(deliveryBranchId
      ? {
          pickup_branch_id: deliveryBranchId,
        }
      : {}),

    ...(pickupBranchId
      ? {
          delivery_branch_id: pickupBranchId,
        }
      : {}),

    /*
     * Preserve commercial values.
     */
    base_rate: baseRate,

    is_active: isActive,

    express_enabled: expressEnabled,

    same_day_enabled: sameDayEnabled,

    /*
     * Explicit overrides are applied LAST,
     * but undefined values are ignored.
     */
    ...Object.fromEntries(
      Object.entries(overrides).filter(([, value]) => value !== undefined),
    ),
  };

  /*
   * Re-assert critical values after overrides.
   */
  requestPayload.base_rate =
    overrides.base_rate !== undefined
      ? numberOrFallback(overrides.base_rate, baseRate)
      : baseRate;

  requestPayload.is_active =
    overrides.is_active !== undefined
      ? normalizeBoolean(overrides.is_active, isActive)
      : isActive;

  requestPayload.express_enabled =
    overrides.express_enabled !== undefined
      ? normalizeBoolean(overrides.express_enabled, expressEnabled)
      : expressEnabled;

  requestPayload.same_day_enabled =
    overrides.same_day_enabled !== undefined
      ? normalizeBoolean(overrides.same_day_enabled, sameDayEnabled)
      : sameDayEnabled;

  return createBranchRouteRate(requestPayload);
}

/*
|--------------------------------------------------------------------------
| Direct transfer lanes
|--------------------------------------------------------------------------
|
| Legacy compatibility.
|
| The preferred operational model is now:
|
|   BranchTransferRoute
|
|--------------------------------------------------------------------------
*/

export async function getBranchTransferLanes(params = {}) {
  const response = await api.get(ENDPOINTS.transferLanes, {
    params,
  });

  return response.data;
}

export async function getBranchTransferLane(id) {
  const response = await api.get(`${ENDPOINTS.transferLanes}/${id}`);

  return unwrapData(response);
}

export async function createBranchTransferLane(payload = {}) {
  const requestPayload = {
    from_branch_id: Number(payload.from_branch_id),

    to_branch_id: Number(payload.to_branch_id),

    service_type: payload.service_type || "standard",

    transport_mode: payload.transport_mode || "road",

    distance_km: numberOrFallback(payload.distance_km, 0),

    estimated_hours: numberOrFallback(payload.estimated_hours, 1),

    priority: numberOrFallback(payload.priority, 100),

    is_bidirectional: normalizeBoolean(payload.is_bidirectional, false),

    is_active: normalizeBoolean(payload.is_active, true),
  };

  const response = await api.post(ENDPOINTS.transferLanes, requestPayload);

  return unwrapData(response);
}

export async function updateBranchTransferLane(id, payload = {}) {
  const requestPayload = {
    from_branch_id: Number(payload.from_branch_id),

    to_branch_id: Number(payload.to_branch_id),

    service_type: payload.service_type || "standard",

    transport_mode: payload.transport_mode || "road",

    distance_km: numberOrFallback(payload.distance_km, 0),

    estimated_hours: numberOrFallback(payload.estimated_hours, 1),

    priority: numberOrFallback(payload.priority, 100),

    is_bidirectional: normalizeBoolean(payload.is_bidirectional, false),

    is_active: normalizeBoolean(payload.is_active, true),
  };

  const response = await api.put(
    `${ENDPOINTS.transferLanes}/${id}`,
    requestPayload,
  );

  return unwrapData(response);
}

export async function updateBranchTransferLaneStatus(id, isActive) {
  const response = await api.patch(`${ENDPOINTS.transferLanes}/${id}/status`, {
    is_active: normalizeBoolean(isActive, false),
  });

  return unwrapData(response);
}

export async function deleteBranchTransferLane(id) {
  const response = await api.delete(`${ENDPOINTS.transferLanes}/${id}`);

  return response.data;
}

export async function createReverseBranchTransferLane(lane, overrides = {}) {
  const fromBranchId = resolveId(lane?.from_branch_id ?? lane?.from_branch);

  const toBranchId = resolveId(lane?.to_branch_id ?? lane?.to_branch);

  if (!fromBranchId || !toBranchId) {
    throw new Error(
      "From and to branch IDs are required to create the reverse lane.",
    );
  }

  const requestPayload = {
    from_branch_id: toBranchId,

    to_branch_id: fromBranchId,

    service_type: lane?.service_type ?? "standard",

    transport_mode: lane?.transport_mode ?? "road",

    distance_km: numberOrFallback(lane?.distance_km, 0),

    estimated_hours: numberOrFallback(lane?.estimated_hours, 1),

    priority: numberOrFallback(lane?.priority, 100),

    is_bidirectional: false,

    is_active: normalizeBoolean(lane?.is_active, true),

    ...Object.fromEntries(
      Object.entries(overrides).filter(([, value]) => value !== undefined),
    ),
  };

  return createBranchTransferLane(requestPayload);
}

/*
|--------------------------------------------------------------------------
| Complete transfer routes
|--------------------------------------------------------------------------
*/

export async function getBranchTransferRoutes(params = {}) {
  const response = await api.get(ENDPOINTS.transferRoutes, {
    params,
  });

  return response.data;
}

export async function getBranchTransferRoute(id) {
  const response = await api.get(`${ENDPOINTS.transferRoutes}/${id}`);

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Route preview
|--------------------------------------------------------------------------
*/

export async function previewBranchTransferRoute(payload = {}) {
  const requestPayload = {
    route_type: "transfer",

    origin_branch_id: Number(payload.origin_branch_id),

    destination_branch_id: Number(payload.destination_branch_id),

    transit_branch_ids: Array.isArray(payload.transit_branch_ids)
      ? payload.transit_branch_ids.map(Number).filter(Number.isFinite)
      : [],

    service_type: payload.service_type || "standard",
  };

  const response = await api.post(
    `${ENDPOINTS.transferRoutes}/preview`,
    requestPayload,
  );

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Create transfer route
|--------------------------------------------------------------------------
*/

export async function createBranchTransferRoute(payload = {}) {
  const requestPayload = {
    route_type: "transfer",

    route_code: stringOrNull(payload.route_code),

    name: stringOrNull(payload.name),

    origin_branch_id: Number(payload.origin_branch_id),

    destination_branch_id: Number(payload.destination_branch_id),

    transit_branch_ids: Array.isArray(payload.transit_branch_ids)
      ? payload.transit_branch_ids.map(Number).filter(Number.isFinite)
      : [],

    service_type: payload.service_type || "standard",

    base_rate: numberOrFallback(payload.base_rate, 0),

    currency: payload.currency || "NPR",

    priority: numberOrFallback(payload.priority, 100),

    is_default: normalizeBoolean(payload.is_default, true),

    is_active: normalizeBoolean(payload.is_active, true),

    notes: stringOrNull(payload.notes),
  };

  const response = await api.post(ENDPOINTS.transferRoutes, requestPayload);

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Update transfer route
|--------------------------------------------------------------------------
*/

export async function updateBranchTransferRoute(id, payload = {}) {
  const requestPayload = {
    route_type: "transfer",

    route_code: stringOrNull(payload.route_code),

    name: stringOrNull(payload.name),

    origin_branch_id: Number(payload.origin_branch_id),

    destination_branch_id: Number(payload.destination_branch_id),

    transit_branch_ids: Array.isArray(payload.transit_branch_ids)
      ? payload.transit_branch_ids.map(Number).filter(Number.isFinite)
      : [],

    service_type: payload.service_type || "standard",

    base_rate: numberOrFallback(payload.base_rate, 0),

    currency: payload.currency || "NPR",

    priority: numberOrFallback(payload.priority, 100),

    is_default: normalizeBoolean(payload.is_default, true),

    is_active: normalizeBoolean(payload.is_active, true),

    notes: stringOrNull(payload.notes),
  };

  const response = await api.put(
    `${ENDPOINTS.transferRoutes}/${id}`,
    requestPayload,
  );

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Transfer route active status
|--------------------------------------------------------------------------
*/

export async function updateBranchTransferRouteStatus(id, isActive) {
  const response = await api.patch(`${ENDPOINTS.transferRoutes}/${id}/status`, {
    is_active: normalizeBoolean(isActive, false),
  });

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Delete transfer route
|--------------------------------------------------------------------------
*/

export async function deleteBranchTransferRoute(id) {
  const response = await api.delete(`${ENDPOINTS.transferRoutes}/${id}`);

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Build reverse complete transfer route
|--------------------------------------------------------------------------
*/

export function buildReverseTransferRoutePayload(route, overrides = {}) {
  const originBranchId = resolveId(
    route?.origin_branch_id ?? route?.origin_branch,
  );

  const destinationBranchId = resolveId(
    route?.destination_branch_id ?? route?.destination_branch,
  );

  if (!originBranchId || !destinationBranchId) {
    throw new Error(
      "Origin and destination branches are required to create the reverse route.",
    );
  }

  /*
   * Resolve transit branches.
   */
  const transitBranchIds = Array.isArray(route?.transit_branch_ids)
    ? route.transit_branch_ids.map(Number).filter(Number.isFinite)
    : Array.isArray(route?.transit_branches)
      ? route.transit_branches
          .map((branch) => resolveId(branch))
          .filter(Boolean)
      : [];

  /*
   * Reverse the operational path.
   *
   * Example:
   *
   * KTM -> Mugling -> Chitwan -> Pokhara
   *
   * becomes:
   *
   * Pokhara -> Chitwan -> Mugling -> KTM
   */
  const reverseTransitBranchIds = [...transitBranchIds].reverse();

  const originalCode = String(route?.route_code ?? "").trim();

  const generatedCode = originalCode
    ? `${originalCode}-REV`
    : `ROUTE-${destinationBranchId}-${originBranchId}`;

  const originName =
    route?.origin_branch?.name ?? route?.origin_branch_name ?? "Origin";

  const destinationName =
    route?.destination_branch?.name ??
    route?.destination_branch_name ??
    "Destination";

  const basePayload = {
    route_type: "transfer",

    route_code: generatedCode,

    name: `${destinationName} to ${originName}`,

    origin_branch_id: destinationBranchId,

    destination_branch_id: originBranchId,

    transit_branch_ids: reverseTransitBranchIds,

    service_type: route?.service_type ?? "standard",

    base_rate: numberOrFallback(route?.base_rate, 0),

    currency: route?.currency ?? "NPR",

    priority: numberOrFallback(route?.priority, 100),

    is_default: normalizeBoolean(route?.is_default, true),

    is_active: normalizeBoolean(route?.is_active, true),

    notes: route?.route_code
      ? `Reverse of ${route.route_code}`
      : "Reverse transfer route",
  };

  /*
   * Apply only defined overrides.
   */
  return {
    ...basePayload,

    ...Object.fromEntries(
      Object.entries(overrides).filter(([, value]) => value !== undefined),
    ),

    /*
     * Keep required numeric/boolean fields valid.
     */
    origin_branch_id: Number(
      overrides.origin_branch_id ?? basePayload.origin_branch_id,
    ),

    destination_branch_id: Number(
      overrides.destination_branch_id ?? basePayload.destination_branch_id,
    ),

    transit_branch_ids: Array.isArray(overrides.transit_branch_ids)
      ? overrides.transit_branch_ids.map(Number).filter(Number.isFinite)
      : basePayload.transit_branch_ids,

    base_rate: numberOrFallback(
      overrides.base_rate ?? basePayload.base_rate,
      basePayload.base_rate,
    ),

    priority: numberOrFallback(
      overrides.priority ?? basePayload.priority,
      basePayload.priority,
    ),

    is_default: normalizeBoolean(
      overrides.is_default ?? basePayload.is_default,
      basePayload.is_default,
    ),

    is_active: normalizeBoolean(
      overrides.is_active ?? basePayload.is_active,
      basePayload.is_active,
    ),
  };
}

/*
|--------------------------------------------------------------------------
| Create reverse complete transfer route
|--------------------------------------------------------------------------
*/

export async function createReverseBranchTransferRoute(route, overrides = {}) {
  const payload = buildReverseTransferRoutePayload(route, overrides);

  /*
   * Validate the route before creating it.
   */
  await previewBranchTransferRoute(payload);

  return createBranchTransferRoute(payload);
}

/*
|--------------------------------------------------------------------------
| Pricing quotes
|--------------------------------------------------------------------------
*/

export async function getPricingQuotes(params = {}) {
  const response = await api.get(ENDPOINTS.pricingQuotes, {
    params,
  });

  return response.data;
}

export async function getPricingQuote(id) {
  const response = await api.get(`${ENDPOINTS.pricingQuotes}/${id}`);

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Compatibility aliases
|--------------------------------------------------------------------------
*/

export const listBranchRouteRates = getBranchRouteRates;

export const listTransferLanes = getBranchTransferLanes;

export const listTransferRoutes = getBranchTransferRoutes;

export const createTransferLane = createBranchTransferLane;

export const updateTransferLane = updateBranchTransferLane;

export const deleteTransferLane = deleteBranchTransferLane;

export const createTransferRoute = createBranchTransferRoute;

export const updateTransferRoute = updateBranchTransferRoute;

export const deleteTransferRoute = deleteBranchTransferRoute;

export const previewTransferRoute = previewBranchTransferRoute;

/*
|--------------------------------------------------------------------------
| Named exports
|--------------------------------------------------------------------------
*/

export { ENDPOINTS, unwrapData, unwrapList, resolveId, normalizeBoolean };
