import api from "@/lib/api";

/**
 * Admin Pricing Simulator Service
 *
 * Responsibilities:
 * - Communicate with the admin pricing simulator API.
 * - Keep API implementation outside React components.
 * - Normalize the API response.
 *
 * The pricing engine remains responsible for:
 * - Branch pricing
 * - Global pricing settings
 * - Service pricing
 * - Weight pricing
 * - Surcharges
 * - VAT
 * - Configured transfer route resolution
 *
 * The frontend should NOT calculate pricing itself.
 */

const ADMIN_PRICING_SIMULATOR_ENDPOINT =
  "/admin/pricing-simulator";

/**
 * Calculate a shipment price.
 *
 * @param {Object} payload
 * @returns {Promise<Object|null>}
 */
async function calculate(payload) {
  const response = await api.post(
    ADMIN_PRICING_SIMULATOR_ENDPOINT,
    payload,
  );

  return (
    response?.data?.data ??
    response?.data ??
    null
  );
}

/**
 * Pricing simulator service.
 *
 * Keep all pricing-simulator API calls here.
 */
const adminPricingSimulatorService = {
  calculate,
};

export default adminPricingSimulatorService;