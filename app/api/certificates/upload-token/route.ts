import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { getMobileUserId } from "@/lib/mobile-auth";
import { CERTIFICATE_CONTENT_TYPES, MAX_CERTIFICATE_BYTES } from "@/lib/upload-limits";
import { validIncomingPath } from "@/lib/certificate-upload-blob";

export async function POST(req: NextRequest) {
  const mobileUserId = await getMobileUserId(req);
  const session = mobileUserId ? null : await auth();
  const userId = mobileUserId ?? session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json() as HandleUploadBody;
    // No completion webhook is requested; attachment happens in /certificates.
    if (body.type !== "blob.generate-client-token") return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    const result = await handleUpload({ request: req, body, onBeforeGenerateToken: async (pathname) => {
      if (!validIncomingPath(pathname, userId)) throw new Error("Invalid upload pathname");
      // Access mode belongs to the private store and client upload options in
      // the installed SDK; handleUpload does not accept an access option.
      return { maximumSizeInBytes: MAX_CERTIFICATE_BYTES, allowedContentTypes: CERTIFICATE_CONTENT_TYPES,
        addRandomSuffix: false, allowOverwrite: false, validUntil: Date.now() + 5 * 60_000 };
    } });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to authorize upload" }, { status: 400 });
  }
}
