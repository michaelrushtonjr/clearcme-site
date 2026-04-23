import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed to bundle Prisma correctly on Vercel Edge
  serverExternalPackages: ["@prisma/client"],
  async headers() {
    return [
      {
        source: "/api/auth/mobile-google",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
      {
        source: "/api/auth/mobile-session",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
