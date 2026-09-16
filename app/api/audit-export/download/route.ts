import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { verifyAuditDownload } from "@/lib/audit-export-storage";
import { getEntitlements, upgradeRequiredResponse } from "@/lib/entitlements";

export const maxDuration = 300;
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = verifyAuditDownload(req.nextUrl.searchParams.get("token") ?? "", session.user.id);
  if (!data) return NextResponse.json({ error: "Download link is invalid or expired. Generate another export." }, { status: 403 });
  if (!(await getEntitlements(session.user.id)).ungated) return upgradeRequiredResponse("export");
  const blob = await get(data.url, { access: "private" });
  if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: "Export unavailable" }, { status: 404 });
  return new Response(blob.stream, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${data.filename}"`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
