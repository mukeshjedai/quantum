import { authEnvReady, getGoogleClientId } from "@/lib/auth-env";
import { googleRedirectUri, postLoginRedirectUrl } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/** Non-secret auth config check (for debugging Vercel env). */
export async function GET() {
  return Response.json({
    ready: authEnvReady(),
    mode: "signed-cookie",
    googleClientId: getGoogleClientId() || null,
    redirectUris: {
      googleOAuthCallback: googleRedirectUri(),
      postLoginDefault: postLoginRedirectUrl("/exams"),
      postLoginWiki: postLoginRedirectUrl("/wiki"),
      logout: `${process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") || "http://localhost:3000"}/api/auth/logout?next=/login`,
    },
    flow: [
      "1. /login?callbackUrl=/…  (blocked page sends you here)",
      "2. /api/auth/google?next=/…  (start Google sign-in)",
      "3. https://accounts.google.com/o/oauth2/v2/auth?…  (Google login)",
      "4. /api/auth/callback/google  (OAuth callback; sets applimit_auth cookie)",
      "5. /exams  (or your ?next= path after successful login)",
    ],
    nextAuthUrl: process.env.NEXTAUTH_URL?.trim() || null,
    vercelUrl: process.env.VERCEL_URL?.trim() || null,
  });
}
