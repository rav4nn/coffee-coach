export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login
     * - /api/auth/* (NextAuth endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /robots.txt
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};
