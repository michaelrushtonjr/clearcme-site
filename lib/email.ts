import type { LicenseSnapshot, UserComplianceSnapshot } from "@/lib/compliance-snapshot";
import { formatDateUTC } from "@/lib/dates";
import { formatStateName } from "@/lib/state-names";

/**
 * Email sending (Resend REST API — no SDK dependency) + branded templates.
 *
 * Voice: conversational, helpful and specific about the next step.
 * Explain incomplete records without turning internal status labels into prose.
 * Reassure only when the records support it; urgency follows the real deadline.
 * Say "hours of CME", never "credits".
 */

const BRAND_GREEN = "#3F5F33";
const BRAND_GREEN_TINT = "#EDF1EA";
const INK = "#1F2937";
const INK_SOFT = "#6B7280";
const AMBER = "#B45309";
const CRIMSON = "#B91C1C";

export function siteUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "https://clearcme.ai").replace(/\/$/, "");
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  html: string;
  /** Optional plain-text part, sent alongside the HTML. */
  text?: string;
  unsubscribeUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "ClearCME <noreply@clearcme.ai>",
      to: [to],
      subject,
      html,
      ...(text ? { text } : {}),
      ...(unsubscribeUrl
        ? {
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 300)}` };
  }
  return { ok: true };
}

function federalStatusLine(license: LicenseSnapshot): string {
  const federal = license.mandatoryTopics.find((topic) => topic.scope === "FEDERAL");
  if (!federal) return "";
  const message = federal.isMet
    ? "You've recorded that you've met the DEA MATE Act training requirement."
    : federal.isNotApplicable
      ? "You've indicated that the DEA MATE Act training requirement doesn't apply to you."
      : federal.isUnknown
        ? "Please confirm your DEA registration details and whether you've completed the MATE Act training requirement."
        : "Your DEA MATE Act training requirement is still marked incomplete. If you've already met it, update your record.";
  return `<p style="margin:16px 0 0;font-size:13px;color:${INK_SOFT};line-height:1.6;">${message} You only need to update this once for all your licenses. <a href="${siteUrl()}/dashboard/profile#federal-training" style="color:${BRAND_GREEN};">Review your DEA training details</a></p>`;
}

function incompleteStatusMessage(license: LicenseSnapshot): string {
  if (license.overall === "NOT_COMPUTED") {
    return "ClearCME doesn't yet calculate CME progress for this license. Review your state board's requirements to check what you need before renewal.";
  }
  const steps: string[] = [];
  if (!license.renewalDate) steps.push("add your renewal date");
  if (license.uncertainHours > 0) steps.push("review the certificates that still need confirmation");
  if (license.mandatoryTopics.some((topic) => topic.scope !== "FEDERAL" && topic.isUnknown)) {
    steps.push("confirm which required training you've already completed");
  }
  return "We need a little more information before we can confirm your CME progress." +
    (steps.length ? ` Open your dashboard to ${steps.join(" and ")}.` : " Review the details below to see what's missing.");
}

function renewalTiming(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? "" : "s"} past the recorded renewal date`;
  if (days === 0) return "due today";
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

// ── Shared layout ─────────────────────────────────────────────────────────────

