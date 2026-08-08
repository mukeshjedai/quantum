import { authEnvReady, getAuthSecret, getGoogleClientId, getGoogleClientSecret } from "@/lib/auth-env";

export const dynamic = "force-dynamic";

/** Non-secret auth config check (for debugging Vercel env). */
export async function GET() {
  return Response.json({
    ready: authEnvReady(),
    hasSecret: Boolean(getAuthSecret()),
    hasClientId: Boolean(getGoogleClientId()),
    hasClientSecret: Boolean(getGoogleClientSecret()),
    nextAuthUrl: process.env.NEXTAUTH_URL?.trim() || null,
    vercelUrl: process.env.VERCEL_URL?.trim() || null,
  });
}
