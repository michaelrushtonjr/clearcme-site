import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobile-auth";
import {
  FREE_EXTRACTION_LIMIT,
  FREE_SCAN_ATTEMPT_LIMIT,
  getEntitlements,
  recordExtractionAttempt,
  recordExtractionUse,
  upgradeRequiredResponse,
} from "@/lib/entitlements";
import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { inflateSync } from "zlib";
import type { CreditType, SpecialTopic } from "@prisma/client";

// Extend Vercel function timeout for AI processing
export const maxDuration = 60;

// Extraction must resolve comfortably inside maxDuration so a slow or wedged
// extraction still returns a FAILED result instead of the function being
// killed mid-flight (which stranded certificates in "Processing" forever).
const EXTRACTION_TIMEOUT_MS = 45_000;

// Real certificate text layers are a few KB. Anything bigger reaching the
// regex parser is binary (scans, encrypted streams) masquerading as text —
// its lazy-dot-star patterns go quadratic on that garbage (measured 150s+ on
// a 400KB encrypted PDF, the 2026-08-10 upload-hang incident).
const MAX_PARSE_TEXT_CHARS = 10_000;

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

  // Manual entry (JSON body): creates a record with user-supplied fields.
  // Deliberately NOT fenced — the upgrade card promises "you can still add
  // CME manually, as much as you like", and manual adds run no extraction,
  // spend no Anthropic call, and consume no trial slot.
  if (req.headers.get("content-type")?.includes("application/json")) {
    return createManualCertificate(req, userId);
  }

  // Fence: 3 lifetime clean extractions, backstopped by 10 total scans.
  // Reject before touching the file so a blocked upload creates no record
  // and spends no Anthropic call.
  const entitlements = await getEntitlements(userId);
  if (!entitlements.ungated) {
    if (entitlements.extractionsUsed >= FREE_EXTRACTION_LIMIT) {
      return upgradeRequiredResponse(
        "extraction",
        { used: entitlements.extractionsUsed, limit: FREE_EXTRACTION_LIMIT },
        "slots"
      );
    }
    if (entitlements.extractionAttempts >= FREE_SCAN_ATTEMPT_LIMIT) {
      return upgradeRequiredResponse(
        "extraction",
        { used: entitlements.extractionAttempts, limit: FREE_SCAN_ATTEMPT_LIMIT },
        "attempts"
      );
    }
  }

  let createdCertificateId: string | null = null;

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

    // Retain the original document in Vercel Blob (gracefully skip if token
    // not configured). The store is private — these are physicians' personal
    // certificates — so reads require the RW token or a signed URL, and
    // `access: "public"` throws on it. Pathname is namespaced per user with a
    // random suffix because put() refuses to overwrite an existing blob and
    // two users will eventually both upload "Certificate.pdf".
    let fileUrl: string | null = null;
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`certificates/${userId}/${file.name}`, file, {
          access: "private",
          addRandomSuffix: true,
        });
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
    createdCertificateId = certificate.id;

    await recordExtractionAttempt(userId);

    // Never strand a row in PROCESSING: crashes and timeouts resolve to a
    // FAILED extraction result, which the branches below persist properly.
    let extractionResult: ExtractionResult;
    try {
      extractionResult = await Promise.race([
        extractCertificate(file),
        new Promise<ExtractionResult>((resolve) =>
          setTimeout(
            () => resolve({ success: false, error: "Extraction timed out" }),
            EXTRACTION_TIMEOUT_MS
          )
        ),
      ]);
    } catch (extractionErr) {
      extractionResult = {
        success: false,
        error:
          extractionErr instanceof Error
            ? extractionErr.message
            : "Extraction failed unexpectedly",
      };
    }

    // Cheap observability: which extractor produced this result. A months-old
    // bug (topics-only partials starving the AI pass) was invisible because
    // nothing recorded the path taken. "none" = timed out or threw.
    console.log(
      `[extraction] cert=${certificate.id} path=${extractionResult.via ?? "none"} ` +
        `success=${extractionResult.success} partial=${Boolean(extractionResult.partialData)}` +
        (extractionResult.error ? ` error="${extractionResult.error.slice(0, 120)}"` : "")
    );

    if (extractionResult.success && extractionResult.data) {
      const extracted = extractionResult.data;

      // Determine confidence: low if critical field (creditHours) is null
      const isLowConfidence = extracted.creditHours === null;
      const confidence = isLowConfidence ? 0.5 : 1.0;
      const status = isLowConfidence ? "NEEDS_REVIEW" : "COMPLETED";

      // Only a clean, full-confidence extraction consumes a trial slot;
      // NEEDS_REVIEW results the user must fix by hand stay free.
      if (!isLowConfidence) {
        await recordExtractionUse(userId);
      }

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

      // Full extraction failed — store certificate but mark for manual review.
      // Persist the error so the UI and support can say why it failed.
      const updated = await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          extractedAt: new Date(),
          extractionStatus: "FAILED",
          extractionConfidence: 0.0,
          extractionError: (extractionResult.error ?? "Unknown error").slice(0, 500),
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
    // Best effort: if the record was already created, park it in FAILED so it
    // surfaces the manual-entry recovery path instead of "Processing" forever.
    if (createdCertificateId) {
      try {
        await prisma.certificate.update({
          where: { id: createdCertificateId },
          data: {
            extractedAt: new Date(),
            extractionStatus: "FAILED",
            extractionConfidence: 0.0,
            extractionError: "Upload processing failed unexpectedly",
          },
        });
      } catch {
        // The 500 below already tells the client this upload failed.
      }
    }
    return NextResponse.json(
      { error: "Failed to process certificate" },
      { status: 500 }
    );
  }
}

