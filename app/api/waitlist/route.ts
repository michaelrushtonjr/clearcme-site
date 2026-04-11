import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, source, state } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const entry = await prisma.waitlist.upsert({
      where: { email },
      update: {
        source: source ?? undefined,
        state: state ?? undefined,
      },
      create: {
        email,
        source: source ?? null,
        state: state ?? null,
      },
    });

    return NextResponse.json({ success: true, id: entry.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }
}
