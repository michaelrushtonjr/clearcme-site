import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateEmailPreference } from "@/lib/email-preferences";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pref = await getOrCreateEmailPreference(userId);
  return NextResponse.json({
    renewalReminders: pref.renewalReminders,
    monthlyDigest: pref.monthlyDigest,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: { renewalReminders?: boolean; monthlyDigest?: boolean } = {};
  if (typeof body.renewalReminders === "boolean") data.renewalReminders = body.renewalReminders;
  if (typeof body.monthlyDigest === "boolean") data.monthlyDigest = body.monthlyDigest;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await getOrCreateEmailPreference(userId);
  const pref = await prisma.emailPreference.update({
    where: { userId },
    data,
  });

  return NextResponse.json({
    renewalReminders: pref.renewalReminders,
    monthlyDigest: pref.monthlyDigest,
  });
}
