import { prismaMock as db } from "../helpers/prisma-mock";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { licenseInput, requirement } from "../helpers/compliance-fixtures";

const mail = vi.hoisted(() => ({ send: vi.fn() }));
const preference = vi.hoisted(() => ({ renewalReminders: true, lookups: 0 }));
const queued = vi.hoisted(() => [] as (() => unknown)[]);
vi.mock("@/lib/email", async (original) => ({ ...(await original<typeof import("@/lib/email")>()), sendEmail: mail.send }));
vi.mock("@/lib/email-preferences", () => ({
  getOrCreateEmailPreference: async () => {
    preference.lookups++;
    return { renewalReminders: preference.renewalReminders, monthlyDigest: true, unsubscribeToken: "token" };
  },
  unsubscribeUrlFor: (token: string) => `https://clearcme.ai/unsubscribe?token=${token}`,
}));
vi.mock("next/server", async (original) => ({ ...(await original<typeof import("next/server")>()), after: (task: () => unknown) => { queued.push(task); } }));

import { scheduleSignupDayEmail, sendSignupDayEmail, signupDayEmailEnabled, SIGNUP_DAY_WINDOW_HOURS } from "@/lib/signup-day-email";

type Log = { id: string; dedupeKey: string; userId: string; kind: string; cycleKey: string; status: string; attempts: number; lastError: string | null; lastAttemptAt: Date; sentAt?: Date };
let logs: Map<string, Log>;
let createdAt: Date;
let licenses: Record<string, unknown>[];
const now = new Date("2026-11-14T15:00:00Z");
const key = "signup-day:user";
const pennsylvania = () => ({ ...licenseInput().license, userId: "user", state: "PA", renewalDate: new Date("2026-12-31T00:00:00Z"), deaNumber: null, deaRegisteredAt: null });
const databaseCalls = () => [db.user.findUnique, db.emailLog.findUnique, db.physicianLicense.findMany, db.$queryRaw].reduce((sum, fn) => sum + fn.mock.calls.length, 0);

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubEnv("SIGNUP_DAY_EMAIL_ENABLED", "true"); vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("NEXTAUTH_URL", "https://clearcme.ai");
  logs = new Map(); queued.length = 0; preference.renewalReminders = true; preference.lookups = 0;
  createdAt = new Date(now.getTime() - 20 * 60_000);
  licenses = [pennsylvania()];
  mail.send.mockResolvedValue({ ok: true });
  // Same claim rules as the SQL in lib/email-delivery.ts.
  db.$queryRaw.mockImplementation(async (_strings, ...values) => {
    const [id, userId, kind, dedupeKey, cycleKey, at, , stale] = values;
    const old = logs.get(dedupeKey);
    if (old && (old.status === "SENT" || old.attempts >= 5 || (old.status === "PENDING" && old.lastAttemptAt >= stale))) return [];
    const log = { id: old?.id ?? id, userId, kind, dedupeKey, cycleKey, status: "PENDING", attempts: (old?.attempts ?? 0) + 1, lastError: null, lastAttemptAt: at };
    logs.set(dedupeKey, log); return [{ id: log.id }];
  });
  db.emailLog.findUnique.mockImplementation(async ({ where }) => logs.get(where.dedupeKey) ?? null);
  db.emailLog.update.mockImplementation(async ({ where, data }) => { const log = [...logs.values()].find((row) => row.id === where.id)!; Object.assign(log, data); return log; });
  db.user.findUnique.mockImplementation(async () => ({ id: "user", email: "physician@example.invalid", name: "Jordan Lee", createdAt, hasDeaRegistration: false, deaFirstQualifyingAt: null, specialty: null, practiceArea: null }));
  db.physicianLicense.findMany.mockImplementation(async () => licenses);
  db.certificate.findMany.mockResolvedValue([]); db.userRequirementCompletion.findMany.mockResolvedValue([]);
  db.federalTrainingRecord.findUnique.mockResolvedValue(null);
  db.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, totalHours: 100, mandatoryRequirements: [requirement({ topic: "PATIENT_SAFETY", hoursRequired: 12 })] });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("flag", () => {
  test.each([undefined, "", "1", "TRUE", "True", "yes", "on", "false", " true"])("is off for %j: nothing is read, claimed or sent", async (value) => {
    if (value === undefined) vi.stubEnv("SIGNUP_DAY_EMAIL_ENABLED", undefined as unknown as string); else vi.stubEnv("SIGNUP_DAY_EMAIL_ENABLED", value);
    expect(signupDayEmailEnabled()).toBe(false);
    expect(await sendSignupDayEmail("user")).toBe("disabled");
    scheduleSignupDayEmail("user");
    expect(queued).toHaveLength(0);
    expect(databaseCalls()).toBe(0); expect(preference.lookups).toBe(0); expect(mail.send).not.toHaveBeenCalled(); expect(logs.size).toBe(0);
  });

  test("is on only for exactly \"true\"", () => { expect(signupDayEmailEnabled()).toBe(true); });
});

