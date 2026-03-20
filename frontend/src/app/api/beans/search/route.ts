import { NextRequest, NextResponse } from "next/server";

import { getAccessToken } from "@/lib/getAccessToken";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

function resolveToken(request: NextRequest, fallback: string | null): string | null {
  const header = request.headers.get("Authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : fallback;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const token = resolveToken(request, await getAccessToken());
  const res = await fetch(`${BACKEND_URL}/api/beans/search${qs ? `?${qs}` : ""}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
