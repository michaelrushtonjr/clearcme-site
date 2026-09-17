import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAppShellRequest } from "@/lib/app-shell-server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes handle their own auth — skip proxy entirely
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Inside the iOS app there is no pricing or purchase UI (App Store 3.1.1).
  if (pathname === "/pricing") {
    return isAppShellRequest(request)
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  // Protect dashboard pages only
  if (pathname.startsWith("/dashboard")) {
    const session = await auth();
    if (!session?.user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pricing",
  ],
};
