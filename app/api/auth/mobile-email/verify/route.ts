import { NextResponse } from "next/server";
import { MOBILE_CORS, MobileAuthError, signMobileJwt } from "@/lib/mobile-identity";
import { normalizeEmail, verifyEmailSignIn } from "@/lib/mobile-email-code";

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: MOBILE_CORS }); }

// POST /api/auth/mobile-email/verify  { email, code }
// Exchanges a valid code for the same 30-day mobile JWT the Apple and Google routes issue.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: unknown; code?: unknown };
  const email = normalizeEmail(body.email);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!email || !code || code.length > 64) return NextResponse.json({ error: "Email and code are required." }, { status: 400, headers: MOBILE_CORS });
  try {
    const user = await verifyEmailSignIn(email, code);
    const jwt = await signMobileJwt(user.id, user.email);
    return NextResponse.json({ jwt, user: { id: user.id, email: user.email, name: user.name, image: user.image } }, { headers: MOBILE_CORS });
  } catch (error) {
    if (error instanceof MobileAuthError) return NextResponse.json({ error: error.message }, { status: error.status, headers: MOBILE_CORS });
    console.error("[mobile-email] verify failed");
    return NextResponse.json({ error: "Email sign-in failed. Try again." }, { status: 500, headers: MOBILE_CORS });
  }
}
