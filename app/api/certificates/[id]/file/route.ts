import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/certificates/[id]/file — reattach a source document to an
// existing certificate that has none stored (fileUrl null: pre-Aug-11
// uploads from before blob retention worked, and manual entries).
//
// Deliberately narrow: stores the blob and updates the file columns, nothing
// else. No extraction and no slot/attempt counters — the row's data is
// already confirmed and healing must never consume a trial slot. Field
// confirmation stays PATCH's job; rows that already have a file are refused
// rather than overwritten.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.certificate.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.fileUrl) {
    return NextResponse.json(
      { error: "This certificate already has a stored document." },
      { status: 409 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Same allowlist and cap as the upload route.
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepts PDF, JPG, PNG." },
      { status: 400 }
    );
  }
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large. Maximum 10MB." }, { status: 400 });
  }

  // Same-user duplicate bytes: this document is already attached to another
  // certificate — attaching it twice would double-document the same course.
  const fileHash = createHash("sha256")
    .update(Buffer.from(await file.arrayBuffer()))
    .digest("hex");
  const duplicate = await prisma.certificate.findFirst({
    where: { userId: session.user.id, fileHash, id: { not: id } },
    select: { id: true, title: true, fileName: true },
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: `This exact file is already attached to "${
          duplicate.title ?? duplicate.fileName
        }".`,
        code: "duplicate_file",
        certificateId: duplicate.id,
      },
      { status: 409 }
    );
  }

  // Unlike the upload route (where retention is best-effort alongside
  // extraction), storing the file IS this endpoint — fail loudly, never skip.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Document storage is not available right now. Please try again later." },
      { status: 503 }
    );
  }

  let fileUrl: string;
  try {
    const blob = await put(`certificates/${session.user.id}/${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
    });
    fileUrl = blob.url;
  } catch (blobErr) {
    console.error("Certificate re-upload blob store failed:", blobErr);
    return NextResponse.json(
      { error: "Storing the document failed. Please try again." },
      { status: 502 }
    );
  }

  const certificate = await prisma.certificate.update({
    where: { id },
    data: {
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      fileHash,
    },
  });

  return NextResponse.json({ certificate });
}
