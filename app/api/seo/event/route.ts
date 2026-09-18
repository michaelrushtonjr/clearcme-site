import { NextResponse } from "next/server";
import { incrementSeoMetric } from "@/lib/seo-events";
import { seoCluster } from "@/lib/seo-attribution";

// Best-effort per-instance burst protection. All dimensions are bounded below.
const windows = new Map<string, { at: number; count: number }>();
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  if (request.headers.get("dnt") === "1") return new NextResponse(null, { status: 204 });
  if (Number(request.headers.get("content-length")) > 1024) return new NextResponse(null, { status: 413 });
  const now = Date.now();
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0];
  const current = windows.get(ip);
  if (current && now - current.at < 60_000) { if (++current.count > 60) return new NextResponse(null, { status: 429 }); }
  else { if (windows.size >= 10_000) windows.clear(); windows.set(ip, { at: now, count: 1 }); }
  try {
    const raw = await request.text();
    if (raw.length > 1024) return new NextResponse(null, { status: 413 });
    let value;
    try { value = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
    if (!value || !["cta_click", "course_click"].includes(value.event) || typeof value.page !== "string" || !seoCluster(value.page) || !["organic_search", "referral", "campaign", "direct_or_unknown"].includes(value.channel)) return new NextResponse(null, { status: 400 });
    await incrementSeoMetric({ event: value.event, landing: value.page, channel: value.channel });
    return new NextResponse(null, { status: 204 });
  } catch { return new NextResponse(null, { status: 503 }); }
}
