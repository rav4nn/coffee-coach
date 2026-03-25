import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  // Forward client IP for rate limiting
  const forwarded = request.headers.get("x-forwarded-for") ?? "unknown";

  const body = await request.json();
  const res = await fetch(`${BACKEND_URL}/api/coaching/guest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": forwarded,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
