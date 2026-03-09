import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      profile_complete: boolean;
      avatar?: string | null;
    } & DefaultSession["user"];
  }
}
