import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tables = await prisma.$queryRaw<Array<{tablename: string}>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    
    const tableNames = tables.map((t: {tablename: string}) => t.tablename);
    
    const required = ['User', 'Account', 'Session', 'VerificationToken'];
    const missing = required.filter(t => !tableNames.includes(t) && !tableNames.includes(t.toLowerCase()));
    
    // Check Google OAuth config
    const callbackUrl = `${process.env.NEXTAUTH_URL || process.env.AUTH_URL || ''}/api/auth/callback/google`;
    
    return NextResponse.json({
      tables: tableNames,
      missingTables: missing,
      allPresent: missing.length === 0,
      callbackUrl,
      authUrl: process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'NOT SET',
    });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
