import type { NextConfig } from "next";

const apiBase = process.env.APPLIMIT_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://applimit-func-97195.azurewebsites.net"
    : "http://localhost:7071");

/** Proxy backend API paths only — never /api/auth (NextAuth runs on Vercel). */
const backendApiRewrites = [
  { source: "/api/jobs", destination: `${apiBase}/api/jobs` },
  { source: "/api/jobs/:path*", destination: `${apiBase}/api/jobs/:path*` },
  { source: "/api/wiki/:path*", destination: `${apiBase}/api/wiki/:path*` },
  { source: "/api/exams", destination: `${apiBase}/api/exams` },
  { source: "/api/exams/:path*", destination: `${apiBase}/api/exams/:path*` },
  { source: "/api/flashcards", destination: `${apiBase}/api/flashcards` },
  { source: "/api/flashcards/:path*", destination: `${apiBase}/api/flashcards/:path*` },
  { source: "/api/insights", destination: `${apiBase}/api/insights` },
  { source: "/api/tts/:path*", destination: `${apiBase}/api/tts/:path*` },
];

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      ...backendApiRewrites,
      { source: "/static/:path*", destination: `${apiBase}/static/:path*` },
    ];
  },
};

export default nextConfig;
