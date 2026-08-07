export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protect app pages but allow:
     * - /login
     * - /api/* (proxied to Azure Functions; Singularity extension uses these)
     * - Next.js static assets
     */
    "/((?!login|api|_next/static|_next/image|favicon.ico).*)",
  ],
};
