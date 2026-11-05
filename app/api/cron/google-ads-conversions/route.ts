import { NextResponse } from "next/server";
import { deliverGoogleAdsRegistrations } from "@/lib/google-ads-delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse(null, { status: 401 });
  try {
    const summary = await deliverGoogleAdsRegistrations();
    if (summary.retry || summary.warnings || summary.exhausted) console.warn("Google Ads delivery needs review", summary);
    return NextResponse.json(summary, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.warn("Google Ads delivery unavailable");
    return NextResponse.json({ error: "Conversion delivery unavailable" }, { status: 503 });
  }
}
