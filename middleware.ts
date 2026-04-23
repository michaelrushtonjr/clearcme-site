import { NextRequest, NextResponse } from "next/server";

// Add CORS headers to all /api/auth/mobile-* endpoints so Capacitor
// webviews (capacitor://localhost or null origin) can reach them.
export function middleware(req: NextRequest) {
  const { pathname, method } = req.nextUrl;

  if (pathname.startsWith("/api/auth/mobile-")) {
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/auth/mobile-:path*",
};
