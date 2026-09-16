import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { MOBILE_CORS, MobileAuthError, providerEmailVerified, resolveMobileIdentity, signMobileJwt } from "@/lib/mobile-identity";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: MOBILE_CORS }); }
export async function POST(req: NextRequest) {
  try {
    const { identityToken, fullName } = await req.json();
    if (typeof identityToken !== "string" || !identityToken) return NextResponse.json({ error: "identityToken is required" }, { status: 400, headers: MOBILE_CORS });
    const audience = process.env.APPLE_BUNDLE_ID;
    if (!audience || !process.env.NEXTAUTH_SECRET) throw new MobileAuthError("Server configuration error", 500);
    let payload;
    try { ({ payload } = await jwtVerify(identityToken, APPLE_JWKS, { issuer: "https://appleid.apple.com", audience, algorithms: ["RS256"], requiredClaims: ["exp", "sub"] })); }
    catch { throw new MobileAuthError("Invalid Apple identity token", 401); }
    if (!payload.sub || payload.aud !== audience) throw new MobileAuthError("Invalid Apple identity token", 401);
    const name = [fullName?.givenName, fullName?.familyName].filter((value) => typeof value === "string").join(" ").trim() || null;
    const user = await resolveMobileIdentity({ provider: "apple", subject: payload.sub, email: typeof payload.email === "string" ? payload.email : null, verified: providerEmailVerified("apple", payload.email_verified), name });
    const jwt = await signMobileJwt(user.id, user.email);
    return NextResponse.json({ jwt, user: { id: user.id, email: user.email, name: user.name, image: user.image } }, { headers: MOBILE_CORS });
  } catch (error) {
    const status = error instanceof MobileAuthError ? error.status : error instanceof SyntaxError ? 400 : 500;
    if (status === 500) console.error("Mobile Apple authentication failed; no token logged");
    return NextResponse.json({ error: error instanceof MobileAuthError ? error.message : "Apple authentication failed" }, { status, headers: MOBILE_CORS });
  }
}
