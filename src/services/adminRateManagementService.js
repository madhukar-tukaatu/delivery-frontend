// src/services/adminRateManagementService.js

import api from "@/lib/api";

const ADMIN_PREFIX = "/admin";

const ENDPOINTS = Object.freeze({
  branches: `${ADMIN_PREFIX}/branches`,
  serviceTypes: `${ADMIN_PREFIX}/service-types`,
  branchRouteRates: `${ADMIN_PREFIX}/branch-route-rates`,
  transferLanes: `${ADMIN_PREFIX}/branch-transfer-lanes`,
  transferRoutes: `${ADMIN_PREFIX}/rate/branch-transfer-routes`,
  pricingQuotes: `${ADMIN_PREFIX}/pricing-quotes`,
});

/**
 * --------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------
 */

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? null;
}

function unwrapList(response) {
  const payload = response?.data ?? response ?? null;

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

function resolveId(value, nestedKey = null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object") {
    if (nestedKey && value[nestedKey] !== undefined) {
      return resolveId(value[nestedKey]);
    }

    if (value.id !== undefined) {
      return resolveId(value.id);
    }

    return null;
  }

  const id = Number(value);

  return Number.isFinite(id) ? id : null;
}

function normalizeBoolean(value) {
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
 * --------------------------------------------------------------------------
 * Branches
 * --------------------------------------------------------------------------
 */

export async function getBranches(params = {}) {
  const response = await api.get(ENDPOINTS.branches, {
    params,
  });

  return unwrapList(response);
}

export async function getBranch(id) {
  const response = await api.get(
    `${ENDPOINTS.branches}/${id}`,
  );

  return unwrapData(response);
}

/**
 * --------------------------------------------------------------------------
 * Service Types
 * --------------------------------------------------------------------------
 */

export async function getServiceTypes(params = {}) {
  const response = await api.get(
    ENDPOINTS.serviceTypes,
    {
      params,
    },
  );

  return unwrapList(response);
}

/**
 * --------------------------------------------------------------------------
 * Branch Route Rates
 * --------------------------------------------------------------------------
 */

export async function getBranchRouteRates(params = {}) {
  const response = await api.get(
    ENDPOINTS.branchRouteRates,
    {
      params,
    },
  );

  return response.data;
}

export async function getBranchRouteRateMatrix() {
  const response = await api.get(
    `${ENDPOINTS.branchRouteRates}/matrix`,
  );

  return response.data;
}

export async function getBranchRouteRate(id) {
  const response = await api.get(
    `${ENDPOINTS.branchRouteRates}/${id}`,
  );

  return unwrapData(response);
}

/**
 * Create branch route rate.
 *
 * Boolean values are normalized before being sent to Laravel.
 */
export async function createBranchRouteRate(payload = {}) {
  const requestPayload = {
    ...payload,

    pickup_coverage_location_id: resolveId(
      payload.pickup_coverage_location_id ??
        payload.pickup_branch_id,
    ),

    delivery_coverage_location_id: resolveId(
      payload.delivery_coverage_location_id ??
        payload.delivery_branch_id,
    ),

    base_rate: Number(payload.base_rate ?? 0),

    is_active: normalizeBoolean(
      payload.is_active,
    ),

    express_enabled: normalizeBoolean(
      payload.express_enabled,
    ),

    same_day_enabled: normalizeBoolean(
      payload.same_day_enabled,
    ),
  };

  /**
   * Remove legacy branch IDs if coverage location IDs
   * are the actual API contract.
   */
  delete requestPayload.pickup_branch_id;
  delete requestPayload.delivery_branch_id;

  const response = await api.post(
    ENDPOINTS.branchRouteRates,
    requestPayload,
  );

  return unwrapData(response);
}

/**
 * Update branch route rate.
 *
 * THIS is the important fix for edit.
 */
export async function updateBranchRouteRate(
  id,
  payload = {},
) {
  const requestPayload = {
    ...payload,

    pickup_coverage_location_id: resolveId(
      payload.pickup_coverage_location_id ??
        payload.pickup_branch_id,
    ),

    delivery_coverage_location_id: resolveId(
      payload.delivery_coverage_location_id ??
        payload.delivery_branch_id,
    ),

    base_rate: Number(payload.base_rate ?? 0),

    is_active: normalizeBoolean(
      payload.is_active,
    ),

    express_enabled: normalizeBoolean(
      payload.express_enabled,
    ),

    same_day_enabled: normalizeBoolean(
      payload.same_day_enabled,
    ),
  };

  delete requestPayload.pickup_branch_id;
  delete requestPayload.delivery_branch_id;

  const response = await api.put(
    `${ENDPOINTS.branchRouteRates}/${id}`,
    requestPayload,
  );

  return unwrapData(response);
}

/**
 * Update active status.
 */
export async function updateBranchRouteRateStatus(
  id,
  isActive,
) {
  const response = await api.patch(
    `${ENDPOINTS.branchRouteRates}/${id}/status`,
    {
      is_active: normalizeBoolean(isActive),
    },
  );

  return unwrapData(response);
}

/**
 * Delete branch route rate.
 */
export async function deleteBranchRouteRate(id) {
  const response = await api.delete(
    `${ENDPOINTS.branchRouteRates}/${id}`,
  );

  return response.data;
}

/**
 * Create reverse branch route rate.
 */
export async function createReverseBranchRouteRate(
  payload = {},
) {
  const requestPayload = {
    ...payload,

    pickup_coverage_location_id: resolveId(
      payload.pickup_coverage_location_id ??
        payload.pickup_branch_id,
    ),

    delivery_coverage_location_id: resolveId(
      payload.delivery_coverage_location_id ??
        payload.delivery_branch_id,
    ),

    base_rate: Number(payload.base_rate ?? 0),

    is_active: normalizeBoolean(
      payload.is_active,
    ),

    express_enabled: normalizeBoolean(
      payload.express_enabled,
    ),

    same_day_enabled: normalizeBoolean(
      payload.same_day_enabled,
    ),
  };

  delete requestPayload.pickup_branch_id;
  delete requestPayload.delivery_branch_id;

  const response = await api.post(
    ENDPOINTS.branchRouteRates,
    requestPayload,
  );

  return unwrapData(response);
}

/**
 * --------------------------------------------------------------------------
 * Transfer Lanes
 * --------------------------------------------------------------------------
 */

export async function getTransferLanes(params = {}) {
  const response = await api.get(
    ENDPOINTS.transferLanes,
    {
      params,
    },
  );

  return response.data;
}

export async function getTransferLane(id) {
  const response = await api.get(
    `${ENDPOINTS.transferLanes}/${id}`,
  );

  return unwrapData(response);
}

export async function createTransferLane(payload) {
  const response = await api.post(
    ENDPOINTS.transferLanes,
    payload,
  );

  return unwrapData(response);
}

export async function updateTransferLane(
  id,
  payload,
) {
  const response = await api.put(
    `${ENDPOINTS.transferLanes}/${id}`,
    payload,
  );

  return unwrapData(response);
}

export async function deleteTransferLane(id) {
  const response = await api.delete(
    `${ENDPOINTS.transferLanes}/${id}`,
  );

  return response.data;
}

/**
 * --------------------------------------------------------------------------
 * Branch Transfer Routes
 * --------------------------------------------------------------------------
 */

export async function getBranchTransferRoutes(
  params = {},
) {
  const response = await api.get(
    ENDPOINTS.transferRoutes,
    {
      params,
    },
  );

  return response.data;
}

export async function getBranchTransferRoute(id) {
  const response = await api.get(
    `${ENDPOINTS.transferRoutes}/${id}`,
  );

  return unwrapData(response);
}

export async function createBranchTransferRoute(
  payload,
) {
  const response = await api.post(
    ENDPOINTS.transferRoutes,
    payload,
  );

  return unwrapData(response);
}

export async function updateBranchTransferRoute(
  id,
  payload,
) {
  const response = await api.put(
    `${ENDPOINTS.transferRoutes}/${id}`,
    payload,
  );

  return unwrapData(response);
}

export async function deleteBranchTransferRoute(id) {
  const response = await api.delete(
    `${ENDPOINTS.transferRoutes}/${id}`,
  );

  return response.data;
}

/**
 * --------------------------------------------------------------------------
 * Pricing Quotes
 * --------------------------------------------------------------------------
 */

export async function getPricingQuotes(params = {}) {
  const response = await api.get(
    ENDPOINTS.pricingQuotes,
    {
      params,
    },
  );

  return response.data;
}

export async function getPricingQuote(id) {
  const response = await api.get(
    `${ENDPOINTS.pricingQuotes}/${id}`,
  );

  return unwrapData(response);
}

export async function createPricingQuote(payload) {
  const response = await api.post(
    ENDPOINTS.pricingQuotes,
    payload,
  );

  return unwrapData(response);
}

export async function updatePricingQuote(
  id,
  payload,
) {
  const response = await api.put(
    `${ENDPOINTS.pricingQuotes}/${id}`,
    payload,
  );

  return unwrapData(response);
}

export async function deletePricingQuote(id) {
  const response = await api.delete(
    `${ENDPOINTS.pricingQuotes}/${id}`,
  );

  return response.data;
}