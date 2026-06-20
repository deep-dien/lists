import { MongoUserRepo } from "@/lib/adapters/mongoUserRepo";

const userRepo = new MongoUserRepo();

export const authConfig = {
  pages: {
    signIn: "/signin",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        // If trying to access signin page while logged in, redirect to dashboard
        if (nextUrl.pathname === "/signin") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await userRepo.findById(user.id);
        token.id = user.id;
        token.canModifyDefaults = dbUser?.canModifyDefaults;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.canModifyDefaults = token.canModifyDefaults;
        session.user.id = token.id;
      }
      return session;
    },
  },
  providers: [],
};
