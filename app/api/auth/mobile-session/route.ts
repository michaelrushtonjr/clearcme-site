import { NextRequest, NextResponse } from "next/server";
import { consumeSessionExchange } from "@/lib/mobile-session-exchange";
import { MobileAuthError } from "@/lib/mobile-identity";
const PRIVATE_HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.has("token")) {
    console.warn("Deprecated mobile-session token URL rejected (410); update the iOS session exchange flow");
    return NextResponse.json({ error: "This session bridge has retired. Update the app to use the single-use code exchange." }, { status: 410, headers: PRIVATE_HEADERS });
  }
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing exchange code" }, { status: 400, headers: PRIVATE_HEADERS });
  try {
    const { sessionToken, expires } = await consumeSessionExchange(code);
    const secure = req.nextUrl.protocol === "https:";
    const response = NextResponse.redirect(new URL("/dashboard", req.url));
    for (const [key, value] of Object.entries(PRIVATE_HEADERS)) response.headers.set(key, value);
    response.cookies.set(secure ? "__Secure-authjs.session-token" : "authjs.session-token", sessionToken, { httpOnly: true, secure, sameSite: "lax", path: "/", expires });
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Invalid or expired exchange code" }, { status: error instanceof MobileAuthError ? error.status : 500, headers: PRIVATE_HEADERS });
  }
}
