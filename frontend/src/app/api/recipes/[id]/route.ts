import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const res = await fetch(`${BACKEND_URL}/api/recipes/${id}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
