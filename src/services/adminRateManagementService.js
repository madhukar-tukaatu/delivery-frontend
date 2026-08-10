
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
|   /admin/rate/...
|
|--------------------------------------------------------------------------
*/

const ADMIN_PREFIX = "/admin";

const ENDPOINTS = Object.freeze({
  branches: `${ADMIN_PREFIX}/branches`,
  serviceTypes: `${ADMIN_PREFIX}/service-types`,

  branchRouteRates: `${ADMIN_PREFIX}/branch-route-rates`,

  transferLanes: `${ADMIN_PREFIX}/branch-transfer-lanes`,

  transferRoutes: `${ADMIN_PREFIX}/rate/branch-transfer-routes`,

  pricingQuotes: `${ADMIN_PREFIX}/pricing-quotes`,
});

/*
|--------------------------------------------------------------------------
| Response helpers
|--------------------------------------------------------------------------
*/

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? null;
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

  return (
    payload ?? {
      data: [],
      current_page: 1,
      per_page: 0,
      total: 0,
      last_page: 1,
    }
  );
}

function resolveId(value, nestedKey = null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "number" ||
    typeof value === "string"
  ) {
    const id = Number(value);

    return Number.isFinite(id) ? id : null;
  }

  if (typeof value === "object") {
    const possibleValue =
      value.id ??
      (nestedKey
        ? value[nestedKey]?.id
        : null);

    const id = Number(possibleValue);

    return Number.isFinite(id) ? id : null;
  }

  return null;
}

function normalizeBoolean(value) {
  return Boolean(
    value === true ||
      value === 1 ||
      value === "1" ||
      value === "true"
  );
}

/*
|--------------------------------------------------------------------------
| Branches
|--------------------------------------------------------------------------
*/

export async function getRateBranches(params = {}) {
  const response = await api.get(
    ENDPOINTS.branches,
    {
      params: {
        status: "active",
        per_page: 500,
        ...params,
      },
    }
  );

  return response.data;
}

