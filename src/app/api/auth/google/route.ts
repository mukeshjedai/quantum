import { NextRequest, NextResponse } from "next/server";
import { authEnvReady, buildGoogleAuthUrl, createOAuthState, safeNextPath } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!authEnvReady()) {
    return NextResponse.json({ detail: "Google sign-in is not configured." }, { status: 503 });
  }
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const state = await createOAuthState(next);
  return NextResponse.redirect(buildGoogleAuthUrl(request, state));
}
