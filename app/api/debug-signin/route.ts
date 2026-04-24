import { NextResponse } from "next/server";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Test DB tables
    const tables = await prisma.$queryRaw<Array<{tablename: string}>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const tableNames = tables.map((t: {tablename: string}) => t.tablename);

    // 2. Test adapter
    const adapter = PrismaAdapter(prisma);
    const testUser = await adapter.getUserByEmail?.("test-nonexistent@example.com");

    // 3. Check Google provider config
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const clientIdPrefix = process.env.GOOGLE_CLIENT_ID?.substring(0, 20) || "NOT SET";

    // 4. Check auth secret
    const hasAuthSecret = !!process.env.AUTH_SECRET;
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
    const secretLength = (process.env.AUTH_SECRET || "").length;

    // 5. Try to count existing accounts
    const accountCount = await prisma.account.count();
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.session.count();

    return NextResponse.json({
      db: "ok",
      tables: tableNames,
      adapterTest: testUser === null ? "works (null as expected)" : "unexpected",
      google: { hasClientId, hasClientSecret, clientIdPrefix },
      auth: { hasAuthSecret, hasNextAuthSecret, secretLength },
      counts: { users: userCount, accounts: accountCount, sessions: sessionCount },
      nextAuthUrl: process.env.NEXTAUTH_URL || "NOT SET",
      authTrustHost: process.env.AUTH_TRUST_HOST || "NOT SET",
    });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json({ 
      error: error.message, 
      name: error.name,
      stack: error.stack?.split("\n").slice(0, 5),
    }, { status: 500 });
  }
}
