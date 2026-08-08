import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import {
  getAuthSecret,
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/auth-env";

const secret = getAuthSecret();

export const authOptions: NextAuthOptions = {
  secret,
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
  providers: [
    GoogleProvider({
      clientId: getGoogleClientId(),
      clientSecret: getGoogleClientSecret(),
      // Web client with secret — state-only avoids PKCE cookie loss on Vercel.
      checks: ["state"],
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider;
      }
      if (profile && "picture" in profile && typeof profile.picture === "string") {
        token.picture = profile.picture;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        if (typeof token.picture === "string") session.user.image = token.picture;
      }
      return session;
    },
  },
};
