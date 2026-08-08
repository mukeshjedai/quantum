import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import {
  authEnvReady,
  getAuthSecret,
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/auth-env";

const secret = getAuthSecret();

export const authOptions: NextAuthOptions = {
  secret,
  providers: [
    GoogleProvider({
      clientId: getGoogleClientId(),
      clientSecret: getGoogleClientSecret(),
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
    signIn() {
      return authEnvReady();
    },
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
