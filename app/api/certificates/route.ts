import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    // Stub: AI extraction (replace with real AI call later)
    const extracted = await stubExtractCertificate(file);

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
  } catch (error) {
    console.error("Certificate upload error:", error);
    return NextResponse.json(
      { error: "Failed to process certificate" },
      { status: 500 }
    );
  }
}

// ─── Stub: AI Certificate Extraction ──────────────────────────────────────────
// Replace this with real AI (OpenAI vision / Claude) when ready.
// Returns structured credit data from a certificate file.

interface ExtractedCredit {
  title: string;
  provider: string;
  date: string;
  creditHours: number;
  creditType: string;
  topics: string[];
  accreditation: string;
}

async function stubExtractCertificate(_file: File): Promise<ExtractedCredit> {
  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 500));

  // Return mock data — real AI extraction replaces this
  return {
    title: "Emergency Medicine Core Content Review",
    provider: "American College of Emergency Physicians (ACEP)",
    date: new Date().toISOString().split("T")[0],
    creditHours: 4.0,
    creditType: "AMA_PRA_1",
    topics: ["emergency medicine", "clinical decision making"],
    accreditation: "AMA PRA Category 1 Credit™",
  };
}
