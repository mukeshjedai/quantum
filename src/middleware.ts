import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, parseAuthToken } from "@/lib/server-auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/login") || pathname.startsWith("/sign-in")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token && (await parseAuthToken(token))) {
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
