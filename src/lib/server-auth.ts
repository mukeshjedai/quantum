import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import type { AuthUser } from "@/lib/auth-types";
import {
  authEnvReady,
  getAuthSecret,
  getGoogleClientId,
  getGoogleClientSecret,
} from "@/lib/auth-env";

export type { AuthUser } from "@/lib/auth-types";

export const AUTH_COOKIE = "applimit_auth";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function secretKey(): Uint8Array {
  const secret = getAuthSecret() || "applimit-dev-auth-secret-change-me";
  return new TextEncoder().encode(secret);
}

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function authBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export function googleRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (base) {
    return `${base}/api/auth/callback/google`;
  }
  return "http://localhost:3000/api/auth/callback/google";
}

export function authCookieSecure(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.NEXTAUTH_URL?.startsWith("https://") === true
  );
}

export async function createOAuthState(nextPath: string): Promise<string> {
  return new SignJWT({
    next: safeNextPath(nextPath),
    n: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secretKey());
}

export async function parseOAuthState(
  state: string,
): Promise<{ ok: boolean; next: string }> {
  try {
    const { payload } = await jwtVerify(state, secretKey());
    return { ok: true, next: safeNextPath(String(payload.next || "/")) };
  } catch {
    return { ok: false, next: "/" };
  }
}

export async function createAuthToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    sub: user.sub,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function parseAuthToken(
  token: string,
  secret?: Uint8Array,
): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret ?? secretKey());
    const email = payload.email;
    if (typeof email !== "string" || !email) return null;
    return {
      sub: String(payload.sub || email),
      email,
      name: String(payload.name || email),
      picture: "",
    };
  } catch {
    return null;
  }
}

/** Absolute post-login URL (must match NEXTAUTH_URL domain for cookies). */
export function postLoginRedirectUrl(next: string): string {
  const base = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
  return `${base}${safeNextPath(next)}`;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return parseAuthToken(token);
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: authCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: authCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function buildGoogleAuthUrl(request: NextRequest, state: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(
  request: NextRequest,
  code: string,
): Promise<AuthUser> {
  const body = new URLSearchParams({
    code,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${detail}`);
  }
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error("Google did not return an access token.");
  }
  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    throw new Error("Google userinfo failed.");
  }
  const profile = (await profileRes.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  if (!profile.email) {
    throw new Error("Google account has no email address.");
  }
  return {
    sub: profile.sub || profile.email,
    email: profile.email,
    name: profile.name || profile.email,
    picture: profile.picture || "",
  };
}

export { authEnvReady };
