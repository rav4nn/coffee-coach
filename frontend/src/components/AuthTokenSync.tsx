"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { setAccessToken } from "@/lib/api";

/**
 * Fetches the backend JWT once the session is active and injects it into the
 * api.ts module so all subsequent API calls include Authorization: Bearer <token>.
 */
export function AuthTokenSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      // Scope Zustand persist keys to this user before any store hydrates
      window.__CC_USER_ID__ = session.user.id;

      fetch("/api/auth/token")
        .then((r) => r.json())
        .then(({ token }: { token: string | null }) => {
          setAccessToken(token);
        })
        .catch(() => {
          // Non-fatal — API calls will return 401 and the middleware will redirect
        });
    } else if (status === "unauthenticated") {
      setAccessToken(null);
    }
  }, [session, status]);

  return null;
}
