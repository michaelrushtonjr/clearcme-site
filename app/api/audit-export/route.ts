import { getFederalTraining } from "@/lib/federal-training";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isComputedComplianceBlocked } from "@/lib/compliance-rule-availability";
import { getEntitlements, upgradeRequiredResponse } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";
import { auditCompliance, licensePractice } from "@/lib/compliance-adapters";
import type { LicenseEvaluation, OverallStatus, RequirementStatus } from "@/lib/compliance-engine";
import JSZip from "jszip";
import { put } from "@vercel/blob";
import { Readable } from "node:stream";
import { auditDownloadToken, auditFileStream, LARGE_AUDIT_BYTES, spoolAuditOriginals } from "@/lib/audit-export-storage";
import { requirementDisplayName } from "@/lib/requirement-display";
import { formatDateUTC } from "@/lib/dates";

export const maxDuration = 300;

// Safely-named folder for a requirement topic
function topicFolder(topic: string): string {
  const MAP: Record<string, string> = {
    OPIOID_PRESCRIBING: "Opioid_Prescribing",
    PAIN_MANAGEMENT: "Pain_Management",
    IMPLICIT_BIAS: "Implicit_Bias",
    END_OF_LIFE_CARE: "End_of_Life_Care",
    DOMESTIC_VIOLENCE: "Domestic_Violence",
    CHILD_ABUSE: "Child_Abuse",
    ELDER_ABUSE: "Elder_Abuse",
    HUMAN_TRAFFICKING: "Human_Trafficking",
    INFECTION_CONTROL: "Infection_Control",
    PATIENT_SAFETY: "Patient_Safety",
    ETHICS: "Ethics",
    CULTURAL_COMPETENCY: "Cultural_Competency",
    SUBSTANCE_USE: "Substance_Use",
    SUICIDE_PREVENTION: "Suicide_Prevention",
    OTHER_MANDATORY: "Other_Mandatory",
    GENERAL_CME: "General_CME",
  };
  return MAP[topic] ?? topic.replace(/[^a-zA-Z0-9]/g, "_");
}




function safeFileName(name: string, ext: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) + ext;
}

function formatDate(d: Date | null): string {
  if (!d) return "Unknown";
  return formatDateUTC(d);
}

