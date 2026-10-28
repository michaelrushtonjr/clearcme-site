import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "../helpers/prisma-mock";
import { adsTestKey, configureAdsTests } from "../helpers/google-ads";
import { googleAdsConfig } from "@/lib/google-ads-config";
import { newAdsConsent, sealAdsConsent } from "@/lib/google-ads-cookie";
import { deliverGoogleAdsRegistrations, registrationPayload } from "@/lib/google-ads-delivery";

const now = new Date("2026-10-28T18:00:00.000Z");
const click = { kind: "gclid" as const, value: "test_click-123" };
const row = () => ({ id: "random-event-id", userId: "private-user", consentId: "private-consent", customerId: "1234567890", actionId: "987654321", registeredAt: new Date("2026-10-28T10:00:00Z"), clickCiphertext: sealAdsConsent(newAdsConsent("granted", click, now.getTime() - 86400_000), adsTestKey), requestId: null as string | null });
const json = (value: unknown, status = 200) => Response.json(value, { status });
const receipt = (requestStatus: string, extra = {}) => ({ requestStatusPerDestination: [{ destination: { operatingAccount: { accountId: "1234567890" }, productDestinationId: "987654321" }, requestStatus, ...extra }] });

beforeEach(() => {
  configureAdsTests();
  prismaMock.googleAdsRegistration.findMany.mockResolvedValue([row()]);
  prismaMock.googleAdsRegistration.count.mockResolvedValue(0);
  prismaMock.googleAdsRegistration.updateMany.mockResolvedValue({ count: 1 });
  vi.mocked(fetch).mockResolvedValueOnce(json({ access_token: "fixture-access" }));
});
afterEach(() => vi.unstubAllEnvs());

