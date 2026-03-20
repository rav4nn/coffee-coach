import { NextRequest, NextResponse } from "next/server";

import { getAccessToken } from "@/lib/getAccessToken";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

function resolveToken(request: NextRequest, fallback: string | null): string | null {
  const header = request.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : fallback;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = resolveToken(request, await getAccessToken());
  const res = await fetch(`${BACKEND_URL}/api/beans/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
