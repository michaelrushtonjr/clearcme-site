import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 15) || "EMPTY",
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL || "EMPTY",
    authTrustHost: process.env.AUTH_TRUST_HOST || "EMPTY",
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
  });
}
