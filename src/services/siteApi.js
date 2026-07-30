import api from "@/lib/api";

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? null;
}

function getApiErrorMessage(error, fallbackMessage) {
  const validationErrors = error?.response?.data?.errors;

  if (
    validationErrors &&
    typeof validationErrors === "object"
  ) {
    const firstError = Object.values(validationErrors)
      .flat()
      .find(Boolean);

    if (firstError) {
      return String(firstError);
    }
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
}

export const sitePricingApi = {
  async estimate(payload) {
    try {
      const products = Array.isArray(payload.products)
        ? payload.products
        : [];

      const weightMode =
        payload.weight_mode === "volumetric"
          ? "volumetric"
          : "actual";

      const requestPayload = {
        pickup_address: String(
          payload.pickup_address ?? "",
        ).trim(),

        pickup_latitude: Number(
          payload.pickup_latitude,
        ),

        pickup_longitude: Number(
          payload.pickup_longitude,
        ),

        delivery_address: String(
          payload.delivery_address ?? "",
        ).trim(),

        delivery_latitude: Number(
          payload.delivery_latitude,
        ),

        delivery_longitude: Number(
          payload.delivery_longitude,
        ),

        service_type: String(
          payload.service_type ?? "standard",
        )
          .trim()
          .toLowerCase(),

        weight_mode: weightMode,

        products: products.map(
          (product, index) => {
            const normalizedProduct = {
              product_id:
                product.product_id ?? null,

              name: String(
                product.name ||
                  `Product ${index + 1}`,
              ).trim(),

              quantity: Number(
                product.quantity ?? 1,
              ),

              parcel_type:
                product.parcel_type === "fragile"
                  ? "fragile"
                  : "non_fragile",
            };

            if (weightMode === "actual") {
              normalizedProduct.unit_weight = Number(
                product.unit_weight ??
                  product.actual_weight_kg,
              );
            }

            return normalizedProduct;
          },
        ),
      };

      if (weightMode === "volumetric") {
        requestPayload.parcel_dimensions = {
          length_cm: Number(
            payload.parcel_dimensions?.length_cm,
          ),
          width_cm: Number(
            payload.parcel_dimensions?.width_cm,
          ),
          height_cm: Number(
            payload.parcel_dimensions?.height_cm,
          ),
        };
      }

      const response = await api.post(
        "/public/pricing/estimate",
        requestPayload,
      );

      return unwrapData(response);
    } catch (error) {
      const publicError = new Error(
        getApiErrorMessage(
          error,
          "The delivery price could not be calculated.",
        ),
      );

      publicError.status =
        error?.response?.status ?? null;

      publicError.errors =
        error?.response?.data?.errors ?? null;

      throw publicError;
    }
  },
};

const siteApi = {
  pricing: sitePricingApi,
};

export default siteApi;
