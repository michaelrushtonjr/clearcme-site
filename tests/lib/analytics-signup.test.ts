import { beforeEach, expect, test, vi } from "vitest";

const captured = vi.hoisted(() => ({ calls: [] as { distinctId: string; event: string; properties: Record<string, unknown> }[] }));
vi.mock("posthog-node", () => ({
  PostHog: class {
    async captureImmediate(payload: (typeof captured.calls)[number]) { captured.calls.push(payload); }
  },
}));
// Outside a request `after` throws; trackEvent then sends without waiting.
vi.mock("next/server", () => ({ after: () => { throw new Error("no request"); } }));

beforeEach(() => { captured.calls.length = 0; vi.resetModules(); });

test("a new account records signup_completed, and still records user_signed_up for the older charts", async () => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
  const { trackSignup } = await import("@/lib/analytics");
  trackSignup({ id: "user_1", email: "new@example.invalid", name: null }, "google", "web");
  await Promise.resolve();
  expect(captured.calls.map((call) => [call.distinctId, call.event])).toEqual([["user_1", "user_signed_up"], ["user_1", "signup_completed"]]);
  expect(captured.calls[1].properties).toEqual({ method: "google", source: "web" });
  vi.unstubAllEnvs();
});

test("without a PostHog key (local, tests, preview builds) nothing is sent", async () => {
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  const { trackSignup } = await import("@/lib/analytics");
  trackSignup({ id: "user_2" }, "email", "ios_app");
  await Promise.resolve();
  expect(captured.calls).toEqual([]);
  vi.unstubAllEnvs();
});
