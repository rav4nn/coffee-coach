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
    jwt({ token, profile }) {
      // On first sign-in, embed Google sub and profile into the JWT
      if (profile) {
        token.sub = profile.sub ?? token.sub;
        token.picture = (profile as { picture?: string }).picture ?? token.picture;
      }
      return token;
    },
    session({ session, token }) {
      // Expose sub and the encoded token to the client session
      session.user.id = token.sub as string;
      (session as unknown as Record<string, unknown>).accessToken = token;
      return session;
    },
  },
});
