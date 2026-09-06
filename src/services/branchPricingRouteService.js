import api from "@/lib/api";

/**
 * Branch Pricing Route Service
 * Manages pricing creation/editing with automatic route configuration
 */

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

/**
 * GET /admin/branch-pricing-routes
 * List all branch pricing rules
 */
export async function getBranchPricings(params = {}) {
  const response = await api.get("/admin/branch-pricing-routes", {
    params,
  });

  const payload = unwrap(response);
  return Array.isArray(payload) ? payload : [];
}

/**
 * GET /admin/branch-pricing-routes/{id}
 * Get single pricing rule with all service types
 */
export async function getBranchPricing(id) {
  if (!id) {
    throw new Error("Pricing ID is required");
  }

  const response = await api.get(`/admin/branch-pricing-routes/${id}`);
  return unwrap(response);
}

/**
 * GET /admin/branch-pricing-routes/preview
 * Preview route details before creating pricing
 * Shows distance, hours, path, etc.
 */
export async function previewRoute(pickupBranchId, deliveryBranchId) {
  if (!pickupBranchId || !deliveryBranchId) {
    throw new Error("Branch IDs are required");
  }

  const response = await api.get("/admin/branch-pricing-routes/preview", {
    params: {
      pickup_branch_id: pickupBranchId,
      delivery_branch_id: deliveryBranchId,
    },
  });

  return unwrap(response);
}

/**
 * POST /admin/branch-pricing-routes
 * Create new pricing with routes for selected service types
 *
 * @param {Object} payload
 * {
 *   pickup_branch_id: 1,
 *   delivery_branch_id: 2,
 *   service_types: {
 *     standard: { enabled: true, base_rate: 500 },
 *     express: { enabled: true, base_rate: 750 },
 *     same_day: { enabled: false, base_rate: 1500 }
 *   }
 * }
 */
export async function createBranchPricing(payload) {
  if (!payload?.pickup_branch_id || !payload?.delivery_branch_id) {
    throw new Error("Pickup and delivery branch IDs are required");
  }

  if (!payload?.service_types) {
    throw new Error("Service types configuration is required");
  }

  const response = await api.post("/admin/branch-pricing-routes", payload);
  return unwrap(response);
}

/**
 * PUT /admin/branch-pricing-routes/{id}
 * Update existing pricing - can toggle service types and update rates
 */
export async function updateBranchPricing(id, payload) {
  if (!id) {
    throw new Error("Pricing ID is required");
  }

  if (!payload?.service_types) {
    throw new Error("Service types configuration is required");
  }

  const response = await api.put(
    `/admin/branch-pricing-routes/${id}`,
    payload
  );
  return unwrap(response);
}

/**
 * DELETE /admin/branch-pricing-routes/{id}
 * Delete pricing (removes all service types for this route)
 */
export async function deleteBranchPricing(id) {
  if (!id) {
    throw new Error("Pricing ID is required");
  }

  const response = await api.delete(`/admin/branch-pricing-routes/${id}`);
  return unwrap(response);
}

/**
 * Helper: Build service types object from form data
 */
export function buildServiceTypesPayload(formData) {
  return {
    standard: {
      enabled: true, // Always enabled
      base_rate: formData.standard_rate,
    },
    express: {
      enabled: formData.express_enabled || false,
      base_rate: formData.express_enabled ? formData.express_rate : 0,
    },
    same_day: {
      enabled: formData.same_day_enabled || false,
      base_rate: formData.same_day_enabled ? formData.same_day_rate : 0,
    },
  };
}

/**
 * Helper: Extract form data from pricing response
 */
export function extractFormData(pricingGroup) {
  const data = {
    pickup_branch_id: pricingGroup.pickup_branch_id,
    delivery_branch_id: pricingGroup.delivery_branch_id,
    standard_rate: 0,
    express_enabled: false,
    express_rate: 0,
    same_day_enabled: false,
    same_day_rate: 0,
  };

  pricingGroup.service_types?.forEach((st) => {
    switch (st.service_type) {
      case "standard":
        data.standard_rate = st.base_rate;
        break;
      case "express":
        data.express_enabled = true;
        data.express_rate = st.base_rate;
        break;
      case "same_day":
        data.same_day_enabled = true;
        data.same_day_rate = st.base_rate;
        break;
    }
  });

  return data;
}
