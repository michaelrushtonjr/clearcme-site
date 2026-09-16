import { prismaMock as db } from "../../../helpers/prisma-mock";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { licenseInput, requirement } from "../../../helpers/compliance-fixtures";
const mail = vi.hoisted(() => ({ send: vi.fn(), alert: vi.fn() }));
vi.mock("@/lib/email", async (original) => ({ ...await original<typeof import("@/lib/email")>(), sendEmail: mail.send, notifyReminderFailures: mail.alert }));
vi.mock("@/lib/email-preferences", () => ({ getOrCreateEmailPreference: async () => ({ renewalReminders: true, monthlyDigest: true, unsubscribeToken: "test" }), unsubscribeUrlFor: () => "https://example.invalid/unsubscribe" }));
import { GET as reminders } from "@/app/api/cron/email-reminders/route";
import { GET as digest } from "@/app/api/cron/monthly-digest/route";
import { GET as push } from "@/app/api/cron/renewal-reminders/route";

type Log = { id: string; dedupeKey: string; userId: string; kind: string; cycleKey: string; status: string; attempts: number; lastError: string | null; lastAttemptAt: Date; sentAt?: Date };
let logs: Map<string, Log>;
let renewal: Date;
const request = () => new NextRequest("http://localhost/api/cron/test", { headers: { authorization: "Bearer test-cron" } });
async function run(handler: typeof reminders) { const response = handler(request()); await vi.runAllTimersAsync(); return response; }
function seedSent(marker: number) {
  const date = renewal.toISOString().slice(0, 10); const key = `renewal:license:${marker}:${date}`;
  logs.set(key, { id: key, dedupeKey: key, userId: "user", kind: "RENEWAL_REMINDER", cycleKey: `license:${date}`, status: "SENT", attempts: 1, lastError: null, lastAttemptAt: new Date() });
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-16T13:00:00Z")); vi.stubEnv("CRON_SECRET", "test-cron");
  renewal = new Date("2026-10-16T00:00:00Z"); logs = new Map(); seedSent(90); seedSent(60);
  db.emailLog.findFirst.mockResolvedValue(null);
  mail.send.mockResolvedValue({ ok: true }); mail.alert.mockResolvedValue(undefined);
  db.$queryRaw.mockImplementation(async (_strings, ...values) => {
    const [id, userId, kind, dedupeKey, cycleKey, now, , stale] = values;
    const old = logs.get(dedupeKey);
    if (old && (old.status === "SENT" || old.attempts >= 5 || (old.status === "PENDING" && old.lastAttemptAt >= stale))) return [];
    const log = { id: old?.id ?? id, userId, kind, dedupeKey, cycleKey, status: "PENDING", attempts: (old?.attempts ?? 0) + 1, lastError: null, lastAttemptAt: now };
    logs.set(dedupeKey, log); return [{ id: log.id }];
  });
  db.emailLog.findUnique.mockImplementation(async ({ where }) => logs.get(where.dedupeKey));
  db.emailLog.update.mockImplementation(async ({ where, data }) => { const log = [...logs.values()].find((row) => row.id === where.id)!; Object.assign(log, data); return log; });
  db.user.findUnique.mockResolvedValue({ id: "user", email: "test@example.invalid", name: "Physician", hasDeaRegistration: false });
  db.user.findMany.mockImplementation(async ({ select }) => select.pushToken ? [{ id: "user", pushToken: "push-test", licenses: [{ ...licenseInput().license, renewalDate: renewal }] }] : [{ id: "user" }]);
  db.physicianLicense.findMany.mockImplementation(async ({ where }) => where.renewalDate?.lt && renewal >= where.renewalDate.lt ? [] : [{ ...licenseInput().license, userId: "user", renewalDate: renewal }]);
  db.federalTrainingRecord.findUnique.mockResolvedValue(null);
  db.certificate.findMany.mockResolvedValue([]); db.userRequirementCompletion.findMany.mockResolvedValue([]);
  db.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, totalHours: 10, mandatoryRequirements: [requirement()] });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

