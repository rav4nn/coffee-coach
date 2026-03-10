import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, profile, trigger, session }) {
      // On first sign-in, embed Google sub and profile into the JWT
      if (profile) {
        token.sub = profile.sub ?? token.sub;
        token.picture = (profile as { picture?: string }).picture ?? token.picture;
      }

      // If the client passes profile_complete directly (e.g. after onboarding), trust it immediately
      // without a backend round-trip — avoids cold-start races
      if (trigger === "update" && (session as Record<string, unknown>)?.profile_complete === true) {
        token.profile_complete = true;
        return token;
      }

      // Sync profile_complete from backend on sign-in or explicit session update
      if ((trigger === "signIn" || trigger === "update") && token.sub) {
        try {
          const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
          const res = await fetch(`${backendUrl}/api/users/me`, {
            headers: { "X-User-Id": token.sub as string },
          });
          if (res.ok) {
            const user = await res.json();
            token.profile_complete = user.profile_complete ?? false;
            token.avatar = user.avatar ?? null;
          }
        } catch {
          // If backend is unreachable, preserve existing token value rather than defaulting to false
          // (which would force all users into onboarding on every sign-in)
        }
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.profile_complete = (token.profile_complete as boolean) ?? false;
      session.user.avatar = (token.avatar as string | null) ?? null;
      (session as unknown as Record<string, unknown>).accessToken = token;
      return session;
    },
  },
});
