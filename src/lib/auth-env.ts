/** Shared auth env (NextAuth on Vercel, same secret as Azure AUTH_SECRET). */

export function getAuthSecret(): string {
  return (
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    ""
  );
}

export function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
}

export function authEnvReady(): boolean {
  return Boolean(getAuthSecret() && getGoogleClientId() && getGoogleClientSecret());
}