describe("with the flag on", () => {
  test("sends one email with days left, hours open and the open topic, and records it", async () => {
    expect(await sendSignupDayEmail("user")).toBe("sent");
    expect(mail.send).toHaveBeenCalledTimes(1);
    const message = mail.send.mock.calls[0][0];
    expect(message).toMatchObject({ to: "physician@example.invalid", subject: "Pennsylvania MD: 47 days to renewal, 100.0 hours of CME still open", unsubscribeUrl: "https://clearcme.ai/unsubscribe?token=token" });
    expect(message.text).toContain("Hi Jordan,");
    expect(message.text).toContain("Renews December 31, 2026 · 47 days left");
    expect(message.text).toContain("- Patient Safety: 12.0 hours");
    expect(message.html).toContain("https://clearcme.ai/unsubscribe?token=token");
    expect(logs.get(key)).toMatchObject({ kind: "SIGNUP_DAY", userId: "user", cycleKey: key, status: "SENT", attempts: 1 });
  });

  test("a second arrival, a refresh or a second license sends nothing more", async () => {
    await sendSignupDayEmail("user");
    licenses = [pennsylvania(), { ...pennsylvania(), id: "license-2", state: "NJ" }];
    expect(await sendSignupDayEmail("user")).toBe("already_sent");
    expect(await sendSignupDayEmail("user")).toBe("already_sent");
    expect(mail.send).toHaveBeenCalledTimes(1); expect(logs.size).toBe(1);
  });

  test("two arrivals at the same moment still send one email", async () => {
    const outcomes = await Promise.all([sendSignupDayEmail("user"), sendSignupDayEmail("user")]);
    expect(outcomes.sort()).toEqual(["deduped", "sent"]);
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  test("an unsubscribed account, or reminders switched off in Settings, gets nothing", async () => {
    preference.renewalReminders = false;
    expect(await sendSignupDayEmail("user")).toBe("opted_out");
    expect(mail.send).not.toHaveBeenCalled(); expect(logs.size).toBe(0);
  });

  test(`an account older than ${SIGNUP_DAY_WINDOW_HOURS} hours gets nothing; a younger one does`, async () => {
    createdAt = new Date(now.getTime() - (SIGNUP_DAY_WINDOW_HOURS * 60 + 1) * 60_000);
    expect(await sendSignupDayEmail("user")).toBe("outside_window");
    expect(mail.send).not.toHaveBeenCalled(); expect(logs.size).toBe(0);
    createdAt = new Date(now.getTime() - (SIGNUP_DAY_WINDOW_HOURS * 60 - 1) * 60_000);
    expect(await sendSignupDayEmail("user")).toBe("sent");
  });

  test("an account with no saved license gets nothing", async () => {
    licenses = [];
    expect(await sendSignupDayEmail("user")).toBe("no_license");
    expect(mail.send).not.toHaveBeenCalled(); expect(logs.size).toBe(0);
  });

  test("an account with no address, or a server with no mail key, gets nothing", async () => {
    db.user.findUnique.mockResolvedValueOnce({ email: null, createdAt });
    expect(await sendSignupDayEmail("user")).toBe("no_address");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendSignupDayEmail("user")).toBe("email_not_configured");
    expect(mail.send).not.toHaveBeenCalled(); expect(logs.size).toBe(0);
  });

  test("a failed send is recorded and the next arrival retries it once", async () => {
    mail.send.mockResolvedValueOnce({ ok: false, error: "Resend 500" });
    expect(await sendSignupDayEmail("user")).toBe("failed");
    expect(logs.get(key)).toMatchObject({ status: "FAILED", lastError: "Resend 500" });
    expect(await sendSignupDayEmail("user")).toBe("sent");
    expect(await sendSignupDayEmail("user")).toBe("already_sent");
    expect(mail.send).toHaveBeenCalledTimes(2);
  });

  test("a license ClearCME does not calculate gets its date and no hour counts", async () => {
    licenses = [{ ...pennsylvania(), state: "KS" }];
    expect(await sendSignupDayEmail("user")).toBe("sent");
    const message = mail.send.mock.calls[0][0];
    expect(message.subject).toBe("Kansas MD: 47 days to renewal");
    expect(message.text).toContain("doesn't yet calculate CME progress for this license");
    expect(message.subject + message.text + message.html).not.toMatch(/\d+\.\d hours|hours still open|logged this cycle/);
  });

  test("scheduling runs behind the response and never throws", async () => {
    scheduleSignupDayEmail("user");
    expect(queued).toHaveLength(1); expect(mail.send).not.toHaveBeenCalled();
    mail.send.mockRejectedValueOnce(new Error("transport down"));
    await expect(queued[0]()).resolves.toBeUndefined();
    db.user.findUnique.mockRejectedValueOnce(new Error("database down"));
    await expect(queued[0]()).resolves.toBeUndefined();
  });
});