// ─── Manual Entry ─────────────────────────────────────────────────────────────

const VALID_CREDIT_TYPES: readonly CreditType[] = [
  "AMA_PRA_1",
  "AMA_PRA_2",
  "AAFP_PRESCRIBED",
  "AAFP_ELECTIVE",
  "AOA_1_A",
  "AOA_1_B",
  "AOA_2_A",
  "AOA_2_B",
  "OTHER",
];

async function createManualCertificate(req: NextRequest, userId: string) {
  let body: {
    title?: unknown;
    provider?: unknown;
    activityDate?: unknown;
    creditHours?: unknown;
    creditType?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 500) : "";
  if (!title) {
    return NextResponse.json({ error: "Course title is required" }, { status: 400 });
  }

  const creditHours = Number(body.creditHours);
  if (!Number.isFinite(creditHours) || creditHours <= 0 || creditHours > 1000) {
    return NextResponse.json(
      { error: "Credit hours must be a number greater than 0" },
      { status: 400 }
    );
  }

  const provider =
    typeof body.provider === "string" && body.provider.trim()
      ? body.provider.trim().slice(0, 500)
      : null;

  let activityDate: Date | null = null;
  if (typeof body.activityDate === "string" && body.activityDate) {
    const parsed = new Date(body.activityDate);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid completion date" }, { status: 400 });
    }
    activityDate = parsed;
  }

  const creditType =
    VALID_CREDIT_TYPES.find((t) => t === body.creditType) ?? null;

  // Same keyword inference the extractor runs, so manual entries still match
  // mandatory-topic requirements (and attestation pre-fill can find them).
  const topics = inferTopicLabels(title);

  const certificate = await prisma.certificate.create({
    data: {
      userId,
      fileName: "Manual entry",
      fileUrl: null,
      fileSize: null,
      mimeType: null,
      title,
      provider,
      activityDate,
      creditHours,
      creditType,
      topics,
      specialTopics: inferSpecialTopics({ title, provider, topics }),
      // COMPLETED + manuallyVerified is the same shape the confirm-edit PATCH
      // writes; compliance math only counts COMPLETED rows.
      manuallyVerified: true,
      extractionStatus: "COMPLETED",
      extractedAt: new Date(),
    },
  });

  return NextResponse.json({ certificate }, { status: 201 });
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
  /** Which extractor produced the result — logged so silent-starvation bugs
   * (deterministic partials suppressing the AI pass) show up in the logs. */
  via?: "deterministic" | "ai" | "merged";
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

