import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    const userCount = await prisma.user.count();
    return NextResponse.json({ db: "connected", result, userCount });
  } catch (e: unknown) {
    const error = e as Error;
    return NextResponse.json({ db: "error", message: error.message, name: error.name }, { status: 500 });
  }
}