test("a throwing send leaves FAILED with its error and retries successfully at 29 days", async () => {
  mail.send.mockRejectedValueOnce(new Error("mail transport down"));
  const first = await run(reminders);
  expect(first.status).toBe(500); expect(await first.json()).toMatchObject({ sent: 0, failed: 1 });
  const log = logs.get("renewal:license:30:2026-10-16")!;
  expect(log).toMatchObject({ status: "FAILED", attempts: 1, lastError: "mail transport down", cycleKey: "license:2026-10-16" });
  expect(mail.alert).toHaveBeenCalledWith("email-reminders", 1);
  vi.setSystemTime(new Date("2026-09-17T13:00:00Z"));
  const retry = await run(reminders);
  expect(retry.status).toBe(200); expect(await retry.json()).toMatchObject({ sent: 1, failed: 0 });
  expect(logs.get(log.dedupeKey)).toMatchObject({ status: "SENT", attempts: 2, lastError: null });
});
test("SENT prevents duplicate delivery even with overlapping cron runs", async () => {
  const pair = Promise.all([reminders(request()), reminders(request())]); await vi.runAllTimersAsync(); await pair;
  await run(reminders);
  expect(mail.send).toHaveBeenCalledTimes(1);
  expect(logs.get("renewal:license:30:2026-10-16")?.status).toBe("SENT");
});
test("returned transport failure is durable and capped at five attempts", async () => {
  mail.send.mockResolvedValue({ ok: false, error: "Resend failure" });
  for (let i = 0; i < 6; i++) expect((await run(reminders)).status).toBe(500);
  expect(mail.send).toHaveBeenCalledTimes(5);
  expect(logs.get("renewal:license:30:2026-10-16")).toMatchObject({ status: "FAILED", attempts: 5 });
});
test("stale PENDING after a terminated function is retried", async () => {
  await run(reminders);
  const row = logs.get("renewal:license:30:2026-10-16")!;
  row.status = "PENDING"; row.lastAttemptAt = new Date(Date.now() - 16 * 60_000);
  await run(reminders);
  expect(mail.send).toHaveBeenCalledTimes(2); expect(row.status).toBe("PENDING");
  expect(logs.get(row.dedupeKey)?.status).toBe("SENT");
});
test("digest renders current engine gaps instead of stored compliance and dedupes the month", async () => {
  db.complianceStatus.findMany.mockResolvedValue([{ isCompliant: true, gapHours: 0 }]);
  expect((await run(digest)).status).toBe(200);
  expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining("10.0 hours") }));
  expect(mail.send.mock.calls[0][0].html).not.toContain("every tracked license is on track");
  expect(db.complianceStatus.findMany).not.toHaveBeenCalled();
  await run(digest); expect(mail.send).toHaveBeenCalledTimes(1);
});
test("push evaluates fresh engine state and exposes rejected Expo tickets", async () => {
  renewal = new Date("2026-09-30");
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ data: [{ status: "error", message: "DeviceNotRegistered" }] })));
  const response = await push(request());
  expect(response.status).toBe(500); expect(await response.json()).toMatchObject({ sent: 0, failed: 1 });
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))[0].body).toContain("10 CME hours");
  expect(db.complianceStatus.findMany).not.toHaveBeenCalled(); expect(mail.alert).toHaveBeenCalledWith("renewal-reminders", 1);
});

test("failed monthly digest retries across a calendar-month boundary before a new digest", async () => {
  vi.setSystemTime(new Date("2026-09-30T13:00:00Z"));
  mail.send.mockRejectedValueOnce(new Error("month-end outage"));
  expect((await run(digest)).status).toBe(500);
  const old = logs.get("digest:user:2026-09")!;
  vi.setSystemTime(new Date("2026-10-01T13:00:00Z"));
  db.emailLog.findFirst.mockResolvedValue(old);
  expect((await run(digest)).status).toBe(200);
  expect(logs.get(old.dedupeKey)).toMatchObject({ status: "SENT", attempts: 2 });
  expect(logs.has("digest:user:2026-10")).toBe(false);
  db.emailLog.findFirst.mockResolvedValue(null);
});