// A deterministic partial only counts as "good enough to stop" when it holds a
// critical field: creditHours, or title AND date. Anything weaker — notably a
// topics-only partial, since topics are keyword-inferred rather than extracted —
// must fall through to the AI pass. (Before 2026-08-13 any non-empty partial
// short-circuited, so one topic-keyword hit suppressed the AI extractor and the
// user got an all-null NEEDS_REVIEW row.)
function hasCriticalFields(partial: Partial<ExtractedCredit> | undefined): boolean {
  if (!partial) return false;
  return partial.creditHours != null || Boolean(partial.title && partial.date);
}

function mergeTopics(primary: string[] | undefined, fallback: string[]): string[] {
  return Array.from(new Set([...(primary ?? []), ...fallback]));
}

async function extractCertificate(file: File): Promise<ExtractionResult> {
  const deterministic = await extractCertificateFromTextPdf(file);
  if (deterministic.success || hasCriticalFields(deterministic.partialData)) {
    return { ...deterministic, via: "deterministic" };
  }

  // Deterministic topics are still signal (they feed mandatory-topic matching)
  // — merge them into whatever the AI pass returns instead of discarding them.
  const deterministicTopics = deterministic.partialData?.topics ?? [];
  const via = deterministicTopics.length > 0 ? "merged" : "ai";

  const aiResult = await extractCertificateWithClaude(file);
  if (aiResult.success && aiResult.data) {
    return {
      ...aiResult,
      data: { ...aiResult.data, topics: mergeTopics(aiResult.data.topics, deterministicTopics) },
      via,
    };
  }
  if (aiResult.partialData) {
    return {
      ...aiResult,
      partialData: {
        ...aiResult.partialData,
        topics: mergeTopics(aiResult.partialData.topics, deterministicTopics),
      },
      via,
    };
  }

  // AI produced nothing — fall back to the deterministic partial (e.g. topics
  // only) rather than losing it; better a NEEDS_REVIEW row than a bare FAILED.
  if (deterministic.partialData) {
    return { ...deterministic, error: deterministic.error ?? aiResult.error, via: "deterministic" };
  }

  return deterministic.error
    ? { ...aiResult, error: aiResult.error ?? deterministic.error, via: "ai" }
    : { ...aiResult, via: "ai" };
}

async function extractCertificateWithClaude(file: File): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_CME || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Anthropic API key not configured (ANTHROPIC_CME / ANTHROPIC_API_KEY both unset)");
    return { success: false, error: "Anthropic API key not configured (ANTHROPIC_CME / ANTHROPIC_API_KEY both unset)" };
  }

  try {
    // Keep the API call inside the route's extraction budget — a hung
    // network call must fail here, not outlive the serverless function.
    const client = new Anthropic({ apiKey, timeout: 40_000, maxRetries: 1 });

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
    const text = normalizeWhitespace(extractPdfText(buffer)).slice(
      0,
      MAX_PARSE_TEXT_CHARS
    );
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
  const chunks: string[] = [];
  // Only keep chunks that read as text. Binary decoded as a string (image
  // streams, encrypted content, fonts) is what fed the parser regexes
  // megabytes of garbage and hung uploads past the function timeout.
  const consider = (value: string) => {
    if (isMostlyPrintable(value)) chunks.push(value);
  };

  consider(buffer.toString("utf8"));
  const source = buffer.toString("latin1");
  const streamPattern = /(<<[\s\S]*?>>)\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamPattern.exec(source)) !== null) {
    const dict = match[1];

    // Image and font streams never contain certificate text — skip them
    // before decompressing or scanning hundreds of KB of pixel data.
    if (
      /\/(?:DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode)\b/.test(dict) ||
      /\/Subtype\s*\/(?:Image|FontFile\d?)\b/.test(dict)
    ) {
      continue;
    }

    const stream = Buffer.from(match[2], "latin1");
    let data = stream;

    if (/\/FlateDecode\b/.test(dict)) {
      try {
        data = inflateSync(stream);
      } catch {
        // Keep the raw stream; some PDFs include plain text despite filter metadata.
      }
    }

    consider(data.toString("utf8"));
    consider(extractPdfDrawingText(data.toString("latin1")));
  }

  return chunks.join(" ");
}

