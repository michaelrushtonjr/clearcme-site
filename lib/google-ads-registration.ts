import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADS_COOKIE, ADS_TTL, adMeasurementBlocked } from "@/lib/google-ads-consent";
import { googleAdsConfig } from "@/lib/google-ads-config";
import { readAdsConsent } from "@/lib/google-ads-cookie";

// Auth.js calls this only after successful web sign-in. A click, email-link
// request, returning sign-in or client-supplied "registration" is not enough.
export async function queueGoogleAdsRegistration(userId: string, isNewUser: boolean | undefined) {
  const config = googleAdsConfig();
  if (!config || !isNewUser) return;
  try {
    if (adMeasurementBlocked(await headers())) return;
    const encrypted = (await cookies()).get(ADS_COOKIE)?.value;
    const consent = readAdsConsent(encrypted, config.cookieKey);
    if (consent?.choice !== "granted" || !consent.click) return;
    const now = new Date();
    await prisma.googleAdsRegistration.upsert({
      where: { userId }, update: {},
      create: {
        userId, consentId: consent.id, customerId: config.customerId, actionId: config.actionId,
        clickCiphertext: encrypted!, registeredAt: now,
        // Allow click processing before import; keep the actual registration time.
        availableAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
        expiresAt: new Date(consent.at + ADS_TTL * 1000),
      },
    });
  } catch { console.warn("Google Ads registration queue unavailable"); }
}
