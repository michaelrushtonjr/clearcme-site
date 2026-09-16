import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobile-auth";
import { CertificateFileError, storeCertificateOriginal } from "@/lib/certificate-storage";

// Legacy URL retained; /reattach uses this same implementation.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  try {
    return NextResponse.json({ certificate: await storeCertificateOriginal(id, userId, file) });
  } catch (error) {
    if (error instanceof CertificateFileError) return NextResponse.json({ error: error.message, ...(error.certificateId ? { code: "duplicate_file", certificateId: error.certificateId } : {}) }, { status: error.status });
    console.error("[certificates] Reattachment failed", { certificateId: id });
    return NextResponse.json({ error: "Storing the document failed. Please try again." }, { status: 502 });
  }
}
