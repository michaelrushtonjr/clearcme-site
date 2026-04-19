import { NextRequest, NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  const userId = await getMobileUserId(req);
  const authHeader = req.headers.get("authorization");
  return NextResponse.json({
    userId,
    hasAuthHeader: !!authHeader,
    headerPrefix: authHeader?.slice(0, 20),
    secretPresent: !!process.env.NEXTAUTH_SECRET,
    secretLength: process.env.NEXTAUTH_SECRET?.length ?? 0,
  });
}
