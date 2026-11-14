import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// A Vercel preview build is given no database address, so a preview can never
// read or write production data. Without this stand-in the build itself stops
// ("DATABASE_URL environment variable is not set") and no preview exists at
// all. With it the build finishes and the public pages render; anything that
// actually reaches for the database on a preview fails with a clear message.
// Production and local runs are unchanged: no address still stops them at once.
function previewWithoutDatabase(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, property) {
      // Awaiting or printing the stand-in must not count as using it.
      if (typeof property === "symbol" || property === "then" || property === "toJSON") return undefined;
      throw new Error(`No database on a preview build: DATABASE_URL is not set for Preview (tried to use prisma.${property}).`);
    },
  });
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    if (process.env.VERCEL_ENV === "preview") return previewWithoutDatabase();
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
