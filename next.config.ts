import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed to bundle Prisma correctly on Vercel Edge
  serverExternalPackages: ["@prisma/client"],
  // One canonical origin. Both clearcme.ai and www.clearcme.ai serve the app
  // on Vercel; host-scoped auth cookies set on one host are invisible on the
  // other, which broke OAuth (Apple especially — its form_post callback).
  // 308 preserves method+body, so even a POST callback survives the hop.
  async redirects() {
    return [
      {
        // Exclude /api: cross-origin redirects strip Authorization headers
        // (fetch spec), which broke Bearer-token calls from iOS app builds
        // that still target www. Bearer auth is host-agnostic, so serving
        // API calls on www directly is safe; pages still canonicalize.
        source: "/:path((?!api/).*)",
        has: [{ type: "host" as const, value: "www.clearcme.ai" }],
        destination: "https://clearcme.ai/:path*",
        permanent: true,
      },
    ];
  },
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