describe("minimal server-to-Google payload", () => {
  it("projects only click attribution and registration facts; no identity, URL, IP or clinical data", () => {
    const privateRow = { ...row(), email: "doctor@example.invalid", name: "Doctor", npi: "1234567890", license: "private-license", url: "https://clearcme.ai/login?token=private-token" };
    expect(registrationPayload(googleAdsConfig()!, privateRow, click)).toEqual({
      destinations: [{ operatingAccount: { accountType: "GOOGLE_ADS", accountId: "1234567890" }, loginAccount: { accountType: "GOOGLE_ADS", accountId: "1234567890" }, productDestinationId: "987654321" }],
      consent: { adUserData: "CONSENT_GRANTED", adPersonalization: "CONSENT_DENIED" },
      events: [{ adIdentifiers: { gclid: "test_click-123" }, eventTimestamp: "2026-10-28T10:00:00.000Z", transactionId: "random-event-id", eventSource: "WEB" }],
    });
    expect(registrationPayload(googleAdsConfig()!, privateRow, { kind: "wbraid", value: "test_wbraid-123" }).events[0].adIdentifiers).toEqual({ wbraid: "test_wbraid-123" });
  });
  it("submits through Data Manager and stores receipt without claiming processing success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ requestId: "receipt-1" }));
    const summary = await deliverGoogleAdsRegistrations(now);
    expect(summary).toMatchObject({ submitted: 1, processed: 0 });
    const [url, options] = vi.mocked(fetch).mock.calls[1];
    expect(url).toBe("https://datamanager.googleapis.com/v1/events:ingest");
    expect(options?.headers).toEqual({ Authorization: "Bearer fixture-access", "Content-Type": "application/json" });
    expect(JSON.stringify(options)).not.toContain("private-user");
    expect(JSON.stringify(options)).not.toContain("private-consent");
    expect(JSON.stringify(options)).not.toContain("cookie");
    expect(prismaMock.googleAdsRegistration.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { requestId: "receipt-1", lockedUntil: null, availableAt: new Date(now.getTime() + 3600_000) } }));
  });
});
describe("delivery accounting and failures", () => {
  it("requires Google's asynchronous SUCCESS, then erases click data", async () => {
    prismaMock.googleAdsRegistration.findMany.mockResolvedValue([{ ...row(), requestId: "receipt-1" }]);
    vi.mocked(fetch).mockResolvedValueOnce(json(receipt("SUCCESS")));
    expect(await deliverGoogleAdsRegistrations(now)).toMatchObject({ submitted: 0, processed: 1 });
    expect(prismaMock.googleAdsRegistration.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { deliveredAt: now, clickCiphertext: "", lockedUntil: null } }));
  });
  it.each(["FAILED", "PARTIAL_SUCCESS", "PROCESSING", "REQUEST_STATUS_UNKNOWN"])("does not mark %s as processed", async (status) => {
    prismaMock.googleAdsRegistration.findMany.mockResolvedValue([{ ...row(), requestId: "receipt-1" }]);
    vi.mocked(fetch).mockResolvedValueOnce(json(receipt(status)));
    expect(await deliverGoogleAdsRegistrations(now)).toMatchObject({ processed: 0, retry: 1 });
    expect(prismaMock.googleAdsRegistration.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deliveredAt: expect.any(Date) }) }));
    const last = prismaMock.googleAdsRegistration.updateMany.mock.calls.at(-1)![0];
    if (["FAILED", "PARTIAL_SUCCESS"].includes(status)) expect(last.data.requestId).toBeNull();
    else expect(last.data).not.toHaveProperty("requestId");
  });
  it("rejects receipts for a different conversion destination", async () => {
    prismaMock.googleAdsRegistration.findMany.mockResolvedValue([{ ...row(), requestId: "receipt-1" }]);
    vi.mocked(fetch).mockResolvedValueOnce(json({ requestStatusPerDestination: [{ requestStatus: "SUCCESS", destination: { productDestinationId: "wrong" } }] }));
    expect(await deliverGoogleAdsRegistrations(now)).toMatchObject({ processed: 0, retry: 1 });
  });
  it("ambiguous transport failure retains event ID and timestamp for deduplicated retries", async () => {
    const event = row();
    prismaMock.googleAdsRegistration.findMany.mockResolvedValue([event]);
    vi.mocked(fetch).mockRejectedValueOnce(new Error("test_click-123 private@example.invalid"));
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await deliverGoogleAdsRegistrations(now)).toMatchObject({ submitted: 0, retry: 1 });
    expect(prismaMock.googleAdsRegistration.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { lockedUntil: null, availableAt: new Date(now.getTime() + 6 * 3600_000) } }));
    expect(prismaMock.googleAdsRegistration.updateMany.mock.calls.some(([query]) => query.data.id || query.data.registeredAt)).toBe(false);
    expect(log).not.toHaveBeenCalled(); log.mockRestore();
  });
  it("an expired or forged click cookie cannot be uploaded", async () => {
    prismaMock.googleAdsRegistration.findMany.mockResolvedValue([{ ...row(), clickCiphertext: "forged" }]);
    expect(await deliverGoogleAdsRegistrations(now)).toMatchObject({ submitted: 0, retry: 1 });
    expect(fetch).toHaveBeenCalledTimes(1); // Only server OAuth, no event.
  });
  it("a worker that loses its atomic claim sends no event", async () => {
    prismaMock.googleAdsRegistration.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await deliverGoogleAdsRegistrations(now)).toMatchObject({ submitted: 0, processed: 0 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(prismaMock.googleAdsRegistration.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ availableAt: { lte: now }, expiresAt: { gt: now }, attempts: { lt: 8 } }) }));
  });
  it("performs retention cleanup with delivery disabled and sends no network requests", async () => {
    vi.stubEnv("GOOGLE_ADS_MEASUREMENT_ENABLED", "false");
    expect(await deliverGoogleAdsRegistrations(now)).toMatchObject({ enabled: false });
    expect(prismaMock.googleAdsRegistration.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lte: now } } });
    expect(prismaMock.googleAdsRegistration.findMany).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it("surfaces exhausted delivery attempts even when no new events are eligible", async () => {
    prismaMock.googleAdsRegistration.findMany.mockResolvedValue([]);
    prismaMock.googleAdsRegistration.count.mockResolvedValue(2);
    expect(await deliverGoogleAdsRegistrations(now)).toMatchObject({ exhausted: 2 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("counts warnings without exposing their text or click identifiers", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ requestId: "receipt-1", fieldWarnings: [{ description: "test_click-123" }] }));
    const result = await deliverGoogleAdsRegistrations(now);
    expect(result.warnings).toBe(1); expect(JSON.stringify(result)).not.toContain("test_click-123");
  });
});
