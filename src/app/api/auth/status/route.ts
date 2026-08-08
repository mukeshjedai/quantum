import { authEnvReady, getGoogleClientId } from "@/lib/auth-env";
import { googleRedirectUri } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

/** Non-secret auth config check (for debugging Vercel env). */
export async function GET() {
  return Response.json({
    ready: authEnvReady(),
    mode: "signed-cookie",
    googleClientId: getGoogleClientId() || null,
    redirectUri: googleRedirectUri(),
    nextAuthUrl: process.env.NEXTAUTH_URL?.trim() || null,
    vercelUrl: process.env.VERCEL_URL?.trim() || null,
  });
}
