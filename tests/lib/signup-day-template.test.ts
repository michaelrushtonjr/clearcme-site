import { describe, expect, it } from "vitest";
import type { LicenseSnapshot, SnapshotMandatoryTopic } from "@/lib/compliance-snapshot";
import { renderSignupDayEmail } from "@/lib/email";

const unsubscribeUrl = "https://clearcme.ai/unsubscribe?token=test";

function topic(name: string, needed: number, earned = 0, status: SnapshotMandatoryTopic["status"] = "NOT_MET"): SnapshotMandatoryTopic {
  const label = name.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    topic: name, label, status, needed, earned, gap: status === "NOT_MET" ? Math.max(0, needed - earned) : 0,
    isMet: status === "MET", isUnknown: status === "UNKNOWN", isNotApplicable: status === "NOT_APPLICABLE",
  };
}

function federal(status: SnapshotMandatoryTopic["status"]): SnapshotMandatoryTopic {
  return { ...topic("MATE_ACT", 8, 0, status), scope: "FEDERAL", label: "Mate Act" };
}

function license(topics: SnapshotMandatoryTopic[], overrides: Partial<LicenseSnapshot> = {}): LicenseSnapshot {
  const state = topics.filter((item) => item.scope !== "FEDERAL");
  return {
    overall: "ACTION_NEEDED", statusLabel: "Action needed", uncertainHours: 0,
    licenseId: "license", state: "PA", licenseType: "MD",
    renewalDate: new Date("2026-12-31T00:00:00Z"), daysUntilRenewal: 47,
    totalHoursRequired: 100, hoursEarned: 0, generalGapHours: 100,
    mandatoryTopics: topics,
    completedMandatoryTopics: state.filter((item) => item.isMet),
    outstandingMandatoryTopics: state.filter((item) => !item.isMet && !item.isUnknown && !item.isNotApplicable),
    unansweredHistoryCount: topics.filter((item) => item.isUnknown).length,
    isCompliant: false, paceHoursPerMonth: 64.7,
    ...overrides,
  };
}

function render(licenses: LicenseSnapshot[], firstName = "Michael") {
  return renderSignupDayEmail({ firstName, licenses, unsubscribeUrl });
}

// A sample account, not a statement of Pennsylvania's rules: the numbers are fixture values.
const pennsylvania = () =>
  license([topic("PATIENT_SAFETY", 12), topic("CHILD_ABUSE", 2), topic("OPIOID_PRESCRIBING", 2), federal("NOT_MET")]);

