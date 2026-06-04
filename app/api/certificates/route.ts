import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";
import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { inflateSync } from "zlib";
import type { CreditType, SpecialTopic } from "@prisma/client";

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

    const extractionResult = await extractCertificate(file);

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
          creditType: normalizeCreditType(extracted.creditType),
          accreditation: extracted.accreditation,
          topics: extracted.topics,
          specialTopics: inferSpecialTopics(extracted),
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
            creditType: normalizeCreditType(partial.creditType),
            accreditation: partial.accreditation,
            topics: partial.topics ?? [],
            specialTopics: inferSpecialTopics(partial),
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

// ─── Certificate Extraction ───────────────────────────────────────────────────

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

async function extractCertificate(file: File): Promise<ExtractionResult> {
  const deterministic = await extractCertificateFromTextPdf(file);
  if (deterministic.success || deterministic.partialData) {
    return deterministic;
  }

  const aiResult = await extractCertificateWithClaude(file);
  if (aiResult.success || aiResult.partialData) {
    return aiResult;
  }

  return deterministic.error ? { ...aiResult, error: aiResult.error ?? deterministic.error } : aiResult;
}

async function extractCertificateWithClaude(file: File): Promise<ExtractionResult> {
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
      model: "claude-sonnet-4-6",
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
    console.error("Claude extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown extraction error",
    };
  }
}

async function extractCertificateFromTextPdf(file: File): Promise<ExtractionResult> {
  if (file.type !== "application/pdf") {
    return { success: false, error: "No deterministic extractor for this file type" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = normalizeWhitespace(extractPdfText(buffer));
    if (text.length < 40) {
      return { success: false, error: "No text layer found in PDF" };
    }

    const extracted = parseCertificateText(text);
    const hasCriticalFields = Boolean(extracted.title && extracted.provider && extracted.date && extracted.creditHours !== null);

    if (hasCriticalFields) {
      return { success: true, data: extracted };
    }

    const partialFields = Object.fromEntries(
      Object.entries(extracted).filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined;
      }),
    ) as Partial<ExtractedCredit>;

    if (Object.keys(partialFields).length > 0) {
      return { success: false, partialData: partialFields, error: "Partial deterministic PDF extraction" };
    }

    return { success: false, error: "No certificate fields found in PDF text" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "PDF text extraction failed",
    };
  }
}

function extractPdfText(buffer: Buffer): string {
  const chunks = [buffer.toString("utf8")];
  const source = buffer.toString("latin1");
  const streamPattern = /(<<[\s\S]*?>>)\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamPattern.exec(source)) !== null) {
    const dict = match[1];
    const stream = Buffer.from(match[2], "latin1");
    let data = stream;

    if (/\/FlateDecode\b/.test(dict)) {
      try {
        data = inflateSync(stream);
      } catch {
        // Keep the raw stream; some PDFs include plain text despite filter metadata.
      }
    }

    chunks.push(data.toString("utf8"));
    chunks.push(extractPdfDrawingText(data.toString("latin1")));
  }

  return chunks.join(" ");
}

function extractPdfDrawingText(source: string): string {
  const chunks: string[] = [];
  const literalPattern = /\((?:\\.|[^\\()])*\)/g;
  const hexPattern = /<([0-9A-Fa-f\s]{4,})>/g;
  let match: RegExpExecArray | null;

  while ((match = literalPattern.exec(source)) !== null) {
    chunks.push(decodePdfLiteral(match[0].slice(1, -1)));
  }

  while ((match = hexPattern.exec(source)) !== null) {
    chunks.push(decodePdfHex(match[1]));
  }

  return chunks.join(" ");
}

function decodePdfLiteral(value: string): string {
  return value
    .replace(/\\([\\()])/g, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
}

function decodePdfHex(value: string): string {
  const clean = value.replace(/\s/g, "");
  if (clean.length < 2) return "";
  const bytes = Buffer.from(clean.length % 2 === 0 ? clean : `${clean}0`, "hex");
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const chars: string[] = [];
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      chars.push(String.fromCharCode(bytes.readUInt16BE(i)));
    }
    return chars.join("");
  }
  return bytes.toString("utf8");
}

