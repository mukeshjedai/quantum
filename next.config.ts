import type { NextConfig } from "next";

const apiBase = process.env.APPLIMIT_API_URL || "http://localhost:7071";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
      { source: "/static/:path*", destination: `${apiBase}/static/:path*` },
    ];
  },
};

export default nextConfig;