function layout({ body, unsubscribeUrl }: { body: string; unsubscribeUrl: string }): string {
  const base = siteUrl();
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#F6F5F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F5F1;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;border:1px solid #E5E3DC;overflow:hidden;">
        <tr>
          <td style="background-color:${BRAND_GREEN};padding:20px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:10px;"><img src="${base}/clearcme-mark-tile.png" width="28" height="28" alt="" style="display:block;border:0;" /></td>
              <td><span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:0.3px;">ClearCME</span></td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #E5E3DC;">
            <p style="margin:0 0 6px;font-size:12px;color:${INK_SOFT};line-height:1.5;">
              Your progress is based on state board requirements and the information you've saved in ClearCME. Keep your original CME certificates for as long as your board requires.
            </p>
            <p style="margin:0;font-size:12px;color:${INK_SOFT};">
              <a href="${base}/dashboard/settings" style="color:${BRAND_GREEN};">Manage email preferences</a>
              &nbsp;·&nbsp;
              <a href="${unsubscribeUrl}" style="color:${INK_SOFT};">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;"><tr><td style="border-radius:999px;background-color:${BRAND_GREEN};">
    <a href="${href}" style="display:inline-block;padding:12px 24px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;">${label}</a>
  </td></tr></table>`;
}

function topicList(items: { label: string; detail?: string }[], color: string): string {
  if (items.length === 0) return "";
  return `<ul style="margin:8px 0 0;padding-left:18px;">${items
    .map(
      (i) =>
        `<li style="margin:4px 0;font-size:14px;color:${INK};line-height:1.5;"><span style="color:${color};font-weight:600;">${i.label}</span>${
          i.detail ? ` <span style="color:${INK_SOFT};">— ${i.detail}</span>` : ""
        }</li>`
    )
    .join("")}</ul>`;
}

function greeting(firstName: string): string {
  const name = firstName.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
  return `<p style="margin:0 0 16px;font-size:15px;color:${INK};">Hi${name ? ` ${name}` : ""},</p>`;
}

// ── Renewal reminder ──────────────────────────────────────────────────────────

export function renderRenewalReminderEmail({
  firstName,
  license,
  unsubscribeUrl,
}: {
  firstName: string;
  license: LicenseSnapshot;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const base = siteUrl();
  const days = license.daysUntilRenewal;
  const renewalLabel = license.renewalDate ? formatDateUTC(license.renewalDate) : "your renewal date";
  const outstanding = license.outstandingMandatoryTopics;
  const gapHours = Math.max(
    license.generalGapHours,
    outstanding.reduce((s, t) => s + t.gap, 0)
  );

  const urgent = days !== null && days <= 30;
  const accent = urgent ? CRIMSON : days !== null && days <= 60 ? AMBER : BRAND_GREEN;
  const timing = renewalTiming(days);
  const renewalSubject = `${license.state} ${license.licenseType} renewal${timing ? ` ${timing}` : ""}`;

  const subject = license.overall === "UNKNOWN" ? `Check your ${license.state} ${license.licenseType} CME details` : license.overall === "NOT_COMPUTED" ? `Review your ${license.state} ${license.licenseType} CME requirements` : license.isCompliant
    ? `${renewalSubject} — your CME is complete`
    : `${renewalSubject} — review your remaining CME`;

  let statusBlock: string;
  if (license.overall === "UNKNOWN" || license.overall === "NOT_COMPUTED") {
    statusBlock = `<p style="margin:0 0 12px;font-size:15px;color:${INK};line-height:1.6;">${incompleteStatusMessage(license)}</p>`;
  } else if (license.isCompliant) {
    statusBlock = `
      <p style="margin:0 0 8px;font-size:15px;color:${INK};line-height:1.6;">
        Your saved records show that you've completed the CME requirements for your <strong>${license.state} ${license.licenseType}</strong> license. Your recorded renewal date is <strong>${renewalLabel}</strong>${timing ? ` (${timing})` : ""}.
      </p>
      <p style="margin:0;font-size:14px;color:${INK_SOFT};line-height:1.6;">
        You can find your certificates and CME summary in your dashboard whenever you need them.
      </p>`;
  } else {
    statusBlock = `
      <p style="margin:0 0 12px;font-size:15px;color:${INK};line-height:1.6;">
        Your recorded renewal date for <strong>${license.state} ${license.licenseType}</strong> is <strong>${renewalLabel}</strong>${timing ? ` (<span style="color:${accent};font-weight:700;">${timing}</span>)` : ""}. Here's what you still need to complete.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND_GREEN_TINT};border-radius:8px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:${INK};line-height:1.7;">
            You've logged <strong>${license.hoursEarned.toFixed(1)} of ${license.totalHoursRequired.toFixed(0)} hours of CME</strong> this cycle.<br/>
            Still needed: <strong style="color:${accent};">${gapHours.toFixed(1)} hours</strong>
            ${license.paceHoursPerMonth ? `<br/>To finish by renewal: <strong>${license.paceHoursPerMonth} hours/month</strong>` : ""}
          </p>
        </td></tr>
      </table>
      ${
        outstanding.length > 0
          ? `<p style="margin:16px 0 0;font-size:14px;color:${INK};font-weight:600;">Required topics to finish:</p>` +
            topicList(
              outstanding.map((t) => ({
                label: t.label,
                detail: `${t.gap.toFixed(1)} of ${t.needed.toFixed(0)} hours remaining`,
              })),
              accent
            )
          : ""
      }
      ${
        license.unansweredHistoryCount > 0
          ? `<p style="margin:16px 0 0;font-size:13px;color:${INK_SOFT};line-height:1.6;">Please confirm whether you've already completed ${license.unansweredHistoryCount} required training item${license.unansweredHistoryCount === 1 ? "" : "s"} in your dashboard.</p>`
          : ""
      }`;
  }

  const html = layout({
    body: `
      ${greeting(firstName)}
      ${statusBlock}
      ${federalStatusLine(license)}
      ${ctaButton(`${base}/dashboard/compliance`, "Review your CME progress")}
    `,
    unsubscribeUrl,
  });

  return { subject, html };
}

// ── Signup-day status ─────────────────────────────────────────────────────────
// Sent once, when a new account finishes setup (lib/signup-day-email.ts; off
// unless SIGNUP_DAY_EMAIL_ENABLED is "true"). Numbers first: days left, hours
// still open, each open mandated topic. It states only what the account can
// compute: a license ClearCME does not calculate gets its renewal date and no
// hour counts, and requirements waiting on an answer are counted, not guessed.

function daysLeftPhrase(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return `renewal date passed ${Math.abs(days)} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "renews today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

function signupDayFacts(license: LicenseSnapshot) {
  const name = `${formatStateName(license.state)} ${license.licenseType}`;
  const computed = license.overall !== "NOT_COMPUTED";
  const days = license.daysUntilRenewal;
  const stateTopics = computed ? license.outstandingMandatoryTopics : [];
  const openItems = stateTopics.map((topic) => ({
    label: topic.label,
    detail:
      topic.needed <= 0
        ? ""
        : topic.gap >= topic.needed
          ? `${topic.gap.toFixed(1)} hours`
          : `${topic.gap.toFixed(1)} of ${topic.needed.toFixed(0)} hours remaining`,
  }));
  const openHours = computed
    ? Math.max(license.generalGapHours, stateTopics.reduce((sum, topic) => sum + topic.gap, 0))
    : 0;
  return {
    name,
    computed,
    days,
    openItems,
    openHours,
    complete: computed && license.isCompliant,
    renewalLabel: license.renewalDate ? formatDateUTC(license.renewalDate) : null,
    // State requirements only; the federal DEA record is one answer for every license.
    needsAnswer: computed ? license.mandatoryTopics.filter((topic) => topic.scope !== "FEDERAL" && topic.isUnknown).length : 0,
    uncertainHours: computed ? license.uncertainHours : 0,
  };
}

function needsAnswerLine(count: number): string {
  return `${count} requirement${count === 1 ? " depends" : "s depend"} on details we don't have yet. Answer the open question${count === 1 ? "" : "s"} on your dashboard and ${count === 1 ? "it" : "they"} will be counted.`;
}

/** The DEA MATE Act record is federal and held once per account, so it is stated once, not per license. */
function signupDayFederal(licenses: LicenseSnapshot[]): { state: "open"; hours: number } | { state: "unknown" } | null {
  const federal = licenses.flatMap((license) => license.mandatoryTopics).find((topic) => topic.scope === "FEDERAL");
  if (!federal || federal.isMet || federal.isNotApplicable) return null;
  return federal.isUnknown ? { state: "unknown" } : { state: "open", hours: federal.gap };
}

function signupDaySubject(licenses: LicenseSnapshot[]): string {
  const facts = signupDayFacts(licenses[0]);
  const federal = signupDayFederal(licenses);
  const questions = facts.needsAnswer + (federal?.state === "unknown" ? 1 : 0);
  const timing =
    facts.days === null
      ? ""
      : facts.days > 0
        ? `${facts.days} day${facts.days === 1 ? "" : "s"} to renewal`
        : daysLeftPhrase(facts.days);
  const status = facts.complete
    ? "CME complete"
    : facts.openHours > 0
      ? `${facts.openHours.toFixed(1)} hours of CME still open`
      : facts.openItems.length > 0
        ? `${facts.openItems.length} item${facts.openItems.length === 1 ? "" : "s"} still open`
        : federal?.state === "open"
          ? "DEA MATE Act training still open"
          : questions > 0
            ? `${questions} question${questions === 1 ? "" : "s"} to answer`
            : "";
  const parts = [timing, status].filter(Boolean).join(", ");
  const more = licenses.length > 1 ? ` (+${licenses.length - 1} more license${licenses.length === 2 ? "" : "s"})` : "";
  return parts ? `${facts.name}: ${parts}${more}` : `Your ${facts.name} license in ClearCME${more}`;
}

export function renderSignupDayEmail({
  firstName,
  licenses,
  unsubscribeUrl,
}: {
  firstName: string;
  /** Soonest renewal first, as getComplianceSnapshot returns them. At least one. */
  licenses: LicenseSnapshot[];
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const base = siteUrl();
  const all = licenses.map((license) => signupDayFacts(license));
  const anyOpen = all.some((facts) => facts.computed && !facts.complete);
  const intro =
    licenses.length === 1
      ? `Here is where your ${all[0].name} license stands today.`
      : `Here is where your ${licenses.length} licenses stand today.`;
  const nextStep = anyOpen
    ? "Next step: add the CME certificates you already have. Each one you add comes off this list."
    : all.every((facts) => facts.complete)
      ? "Nothing is open today. Your certificates and CME summary are on your dashboard."
      : "You can still keep your CME certificates in ClearCME, so they are in one place at renewal.";

  const htmlBlocks: string[] = [];
  const textBlocks: string[] = [];
  licenses.forEach((license, index) => {
    const facts = all[index];
    const accent =
      facts.days !== null && facts.days <= 30 ? CRIMSON : facts.days !== null && facts.days <= 60 ? AMBER : BRAND_GREEN;
    const timing = daysLeftPhrase(facts.days);
    const renewalText = facts.renewalLabel
      ? `Renews ${facts.renewalLabel}${timing ? ` · ${timing}` : ""}`
      : "No renewal date on file yet";
    const renewalHtml = facts.renewalLabel
      ? `Renews <strong>${facts.renewalLabel}</strong>${timing ? ` &middot; <strong style="color:${accent};">${timing}</strong>` : ""}`
      : "No renewal date on file yet";

    const hoursText: string[] = [];
    let hoursHtml = "";
    if (!facts.computed) {
      const message = incompleteStatusMessage(license);
      hoursText.push(message);
      hoursHtml = `<br/>${message}`;
    } else if (facts.complete) {
      const message = "Your saved records show the CME requirements for this license are complete.";
      hoursText.push(message);
      hoursHtml = `<br/>${message}`;
    } else if (license.totalHoursRequired > 0) {
      const logged = `${license.hoursEarned.toFixed(1)} of ${license.totalHoursRequired.toFixed(0)} hours of CME logged this cycle`;
      const open = `${facts.openHours.toFixed(1)} hours still open`;
      hoursText.push(logged, open);
      hoursHtml = `<br/>${logged}<br/><strong style="color:${accent};">${open}</strong>`;
    }

    const extraText: string[] = [];
    let extraHtml = "";
    if (facts.openItems.length > 0) {
      const heading = "Mandated topics still open:";
      extraText.push(heading, ...facts.openItems.map((item) => `- ${item.label}${item.detail ? `: ${item.detail}` : ""}`));
      extraHtml += `<p style="margin:14px 0 0;font-size:14px;color:${INK};font-weight:600;">${heading}</p>${topicList(facts.openItems, accent)}`;
    }
    if (facts.uncertainHours > 0) {
      const message = `${facts.uncertainHours.toFixed(1)} hours are on certificates that still need your review, so they are not counted yet.`;
      extraText.push(message);
      extraHtml += `<p style="margin:12px 0 0;font-size:13px;color:${INK_SOFT};line-height:1.6;">${message}</p>`;
    }
    if (facts.needsAnswer > 0) {
      const message = needsAnswerLine(facts.needsAnswer);
      extraText.push(message);
      extraHtml += `<p style="margin:12px 0 0;font-size:13px;color:${INK_SOFT};line-height:1.6;">${message}</p>`;
    }

    textBlocks.push([facts.name, renewalText, ...hoursText, ...extraText].join("\n"));
    htmlBlocks.push(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND_GREEN_TINT};border-radius:8px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:${INK};line-height:1.7;">
            <strong style="font-size:15px;">${facts.name}</strong><br/>
            ${renewalHtml}${hoursHtml}
          </p>
        </td></tr>
      </table>
      ${extraHtml}
      <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>`);
  });

  const federal = signupDayFederal(licenses);
  if (federal?.state === "open") {
    const heading = "Federal requirement still open:";
    const item = { label: "DEA MATE Act training (one-time)", detail: `${federal.hours.toFixed(1)} hours` };
    textBlocks.push(`${heading}\n- ${item.label}: ${item.detail}`);
    htmlBlocks.push(`<p style="margin:0;font-size:14px;color:${INK};font-weight:600;">${heading}</p>${topicList([item], AMBER)}<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>`);
  } else if (federal?.state === "unknown") {
    const message = "One federal item is waiting on you: confirm your DEA registration details and whether you've completed the MATE Act training. Your dashboard shows where.";
    textBlocks.push(message);
    htmlBlocks.push(`<p style="margin:0 0 20px;font-size:13px;color:${INK_SOFT};line-height:1.6;">${message}</p>`);
  }

  const html = layout({
    body: `
      ${greeting(firstName)}
      <p style="margin:0 0 16px;font-size:15px;color:${INK};line-height:1.6;">${intro}</p>
      ${htmlBlocks.join("")}
      <p style="margin:0;font-size:14px;color:${INK};line-height:1.6;">${nextStep}</p>
      ${ctaButton(`${base}/dashboard`, "Open your dashboard")}
    `,
    unsubscribeUrl,
  });

  const name = firstName.trim();
  const text =
    [
      `Hi${name ? ` ${name}` : ""},`,
      intro,
      ...textBlocks,
      nextStep,
      `Open your dashboard: ${base}/dashboard`,
      "Your progress is based on state board requirements and the information you've saved in ClearCME. Keep your original CME certificates for as long as your board requires.",
      `Manage email preferences: ${base}/dashboard/settings\nUnsubscribe: ${unsubscribeUrl}`,
    ].join("\n\n") + "\n";

  return { subject: signupDaySubject(licenses), html, text };
}

// ── Monthly digest ────────────────────────────────────────────────────────────

export function renderMonthlyDigestEmail({
  snapshot,
  unsubscribeUrl,
}: {
  snapshot: UserComplianceSnapshot;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const base = siteUrl();
  const monthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const subject = `Your ${monthLabel} CME update`;

  const licenseBlocks = snapshot.licenses
    .map((license) => {
      const renewalLabel = license.renewalDate
        ? formatDateUTC(license.renewalDate)
        : "";
      const outstanding = license.outstandingMandatoryTopics;
      const completed = license.completedMandatoryTopics;
      const gapHours = Math.max(
        license.generalGapHours,
        outstanding.reduce((s, t) => s + t.gap, 0)
      );
      const days = license.daysUntilRenewal;
      const accent = days !== null && days <= 60 ? CRIMSON : days !== null && days <= 180 ? AMBER : BRAND_GREEN;

      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E3DC;border-radius:8px;margin:0 0 16px;">
        <tr><td style="padding:16px 20px;border-bottom:1px solid #E5E3DC;background-color:#FAFAF7;">
          <span style="font-size:15px;font-weight:700;color:${INK};">${license.state} — ${license.licenseType}</span>
          <span style="font-size:13px;color:${INK_SOFT};"> · ${renewalLabel ? `Renewal: ${renewalLabel}${days !== null ? ` (${renewalTiming(days)})` : ""}` : "Add your renewal date"}</span>
        </td></tr>
        <tr><td style="padding:16px 20px;">
          ${
            license.overall === "UNKNOWN" || license.overall === "NOT_COMPUTED" ? `<p style="margin:0;font-size:14px;color:${INK};line-height:1.6;">${incompleteStatusMessage(license)}</p>` : license.isCompliant
              ? `<p style="margin:0;font-size:14px;color:${BRAND_GREEN};font-weight:600;">Your saved records show that your CME requirements are complete.</p>`
              : `
          <p style="margin:0 0 10px;font-size:14px;color:${INK};line-height:1.7;">
            ${
              license.paceHoursPerMonth
                ? `Aim for about <strong>${license.paceHoursPerMonth} hours of CME per month</strong> to work through your remaining hours before renewal.`
                : `You still have CME requirements to complete for this license.`
            }<br/>
            You've logged <strong>${license.hoursEarned.toFixed(1)} of ${license.totalHoursRequired.toFixed(0)} hours of CME</strong> this cycle, with <strong style="color:${accent};">${gapHours.toFixed(1)} hours</strong> remaining.
          </p>
          ${
            completed.length > 0
              ? `<p style="margin:12px 0 0;font-size:13px;color:${INK};font-weight:600;">Required topics you've completed:</p>` +
                topicList(completed.map((t) => ({ label: t.label })), BRAND_GREEN)
              : ""
          }
          ${
            outstanding.length > 0
              ? `<p style="margin:12px 0 0;font-size:13px;color:${INK};font-weight:600;">Required topics to finish:</p>` +
                topicList(
                  outstanding.map((t) => ({
                    label: t.label,
                    detail: `${t.gap.toFixed(1)} of ${t.needed.toFixed(0)} hours remaining`,
                  })),
                  accent
                )
              : ""
          }
          ${
            license.unansweredHistoryCount > 0
              ? `<p style="margin:12px 0 0;font-size:12px;color:${INK_SOFT};line-height:1.6;">Please confirm whether you've already completed ${license.unansweredHistoryCount} required training item${license.unansweredHistoryCount === 1 ? "" : "s"} in your dashboard.</p>`
              : ""
          }`
          }
          ${federalStatusLine(license)}
        </td></tr>
      </table>`;
    })
    .join("");

  const html = layout({
    body: `
      ${greeting(snapshot.firstName)}
      <p style="margin:0 0 20px;font-size:15px;color:${INK};line-height:1.6;">
        ${
          snapshot.allCompliant
            ? `Here's your CME update for ${monthLabel}. Based on your saved records, you've completed the CME requirements for all the licenses you're tracking.`
            : `Here's your CME update for ${monthLabel}. Below, you'll find your progress for each license and what to do next.`
        }
      </p>
      ${licenseBlocks}
      ${ctaButton(`${base}/dashboard/compliance`, "Review your CME progress")}
    `,
    unsubscribeUrl,
  });

  return { subject, html };
}

// ── Magic-link sign-in ────────────────────────────────────────────────────────
// Transactional (no unsubscribe footer), so it doesn't use layout() above.
// Palette is the Console 1b token set — forest header, green button, cream
// card — matching the product the link opens into. The two lifecycle
// templates above predate the 1b redesign and keep their palette for now.

const C1B_FOREST = "#22371F";
const C1B_GREEN = "#2E4A2C";
const C1B_CARD = "#FBFAF5";
const C1B_CANVAS = "#EFEBDF";
const C1B_INK = "#101613";
const C1B_MUTED = "#656C60";
const C1B_BORDER = "rgba(16, 22, 19, 0.13)"; // --c1b-border-card
const JAKARTA_STACK =
  "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export function renderMagicLinkEmail({ url }: { url: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const base = siteUrl();
  const subject = "Sign in to ClearCME";
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:${C1B_CANVAS};font-family:${JAKARTA_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C1B_CANVAS};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${C1B_CARD};border-radius:12px;border:1px solid ${C1B_BORDER};overflow:hidden;">
        <tr>
          <td style="background-color:${C1B_FOREST};padding:20px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:10px;"><img src="${base}/clearcme-mark-tile.png" width="28" height="28" alt="" style="display:block;border:0;" /></td>
              <td><span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:0.3px;font-family:${JAKARTA_STACK};">Clear<span style="color:#9FBE93;">CME</span></span></td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:${C1B_INK};">Sign in to ClearCME</h1>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${C1B_INK};">
              Use the button below to sign in. The link expires in 24 hours and can be used once.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;"><tr><td style="border-radius:999px;background-color:${C1B_GREEN};">
              <a href="${url}" style="display:inline-block;padding:12px 24px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;">Sign in to ClearCME</a>
            </td></tr></table>
            <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:${C1B_MUTED};">
              If the button doesn't work, copy and paste this link into your browser:<br />
              <a href="${url}" style="color:${C1B_GREEN};word-break:break-all;">${url}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${C1B_BORDER};">
            <p style="margin:0;font-size:12px;color:${C1B_MUTED};line-height:1.5;">
              If you didn't request this email, you can safely ignore it — no one can sign in without this link.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `Sign in to ClearCME

Use this link to sign in. It expires in 24 hours and can be used once:

${url}

If you didn't request this email, you can safely ignore it.
`;
  return { subject, html, text };
}

/** Sign-in code for the iOS app's "Continue with email" path. */
export function renderSignInCodeEmail({ code }: { code: string }): { subject: string; html: string } {
  const base = siteUrl();
  const subject = `${code} is your ClearCME sign-in code`;
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:${C1B_CANVAS};font-family:${JAKARTA_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C1B_CANVAS};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${C1B_CARD};border-radius:12px;border:1px solid ${C1B_BORDER};overflow:hidden;">
        <tr>
          <td style="background-color:${C1B_FOREST};padding:20px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:10px;"><img src="${base}/clearcme-mark-tile.png" width="28" height="28" alt="" style="display:block;border:0;" /></td>
              <td><span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:0.3px;font-family:${JAKARTA_STACK};">Clear<span style="color:#9FBE93;">CME</span></span></td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:${C1B_INK};">Your sign-in code</h1>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${C1B_INK};">
              Enter this code in the ClearCME app. It expires in 10 minutes and can be used once.
            </p>
            <p style="margin:20px 0 4px;font-size:32px;font-weight:700;letter-spacing:6px;color:${C1B_INK};">${code}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${C1B_BORDER};">
            <p style="margin:0;font-size:12px;color:${C1B_MUTED};line-height:1.5;">
              If you didn't request this code, you can safely ignore this email — no one can sign in without it.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html };
}

// Notification to Michael: use the existing transport and keep user details out
// of the alert. If ALERT_EMAIL is absent, the failed cron still logs/returns 500.
export async function notifyReminderFailures(run: string, failed: number): Promise<void> {
  if (!failed) return;
  console.error(`[${run}] ${failed} delivery failure(s)`);
  if (!process.env.ALERT_EMAIL) return;
  try {
    const result = await sendEmail({ to: process.env.ALERT_EMAIL, subject: `ClearCME notification failure: ${run}`,
      html: `<p>${run}: ${failed} notification(s) failed. Review cron logs and EmailLog for retries and exhausted attempts.</p>` });
    if (!result.ok) console.error("[notifications] Failure alert could not be delivered", result.error);
  } catch { console.error("[notifications] Failure alert transport threw"); }
}
