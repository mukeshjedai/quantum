import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, parseAuthToken, safeNextPath } from "@/lib/server-auth";

/** Read secret directly so Vercel Edge middleware gets the same value as API routes. */
function middlewareSecretKey(): Uint8Array {
  const secret =
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "applimit-dev-auth-secret-change-me";
  return new TextEncoder().encode(secret);
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  const user = await parseAuthToken(token, middlewareSecretKey());
  return user !== null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/login") || pathname.startsWith("/sign-in")) {
    if (await isAuthenticated(req)) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "/exams";
      return NextResponse.redirect(new URL(safeNextPath(callbackUrl), req.url));
    }
    return NextResponse.next();
  }

  if (await isAuthenticated(req)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!login|sign-in|api/auth|api|_next/static|_next/image|favicon.ico).*)",
  ],
};
