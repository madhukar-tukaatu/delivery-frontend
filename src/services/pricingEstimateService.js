export async function getDeliveryEstimate(payload) {
  try {
    const baseUrl = 
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "https://api.tukaatuexpress.com/api/v1";

    const response = await fetch(`${baseUrl}/public/pricing/estimate`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data?.message || "Unable to calculate delivery price.");
      error.response = { status: response.status, data };
      throw error;
    }

    if (!data?.data) {
      throw new Error("Unable to calculate delivery price.");
    }

    return data.data;
  } catch (error) {
    console.error("Pricing estimate error:", error);
    throw error;
  }
}
