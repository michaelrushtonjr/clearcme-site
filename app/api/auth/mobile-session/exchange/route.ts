import { NextRequest, NextResponse } from "next/server";
import { getMobileUserId } from "@/lib/mobile-auth";
import { issueSessionExchange } from "@/lib/mobile-session-exchange";
import { MOBILE_CORS, MobileAuthError } from "@/lib/mobile-identity";
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: MOBILE_CORS }); }
export async function POST(req: NextRequest) {
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: MOBILE_CORS });
  try {
    const code = await issueSessionExchange(userId);
    return NextResponse.json({ code, expiresIn: 60 }, { headers: MOBILE_CORS });
  } catch (error) {
    return NextResponse.json({ error: "Session exchange failed" }, { status: error instanceof MobileAuthError ? error.status : 500, headers: MOBILE_CORS });
  }
}
