import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";

export const maxDuration = 60;

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
    SUBSTANCE_USE: "DEA_MATE_Act",
    SUICIDE_PREVENTION: "Suicide_Prevention",
    OTHER_MANDATORY: "Other_Mandatory",
    GENERAL_CME: "General_CME",
  };
  return MAP[topic] ?? topic.replace(/[^a-zA-Z0-9]/g, "_");
}

function formatTopicLabel(topic: string): string {
  const MAP: Record<string, string> = {
    OPIOID_PRESCRIBING: "Opioid Prescribing",
    PAIN_MANAGEMENT: "Pain Management",
    IMPLICIT_BIAS: "Implicit Bias",
    END_OF_LIFE_CARE: "End-of-Life Care",
    DOMESTIC_VIOLENCE: "Domestic Violence",
    CHILD_ABUSE: "Child Abuse",
    ELDER_ABUSE: "Elder Abuse",
    HUMAN_TRAFFICKING: "Human Trafficking",
    INFECTION_CONTROL: "Infection Control",
    PATIENT_SAFETY: "Patient Safety",
    ETHICS: "Ethics",
    CULTURAL_COMPETENCY: "Cultural Competency",
    SUBSTANCE_USE: "DEA MATE Act / Substance Use",
    SUICIDE_PREVENTION: "Suicide Prevention",
    OTHER_MANDATORY: "Other Mandatory Topic",
    GENERAL_CME: "General CME",
  };
  return (
    MAP[topic] ??
    topic.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

function safeFileName(name: string, ext: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) + ext;
}

function formatDate(d: Date | null): string {
  if (!d) return "Unknown";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// GET /api/audit-export?licenseId=[id]
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const userName = session.user.name ?? "Physician";

  const { searchParams } = new URL(req.url);
  const licenseId = searchParams.get("licenseId");

  // Fetch licenses
  const licenses = await prisma.physicianLicense.findMany({
    where: { userId, isActive: true, ...(licenseId ? { id: licenseId } : {}) },
    orderBy: { renewalDate: "asc" },
  });

  // Fetch all certs (COMPLETED + NEEDS_REVIEW)
  const allCerts = await prisma.certificate.findMany({
    where: {
      userId,
      extractionStatus: { in: ["COMPLETED", "NEEDS_REVIEW"] },
    },
    orderBy: { activityDate: "desc" },
  });

  // Pick the primary license for the ZIP name
  const primaryLicense = licenses[0] ?? null;
  const state = primaryLicense?.state ?? "UNKNOWN";
  const licenseType = primaryLicense?.licenseType ?? "LICENSE";
  const year = new Date().getFullYear().toString();
  const rootFolder = `ClearCME_Audit_${state}_${licenseType.replace(/[^a-zA-Z0-9]/g, "_")}_${year}`;

  const zip = new JSZip();
  const root = zip.folder(rootFolder)!;
  const byReq = root.folder("by_requirement")!;
  const byYear = root.folder("by_year")!;

  // ── Collect compliance data for summary ─────────────────────────────────────
  interface MandatoryStatus {
    topic: string;
    hoursRequired: number;
    earned: number;
    isMet: boolean;
  }

  interface LicenseSummary {
    state: string;
    licenseType: string;
    licenseNumber: string | null;
    renewalDate: Date | null;
    totalHoursEarned: number;
    totalHoursNeeded: number;
    gapHours: number;
    isCompliant: boolean;
    mandatoryStatus: MandatoryStatus[];
    cycleCertIds: string[];
  }

  const licenseSummaries: LicenseSummary[] = [];

  for (const lic of licenses) {
    const rule = await prisma.complianceRule.findUnique({
      where: { state_licenseType: { state: lic.state, licenseType: lic.licenseType } },
      include: { mandatoryRequirements: true },
    });

    if (!rule) {
      licenseSummaries.push({
        state: lic.state,
        licenseType: lic.licenseType,
        licenseNumber: lic.licenseNumber,
        renewalDate: lic.renewalDate,
        totalHoursEarned: 0,
        totalHoursNeeded: 0,
        gapHours: 0,
        isCompliant: false,
        mandatoryStatus: [],
        cycleCertIds: [],
      });
      continue;
    }

    const cycleEnd = lic.renewalDate ?? new Date();
    const cycleStart = new Date(cycleEnd);
    cycleStart.setMonth(cycleStart.getMonth() - rule.renewalCycle);

    const cycleCerts = allCerts.filter((c) => {
      if (!c.activityDate) return false;
      return c.activityDate >= cycleStart && c.activityDate <= cycleEnd;
    });

    const totalHoursEarned = cycleCerts.reduce((s, c) => s + (c.creditHours ?? 0), 0);
    const gapHours = Math.max(0, rule.totalHours - totalHoursEarned);

    const mandatoryStatus: MandatoryStatus[] = rule.mandatoryRequirements.map((req) => {
      const earned = cycleCerts
        .filter((c) => c.specialTopics.includes(req.topic))
        .reduce((s, c) => s + (c.creditHours ?? 0), 0);
      return {
        topic: req.topic,
        hoursRequired: req.hoursRequired,
        earned,
        isMet: earned >= req.hoursRequired,
      };
    });

    const isCompliant = gapHours === 0 && mandatoryStatus.every((m) => m.isMet);

    licenseSummaries.push({
      state: lic.state,
      licenseType: lic.licenseType,
      licenseNumber: lic.licenseNumber,
      renewalDate: lic.renewalDate,
      totalHoursEarned,
      totalHoursNeeded: rule.totalHours,
      gapHours,
      isCompliant,
      mandatoryStatus,
      cycleCertIds: cycleCerts.map((c) => c.id),
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

  // Fetch remote files if available
  const certFileCache = new Map<string, Uint8Array | null>();
  for (const cert of allCerts) {
    if (cert.fileUrl) {
      try {
        const resp = await fetch(cert.fileUrl);
        if (resp.ok) {
          const ab = await resp.arrayBuffer();
          certFileCache.set(cert.id, new Uint8Array(ab));
        } else {
          certFileCache.set(cert.id, null);
        }
      } catch {
        certFileCache.set(cert.id, null);
      }
    } else {
      certFileCache.set(cert.id, null);
    }
  }

  // ── by_requirement folders ───────────────────────────────────────────────────

  for (const cert of allCerts) {
    const folders = certFolderMap.get(cert.id) ?? ["General_CME"];
    for (const folderName of folders) {
      const folder = byReq.folder(folderName)!;
      const fileBuffer = certFileCache.get(cert.id) ?? null;
      const dateStr = cert.activityDate?.toISOString().slice(0, 10) ?? "unknown-date";
      const baseName = safeFileName(
        `${dateStr}_${cert.title ?? cert.fileName ?? cert.id}`,
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
        folder.file(baseName + ext, fileBuffer);
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
    const baseName = safeFileName(
      `${dateStr}_${cert.title ?? cert.fileName ?? cert.id}`,
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
      folder.file(baseName + ext, fileBuffer);
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
    `Physician: ${userName}`,
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
      `COMPLIANCE STATUS: ${lic.isCompliant ? "COMPLIANT ✓" : "INCOMPLETE ✗"}`,
      ``,
      `HOURS SUMMARY:`,
      `  Required: ${lic.totalHoursNeeded.toFixed(0)} hrs`,
      `  Earned:   ${lic.totalHoursEarned.toFixed(1)} hrs`,
      `  Remaining:${Math.max(0, lic.gapHours).toFixed(1)} hrs`
    );

    if (lic.mandatoryStatus.length > 0) {
      reportLines.push(``, `MANDATORY TOPICS:`);
      for (const m of lic.mandatoryStatus) {
        const check = m.isMet ? "✓" : "✗";
        const status = m.isMet ? "met" : "unmet";
        reportLines.push(
          `  [${check}] ${formatTopicLabel(m.topic)} (${m.hoursRequired} hrs required, ${m.earned.toFixed(1)} earned) — ${status}`
        );
      }
    }
  }

  reportLines.push(``, `─────────────────────────────`, ``, `CERTIFICATES ON FILE: ${allCerts.length}`);

  allCerts.forEach((cert, i) => {
    const folders = certFolderMap.get(cert.id) ?? ["General_CME"];
    const dateStr = cert.activityDate?.toISOString().slice(0, 10) ?? "unknown";
    reportLines.push(
      `  ${i + 1}. ${cert.title ?? cert.fileName ?? "Untitled"} | ${cert.provider ?? "Unknown Provider"} | ${dateStr} | ${cert.creditHours?.toFixed(1) ?? "?"} hrs | ${folders.join(", ")}`
    );
  });

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
    licenses: licenseSummaries.map((lic) => ({
      state: lic.state,
      licenseType: lic.licenseType,
      licenseNumber: lic.licenseNumber,
      renewalDate: lic.renewalDate?.toISOString() ?? null,
      complianceStatus: lic.isCompliant ? "COMPLIANT" : "INCOMPLETE",
      hoursSummary: {
        required: lic.totalHoursNeeded,
        earned: lic.totalHoursEarned,
        remaining: Math.max(0, lic.gapHours),
      },
      mandatoryTopics: lic.mandatoryStatus.map((m) => ({
        topic: m.topic,
        label: formatTopicLabel(m.topic),
        hoursRequired: m.hoursRequired,
        hoursEarned: m.earned,
        status: m.isMet ? "MET" : "UNMET",
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
      fileStored: !!cert.fileUrl,
      folders: certFolderMap.get(cert.id) ?? [],
    })),
  };

  root.file("Compliance_Summary.json", JSON.stringify(complianceSummary, null, 2));

  // ── Generate ZIP ─────────────────────────────────────────────────────────────

  const zipBuffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  const zipFileName = `${rootFolder}.zip`;
  return new NextResponse(zipBuffer.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFileName}"`,
      "Content-Length": zipBuffer.length.toString(),
    },
  });
}
