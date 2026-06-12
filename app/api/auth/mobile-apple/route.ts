import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_AUDIENCE = process.env.APPLE_IOS_BUNDLE_ID ?? "ai.clearcme.app";

type AppleFullName = {
  givenName?: string | null;
  familyName?: string | null;
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function displayName(fullName?: AppleFullName | null) {
  const name = [fullName?.givenName, fullName?.familyName].filter(Boolean).join(" ").trim();
  return name || null;
}

async function signMobileJwt(userId: string, email: string | null) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not configured");

  return new SignJWT({ sub: userId, email: email ?? "" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secret));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identityToken, fullName } = body as {
      identityToken?: string;
      fullName?: AppleFullName | null;
    };

    if (!identityToken) {
      return NextResponse.json({ error: "identityToken is required" }, { status: 400, headers: CORS_HEADERS });
    }

    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: APPLE_ISSUER,
      audience: APPLE_AUDIENCE,
    });

    const appleId = payload.sub;
    const email = typeof payload.email === "string" ? payload.email : null;
    const name = displayName(fullName);

    if (!appleId) {
      return NextResponse.json({ error: "Apple token missing subject" }, { status: 401, headers: CORS_HEADERS });
    }

    const existingAccount = await prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: "apple", providerAccountId: appleId } },
      include: { user: true },
    });

    let user = existingAccount?.user ?? null;

    if (!user && email) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      if (!email) {
        return NextResponse.json(
          { error: "Apple did not share an email for this account. Try Gmail or email sign-in first." },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      user = await prisma.user.create({
        data: {
          email,
          name,
          emailVerified: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(name && !user.name ? { name } : {}),
          ...(email && !user.email ? { email } : {}),
          ...(email && !user.emailVerified ? { emailVerified: new Date() } : {}),
        },
      });
    }

    if (!existingAccount) {
      await prisma.account.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "apple",
          providerAccountId: appleId,
        },
      });
    }

    const jwt = await signMobileJwt(user.id, user.email);

    return NextResponse.json(
      {
        jwt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Mobile Apple auth error:", error);
    return NextResponse.json({ error: "Apple authentication failed" }, { status: 500, headers: CORS_HEADERS });
  }
}
