import { randomBytes, createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { MobileAuthError } from "@/lib/mobile-identity";
const PREFIX = "mobile-session:";
const hash = (code: string) => createHash("sha256").update(code).digest("hex");
export async function issueSessionExchange(userId: string, now = new Date()) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new MobileAuthError("Invalid user", 401);
  const code = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({ data: { identifier: `${PREFIX}${userId}`, token: hash(code), expires: new Date(now.getTime() + 60_000) } });
  return code;
}
export async function consumeSessionExchange(code: string, now = new Date()) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) throw new MobileAuthError("Invalid or expired exchange code", 401);
  return prisma.$transaction(async (tx) => {
    const token = hash(code);
    const exchange = await tx.verificationToken.findUnique({ where: { token } });
    if (!exchange?.identifier.startsWith(PREFIX) || exchange.expires <= now) throw new MobileAuthError("Invalid or expired exchange code", 401);
    const consumed = await tx.verificationToken.deleteMany({ where: { token, identifier: exchange.identifier, expires: { gt: now } } });
    if (consumed.count !== 1) throw new MobileAuthError("Invalid or expired exchange code", 401);
    const sessionToken = randomUUID();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await tx.session.create({ data: { sessionToken, userId: exchange.identifier.slice(PREFIX.length), expires } });
    return { sessionToken, expires };
  });
}
