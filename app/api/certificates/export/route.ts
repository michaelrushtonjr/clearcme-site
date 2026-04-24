import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN_X = 48;
const PAGE_START_Y = 744;
const MAX_LINE_WIDTH = 88;
const LINES_PER_PAGE = 40;

function sanitizePdfText(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(text: string, maxLength = MAX_LINE_WIDTH): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    lines.push(word.slice(0, maxLength));
    current = word.slice(maxLength);
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function formatDate(value: Date | null): string {
  if (!value) return "Unknown";
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildPdfText(lines: string[]): ArrayBuffer {
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += LINES_PER_PAGE) {
    pages.push(lines.slice(index, index + LINES_PER_PAGE));
  }

  const objects: string[] = [""];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length - 1;
  };

  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];

  for (const pageLines of pages) {
    const contentStream = [
      "BT",
      "/F1 11 Tf",
      "14 TL",
      `1 0 0 1 ${PAGE_MARGIN_X} ${PAGE_START_Y} Tm`,
      ...pageLines.map((line, index) =>
        index === 0 ? `(${sanitizePdfText(line)}) Tj` : `T* (${sanitizePdfText(line)}) Tj`
      ),
      "ET",
    ].join("\n");

    const contentId = addObject(
      `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`
    );

    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );

    pageIds.push(pageId);
  }

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects[pagesId] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new TextEncoder().encode(pdf);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export async function GET(req: NextRequest) {
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [certificates, licenses] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId },
      orderBy: [{ activityDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    }),
  ]);

  const totalHours = certificates.reduce((sum, certificate) => sum + (certificate.creditHours ?? 0), 0);
  const generatedAt = new Date();
  const displayName = session?.user?.name ?? "ClearCME User";

  const lines: string[] = [];
  const pushWrapped = (text: string) => {
    for (const line of wrapLine(text)) {
      lines.push(line);
    }
  };

  lines.push("ClearCME Audit Export");
  lines.push(`Generated: ${formatDate(generatedAt)}`);
  lines.push(`User: ${displayName.replace(/[^\x20-\x7E]/g, "?")}`);
  lines.push("");
  lines.push("Summary");
  lines.push(`Certificates on file: ${certificates.length}`);
  lines.push(`Total reported hours: ${totalHours.toFixed(1)}`);
  lines.push(`Active licenses: ${licenses.length}`);
  lines.push("");
  lines.push("License Snapshot");

  if (licenses.length === 0) {
    lines.push("- No active licenses configured.");
  } else {
    for (const license of licenses) {
      pushWrapped(
        `- ${license.state} ${license.licenseType} | Renewal: ${formatDate(license.renewalDate)} | License #: ${license.licenseNumber ?? "Not provided"}`
      );
    }
  }

  lines.push("");
  lines.push("Certificates");

  if (certificates.length === 0) {
    lines.push("- No certificates uploaded yet.");
  } else {
    certificates.forEach((certificate, index) => {
      const detailLine = [
        `${index + 1}.`,
        formatDate(certificate.activityDate),
        `${(certificate.creditHours ?? 0).toFixed(1)} hrs`,
        certificate.provider ?? "Unknown provider",
        certificate.title ?? certificate.fileName,
      ].join(" | ");

      pushWrapped(detailLine);

      if (certificate.specialTopics.length > 0) {
        pushWrapped(`   Topics: ${certificate.specialTopics.join(", ")}`);
      }

      lines.push(
        `   Status: ${certificate.extractionStatus}${certificate.manuallyVerified ? " | Manually verified" : ""}`
      );
    });
  }

  const pdf = buildPdfText(lines);
  const fileName = `ClearCME_Audit_Export_${generatedAt.toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
