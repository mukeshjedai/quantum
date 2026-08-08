import { NextRequest, NextResponse } from "next/server";
import {
  createAuthToken,
  exchangeGoogleCode,
  parseOAuthState,
  safeNextPath,
  setAuthCookie,
} from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url),
    );
  }
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }
  const { ok, next } = await parseOAuthState(state);
  if (!ok) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }
  try {
    const user = await exchangeGoogleCode(request, code);
    const token = await createAuthToken(user);
    const response = NextResponse.redirect(new URL(safeNextPath(next), request.url));
    setAuthCookie(response, token);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=OAuthCallback", request.url));
  }
}
