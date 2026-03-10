import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/getAccessToken";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  const token = await getAccessToken();
  const { id } = await params;
  const res = await fetch(`${BACKEND_URL}/api/user/beans/${id}`, {
    method: "DELETE",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
