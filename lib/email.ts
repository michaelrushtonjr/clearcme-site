import type { LicenseSnapshot, UserComplianceSnapshot } from "@/lib/compliance-snapshot";
import { formatDateUTC } from "@/lib/dates";

/**
 * Email sending (Resend REST API — no SDK dependency) + branded templates.
 *
 * Voice: ClearCME in-product system voice — clean, informational, specific.
 * Reassurance-first; urgency escalates only when the deadline is real.
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
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  html: string;
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
            <span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:0.3px;">ClearCME</span>
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
              ClearCME tracks CME compliance from state medical board sources. Attestations and tracking guide your plan — keep original CME documentation for your board's retention period.
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
  return `<p style="margin:0 0 16px;font-size:15px;color:${INK};">Hello${firstName ? ` Dr. ${firstName}` : ""},</p>`;
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
  const days = license.daysUntilRenewal ?? 0;
  const renewalLabel = license.renewalDate ? formatDateUTC(license.renewalDate) : "your renewal date";
  const outstanding = license.outstandingMandatoryTopics;
  const gapHours = Math.max(
    license.generalGapHours,
    outstanding.reduce((s, t) => s + t.gap, 0)
  );

  const urgent = days <= 30;
  const accent = urgent ? CRIMSON : days <= 60 ? AMBER : BRAND_GREEN;

  const subject = license.isCompliant
    ? `${license.state} ${license.licenseType} renewal in ${days} days — you're on track`
    : `${license.state} ${license.licenseType} renewal in ${days} days — ${gapHours.toFixed(0)} hours of CME remaining`;

  let statusBlock: string;
  if (license.isCompliant) {
    statusBlock = `
      <p style="margin:0 0 8px;font-size:15px;color:${INK};line-height:1.6;">
        You're on track. Your <strong>${license.state} ${license.licenseType}</strong> license renews on <strong>${renewalLabel}</strong> (${days} days), and your CME requirements are complete.
      </p>
      <p style="margin:0;font-size:14px;color:${INK_SOFT};line-height:1.6;">
        Your records and audit-ready summary are available anytime in your dashboard.
      </p>`;
  } else {
    statusBlock = `
      <p style="margin:0 0 12px;font-size:15px;color:${INK};line-height:1.6;">
        Your <strong>${license.state} ${license.licenseType}</strong> license renews on <strong>${renewalLabel}</strong> — <span style="color:${accent};font-weight:700;">${days} days from now</span>.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND_GREEN_TINT};border-radius:8px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:${INK};line-height:1.7;">
            Hours of CME this cycle: <strong>${license.hoursEarned.toFixed(1)} of ${license.totalHoursRequired.toFixed(0)}</strong><br/>
            Still needed: <strong style="color:${accent};">${gapHours.toFixed(1)} hours</strong>
            ${license.paceHoursPerMonth ? `<br/>To finish by renewal: <strong>${license.paceHoursPerMonth} hours/month</strong>` : ""}
          </p>
        </td></tr>
      </table>
      ${
        outstanding.length > 0
          ? `<p style="margin:16px 0 0;font-size:14px;color:${INK};font-weight:600;">Mandatory topics still open:</p>` +
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
          ? `<p style="margin:16px 0 0;font-size:13px;color:${INK_SOFT};line-height:1.6;">${license.unansweredHistoryCount} one-time or long-cycle requirement${license.unansweredHistoryCount === 1 ? "" : "s"} still need${license.unansweredHistoryCount === 1 ? "s" : ""} your confirmation — answering keeps this plan accurate.</p>`
          : ""
      }`;
  }

  const html = layout({
    body: `
      ${greeting(firstName)}
      ${statusBlock}
      ${ctaButton(`${base}/dashboard/compliance`, license.isCompliant ? "View your compliance map" : "View your plan")}
    `,
    unsubscribeUrl,
  });

  return { subject, html };
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

  const subject = snapshot.allCompliant
    ? `Your ${monthLabel} CME update — all requirements on track`
    : `Your ${monthLabel} CME plan — ${snapshot.totalGapHours.toFixed(0)} hours of CME to schedule`;

  const licenseBlocks = snapshot.licenses
    .map((license) => {
      const renewalLabel = license.renewalDate
        ? formatDateUTC(license.renewalDate)
        : "no renewal date set";
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
          <span style="font-size:13px;color:${INK_SOFT};"> · renews ${renewalLabel}${days !== null ? ` (${days} days)` : ""}</span>
        </td></tr>
        <tr><td style="padding:16px 20px;">
          ${
            license.isCompliant
              ? `<p style="margin:0;font-size:14px;color:${BRAND_GREEN};font-weight:600;">✓ All requirements complete. You're on track.</p>`
              : `
          <p style="margin:0 0 10px;font-size:14px;color:${INK};line-height:1.7;">
            ${
              license.paceHoursPerMonth
                ? `Your goal this cycle: <strong>${license.paceHoursPerMonth} hours of CME per month</strong> finishes everything by renewal without a crunch.`
                : `This license still has requirements open.`
            }<br/>
            You currently have <strong>${license.hoursEarned.toFixed(1)} of ${license.totalHoursRequired.toFixed(0)} hours</strong> this cycle, with <strong style="color:${accent};">${gapHours.toFixed(1)} hours</strong> remaining.
          </p>
          ${
            completed.length > 0
              ? `<p style="margin:12px 0 0;font-size:13px;color:${INK};font-weight:600;">Required CME completed:</p>` +
                topicList(completed.map((t) => ({ label: t.label })), BRAND_GREEN)
              : ""
          }
          ${
            outstanding.length > 0
              ? `<p style="margin:12px 0 0;font-size:13px;color:${INK};font-weight:600;">Required CME to complete before renewal:</p>` +
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
              ? `<p style="margin:12px 0 0;font-size:12px;color:${INK_SOFT};line-height:1.6;">${license.unansweredHistoryCount} requirement${license.unansweredHistoryCount === 1 ? "" : "s"} still need${license.unansweredHistoryCount === 1 ? "s" : ""} a quick yes/no about your history — confirm in your compliance map.</p>`
              : ""
          }`
          }
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
            ? `Your ${monthLabel} compliance check-in: every tracked license is on track. Nothing needs your attention this month.`
            : `Your ${monthLabel} compliance check-in — here's where each license stands and the pace that gets you to renewal without a deadline crunch.`
        }
      </p>
      ${licenseBlocks}
      ${ctaButton(`${base}/dashboard/compliance`, "Open your compliance map")}
    `,
    unsubscribeUrl,
  });

  return { subject, html };
}
