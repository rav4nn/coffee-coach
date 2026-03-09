import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  const res = await fetch(`${BACKEND_URL}/api/users/me`, {
    headers: {
      ...(auth ? { Authorization: auth } : {}),
    },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  const body = await request.json();
  const res = await fetch(`${BACKEND_URL}/api/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
