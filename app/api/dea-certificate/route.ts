import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";
import { reserveExtractionAttempt, finishExtractionAttempt } from "@/lib/entitlements";
import { limitCertificateUpload } from "@/lib/upload-rate-limit";
import { MAX_MULTIPART_BYTES } from "@/lib/upload-limits";
import { mateActDeadline } from "@/lib/mate-act";
import { saveFederalAttestation } from "@/lib/federal-training";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";

// Extend Vercel function timeout for AI processing
export const maxDuration = 60;

const DEA_EXTRACTION_PROMPT = `You are extracting data from a DEA (Drug Enforcement Administration) registration certificate. Return ONLY valid JSON:
{
  "deaNumber": "DEA registration number (e.g. BR1234567)",
  "registrantName": "full name on certificate",
  "registrationDate": "YYYY-MM-DD issue/registration date",
  "expirationDate": "YYYY-MM-DD expiration date",
  "schedules": ["list of controlled substance schedules authorized"]
}
If a field cannot be determined, use null. Do not include any text outside the JSON.`;

interface DeaCertData {
  deaNumber: string | null;
  registrantName: string | null;
  registrationDate: string | null;
  expirationDate: string | null;
  schedules: string[];
}

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(value);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value;
}, "Invalid date");
const completedDate = dateString.refine((value) => new Date(value) <= new Date(), "Completion cannot be in the future");
const patchSchema = z.object({
  licenseId: z.string().min(1).optional(), deaNumber: z.string().max(30).nullable().optional(),
  deaRegisteredAt: completedDate.nullable().optional(), deaExpiresAt: dateString.nullable().optional(),
  deaFirstQualifyingAt: dateString.refine((value) => mateActDeadline({ firstQualifyingAt: value }).status === "KNOWN", "Date must be on or after the cutoff").nullable().optional(),
  mateActCompleted: z.boolean().optional(), hasDeaRegistration: z.boolean().nullable().optional(),
  trainingRecord: z.object({ completed: z.boolean(), basis: z.enum(["EIGHT_HOUR_TRAINING", "BOARD_CERT_ADDICTION", "GRADUATED_AFTER_2023", "OTHER"]),
    completedAt: completedDate.nullable().optional(), evidenceCertificateId: z.string().min(1).nullable().optional(), notes: z.string().max(2000).nullable().optional() }).optional(),
});

async function userFor(req: NextRequest) {
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  return mobileUserId ?? session?.user?.id;
}

// DEA registration documents are scanned but never stored as training evidence.
export async function POST(req: NextRequest) {
  const userId = await userFor(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = limitCertificateUpload(userId);
  if (limited) return limited;
  let reservationId: string | null = null;
  try {
    const form = await req.formData();
    const file = form.get("file");
    const licenseId = form.get("licenseId");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!["application/pdf", "image/jpeg", "image/png", "image/jpg"].includes(file.type)) return NextResponse.json({ error: "Invalid file type. Accepts PDF, JPG, PNG." }, { status: 400 });
    if (file.size > MAX_MULTIPART_BYTES) return NextResponse.json({ error: "File too large. Maximum 4 MB." }, { status: 413 });
    const license = typeof licenseId === "string" ? await prisma.physicianLicense.findFirst({ where: { id: licenseId, userId } }) : null;
    if (licenseId && !license) return NextResponse.json({ error: "License not found" }, { status: 404 });
    const reservation = await reserveExtractionAttempt(userId);
    if (reservation instanceof Response) return reservation;
    reservationId = reservation.id;
    const result = await extractDeaCertWithClaude(file);
    if (!result.success || !result.data) return NextResponse.json({ error: "Failed to extract DEA certificate data", details: result.error }, { status: 422 });
    const extracted = result.data;
    const valid = z.object({ deaNumber: z.string().min(1).max(30), registrationDate: completedDate, expirationDate: dateString }).safeParse(extracted).success;
    await finishExtractionAttempt(userId, reservationId, valid);
    reservationId = null;
    if (license && valid) await prisma.physicianLicense.update({ where: { id: license.id }, data: {
      deaNumber: extracted.deaNumber, deaExpiresAt: extracted.expirationDate ? new Date(extracted.expirationDate) : undefined,
      // An issue date on a renewal certificate is not proof of first registration.
    } });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { deaFirstQualifyingAt: true } });
    const deadline = mateActDeadline({ firstQualifyingAt: user?.deaFirstQualifyingAt });
    return NextResponse.json({ extracted, needsReview: !valid, mateActRequired: true, mateActDeadline: deadline });
  } catch (error) {
    console.error("DEA certificate extraction error:", error);
    return NextResponse.json({ error: "Failed to process DEA certificate" }, { status: 500 });
  } finally { if (reservationId) await finishExtractionAttempt(userId, reservationId, false); }
}