describe("signup-day email", () => {
  it("leads with days left, hours open and each open mandated topic", () => {
    const email = render([pennsylvania()]);
    expect(email.subject).toMatchInlineSnapshot(`"Pennsylvania MD: 47 days to renewal, 100.0 hours of CME still open"`);
    expect(email.text).toMatchInlineSnapshot(`
      "Hi Michael,

      Here is where your Pennsylvania MD license stands today.

      Pennsylvania MD
      Renews December 31, 2026 · 47 days left
      0.0 of 100 hours of CME logged this cycle
      100.0 hours still open
      Mandated topics still open:
      - Patient Safety: 12.0 hours
      - Child Abuse: 2.0 hours
      - Opioid Prescribing: 2.0 hours

      Federal requirement still open:
      - DEA MATE Act training (one-time): 8.0 hours

      Next step: add the CME certificates you already have. Each one you add comes off this list.

      Open your dashboard: https://clearcme.ai/dashboard

      Your progress is based on state board requirements and the information you've saved in ClearCME. Keep your original CME certificates for as long as your board requires.

      Manage email preferences: https://clearcme.ai/dashboard/settings
      Unsubscribe: https://clearcme.ai/unsubscribe?token=test
      "
    `);
    expect(email.html).toContain("<strong>December 31, 2026</strong>");
    expect(email.html).toContain("47 days left");
    expect(email.html).toContain("100.0 hours still open");
    expect(email.html).toContain("Patient Safety");
    expect(email.html).toContain("Federal requirement still open:");
    expect(email.html).toContain("DEA MATE Act training (one-time)");
    expect(email.html).toContain(unsubscribeUrl);
    expect(email.html).toContain("https://clearcme.ai/dashboard/settings");
  });

  it("has one button, to the dashboard, and no plan pitch", () => {
    const { html, text } = render([pennsylvania()]);
    expect(html.match(/border-radius:999px/g)).toHaveLength(1);
    expect(html).toContain('<a href="https://clearcme.ai/dashboard" style="display:inline-block');
    for (const body of [html, text]) {
      expect(body).not.toMatch(/Essential|Pro\b|upgrade|\$\d|credits|verified by|Needs your answer|Rules pending|Action needed/i);
    }
  });

  it("says so when the saved records show every requirement met", () => {
    const email = render([
      license([topic("PATIENT_SAFETY", 12, 12, "MET"), federal("MET")], {
        overall: "COMPLIANT", statusLabel: "Audit-ready", isCompliant: true, hoursEarned: 100, generalGapHours: 0, paceHoursPerMonth: null,
      }),
    ]);
    expect(email.subject).toMatchInlineSnapshot(`"Pennsylvania MD: 47 days to renewal, CME complete"`);
    expect(email.text).toMatchInlineSnapshot(`
      "Hi Michael,

      Here is where your Pennsylvania MD license stands today.

      Pennsylvania MD
      Renews December 31, 2026 · 47 days left
      Your saved records show the CME requirements for this license are complete.

      Nothing is open today. Your certificates and CME summary are on your dashboard.

      Open your dashboard: https://clearcme.ai/dashboard

      Your progress is based on state board requirements and the information you've saved in ClearCME. Keep your original CME certificates for as long as your board requires.

      Manage email preferences: https://clearcme.ai/dashboard/settings
      Unsubscribe: https://clearcme.ai/unsubscribe?token=test
      "
    `);
    expect(email.html).not.toContain("still open");
  });

  it("gives a license ClearCME does not calculate its renewal date and no hour counts", () => {
    const email = render([
      license([federal("UNKNOWN")], {
        overall: "NOT_COMPUTED", statusLabel: "Rules pending", state: "KS",
        // The engine reports zeros here; none of them may appear as progress.
        totalHoursRequired: 0, hoursEarned: 0, generalGapHours: 0, paceHoursPerMonth: null,
      }),
    ]);
    expect(email.subject).toMatchInlineSnapshot(`"Kansas MD: 47 days to renewal, 1 question to answer"`);
    expect(email.text).toMatchInlineSnapshot(`
      "Hi Michael,

      Here is where your Kansas MD license stands today.

      Kansas MD
      Renews December 31, 2026 · 47 days left
      ClearCME doesn't yet calculate CME progress for this license. Review your state board's requirements to check what you need before renewal.

      One federal item is waiting on you: confirm your DEA registration details and whether you've completed the MATE Act training. Your dashboard shows where.

      You can still keep your CME certificates in ClearCME, so they are in one place at renewal.

      Open your dashboard: https://clearcme.ai/dashboard

      Your progress is based on state board requirements and the information you've saved in ClearCME. Keep your original CME certificates for as long as your board requires.

      Manage email preferences: https://clearcme.ai/dashboard/settings
      Unsubscribe: https://clearcme.ai/unsubscribe?token=test
      "
    `);
    for (const body of [email.subject, email.html, email.text]) expect(body).not.toMatch(/\d+\.\d hours|hours still open|logged this cycle|are complete|CME complete/);
  });

  it("counts requirements that wait on an answer instead of guessing them", () => {
    const email = render([license([topic("PATIENT_SAFETY", 12, 4), topic("ORGAN_DONATION", 2, 0, "UNKNOWN"), federal("UNKNOWN")], {
      overall: "UNKNOWN", statusLabel: "Needs your answer", hoursEarned: 4, generalGapHours: 96, uncertainHours: 3,
    })]);
    expect(email.subject).toBe("Pennsylvania MD: 47 days to renewal, 96.0 hours of CME still open");
    expect(email.text).toContain("- Patient Safety: 8.0 of 12 hours remaining");
    expect(email.text).toContain("1 requirement depends on details we don't have yet.");
    expect(email.text).toContain("One federal item is waiting on you: confirm your DEA registration details");
    expect(email.text).toContain("3.0 hours are on certificates that still need your review");
    expect(email.text).not.toMatch(/Organ Donation|Federal requirement still open|8\.0 hours/);
  });

  it("names a question, not hours, when only answers are missing", () => {
    const email = render([license([topic("ORGAN_DONATION", 2, 0, "UNKNOWN"), federal("UNKNOWN")], {
      overall: "UNKNOWN", statusLabel: "Needs your answer", totalHoursRequired: 0, generalGapHours: 0,
    })]);
    expect(email.subject).toBe("Pennsylvania MD: 47 days to renewal, 2 questions to answer");
    expect(email.text).not.toMatch(/hours still open|logged this cycle/);
  });

  it("covers several licenses, soonest renewal first", () => {
    const nevada = license([topic("ETHICS", 2)], { state: "NV", licenseType: "DO", daysUntilRenewal: 412, renewalDate: new Date("2027-12-31T00:00:00Z"), totalHoursRequired: 40, generalGapHours: 40 });
    const email = render([pennsylvania(), nevada]);
    expect(email.subject).toBe("Pennsylvania MD: 47 days to renewal, 100.0 hours of CME still open (+1 more license)");
    expect(email.text).toContain("Here is where your 2 licenses stand today.");
    expect(email.text.indexOf("Pennsylvania MD")).toBeLessThan(email.text.indexOf("Nevada DO"));
    expect(email.text).toContain("Renews December 31, 2027 · 412 days left");
    // The federal record is one answer for the whole account: stated once.
    expect(email.text.match(/DEA MATE Act training/g)).toHaveLength(1);
  });

  it.each([
    [1, "1 day to renewal", "1 day left"],
    [0, "renews today", "renews today"],
    [-3, "renewal date passed 3 days ago", "renewal date passed 3 days ago"],
  ])("describes %s days to renewal", (days, subject, body) => {
    const email = render([license([topic("ETHICS", 2)], { daysUntilRenewal: days })]);
    expect(email.subject).toContain(subject);
    expect(email.text).toContain(body);
  });

  it("escapes a supplied name and falls back to a plain greeting", () => {
    expect(render([pennsylvania()], "<Dr & Co>").html).toContain("Hi &lt;Dr &amp; Co&gt;,");
    expect(render([pennsylvania()], "").text.startsWith("Hi,\n")).toBe(true);
  });
});
