import { prismaMock } from "../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { licenseInput, requirement } from "../../helpers/compliance-fixtures";

const schedule = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user" } })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/dashboard", useSearchParams: () => new URLSearchParams(), redirect: vi.fn() }));
vi.mock("@/lib/signup-day-email", () => ({ scheduleSignupDayEmail: schedule }));
import Dashboard from "@/app/dashboard/page";

beforeEach(() => {
  prismaMock.federalTrainingRecord.findUnique.mockResolvedValue({ kind: "MATE_ACT" });
  prismaMock.physicianLicense.findMany.mockResolvedValue([licenseInput().license]);
  prismaMock.certificate.findMany.mockResolvedValue([]);
  prismaMock.userRequirementCompletion.findMany.mockResolvedValue([]);
  prismaMock.emailPreference.findUnique.mockResolvedValue({ renewalReminders: true });
  prismaMock.subscription.findUnique.mockResolvedValue(null);
  prismaMock.user.findUnique.mockResolvedValue({ specialty: null, practiceArea: null });
  prismaMock.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, updatedAt: new Date("2026-01-01"), mandatoryRequirements: [requirement()] });
});

test("arriving from setup (?onboarded=1) queues the signup-day email for that account", async () => {
  await Dashboard({ searchParams: Promise.resolve({ onboarded: "1" }) });
  expect(schedule).toHaveBeenCalledTimes(1);
  expect(schedule).toHaveBeenCalledWith("user");
});

test.each([
  ["a plain dashboard visit", undefined],
  ["an empty query", Promise.resolve({})],
  ["another value", Promise.resolve({ onboarded: "0" })],
  ["a repeated parameter", Promise.resolve({ onboarded: ["1", "1"] })],
])("%s does not queue it", async (_name, searchParams) => {
  await Dashboard(searchParams ? { searchParams } : undefined);
  expect(schedule).not.toHaveBeenCalled();
});

test("an account with certificates but no license does not queue it", async () => {
  prismaMock.physicianLicense.findMany.mockResolvedValue([]);
  prismaMock.certificate.findMany.mockResolvedValue([{ id: "certificate", extractionStatus: "COMPLETED", creditHours: 1, createdAt: new Date("2026-01-01"), activityDate: new Date("2026-01-01"), specialTopics: [], topics: [] }]);
  await Dashboard({ searchParams: Promise.resolve({ onboarded: "1" }) }).catch(() => undefined);
  expect(schedule).not.toHaveBeenCalled();
});