function normalizeWhitespace(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t\r\n]+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function parseCertificateText(text: string): ExtractedCredit {
  const title =
    matchFirst(text, /CE activity titled\s+(.+?)\s+and is awarded/i) ??
    matchFirst(text, /activity titled\s+(.+?)\s+and is awarded/i);
  const provider = /American Society of Addiction Medicine|ASAM/i.test(text)
    ? "American Society of Addiction Medicine"
    : matchFirst(text, /(.*?)\s+certifies that/i);
  const creditHours = parseNumber(matchFirst(text, /awarded\s+(\d+(?:\.\d+)?)\s+AMA PRA Category 1 Credit/i)) ??
    parseNumber(matchFirst(text, /maximum of\s+(\d+(?:\.\d+)?)\s+AMA PRA Category 1 Credit/i));
  const date = parseCertificateDate(
    matchFirst(text, /([A-Z][a-z]+\s+\d{1,2},\s+\d{4})\s+Date of Completion/i) ??
      matchFirst(text, /Date of Completion\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i)
  );
  const accreditation = matchFirst(
    text,
    /(In support of improving patient care, .*?to provide continuing education for the healthcare team\.)/i
  ) ?? matchFirst(text, /(jointly accredited .*?healthcare team\.)/i);
  const creditType = /AMA PRA Category 1/i.test(text) ? "AMA_PRA_1" : null;
  const topics = inferTopicLabels(`${title ?? ""} ${text}`);

  return {
    title,
    provider,
    date,
    creditHours,
    creditType,
    topics,
    accreditation,
  };
}

function matchFirst(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function parseNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCertificateDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function normalizeCreditType(value?: string | null): CreditType | null {
  if (!value) return null;
  const normalized = value.toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized.includes("AMA_PRA_1")) return "AMA_PRA_1";
  if (normalized.includes("AMA_PRA_2")) return "AMA_PRA_2";
  if (normalized.includes("AAFP") && normalized.includes("PRESCRIBED")) return "AAFP_PRESCRIBED";
  if (normalized === "AAFP") return "AAFP_PRESCRIBED";
  if (normalized.includes("AOA_1A") || normalized.includes("AOA_1_A")) return "AOA_1_A";
  if (normalized.includes("AOA_1B") || normalized.includes("AOA_1_B")) return "AOA_1_B";
  if (normalized.includes("AOA_2A") || normalized.includes("AOA_2_A")) return "AOA_2_A";
  if (normalized.includes("AOA_2B") || normalized.includes("AOA_2_B")) return "AOA_2_B";
  return "OTHER";
}

function inferTopicLabels(text: string) {
  const topics = new Set<string>();
  const lower = text.toLowerCase();

  if (/opioid|buprenorphine|controlled substance|pain management|oud\b|substance use disorder|addiction/.test(lower)) {
    topics.add("opioid prescribing");
  }
  if (/substance use disorder|sud\b|oud\b|buprenorphine|mate act|dea requirement|addiction/.test(lower)) {
    topics.add("substance use");
  }
  if (/pain management|pain assessment|opioid prescribing/.test(lower)) {
    topics.add("pain management");
  }

  return Array.from(topics);
}

function inferSpecialTopics(extracted: Partial<ExtractedCredit>): SpecialTopic[] {
  const text = [
    extracted.title,
    extracted.provider,
    extracted.accreditation,
    ...(extracted.topics ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const topics = new Set<SpecialTopic>();

  if (/opioid|controlled substance|prescribing/.test(text)) topics.add("OPIOID_PRESCRIBING");
  if (/pain management|pain assessment/.test(text)) topics.add("PAIN_MANAGEMENT");
  if (/substance use|sud\b|oud\b|buprenorphine|addiction|mate act|dea requirement/.test(text)) topics.add("SUBSTANCE_USE");

  return Array.from(topics);
}