// True when a decoded chunk looks like actual text rather than binary noise.
// Samples at most 50KB so the check itself stays O(1)-ish on huge streams.
function isMostlyPrintable(value: string): boolean {
  if (value.length === 0) return false;
  const sample = value.length > 50_000 ? value.slice(0, 50_000) : value;
  let printable = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (
      code === 9 ||
      code === 10 ||
      code === 13 ||
      (code >= 32 && code <= 126) ||
      (code >= 160 && code <= 591)
    ) {
      printable++;
    }
  }
  return printable / sample.length >= 0.85;
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
    matchFirst(text, /activity titled\s+(.+?)\s+and is awarded/i) ??
    matchFirst(text, /(?:course|activity)\s+title\s*:\s*(.+?)(?:\s+(?:provider|date|completion|credit|hours)\s*:|$)/i) ??
    matchFirst(text, /\bcompleted\s+(.+?)\s+for\s+\d+(?:\.\d+)?\s+(?:AMA PRA Category 1\s+)?(?:credits?|hours?)/i) ??
    matchFirst(text, /(?:has|have)\s+(?:successfully\s+)?completed\s+(?:the\s+)?(?:course|activity|program)?\s*(?:titled|entitled)?\s*[":]?\s*(.+?)(?:\s+(?:and\s+)?(?:is|are)\s+(?:awarded|granted)|\s+for\s+\d+(?:\.\d+)?|\s+on\s+[A-Z][a-z]+|\s+completion date|$)/i) ??
    matchFirst(text, /(?:course|activity)\s*:\s*(.+?)(?:\s+(?:provider|date|completion|credit|hours)\s*:|$)/i);
  const provider = /American Society of Addiction Medicine|ASAM/i.test(text)
    ? "American Society of Addiction Medicine"
    : cleanProvider(
        matchFirst(text, /(?:provider|accredited provider|provided by)\s*:\s*(.+?)(?:\s+(?:course|activity|date|completion|credit|hours)\s*:|$)/i) ??
        matchFirst(text, /(.*?)\s+certifies that/i) ??
        matchFirst(text, /(.*?)\s+(?:awards|designates|grants)\s+this/i)
      );
  const creditHours =
    parseNumber(matchFirst(text, /awarded\s+(\d+(?:\.\d+)?)\s+AMA PRA Category 1 Credit/i)) ??
    parseNumber(matchFirst(text, /maximum of\s+(\d+(?:\.\d+)?)\s+AMA PRA Category 1 Credit/i)) ??
    parseNumber(matchFirst(text, /(?:credit hours|credits?|hours awarded|total hours)\s*:\s*(\d+(?:\.\d+)?)/i)) ??
    parseNumber(matchFirst(text, /(?:is|are)\s+(?:awarded|granted)\s+(\d+(?:\.\d+)?)\s+(?:credit|hour)/i)) ??
    parseNumber(matchFirst(text, /(?:for|awards?)\s+(\d+(?:\.\d+)?)\s+(?:AMA PRA Category 1\s+)?(?:credit|hour)/i));
  const date = parseCertificateDate(
    matchFirst(text, /([A-Z][a-z]+\s+\d{1,2},\s+\d{4})\s+Date of Completion/i) ??
      matchFirst(text, /(?:Date of Completion|Completion Date|Completed on|Activity Date|Date)\s*:?\s*([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i) ??
      matchFirst(text, /(?:Date of Completion|Completion Date|Completed on|Activity Date|Date)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ??
      matchFirst(text, /(?:Date of Completion|Completion Date|Completed on|Activity Date|Date)\s*:?\s*(\d{4}-\d{2}-\d{2})/i) ??
      matchFirst(text, /\bon\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i)
  );
  const accreditation = matchFirst(
    text,
    /(In support of improving patient care, .*?to provide continuing education for the healthcare team\.)/i
  ) ?? matchFirst(text, /(jointly accredited .*?healthcare team\.)/i) ??
    matchFirst(text, /((?:ACCME|AOA|AAFP|ANCC|AAPA).*?(?:accredited|credit|designation).*?)(?:\.|$)/i);
  const creditType = inferCreditType(text);
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

function cleanProvider(value: string | null) {
  if (!value) return null;
  return value
    .replace(/^(?:certificate of completion|this certifies that)\s+/i, "")
    .trim() || null;
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

function inferCreditType(text: string) {
  if (/AMA PRA Category 1/i.test(text)) return "AMA_PRA_1";
  if (/AMA PRA Category 2/i.test(text)) return "AMA_PRA_2";
  if (/AAFP Prescribed/i.test(text)) return "AAFP_PRESCRIBED";
  if (/AAFP Elective/i.test(text)) return "AAFP_ELECTIVE";
  if (/AOA Category 1[-\s]?A/i.test(text)) return "AOA_1_A";
  if (/AOA Category 1[-\s]?B/i.test(text)) return "AOA_1_B";
  if (/AOA Category 2[-\s]?A/i.test(text)) return "AOA_2_A";
  if (/AOA Category 2[-\s]?B/i.test(text)) return "AOA_2_B";
  if (/\b(?:ANCC|AAPA|ACPE)\b/i.test(text)) return "OTHER";
  return null;
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
  if (/implicit bias|unconscious bias|health equity/.test(lower)) topics.add("implicit bias");
  if (/end[- ]of[- ]life|palliative care|hospice/.test(lower)) topics.add("end-of-life care");
  if (/domestic violence|intimate partner violence/.test(lower)) topics.add("domestic violence");
  if (/child abuse|child maltreatment|mandated reporting/.test(lower)) topics.add("child abuse");
  if (/elder abuse|older adult abuse/.test(lower)) topics.add("elder abuse");
  if (/human trafficking|trafficking victim/.test(lower)) topics.add("human trafficking");
  if (/infection control|infectious disease prevention|bloodborne pathogen/.test(lower)) topics.add("infection control");
  if (/patient safety|medical error|risk management|root cause analysis/.test(lower)) topics.add("patient safety");
  if (/ethics|professional responsibility|jurisprudence/.test(lower)) topics.add("ethics");
  if (/cultural competency|cultural competence|cultural humility/.test(lower)) topics.add("cultural competency");
  if (/suicide prevention|suicide assessment|suicide treatment/.test(lower)) topics.add("suicide prevention");

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
  if (/implicit bias|unconscious bias|health equity/.test(text)) topics.add("IMPLICIT_BIAS");
  if (/end[- ]of[- ]life|palliative care|hospice/.test(text)) topics.add("END_OF_LIFE_CARE");
  if (/domestic violence|intimate partner violence/.test(text)) topics.add("DOMESTIC_VIOLENCE");
  if (/child abuse|child maltreatment|mandated reporting/.test(text)) topics.add("CHILD_ABUSE");
  if (/elder abuse|older adult abuse/.test(text)) topics.add("ELDER_ABUSE");
  if (/human trafficking|trafficking victim/.test(text)) topics.add("HUMAN_TRAFFICKING");
  if (/infection control|infectious disease prevention|bloodborne pathogen/.test(text)) topics.add("INFECTION_CONTROL");
  if (/patient safety|medical error|risk management|root cause analysis/.test(text)) topics.add("PATIENT_SAFETY");
  if (/ethics|professional responsibility|jurisprudence/.test(text)) topics.add("ETHICS");
  if (/cultural competency|cultural competence|cultural humility/.test(text)) topics.add("CULTURAL_COMPETENCY");
  if (/suicide prevention|suicide assessment|suicide treatment/.test(text)) topics.add("SUICIDE_PREVENTION");

  return Array.from(topics);
}
