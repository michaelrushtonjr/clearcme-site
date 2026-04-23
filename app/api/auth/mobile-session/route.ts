import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";
import { randomUUID } from "crypto";

// GET /api/auth/mobile-session?token=JWT
// Validates mobile JWT, creates a NextAuth-compatible database session,
// sets the session cookie, and redirects to /dashboard.
// Used by the Capacitor iOS app after native Google Sign-In.

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Build a fake request with the token as a Bearer header so getMobileUserId can verify it
    const headers = new Headers();
    headers.set("authorization", `Bearer ${token}`);
    const fakeReq = new NextRequest(req.url, { headers });

    const userId = await getMobileUserId(fakeReq);
    if (!userId) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create a NextAuth-compatible session in the database
    const sessionToken = randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires,
      },
    });

    // Determine the cookie name NextAuth uses
    // In production (HTTPS): __Secure-authjs.session-token
    // In development (HTTP): authjs.session-token
    const isSecure = req.nextUrl.protocol === "https:";
    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    // Redirect to dashboard with the session cookie set
    const dashboardUrl = new URL("/dashboard", req.url);
    const response = NextResponse.redirect(dashboardUrl);

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      expires,
    });

    return response;
  } catch (error) {
    console.error("Mobile session error:", error);
    return NextResponse.json({ error: "Session creation failed" }, { status: 500 });
  }
}
