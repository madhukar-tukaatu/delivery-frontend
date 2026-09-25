import api from "@/lib/api";

function normalizeAxiosError(error) {
  const response = error?.response;

  if (!response) {
    return {
      message: "Network error. Please check backend server.",
      errors: {},
    };
  }

  return {
    message: response.data?.message || "Request failed",
    errors: response.data?.errors || {},
    status: response.status,
  };
}

export async function getMerchantOnboarding() {
  try {
    const response = await api.get("/merchant/onboarding");
    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
}

export async function saveBusinessProfile(payload) {
  try {
    const response = await api.post(
      "/merchant/onboarding/business-profile",
      payload
    );

    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
}

export async function savePickupLocation(payload) {
  try {
    const response = await api.post(
      "/merchant/onboarding/pickup-location",
      payload
    );

    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
}

export async function saveBankDetails(payload) {
  try {
    const response = await api.post(
      "/merchant/onboarding/bank-details",
      payload
    );

    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
}

export async function uploadMerchantDocument(type, file) {
  try {
    const formData = new FormData();

    formData.append("document_type", type);
    formData.append("file", file);

    const response = await api.post(
      "/merchant/onboarding/documents",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
}

export async function submitMerchantForReview() {
  try {
    const response = await api.post("/merchant/onboarding/submit");
    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeAxiosError(error);
  }
}