import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordSeoActivation } from "@/lib/seo-events";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  if (request.headers.get("dnt") === "1") return new NextResponse(null, { status: 204 });
  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });
  try {
    const recorded = await recordSeoActivation(session.user.id);
    return NextResponse.json({ recorded });
  } catch { return new NextResponse(null, { status: 503 }); }
}
