import { publicApi } from "@/lib/public-api";

export async function getDeliveryEstimate(payload) {
  const body = await publicApi("/api/v1/public/pricing/estimate", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!body?.data) {
    throw new Error("Unable to calculate delivery price.");
  }

  return body.data;
}
