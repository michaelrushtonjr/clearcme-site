import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

// POST /api/auth/mobile-google
// Accepts a Google ID token from native mobile sign-in, validates it,
// finds or creates the user, and returns a signed JWT for mobile API access.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body as { idToken?: string };

    if (!idToken) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }

    // Validate ID token with Google
    const tokenInfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );

    if (!tokenInfoRes.ok) {
      return NextResponse.json({ error: "Invalid Google ID token" }, { status: 401 });
    }

    const tokenInfo = await tokenInfoRes.json() as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      aud?: string;
      error_description?: string;
    };

    if (tokenInfo.error_description) {
      return NextResponse.json({ error: "Invalid Google ID token: " + tokenInfo.error_description }, { status: 401 });
    }

    const { sub: googleId, email, name, picture: image } = tokenInfo;

    if (!email || !googleId) {
      return NextResponse.json({ error: "Google token missing email or sub" }, { status: 401 });
    }

    // Find or create user (mirroring NextAuth Google flow)
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name ?? null,
          image: image ?? null,
          emailVerified: new Date(),
        },
      });

      // Create a linked Google Account record
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "google",
          providerAccountId: googleId,
        },
      });
    } else {
      // Update last login and ensure account link exists
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const existingAccount = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: "google", providerAccountId: googleId } },
      });

      if (!existingAccount) {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: "oauth",
            provider: "google",
            providerAccountId: googleId,
          },
        });
      }
    }

    // Sign JWT with NEXTAUTH_SECRET, 30-day expiry
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error("NEXTAUTH_SECRET not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const secretBytes = new TextEncoder().encode(secret);
    const jwt = await new SignJWT({ sub: user.id, email: user.email ?? "" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secretBytes);

    return NextResponse.json({
      jwt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });
  } catch (error) {
    console.error("Mobile Google auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