// Both native legacy attestations and the profile form write one federal row.
export async function PATCH(req: NextRequest) {
  const userId = await userFor(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid DEA or training data" }, { status: 400 });
  const body = parsed.data;
  const license = body.licenseId ? await prisma.physicianLicense.findFirst({ where: { id: body.licenseId, userId } }) : null;
  if (body.licenseId && !license) return NextResponse.json({ error: "License not found" }, { status: 404 });
  if (!license && !body.trainingRecord && body.hasDeaRegistration === undefined) return NextResponse.json({ error: "Missing license or training record" }, { status: 400 });
  if (body.trainingRecord?.evidenceCertificateId && !await prisma.certificate.findFirst({ where: { id: body.trainingRecord.evidenceCertificateId, userId } })) return NextResponse.json({ error: "Evidence certificate not found" }, { status: 404 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { deaFirstQualifyingAt: true } });
  const deadline = mateActDeadline({ firstQualifyingAt: body.deaFirstQualifyingAt === undefined ? user?.deaFirstQualifyingAt : body.deaFirstQualifyingAt });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = license ? await tx.physicianLicense.update({ where: { id: license.id }, data: {
        deaNumber: body.deaNumber,
        deaRegisteredAt: body.deaRegisteredAt === undefined ? undefined : body.deaRegisteredAt ? new Date(body.deaRegisteredAt) : null,
        deaExpiresAt: body.deaExpiresAt === undefined ? undefined : body.deaExpiresAt ? new Date(body.deaExpiresAt) : null,
        mateActRequired: true,
      } }) : null;
      if (body.hasDeaRegistration !== undefined || body.deaFirstQualifyingAt !== undefined) await tx.user.update({ where: { id: userId }, data: { hasDeaRegistration: body.hasDeaRegistration, deaFirstQualifyingAt: body.deaFirstQualifyingAt === undefined ? undefined : body.deaFirstQualifyingAt ? new Date(body.deaFirstQualifyingAt) : null } });
      const training = body.trainingRecord ?? (body.mateActCompleted === undefined ? null : { completed: body.mateActCompleted });
      const record = training ? await saveFederalAttestation(tx, userId, { ...training,
        completedAt: "completedAt" in training ? training.completedAt ? new Date(training.completedAt) : null : undefined,
      }) : await tx.federalTrainingRecord.findUnique({ where: { userId } });
      return { license: updated, federalTrainingRecord: record, mateActDeadline: deadline };
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("DEA PATCH error:", error);
    return NextResponse.json({ error: "Failed to update DEA data" }, { status: 500 });
  }
}

// ─── AI DEA Certificate Extraction via Claude Vision ──────────────────────────

interface ExtractionResult {
  success: boolean;
  data?: DeaCertData;
  error?: string;
}

async function extractDeaCertWithClaude(file: File): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_CME || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Anthropic API key not configured (ANTHROPIC_CME / ANTHROPIC_API_KEY both unset)");
    return { success: false, error: "Anthropic API key not configured (ANTHROPIC_CME / ANTHROPIC_API_KEY both unset)" };
  }

  try {
    const client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 0 });

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const isPdf = file.type === "application/pdf";

    type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contentBlock: any;

    if (isPdf) {
      contentBlock = {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64Data,
        },
      };
    } else {
      const imageMediaType = file.type as ImageMediaType;
      contentBlock = {
        type: "image",
        source: {
          type: "base64",
          media_type: imageMediaType,
          data: base64Data,
        },
      };
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: DEA_EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const responseText = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    // Strip markdown code fences if present
    const cleaned = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    const parsed = JSON.parse(cleaned) as DeaCertData;

    if (!Array.isArray(parsed.schedules)) {
      parsed.schedules = [];
    }

    return { success: true, data: parsed };
  } catch (error) {
    console.error("Claude DEA extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown extraction error",
    };
  }
}
