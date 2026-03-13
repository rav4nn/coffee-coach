import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function resolveToken(request: NextRequest, backendToken: string | null): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return backendToken;
}

export async function GET(request: NextRequest) {
  const token = resolveToken(request, await getAccessToken());
  const res = await fetch(`${BACKEND_URL}/api/admin/stats`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
