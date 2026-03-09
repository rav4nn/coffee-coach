import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const profileComplete = req.auth?.user?.profile_complete;
  const path = req.nextUrl.pathname;

  // Unauthenticated users → send to /login
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Authenticated users who haven't completed onboarding → send to /onboarding
  if (profileComplete === false && !path.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
});

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login
     * - /onboarding (handled inside the callback above)
     * - /api/auth/* (NextAuth endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /robots.txt
     */
    "/((?!login|onboarding|api/auth|_next/static|_next/image|favicon.ico|robots.txt|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.webp|.*\\.ico).*)",
  ],
};
