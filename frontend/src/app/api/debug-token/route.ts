import { NextResponse } from "next/server";

import { getAccessToken } from "@/lib/getAccessToken";

export async function GET() {
  const token = await getAccessToken();
  return NextResponse.json({ token, secret_preview: process.env.AUTH_SECRET?.slice(0, 8) + "..." });
}
