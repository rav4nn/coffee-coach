import { NextRequest, NextResponse } from "next/server";

import { getAccessToken } from "@/lib/getAccessToken";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

function resolveToken(request: NextRequest, fallback: string | null): string | null {
  const h = request.headers.get("Authorization");
  return h?.startsWith("Bearer ") ? h.slice(7) : fallback;
}

export async function GET(request: NextRequest) {
  const token = resolveToken(request, await getAccessToken());
  const res = await fetch(`${BACKEND_URL}/api/users/me`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const token = resolveToken(request, await getAccessToken());
  const res = await fetch(`${BACKEND_URL}/api/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
