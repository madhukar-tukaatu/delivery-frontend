const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export async function publicApi(path, options = {}) {
  if (!API_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not configured. Add your backend API URL to .env.local."
    );
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body?.message
        ? body.message
        : "The request could not be completed.";
    throw new Error(message);
  }

  return body;
}

export function normalizeTracking(payload) {
  const data = payload?.data || payload;

  return {
    trackingNumber:
      data?.trackingNumber ||
      data?.tracking_number ||
      data?.tracking ||
      "",
    status: data?.status || data?.currentStatus || data?.current_status || "UNKNOWN",
    origin: data?.origin?.name || data?.origin || "—",
    destination: data?.destination?.name || data?.destination || "—",
    estimatedDelivery:
      data?.estimatedDelivery || data?.estimated_delivery || "—",
    currentLocation:
      data?.currentLocation?.name ||
      data?.current_location ||
      data?.location ||
      "—",
    timeline:
      data?.timeline ||
      data?.events ||
      data?.trackingEvents ||
      data?.tracking_events ||
      [],
  };
}
