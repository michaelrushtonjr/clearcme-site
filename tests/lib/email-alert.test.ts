import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { notifyReminderFailures } from "@/lib/email";
beforeEach(() => { vi.stubEnv("RESEND_API_KEY", "mock-key"); vi.stubEnv("ALERT_EMAIL", "founder@example.invalid"); });
afterEach(() => vi.unstubAllEnvs());
test("failure alert uses the existing email transport and ALERT_EMAIL recipient", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("{}"));
  await notifyReminderFailures("email-reminders", 2);
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({ to: ["founder@example.invalid"], html: expect.stringContaining("2 notification(s) failed") });
});
test("unset ALERT_EMAIL logs only, and alert failures cannot hide the original failure", async () => {
  vi.stubEnv("ALERT_EMAIL", ""); await notifyReminderFailures("monthly-digest", 1); expect(fetch).not.toHaveBeenCalled();
  vi.stubEnv("ALERT_EMAIL", "founder@example.invalid"); vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  await expect(notifyReminderFailures("monthly-digest", 1)).resolves.toBeUndefined();
});
