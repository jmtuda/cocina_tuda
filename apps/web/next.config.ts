import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.VERCEL === "1") return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:3001/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
