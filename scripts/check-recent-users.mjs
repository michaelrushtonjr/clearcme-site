// Read-only: lists the 8 newest users and their linked auth providers.
// Run with: node --env-file=.env --env-file=.env.local scripts/check-recent-users.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const users = await prisma.user.findMany({
  orderBy: { createdAt: "desc" },
  take: 8,
  select: {
    email: true,
    createdAt: true,
    lastLoginAt: true,
    emailVerified: true,
    accounts: { select: { provider: true } },
  },
});

for (const u of users) {
  const providers = u.accounts.map((a) => a.provider).join(", ") || "NONE (magic link or mobile-created, no oauth link)";
  console.log(`${u.createdAt.toISOString()}  ${u.email}`);
  console.log(`  providers: ${providers}`);
  console.log(`  last login: ${u.lastLoginAt?.toISOString() ?? "never"}  emailVerified: ${u.emailVerified ? "yes" : "no"}`);
}
await prisma.$disconnect();
