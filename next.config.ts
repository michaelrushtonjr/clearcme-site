import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed to bundle Prisma correctly on Vercel Edge
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
