import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Extracts and verifies a mobile JWT from the Authorization: Bearer header.
 * Returns the userId (sub claim) if valid, or null if absent/invalid.
 *
 * Used by API routes that need to support both NextAuth sessions (web)
 * and JWT-based auth (mobile app).
 */
export async function getMobileUserId(req: NextRequest): Promise<string | null> {
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