export async function getRateBranch(id) {
  const response = await api.get(
    `${ENDPOINTS.branches}/${id}`
  );

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Service types
|--------------------------------------------------------------------------
*/

export async function getRateServiceTypes(
  params = {}
) {
  const response = await api.get(
    ENDPOINTS.serviceTypes,
    {
      params: {
        status: "active",
        per_page: 100,
        ...params,
      },
    }
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Branch route rates
|--------------------------------------------------------------------------
*/

export async function getBranchRouteRates(
  params = {}
) {
  const response = await api.get(
    ENDPOINTS.branchRouteRates,
    {
      params,
    }
  );

  return response.data;
}

export async function getBranchRouteRate(id) {
  const response = await api.get(
    `${ENDPOINTS.branchRouteRates}/${id}`
  );

  return unwrapData(response);
}

export async function createBranchRouteRate(
  payload
) {
  const response = await api.post(
    ENDPOINTS.branchRouteRates,
    payload
  );

  return unwrapData(response);
}

export async function updateBranchRouteRate(
  id,
  payload
) {
  const response = await api.put(
    `${ENDPOINTS.branchRouteRates}/${id}`,
    payload
  );

  return unwrapData(response);
}

export async function updateBranchRouteRateStatus(
  id,
  isActive
) {
  const response = await api.patch(
    `${ENDPOINTS.branchRouteRates}/${id}/status`,
    {
      is_active: normalizeBoolean(isActive),
    }
  );

  return unwrapData(response);
}

export async function deleteBranchRouteRate(id) {
  const response = await api.delete(
    `${ENDPOINTS.branchRouteRates}/${id}`
  );

  return response.data;
}

export async function createReverseBranchRouteRate(
  routeRate,
  overrides = {}
) {
  const pickupBranchId = resolveId(
    routeRate?.pickup_branch_id ??
      routeRate?.pickup_branch
  );

  const deliveryBranchId = resolveId(
    routeRate?.delivery_branch_id ??
      routeRate?.delivery_branch
  );

  if (!pickupBranchId || !deliveryBranchId) {
    throw new Error(
      "Pickup and delivery branch IDs are required to create the reverse rate."
    );
  }

  return createBranchRouteRate({
    pickup_branch_id: deliveryBranchId,
    delivery_branch_id: pickupBranchId,

    base_rate: Number(
      overrides.base_rate ??
        routeRate?.base_rate ??
        0
    ),

    is_active:
      overrides.is_active ??
      routeRate?.is_active ??
      true,

    ...overrides,
  });
}

/*
|--------------------------------------------------------------------------
| Direct transfer lanes
|--------------------------------------------------------------------------
*/

export async function getBranchTransferLanes(
  params = {}
) {
  const response = await api.get(
    ENDPOINTS.transferLanes,
    {
      params,
    }
  );

  return response.data;
}

export async function getBranchTransferLane(id) {
  const response = await api.get(
    `${ENDPOINTS.transferLanes}/${id}`
  );

  return unwrapData(response);
}

export async function createBranchTransferLane(
  payload
) {
  const response = await api.post(
    ENDPOINTS.transferLanes,
    payload
  );

  return unwrapData(response);
}

export async function updateBranchTransferLane(
  id,
  payload
) {
  const response = await api.put(
    `${ENDPOINTS.transferLanes}/${id}`,
    payload
  );

  return unwrapData(response);
}

export async function updateBranchTransferLaneStatus(
  id,
  isActive
) {
  const response = await api.patch(
    `${ENDPOINTS.transferLanes}/${id}/status`,
    {
      is_active: normalizeBoolean(isActive),
    }
  );

  return unwrapData(response);
}

export async function deleteBranchTransferLane(id) {
  const response = await api.delete(
    `${ENDPOINTS.transferLanes}/${id}`
  );

  return response.data;
}

export async function createReverseBranchTransferLane(
  lane,
  overrides = {}
) {
  const fromBranchId = resolveId(
    lane?.from_branch_id ??
      lane?.from_branch
  );

  const toBranchId = resolveId(
    lane?.to_branch_id ??
      lane?.to_branch
  );

  if (!fromBranchId || !toBranchId) {
    throw new Error(
      "From and to branch IDs are required to create the reverse lane."
    );
  }

  return createBranchTransferLane({
    from_branch_id: toBranchId,

    to_branch_id: fromBranchId,

    service_type:
      overrides.service_type ??
      lane?.service_type ??
      "standard",

    transport_mode:
      overrides.transport_mode ??
      lane?.transport_mode ??
      "road",

    distance_km: Number(
      overrides.distance_km ??
        lane?.distance_km ??
        0
    ),

    estimated_hours: Number(
      overrides.estimated_hours ??
        lane?.estimated_hours ??
        1
    ),

    priority: Number(
      overrides.priority ??
        lane?.priority ??
        100
    ),

    is_bidirectional:
      overrides.is_bidirectional ??
      false,

    is_active:
      overrides.is_active ??
      lane?.is_active ??
      true,

    ...overrides,
  });
}

/*
|--------------------------------------------------------------------------
| Complete transfer routes
|--------------------------------------------------------------------------
*/

export async function getBranchTransferRoutes(
  params = {}
) {
  const response = await api.get(
    ENDPOINTS.transferRoutes,
    {
      params,
    }
  );

  return response.data;
}

export async function getBranchTransferRoute(id) {
  const response = await api.get(
    `${ENDPOINTS.transferRoutes}/${id}`
  );

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Route preview
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Always include route_type.
|
|--------------------------------------------------------------------------
*/

export async function previewBranchTransferRoute(
  payload
) {
  const requestPayload = {
    route_type: "transfer",

    origin_branch_id: Number(
      payload.origin_branch_id
    ),

    destination_branch_id: Number(
      payload.destination_branch_id
    ),

    transit_branch_ids: Array.isArray(
      payload.transit_branch_ids
    )
      ? payload.transit_branch_ids
          .map(Number)
          .filter(Number.isFinite)
      : [],

    service_type:
      payload.service_type || "standard",
  };

  const response = await api.post(
    `${ENDPOINTS.transferRoutes}/preview`,
    requestPayload
  );

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| CREATE TRANSFER ROUTE
|--------------------------------------------------------------------------
*/

export async function createBranchTransferRoute(
  payload
) {
  const requestPayload = {
    route_type: "transfer",

    route_code:
      payload.route_code?.trim(),

    name:
      payload.name?.trim(),

    origin_branch_id: Number(
      payload.origin_branch_id
    ),

    destination_branch_id: Number(
      payload.destination_branch_id
    ),

    transit_branch_ids: Array.isArray(
      payload.transit_branch_ids
    )
      ? payload.transit_branch_ids
          .map(Number)
          .filter(Number.isFinite)
      : [],

    service_type:
      payload.service_type || "standard",

    base_rate: Number(
      payload.base_rate ?? 0
    ),

    currency:
      payload.currency || "NPR",

    priority: Number(
      payload.priority ?? 100
    ),

    is_default:
      payload.is_default !== false,

    is_active:
      payload.is_active !== false,

    notes:
      payload.notes?.trim() || null,
  };

  const response = await api.post(
    ENDPOINTS.transferRoutes,
    requestPayload
  );

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| UPDATE TRANSFER ROUTE
|--------------------------------------------------------------------------
*/

export async function updateBranchTransferRoute(
  id,
  payload
) {
  const requestPayload = {
    route_type: "transfer",

    route_code:
      payload.route_code?.trim(),

    name:
      payload.name?.trim(),

    origin_branch_id: Number(
      payload.origin_branch_id
    ),

    destination_branch_id: Number(
      payload.destination_branch_id
    ),

    transit_branch_ids: Array.isArray(
      payload.transit_branch_ids
    )
      ? payload.transit_branch_ids
          .map(Number)
          .filter(Number.isFinite)
      : [],

    service_type:
      payload.service_type || "standard",

    base_rate: Number(
      payload.base_rate ?? 0
    ),

    currency:
      payload.currency || "NPR",

    priority: Number(
      payload.priority ?? 100
    ),

    is_default:
      payload.is_default !== false,

    is_active:
      payload.is_active !== false,

    notes:
      payload.notes?.trim() || null,
  };

  const response = await api.put(
    `${ENDPOINTS.transferRoutes}/${id}`,
    requestPayload
  );

  return unwrapData(response);
}

export async function updateBranchTransferRouteStatus(
  id,
  isActive
) {
  const response = await api.patch(
    `${ENDPOINTS.transferRoutes}/${id}/status`,
    {
      is_active:
        normalizeBoolean(isActive),
    }
  );

  return unwrapData(response);
}

export async function deleteBranchTransferRoute(id) {
  const response = await api.delete(
    `${ENDPOINTS.transferRoutes}/${id}`
  );

  return response.data;
}

/*
|--------------------------------------------------------------------------
| Reverse complete transfer route
|--------------------------------------------------------------------------
*/

export function buildReverseTransferRoutePayload(
  route,
  overrides = {}
) {
  const originBranchId = resolveId(
    route?.origin_branch_id ??
      route?.origin_branch
  );

  const destinationBranchId =
    resolveId(
      route?.destination_branch_id ??
        route?.destination_branch
    );

  if (
    !originBranchId ||
    !destinationBranchId
  ) {
    throw new Error(
      "Origin and destination branches are required to create the reverse route."
    );
  }

  const transitBranchIds =
    Array.isArray(
      route?.transit_branch_ids
    )
      ? route.transit_branch_ids
          .map(Number)
          .filter(Number.isFinite)
      : Array.isArray(
          route?.transit_branches
        )
      ? route.transit_branches
          .map((branch) =>
            resolveId(branch)
          )
          .filter(Boolean)
      : [];

  const reverseTransitBranchIds = [
    ...transitBranchIds,
  ].reverse();

  const originalCode = String(
    route?.route_code ?? ""
  ).trim();

  const generatedCode =
    overrides.route_code ??
    (originalCode
      ? `${originalCode}-REV`
      : `ROUTE-${destinationBranchId}-${originBranchId}`);

  const originName =
    route?.origin_branch?.name ??
    route?.origin_branch_name ??
    "Origin";

  const destinationName =
    route?.destination_branch?.name ??
    route?.destination_branch_name ??
    "Destination";

  return {
    route_type: "transfer",

    route_code: generatedCode,

    name:
      overrides.name ??
      `${destinationName} to ${originName}`,

    origin_branch_id:
      destinationBranchId,

    destination_branch_id:
      originBranchId,

    transit_branch_ids:
      reverseTransitBranchIds,

    service_type:
      overrides.service_type ??
      route?.service_type ??
      "standard",

    base_rate: Number(
      overrides.base_rate ??
        route?.base_rate ??
        0
    ),

    currency:
      overrides.currency ??
      route?.currency ??
      "NPR",

    priority: Number(
      overrides.priority ??
        route?.priority ??
        100
    ),

    is_default:
      overrides.is_default ??
      route?.is_default ??
      true,

    is_active:
      overrides.is_active ??
      route?.is_active ??
      true,

    notes:
      overrides.notes ??
      (route?.route_code
        ? `Reverse of ${route.route_code}`
        : "Reverse transfer route"),

    ...overrides,
  };
}

export async function createReverseBranchTransferRoute(
  route,
  overrides = {}
) {
  const payload =
    buildReverseTransferRoutePayload(
      route,
      overrides
    );

  await previewBranchTransferRoute(
    payload
  );

  return createBranchTransferRoute(
    payload
  );
}

/*
|--------------------------------------------------------------------------
| Pricing quotes
|--------------------------------------------------------------------------
*/

export async function getPricingQuotes(
  params = {}
) {
  const response = await api.get(
    ENDPOINTS.pricingQuotes,
    {
      params,
    }
  );

  return response.data;
}

export async function getPricingQuote(id) {
  const response = await api.get(
    `${ENDPOINTS.pricingQuotes}/${id}`
  );

  return unwrapData(response);
}

/*
|--------------------------------------------------------------------------
| Compatibility aliases
|--------------------------------------------------------------------------
*/

export const listBranchRouteRates =
  getBranchRouteRates;

export const listTransferLanes =
  getBranchTransferLanes;

export const listTransferRoutes =
  getBranchTransferRoutes;

export const createTransferLane =
  createBranchTransferLane;

export const updateTransferLane =
  updateBranchTransferLane;

export const deleteTransferLane =
  deleteBranchTransferLane;

export const createTransferRoute =
  createBranchTransferRoute;

export const updateTransferRoute =
  updateBranchTransferRoute;

export const deleteTransferRoute =
  deleteBranchTransferRoute;

export const previewTransferRoute =
  previewBranchTransferRoute;

export {
  ENDPOINTS,
  unwrapData,
  unwrapList,
};