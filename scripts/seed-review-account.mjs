// Creates (or refreshes) the App Review demo account's user row. The account
// holds fictional data only and signs in through the env-gated fixed code in
// lib/mobile-email-code.ts. Licenses and certificates are then added through
// the real APIs (see docs/mobile-auth.md) so they take the same path a
// physician's data does.
//
//   DATABASE_URL=... node scripts/seed-review-account.mjs appreview@clearcme.ai --apply
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const [email, flag] = process.argv.slice(2);
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Usage: seed-review-account.mjs <email> [--apply]");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const apply = flag === "--apply";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
try {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, _count: { select: { licenses: true, certificates: true } } } });
  console.log(existing ? `Found ${existing.id} (${existing._count.licenses} licenses, ${existing._count.certificates} certificates)` : "No existing account");
  if (!apply) { console.log("Dry run. Re-run with --apply to write."); process.exit(0); }

  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name: "Alex Morgan, MD (Demo)", emailVerified: now, licenseType: "MD", specialty: "Emergency Medicine", hasDeaRegistration: true },
    update: { name: "Alex Morgan, MD (Demo)", emailVerified: now, licenseType: "MD", specialty: "Emergency Medicine", hasDeaRegistration: true },
  });
  // The inbox does not exist: never email it.
  await prisma.emailPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, renewalReminders: false, monthlyDigest: false }, update: { renewalReminders: false, monthlyDigest: false } });
  // Essential without Stripe, so the reviewer sees two licenses and export.
  await prisma.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, tier: "ESSENTIAL", status: "ACTIVE" }, update: { tier: "ESSENTIAL", status: "ACTIVE" } });
  console.log(`Ready: ${user.id}`);
} finally {
  await prisma.$disconnect();
}
