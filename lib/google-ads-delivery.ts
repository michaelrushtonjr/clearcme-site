import { prisma } from "@/lib/prisma";
import { googleAdsConfig, type GoogleAdsConfig } from "@/lib/google-ads-config";
import { readAdsConsent } from "@/lib/google-ads-cookie";
import type { AdClick } from "@/lib/google-ads-consent";

const API = "https://datamanager.googleapis.com/v1";
const RETRY_MS = 6 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function registrationPayload(config: GoogleAdsConfig, event: { id: string; registeredAt: Date }, click: AdClick) {
  // Construct explicitly; never spread an account, cookie, request or DB row.
  return {
    destinations: [{
      operatingAccount: { accountType: "GOOGLE_ADS", accountId: config.customerId },
      loginAccount: { accountType: "GOOGLE_ADS", accountId: config.loginId },
      productDestinationId: config.actionId,
    }],
    consent: { adUserData: "CONSENT_GRANTED", adPersonalization: "CONSENT_DENIED" },
    events: [{
      adIdentifiers: { [click.kind]: click.value },
      eventTimestamp: event.registeredAt.toISOString(),
      transactionId: event.id,
      eventSource: "WEB",
    }],
  };
}

async function accessToken(config: GoogleAdsConfig): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(5000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken }),
  });
  if (!response.ok) throw new Error("Ads authorization unavailable");
  const value = await response.json();
  if (typeof value.access_token !== "string" || !value.access_token) throw new Error("Ads authorization unavailable");
  return value.access_token;
}

async function googleRequest(url: string, token: string, body?: unknown) {
  const response = await fetch(url, {
    method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(5000),
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error("Ads delivery unavailable");
  return response.json();
}

export async function deliverGoogleAdsRegistrations(now = new Date()) {
  const config = googleAdsConfig();
  const summary = { enabled: Boolean(config), submitted: 0, processed: 0, retry: 0, warnings: 0, exhausted: 0 };
  // Continue retention cleanup even when collection/delivery is switched off.
  try { await prisma.googleAdsRegistration.deleteMany({ where: { expiresAt: { lte: now } } }); }
  catch {
    if (config) throw new Error("Ads retention cleanup unavailable");
    return summary; // Disabled deployments may not have applied the migration yet.
  }
  if (!config) return summary;
  const rows = await prisma.googleAdsRegistration.findMany({
    where: { customerId: config.customerId, actionId: config.actionId, deliveredAt: null, availableAt: { lte: now }, expiresAt: { gt: now }, attempts: { lt: MAX_ATTEMPTS }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    // Five bounded requests per invocation leave room for timeouts on Vercel.
    orderBy: { availableAt: "asc" }, take: 5,
  });
  summary.exhausted = await prisma.googleAdsRegistration.count({ where: { deliveredAt: null, attempts: { gte: MAX_ATTEMPTS } } });
  if (!rows.length) return summary;
  const token = await accessToken(config);
  for (const row of rows) {
    const lease = new Date(now.getTime() + 5 * 60 * 1000);
    const claimed = await prisma.googleAdsRegistration.updateMany({
      where: { id: row.id, deliveredAt: null, availableAt: { lte: now }, expiresAt: { gt: now }, attempts: { lt: MAX_ATTEMPTS }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
      data: { lockedUntil: lease, attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;
    try {
      if (!row.requestId) {
        const consent = readAdsConsent(row.clickCiphertext, config.cookieKey, now.getTime());
        if (consent?.choice !== "granted" || !consent.click) throw new Error("Ads consent unavailable");
        const result = await googleRequest(`${API}/events:ingest`, token, registrationPayload(config, row, consent.click));
        if (typeof result.requestId !== "string" || result.requestId.length > 512 || !result.requestId) throw new Error("Ads receipt unavailable");
        await prisma.googleAdsRegistration.updateMany({ where: { id: row.id, lockedUntil: lease }, data: { requestId: result.requestId, lockedUntil: null, availableAt: new Date(now.getTime() + 60 * 60 * 1000) } });
        summary.submitted++;
        if (result.fieldWarnings?.length) summary.warnings++;
      } else {
        const result = await googleRequest(`${API}/requestStatus:retrieve?requestId=${encodeURIComponent(row.requestId)}`, token);
        const statuses = result.requestStatusPerDestination;
        const status = Array.isArray(statuses) && statuses.length === 1 ? statuses[0] : null;
        if (status?.destination?.operatingAccount?.accountId !== config.customerId || status?.destination?.productDestinationId !== config.actionId) throw new Error("Ads receipt destination unavailable");
        if (status.requestStatus === "SUCCESS") {
          await prisma.googleAdsRegistration.updateMany({ where: { id: row.id, lockedUntil: lease }, data: { deliveredAt: now, clickCiphertext: "", lockedUntil: null } });
          summary.processed++;
          if (status.warningInfo?.warningCounts?.length) summary.warnings++;
        } else if (status.requestStatus === "FAILED" || status.requestStatus === "PARTIAL_SUCCESS") {
          // Re-send the same random transactionId and original event timestamp.
          await prisma.googleAdsRegistration.updateMany({ where: { id: row.id, lockedUntil: lease }, data: { requestId: null, lockedUntil: null, availableAt: new Date(now.getTime() + RETRY_MS) } });
          summary.retry++;
        } else {
          await prisma.googleAdsRegistration.updateMany({ where: { id: row.id, lockedUntil: lease }, data: { lockedUntil: null, availableAt: new Date(now.getTime() + RETRY_MS) } });
          summary.retry++;
        }
      }
    } catch {
      // Never log errors returned by Google: they may echo click IDs or secrets.
      await prisma.googleAdsRegistration.updateMany({ where: { id: row.id, lockedUntil: lease }, data: { lockedUntil: null, availableAt: new Date(now.getTime() + RETRY_MS) } });
      summary.retry++;
    }
  }
  summary.exhausted = await prisma.googleAdsRegistration.count({ where: { deliveredAt: null, attempts: { gte: MAX_ATTEMPTS } } });
  return summary;
}
