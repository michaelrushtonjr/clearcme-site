import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

// Helper: extract and verify mobile JWT from Authorization header
async function getMobileUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

// POST /api/devices/push-token
// Accepts: { token: string, platform: 'ios' | 'android' }
// Stores push notification token for the authenticated user.

export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { token, platform } = body as { token?: string; platform?: string };

    if (!token || !platform) {
      return NextResponse.json({ error: "token and platform are required" }, { status: 400 });
    }

    if (!["ios", "android"].includes(platform)) {
      return NextResponse.json({ error: "platform must be 'ios' or 'android'" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: token, pushPlatform: platform },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push token registration error:", error);
    return NextResponse.json({ error: "Failed to register push token" }, { status: 500 });
  }
}
