import { describe, expect, it } from "vitest";
import type { LicenseSnapshot, SnapshotMandatoryTopic, UserComplianceSnapshot } from "@/lib/compliance-snapshot";
import { renderMonthlyDigestEmail, renderRenewalReminderEmail } from "@/lib/email";

const unsubscribeUrl = "https://clearcme.ai/unsubscribe/test";

function license(overrides: Partial<LicenseSnapshot> = {}): LicenseSnapshot {
  return {
    overall: "UNKNOWN", statusLabel: "Needs your answer", uncertainHours: 0,
    licenseId: "test-license", state: "PA", licenseType: "MD",
    renewalDate: new Date("2026-12-31T00:00:00Z"), daysUntilRenewal: 60,
    totalHoursRequired: 100, hoursEarned: 100, generalGapHours: 0,
    mandatoryTopics: [], completedMandatoryTopics: [], outstandingMandatoryTopics: [],
    unansweredHistoryCount: 1, isCompliant: false, paceHoursPerMonth: null,
    ...overrides,
  };
}

function digest(licenses: LicenseSnapshot[]) {
  const snapshot: UserComplianceSnapshot = {
    userId: "test-user", email: "test@example.invalid", firstName: "Michael", licenses,
    totalGapHours: 0, allCompliant: licenses.every((item) => item.isCompliant),
  };
  return renderMonthlyDigestEmail({ snapshot, unsubscribeUrl });
}

function reminder(item: LicenseSnapshot, firstName = "Michael") {
  return renderRenewalReminderEmail({ firstName, license: item, unsubscribeUrl });
}

function federal(status: SnapshotMandatoryTopic["status"]): SnapshotMandatoryTopic {
  return {
    scope: "FEDERAL", status, topic: "MATE_ACT", label: "MATE Act", needed: 8,
    earned: 0, gap: status === "NOT_MET" ? 8 : 0, isMet: status === "MET",
    isUnknown: status === "UNKNOWN", isNotApplicable: status === "NOT_APPLICABLE",
  };
}

describe("lifecycle email status explanations", () => {
  it("explains an unknown federal record without claiming completion or zero work remaining", () => {
    const item = license({ mandatoryTopics: [federal("UNKNOWN")] });
    for (const email of [reminder(item), digest([item])]) {
      expect(email.html).toContain("Hi Michael,");
      expect(email.html).toContain("before we can confirm your CME progress");
      expect(email.html).toContain("Please confirm your DEA registration details");
      expect(email.html).toContain("/dashboard/profile#federal-training");
      expect(email.html).toContain(unsubscribeUrl);
      expect(email.subject + email.html).not.toMatch(/Needs your answer|you're on track|0 hours of CME to schedule|requirements are complete/);
    }
  });

  it("keeps unsupported rules distinct from missing user information", () => {
    const item = license({ overall: "NOT_COMPUTED", statusLabel: "Rules pending" });
    for (const email of [reminder(item), digest([item])]) {
      expect(email.html).toContain("doesn't yet calculate CME progress for this license");
      expect(email.html).toContain("Review your state board's requirements");
      expect(email.html).not.toContain("We need a little more information");
    }
  });

  it("gives concrete next steps for missing dates, uncertain certificates and unknown state training", () => {
    const topic = { ...federal("UNKNOWN"), scope: undefined, topic: "ETHICS" };
    const item = license({ renewalDate: null, daysUntilRenewal: null, uncertainHours: 2, mandatoryTopics: [topic] });
    for (const email of [reminder(item), digest([item])]) {
      expect(email.html).toContain("add your renewal date");
      expect(email.html).toContain("review the certificates that still need confirmation");
      expect(email.html).toContain("confirm which required training you've already completed");
      expect(email.html).not.toMatch(/due today|renews no renewal date/);
    }
  });

  it.each([
    ["MET", "You've recorded that you've met"],
    ["NOT_APPLICABLE", "doesn't apply to you"],
    ["NOT_MET", "still marked incomplete"],
  ] as const)("preserves the meaning of federal status %s", (status, message) => {
    const item = license({ mandatoryTopics: [federal(status)] });
    for (const email of [reminder(item), digest([item])]) {
      expect(email.html).toContain(message);
      expect(email.html).toContain("once for all your licenses");
    }
  });

  it("keeps completed and incomplete licenses distinct in one digest", () => {
    const complete = license({ state: "WA", overall: "COMPLIANT", isCompliant: true, unansweredHistoryCount: 0 });
    const html = digest([complete, license()]).html;
    expect(html).toContain("Your saved records show that your CME requirements are complete");
    expect(html).toContain("before we can confirm your CME progress");
    expect(html).not.toContain("for all the licenses you're tracking");
  });

  it.each([[1, "in 1 day"], [0, "due today"], [-2, "2 days past the recorded renewal date"]])("describes renewal timing for %s days", (days, expected) => {
    const item = license({ overall: "ACTION_NEEDED", daysUntilRenewal: Number(days), generalGapHours: 12, hoursEarned: 88, paceHoursPerMonth: 6 });
    expect(reminder(item).subject).toContain(String(expected));
    for (const email of [reminder(item), digest([item])]) {
      expect(email.html).toContain(String(expected));
      expect(email.html).toContain("12.0 hours");
      expect(email.html).toContain("88.0 of 100 hours of CME");
    }
  });

  it("uses a natural fallback greeting and safely renders a supplied name", () => {
    expect(reminder(license(), "").html).toContain(">Hi,</p>");
    expect(reminder(license(), "<Michael & Co>").html).toContain("Hi &lt;Michael &amp; Co&gt;,");
  });
});
