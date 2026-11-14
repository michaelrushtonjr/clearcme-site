import { afterEach, beforeEach, expect, test, vi } from "vitest";

// lib/prisma.ts is replaced by a mock in most tests (tests/setup.ts); these
// load the real module to pin what happens when there is no database address.
beforeEach(() => { vi.resetModules(); vi.doUnmock("@/lib/prisma"); vi.stubEnv("DATABASE_URL", ""); vi.stubEnv("NODE_ENV", "production"); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

test("a Vercel preview build with no database address loads, and fails only when the database is used", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  const { prisma } = await vi.importActual<typeof import("@/lib/prisma")>("@/lib/prisma");
  expect(() => prisma.user).toThrow(/No database on a preview build/);
  expect(() => prisma.$transaction).toThrow(/prisma\.\$transaction/);
  // Awaiting the stand-in (as a module export can be) is not a use.
  await expect(Promise.resolve(prisma)).resolves.toBe(prisma);
});

test("production and local runs still stop at once without a database address", async () => {
  for (const environment of ["production", "development", ""]) {
    vi.resetModules();
    vi.stubEnv("VERCEL_ENV", environment);
    await expect(vi.importActual("@/lib/prisma")).rejects.toThrow("DATABASE_URL environment variable is not set");
  }
});
