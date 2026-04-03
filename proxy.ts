import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Protect dashboard and API routes (except auth endpoints)
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/certificates") ||
    pathname.startsWith("/api/compliance");

  if (isProtected && !session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/certificates/:path*",
    "/api/compliance/:path*",
  ],
};