// GET /api/audit-export?licenseId=[id]
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const userName = session.user.name ?? null;

  const entitlements = await getEntitlements(userId);
  if (!entitlements.ungated) {
    return upgradeRequiredResponse("export");
  }

  const { searchParams } = new URL(req.url);
  const licenseId = searchParams.get("licenseId");

  const userProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: { specialty: true, practiceArea: true },
  });

  // Fetch licenses
  const licenses = await prisma.physicianLicense.findMany({
    where: { userId, isActive: true, ...(licenseId ? { id: licenseId } : {}) },
    orderBy: { renewalDate: "asc" },
  });

  // Attestations — "I completed this" answers for one-time/long-cycle requirements
  const requirementCompletions = await prisma.userRequirementCompletion.findMany({
    where: { userId },
  });


  // Fetch all certs (COMPLETED + NEEDS_REVIEW)
  const allCerts = await prisma.certificate.findMany({
    where: {
      userId,
      extractionStatus: { in: ["COMPLETED", "NEEDS_REVIEW"] },
    },
    orderBy: { activityDate: "desc" },
  });

  // Name the package for everything in it: a single-license export keeps
  // State_Type; a multi-license export enumerates the states (an NV+MI
  // physician used to get "..._NV_DO_..." from licenses[0] alone).
  const year = new Date().getFullYear().toString();
  const uniqueStates = [...new Set(licenses.map((l) => l.state))];
  let scopeLabel: string;
  if (licenses.length === 1) {
    const lic = licenses[0];
    scopeLabel = `${lic.state}_${(lic.licenseType ?? "LICENSE").replace(/[^a-zA-Z0-9]/g, "_")}`;
  } else if (uniqueStates.length === 0) {
    scopeLabel = "UNKNOWN";
  } else if (uniqueStates.length <= 4) {
    scopeLabel = uniqueStates.join("-");
  } else {
    scopeLabel = "Multi_State";
  }
  const rootFolder = `ClearCME_Audit_${scopeLabel}_${year}`;

  const zip = new JSZip();
  const root = zip.folder(rootFolder)!;
  const byReq = root.folder("by_requirement")!;
  const byYear = root.folder("by_year")!;

  // ── Collect compliance data for summary ─────────────────────────────────────
  interface MandatoryStatus {
    topic: string;
    label: string;
    hoursRequired: number;
    earned: number;
    status: RequirementStatus;
    isMet: boolean;
    /** User attested completion but no certificate on file covers the hours */
    attested: boolean;
  }

  interface LicenseSummary {
    state: string;
    licenseType: string;
    licenseNumber: string | null;
    renewalDate: Date | null;
    totalHoursEarned: number;
    totalHoursNeeded: number;
    gapHours: number;
    overall: OverallStatus;
    evaluation: LicenseEvaluation;
    uncertainHours: number;
    isCompliant: boolean;
    mandatoryStatus: MandatoryStatus[];
    cycleCertIds: string[];
  }

  const federalTraining = await getFederalTraining(userId);
  const licenseSummaries: LicenseSummary[] = [];

  for (const lic of licenses) {
    const computedComplianceBlocked = isComputedComplianceBlocked(lic.state, lic.licenseType);
    const rule = computedComplianceBlocked
      ? null
      : await prisma.complianceRule.findUnique({
          where: { state_licenseType: { state: lic.state, licenseType: lic.licenseType } },
          include: { mandatoryRequirements: { where: { retiredAt: null } } },
        });

    const view = auditCompliance({ federalTraining, license: lic, practice: licensePractice(lic, userProfile), rule, requirements: rule?.mandatoryRequirements ?? [], certificates: allCerts, completions: requirementCompletions, today: new Date() });
    const mandatoryStatus: MandatoryStatus[] = view.mandatoryGaps.map((result) => {
      const req = rule?.mandatoryRequirements.find((r) => r.id === result.requirementId);
      return { topic: result.topic, label: requirementDisplayName(result.topic, req?.description), hoursRequired: result.needed,
        earned: result.earned, status: result.status, isMet: result.isMet,
        attested: result.isMet && result.earned < result.needed };
    });
    licenseSummaries.push({
      state: lic.state, licenseType: lic.licenseType, licenseNumber: lic.licenseNumber, renewalDate: lic.renewalDate,
      totalHoursEarned: view.hoursEarned, totalHoursNeeded: rule?.totalHours ?? 0, gapHours: view.gapHours,
      isCompliant: view.isCompliant, overall: view.overall, evaluation: view.evaluation, uncertainHours: view.uncertainHours,
      mandatoryStatus, cycleCertIds: view.evaluation.countedCertificateIds,
    });
  }

  // ── Fetch cert files and build folders ──────────────────────────────────────

  // For each cert: determine which requirement folder(s) it belongs to
  const certFolderMap = new Map<string, string[]>(); // certId → folder names

  for (const cert of allCerts) {
    const folders: string[] = [];

    if (cert.extractionStatus === "NEEDS_REVIEW") {
      folders.push("Unverified");
    } else if (cert.specialTopics.length > 0) {
      for (const t of cert.specialTopics) {
        folders.push(topicFolder(t));
      }
    } else {
      folders.push("General_CME");
    }

    certFolderMap.set(cert.id, folders);
  }

  const spool = await spoolAuditOriginals(allCerts);
  const certFileCache = spool.files;
  const sources: Readable[] = [];
  const fileStream = (path: string) => {
    const source = auditFileStream(path); sources.push(source); return source;
  };
  try {
  // ── by_requirement folders ───────────────────────────────────────────────────

  for (const cert of allCerts) {
    const folders = certFolderMap.get(cert.id) ?? ["General_CME"];
    for (const folderName of folders) {
      const folder = byReq.folder(folderName)!;
      const fileBuffer = certFileCache.get(cert.id) ?? null;
      const dateStr = cert.activityDate?.toISOString().slice(0, 10) ?? "unknown-date";
      // Strip a trailing extension from the name source — fileName already
      // carries one, which produced "..._scan.pdf.pdf".
      const baseName = safeFileName(
        `${dateStr}_${cert.id}_${(cert.title ?? cert.fileName ?? cert.id).replace(/\.(pdf|jpe?g|png)$/i, "")}`,
        ""
      );

      if (fileBuffer) {
        // Determine extension from mimeType or fileName
        let ext = ".pdf";
        if (cert.mimeType === "image/jpeg") ext = ".jpg";
        else if (cert.mimeType === "image/png") ext = ".png";
        else if (cert.fileName) {
          const m = cert.fileName.match(/\.[a-zA-Z0-9]+$/);
          if (m) ext = m[0];
        }
        folder.file(baseName + ext, fileStream(fileBuffer.path));
      } else {
        const placeholder = [
          `Certificate: ${cert.title ?? "Unknown"}`,
          `Provider: ${cert.provider ?? "Unknown"}`,
          `Credits: ${cert.creditHours ?? "?"} hrs`,
          `Date: ${formatDate(cert.activityDate)}`,
          ``,
          `Original file not stored — re-download from provider.`,
        ].join("\n");
        folder.file(baseName + ".txt", placeholder);
      }
    }
  }

  // ── by_year folders ──────────────────────────────────────────────────────────

  for (const cert of allCerts) {
    const yr = cert.activityDate?.getFullYear().toString() ?? "unknown";
    const folder = byYear.folder(yr)!;
    const fileBuffer = certFileCache.get(cert.id) ?? null;
    const dateStr = cert.activityDate?.toISOString().slice(0, 10) ?? "unknown-date";
    // Strip a trailing extension from the name source — fileName already
    // carries one, which produced "..._scan.pdf.pdf".
    const baseName = safeFileName(
      `${dateStr}_${cert.id}_${(cert.title ?? cert.fileName ?? cert.id).replace(/\.(pdf|jpe?g|png)$/i, "")}`,
      ""
    );

    if (fileBuffer) {
      let ext = ".pdf";
      if (cert.mimeType === "image/jpeg") ext = ".jpg";
      else if (cert.mimeType === "image/png") ext = ".png";
      else if (cert.fileName) {
        const m = cert.fileName.match(/\.[a-zA-Z0-9]+$/);
        if (m) ext = m[0];
      }
      folder.file(baseName + ext, fileStream(fileBuffer.path));
    } else {
      const placeholder = [
        `Certificate: ${cert.title ?? "Unknown"}`,
        `Provider: ${cert.provider ?? "Unknown"}`,
        `Credits: ${cert.creditHours ?? "?"} hrs`,
        `Date: ${formatDate(cert.activityDate)}`,
        ``,
        `Original file not stored — re-download from provider.`,
      ].join("\n");
      folder.file(baseName + ".txt", placeholder);
    }
  }

  // ── Summary_Report.txt ───────────────────────────────────────────────────────

  const generatedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const reportLines: string[] = [
    "ClearCME Audit Package",
    "======================",
    `Generated: ${generatedDate}`,
    ...(userName ? [`Physician: ${userName}`] : []),
  ];

  for (const lic of licenseSummaries) {
    reportLines.push(
      `License:   ${lic.state} ${lic.licenseType}${lic.licenseNumber ? ` #${lic.licenseNumber}` : ""}`
    );
    if (lic.renewalDate) {
      reportLines.push(`Renewal Date: ${formatDate(lic.renewalDate)}`);
    }
  }

  reportLines.push("", "─────────────────────────────");

  for (const lic of licenseSummaries) {
    if (licenseSummaries.length > 1) {
      reportLines.push(``, `[${lic.state} — ${lic.licenseType}]`);
    }

    reportLines.push(
      ``,
      `COMPLIANCE STATUS: ${lic.overall}`,
      ``,
      `HOURS SUMMARY:`,
      `  Required: ${lic.totalHoursNeeded.toFixed(0)} hrs`,
      `  Earned:   ${lic.totalHoursEarned.toFixed(1)} hrs`,
      `  Remaining: ${Math.max(0, lic.gapHours).toFixed(1)} hrs`
    );

    if (lic.mandatoryStatus.length > 0) {
      reportLines.push(``, `MANDATORY TOPICS:`);
      for (const m of lic.mandatoryStatus) {
        const check = m.isMet || m.attested ? "x" : " ";
        const status = m.status;
        reportLines.push(
          `  [${check}] ${m.label} (${m.hoursRequired} hrs required, ${m.earned.toFixed(1)} earned) — ${status}`
        );
      }
    }
  }

  // Documented = the file is actually in this package (certFileCache hit) —
  // stricter than fileUrl, so a blob fetch failure also reads as
  // undocumented and the package never overstates its contents.
  const documentedCerts = allCerts.filter((c) => certFileCache.get(c.id));
  const undocumentedCerts = allCerts.filter((c) => !certFileCache.get(c.id));
  const documentedHours = documentedCerts.reduce((s, c) => s + (c.creditHours ?? 0), 0);
  const undocumentedHours = undocumentedCerts.reduce((s, c) => s + (c.creditHours ?? 0), 0);

  const certLine = (cert: (typeof allCerts)[number], i: number) => {
    const folders = certFolderMap.get(cert.id) ?? ["General_CME"];
    const dateStr = cert.activityDate?.toISOString().slice(0, 10) ?? "unknown";
    return `  ${i + 1}. ${cert.title ?? cert.fileName ?? "Untitled"} | ${cert.provider ?? "Unknown Provider"} | ${dateStr} | ${cert.creditHours?.toFixed(1) ?? "?"} hrs | ${folders.join(", ")}`;
  };

  reportLines.push(``, `─────────────────────────────`, ``, `CERTIFICATES ON FILE: ${allCerts.length}`);

  if (documentedCerts.length > 0) {
    reportLines.push(
      ``,
      `DOCUMENTED — file included in this package: ${documentedCerts.length} (${documentedHours.toFixed(1)} hrs)`
    );
    documentedCerts.forEach((cert, i) => reportLines.push(certLine(cert, i)));
  }

  if (undocumentedCerts.length > 0) {
    reportLines.push(
      ``,
      `UNDOCUMENTED — no stored file; placeholder note included: ${undocumentedCerts.length} (${undocumentedHours.toFixed(1)} hrs)`
    );
    undocumentedCerts.forEach((cert, i) => reportLines.push(certLine(cert, i)));
    reportLines.push(
      ``,
      `Hour totals in this report count documented and undocumented`,
      `certificates alike. Re-upload missing source documents at`,
      `clearcme.ai/dashboard/certificates to complete the package.`
    );
  }

  reportLines.push(
    ``,
    `─────────────────────────────`,
    ``,
    `Note: This package was generated by ClearCME (clearcme.ai).`,
    `Verify all requirements with your state medical board before submission.`
  );

  root.file("Summary_Report.txt", reportLines.join("\n"));

  // ── Compliance_Summary.json ──────────────────────────────────────────────────

  const complianceSummary = {
    generated: new Date().toISOString(),
    physician: userName,
    generatedBy: "ClearCME (clearcme.ai)",
    documentation: {
      certificates: allCerts.length,
      documented: documentedCerts.length,
      undocumented: undocumentedCerts.length,
      documentedHours,
      undocumentedHours,
      note: "Hour totals include undocumented certificates; per-certificate flags below.",
    },
    licenses: licenseSummaries.map((lic) => ({
      state: lic.state,
      licenseType: lic.licenseType,
      licenseNumber: lic.licenseNumber,
      renewalDate: lic.renewalDate?.toISOString() ?? null,
      complianceStatus: lic.overall,
      evaluation: lic.evaluation,
      hoursSummary: {
        required: lic.totalHoursNeeded,
        earned: lic.totalHoursEarned,
        uncertain: lic.uncertainHours,
        remaining: Math.max(0, lic.gapHours),
      },
      mandatoryTopics: lic.mandatoryStatus.map((m) => ({
        topic: m.topic,
        label: m.label,
        hoursRequired: m.hoursRequired,
        hoursEarned: m.earned,
        status: m.status,
      })),
    })),
    certificates: allCerts.map((cert) => ({
      id: cert.id,
      title: cert.title ?? cert.fileName,
      provider: cert.provider,
      activityDate: cert.activityDate?.toISOString() ?? null,
      creditHours: cert.creditHours,
      creditType: cert.creditType,
      status: cert.extractionStatus,
      possibleDuplicateOfId: cert.possibleDuplicateOfId,
      fileStored: !!certFileCache.get(cert.id),
      fileIncluded: !!certFileCache.get(cert.id),
      folders: certFolderMap.get(cert.id) ?? [],
    })),
  };

  root.file("Compliance_Summary.json", JSON.stringify(complianceSummary, null, 2));
  root.file("compliance.json", JSON.stringify(complianceSummary, null, 2));
  root.file("manifest.json", JSON.stringify({ certificates: complianceSummary.certificates.map(({ id, title, fileStored, folders }) => ({ id, title, fileStored, folders })) }, null, 2));
  if (undocumentedCerts.length) root.file("MISSING-ORIGINALS.txt", [
    "Original documents unavailable during this export:",
    ...undocumentedCerts.map((cert) => `${cert.id} | ${cert.title ?? cert.fileName}`),
    "Re-attach the originals in your certificate library and export again.",
  ].join("\n"));

  // ── Generate ZIP ─────────────────────────────────────────────────────────────

  const zipFileName = `${rootFolder}.zip`;
  const estimate = allCerts.reduce((sum, cert) => sum + (certFileCache.get(cert.id)?.size ?? 0) * (1 + (certFolderMap.get(cert.id)?.length ?? 1)), 0);
  const zipStream = zip.generateNodeStream({ streamFiles: true, compression: "DEFLATE" });
  const stream = new Readable().wrap(zipStream);
  stream.once("close", () => {
    (zipStream as Readable).destroy();
    sources.forEach((source) => source.destroy());
    void spool.dispose().catch(() => console.error("[audit-export] Temporary file cleanup failed"));
  });
  if (estimate > LARGE_AUDIT_BYTES) {
    const expiresAt = Date.now() + 15 * 60_000;
    try {
      const blob = await put(`audit-exports/${userId}/${expiresAt}/${zipFileName}`, stream, { access: "private", addRandomSuffix: true, contentType: "application/zip" });
      const token = auditDownloadToken(userId, blob.url, zipFileName, expiresAt);
      return NextResponse.json({ downloadUrl: `/api/audit-export/download?token=${encodeURIComponent(token)}`, expiresAt: new Date(expiresAt).toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
    } finally { stream.destroy(); await spool.dispose(); }
  }
  // Readable.toWeb propagates response cancellation back to the ZIP stream.
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${zipFileName}"`, "Cache-Control": "private, no-store" },
  });
  } catch (error) { sources.forEach((source) => source.destroy()); await spool.dispose(); throw error; }
}
