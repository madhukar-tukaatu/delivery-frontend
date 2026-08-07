import { NextResponse } from "next/server";

const DEFAULT_API_BASE = "https://api.tukaatuexpress.com/api/v1";

function getApiBase() {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_API_BASE
  ).replace(/\/$/, "");
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const upstream = await fetch(`${getApiBase()}/public/pricing/estimate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await upstream.json()
      : { message: await upstream.text() };

    return NextResponse.json(body, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error?.message || "The pricing service is temporarily unavailable.",
      },
      { status: 502 },
    );
  }
}
