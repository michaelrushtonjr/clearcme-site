import { NextResponse } from "next/server";
import { MOBILE_CORS, MobileAuthError } from "@/lib/mobile-identity";
import { normalizeEmail, startEmailSignIn } from "@/lib/mobile-email-code";

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: MOBILE_CORS }); }

// POST /api/auth/mobile-email/start  { email }
// Emails a 6-digit, 10-minute, single-use sign-in code for the iOS app.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400, headers: MOBILE_CORS });
  try {
    await startEmailSignIn(email);
    return NextResponse.json({ ok: true, expiresIn: 600 }, { headers: MOBILE_CORS });
  } catch (error) {
    if (error instanceof MobileAuthError) return NextResponse.json({ error: error.message }, { status: error.status, headers: MOBILE_CORS });
    console.error("[mobile-email] start failed");
    return NextResponse.json({ error: "Email sign-in failed. Try again." }, { status: 500, headers: MOBILE_CORS });
  }
}
