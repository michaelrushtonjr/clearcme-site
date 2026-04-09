import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

// Extend Vercel function timeout for AI processing
export const maxDuration = 60;

// GET /api/certificates — list user's certificates
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificates = await prisma.certificate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ certificates });
}

// POST /api/certificates — upload + parse a certificate
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
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

    // TODO: Upload file to Vercel Blob / S3
    // const { url } = await put(file.name, file, { access: 'public' });
    const fileUrl: string | null = null; // placeholder

    // Create certificate record
    const certificate = await prisma.certificate.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        extractionStatus: "PROCESSING",
      },
    });

    // AI extraction using Claude vision
    const extractionResult = await extractCertificateWithClaude(file);

    if (extractionResult.success && extractionResult.data) {
      const extracted = extractionResult.data;

      // Update with extracted data
      const updated = await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          extractedAt: new Date(),
          extractionStatus: "COMPLETED",
          title: extracted.title,
          provider: extracted.provider,
          activityDate: extracted.date ? new Date(extracted.date) : null,
          creditHours: extracted.creditHours,
          creditType: extracted.creditType as never,
          accreditation: extracted.accreditation,
          topics: extracted.topics,
        },
      });

      return NextResponse.json({ certificate: updated }, { status: 201 });
    } else {
      // Extraction failed — store certificate but mark for manual review
      const updated = await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          extractedAt: new Date(),
          extractionStatus: "FAILED",
        },
      });

      return NextResponse.json(
        {
          certificate: updated,
          warning: "Certificate uploaded but AI extraction failed. Manual review required.",
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

// ─── AI Certificate Extraction via Claude Vision ───────────────────────────────

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

async function extractCertificateWithClaude(file: File): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_CME;
  if (!apiKey) {
    console.error("Anthropic API key not configured");
    return { success: false, error: "Anthropic API key not configured" };
  }

  try {
    const client = new Anthropic({ apiKey });

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const isPdf = file.type === "application/pdf";

    // Build the content block depending on file type
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
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    const responseText = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    // Strip markdown code fences if present
    const cleaned = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    const parsed = JSON.parse(cleaned) as ExtractedCredit;

    // Ensure topics is always an array
    if (!Array.isArray(parsed.topics)) {
      parsed.topics = [];
    }

    return { success: true, data: parsed };
  } catch (error) {
    console.error("Claude extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown extraction error",
    };
  }
}
