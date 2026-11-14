import { prismaMock } from "../../helpers/prisma-mock";
import { beforeEach, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { licenseInput, requirement } from "../../helpers/compliance-fixtures";
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user" } })) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/dashboard/compliance", useSearchParams: () => new URLSearchParams(), redirect: vi.fn() }));
import Compliance from "@/app/dashboard/compliance/page";
import { GapCourseFeed, sortCoursesForGap } from "@/components/dashboard/GapCourseFeed";
import { COURSE_CATALOG } from "@/lib/courses";

// Decision of 2026-11-13: course matches are not fenced by plan.
const PLAN_WORDING = /Upgrade to|Free includes|\/pricing|top match|current plan|Unlock full/;
const largestTopic = Object.keys(COURSE_CATALOG).sort((a, b) => COURSE_CATALOG[b].courses.length - COURSE_CATALOG[a].courses.length)[0];

function feedHtml(topic: string) {
  const element = GapCourseFeed({ topic, hoursNeeded: 2 });
  return element ? renderToStaticMarkup(element) : "";
}

test("every course in a topic is reachable in the feed, with no plan wording", () => {
  const courses = COURSE_CATALOG[largestTopic].courses;
  expect(courses.length).toBeGreaterThan(10);
  const html = feedHtml(largestTopic);
  expect(html.match(/target="_blank"/g)).toHaveLength(courses.length);
  expect(html).toContain(`Show ${courses.length - 3} more`);
  expect(html).not.toMatch(PLAN_WORDING);
});

test("a topic with three or fewer courses has no disclosure", () => {
  const small = Object.keys(COURSE_CATALOG).find((key) => { const n = COURSE_CATALOG[key].courses.length; return n > 0 && n <= 3; });
  expect(small).toBeDefined();
  const html = feedHtml(small!);
  expect(html).not.toContain("<details");
  expect(html.match(/target="_blank"/g)).toHaveLength(COURSE_CATALOG[small!].courses.length);
});

test("free courses lead the list", () => {
  const sorted = sortCoursesForGap(COURSE_CATALOG[largestTopic].courses);
  const firstPaid = sorted.findIndex((course) => !course.isFree);
  expect(sorted.slice(firstPaid === -1 ? sorted.length : firstPaid).every((course) => !course.isFree)).toBe(true);
});

beforeEach(() => {
  prismaMock.federalTrainingRecord.findUnique.mockResolvedValue({ kind: "MATE_ACT" });
  prismaMock.physicianLicense.findMany.mockResolvedValue([licenseInput().license]);
  prismaMock.certificate.findMany.mockResolvedValue([]);
  prismaMock.userRequirementCompletion.findMany.mockResolvedValue([]);
  prismaMock.user.findUnique.mockResolvedValue({ specialty: null, practiceArea: null });
  prismaMock.complianceRule.findUnique.mockResolvedValue({ ...licenseInput().rule, updatedAt: new Date("2026-01-01"), mandatoryRequirements: [requirement({ topic: "ETHICS", hoursRequired: 2 })] });
});

test("the compliance map shows a free account every course match and never looks up the plan", async () => {
  const html = renderToStaticMarkup(await Compliance());
  expect(html).toContain("Recommended courses");
  expect(html).toContain(`Show ${COURSE_CATALOG.ETHICS.courses.length - 3} more`);
  expect(html).not.toMatch(/Upgrade to Essential|top match shown|Unlock full course choice|one strong course match/);
  expect(prismaMock.subscription.findUnique).not.toHaveBeenCalled();
});
