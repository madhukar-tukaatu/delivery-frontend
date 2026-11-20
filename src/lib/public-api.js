const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export async function publicApi(path, options = {}) {
  if (!API_URL) {
    throw new Error(
      "Online delivery services are temporarily unavailable. Please contact hello@tukaatuexpress.com for help."
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
    currentStatus: data?.current_status || data?.status || "UNKNOWN",
    isOutForDelivery: Boolean(data?.is_out_for_delivery || ["out_for_delivery", "arrived"].includes(String(data?.current_status || data?.status).toLowerCase())),
    isDelivered: Boolean(data?.is_delivered || String(data?.current_status || data?.status).toLowerCase() === "delivered"),
    origin: data?.origin?.name || data?.origin || "-",
    destination: data?.destination?.name || data?.destination || "-",
    estimatedDelivery:
      data?.estimatedDelivery || data?.estimated_delivery || "-",
    currentLocation:
      data?.current_location?.name ||
      data?.currentLocation?.name ||
      data?.current_location ||
      data?.location ||
      "-",
    rider: data?.rider || null,
    merchantOrderId: data?.merchant_order_id || data?.merchantOrderId || null,
    paymentType: data?.payment_type || data?.paymentType || null,
    collectAmount: data?.collect_amount != null ? Number(data.collect_amount) : (data?.pod_amount != null ? Number(data.pod_amount) : 0),
    weight: data?.weight != null ? Number(data.weight) : null,
    liveLocation: data?.live_location || null,
    recipient: data?.recipient || null,
    originData: data?.origin || null,
    destinationData: data?.destination || null,
    websocketChannel: data?.websocket_channel || (data?.tracking_number ? `tracking.${data.tracking_number}` : null),
    timeline:
      data?.timeline ||
      data?.events ||
      data?.trackingEvents ||
      data?.tracking_events ||
      [],
  };
}
