import { NextResponse } from "next/server";
import { lastAuthError } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ lastAuthError: lastAuthError ?? "no error captured yet" });
}
