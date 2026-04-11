import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

// POST /api/dea-certificate — extract DEA cert data via Claude (no file storage)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const licenseId = formData.get("licenseId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Accepts PDF, JPG, PNG." },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum 10MB." },
        { status: 400 }
      );
    }

    // Extract DEA cert data with Claude — file is NOT stored (privacy)
    const extractionResult = await extractDeaCertWithClaude(file);

    if (!extractionResult.success || !extractionResult.data) {
      return NextResponse.json(
        { error: "Failed to extract DEA certificate data", details: extractionResult.error },
        { status: 422 }
      );
    }

    const extracted = extractionResult.data;

    // Compute MATE Act requirement
    const MATE_ACT_DATE = new Date("2023-06-27");
    let mateActRequired: boolean | null = null;
    if (extracted.registrationDate) {
      const regDate = new Date(extracted.registrationDate);
      mateActRequired = !isNaN(regDate.getTime()) ? regDate < MATE_ACT_DATE : null;
    }

    // If licenseId provided, persist DEA fields to the license record
    if (licenseId) {
      // Verify the license belongs to this user
      const license = await prisma.physicianLicense.findFirst({
        where: { id: licenseId, userId: session.user.id },
      });

      if (license) {
        await prisma.physicianLicense.update({
          where: { id: licenseId },
          data: {
            deaNumber: extracted.deaNumber ?? undefined,
            deaRegisteredAt: extracted.registrationDate ? new Date(extracted.registrationDate) : undefined,
            deaExpiresAt: extracted.expirationDate ? new Date(extracted.expirationDate) : undefined,
            mateActRequired: mateActRequired ?? undefined,
          },
        });
      }
    }

    return NextResponse.json({
      extracted,
      mateActRequired,
    });
  } catch (error) {
    console.error("DEA certificate extraction error:", error);
    return NextResponse.json(
      { error: "Failed to process DEA certificate" },
      { status: 500 }
    );
  }
}

// PATCH /api/dea-certificate — save confirmed DEA data + MATE Act attestation
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { licenseId, deaNumber, deaRegisteredAt, deaExpiresAt, mateActCompleted } = body;

    if (!licenseId) {
      return NextResponse.json({ error: "Missing licenseId" }, { status: 400 });
    }

    // Verify ownership
    const license = await prisma.physicianLicense.findFirst({
      where: { id: licenseId, userId: session.user.id },
    });

    if (!license) {
      return NextResponse.json({ error: "License not found" }, { status: 404 });
    }

    const MATE_ACT_DATE = new Date("2023-06-27");
    let mateActRequired: boolean | null = license.mateActRequired ?? null;

    if (deaRegisteredAt) {
      const regDate = new Date(deaRegisteredAt);
      if (!isNaN(regDate.getTime())) {
        mateActRequired = regDate < MATE_ACT_DATE;
      }
    }

    const updated = await prisma.physicianLicense.update({
      where: { id: licenseId },
      data: {
        deaNumber: deaNumber ?? undefined,
        deaRegisteredAt: deaRegisteredAt ? new Date(deaRegisteredAt) : undefined,
        deaExpiresAt: deaExpiresAt ? new Date(deaExpiresAt) : undefined,
        mateActRequired: mateActRequired ?? undefined,
        mateActCompleted: typeof mateActCompleted === "boolean" ? mateActCompleted : undefined,
      },
    });

    return NextResponse.json({ license: updated });
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
  const apiKey = process.env.ANTHROPIC_CME;
  if (!apiKey) {
    console.error("ANTHROPIC_CME not configured");
    return { success: false, error: "ANTHROPIC_CME not configured" };
  }

  try {
    const client = new Anthropic({ apiKey });

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
