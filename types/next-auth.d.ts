import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    canModifyDefaults?: boolean;
  }

  interface Session {
    user: {
      id: string;
      canModifyDefaults?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    canModifyDefaults?: boolean;
  }
}
