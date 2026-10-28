import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADS_COOKIE, ADS_TTL, adMeasurementBlocked, parseAdClick } from "@/lib/google-ads-consent";
import { googleAdsConfig } from "@/lib/google-ads-config";
import { newAdsConsent, readAdsConsent, sealAdsConsent } from "@/lib/google-ads-cookie";
import { seoCluster } from "@/lib/seo-attribution";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const config = googleAdsConfig();
  const consent = config ? readAdsConsent((await cookies()).get(ADS_COOKIE)?.value, config.cookieKey) : null;
  return NextResponse.json({ enabled: Boolean(config) && !adMeasurementBlocked(request.headers), choice: consent?.choice ?? null }, { headers: noStore });
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") !== origin) return new NextResponse(null, { status: 403, headers: noStore });
  const config = googleAdsConfig();
  if (!config) return new NextResponse(null, { status: 204, headers: noStore });
  try {
    if (Number(request.headers.get("content-length")) > 1024) return new NextResponse(null, { status: 413, headers: noStore });
    const raw = await request.text();
    if (raw.length > 1024) return new NextResponse(null, { status: 413, headers: noStore });
    let body;
    try { body = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400, headers: noStore }); }
    if (!body || !["granted", "denied"].includes(body.choice) || Object.keys(body).some((key) => !["choice", "click", "page"].includes(key))) return new NextResponse(null, { status: 400, headers: noStore });
    const click = parseAdClick(body.click);
    if (body.click != null && (!click || typeof body.page !== "string" || !seoCluster(body.page))) return new NextResponse(null, { status: 400, headers: noStore });
    const jar = await cookies();
    const old = readAdsConsent(jar.get(ADS_COOKIE)?.value, config.cookieKey);
    const choice = adMeasurementBlocked(request.headers) ? "denied" : body.choice;
    // Withdrawal also cancels events not yet submitted to Google. Already sent
    // events cannot be recalled through this consent endpoint.
    if (choice === "denied" && old) await prisma.googleAdsRegistration.deleteMany({ where: { consentId: old.id, requestId: null, deliveredAt: null } });
    const consent = choice === "granted" && old?.choice === "granted"
      ? { ...old, click: click ?? old.click }
      : newAdsConsent(choice, click);
    jar.set(ADS_COOKIE, sealAdsConsent(consent, config.cookieKey), {
      httpOnly: true, secure: new URL(request.url).protocol === "https:",
      // Apple returns via a cross-site POST, just like existing attribution.
      sameSite: new URL(request.url).protocol === "https:" ? "none" : "lax",
      path: "/", maxAge: Math.max(0, Math.floor(ADS_TTL - (Date.now() - consent.at) / 1000)),
    });
    return new NextResponse(null, { status: 204, headers: noStore });
  } catch { return new NextResponse(null, { status: 503, headers: noStore }); }
}
