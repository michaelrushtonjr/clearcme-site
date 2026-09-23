import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { trackSignup } from "@/lib/analytics";

export class MobileAuthError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export function providerEmailVerified(provider: string, value: unknown): boolean {
  return value === true || (provider === "apple" && value === "true");
}
export async function resolveMobileIdentity(identity: { provider: "google" | "apple"; subject: string; email: string | null; verified: boolean; name?: string | null; image?: string | null }) {
  if (!identity.verified) throw new MobileAuthError("Email is not verified. Sign in with your original method.", 403);
  let created = false;
  const resolved = await prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({ where: { provider_providerAccountId: { provider: identity.provider, providerAccountId: identity.subject } }, include: { user: true } });
    if (account) return tx.user.update({ where: { id: account.userId }, data: { lastLoginAt: new Date() } });
    if (!identity.email) throw new MobileAuthError("Provider did not share an email. Sign in with your original method.", 403);
    let user = await tx.user.findUnique({ where: { email: identity.email } });
    if (user) {
      const other = await tx.account.findFirst({ where: { userId: user.id, provider: identity.provider } });
      if (other) throw new MobileAuthError("This email has another provider account. Sign in with your original method.", 403);
      user = await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), emailVerified: user.emailVerified ?? new Date() } });
    } else {
      user = await tx.user.create({ data: { email: identity.email, name: identity.name ?? null, image: identity.image ?? null, emailVerified: new Date() } });
      created = true;
    }
    await tx.account.create({ data: { userId: user.id, type: "oauth", provider: identity.provider, providerAccountId: identity.subject } });
    return user;
  }, { isolationLevel: "Serializable" });
  if (created) trackSignup(resolved, identity.provider, "ios_app");
  return resolved;
}
export async function signMobileJwt(userId: string, email: string | null) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new MobileAuthError("Server configuration error", 500);
  return new SignJWT({ sub: userId, email: email ?? "" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(new TextEncoder().encode(secret));
}
export const MOBILE_CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Cache-Control": "no-store" };
