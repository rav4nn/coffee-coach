import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const profileComplete = req.auth?.user?.profile_complete ?? false;
  const path = req.nextUrl.pathname;

  // Authenticated users who haven't completed onboarding → send to /onboarding
  if (req.auth && !profileComplete && !path.startsWith("/onboarding")) {
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
