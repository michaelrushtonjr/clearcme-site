import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/google-ads-delivery", () => ({ deliverGoogleAdsRegistrations: vi.fn() }));
import { deliverGoogleAdsRegistrations } from "@/lib/google-ads-delivery";
import { GET } from "@/app/api/cron/google-ads-conversions/route";
afterEach(() => vi.unstubAllEnvs());

it("requires a configured cron secret and valid bearer token", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect((await GET(new Request("https://clearcme.ai/api/cron/google-ads-conversions", { headers: { authorization: "Bearer undefined" } }))).status).toBe(401);
  vi.stubEnv("CRON_SECRET", "fixture-cron");
  expect((await GET(new Request("https://clearcme.ai/api/cron/google-ads-conversions"))).status).toBe(401);
  expect(deliverGoogleAdsRegistrations).not.toHaveBeenCalled();
});
it("returns aggregate delivery counts without identifiers", async () => {
  vi.stubEnv("CRON_SECRET", "fixture-cron");
  const summary = { enabled: true, submitted: 1, processed: 0, retry: 0, warnings: 0, exhausted: 0 };
  vi.mocked(deliverGoogleAdsRegistrations).mockResolvedValueOnce(summary);
  const response = await GET(new Request("https://clearcme.ai/api/cron/google-ads-conversions", { headers: { authorization: "Bearer fixture-cron" } }));
  expect(await response.json()).toEqual(summary);
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("redacts upstream failures", async () => {
  vi.stubEnv("CRON_SECRET", "fixture-cron");
  vi.mocked(deliverGoogleAdsRegistrations).mockRejectedValueOnce(new Error("private-user private-click fixture-secret"));
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  const response = await GET(new Request("https://clearcme.ai/api/cron/google-ads-conversions", { headers: { authorization: "Bearer fixture-cron" } }));
  expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "Conversion delivery unavailable" });
  expect(log).toHaveBeenCalledWith("Google Ads delivery unavailable"); log.mockRestore();
});
