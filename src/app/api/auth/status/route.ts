import { authEnvReady } from "@/lib/auth-env";

export const dynamic = "force-dynamic";

/** Non-secret auth config check (for debugging Vercel env). */
export async function GET() {
  return Response.json({
    ready: authEnvReady(),
    mode: "signed-cookie",
    nextAuthUrl: process.env.NEXTAUTH_URL?.trim() || null,
    vercelUrl: process.env.VERCEL_URL?.trim() || null,
  });
}
