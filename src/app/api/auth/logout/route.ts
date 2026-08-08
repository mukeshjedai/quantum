import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, safeNextPath } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next") || "/login");
  const response = NextResponse.redirect(new URL(next, request.url));
  clearAuthCookie(response);
  return response;
}
