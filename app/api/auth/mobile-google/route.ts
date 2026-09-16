import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { MOBILE_CORS, MobileAuthError, providerEmailVerified, resolveMobileIdentity, signMobileJwt } from "@/lib/mobile-identity";
const google = new OAuth2Client();
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: MOBILE_CORS }); }
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (typeof idToken !== "string" || !idToken) return NextResponse.json({ error: "idToken is required" }, { status: 400, headers: MOBILE_CORS });
    const audience = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID].filter((id): id is string => !!id?.trim());
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.NEXTAUTH_SECRET) throw new MobileAuthError("Server configuration error", 500);
    let payload;
    try {
      const ticket = await google.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch { throw new MobileAuthError("Invalid Google ID token", 401); }
    if (!payload?.sub || !payload.email || !audience.includes(payload.aud)) throw new MobileAuthError("Invalid Google ID token", 401);
    const user = await resolveMobileIdentity({ provider: "google", subject: payload.sub, email: payload.email, verified: providerEmailVerified("google", payload.email_verified), name: payload.name, image: payload.picture });
    const jwt = await signMobileJwt(user.id, user.email);
    return NextResponse.json({ jwt, user: { id: user.id, email: user.email, name: user.name, image: user.image } }, { headers: MOBILE_CORS });
  } catch (error) {
    const status = error instanceof MobileAuthError ? error.status : error instanceof SyntaxError ? 400 : 500;
    if (status === 500) console.error("Mobile Google authentication failed; no token logged");
    return NextResponse.json({ error: error instanceof MobileAuthError ? error.message : "Authentication failed" }, { status, headers: MOBILE_CORS });
  }
}
