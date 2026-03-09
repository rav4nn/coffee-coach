"use server";

import { auth } from "@/auth";
import { encode } from "next-auth/jwt";

/**
 * Returns a signed JWT for use in Authorization: Bearer headers sent to the FastAPI backend.
 * The JWT is signed with NEXTAUTH_SECRET, which must equal AUTH_SECRET on the backend.
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const token = await encode({
    token: {
      sub: session.user.id,
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      picture: session.user.image ?? undefined,
    },
    secret: process.env.AUTH_SECRET!,
    salt: "",
  });

  return token;
}
