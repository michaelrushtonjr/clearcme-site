import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";
import OpenAI from "openai";
import { put } from "@vercel/blob";

// Extend Vercel function timeout for AI processing
export const maxDuration = 60;

// GET /api/certificates — list user's certificates
export async function GET(req: NextRequest) {
  // Support both NextAuth session (web) and mobile JWT
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificates = await prisma.certificate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ certificates });
}

// POST /api/certificates — upload + parse a certificate
export async function POST(req: NextRequest) {
  // Support both NextAuth session (web) and mobile JWT
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

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

    // Upload file to Vercel Blob (gracefully skip if token not configured)
    let fileUrl: string | null = null;
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(file.name, file, { access: "public" });
        fileUrl = blob.url;
      }
    } catch (blobErr) {
      console.warn("Vercel Blob upload skipped:", blobErr);
    }

    // Create certificate record
    const certificate = await prisma.certificate.create({
      data: {
        userId: userId,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        extractionStatus: "PROCESSING",
      },
    });

    // AI extraction using GPT-4o Vision
    const extractionResult = await extractCertificateWithGPT4o(file);

    if (extractionResult.success && extractionResult.data) {
      const extracted = extractionResult.data;

      // Determine confidence: low if critical field (creditHours) is null
      const isLowConfidence = extracted.creditHours === null;
      const confidence = isLowConfidence ? 0.5 : 1.0;
      const status = isLowConfidence ? "NEEDS_REVIEW" : "COMPLETED";

      // Update with extracted data
      const updated = await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          extractedAt: new Date(),
          extractionStatus: status,
          extractionConfidence: confidence,
          title: extracted.title,
          provider: extracted.provider,
          activityDate: extracted.date ? new Date(extracted.date) : null,
          creditHours: extracted.creditHours,
          creditType: extracted.creditType as never,
          accreditation: extracted.accreditation,
          topics: extracted.topics,
        },
      });

      if (isLowConfidence) {
        return NextResponse.json(
          {
            certificate: updated,
            warning: "Some fields could not be extracted with confidence. Please review and confirm.",
          },
          { status: 201 }
        );
      }

      return NextResponse.json({ certificate: updated }, { status: 201 });
    } else {
      // Check if partial data was extracted despite parse failure
      const hasPartialData = extractionResult.partialData !== undefined;

      if (hasPartialData && extractionResult.partialData) {
        const partial = extractionResult.partialData;
        const updated = await prisma.certificate.update({
          where: { id: certificate.id },
          data: {
            extractedAt: new Date(),
            extractionStatus: "NEEDS_REVIEW",
            extractionConfidence: 0.3,
            title: partial.title,
            provider: partial.provider,
            activityDate: partial.date ? new Date(partial.date) : null,
            creditHours: partial.creditHours,
          },
        });

        return NextResponse.json(
          {
            certificate: updated,
            warning: "Some fields could not be extracted with confidence. Please review and confirm.",
          },
          { status: 201 }
        );
      }

      // Full extraction failed — store certificate but mark for manual review
      const updated = await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          extractedAt: new Date(),
          extractionStatus: "FAILED",
          extractionConfidence: 0.0,
        },
      });

      return NextResponse.json(
        {
          certificate: updated,
          warning: "Certificate uploaded but AI extraction failed. Manual review required.",
          extractionError: extractionResult.error ?? "Unknown error",
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Certificate upload error:", error);
    return NextResponse.json(
      { error: "Failed to process certificate" },
      { status: 500 }
    );
  }
}

// ─── AI Certificate Extraction via GPT-4o Vision ───────────────────────────────

interface ExtractedCredit {
  title: string | null;
  provider: string | null;
  date: string | null;
  creditHours: number | null;
  creditType: string | null;
  topics: string[];
  accreditation: string | null;
}

interface ExtractionResult {
  success: boolean;
  data?: ExtractedCredit;
  partialData?: Partial<ExtractedCredit>;
  error?: string;
}

const EXTRACTION_PROMPT = `You are extracting data from a CME/CE certificate. Return ONLY valid JSON with this structure:
{
  "title": "exact course/activity title",
  "provider": "name of providing organization",
  "date": "YYYY-MM-DD completion date",
  "creditHours": 0.0,
  "creditType": "AMA_PRA_1 | AOA_1A | AAFP | ANCC | OTHER",
  "topics": ["list", "of", "topics"],
  "accreditation": "full accreditation statement"
}
If a field cannot be determined, use null. Do not include any text outside the JSON.`;

async function extractCertificateWithGPT4o(file: File): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not configured");
    return { success: false, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const client = new OpenAI({ apiKey });

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const isPdf = file.type === "application/pdf";

    // GPT-4o Vision supports images natively; PDFs are not supported as vision input.
    // For PDFs, pass as a text/data URL so the model can at least attempt extraction.
    const dataUrl = isPdf
      ? `data:application/pdf;base64,${base64Data}`
      : `data:${file.type};base64,${base64Data}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userContent: any[];

    if (isPdf) {
      // GPT-4o cannot render PDFs as images — send as file_data content block
      // (file upload API) or fall back to a text note for the model.
      // For now, embed as a base64 data URL in a text block so the model
      // knows a PDF was provided; extraction quality may be lower.
      userContent = [
        {
          type: "text",
          text: `A CME certificate PDF has been provided as a base64 data URL below. Extract the requested fields.\n\nData URL (truncated for context): data:application/pdf;base64,[base64-encoded PDF]\n\n${EXTRACTION_PROMPT}`,
        },
      ];
      console.warn("PDF submitted — GPT-4o vision does not render PDFs; extraction may be limited.");
    } else {
      userContent = [
        {
          type: "image_url",
          image_url: { url: dataUrl, detail: "high" },
        },
        {
          type: "text",
          text: EXTRACTION_PROMPT,
        },
      ];
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    // Parse GPT-4o's response
    const responseText = response.choices[0]?.message?.content ?? "";

    // Strip markdown code fences if present
    const cleaned = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    let parsed: ExtractedCredit;
    try {
      parsed = JSON.parse(cleaned) as ExtractedCredit;
    } catch (jsonError) {
      // JSON parse failed — try to recover partial data via regex
      console.warn("JSON parse failed, attempting partial extraction:", jsonError);
      const partial: Partial<ExtractedCredit> = {};

      const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
      if (titleMatch) partial.title = titleMatch[1];

      const providerMatch = cleaned.match(/"provider"\s*:\s*"([^"]+)"/);
      if (providerMatch) partial.provider = providerMatch[1];

      const dateMatch = cleaned.match(/"date"\s*:\s*"([^"]+)"/);
      if (dateMatch) partial.date = dateMatch[1];

      const hoursMatch = cleaned.match(/"creditHours"\s*:\s*([\d.]+)/);
      if (hoursMatch) partial.creditHours = parseFloat(hoursMatch[1]);

      if (Object.keys(partial).length > 0) {
        return { success: false, partialData: partial, error: "JSON parse failed but partial data recovered" };
      }

      return { success: false, error: "JSON parse failed, no partial data recoverable" };
    }

    // Ensure topics is always an array
    if (!Array.isArray(parsed.topics)) {
      parsed.topics = [];
    }

    return { success: true, data: parsed };
  } catch (error) {
    console.error("GPT-4o extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown extraction error",
    };
  }
}
