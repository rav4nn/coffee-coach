"use server";

import { SignJWT } from "jose";

import { auth } from "@/auth";

/**
 * Returns a plain HS256 JWT signed with the raw AUTH_SECRET,
 * compatible with python-jose on the FastAPI backend.
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

  const token = await new SignJWT({
    sub: session.user.id,
    email: session.user.email ?? undefined,
    name: session.user.name ?? undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  return token;
}
