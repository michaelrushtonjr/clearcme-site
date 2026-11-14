import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { COURSE_CATALOG } from "@/lib/courses";
import { providerStateClaimFor, providerStateClaims } from "@/lib/course-state-claims";
import { GapCourseFeed, sortCoursesForGap } from "@/components/dashboard/GapCourseFeed";

const claims = (stateAcceptance: string, topic = "PATIENT_SAFETY") => providerStateClaims({ stateAcceptance }, topic);

// Every catalog course that carries a Florida or Pennsylvania line today, with
// the exact text shown. A catalog change that adds or drops a line shows up
// here as a diff — check the provider's page before accepting it.
const EXPECTED = [
  "PATIENT_SAFETY | 2026 Prevention of Medical Errors: To Err is Human | FL | Provider states this course counts for Florida's prevention of medical errors requirement.",
  "PATIENT_SAFETY | ENDURING: Prevention of Medical Errors (Renewal 2026) | FL | Provider states this course counts for Florida's prevention of medical errors requirement.",
  "PATIENT_SAFETY | Medical Errors: Promoting a Culture of Patient Safety | FL | Provider states this course counts for Florida's prevention of medical errors requirement.",
  "DOMESTIC_VIOLENCE | ENDURING: Domestic Violence Prevention (2025-26) | FL | Provider states this course counts for Florida's domestic violence requirement.",
  "DOMESTIC_VIOLENCE | Family Violence Update | FL | Provider states this course counts for Florida's domestic violence requirement.",
  "DOMESTIC_VIOLENCE | Interpersonal Violence: Role of Healthcare | FL | Provider states this course counts for Florida's domestic violence requirement.",
  "DOMESTIC_VIOLENCE | AchieveCE Domestic Violence for Physicians and PAs | FL | Provider markets this course for Florida's domestic violence requirement.",
  "HUMAN_TRAFFICKING | AchieveCE Human Trafficking for Physicians and Physician Assistants | FL | Provider markets this course for Florida's human trafficking requirement.",
  "CHILD_ABUSE | Recognition and Response to Suspected Child Abuse and Neglect: Pennsylvania Act 31 Training for Healthcare Professionals | PA | Provider states this course counts for Pennsylvania's child abuse recognition and reporting requirement (Act 31).",
  "ORGAN_DONATION | Supporting Organ and Tissue Donation in Clinical Settings: The Pennsylvania Requirement | PA | Provider states this course counts for Pennsylvania's organ and tissue donation requirement (Act 90).",
];

test("the catalog courses carrying a Florida or Pennsylvania line are exactly the expected ones", () => {
  const actual = Object.entries(COURSE_CATALOG).flatMap(([key, catalog]) =>
    catalog.courses.flatMap((course) => providerStateClaims(course, key).map((claim) => `${key} | ${course.name} | ${claim.state} | ${claim.text}`)),
  );
  expect(actual).toEqual(EXPECTED);
});

test("the generic all-states clause is never a claim", () => {
  expect(claims("All states accepting AMA PRA Category 1")).toEqual([]);
  expect(claims("All states accepting AMA PRA Category 1; AAFP Prescribed credit accepted by AMA as equivalent")).toEqual([]);
  expect(providerStateClaims({}, "PATIENT_SAFETY")).toEqual([]);
});

test("MD/PA means physician assistant, not Pennsylvania", () => {
  expect(claims("All states accepting AMA PRA Category 1; tagged by Pri-Med as KY Board Approved (MD/PA)")).toEqual([]);
  const florida = claims("Florida — marketed for MD/PA domestic-violence board requirement with CE Broker reporting", "DOMESTIC_VIOLENCE");
  expect(florida.map((claim) => claim.state)).toEqual(["FL"]);
  expect(florida[0].kind).toBe("marketed");
});

test("naming a state without saying a requirement is met is not a claim", () => {
  expect(claims("All states accepting AMA PRA Category 1; patient-safety/risk-management content from Pennsylvania's state medical society")).toEqual([]);
  expect(claims("CE Broker upload available (enter FL license number in profile)")).toEqual([]);
});

test("bare state abbreviations with no board or statute named are not enough", () => {
  expect(claims("All states accepting AMA PRA Category 1; specifically meets FL and PA patient safety requirements")).toEqual([]);
});

test("a negated clause is never a claim", () => {
  expect(claims("Not approved for Pennsylvania's Act 31 requirement", "CHILD_ABUSE")).toEqual([]);
  expect(claims("The page does not state Florida Board of Medicine approval")).toEqual([]);
});

test("only Florida and Pennsylvania are derived, one line per state", () => {
  expect(claims("Texas — explicitly satisfies the Texas Medical Board ethics requirement", "ETHICS")).toEqual([]);
  const both = claims("Florida Board of Medicine approved; satisfies Pennsylvania's patient safety requirement");
  expect(both.map((claim) => claim.text)).toEqual([
    "Provider states this course counts for Florida's prevention of medical errors requirement.",
    "Provider states this course counts for Pennsylvania's patient safety and risk management requirement.",
  ]);
});

test("a topic with no named requirement falls back to neutral wording", () => {
  expect(claims("Florida Board of Medicine approved", "ETHICS")[0].text).toBe("Provider states this course counts for a Florida licensure requirement.");
});

test("every line attributes the statement to the provider", () => {
  for (const line of EXPECTED) expect(line.split(" | ")[3]).toMatch(/^Provider (states|markets) this course /);
});

test("the in-app feed shows the line only for the license's own state, and lists those courses first", () => {
  const html = (state?: string) => renderToStaticMarkup(GapCourseFeed({ topic: "CHILD_ABUSE", hoursNeeded: 2, state })!);
  const line = "Provider states this course counts for Pennsylvania&#x27;s child abuse recognition and reporting requirement (Act 31).";
  expect(html("PA")).toContain(line);
  expect(html("NY")).not.toContain("Provider states");
  expect(html()).not.toContain("Provider states");

  const courses = COURSE_CATALOG.CHILD_ABUSE.courses;
  expect(sortCoursesForGap(courses, "CHILD_ABUSE", "PA")[0].name).toContain("Pennsylvania Act 31 Training");
  expect(providerStateClaimFor(sortCoursesForGap(courses, "CHILD_ABUSE", "NY")[0], "CHILD_ABUSE", "NY")).toBeNull();
  // Without a state the order is unchanged: free first.
  expect(sortCoursesForGap(courses)[0].isFree).toBe(true);
});
